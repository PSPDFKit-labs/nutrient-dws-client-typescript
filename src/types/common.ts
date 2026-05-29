/**
 * Options for initializing the NutrientClient.
 */
export interface NutrientClientOptions {
  /**
   * The API key for authentication.
   *
   * - This can be your long-lived API key string.
   * - This MUST be an async function that
   * returns a short-lived access token to avoid exposing your secret key.
   *
   * @example
   * // Server-side
   * const apiKey = 'your-secret-api-key';
   *
   * // Client-side (recommended)
   * const apiKey = async () => {
   *   const response = await fetch('/api/get-nutrient-token');
   *   const { token } = await response.json();
   *   return token;
   * };
   */
  apiKey: string | (() => Promise<string>);

  /**
   * The base URL for the Nutrient DWS Processor API.
   * @default 'https://api.nutrient.io'
   */
  baseUrl?: string;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Optional API key (or async getter) for the Nutrient DWS **Data Extraction**
   * product. Required by `parse()` because Data Extraction is a separate
   * product from the Processor API and has its own credit pool — using a
   * Processor key against `/extraction/parse` returns 403.
   *
   * If omitted, `parse()` falls back to `apiKey`. That fallback works on
   * tenants where a single global DWS key authorises both products.
   *
   * No other client method uses this key — `convert`, `sign`, `ocr`, etc.
   * always use `apiKey`.
   */
  extractApiKey?: string | (() => Promise<string>);
}
