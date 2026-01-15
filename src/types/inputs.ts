/**
 * Represents a file path input (Node.js only)
 */
export interface FilePathInput {
  type: 'file-path';
  path: string;
}

/**
 * Represents a Buffer input (Node.js)
 */
export interface BufferInput {
  type: 'buffer';
  buffer: Buffer;
  filename: string;
}

/**
 * Represents a Uint8Array input
 */
export interface Uint8ArrayInput {
  type: 'uint8array';
  data: Uint8Array;
  filename: string;
}

/**
 * Represents a URL input
 */
export interface UrlInput {
  type: 'url';
  url: string;
}

/**
 * Union type for local file inputs (Node.js only).
 * Does not include URLs - for URL support, use the workflow builder.
 */
export type FileInput =
  | FilePathInput
  | BufferInput
  | Uint8ArrayInput
  | Buffer // Node.js Buffer
  | Uint8Array // Raw binary data
  | string; // File path

/**
 * File input that also accepts URLs (for workflow builder).
 * URLs are passed directly to the server for fetching.
 */
export type FileInputWithUrl = FileInput | UrlInput;

/**
 * Type guard to check if input is a Buffer
 */
export function isBuffer(input: unknown): input is Buffer {
  return typeof Buffer !== 'undefined' && Buffer.isBuffer(input);
}

/**
 * Type guard to check if input is a Uint8Array
 */
export function isUint8Array(input: unknown): input is Uint8Array {
  return input instanceof Uint8Array;
}

/**
 * Type guard to check if string is a URL
 */
export function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
