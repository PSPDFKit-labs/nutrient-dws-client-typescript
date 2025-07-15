import type {
  FileInput,
  NutrientClientOptions,
  WorkflowInitialStage,
  TypedWorkflowResult,
  WorkflowWithPartsStage,
  OutputTypeMap,
  WorkflowResult,
} from './types';
import { ValidationError, NutrientError } from './errors';
import { workflow } from './workflow';
import type { components, operations } from './generated/api-types';
import { BuildActions } from './build';
import {
  getPdfPageCount,
  isRemoteFileInput,
  processFileInput,
  processRemoteFileInput,
  isValidPdf,
} from './inputs';
import { sendRequest } from './http';
import type { NormalizedFileData } from './inputs';
import type { ApplicableAction } from './builders/workflow';

/**
 * Normalizes page parameters according to the requirements:
 * - start and end are inclusive
 * - start defaults to 0 (first page)
 * - end defaults to -1 (last page)
 * - negative end values loop from the end of the document
 *
 * @param pages - The page parameters to normalize
 * @param pageCount - The total number of pages in the document (required for negative indices)
 * @returns Normalized page parameters
 * @private
 */
function normalizePageParams(
  pages?: { start?: number; end?: number },
  pageCount?: number,
): { start: number; end: number } {
  let start = pages?.start ?? 0;
  let end = pages?.end ?? -1;

  // Handle negative end values if pageCount is provided
  if (pageCount !== undefined && start < 0) {
    start = pageCount + start;
  }

  if (pageCount !== undefined && end < 0) {
    end = pageCount + end;
  }

  return { start, end };
}

/**
 * Main client for interacting with the Nutrient Document Web Services API.
 *
 * @example
 * ```typescript
 * // Server-side usage with API key
 * const client = new NutrientClient({
 *   apiKey: 'your-secret-api-key'
 * });
 *
 * // Client-side usage with token provider
 * const client = new NutrientClient({
 *   apiKey: async () => {
 *     const response = await fetch('/api/get-nutrient-token');
 *     const { token } = await response.json();
 *     return token;
 *   }
 * });
 * ```
 */
export class NutrientClient {
  /**
   * Client configuration options
   */
  private options: NutrientClientOptions;

  /**
   * Creates a new NutrientClient instance
   *
   * @param options - Configuration options for the client
   * @throws {ValidationError} If options are invalid
   */
  constructor(options: NutrientClientOptions) {
    this.validateOptions(options);
    this.options = options;
  }

  /**
   * Validates client options
   *
   * @param options - Configuration options to validate
   * @throws {ValidationError} If options are invalid
   * @private
   */
  private validateOptions(options: NutrientClientOptions): void {
    if (!options) {
      throw new ValidationError('Client options are required');
    }

    if (!options.apiKey) {
      throw new ValidationError('API key is required');
    }

    if (typeof options.apiKey !== 'string' && typeof options.apiKey !== 'function') {
      throw new ValidationError(
        'API key must be a string or a function that returns a Promise<string>',
      );
    }

    if (options.baseUrl && typeof options.baseUrl !== 'string') {
      throw new ValidationError('Base URL must be a string');
    }
  }

  /**
   * Gets account information for the current API key
   *
   * @returns Promise resolving to account information
   *
   * @example
   * ```typescript
   * const accountInfo = await client.getAccountInfo();
   * console.log(accountInfo.subscriptionType);
   * ```
   */
  async getAccountInfo(): Promise<
    operations['get-account-info']['responses']['200']['content']['application/json']
  > {
    const response = await sendRequest(
      {
        method: 'GET',
        endpoint: '/account/info',
        data: undefined,
      },
      this.options,
      'json',
    );

    return response.data;
  }

  /**
   * Creates a new authentication token
   *
   * @param params - Parameters for creating the token
   * @returns Promise resolving to the created token information
   *
   * @example
   * ```typescript
   * const token = await client.createToken({
   *   name: 'My API Token',
   *   expiresIn: '30d'
   * });
   * console.log(token.id);
   * ```
   */
  async createToken(
    params: components['schemas']['CreateAuthTokenParameters'],
  ): Promise<components['schemas']['CreateAuthTokenResponse']> {
    const response = await sendRequest(
      {
        method: 'POST',
        endpoint: '/tokens',
        data: params,
      },
      this.options,
      'json',
    );

    return response.data;
  }

  /**
   * Deletes an authentication token
   *
   * @param id - ID of the token to delete
   * @returns Promise resolving when the token is deleted
   *
   * @example
   * ```typescript
   * await client.deleteToken('token-id-123');
   * ```
   */
  async deleteToken(id: string): Promise<void> {
    await sendRequest(
      {
        method: 'DELETE',
        endpoint: '/tokens',
        data: { id },
      },
      this.options,
      'json',
    );
  }

  /**
   * Creates a new WorkflowBuilder for chaining multiple operations
   *
   * @param overrideTimeout - Set a custom timeout for the workflow (in milliseconds)
   * @returns A new WorkflowBuilder instance
   *
   * @example
   * ```typescript
   * const result = await client
   *   .workflow()
   *   .addFilePart('document.docx')
   *   .applyAction(BuildActions.ocr('english'))
   *   .outputPdf()
   *   .execute();
   * ```
   */
  workflow(overrideTimeout?: number): WorkflowInitialStage {
    return workflow({
      ...this.options,
      timeout: overrideTimeout ?? this.options.timeout,
    });
  }

  /**
   * Helper function that takes a TypedWorkflowResult, throws any errors, and returns the specific output type
   *
   * @param result - The TypedWorkflowResult to process
   * @returns The specific output type from the result
   * @throws {NutrientError} If the workflow was not successful or if output is missing
   * @private
   */
  private processTypedWorkflowResult<T extends keyof OutputTypeMap>(
    result: TypedWorkflowResult<T>,
  ): OutputTypeMap[T] {
    if (!result.success) {
      // If there are errors, throw the first one
      if (result.errors?.[0]) {
        throw result.errors[0].error;
      }
      // If no specific errors but operation failed
      throw new NutrientError(
        'Workflow operation failed without specific error details',
        'WORKFLOW_ERROR',
      );
    }

    // Check if output exists
    if (!result.output) {
      throw new NutrientError(
        'Workflow completed successfully but no output was returned',
        'MISSING_OUTPUT',
      );
    }

    return result.output as OutputTypeMap[T];
  }

  /**
   * Signs a PDF document
   *
   * @param pdf - The PDF file to sign
   * @param data - Signature data
   * @param options - Additional options
   * @returns Promise resolving to the signed PDF file output
   *
   * @example
   * ```typescript
   * const result = await client.sign('document.pdf', {
   *   data: {
   *     signatureType: 'cms',
   *     flatten: false,
   *     cadesLevel: 'b-lt'
   *   }
   * });
   *
   * // Access the signed PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('signed-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async sign(
    pdf: FileInput,
    data?: components['schemas']['CreateDigitalSignature'],
    options?: {
      image?: FileInput;
      graphicImage?: FileInput;
    },
  ): Promise<OutputTypeMap['pdf']> {
    // Normalize the file input
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    // Prepare optional files
    let normalizedImage: NormalizedFileData | undefined;
    let normalizedGraphicImage: NormalizedFileData | undefined;

    if (options?.image) {
      normalizedImage = isRemoteFileInput(options.image)
        ? await processRemoteFileInput(options.image)
        : await processFileInput(options.image);
    }

    if (options?.graphicImage) {
      normalizedGraphicImage = isRemoteFileInput(options.graphicImage)
        ? await processRemoteFileInput(options.graphicImage)
        : await processFileInput(options.graphicImage);
    }

    const response = await sendRequest(
      {
        method: 'POST',
        endpoint: '/sign',
        data: {
          file: normalizedFile,
          data,
          image: normalizedImage,
          graphicImage: normalizedGraphicImage,
        },
      },
      this.options,
      'arraybuffer',
    );

    const buffer = new Uint8Array(response.data as unknown as ArrayBuffer);

    return { mimeType: 'application/pdf', filename: 'output.pdf', buffer };
  }

  /**
   * Adds a text watermark to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to watermark
   * @param text - The watermark text
   * @param options - Watermark options
   * @returns Promise resolving to the watermarked document
   *
   * @example
   * ```typescript
   * const result = await client.watermarkText('document.pdf', 'CONFIDENTIAL', {
   *   opacity: 0.5,
   *   fontSize: 24
   * });
   *
   * // Access the watermarked PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('watermarked-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async watermarkText(
    file: FileInput,
    text: string,
    options: Partial<Omit<components['schemas']['TextWatermarkAction'], 'type' | 'text'>> = {},
  ): Promise<OutputTypeMap['pdf']> {
    const watermarkAction = BuildActions.watermarkText(text, options);

    const builder = this.workflow().addFilePart(file, undefined, [watermarkAction]);

    const result = await builder.outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Adds an image watermark to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to watermark
   * @param image - The watermark image
   * @param options - Watermark options
   * @returns Promise resolving to the watermarked document
   *
   * @example
   * ```typescript
   * const result = await client.watermarkImage('document.pdf', 'watermark.jpg', {
   *   opacity: 0.5,
   *   scale: 0.5
   * });
   *
   * // Access the watermarked PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('image-watermarked-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async watermarkImage(
    file: FileInput,
    image: FileInput,
    options: Partial<Omit<components['schemas']['ImageWatermarkAction'], 'type' | 'image'>> = {},
  ): Promise<OutputTypeMap['pdf']> {
    const watermarkAction = BuildActions.watermarkImage(image, options);

    const builder = this.workflow().addFilePart(file, undefined, [watermarkAction]);

    const result = await builder.outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Converts a document to a different format
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to convert
   * @param targetFormat - The target format to convert to
   * @returns Promise resolving to the specific output type based on the target format
   *
   * @example
   * ```typescript
   * // Convert DOCX to PDF
   * const pdfResult = await client.convert('document.docx', 'pdf');
   *
   * // Access the PDF buffer
   * const pdfBuffer = pdfResult.buffer;
   * console.log(pdfResult.mimeType); // 'application/pdf'
   *
   * // Save the PDF (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('converted-document.pdf', Buffer.from(pdfResult.buffer));
   *
   * // Convert PDF to image
   * const imageResult = await client.convert('document.pdf', 'png');
   *
   * // Access the PNG buffer
   * const pngBuffer = imageResult.buffer;
   * console.log(imageResult.mimeType); // 'image/png'
   *
   * // Save the image (Node.js example)
   * fs.writeFileSync('document-page.png', Buffer.from(imageResult.buffer));
   *
   * // Convert to HTML
   * const htmlResult = await client.convert('document.pdf', 'html');
   *
   * // Access the HTML content
   * const htmlContent = htmlResult.content;
   * console.log(htmlResult.mimeType); // 'text/html'
   *
   * // Save the HTML (Node.js example)
   * fs.writeFileSync('document.html', htmlContent);
   * ```
   */
  async convert<
    T extends
      | 'pdf'
      | 'pdfa'
      | 'pdfua'
      | 'docx'
      | 'xlsx'
      | 'pptx'
      | 'png'
      | 'jpeg'
      | 'jpg'
      | 'webp'
      | 'html'
      | 'markdown',
  >(file: FileInput, targetFormat: T): Promise<OutputTypeMap[T]> {
    const builder = this.workflow().addFilePart(file);
    let result: TypedWorkflowResult<T>;

    switch (targetFormat) {
      case 'pdf':
        result = (await builder.outputPdf().execute()) as TypedWorkflowResult<T>;
        break;
      case 'pdfa':
        result = (await builder.outputPdfA().execute()) as TypedWorkflowResult<T>;
        break;
      case 'pdfua':
        result = (await builder.outputPdfUA().execute()) as TypedWorkflowResult<T>;
        break;
      case 'docx':
        result = (await builder.outputOffice('docx').execute()) as TypedWorkflowResult<T>;
        break;
      case 'xlsx':
        result = (await builder.outputOffice('xlsx').execute()) as TypedWorkflowResult<T>;
        break;
      case 'pptx':
        result = (await builder.outputOffice('pptx').execute()) as TypedWorkflowResult<T>;
        break;
      case 'html':
        result = (await builder.outputHtml('page').execute()) as TypedWorkflowResult<T>;
        break;
      case 'markdown':
        result = (await builder.outputMarkdown().execute()) as TypedWorkflowResult<T>;
        break;
      case 'png':
        result = (await builder
          .outputImage('png', { dpi: 500 })
          .execute()) as TypedWorkflowResult<T>;
        break;
      case 'jpeg':
        result = (await builder
          .outputImage('jpeg', { dpi: 500 })
          .execute()) as TypedWorkflowResult<T>;
        break;
      case 'jpg':
        result = (await builder
          .outputImage('jpg', { dpi: 500 })
          .execute()) as TypedWorkflowResult<T>;
        break;
      case 'webp':
        result = (await builder
          .outputImage('webp', { dpi: 500 })
          .execute()) as TypedWorkflowResult<T>;
        break;
      default:
        throw new ValidationError(`Unsupported target format: ${String(targetFormat)}`);
    }

    return this.processTypedWorkflowResult<T>(result);
  }

  /**
   * Performs OCR (Optical Character Recognition) on a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The input file to perform OCR on
   * @param language - The language(s) to use for OCR
   * @returns Promise resolving to the OCR result
   *
   * @example
   * ```typescript
   * const result = await client.ocr('scanned-document.pdf', 'english');
   *
   * // Access the OCR-processed PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('ocr-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async ocr(
    file: FileInput,
    language: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][],
  ): Promise<OutputTypeMap['pdf']> {
    const ocrAction = BuildActions.ocr(language);

    const builder = this.workflow().addFilePart(file, undefined, [ocrAction]);

    const result = await builder.outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Extracts text content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract text from
   * @param pages - Optional page range to extract text from.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @returns Promise resolving to the extracted text data
   *
   * @example
   * ```typescript
   * const result = await client.extractText('document.pdf');
   * console.log(result.data);
   *
   * // Extract text from specific pages
   * const result = await client.extractText('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2
   *
   * // Extract text from the last page
   * const result = await client.extractText('document.pdf', { end: -1 }); // Last page
   *
   * // Extract text from the second-to-last page to the end
   * const result = await client.extractText('document.pdf', { start: -2 }); // Second-to-last and last page
   *
   * // Access the extracted text content
   * const textContent = result.data.pages[0].plainText;
   *
   * // Process the extracted text
   * const wordCount = textContent.split(/\s+/).length;
   * console.log(`Document contains ${wordCount} words`);
   *
   * // Search for specific content
   * if (textContent.includes('confidential')) {
   *   console.log('Document contains confidential information');
   * }
   * ```
   */
  async extractText(
    file: FileInput,
    pages?: { start?: number; end?: number },
  ): Promise<OutputTypeMap['json-content']> {
    const normalizedPages = pages ? normalizePageParams(pages) : undefined;
    const result = await this.workflow()
      .addFilePart(file, normalizedPages ? { pages: normalizedPages } : undefined)
      .outputJson({ plainText: true, tables: false })
      .execute();
    return this.processTypedWorkflowResult<'json-content'>(result);
  }

  /**
   * Extracts table content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract table from
   * @param pages - Optional page range to extract tables from.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @returns Promise resolving to the extracted table data
   *
   * @example
   * ```typescript
   * const result = await client.extractTable('document.pdf');
   *
   * // Access the extracted tables
   * const tables = result.data.pages[0].tables;
   *
   * // Process the first table if available
   * if (tables && tables.length > 0) {
   *   const firstTable = tables[0];
   *
   *   // Get table dimensions
   *   console.log(`Table has ${firstTable.rows.length} rows and ${firstTable.columns.length} columns`);
   *
   *   // Access table cells
   *   for (let i = 0; i < firstTable.rows.length; i++) {
   *     for (let j = 0; j < firstTable.columns.length; j++) {
   *       const cell = firstTable.cells.find(cell => cell.rowIndex === i && cell.columnIndex === j);
   *       const cellContent = cell?.text || '';
   *       console.log(`Cell [${i}][${j}]: ${cellContent}`);
   *     }
   *   }
   *
   *   // Convert table to CSV
   *   let csv = '';
   *   for (let i = 0; i < firstTable.rows.length; i++) {
   *     const rowData = [];
   *     for (let j = 0; j < firstTable.columns.length; j++) {
   *       const cell = firstTable.cells.find(cell => cell.rowIndex === i && cell.columnIndex === j);
   *       rowData.push(cell?.text || '');
   *     }
   *     csv += rowData.join(',') + '\n';
   *   }
   *   console.log(csv);
   * }
   *
   * // Extract tables from specific pages
   * const result = await client.extractTable('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2
   *
   * // Extract tables from the last page
   * const result = await client.extractTable('document.pdf', { end: -1 }); // Last page
   *
   * // Extract tables from the second-to-last page to the end
   * const result = await client.extractTable('document.pdf', { start: -2 }); // Second-to-last and last page
   * ```
   */
  async extractTable(
    file: FileInput,
    pages?: { start?: number; end?: number },
  ): Promise<OutputTypeMap['json-content']> {
    const normalizedPages = pages ? normalizePageParams(pages) : undefined;
    const result = await this.workflow()
      .addFilePart(file, normalizedPages ? { pages: normalizedPages } : undefined)
      .outputJson({ plainText: false, tables: true })
      .execute();
    return this.processTypedWorkflowResult<'json-content'>(result);
  }

  /**
   * Extracts key value pair content from a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to extract KVPs from
   * @param pages - Optional page range to extract KVPs from.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @returns Promise resolving to the extracted KVPs data
   *
   * @example
   * ```typescript
   * const result = await client.extractKeyValuePairs('document.pdf');
   *
   * // Access the extracted key-value pairs
   * const kvps = result.data.pages[0].keyValuePairs;
   *
   * // Process the key-value pairs
   * if (kvps && kvps.length > 0) {
   *   // Iterate through all key-value pairs
   *   kvps.forEach((kvp, index) => {
   *     console.log(`KVP ${index + 1}:`);
   *     console.log(`  Key: ${kvp.key}`);
   *     console.log(`  Value: ${kvp.value}`);
   *     console.log(`  Confidence: ${kvp.confidence}`);
   *   });
   *
   *   // Create a dictionary from the key-value pairs
   *   const dictionary = {};
   *   kvps.forEach(kvp => {
   *     dictionary[kvp.key] = kvp.value;
   *   });
   *
   *   // Look up specific values
   *   console.log(`Invoice Number: ${dictionary['Invoice Number']}`);
   *   console.log(`Date: ${dictionary['Date']}`);
   *   console.log(`Total Amount: ${dictionary['Total']}`);
   * }
   *
   * // Extract KVPs from specific pages
   * const result = await client.extractKeyValuePairs('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2
   *
   * // Extract KVPs from the last page
   * const result = await client.extractKeyValuePairs('document.pdf', { end: -1 }); // Last page
   *
   * // Extract KVPs from the second-to-last page to the end
   * const result = await client.extractKeyValuePairs('document.pdf', { start: -2 }); // Second-to-last and last page
   * ```
   */
  async extractKeyValuePairs(
    file: FileInput,
    pages?: { start?: number; end?: number },
  ): Promise<OutputTypeMap['json-content']> {
    const normalizedPages = pages ? normalizePageParams(pages) : undefined;
    const result = await this.workflow()
      .addFilePart(file, normalizedPages ? { pages: normalizedPages } : undefined)
      .outputJson({ plainText: false, tables: false, keyValuePairs: true })
      .execute();
    return this.processTypedWorkflowResult<'json-content'>(result);
  }

  /**
   * Password protects a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param file - The file to protect
   * @param userPassword - Password required to open the document
   * @param ownerPassword - Password required to modify the document
   * @param permissions - Optional array of permissions granted when opened with user password
   * @returns Promise resolving to the password-protected document
   *
   * @example
   * ```typescript
   * const result = await client.passwordProtect('document.pdf', 'user123', 'owner456');
   * // Or with specific permissions:
   * const result = await client.passwordProtect('document.pdf', 'user123', 'owner456',
   *   ['printing', 'extract_accessibility']);
   *
   * // Access the password-protected PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('protected-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async passwordProtect(
    file: FileInput,
    userPassword: string,
    ownerPassword: string,
    permissions?: components['schemas']['PDFUserPermission'][],
  ): Promise<OutputTypeMap['pdf']> {
    const result = await this.workflow()
      .addFilePart(file)
      .outputPdf({
        user_password: userPassword,
        owner_password: ownerPassword,
        ...(permissions && { user_permissions: permissions }),
      })
      .execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Sets metadata for a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to modify
   * @param metadata - The metadata to set (title and/or author)
   * @returns Promise resolving to the document with updated metadata
   *
   * @example
   * ```typescript
   * const result = await client.setMetadata('document.pdf', {
   *   title: 'My Document',
   *   author: 'John Doe'
   * });
   *
   * // Access the PDF with updated metadata
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-metadata.pdf', Buffer.from(result.buffer));
   * ```
   */
  async setMetadata(
    pdf: FileInput,
    metadata: components['schemas']['Metadata'],
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const result = await this.workflow().addFilePart(pdf).outputPdf({ metadata }).execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Sets page labels for a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to modify
   * @param labels - Array of label objects with pages and label properties
   * @returns Promise resolving to the document with updated page labels
   *
   * @example
   * ```typescript
   * const result = await client.setPageLabels('document.pdf', [
   *   { pages: [0, 1, 2], label: 'Cover' },
   *   { pages: [3, 4, 5], label: 'Chapter 1' }
   * ]);
   *
   * // Access the PDF with updated page labels
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-labels.pdf', Buffer.from(result.buffer));
   * ```
   */
  async setPageLabels(
    pdf: FileInput,
    labels: components['schemas']['Label'][],
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const result = await this.workflow().addFilePart(pdf).outputPdf({ labels }).execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Applies Instant JSON to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to modify
   * @param instantJsonFile - The Instant JSON file to apply
   * @returns Promise resolving to the modified document
   *
   * @example
   * ```typescript
   * const result = await client.applyInstantJson('document.pdf', 'annotations.json');
   *
   * // Access the PDF with applied Instant JSON
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-annotations.pdf', Buffer.from(result.buffer));
   * ```
   */
  async applyInstantJson(
    pdf: FileInput,
    instantJsonFile: FileInput,
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const applyJsonAction = BuildActions.applyInstantJson(instantJsonFile);

    const result = await this.workflow()
      .addFilePart(pdf, undefined, [applyJsonAction])
      .outputPdf()
      .execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Applies XFDF to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to modify
   * @param xfdfFile - The XFDF file to apply
   * @param options - Optional settings for applying XFDF
   * @returns Promise resolving to the modified document
   *
   * @example
   * ```typescript
   * const result = await client.applyXfdf('document.pdf', 'annotations.xfdf');
   * // Or with options:
   * const result = await client.applyXfdf('document.pdf', 'annotations.xfdf', {
   *   ignorePageRotation: true,
   *   richTextEnabled: false
   * });
   *
   * // Access the PDF with applied XFDF annotations
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-xfdf.pdf', Buffer.from(result.buffer));
   * ```
   */
  async applyXfdf(
    pdf: FileInput,
    xfdfFile: FileInput,
    options?: {
      ignorePageRotation?: boolean;
      richTextEnabled?: boolean;
    },
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const applyXfdfAction = BuildActions.applyXfdf(xfdfFile, options);

    const result = await this.workflow()
      .addFilePart(pdf, undefined, [applyXfdfAction])
      .outputPdf()
      .execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Uses AI to redact sensitive information in a document
   *
   * @param pdf - The PDF file to redact
   * @param criteria - AI redaction criteria
   * @param redaction_state - Whether to stage or apply redactions (default: 'stage')
   * @param pages - Optional pages to redact.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @param options - Optional redaction options
   * @returns Promise resolving to the redacted document
   *
   * @example
   * ```typescript
   * // Stage redactions
   * const result = await client.createRedactionsAI(
   *   'document.pdf',
   *   'Remove all emails'
   * );
   *
   * // Apply redactions immediately
   * const result = await client.createRedactionsAI(
   *   'document.pdf',
   *   'Remove all PII',
   *   'apply'
   * );
   *
   * // Redact specific pages
   * const result = await client.createRedactionsAI(
   *   'document.pdf',
   *   'Remove all PII',
   *   'stage',
   *   { start: 0, end: 2 }  // Pages 0, 1, 2
   * );
   *
   * // Redact the last 3 pages
   * const result = await client.createRedactionsAI(
   *   'document.pdf',
   *   'Remove all PII',
   *   'stage',
   *   { start: -3, end: -1 }  // Last three pages
   * );
   *
   * // Access the redacted PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('redacted-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async createRedactionsAI(
    pdf: FileInput,
    criteria: string,
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    options?: components['schemas']['RedactData']['options'],
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const pageCount = await getPdfPageCount(normalizedFile);

    const response = await sendRequest(
      {
        method: 'POST',
        endpoint: '/ai/redact',
        data: {
          data: {
            documents: [
              {
                file: 'file',
                pages: pages ? normalizePageParams(pages, pageCount) : undefined,
              },
            ],
            criteria,
            redaction_state,
            options,
          },
          file: normalizedFile,
          fileKey: 'file',
        },
      },
      this.options,
      'arraybuffer',
    );

    const buffer = new Uint8Array(response.data as unknown as ArrayBuffer);

    return { mimeType: 'application/pdf', filename: 'output.pdf', buffer };
  }

  /**
   * Creates redaction annotations based on a preset pattern
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to create redactions in
   * @param preset - The preset pattern to search for (e.g., 'email-address', 'social-security-number')
   * @param redaction_state - Whether to stage or apply redactions (default: 'stage')
   * @param pages - Optional page range to create redactions in.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @param presetOptions - Optional settings for the preset strategy
   * @param options - Optional settings for creating redactions
   * @returns Promise resolving to the document with redaction annotations
   *
   * @example
   * ```typescript
   * const result = await client.createRedactionsPreset('document.pdf', 'email-address');
   *
   * // Or with options:
   * const result = await client.createRedactionsPreset(
   *   'document.pdf',
   *   'social-security-number',
   *   'stage',
   *   { start: 0, end: 4 },  // Pages 0, 1, 2, 3, 4
   *   { includeAnnotations: true }
   * );
   *
   * // Create redactions on the last 3 pages:
   * const result = await client.createRedactionsPreset(
   *   'document.pdf',
   *   'email-address',
   *   'stage',
   *   { start: -3, end: -1 }  // Last three pages
   * );
   *
   * // Access the PDF with redaction annotations
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-redactions.pdf', Buffer.from(result.buffer));
   * ```
   */
  async createRedactionsPreset(
    pdf: FileInput,
    preset: components['schemas']['SearchPreset'],
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    presetOptions?: Omit<
      components['schemas']['CreateRedactionsStrategyOptionsPreset'],
      'preset' | 'start' | 'limit'
    >,
    options?: Omit<
      components['schemas']['CreateRedactionsAction'],
      'type' | 'strategyOptions' | 'strategy'
    >,
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }
    // Get page count for handling negative indices
    const pageCount = await getPdfPageCount(normalizedFile);
    const normalizedPages = normalizePageParams(pages, pageCount);

    const createRedactionsAction = BuildActions.createRedactionsPreset(preset, options, {
      start: normalizedPages.start,
      limit: normalizedPages.end >= 0 ? normalizedPages.end - normalizedPages.start + 1 : undefined,
      ...presetOptions,
    });
    const actions: ApplicableAction[] = [createRedactionsAction];

    if (redaction_state === 'apply') {
      actions.push(BuildActions.applyRedactions());
    }

    const result = await this.workflow().addFilePart(pdf, undefined, actions).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Creates redaction annotations based on a regular expression
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to create redactions in
   * @param regex - The regular expression to search for
   * @param redaction_state - Whether to stage or apply redactions (default: 'stage')
   * @param pages - Optional page range to create redactions in.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @param regrexOptions - Optional settings for the regex strategy
   * @param options - Optional settings for creating redactions
   * @returns Promise resolving to the document with redaction annotations
   *
   * @example
   * ```typescript
   * const result = await client.createRedactionsRegex('document.pdf', 'Account:\\s*\\d{8,12}');
   *
   * // Or with options:
   * const result = await client.createRedactionsRegex(
   *   'document.pdf',
   *   'Account:\\s*\\d{8,12}',
   *   'stage',
   *   { start: 0, end: 4 },  // Pages 0, 1, 2, 3, 4
   *   { caseSensitive: false, includeAnnotations: true }
   * );
   *
   * // Create redactions on the last 3 pages:
   * const result = await client.createRedactionsRegex(
   *   'document.pdf',
   *   'Account:\\s*\\d{8,12}',
   *   'stage',
   *   { start: -3, end: -1 }  // Last three pages
   * );
   *
   * // Access the PDF with redaction annotations
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-regex-redactions.pdf', Buffer.from(result.buffer));
   * ```
   */
  async createRedactionsRegex(
    pdf: FileInput,
    regex: string,
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    regrexOptions?: Omit<
      components['schemas']['CreateRedactionsStrategyOptionsRegex'],
      'regex' | 'start' | 'limit'
    >,
    options?: Omit<
      components['schemas']['CreateRedactionsAction'],
      'type' | 'strategyOptions' | 'strategy'
    >,
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    // Get page count for handling negative indices
    const pageCount = await getPdfPageCount(normalizedFile);
    const normalizedPages = normalizePageParams(pages, pageCount);

    const createRedactionsAction = BuildActions.createRedactionsRegex(regex, options, {
      start: normalizedPages.start,
      limit: normalizedPages.end >= 0 ? normalizedPages.end - normalizedPages.start + 1 : undefined,
      ...regrexOptions,
    });
    const actions: ApplicableAction[] = [createRedactionsAction];

    if (redaction_state === 'apply') {
      actions.push(BuildActions.applyRedactions());
    }

    const result = await this.workflow().addFilePart(pdf, undefined, actions).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Creates redaction annotations based on text
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to create redactions in
   * @param text - The text to search for
   * @param redaction_state - Whether to stage or apply redactions (default: 'stage')
   * @param pages - Optional page range to create redactions in.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @param textOptions - Optional settings for the text strategy
   * @param options - Optional settings for creating redactions
   * @returns Promise resolving to the document with redaction annotations
   *
   * @example
   * ```typescript
   * const result = await client.createRedactionsText('document.pdf', 'email@example.com');
   *
   * // Or with options:
   * const result = await client.createRedactionsText(
   *   'document.pdf',
   *   'email@example.com',
   *   'stage',
   *   { start: 0, end: 4 },  // Pages 0, 1, 2, 3, 4
   *   { caseSensitive: false, includeAnnotations: true }
   * );
   *
   * // Create redactions on the last 3 pages:
   * const result = await client.createRedactionsText(
   *   'document.pdf',
   *   'email@example.com',
   *   'stage',
   *   { start: -3, end: -1 }  // Last three pages
   * );
   *
   * // Access the PDF with redaction annotations
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-text-redactions.pdf', Buffer.from(result.buffer));
   * ```
   */
  async createRedactionsText(
    pdf: FileInput,
    text: string,
    redaction_state: 'stage' | 'apply' = 'stage',
    pages?: { start?: number; end?: number },
    textOptions?: Omit<
      components['schemas']['CreateRedactionsStrategyOptionsText'],
      'text' | 'start' | 'limit'
    >,
    options?: Omit<
      components['schemas']['CreateRedactionsAction'],
      'type' | 'strategyOptions' | 'strategy'
    >,
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }
    // Get page count for handling negative indices
    const pageCount = await getPdfPageCount(normalizedFile);
    const normalizedPages = normalizePageParams(pages, pageCount);

    const createRedactionsAction = BuildActions.createRedactionsText(text, options, {
      start: normalizedPages.start,
      limit: normalizedPages.end >= 0 ? normalizedPages.end - normalizedPages.start + 1 : undefined,
      ...textOptions,
    });
    const actions: ApplicableAction[] = [createRedactionsAction];

    if (redaction_state === 'apply') {
      actions.push(BuildActions.applyRedactions());
    }

    const result = await this.workflow().addFilePart(pdf, undefined, actions).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Apply staged redaction into the PDF
   *
   * @param pdf - The PDF file with redaction annotations to apply
   * @returns Promise resolving to the document with applied redactions
   *
   * @example
   * ```typescript
   * // Stage redactions from a createRedaction Method:
   * const staged_result = await client.createRedactionsText(
   *   'document.pdf',
   *   'email@example.com',
   *   'stage',
   *   { start: -3, end: -1 }  // Last three pages
   * );
   *
   * const result = await client.applyRedactions(staged_result.buffer);
   *
   * // Access the PDF with applied redactions
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-applied-redactions.pdf', Buffer.from(result.buffer));
   * ```
   */
  async applyRedactions(pdf: FileInput): Promise<OutputTypeMap['pdf']> {
    const applyRedactionsAction = BuildActions.applyRedactions();

    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const result = await this.workflow()
      .addFilePart(pdf, undefined, [applyRedactionsAction])
      .outputPdf()
      .execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Flattens annotations in a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to flatten
   * @param annotationIds - Optional specific annotation IDs to flatten
   * @returns Promise resolving to the flattened document
   *
   * @example
   * ```typescript
   * // Flatten all annotations
   * const result = await client.flatten('annotated-document.pdf');
   *
   * // Flatten specific annotations by ID
   * const result = await client.flatten('annotated-document.pdf', ['annotation1', 'annotation2']);
   *
   * // Access the flattened PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('flattened-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async flatten(
    pdf: FileInput,
    annotationIds?: (string | number)[],
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const flattenAction = BuildActions.flatten(annotationIds);

    const result = await this.workflow()
      .addFilePart(pdf, undefined, [flattenAction])
      .outputPdf()
      .execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Rotates pages in a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to rotate
   * @param angle - Rotation angle (90, 180, or 270 degrees)
   * @param pages - Optional page range to rotate.
   *                  start defaults to 0 (first page), end defaults to -1 (last page).
   *                  Both start and end are inclusive. Negative end values count from the end of the document.
   * @returns Promise resolving to the entire document with specified pages rotated
   *
   * @example
   * ```typescript
   * const result = await client.rotate('document.pdf', 90);
   *
   * // Rotate specific pages:
   * const result = await client.rotate('document.pdf', 90, { start: 1, end: 3 }); // Pages 1, 2, 3
   *
   * // Rotate the last page:
   * const result = await client.rotate('document.pdf', 90, { end: -1 }); // Last page
   *
   * // Rotate from page 2 to the second-to-last page:
   * const result = await client.rotate('document.pdf', 90, { start: 2, end: -2 });
   *
   * // Access the rotated PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('rotated-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async rotate(
    pdf: FileInput,
    angle: 90 | 180 | 270,
    pages?: { start?: number; end?: number },
  ): Promise<OutputTypeMap['pdf']> {
    const rotateAction = BuildActions.rotate(angle);
    const workflow = this.workflow();

    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    if (pages) {
      const pageCount = await getPdfPageCount(normalizedFile);
      const normalizedPages = normalizePageParams(pages, pageCount);

      // Add pages before the range to rotate
      if (normalizedPages.start > 0) {
        workflow.addFilePart(pdf, { pages: { start: 0, end: normalizedPages.start - 1 } });
      }

      // Add the specific pages with rotation action
      workflow.addFilePart(pdf, { pages: normalizedPages }, [rotateAction]);

      // Add pages after the range to rotate
      if (normalizedPages.end < pageCount - 1) {
        workflow.addFilePart(pdf, {
          pages: { start: normalizedPages.end + 1, end: pageCount - 1 },
        });
      }
    } else {
      // If no pages specified, rotate the entire document
      workflow.addFilePart(pdf, undefined, [rotateAction]);
    }

    const result = await (workflow as WorkflowWithPartsStage).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Adds blank pages to a document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to add pages to
   * @param count - The number of blank pages to add
   * @param index - Optional index where to add the blank pages (0-based). If not provided, pages are added at the end.
   * @returns Promise resolving to the document with added pages
   *
   * @example
   * ```typescript
   * // Add 2 blank pages at the end
   * const result = await client.addPage('document.pdf', 2);
   *
   * // Add 1 blank page after the first page (at index 1)
   * const result = await client.addPage('document.pdf', 1, 1);
   *
   * // Access the PDF with added pages
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('document-with-added-pages.pdf', Buffer.from(result.buffer));
   * ```
   */
  async addPage(pdf: FileInput, count: number = 1, index?: number): Promise<OutputTypeMap['pdf']> {
    let result: WorkflowResult;

    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    // If no index is provided or it's the end of the document, simply add pages at the end
    if (index === undefined) {
      const builder = this.workflow().addFilePart(pdf);

      // Add the specified number of blank pages
      builder.addNewPage({ pageCount: count });

      result = await builder.outputPdf().execute();
    } else {
      // Get the actual page count of the PDF

      const pageCount = await getPdfPageCount(normalizedFile);

      // Validate that the index is within range
      if (index < 0 || index > pageCount) {
        throw new ValidationError(
          `Index ${index} is out of range (document has ${pageCount} pages)`,
        );
      }

      const builder = this.workflow();

      // Add pages before the specified index
      if (index > 0) {
        const beforePages = normalizePageParams({ start: 0, end: index - 1 }, pageCount);
        builder.addFilePart(pdf, { pages: beforePages });
      }

      // Add the blank pages
      builder.addNewPage({ pageCount: count });

      // Add pages after the specified index
      if (index < pageCount) {
        const afterPages = normalizePageParams({ start: index, end: pageCount - 1 }, pageCount);
        builder.addFilePart(pdf, { pages: afterPages });
      }

      result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    }

    return this.processTypedWorkflowResult(result as TypedWorkflowResult<'pdf'>);
  }

  /**
   * Merges multiple documents into a single document
   * This is a convenience method that uses the workflow builder.
   *
   * @param files - The files to merge
   * @returns Promise resolving to the merged document
   *
   * @example
   * ```typescript
   * const result = await client.merge(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
   *
   * // Access the merged PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('merged-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async merge(files: FileInput[]): Promise<OutputTypeMap['pdf']> {
    if (!files || files.length < 2) {
      throw new ValidationError('At least 2 files are required for merge operation');
    }

    let builder = this.workflow();

    for (const file of files) {
      builder = builder.addFilePart(file);
    }

    const result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Splits a PDF document into multiple parts based on page ranges
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to split
   * @param pageRanges - Array of page ranges to extract.
   *                    For each range, start defaults to 0 (first page), end defaults to -1 (last page).
   *                    Both start and end are inclusive. Negative end values count from the end of the document.
   * @returns Promise resolving to an array of PDF documents, one for each page range
   *
   * @example
   * ```typescript
   * const results = await client.split('document.pdf', [
   *   { start: 0, end: 2 },  // Pages 0, 1, 2
   *   { start: 3, end: 5 }   // Pages 3, 4, 5
   * ]);
   *
   * // Split using negative indices
   * const results = await client.split('document.pdf', [
   *   { start: 0, end: 2 },     // First three pages
   *   { start: 3, end: -3 },    // Middle pages
   *   { start: -2, end: -1 }    // Last two pages
   * ]);
   *
   * // Process each resulting PDF
   * for (const result of results) {
   *   // Do something with result.buffer
   *   console.log(result.mimeType);
   * }
   * ```
   */
  async split(
    pdf: FileInput,
    pageRanges: { start?: number; end?: number }[],
  ): Promise<OutputTypeMap['pdf'][]> {
    if (!pageRanges || pageRanges.length === 0) {
      throw new ValidationError('At least one page range is required for splitting');
    }

    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    // Get the actual page count of the PDF
    const pageCount = await getPdfPageCount(normalizedFile);

    // Normalize and validate all page ranges
    const normalizedRanges = pageRanges.map((range) => normalizePageParams(range, pageCount));

    // Validate that all page ranges are within bounds
    for (const range of normalizedRanges) {
      if (range.start > range.end) {
        throw new ValidationError(`Page range ${JSON.stringify(range)} is invalid (start > end)`);
      }
    }

    // Create a separate workflow for each page range
    const workflows: Promise<WorkflowResult>[] = [];

    for (const range of normalizedRanges) {
      const builder = this.workflow();
      builder.addFilePart(pdf, { pages: range });
      workflows.push((builder as WorkflowWithPartsStage).outputPdf().execute());
    }

    // Execute all workflows in parallel and process the results
    const results = await Promise.all(workflows);
    return results.map((result) =>
      this.processTypedWorkflowResult(result as TypedWorkflowResult<'pdf'>),
    );
  }

  /**
   * Creates a new PDF containing only the specified pages in the order provided
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to extract pages from
   * @param pageIndices - Array of page indices to include in the new PDF (0-based).
   *                     Negative indices count from the end of the document (e.g., -1 is the last page).
   * @returns Promise resolving to a new document with only the specified pages
   *
   * @example
   * ```typescript
   * // Create a new PDF with only the first and third pages
   * const result = await client.duplicatePages('document.pdf', [0, 2]);
   *
   * // Create a new PDF with pages in a different order
   * const result = await client.duplicatePages('document.pdf', [2, 0, 1]);
   *
   * // Create a new PDF with duplicated pages
   * const result = await client.duplicatePages('document.pdf', [0, 0, 1, 1, 0]);
   *
   * // Create a new PDF with the first and last pages
   * const result = await client.duplicatePages('document.pdf', [0, -1]);
   *
   * // Create a new PDF with the last three pages in reverse order
   * const result = await client.duplicatePages('document.pdf', [-1, -2, -3]);
   * ```
   */
  async duplicatePages(pdf: FileInput, pageIndices: number[]): Promise<OutputTypeMap['pdf']> {
    if (!pageIndices || pageIndices.length === 0) {
      throw new ValidationError('At least one page index is required for duplication');
    }

    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    // Get the actual page count of the PDF
    const pageCount = await getPdfPageCount(normalizedFile);

    // Normalize negative indices
    const normalizedIndices = pageIndices.map((index) => {
      if (index < 0) {
        // Handle negative indices (e.g., -1 is the last page)
        return pageCount + index;
      }
      return index;
    });

    // Validate that all page indices are within range
    if (normalizedIndices.some((index) => index < 0 || index >= pageCount)) {
      throw new ValidationError(
        `Page indices ${pageIndices.toString()} are out of range (document has ${pageCount} pages)`,
      );
    }

    const builder = this.workflow();

    // Add each page in the order specified
    for (const pageIndex of normalizedIndices) {
      // Use normalizePageParams to ensure consistent handling
      const pageRange = normalizePageParams({ start: pageIndex, end: pageIndex });
      builder.addFilePart(pdf, { pages: pageRange });
    }

    const result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Deletes pages from a PDF document
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to modify
   * @param pageIndices - Array of page indices to delete (0-based).
   *                     Negative indices count from the end of the document (e.g., -1 is the last page).
   * @returns Promise resolving to the document with deleted pages
   *
   * @example
   * ```typescript
   * // Delete second and fourth pages
   * const result = await client.deletePages('document.pdf', [1, 3]);
   *
   * // Delete the last page
   * const result = await client.deletePages('document.pdf', [-1]);
   *
   * // Delete the first and last two pages
   * const result = await client.deletePages('document.pdf', [0, -1, -2]);
   *
   * // Access the modified PDF buffer
   * const pdfBuffer = result.buffer;
   *
   * // Get the MIME type of the output
   * console.log(result.mimeType); // 'application/pdf'
   *
   * // Save the buffer to a file (Node.js example)
   * const fs = require('fs');
   * fs.writeFileSync('modified-document.pdf', Buffer.from(result.buffer));
   * ```
   */
  async deletePages(pdf: FileInput, pageIndices: number[]): Promise<OutputTypeMap['pdf']> {
    if (!pageIndices || pageIndices.length === 0) {
      throw new ValidationError('At least one page index is required for deletion');
    }

    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    // Get the actual page count of the PDF
    const pageCount = await getPdfPageCount(normalizedFile);

    // Normalize negative indices
    const normalizedIndices = pageIndices.map((index) => {
      if (index < 0) {
        // Handle negative indices (e.g., -1 is the last page)
        return pageCount + index;
      }
      return index;
    });

    // Remove duplicates and sort the deleteIndices
    const deleteIndices = [...new Set(normalizedIndices)].sort((a, b) => a - b);

    // Validate that all page indices are within range
    if (deleteIndices.some((index) => index < 0 || index >= pageCount)) {
      throw new ValidationError(
        `Page indices ${pageIndices.toString()} are out of range (document has ${pageCount} pages)`,
      );
    }

    const builder = this.workflow();

    // Group consecutive pages that should be kept into ranges
    let currentPage: number = 0;
    const pageRanges: { start: number; end: number }[] = [];

    for (const deleteIndex of deleteIndices) {
      if (currentPage < deleteIndex) {
        pageRanges.push(normalizePageParams({ start: currentPage, end: deleteIndex - 1 }));
      }
      currentPage = deleteIndex + 1;
    }

    if (
      (currentPage > 0 || (currentPage == 0 && deleteIndices.length == 0)) &&
      currentPage < pageCount
    ) {
      pageRanges.push(normalizePageParams({ start: currentPage, end: pageCount - 1 }));
    }

    if (pageRanges.length === 0) {
      throw new ValidationError('You cannot delete all pages from a document');
    }

    pageRanges.forEach((range) => {
      builder.addFilePart(pdf, { pages: range });
    });

    const result = await (builder as WorkflowWithPartsStage).outputPdf().execute();
    return this.processTypedWorkflowResult(result);
  }

  /**
   * Optimizes a PDF document for size reduction
   * This is a convenience method that uses the workflow builder.
   *
   * @param pdf - The PDF file to optimize
   * @param options - Optimization options
   * @returns Promise resolving to the optimized document
   *
   * @example
   * ```typescript
   * const result = await client.optimize('large-document.pdf', {
   *   grayscaleImages: true,
   *   mrcCompression: true,
   *   imageOptimizationQuality: 2
   * });
   * ```
   */
  async optimize(
    pdf: FileInput,
    options: components['schemas']['OptimizePdf'] = { imageOptimizationQuality: 2 },
  ): Promise<OutputTypeMap['pdf']> {
    const normalizedFile = isRemoteFileInput(pdf)
      ? await processRemoteFileInput(pdf)
      : await processFileInput(pdf);

    if (!(await isValidPdf(normalizedFile))) {
      throw new ValidationError('Invalid pdf file', { input: pdf });
    }

    const result = await this.workflow()
      .addFilePart(pdf)
      .outputPdf({ optimize: options })
      .execute();
    return this.processTypedWorkflowResult(result);
  }
}
