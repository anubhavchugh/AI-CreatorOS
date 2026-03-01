/**
 * Data API stub.
 * Not used by AI CreatorOS. Kept for compatibility.
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  _apiId: string,
  _options: DataApiCallOptions = {}
): Promise<unknown> {
  throw new Error(
    "Built-in Data API is not configured. Use direct API integrations instead."
  );
}
