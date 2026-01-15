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
}
