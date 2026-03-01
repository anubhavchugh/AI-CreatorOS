/**
 * Content Generation Pipeline
 * 
 * Orchestrates the end-to-end content creation flow using CREATOR'S OWN API keys:
 * 1. Script Generation (OpenAI / Claude / Gemini)
 * 2. Voice Generation (ElevenLabs / PlayHT)
 * 3. Image/Thumbnail Generation (BFL FLUX Pro / Venice.ai / DALL-E / Replicate)
 * 4. Video Generation (Runway ML Gen-4 Turbo — image-to-video)
 *    Fallback: ffmpeg composition (images + audio → video) if no Runway key
 * 
 * We do NOT provide any built-in AI. Creators bring their own keys.
 * If a key is missing for a step, that step is skipped with a clear message.
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
  status: "pending" | "running" | "complete" | "failed" | "skipped";
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
  additionalInstructions?: string;
};

// In-memory progress tracking (for real-time updates)
const progressMap = new Map<number, PipelineProgress>();

export function getProgress(contentId: number): PipelineProgress | undefined {
  return progressMap.get(contentId);
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
    throw new Error("NO_SCRIPT_KEY: Add an OpenAI, Anthropic, or Google API key in Settings → API Keys to generate scripts.");
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
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
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
      throw new Error(`Anthropic API error (${response.status}): ${err}`);
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
      throw new Error(`Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { script: text, model: "gemini-2.0-flash" };
  }

  throw new Error("NO_SCRIPT_KEY: No script generation API key found.");
}

// ==================== STEP 2: VOICE GENERATION ====================

async function generateVoice(
  script: string,
  voiceStyle: string | null,
  userId: number,
): Promise<{ audioUrl: string | null; skipped: boolean; model: string | null }> {
  const elevenLabsKey = await getCreatorApiKey(userId, "elevenlabs");
  const playHtKey = await getCreatorApiKey(userId, "playht");

  if (!elevenLabsKey && !playHtKey) {
    return { audioUrl: null, skipped: true, model: null };
  }

  // Clean script: remove stage directions and markers for voice
  const cleanScript = script
    .replace(/\[.*?\]/g, "")
    .replace(/\([\d:]+\)/g, "")
    .trim();

  if (elevenLabsKey) {
    try {
      // Get available voices
      const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": elevenLabsKey },
      });

      if (!voicesResponse.ok) {
        throw new Error(`ElevenLabs voices API error: ${voicesResponse.status}`);
      }

      const voicesData = await voicesResponse.json();
      const voices = voicesData.voices || [];

      // Try to match voice style, otherwise use first available
      let voiceId = voices[0]?.voice_id;
      if (voiceStyle && voices.length > 0) {
        const match = voices.find(
          (v: any) => v.name.toLowerCase().includes(voiceStyle.toLowerCase())
        );
        if (match) voiceId = match.voice_id;
      }

      if (!voiceId) {
        throw new Error("No voices available in your ElevenLabs account");
      }

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
        throw new Error(`ElevenLabs TTS error (${ttsResponse.status}): ${err}`);
      }

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
      const { url } = await storagePut(
        `audio/${Date.now()}-voice.mp3`,
        audioBuffer,
        "audio/mpeg"
      );

      return { audioUrl: url, skipped: false, model: "eleven_multilingual_v2" };
    } catch (error: any) {
      console.error("[Pipeline] ElevenLabs voice generation failed:", error.message);
      throw error;
    }
  }

  if (playHtKey) {
    try {
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
        throw new Error(`PlayHT TTS error (${response.status}): ${err}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const { url } = await storagePut(
        `audio/${Date.now()}-voice.mp3`,
        audioBuffer,
        "audio/mpeg"
      );

      return { audioUrl: url, skipped: false, model: "playht-v2" };
    } catch (error: any) {
      console.error("[Pipeline] PlayHT voice generation failed:", error.message);
      throw error;
    }
  }

  return { audioUrl: null, skipped: true, model: null };
}

// ==================== STEP 3: THUMBNAIL/IMAGE GENERATION ====================

async function generateThumbnail(
  characterName: string,
  topic: string,
  visualStyle: string | null,
  platform: string,
  userId: number,
): Promise<{ thumbnailUrl: string | null; skipped: boolean; model: string | null }> {
  // Check all supported image services — priority: BFL FLUX → Venice.ai → Replicate → DALL-E
  const fluxKey = await getCreatorApiKey(userId, "flux");       // BFL FLUX Pro (direct)
  const veniceKey = await getCreatorApiKey(userId, "venice");   // Venice.ai (FLUX Pro)
  const replicateKey = await getCreatorApiKey(userId, "replicate"); // Replicate
  const dalleKey = await getCreatorApiKey(userId, "dalle");     // DALL-E (dedicated key)
  const openAiKey = await getCreatorApiKey(userId, "openai");   // OpenAI (shared with script)

  if (!fluxKey && !veniceKey && !replicateKey && !dalleKey && !openAiKey) {
    return { thumbnailUrl: null, skipped: true, model: null };
  }

  const styleMap: Record<string, string> = {
    photorealistic: "photorealistic, high quality, cinematic lighting",
    anime: "anime style, vibrant colors, detailed illustration",
    cartoon: "cartoon style, bold colors, fun and playful",
    "3d": "3D rendered, modern, clean and polished",
  };

  const styleDesc = styleMap[visualStyle || "photorealistic"] || styleMap.photorealistic;
  const prompt = `Create a ${platform} thumbnail for a video about "${topic}" featuring a character named ${characterName}. Style: ${styleDesc}. The thumbnail should be eye-catching, professional, and optimized for social media. Include bold visual elements and a clean composition. No text overlays.`;

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
        throw new Error(`BFL FLUX API submit error (${submitResponse.status}): ${err}`);
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

      // Download the image from the signed URL (expires in 10 min, no CORS)
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

      return { thumbnailUrl: url, skipped: false, model: "flux-pro-1.1 (BFL)" };
    } catch (error: any) {
      console.error("[Pipeline] BFL FLUX image generation failed:", error.message);
      // Fall through to try other services
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

      return { thumbnailUrl: url, skipped: false, model: "venice-fluently-xl" };
    } catch (error: any) {
      console.error("[Pipeline] Venice.ai image generation failed:", error.message);
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

      return { thumbnailUrl: url, skipped: false, model: "flux-1.1-pro (replicate)" };
    } catch (error: any) {
      console.error("[Pipeline] Replicate image generation failed:", error.message);
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

      return { thumbnailUrl: url, skipped: false, model: "dall-e-3" };
    } catch (error: any) {
      console.error("[Pipeline] DALL-E image generation failed:", error.message);
    }
  }

  return { thumbnailUrl: null, skipped: true, model: null };
}

// ==================== STEP 4: VIDEO GENERATION (Runway ML Gen-4 Turbo) ====================

/**
 * Generates a video using Runway ML Gen-4 Turbo (image-to-video).
 * Takes the character thumbnail image and animates it into a short video clip.
 * 
 * Fallback: If no Runway key is available, uses ffmpeg to compose a simple
 * video from the thumbnail + audio (Ken Burns effect).
 * 
 * Pipeline flow:
 *   thumbnail image → Runway Gen-4 Turbo → animated video clip
 *   Then: animated video + voiceover audio → ffmpeg merge → final video
 */
async function generateVideo(
  thumbnailUrl: string | null,
  audioUrl: string | null,
  characterName: string,
  topic: string,
  platform: string,
  userId: number,
): Promise<{ videoUrl: string | null; skipped: boolean; model: string | null }> {
  const runwayKey = await getCreatorApiKey(userId, "runway");

  // If we have a Runway key AND a thumbnail, use Runway Gen-4 Turbo for real AI video
  if (runwayKey && thumbnailUrl) {
    try {
      console.log("[Pipeline] Generating AI video with Runway Gen-4 Turbo (image-to-video)...");

      // Import the Runway SDK dynamically to avoid issues if not installed
      const { default: RunwayML, TaskFailedError, TaskTimedOutError } = await import("@runwayml/sdk");

      // Create client with the creator's own API key
      const client = new RunwayML({ apiKey: runwayKey });

      // Determine aspect ratio based on platform
      const ratioMap: Record<string, "1280:720" | "720:1280"> = {
        youtube: "1280:720",
        tiktok: "720:1280",
        instagram: "720:1280",
      };
      const ratio = ratioMap[platform.toLowerCase()] || "1280:720";

      // Build a motion prompt that describes what the character should do
      const motionPrompt = `The character ${characterName} is presenting a video about "${topic}". Subtle natural movement, the character looks at the camera with engaging expressions, slight head movement, and natural blinking. Cinematic quality, smooth motion.`;

      // Create the image-to-video task
      // gen4_turbo: 5 credits/sec, image-to-video only, cheapest option
      const task = await client.imageToVideo
        .create({
          model: "gen4_turbo",
          promptImage: thumbnailUrl,
          promptText: motionPrompt,
          ratio: ratio,
          duration: 5, // 5 seconds = 25 credits ($0.25)
        })
        .waitForTaskOutput({
          timeout: 5 * 60 * 1000, // 5 minute timeout
        });

      console.log("[Pipeline] Runway task completed:", task.id, "status:", task.status);

      // task.output is an array of video URLs (temporary, expire in 24-48h)
      const videoOutputUrl = task.output?.[0];
      if (!videoOutputUrl) {
        throw new Error("Runway Gen-4 Turbo: No video URL in task output");
      }

      // Download the generated video
      console.log("[Pipeline] Downloading Runway video...");
      const videoResponse = await fetch(videoOutputUrl);
      if (!videoResponse.ok) {
        throw new Error(`Runway: Failed to download video (${videoResponse.status})`);
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      // If we have audio, merge the Runway video with the voiceover audio using ffmpeg
      if (audioUrl) {
        console.log("[Pipeline] Merging Runway video with voiceover audio...");
        const finalVideoUrl = await mergeVideoWithAudio(videoBuffer, audioUrl, platform);
        if (finalVideoUrl) {
          return { videoUrl: finalVideoUrl, skipped: false, model: "runway-gen4-turbo + audio" };
        }
        // If merge fails, upload the video without audio
      }

      // Upload the Runway video as-is (no audio merge needed or merge failed)
      const { url } = await storagePut(
        `videos/${Date.now()}-runway-gen4.mp4`,
        videoBuffer,
        "video/mp4"
      );

      return { videoUrl: url, skipped: false, model: "runway-gen4-turbo" };
    } catch (error: any) {
      console.error("[Pipeline] Runway Gen-4 Turbo video generation failed:", error.message);
      // Fall through to ffmpeg fallback
      console.log("[Pipeline] Falling back to ffmpeg video composition...");
    }
  }

  // ---- FALLBACK: ffmpeg composition (thumbnail + audio → video) ----
  return composeVideoFfmpeg(thumbnailUrl, audioUrl, platform);
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
    // -shortest ensures the output is as long as the shorter input (the 5s video)
    await execFileAsync("ffmpeg", [
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",        // Keep video codec as-is (no re-encoding)
      "-c:a", "aac",
      "-b:a", "192k",
      "-map", "0:v:0",       // Video from first input
      "-map", "1:a:0",       // Audio from second input
      "-shortest",           // Match shortest stream
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ], { timeout: 120000 }); // 2 min timeout

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

/**
 * Fallback: Composes a video from thumbnail image + audio using ffmpeg.
 * Creates a simple video with the thumbnail as a static/Ken Burns background
 * and the voiceover audio track.
 */
async function composeVideoFfmpeg(
  thumbnailUrl: string | null,
  audioUrl: string | null,
  platform: string,
): Promise<{ videoUrl: string | null; skipped: boolean; model: string | null }> {
  // Need at least audio to create a video
  if (!audioUrl) {
    return { videoUrl: null, skipped: true, model: null };
  }

  // Check if ffmpeg is available
  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch {
    console.warn("[Pipeline] ffmpeg not available, skipping video composition");
    return { videoUrl: null, skipped: true, model: null };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "video-"));

  try {
    const audioPath = path.join(tmpDir, "audio.mp3");
    const imagePath = path.join(tmpDir, "image.png");
    const outputPath = path.join(tmpDir, "output.mp4");

    // Download audio
    console.log("[Pipeline] Downloading audio for video composition...");
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error("Failed to download audio for video");
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    await fs.promises.writeFile(audioPath, audioBuffer);

    // Platform-specific dimensions
    const dimensions: Record<string, { w: number; h: number }> = {
      youtube: { w: 1920, h: 1080 },
      tiktok: { w: 1080, h: 1920 },
      instagram: { w: 1080, h: 1920 },
    };
    const { w, h } = dimensions[platform.toLowerCase()] || dimensions.youtube;

    if (thumbnailUrl) {
      // Download thumbnail image
      console.log("[Pipeline] Downloading thumbnail for video composition...");
      const imageResponse = await fetch(thumbnailUrl);
      if (!imageResponse.ok) throw new Error("Failed to download thumbnail for video");
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      await fs.promises.writeFile(imagePath, imageBuffer);

      // Compose video: image + audio → mp4 with subtle zoom (Ken Burns effect)
      console.log("[Pipeline] Composing video with ffmpeg (image + audio)...");
      await execFileAsync("ffmpeg", [
        "-loop", "1",
        "-i", imagePath,
        "-i", audioPath,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.0005,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=30`,
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-movflags", "+faststart",
        "-y",
        outputPath,
      ], { timeout: 300000 }); // 5 min timeout
    } else {
      // Audio-only: create video with solid dark background
      console.log("[Pipeline] Composing video with ffmpeg (audio only, dark background)...");
      await execFileAsync("ffmpeg", [
        "-f", "lavfi",
        "-i", `color=c=0x111827:s=${w}x${h}:d=600`,
        "-i", audioPath,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-movflags", "+faststart",
        "-y",
        outputPath,
      ], { timeout: 300000 });
    }

    // Upload the composed video to S3
    console.log("[Pipeline] Uploading composed video to storage...");
    const videoBuffer = await fs.promises.readFile(outputPath);
    const { url } = await storagePut(
      `videos/${Date.now()}-composed.mp4`,
      videoBuffer,
      "video/mp4"
    );

    return { videoUrl: url, skipped: false, model: "ffmpeg-composition" };
  } catch (error: any) {
    console.error("[Pipeline] Video composition failed:", error.message);
    return { videoUrl: null, skipped: true, model: null };
  } finally {
    // Clean up temp files
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
  audioUrl: string | null;
  voiceModel: string | null;
  thumbnailUrl: string | null;
  imageModel: string | null;
  videoUrl: string | null;
  videoModel: string | null;
  voiceSkipped: boolean;
  thumbnailSkipped: boolean;
  videoSkipped: boolean;
  missingKeys: string[];
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

  const missingKeys: string[] = [];

  try {
    // ---- STEP 1: SCRIPT GENERATION ----
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
    progress.currentStep = "voice";
    progress.steps.voice.status = "running";
    progressMap.set(contentId, { ...progress });

    const { audioUrl, skipped: voiceSkipped, model: voiceModel } = await generateVoice(
      script,
      character.voiceStyle,
      input.userId,
    );

    if (voiceSkipped) {
      progress.steps.voice = { status: "skipped", result: "Add an ElevenLabs or PlayHT API key in Settings to enable voice generation" };
      missingKeys.push("Voice (ElevenLabs or PlayHT)");
    } else {
      progress.steps.voice = { status: "complete", result: `Voice generated with ${voiceModel}` };
    }
    if (audioUrl) {
      await updateContentStatus(contentId, "generating", { mediaUrl: audioUrl });
    }

    // ---- STEP 3: THUMBNAIL GENERATION ----
    progress.currentStep = "thumbnail";
    progress.steps.thumbnail.status = "running";
    progressMap.set(contentId, { ...progress });

    const { thumbnailUrl, skipped: thumbnailSkipped, model: imageModel } = await generateThumbnail(
      character.name,
      input.topic,
      character.visualStyle,
      input.platform,
      input.userId,
    );

    if (thumbnailSkipped) {
      progress.steps.thumbnail = { status: "skipped", result: "Add a FLUX, Venice.ai, Replicate, or OpenAI API key in Settings to enable thumbnail generation" };
      missingKeys.push("Image (FLUX, Venice.ai, Replicate, or OpenAI)");
    } else {
      progress.steps.thumbnail = { status: "complete", result: `Thumbnail generated with ${imageModel}` };
    }
    if (thumbnailUrl) {
      await updateContentStatus(contentId, "generating", { thumbnailUrl });
    }

    // ---- STEP 4: VIDEO GENERATION (Runway ML Gen-4 Turbo) ----
    progress.currentStep = "video";
    progress.steps.video.status = "running";
    progressMap.set(contentId, { ...progress });

    const { videoUrl, skipped: videoSkipped, model: videoModel } = await generateVideo(
      thumbnailUrl,
      audioUrl,
      character.name,
      input.topic,
      input.platform,
      input.userId,
    );

    if (videoSkipped) {
      if (!thumbnailUrl && !audioUrl) {
        progress.steps.video = { status: "skipped", result: "Video requires at least a thumbnail or audio. Add image/voice API keys." };
      } else {
        progress.steps.video = { status: "skipped", result: "Add a Runway ML API key in Settings to generate AI video, or ensure ffmpeg is available." };
        missingKeys.push("Video (Runway ML)");
      }
    } else {
      const videoDesc = videoModel?.includes("runway")
        ? `AI video generated with Runway Gen-4 Turbo${videoModel.includes("audio") ? " + voiceover" : ""}`
        : `Video composed with ${videoModel}`;
      progress.steps.video = { status: "complete", result: videoDesc };
    }

    // Update content with video URL and move to review
    const finalUpdates: Record<string, any> = {};
    if (videoUrl) {
      finalUpdates.mediaUrl = videoUrl; // Video replaces audio as the primary media
    }
    await updateContentStatus(contentId, "review", finalUpdates);

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
      voiceSkipped,
      thumbnailSkipped,
      videoSkipped,
      missingKeys,
    };
  } catch (error: any) {
    console.error("[Pipeline] Content generation failed:", error);
    progress.currentStep = "failed";
    progress.error = error.message;

    // Mark whichever step was running as failed
    for (const step of ["scripting", "voice", "thumbnail", "video"] as const) {
      if (progress.steps[step].status === "running") {
        progress.steps[step] = { status: "failed", error: error.message };
      }
    }
    progressMap.set(contentId, { ...progress });

    await updateContentStatus(contentId, "failed");

    throw error;
  }
}
