import type { FileInput, FileInputWithUrl } from './types';
import { isBuffer, isUint8Array, isUrl } from './types';
import { ValidationError } from './errors';
import fs from 'fs';
import path from 'path';

/**
 * Normalized file data for internal processing (Node.js only)
 */
export interface NormalizedFileData {
  data: Buffer | Uint8Array | NodeJS.ReadableStream;
  filename: string;
  contentType?: string;
}

/**
 * Processes various file input types into a normalized format (Node.js only).
 */
export async function processFileInput(input: FileInput): Promise<NormalizedFileData> {
  if (typeof input === 'string') {
    return await processFilePathInput(input);
  }

  if (isBuffer(input)) {
    return processBufferInput(input);
  }

  if (isUint8Array(input)) {
    return processUint8ArrayInput(input);
  }

  // Handle structured input objects
  if (typeof input === 'object' && input !== null) {
    if ('type' in input) {
      switch (input.type) {
        case 'file-path':
          return await processFilePathInput(input.path);
        case 'buffer':
          return processBufferInput(input.buffer, input.filename);
        case 'uint8array':
          return processUint8ArrayInput(input.data, input.filename);
        default:
          throw new ValidationError(`Unsupported input type: ${(input as { type: string }).type}`, {
            input,
          });
      }
    }
  }

  throw new ValidationError('Invalid file input provided', { input });
}

/**
 * Process Buffer (Node.js)
 */
function processBufferInput(buffer: Buffer, filename?: string): NormalizedFileData {
  return {
    data: buffer,
    filename: filename ?? 'buffer',
  };
}

/**
 * Process Uint8Array
 */
function processUint8ArrayInput(data: Uint8Array, filename?: string): NormalizedFileData {
  return {
    data: data,
    filename: filename ?? 'data.bin',
  };
}

/**
 * Process file path (Node.js only)
 */
async function processFilePathInput(filePath: string): Promise<NormalizedFileData> {
  try {
    // Check if file exists
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
    } catch {
      throw new ValidationError(`File not found: ${filePath}`, { filePath });
    }

    // Create read stream instead of reading entire file into memory
    const readStream = fs.createReadStream(filePath);
    const filename = path.basename(filePath);

    // Add error handling to ensure stream is properly closed on errors
    readStream.on('error', (streamError) => {
      readStream.destroy();
      throw new ValidationError(`Failed to read file: ${filePath}`, {
        filePath,
        error: streamError.message,
      });
    });

    return {
      data: readStream,
      filename,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to create read stream for file: ${filePath}`, {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Validates that the input is a supported file type (Node.js only)
 */
export function validateFileInput(input: unknown): input is FileInput {
  if (typeof input === 'string') {
    return true; // Could be file path or URL
  }

  if (isBuffer(input) || isUint8Array(input)) {
    return true;
  }

  if (typeof input === 'object' && input !== null && 'type' in input) {
    const typedInput = input as { type: string };
    return ['file-path', 'buffer', 'uint8array', 'url'].includes(typedInput.type);
  }

  return false;
}

/**
 * Checks if the input is a URL (for workflow builder use).
 */
export function isRemoteFileInput(input: FileInputWithUrl): boolean {
  if (typeof input === 'string') {
    return isUrl(input);
  }

  return typeof input === 'object' && input !== null && 'type' in input && input.type === 'url';
}
