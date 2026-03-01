import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerRazorpayWebhook } from "../razorpay/razorpay";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  // In production, always use the assigned PORT (Railway injects it)
  if (process.env.NODE_ENV === "production") {
    return startPort;
  }
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Health check endpoint — MUST be registered BEFORE any middleware that may throw
  // Railway uses this to verify the service is alive
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Razorpay webhook needs raw body BEFORE json parsing
  app.use("/api/razorpay/webhook", express.raw({ type: "application/json" }));
  registerRazorpayWebhook(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Clerk middleware — authenticates requests and attaches auth state
  // Wrap in try-catch so the server starts even if Clerk keys are missing
  try {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey) {
      const { clerkMiddleware } = await import("@clerk/express");
      app.use(clerkMiddleware());
      console.log("[Auth] Clerk middleware initialized");
    } else {
      console.warn("[Auth] CLERK_SECRET_KEY not set — auth disabled. Set it in your environment variables.");
    }
  } catch (error) {
    console.error("[Auth] Failed to initialize Clerk middleware:", error);
    console.warn("[Auth] Server will continue without authentication.");
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind to 0.0.0.0 so Railway/Docker can route traffic to the container
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
