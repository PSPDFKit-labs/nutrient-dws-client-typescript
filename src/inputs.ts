import type { FileInput, UrlInput } from './types';
import { isBuffer, isUint8Array, isUrl } from './types';
import { ValidationError } from './errors';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

/**
 * Normalized file data for internal processing (Node.js only)
 */
export interface NormalizedFileData {
  data: Buffer | Uint8Array | NodeJS.ReadableStream;
  filename: string;
  contentType?: string;
}

/**
 * Processes various file input types into a normalized format (Node.js only)
 */
export async function processFileInput(
  input: Exclude<FileInput, UrlInput>,
): Promise<NormalizedFileData> {
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
 * Validation that the input is a remote file type
 */
export function isRemoteFileInput(input: FileInput): input is UrlInput | string {
  if (typeof input === 'string') {
    return isUrl(input);
  }

  return typeof input === 'object' && input !== null && 'type' in input && input.type === 'url';
}

/**
 * Process Remote File Input
 */
export async function processRemoteFileInput(
  input: UrlInput | string,
): Promise<NormalizedFileData> {
  let url: string;
  if (typeof input === 'string') {
    url = input;
  } else {
    url = input.url;
  }

  const buffer = await fetchFromUrl(url);
  return {
    data: buffer,
    filename: 'buffer',
  };
}

/**
 * Fetches data from a URL and returns it as a Buffer
 *
 * @param url - The URL to fetch data from
 * @returns A Buffer containing the fetched data
 * @throws {ValidationError} If the fetch fails or returns a non-OK response
 */
async function fetchFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch URL: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to fetch URL: ${url}`, {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Zero dependency way to get the number of pages in a PDF.
 *
 * @param pdfData - Normalized file data of a PDF file
 * @returns Number of pages in a PDF
 * @throws {ValidationError} If the input is not a valid PDF or if the page count cannot be determined
 */
export async function getPdfPageCount(pdfData: NormalizedFileData): Promise<number> {
  let pdfBytes: Buffer;

  // Handle different data types in NormalizedFileData
  if (isBuffer(pdfData.data)) {
    pdfBytes = pdfData.data;
  } else if (isUint8Array(pdfData.data)) {
    pdfBytes = Buffer.from(pdfData.data);
  } else if (pdfData.data instanceof fs.ReadStream || pdfData.data instanceof Readable) {
    // Handle ReadableStream by reading it into a buffer
    try {
      const chunks = [];
      for await (const chunk of pdfData.data) {
        chunks.push(chunk);
      }
      pdfBytes = Buffer.concat(chunks);
    } catch (error) {
      throw new ValidationError(`Failed to read PDF stream: ${pdfData.filename}`, {
        filename: pdfData.filename,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    throw new ValidationError('Invalid PDF data provided', { input: pdfData });
  }

  // Convert to string for regex operations
  const pdfContent = pdfBytes.toString('binary');

  // Find all PDF objects - using a safer regex pattern to avoid catastrophic backtracking
  // Limit the content between obj and endobj to avoid ReDoS vulnerability
  const objects: Array<[string, string, string]> = [];

  // Split by 'endobj' and process each chunk
  const chunks = pdfContent.split('endobj');
  for (let i = 0; i < chunks.length - 1; i++) {
    // For each chunk, find the start of the object
    const objMatch = /(\d+)\s+(\d+)\s+obj/.exec(chunks[i] as string);
    if (objMatch?.[1] && objMatch[2]) {
      const objNum = objMatch[1];
      const genNum = objMatch[2];
      // Extract content after 'obj'
      const content = (chunks[i] as string).substring(objMatch.index + objMatch[0].length);
      objects.push([objNum, genNum, content]);
    }
  }

  if (objects.length === 0) {
    throw new ValidationError('Could not find any objects in PDF', { input: pdfData });
  }

  // Get the Catalog Object
  let catalogObj: string | null = null;
  for (const [, , objData] of objects) {
    if (objData.includes('/Type') && objData.includes('/Catalog')) {
      catalogObj = objData;
      break;
    }
  }

  if (!catalogObj) {
    throw new ValidationError('Could not find /Catalog object in PDF', { input: pdfData });
  }

  // Extract /Pages reference (e.g. 3 0 R)
  const pagesRefMatch = /\/Pages\s+(\d+)\s+(\d+)\s+R/.exec(catalogObj);
  if (!pagesRefMatch) {
    throw new ValidationError('Could not find /Pages reference in /Catalog', { input: pdfData });
  }

  const pagesObjNum = pagesRefMatch[1];
  const pagesObjGen = pagesRefMatch[2];

  // Find the referenced /Pages object from our already parsed objects array
  // This avoids using another potentially vulnerable regex
  let pagesObjData: string | null = null;
  for (const [objNum, genNum, objData] of objects) {
    if (objNum === pagesObjNum && genNum === pagesObjGen) {
      pagesObjData = objData;
      break;
    }
  }

  if (!pagesObjData) {
    throw new ValidationError('Could not find root /Pages object', { input: pdfData });
  }

  // Extract /Count
  const countMatch = /\/Count\s+(\d+)/.exec(pagesObjData);
  if (!countMatch) {
    throw new ValidationError('Could not find /Count in root /Pages object', { input: pdfData });
  }

  return parseInt(countMatch[1] as string, 10);
}

/**
 * Zero dependency way to check if a file is a valid PDF.
 *
 * @param fileData - Normalized file data to check
 * @returns Boolean indicating if the input is a valid PDF
 */
export async function isValidPdf(fileData: NormalizedFileData): Promise<boolean> {
  let fileBytes: Buffer;

  try {
    // Handle different data types in NormalizedFileData
    if (isBuffer(fileData.data)) {
      fileBytes = fileData.data;
    } else if (isUint8Array(fileData.data)) {
      fileBytes = Buffer.from(fileData.data);
    } else if (fileData.data instanceof fs.ReadStream || fileData.data instanceof Readable) {
      // Handle ReadableStream by reading it into a buffer
      try {
        const chunks = [];
        for await (const chunk of fileData.data) {
          chunks.push(chunk);
        }
        fileBytes = Buffer.concat(chunks);
      } catch {
        return false;
      }
    } else {
      return false;
    }

    // Check for PDF header
    // PDF files start with %PDF- followed by version number (e.g., %PDF-1.4)
    const pdfHeader = fileBytes.slice(0, 5).toString('ascii');
    return pdfHeader === '%PDF-';
  } catch {
    // If any error occurs during reading or processing, it's not a valid PDF
    return false;
  }
}
