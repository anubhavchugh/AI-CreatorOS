/**
 * Content Generation Pipeline
 * 
 * Orchestrates the end-to-end content creation flow using CREATOR'S OWN API keys:
 * 1. Script Generation (creator's OpenAI / Claude / Gemini key)
 * 2. Voice Generation (creator's ElevenLabs / PlayHT key)
 * 3. Thumbnail/Image Generation (creator's FLUX (BFL) / Venice.ai / DALL-E / Replicate / fal.ai key)
 * 
 * We do NOT provide any built-in AI. Creators bring their own keys.
 * If a key is missing for a step, that step is skipped with a clear message.
 */

import { storagePut } from "../storage";
import { getDb } from "../db";
import { contentItems, creatorApiKeys, characters } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ==================== TYPES ====================

export type PipelineStep = "scripting" | "voice" | "thumbnail" | "complete" | "failed";

export type PipelineProgress = {
  contentId: number;
  currentStep: PipelineStep;
  steps: {
    scripting: StepStatus;
    voice: StepStatus;
    thumbnail: StepStatus;
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
  // Check which script engine key the creator has
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
  // Check all supported image services
  const fluxKey = await getCreatorApiKey(userId, "flux");       // BFL FLUX direct API
  const veniceKey = await getCreatorApiKey(userId, "venice");   // Venice.ai
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

  // Priority: FLUX (BFL) → Venice.ai → Replicate → DALL-E → OpenAI (DALL-E fallback)

  // ---- BFL FLUX Direct API ----
  if (fluxKey) {
    try {
      console.log("[Pipeline] Generating thumbnail with BFL FLUX Pro...");
      
      // Submit generation request
      const createResponse = await fetch("https://api.bfl.ai/v1/flux-pro-1.1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-key": fluxKey,
        },
        body: JSON.stringify({
          prompt,
          width: 1280,
          height: 720,
        }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.text();
        throw new Error(`BFL FLUX API error (${createResponse.status}): ${err}`);
      }

      const createData = await createResponse.json();
      const pollingUrl = createData.polling_url;
      const requestId = createData.id;

      if (!pollingUrl) {
        throw new Error(`BFL FLUX: No polling URL returned (request ID: ${requestId})`);
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max (polling every 1s)
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const pollResponse = await fetch(pollingUrl, {
          headers: { "x-key": fluxKey },
        });

        if (!pollResponse.ok) {
          throw new Error(`BFL FLUX poll error (${pollResponse.status})`);
        }

        const pollData = await pollResponse.json();
        
        if (pollData.status === "Ready") {
          const imageUrl = pollData.result?.sample;
          if (!imageUrl) throw new Error("BFL FLUX: No image URL in result");

          // Download and re-upload to our S3 (BFL URLs expire in 10 min)
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) throw new Error("Failed to download BFL FLUX image");
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const { url } = await storagePut(
            `thumbnails/${Date.now()}-flux-thumb.png`,
            imageBuffer,
            "image/png"
          );

          return { thumbnailUrl: url, skipped: false, model: "flux-pro-1.1" };
        }

        if (pollData.status === "Error" || pollData.status === "Failed") {
          throw new Error(`BFL FLUX generation failed: ${JSON.stringify(pollData)}`);
        }

        // Still pending, continue polling
        attempts++;
      }

      throw new Error("BFL FLUX: Generation timed out after 2 minutes");
    } catch (error: any) {
      console.error("[Pipeline] BFL FLUX image generation failed:", error.message);
      // Fall through to try other services
    }
  }

  // ---- Venice.ai ----
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

      // Decode base64 and upload to S3
      const imageBuffer = Buffer.from(base64Image, "base64");
      const { url } = await storagePut(
        `thumbnails/${Date.now()}-venice-thumb.png`,
        imageBuffer,
        "image/png"
      );

      return { thumbnailUrl: url, skipped: false, model: "venice-fluently-xl" };
    } catch (error: any) {
      console.error("[Pipeline] Venice.ai image generation failed:", error.message);
      // Fall through to try other services
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

      // Poll for completion
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
      // Fall through to try other services
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

// ==================== MAIN PIPELINE ORCHESTRATOR ====================

export async function runContentPipeline(input: GenerateContentInput): Promise<{
  contentId: number;
  script: string;
  scriptModel: string;
  audioUrl: string | null;
  voiceModel: string | null;
  thumbnailUrl: string | null;
  imageModel: string | null;
  voiceSkipped: boolean;
  thumbnailSkipped: boolean;
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
      await updateContentStatus(contentId, "review", { thumbnailUrl });
    } else {
      // If no thumbnail but script is done, still move to review
      await updateContentStatus(contentId, "review");
    }

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
      voiceSkipped,
      thumbnailSkipped,
      missingKeys,
    };
  } catch (error: any) {
    console.error("[Pipeline] Content generation failed:", error);
    progress.currentStep = "failed";
    progress.error = error.message;

    // Mark whichever step was running as failed
    for (const step of ["scripting", "voice", "thumbnail"] as const) {
      if (progress.steps[step].status === "running") {
        progress.steps[step] = { status: "failed", error: error.message };
      }
    }
    progressMap.set(contentId, { ...progress });

    await updateContentStatus(contentId, "failed");

    throw error;
  }
}
