/**
 * Image generation stub.
 * AI CreatorOS uses creator's own API keys for image/thumbnail generation.
 * This file is kept for compatibility — integrate with DALL-E or Stability AI directly if needed.
 */

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  _options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  throw new Error(
    "Built-in image generation is not configured. The app uses creator's own API keys for thumbnail generation."
  );
}
