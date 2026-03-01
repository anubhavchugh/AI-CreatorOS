/**
 * Google Maps API stub.
 * Not used by AI CreatorOS. Kept for compatibility.
 * If needed, integrate with Google Maps API directly using your own API key.
 */

export async function makeRequest<T = unknown>(
  _endpoint: string,
  _params: Record<string, unknown> = {},
  _options: { method?: "GET" | "POST"; body?: Record<string, unknown> } = {}
): Promise<T> {
  throw new Error(
    "Google Maps API is not configured. Add your own Google Maps API key if needed."
  );
}
