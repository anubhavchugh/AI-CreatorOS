/**
 * Cookie helpers — Clerk handles session cookies automatically.
 * This file is kept as a stub for backward compatibility.
 */
import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  _req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}
