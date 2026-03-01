/**
 * Content Generation Pipeline
 * 
 * Orchestrates the end-to-end content creation flow using CREATOR'S OWN API keys:
 * 1. Script Generation (OpenAI / Claude / Gemini)
 * 2. Voice Generation (ElevenLabs / PlayHT)
 * 3. Image/Thumbnail Generation (BFL FLUX Pro / Venice.ai / DALL-E / Replicate)
 * 4. Video Generation (Runway ML Gen-4 Turbo — image-to-video)
 * 
 * ALL STEPS ARE MANDATORY. If any step fails (missing key, expired key, no credits,
 * API error), the pipeline STOPS immediately with a clear error message telling the
 * creator exactly what went wrong and how to fix it.
 * 
 * We do NOT provide any built-in AI. Creators bring their own keys.
 */

import { storagePut } from "../storage";
import { getDb } from "../db";
import { contentItems, creatorApiKeys, characters } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execFileAsync = promisify(execFile);

// ==================== TYPES ====================

export type PipelineStep = "scripting" | "voice" | "thumbnail" | "video" | "complete" | "failed";

export type PipelineProgress = {
  contentId: number;
  currentStep: PipelineStep;
  steps: {
    scripting: StepStatus;
    voice: StepStatus;
    thumbnail: StepStatus;
    video: StepStatus;
  };
  error?: string;
};

export type StepStatus = {
  status: "pending" | "running" | "complete" | "failed";
  result?: string;
  error?: string;
};

export type GenerateContentInput = {
  characterId: number;
  userId: number;
  topic: string;
  contentType: "short" | "long_form" | "image" | "story" | "reel";
  platform: string;
  tone?: string;
  duration?: string;
  videoDuration?: 5 | 10 | 20 | 30 | 60;
  additionalInstructions?: string;
};

// In-memory progress tracking (for real-time updates)
const progressMap = new Map<number, PipelineProgress>();

export function getProgress(contentId: number): PipelineProgress | undefined {
  return progressMap.get(contentId);
}

// ==================== CUSTOM ERROR CLASS ====================

/**
 * PipelineStepError is thrown when a specific step fails.
 * It carries a user-friendly message explaining what went wrong and how to fix it.
 */
class PipelineStepError extends Error {
  step: PipelineStep;
  userMessage: string;

  constructor(step: PipelineStep, userMessage: string, technicalDetail?: string) {
    super(userMessage);
    this.step = step;
    this.userMessage = userMessage;
    this.name = "PipelineStepError";
    if (technicalDetail) {
      console.error(`[Pipeline] ${step} technical detail:`, technicalDetail);
    }
  }
}

// ==================== HELPER: GET CREATOR API KEY ====================

async function getCreatorApiKey(userId: number, service: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(creatorApiKeys)
    .where(and(eq(creatorApiKeys.userId, userId), eq(creatorApiKeys.service, service), eq(creatorApiKeys.isActive, true)))
    .limit(1);

  return result.length > 0 ? result[0].apiKey : null;
}

// ==================== HELPER: GET CHARACTER ====================

async function getCharacter(characterId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ==================== HELPER: UPDATE CONTENT STATUS ====================

async function updateContentStatus(
  contentId: number,
  status: string,
  updates: Record<string, any> = {}
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(contentItems)
    .set({ status: status as any, ...updates })
    .where(eq(contentItems.id, contentId));
}

// ==================== STEP 1: SCRIPT GENERATION ====================

async function generateScript(
  characterName: string,
  characterPersonality: string | null,
  characterNiche: string | null,
  topic: string,
  contentType: string,
  platform: string,
  tone: string | undefined,
  duration: string | undefined,
  additionalInstructions: string | undefined,
  userId: number,
): Promise<{ script: string; model: string }> {
  const openAiKey = await getCreatorApiKey(userId, "openai");
  const claudeKey = await getCreatorApiKey(userId, "anthropic");
  const geminiKey = await getCreatorApiKey(userId, "google");

  if (!openAiKey && !claudeKey && !geminiKey) {
    throw new PipelineStepError(
      "scripting",
      "No Script API key configured. Go to Settings → API Keys and add an OpenAI, Anthropic, or Google API key."
    );
  }

  const platformGuidelines: Record<string, string> = {
    youtube: "Optimize for YouTube. Include a strong hook in the first 5 seconds, clear structure with intro/body/outro, and a call to action.",
    tiktok: "Optimize for TikTok. Keep it punchy, fast-paced, with a hook in the first 2 seconds. Use trending formats.",
    instagram: "Optimize for Instagram Reels. Visual-first, engaging captions, use trending audio cues.",
  };

  const durationGuide = duration || (contentType === "short" || contentType === "reel" ? "30-60 seconds" : "5-10 minutes");

  const systemPrompt = `You are a professional content scriptwriter for AI-generated characters. 
You write engaging, platform-optimized scripts that match the character's personality and voice.

CHARACTER PROFILE:
- Name: ${characterName}
- Personality: ${characterPersonality || "Friendly, knowledgeable, and engaging"}
- Niche: ${characterNiche || "General entertainment"}

GUIDELINES:
- Write in first person as the character
- Include stage directions in [brackets] for visual cues
- Include timing markers for key moments
- ${platformGuidelines[platform.toLowerCase()] || "Create engaging content suitable for social media."}
- Target duration: ${durationGuide}
${tone ? `- Tone: ${tone}` : ""}
${additionalInstructions ? `- Additional notes: ${additionalInstructions}` : ""}

OUTPUT FORMAT:
Return the script as plain text with:
- [HOOK] marker for the opening hook
- [BODY] marker for the main content
- [CTA] marker for the call to action
- Stage directions in [brackets]
- Estimated timestamps in (00:00) format`;

  const userPrompt = `Write a ${contentType} script about: "${topic}" for ${platform}.`;

  // Try OpenAI first, then Claude, then Gemini
  if (openAiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      const status = response.status;
      if (status === 401) {
        throw new PipelineStepError("scripting", "Your OpenAI API key is invalid or expired. Go to Settings → API Keys to update it.", err);
      } else if (status === 429) {
        throw new PipelineStepError("scripting", "Your OpenAI account has no credits remaining or hit rate limits. Check your OpenAI billing at platform.openai.com.", err);
      } else {
        throw new PipelineStepError("scripting", `OpenAI API error (${status}). Check your API key and account status.`, err);
      }
    }

    const data = await response.json();
    return { script: data.choices[0]?.message?.content || "", model: "gpt-4o" };
  }

  if (claudeKey) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      const status = response.status;
      if (status === 401) {
        throw new PipelineStepError("scripting", "Your Anthropic API key is invalid or expired. Go to Settings → API Keys to update it.", err);
      } else if (status === 429) {
        throw new PipelineStepError("scripting", "Your Anthropic account has no credits or hit rate limits. Check your Anthropic billing.", err);
      } else {
        throw new PipelineStepError("scripting", `Anthropic API error (${status}). Check your API key and account status.`, err);
      }
    }

    const data = await response.json();
    const text = data.content?.find((c: any) => c.type === "text")?.text || "";
    return { script: text, model: "claude-sonnet-4-20250514" };
  }

  if (geminiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.8 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      const status = response.status;
      if (status === 400 || status === 403) {
        throw new PipelineStepError("scripting", "Your Google API key is invalid or doesn't have Gemini access. Go to Settings → API Keys to update it.", err);
      } else {
        throw new PipelineStepError("scripting", `Gemini API error (${status}). Check your API key and account status.`, err);
      }
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { script: text, model: "gemini-2.0-flash" };
  }

  throw new PipelineStepError("scripting", "No Script API key configured. Go to Settings → API Keys and add an OpenAI, Anthropic, or Google API key.");
}

// ==================== STEP 2: VOICE GENERATION ====================

async function generateVoice(
  script: string,
  voiceStyle: string | null,
  userId: number,
): Promise<{ audioUrl: string; model: string }> {
  const elevenLabsKey = await getCreatorApiKey(userId, "elevenlabs");
  const playHtKey = await getCreatorApiKey(userId, "playht");

  if (!elevenLabsKey && !playHtKey) {
    throw new PipelineStepError(
      "voice",
      "No Voice API key configured. Go to Settings → API Keys and add an ElevenLabs or PlayHT API key."
    );
  }

  // Clean script: remove stage directions and markers for voice
  const cleanScript = script
    .replace(/\[.*?\]/g, "")
    .replace(/\([\d:]+\)/g, "")
    .trim();

  // Try ElevenLabs first
  if (elevenLabsKey) {
    // Use default ElevenLabs voice IDs based on voice style
    // This avoids calling /v1/voices which requires voices_read permission
    const defaultVoices: Record<string, { id: string; name: string }> = {
      "warm & friendly": { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
      "professional & authoritative": { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew" },
      "energetic & upbeat": { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
      "calm & soothing": { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
      "witty & sarcastic": { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
      "mysterious & deep": { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
    };

    // Match voice style to a default voice, fallback to Rachel
    let voiceId = defaultVoices["warm & friendly"].id;
    let voiceName = defaultVoices["warm & friendly"].name;
    if (voiceStyle) {
      const styleKey = voiceStyle.toLowerCase();
      const match = Object.entries(defaultVoices).find(([key]) => 
        styleKey.includes(key) || key.includes(styleKey)
      );
      if (match) {
        voiceId = match[1].id;
        voiceName = match[1].name;
      }
    }
    console.log(`[Pipeline] Using ElevenLabs voice: ${voiceName} (${voiceId})`);

    // Generate speech
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanScript.substring(0, 5000),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const err = await ttsResponse.text();
      const status = ttsResponse.status;
      if (status === 401) {
        throw new PipelineStepError("voice", "Your ElevenLabs API key is invalid or expired. Go to Settings → API Keys to update it.", err);
      } else if (status === 429 || status === 402) {
        throw new PipelineStepError("voice", "Your ElevenLabs account has no character credits remaining. Top up at elevenlabs.io/subscription.", err);
      } else {
        throw new PipelineStepError("voice", `ElevenLabs TTS error (${status}). Check your account status and credits.`, err);
      }
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const { url } = await storagePut(
      `audio/${Date.now()}-voice.mp3`,
      audioBuffer,
      "audio/mpeg"
    );

    return { audioUrl: url, model: "eleven_multilingual_v2" };
  }

  // Try PlayHT
  if (playHtKey) {
    const response = await fetch("https://api.play.ht/api/v2/tts/stream", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${playHtKey}`,
        "X-USER-ID": "creator",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleanScript.substring(0, 5000),
        voice: "s3://voice-cloning-zero-shot/775ae416-49bb-4fb6-bd45-740f205d3e11/original/manifest.json",
        output_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      const status = response.status;
      if (status === 401 || status === 403) {
        throw new PipelineStepError("voice", "Your PlayHT API key is invalid or expired. Go to Settings → API Keys to update it.", err);
      } else if (status === 429 || status === 402) {
        throw new PipelineStepError("voice", "Your PlayHT account has no credits remaining. Check your PlayHT billing.", err);
      } else {
        throw new PipelineStepError("voice", `PlayHT TTS error (${status}). Check your API key and account status.`, err);
      }
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const { url } = await storagePut(
      `audio/${Date.now()}-voice.mp3`,
      audioBuffer,
      "audio/mpeg"
    );

    return { audioUrl: url, model: "playht-v2" };
  }

  throw new PipelineStepError("voice", "No Voice API key configured. Go to Settings → API Keys and add an ElevenLabs or PlayHT API key.");
}

// ==================== STEP 3: THUMBNAIL/IMAGE GENERATION ====================

async function generateThumbnail(
  characterName: string,
  topic: string,
  visualStyle: string | null,
  platform: string,
  userId: number,
): Promise<{ thumbnailUrl: string; model: string }> {
  // Check all supported image services — priority: BFL FLUX → Venice.ai → Replicate → DALL-E
  const fluxKey = await getCreatorApiKey(userId, "flux");       // BFL FLUX Pro (direct)
  const veniceKey = await getCreatorApiKey(userId, "venice");   // Venice.ai (FLUX Pro)
  const replicateKey = await getCreatorApiKey(userId, "replicate"); // Replicate
  const dalleKey = await getCreatorApiKey(userId, "dalle");     // DALL-E (dedicated key)
  const openAiKey = await getCreatorApiKey(userId, "openai");   // OpenAI (shared with script)

  if (!fluxKey && !veniceKey && !replicateKey && !dalleKey && !openAiKey) {
    throw new PipelineStepError(
      "thumbnail",
      "No Image API key configured. Go to Settings → API Keys and add a FLUX (BFL), Venice.ai, Replicate, or OpenAI API key."
    );
  }

  const styleMap: Record<string, string> = {
    photorealistic: "photorealistic, high quality, cinematic lighting",
    anime: "anime style, vibrant colors, detailed illustration",
    cartoon: "cartoon style, bold colors, fun and playful",
    "3d": "3D rendered, modern, clean and polished",
  };

  const styleDesc = styleMap[visualStyle || "photorealistic"] || styleMap.photorealistic;
  const prompt = `Create a cinematic scene for a video about "${topic}" featuring a character named ${characterName}. Style: ${styleDesc}. The image should be a clean photographic scene with no text, no titles, no watermarks, no overlaid graphics, no UI elements. Focus on the character in an appropriate setting with cinematic lighting and professional composition. The scene should look like a still frame from a high-quality video.`;

  // Collect errors from each provider attempt
  const errors: string[] = [];

  // ---- BFL FLUX Pro (Direct API — async: submit + poll) ----
  if (fluxKey) {
    try {
      console.log("[Pipeline] Generating thumbnail with BFL FLUX Pro...");
      
      // Step 1: Submit generation request
      const submitResponse = await fetch("https://api.bfl.ai/v1/flux-pro-1.1", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "x-key": fluxKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          width: 1280,
          height: 720,
        }),
      });

      if (!submitResponse.ok) {
        const err = await submitResponse.text();
        const status = submitResponse.status;
        if (status === 401 || status === 403) {
          throw new Error(`BFL FLUX API key is invalid or expired (${status})`);
        } else if (status === 402 || status === 429) {
          throw new Error(`BFL FLUX account has no credits remaining (${status})`);
        } else {
          throw new Error(`BFL FLUX API error (${status}): ${err}`);
        }
      }

      const submitData = await submitResponse.json();
      const pollingUrl = submitData.polling_url;
      const requestId = submitData.id;

      if (!pollingUrl && !requestId) {
        throw new Error("BFL FLUX: No polling_url or request ID returned");
      }

      // Step 2: Poll for results
      let result: any = null;
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max (polling every 1s)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const pollUrl = pollingUrl || `https://api.bfl.ai/v1/get_result?id=${requestId}`;
        const pollResponse = await fetch(pollUrl, {
          headers: {
            "accept": "application/json",
            "x-key": fluxKey,
          },
        });

        if (!pollResponse.ok) {
          const err = await pollResponse.text();
          throw new Error(`BFL FLUX poll error (${pollResponse.status}): ${err}`);
        }

        result = await pollResponse.json();
        
        if (result.status === "Ready") {
          break;
        } else if (result.status === "Error" || result.status === "Failed") {
          throw new Error(`BFL FLUX generation failed: ${JSON.stringify(result)}`);
        }
        
        attempts++;
      }

      if (!result || result.status !== "Ready") {
        throw new Error("BFL FLUX: Generation timed out after 2 minutes");
      }

      // Download the image from the signed URL
      const imageUrl = result.result?.sample;
      if (!imageUrl) throw new Error("BFL FLUX: No image URL in result");

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`BFL FLUX: Failed to download image (${imageResponse.status})`);
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const { url } = await storagePut(
        `thumbnails/${Date.now()}-flux-thumb.png`,
        imageBuffer,
        "image/png"
      );

      return { thumbnailUrl: url, model: "flux-pro-1.1 (BFL)" };
    } catch (error: any) {
      console.error("[Pipeline] BFL FLUX image generation failed:", error.message);
      errors.push(`FLUX: ${error.message}`);
      // If this is an auth/credits error and no other image keys exist, stop immediately
      if (!veniceKey && !replicateKey && !dalleKey && !openAiKey) {
        throw new PipelineStepError("thumbnail", `Image generation failed — ${error.message}. Check your BFL API key and credits in Settings → API Keys.`, error.message);
      }
      // Otherwise fall through to try other services
    }
  }

  // ---- Venice.ai (FLUX Pro) ----
  if (veniceKey) {
    try {
      console.log("[Pipeline] Generating thumbnail with Venice.ai...");
      
      const response = await fetch("https://api.venice.ai/api/v1/image/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${veniceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "fluently-xl",
          prompt,
          width: 1280,
          height: 720,
          format: "png",
          return_binary: false,
          safe_mode: false,
          steps: 20,
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
        `thumbnails/${Date.now()}-venice-thumb.png`,
        imageBuffer,
        "image/png"
      );

      return { thumbnailUrl: url, model: "venice-fluently-xl" };
    } catch (error: any) {
      console.error("[Pipeline] Venice.ai image generation failed:", error.message);
      errors.push(`Venice.ai: ${error.message}`);
      if (!replicateKey && !dalleKey && !openAiKey) {
        throw new PipelineStepError("thumbnail", `All image providers failed. Last error: ${error.message}. Check your API keys and credits in Settings → API Keys.`, errors.join("; "));
      }
    }
  }

  // ---- Replicate (Flux via Replicate) ----
  if (replicateKey) {
    try {
      console.log("[Pipeline] Generating thumbnail with Replicate...");
      
      const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${replicateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-1.1-pro",
          input: {
            prompt,
            width: 1280,
            height: 720,
            num_outputs: 1,
          },
        }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.text();
        throw new Error(`Replicate API error (${createResponse.status}): ${err}`);
      }

      const prediction = await createResponse.json();

      let result = prediction;
      let attempts = 0;
      while (result.status !== "succeeded" && result.status !== "failed" && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { "Authorization": `Bearer ${replicateKey}` },
        });
        result = await pollResponse.json();
        attempts++;
      }

      if (result.status === "failed") {
        throw new Error(`Replicate prediction failed: ${result.error}`);
      }

      const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      if (!imageUrl) throw new Error("No image output from Replicate");

      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const { url } = await storagePut(
        `thumbnails/${Date.now()}-replicate-thumb.png`,
        imageBuffer,
        "image/png"
      );

      return { thumbnailUrl: url, model: "flux-1.1-pro (replicate)" };
    } catch (error: any) {
      console.error("[Pipeline] Replicate image generation failed:", error.message);
      errors.push(`Replicate: ${error.message}`);
      if (!dalleKey && !openAiKey) {
        throw new PipelineStepError("thumbnail", `All image providers failed. Last error: ${error.message}. Check your API keys and credits in Settings → API Keys.`, errors.join("; "));
      }
    }
  }

  // ---- DALL-E (dedicated key or shared OpenAI key) ----
  const dalleApiKey = dalleKey || openAiKey;
  if (dalleApiKey) {
    try {
      console.log("[Pipeline] Generating thumbnail with DALL-E 3...");
      
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
          size: "1792x1024",
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
        `thumbnails/${Date.now()}-dalle-thumb.png`,
        imageBuffer,
        "image/png"
      );

      return { thumbnailUrl: url, model: "dall-e-3" };
    } catch (error: any) {
      console.error("[Pipeline] DALL-E image generation failed:", error.message);
      errors.push(`DALL-E: ${error.message}`);
    }
  }

  // All providers failed
  throw new PipelineStepError(
    "thumbnail",
    `All image providers failed. ${errors.length > 0 ? errors[errors.length - 1] : "Check your API keys and credits in Settings → API Keys."}`,
    errors.join("; ")
  );
}

// ==================== STEP 4: VIDEO GENERATION (Runway ML Gen-4 Turbo) ====================

/**
 * Generates a video using Runway ML Gen-4 Turbo (image-to-video).
 * Takes the character thumbnail image and animates it into a short video clip.
 * Then merges with voiceover audio using ffmpeg.
 * 
 * Pipeline flow:
 *   thumbnail image → Runway Gen-4 Turbo → animated video clip
 *   Then: animated video + voiceover audio → ffmpeg merge → final video
 */
async function generateVideo(
  thumbnailUrl: string,
  audioUrl: string,
  characterName: string,
  topic: string,
  platform: string,
  userId: number,
  videoDuration: 5 | 10 | 20 | 30 | 60 = 5,
): Promise<{ videoUrl: string; model: string }> {
  const runwayKey = await getCreatorApiKey(userId, "runway");

  if (!runwayKey) {
    throw new PipelineStepError(
      "video",
      "No Video API key configured. Go to Settings → API Keys and add a Runway ML API key (starts with key_)."
    );
  }

  try {
    console.log(`[Pipeline] Generating AI video with Runway Gen-4 Turbo — target: ${videoDuration}s`);
    console.log(`[Pipeline] Video base image URL: ${thumbnailUrl}`);

    // Verify the image URL is accessible before sending to Runway
    try {
      const imgCheck = await fetch(thumbnailUrl, { method: "HEAD" });
      if (!imgCheck.ok) {
        console.error(`[Pipeline] Image URL not accessible: ${imgCheck.status} ${imgCheck.statusText}`);
        throw new PipelineStepError(
          "video",
          `The base image for video generation is not accessible (HTTP ${imgCheck.status}). This may be a storage issue. Please try again.`,
          `Image URL HEAD check failed: ${imgCheck.status}`
        );
      }
      console.log(`[Pipeline] Image URL verified accessible (${imgCheck.status}, content-type: ${imgCheck.headers.get("content-type")})`);
    } catch (headError: any) {
      if (headError instanceof PipelineStepError) throw headError;
      console.warn(`[Pipeline] Image URL HEAD check failed (non-fatal): ${headError.message}`);
    }

    // Import the Runway SDK dynamically
    const { default: RunwayML, TaskFailedError } = await import("@runwayml/sdk");
    const client = new RunwayML({ apiKey: runwayKey });

    // Determine aspect ratio based on platform
    const ratioMap: Record<string, "1280:720" | "720:1280"> = {
      youtube: "1280:720",
      tiktok: "720:1280",
      instagram: "720:1280",
    };
    const ratio = ratioMap[platform.toLowerCase()] || "1280:720";

    // Build a motion prompt - keep it simple to avoid content moderation issues
    const motionPrompt = `Cinematic scene with subtle natural movement. Gentle camera motion, smooth lighting changes, atmospheric depth. Professional video quality.`;

    // Runway Gen-4 Turbo supports max 10s per clip.
    // For durations > 10s, we chain multiple clips and concatenate with ffmpeg.
    const clipDurations = computeClipDurations(videoDuration);
    console.log(`[Pipeline] Clip plan: ${clipDurations.join("s + ")}s (${clipDurations.length} clip(s))`);

    const clipBuffers: Buffer[] = [];
    const MAX_RETRIES = 2; // Retry up to 2 times for INTERNAL errors

    for (let i = 0; i < clipDurations.length; i++) {
      const clipDur = clipDurations[i] as 5 | 10;
      console.log(`[Pipeline] Generating clip ${i + 1}/${clipDurations.length} (${clipDur}s)...`);

      // Vary the prompt slightly for each clip to get different motion
      const clipPrompt = clipDurations.length > 1
        ? `${motionPrompt} Part ${i + 1} of ${clipDurations.length}, continuous motion.`
        : motionPrompt;

      let task: any = null;
      let lastError: any = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[Pipeline] Retry ${attempt}/${MAX_RETRIES} for clip ${i + 1} (waiting ${attempt * 5}s)...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 5000));
          }

          task = await client.imageToVideo
            .create({
              model: "gen4_turbo",
              promptImage: thumbnailUrl,
              promptText: clipPrompt,
              ratio: ratio,
              duration: clipDur,
            })
            .waitForTaskOutput({
              timeout: 5 * 60 * 1000,
            });

          break; // Success, exit retry loop
        } catch (retryError: any) {
          lastError = retryError;
          const failureCode = retryError?.taskDetails?.failureCode || "unknown";
          const failure = retryError?.taskDetails?.failure || retryError.message;
          console.error(`[Pipeline] Clip ${i + 1} attempt ${attempt + 1} failed: failureCode=${failureCode}, failure=${failure}`);
          console.error(`[Pipeline] Full error details:`, JSON.stringify({
            name: retryError.name,
            message: retryError.message,
            failureCode,
            failure,
            taskId: retryError?.taskDetails?.id,
            status: retryError?.taskDetails?.status,
          }, null, 2));

          // Don't retry SAFETY or ASSET.INVALID errors
          if (failureCode.startsWith("SAFETY") || failureCode === "ASSET.INVALID") {
            throw retryError;
          }

          // Only retry INTERNAL errors
          if (attempt >= MAX_RETRIES) {
            throw retryError;
          }
        }
      }

      if (!task) {
        throw lastError || new Error("Runway Gen-4 Turbo: No task output after retries");
      }

      console.log(`[Pipeline] Clip ${i + 1} completed: ${task.id}`);

      const videoOutputUrl = task.output?.[0];
      if (!videoOutputUrl) {
        throw new Error(`Runway Gen-4 Turbo: No video URL in clip ${i + 1} output`);
      }

      const videoResponse = await fetch(videoOutputUrl);
      if (!videoResponse.ok) {
        throw new Error(`Runway: Failed to download clip ${i + 1} (${videoResponse.status})`);
      }

      clipBuffers.push(Buffer.from(await videoResponse.arrayBuffer()));
    }

    // If multiple clips, concatenate them with ffmpeg
    let videoBuffer: Buffer;
    if (clipBuffers.length > 1) {
      console.log(`[Pipeline] Concatenating ${clipBuffers.length} clips with ffmpeg...`);
      videoBuffer = await concatenateClips(clipBuffers);
    } else {
      videoBuffer = clipBuffers[0];
    }

    // Merge the video with the voiceover audio using ffmpeg
    console.log("[Pipeline] Merging video with voiceover audio...");
    const finalVideoUrl = await mergeVideoWithAudio(videoBuffer, audioUrl, platform);
    if (finalVideoUrl) {
      const clipInfo = clipDurations.length > 1 ? ` (${clipDurations.length} clips chained)` : "";
      return { videoUrl: finalVideoUrl, model: `runway-gen4-turbo${clipInfo} + audio` };
    }

    // If merge fails, upload the video without audio
    console.warn("[Pipeline] Audio merge failed, uploading video without audio");
    const { url } = await storagePut(
      `videos/${Date.now()}-runway-gen4.mp4`,
      videoBuffer,
      "video/mp4"
    );

    return { videoUrl: url, model: "runway-gen4-turbo" };
  } catch (error: any) {
    // Already a PipelineStepError, just re-throw
    if (error instanceof PipelineStepError) throw error;

    const msg = error.message || "";
    const failureCode = error?.taskDetails?.failureCode || "";
    const failure = error?.taskDetails?.failure || "";
    
    console.error("[Pipeline] Runway Gen-4 Turbo video generation failed:", msg);
    console.error("[Pipeline] failureCode:", failureCode, "failure:", failure);
    console.error("[Pipeline] Error name:", error.name, "Stack:", error.stack?.substring(0, 500));
    
    // Parse Runway-specific errors using failureCode (from TaskFailedError)
    if (failureCode.startsWith("SAFETY")) {
      throw new PipelineStepError("video", "Runway content moderation rejected the input. Try a different character avatar or topic. The image may contain content that Runway's safety system flagged.", `failureCode: ${failureCode}, failure: ${failure}`);
    } else if (failureCode === "ASSET.INVALID") {
      throw new PipelineStepError("video", "The input image is not compatible with Runway (wrong dimensions, format, or corrupted). Try regenerating your character avatar.", `failureCode: ${failureCode}, failure: ${failure}`);
    } else if (failureCode.startsWith("INTERNAL.BAD_OUTPUT")) {
      throw new PipelineStepError("video", "Runway's AI rejected the generated output for quality reasons. This can happen with images containing overlaid text or graphics. Try a different avatar or topic.", `failureCode: ${failureCode}, failure: ${failure}`);
    } else if (failureCode === "INPUT_PREPROCESSING.SAFETY.TEXT") {
      throw new PipelineStepError("video", "Runway rejected the text prompt for content moderation reasons. Try rephrasing your topic.", `failureCode: ${failureCode}, failure: ${failure}`);
    } else if (failureCode === "INPUT_PREPROCESSING.INTERNAL") {
      throw new PipelineStepError("video", "Runway had an internal error processing your input. Please try again in a moment.", `failureCode: ${failureCode}, failure: ${failure}`);
    }
    
    // Parse HTTP-level errors
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("authentication")) {
      throw new PipelineStepError("video", "Your Runway ML API key is invalid or expired. Go to Settings → API Keys to update it.", msg);
    } else if (msg.includes("402") || msg.includes("insufficient") || msg.includes("credits")) {
      throw new PipelineStepError("video", "Your Runway ML account has no credits remaining. Top up at app.runwayml.com/billing.", msg);
    } else if (msg.includes("429") || msg.includes("rate")) {
      throw new PipelineStepError("video", "Runway ML rate limit hit. Wait a moment and try again.", msg);
    } else if (msg.includes("timeout") || msg.includes("Timeout") || error.name === "TaskTimedOutError") {
      throw new PipelineStepError("video", "Runway ML video generation timed out. This can happen during high demand. Please try again.", msg);
    } else {
      throw new PipelineStepError("video", `Runway ML video generation failed: ${failure || msg}. Check your API key and account credits at app.runwayml.com.`, `failureCode: ${failureCode}, msg: ${msg}, failure: ${failure}`);
    }
  }
}

/**
 * Compute clip durations for a target total duration.
 * Runway Gen-4 Turbo supports 5s or 10s clips.
 * For durations > 10s, we chain multiple 10s clips (with a 5s clip if needed).
 */
function computeClipDurations(totalDuration: number): number[] {
  if (totalDuration <= 5) return [5];
  if (totalDuration <= 10) return [10];
  
  const clips: number[] = [];
  let remaining = totalDuration;
  while (remaining > 0) {
    if (remaining >= 10) {
      clips.push(10);
      remaining -= 10;
    } else if (remaining >= 5) {
      clips.push(5);
      remaining -= 5;
    } else {
      // Round up to 5s for any remainder
      clips.push(5);
      remaining = 0;
    }
  }
  return clips;
}

/**
 * Concatenate multiple video clip buffers into a single video using ffmpeg.
 */
async function concatenateClips(clipBuffers: Buffer[]): Promise<Buffer> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "concat-"));

  try {
    // Write each clip to a temp file
    const clipPaths: string[] = [];
    for (let i = 0; i < clipBuffers.length; i++) {
      const clipPath = path.join(tmpDir, `clip_${i}.mp4`);
      await fs.promises.writeFile(clipPath, clipBuffers[i]);
      clipPaths.push(clipPath);
    }

    // Create a concat list file
    const listContent = clipPaths.map(p => `file '${p}'`).join("\n");
    const listPath = path.join(tmpDir, "concat_list.txt");
    await fs.promises.writeFile(listPath, listContent);

    const outputPath = path.join(tmpDir, "concatenated.mp4");

    // Concatenate using ffmpeg concat demuxer
    await execFileAsync("ffmpeg", [
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ], { timeout: 120000 });

    return await fs.promises.readFile(outputPath);
  } catch (error: any) {
    console.error("[Pipeline] Clip concatenation failed:", error.message);
    // Fall back to the first clip if concatenation fails
    console.warn("[Pipeline] Falling back to first clip only");
    return clipBuffers[0];
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Merge a video buffer with an audio track using ffmpeg.
 * Returns the URL of the merged video, or null if merge fails.
 */
async function mergeVideoWithAudio(
  videoBuffer: Buffer,
  audioUrl: string,
  platform: string,
): Promise<string | null> {
  // Check if ffmpeg is available
  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch {
    console.warn("[Pipeline] ffmpeg not available, cannot merge audio");
    return null;
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "merge-"));

  try {
    const videoPath = path.join(tmpDir, "video.mp4");
    const audioPath = path.join(tmpDir, "audio.mp3");
    const outputPath = path.join(tmpDir, "merged.mp4");

    // Write video buffer to temp file
    await fs.promises.writeFile(videoPath, videoBuffer);

    // Download audio
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error("Failed to download audio for merge");
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.promises.writeFile(audioPath, audioBuffer);

    // Merge: take video from Runway, audio from voiceover
    await execFileAsync("ffmpeg", [
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-shortest",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ], { timeout: 120000 });

    // Upload merged video
    const mergedBuffer = await fs.promises.readFile(outputPath);
    const { url } = await storagePut(
      `videos/${Date.now()}-runway-merged.mp4`,
      mergedBuffer,
      "video/mp4"
    );

    return url;
  } catch (error: any) {
    console.error("[Pipeline] Video-audio merge failed:", error.message);
    return null;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ==================== MAIN PIPELINE ORCHESTRATOR ====================

export async function runContentPipeline(input: GenerateContentInput): Promise<{
  contentId: number;
  script: string;
  scriptModel: string;
  audioUrl: string;
  voiceModel: string;
  thumbnailUrl: string;
  imageModel: string;
  videoUrl: string;
  videoModel: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get character details
  const character = await getCharacter(input.characterId);
  if (!character) throw new Error("Character not found");

  // Create content item in database
  const [insertResult] = await db.insert(contentItems).values({
    characterId: input.characterId,
    userId: input.userId,
    title: `${input.topic} — ${character.name}`,
    type: input.contentType,
    platform: input.platform,
    status: "scripting",
  });
  const contentId = insertResult.insertId;

  // Initialize progress tracking
  const progress: PipelineProgress = {
    contentId,
    currentStep: "scripting",
    steps: {
      scripting: { status: "running" },
      voice: { status: "pending" },
      thumbnail: { status: "pending" },
      video: { status: "pending" },
    },
  };
  progressMap.set(contentId, { ...progress });

  try {
    // ---- STEP 1: SCRIPT GENERATION ----
    console.log("[Pipeline] Step 1/4: Generating script...");
    progress.currentStep = "scripting";
    progress.steps.scripting.status = "running";
    progressMap.set(contentId, { ...progress });

    const { script, model: scriptModel } = await generateScript(
      character.name,
      character.personality,
      character.niche,
      input.topic,
      input.contentType,
      input.platform,
      input.tone,
      input.duration,
      input.additionalInstructions,
      input.userId,
    );

    progress.steps.scripting = { status: "complete", result: `Script generated with ${scriptModel}` };
    await updateContentStatus(contentId, "generating", { script });

    // ---- STEP 2: VOICE GENERATION ----
    console.log("[Pipeline] Step 2/4: Generating voice...");
    progress.currentStep = "voice";
    progress.steps.voice.status = "running";
    progressMap.set(contentId, { ...progress });

    const { audioUrl, model: voiceModel } = await generateVoice(
      script,
      character.voiceStyle,
      input.userId,
    );

    progress.steps.voice = { status: "complete", result: `Voice generated with ${voiceModel}` };
    await updateContentStatus(contentId, "generating", { mediaUrl: audioUrl });

    // ---- STEP 3: THUMBNAIL GENERATION ----
    console.log("[Pipeline] Step 3/4: Generating thumbnail...");
    progress.currentStep = "thumbnail";
    progress.steps.thumbnail.status = "running";
    progressMap.set(contentId, { ...progress });

    const { thumbnailUrl, model: imageModel } = await generateThumbnail(
      character.name,
      input.topic,
      character.visualStyle,
      input.platform,
      input.userId,
    );

    progress.steps.thumbnail = { status: "complete", result: `Thumbnail generated with ${imageModel}` };
    await updateContentStatus(contentId, "generating", { thumbnailUrl });

    // ---- STEP 4: VIDEO GENERATION (Runway ML Gen-4 Turbo) ----
    console.log("[Pipeline] Step 4/4: Generating video...");
    progress.currentStep = "video";
    progress.steps.video.status = "running";
    progressMap.set(contentId, { ...progress });

    const videoDuration = input.videoDuration || (input.contentType === "short" || input.contentType === "reel" ? 5 : 10);

    // Use the generated thumbnail as the base image for video generation.
    // The thumbnail is generated at a 16:9 aspect ratio (1792x1024) which matches
    // Runway's expected input better than the 1:1 avatar (1024x1024).
    // Square avatars can trigger INTERNAL.BAD_OUTPUT errors from Runway.
    // Fall back to avatar only if no thumbnail was generated.
    const videoBaseImage = thumbnailUrl || character.avatarUrl || '';
    if (!videoBaseImage) {
      throw new PipelineStepError('video', 'No image available for video generation. Please generate a thumbnail or upload an avatar first.');
    }
    console.log(`[Pipeline] Using video base image: ${videoBaseImage === thumbnailUrl ? 'thumbnail' : 'avatar'}`);

    const { videoUrl, model: videoModel } = await generateVideo(
      videoBaseImage,
      audioUrl,
      character.name,
      input.topic,
      input.platform,
      input.userId,
      videoDuration as 5 | 10 | 20 | 30 | 60,
    );

    const videoDesc = videoModel.includes("runway")
      ? `AI video generated with Runway Gen-4 Turbo${videoModel.includes("audio") ? " + voiceover" : ""}`
      : `Video composed with ${videoModel}`;
    progress.steps.video = { status: "complete", result: videoDesc };

    // Update content with video URL and move to review
    await updateContentStatus(contentId, "review", { mediaUrl: videoUrl });

    // ---- COMPLETE ----
    progress.currentStep = "complete";
    progressMap.set(contentId, { ...progress });

    return {
      contentId,
      script,
      scriptModel,
      audioUrl,
      voiceModel,
      thumbnailUrl,
      imageModel,
      videoUrl,
      videoModel,
    };
  } catch (error: any) {
    console.error("[Pipeline] Content generation failed:", error);
    progress.currentStep = "failed";
    progress.error = error.userMessage || error.message;

    // Mark whichever step was running as failed
    for (const step of ["scripting", "voice", "thumbnail", "video"] as const) {
      if (progress.steps[step].status === "running") {
        progress.steps[step] = { status: "failed", error: error.userMessage || error.message };
      }
    }
    progressMap.set(contentId, { ...progress });

    await updateContentStatus(contentId, "failed");

    throw error;
  }
}
