/**
 * Avatar Generator
 * 
 * Generates a character avatar/face image using the creator's own image API key.
 * Used during character creation to give each character a consistent visual identity.
 * The avatar is then reused in the content pipeline for Runway video generation.
 */

import { storagePut } from "../storage";
import { getDb } from "../db";
import { creatorApiKeys } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ==================== HELPER ====================

async function getCreatorApiKey(userId: number, service: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(creatorApiKeys)
    .where(and(eq(creatorApiKeys.userId, userId), eq(creatorApiKeys.service, service), eq(creatorApiKeys.isActive, true)))
    .limit(1);
  return rows[0]?.apiKey || null;
}

// ==================== AVATAR GENERATION ====================

export type AvatarStyle = "photorealistic" | "anime" | "cartoon" | "3d";

export interface GenerateAvatarInput {
  characterName: string;
  niche: string;
  visualStyle: AvatarStyle;
  appearance?: string; // optional description from the creator
  userId: number;
}

export async function generateAvatar(input: GenerateAvatarInput): Promise<{ avatarUrl: string; model: string }> {
  const { characterName, niche, visualStyle, appearance, userId } = input;

  // Check all supported image services — priority: BFL FLUX → Venice.ai → DALL-E / OpenAI
  const fluxKey = await getCreatorApiKey(userId, "flux");
  const veniceKey = await getCreatorApiKey(userId, "venice");
  const dalleKey = await getCreatorApiKey(userId, "dalle");
  const openAiKey = await getCreatorApiKey(userId, "openai");

  if (!fluxKey && !veniceKey && !dalleKey && !openAiKey) {
    throw new Error(
      "No Image API key configured. Go to Settings → API Keys and add a FLUX (BFL), Venice.ai, or OpenAI API key to generate character avatars."
    );
  }

  const styleMap: Record<string, string> = {
    photorealistic: "photorealistic portrait, high quality, cinematic lighting, studio photography, sharp details",
    anime: "anime style portrait, vibrant colors, detailed illustration, clean lines, expressive eyes",
    cartoon: "cartoon style portrait, bold colors, fun and playful, exaggerated features, clean design",
    "3d": "3D rendered portrait, Pixar-like quality, modern, clean and polished, subsurface scattering",
  };

  const styleDesc = styleMap[visualStyle] || styleMap.photorealistic;
  const appearanceDesc = appearance
    ? `Appearance: ${appearance}. `
    : "";

  const prompt = `Create a character portrait/avatar for an AI content creator named "${characterName}" in the ${niche || "general"} niche. ${appearanceDesc}Style: ${styleDesc}. The portrait should be a close-up headshot/bust shot, facing the camera with a confident and engaging expression. Clean background, professional quality, suitable as a consistent character identity for social media content. No text overlays.`;

  const errors: string[] = [];

  // ---- BFL FLUX Pro ----
  if (fluxKey) {
    try {
      console.log("[Avatar] Generating with BFL FLUX Pro...");

      const submitResponse = await fetch("https://api.bfl.ai/v1/flux-pro-1.1", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "x-key": fluxKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          width: 1024,
          height: 1024,
        }),
      });

      if (!submitResponse.ok) {
        const err = await submitResponse.text();
        const status = submitResponse.status;
        if (status === 401 || status === 403) {
          throw new Error(`BFL FLUX API key is invalid or expired (${status})`);
        } else if (status === 402 || status === 429) {
          throw new Error(`BFL FLUX account has no credits remaining (${status})`);
        }
        throw new Error(`BFL FLUX submit error (${status}): ${err}`);
      }

      const submitData = await submitResponse.json();
      const taskId = submitData.id;
      if (!taskId) throw new Error("BFL FLUX: No task ID returned");

      // Poll for result
      let result: any = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const pollResponse = await fetch(`https://api.bfl.ai/v1/get_result?id=${taskId}`, {
          headers: { "accept": "application/json", "x-key": fluxKey },
        });
        const pollData = await pollResponse.json();
        if (pollData.status === "Ready") {
          result = pollData;
          break;
        } else if (pollData.status === "Error") {
          throw new Error(`BFL FLUX generation failed: ${pollData.error || "Unknown error"}`);
        }
      }

      if (!result) throw new Error("BFL FLUX: Timed out waiting for image generation");

      const imageUrl = result.result?.sample;
      if (!imageUrl) throw new Error("BFL FLUX: No image URL in result");

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const { url } = await storagePut(
        `avatars/${Date.now()}-${characterName.toLowerCase().replace(/\s+/g, "-")}-flux.png`,
        imageBuffer,
        "image/png"
      );

      return { avatarUrl: url, model: "flux-pro-1.1" };
    } catch (error: any) {
      console.error("[Avatar] BFL FLUX failed:", error.message);
      errors.push(`FLUX: ${error.message}`);
      if (!veniceKey && !dalleKey && !openAiKey) {
        throw new Error(`Avatar generation failed: ${error.message}`);
      }
    }
  }

  // ---- Venice.ai ----
  if (veniceKey) {
    try {
      console.log("[Avatar] Generating with Venice.ai...");

      const response = await fetch("https://api.venice.ai/api/v1/image/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${veniceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "fluently-xl",
          prompt,
          width: 1024,
          height: 1024,
          steps: 30,
          seed: Math.floor(Math.random() * 999999),
          return_binary: false,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Venice.ai API error (${response.status}): ${err}`);
      }

      const data = await response.json();
      const base64Image = data.images?.[0];
      if (!base64Image) throw new Error("Venice.ai: No image data in response");

      const imageBuffer = Buffer.from(base64Image, "base64");
      const { url } = await storagePut(
        `avatars/${Date.now()}-${characterName.toLowerCase().replace(/\s+/g, "-")}-venice.png`,
        imageBuffer,
        "image/png"
      );

      return { avatarUrl: url, model: "venice-fluently-xl" };
    } catch (error: any) {
      console.error("[Avatar] Venice.ai failed:", error.message);
      errors.push(`Venice.ai: ${error.message}`);
      if (!dalleKey && !openAiKey) {
        throw new Error(`Avatar generation failed: ${errors.join("; ")}`);
      }
    }
  }

  // ---- DALL-E 3 ----
  const dalleApiKey = dalleKey || openAiKey;
  if (dalleApiKey) {
    try {
      console.log("[Avatar] Generating with DALL-E 3...");

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${dalleApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`DALL-E API error (${response.status}): ${err}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) throw new Error("No image output from DALL-E");

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const { url } = await storagePut(
        `avatars/${Date.now()}-${characterName.toLowerCase().replace(/\s+/g, "-")}-dalle.png`,
        imageBuffer,
        "image/png"
      );

      return { avatarUrl: url, model: "dall-e-3" };
    } catch (error: any) {
      console.error("[Avatar] DALL-E failed:", error.message);
      errors.push(`DALL-E: ${error.message}`);
    }
  }

  throw new Error(`All image providers failed for avatar generation. ${errors.join("; ")}. Check your API keys in Settings → API Keys.`);
}
