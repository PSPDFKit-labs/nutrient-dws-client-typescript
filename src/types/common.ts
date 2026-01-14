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
   * Allow the SDK to fetch content from URLs passed as file inputs.
   *
   * When `true`, the SDK will automatically fetch content from URLs like
   * `'https://example.com/document.pdf'` when passed to methods like `sign()`,
   * `convert()`, etc.
   *
   * When `false` (default), passing a URL that would trigger client-side fetching
   * will throw a `ValidationError`. This protects against Server-Side Request
   * Forgery (SSRF) attacks when processing untrusted user input.
   *
   * Note: This only affects client-side URL fetching. URLs passed to the workflow
   * builder are sent directly to the API server, which handles fetching.
   *
   * @default false
   * @example
   * // Enable URL fetching (use with caution)
   * const client = new NutrientClient({
   *   apiKey: 'your-api-key',
   *   allowUrlFetch: true
   * });
   *
   * // Now you can pass URLs directly
   * const result = await client.convert('https://trusted-source.com/doc.pdf', 'pdf');
   */
  allowUrlFetch?: boolean;
}
