import type {
  FileInput,
  NutrientClientOptions,
  WorkflowInitialStage,
  WorkflowWithPartsStage,
  WorkflowWithActionsStage,
  WorkflowWithOutputStage,
  OutputTypeMap,
  TypedWorkflowResult,
  WorkflowDryRunResult,
  WorkflowExecuteOptions,
  UrlInput,
} from '../types';
import { WorkflowBuilder } from './workflow';
import type { components } from '../generated/api-types';

/**
 * Staged workflow builder that provides compile-time safety through TypeScript interfaces.
 * This wrapper ensures methods are only available at appropriate stages of the workflow.
 */
export class StagedWorkflowBuilder<TOutput extends keyof OutputTypeMap | undefined = undefined>
  implements
    WorkflowInitialStage,
    WorkflowWithPartsStage,
    WorkflowWithActionsStage,
    WorkflowWithOutputStage<TOutput>
{
  private builder: WorkflowBuilder<TOutput>;

  constructor(clientOptions: NutrientClientOptions) {
    this.builder = new WorkflowBuilder<TOutput>(clientOptions);
  }

  /**
   * Adds a file part to the workflow.
   *
   * @param file - The file to add to the workflow. Can be a local file path, Buffer, or URL.
   * @param options - Additional options for the file part.
   * @param actions - Actions to apply to the file part.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Add a PDF file from a local path
   * workflow.addFilePart('/path/to/document.pdf');
   *
   * @example
   * // Add a file with options and actions
   * workflow.addFilePart(
   *   '/path/to/document.pdf',
   *   { pages: { start: 1, end: 3 } },
   *   [BuildActions.watermarkText('CONFIDENTIAL')]
   * );
   */
  addFilePart(
    file: FileInput,
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addFilePart(file, options, actions);
    return this;
  }

  /**
   * Adds an HTML part to the workflow.
   *
   * @param html - The HTML content to add. Can be a file path, Buffer, or URL.
   * @param assets - Optional array of assets (CSS, images, etc.) to include with the HTML. Only local files or Buffers are supported (not URLs).
   * @param options - Additional options for the HTML part.
   * @param actions - Actions to apply to the HTML part.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Add HTML content from a file
   * workflow.addHtmlPart('/path/to/content.html');
   *
   * @example
   * // Add HTML with assets and options
   * workflow.addHtmlPart(
   *   '/path/to/content.html',
   *   ['/path/to/style.css', '/path/to/image.png'],
   *   { layout: { size: 'A4' } }
   * );
   */
  addHtmlPart(
    html: FileInput,
    assets?: Exclude<FileInput, UrlInput>[],
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'assets' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addHtmlPart(html, assets, options, actions);
    return this;
  }

  /**
   * Adds a new blank page to the workflow.
   *
   * @param options - Additional options for the new page, such as page size, orientation, etc.
   * @param actions - Actions to apply to the new page.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Add a simple blank page
   * workflow.addNewPage();
   *
   * @example
   * // Add a new page with specific options
   * workflow.addNewPage(
   *   { layout: { size: 'A4', orientation: 'portrait' } }
   * );
   */
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addNewPage(options, actions);
    return this;
  }

  /**
   * Adds a document part to the workflow by referencing an existing document by ID.
   *
   * @param documentId - The ID of the document to add to the workflow.
   * @param options - Additional options for the document part.
   * @param options.layer - Optional layer name to select a specific layer from the document.
   * @param actions - Actions to apply to the document part.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Add a document by ID
   * workflow.addDocumentPart('doc_12345abcde');
   *
   * @example
   * // Add a document with a specific layer and options
   * workflow.addDocumentPart(
   *   'doc_12345abcde',
   *   {
   *     layer: 'content',
   *     pages: { start: 0, end: 3 }
   *   }
   * );
   */
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addDocumentPart(documentId, options, actions);
    return this;
  }

  // Action methods
  /**
   * Applies multiple actions to the workflow.
   *
   * @param actions - An array of actions to apply to the workflow.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Apply multiple actions to the workflow
   * workflow.applyActions([
   *   BuildActions.watermarkText('DRAFT', { opacity: 0.5 }),
   *   BuildActions.ocr('eng'),
   *   BuildActions.flatten()
   * ]);
   */
  applyActions(actions: components['schemas']['BuildAction'][]): WorkflowWithActionsStage {
    this.builder.applyActions(actions);
    return this;
  }

  /**
   * Applies a single action to the workflow.
   *
   * @param action - The action to apply to the workflow.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Apply a watermark action
   * workflow.applyAction(
   *   BuildActions.watermarkText('CONFIDENTIAL', {
   *     opacity: 0.3,
   *     rotation: 45
   *   })
   * );
   *
   * @example
   * // Apply an OCR action
   * workflow.applyAction(BuildActions.ocr('eng'));
   */
  applyAction(action: components['schemas']['BuildAction']): WorkflowWithActionsStage {
    this.builder.applyAction(action);
    return this;
  }

  // Output methods
  /**
   * Sets the output format to PDF.
   *
   * @param options - Additional options for PDF output, such as compression, encryption, etc.
   * @param options.metadata - Document metadata properties like title and author.
   * @param options.labels - Custom labels to add to the document for organization and categorization.
   * @param options.userPassword - Password required to open the document. When set, the PDF will be encrypted.
   * @param options.ownerPassword - Password required to modify the document. Provides additional security beyond the user password.
   * @param options.userPermissions - Array of permissions granted to users who open the document with the user password.
   *                                 Options include: "printing", "modification", "content-copying", "annotation", "form-filling", etc.
   * @param options.optimize - PDF optimization settings to reduce file size and improve performance.
   * @param options.optimize.mrcCompression - When true, applies Mixed Raster Content compression to reduce file size.
   * @param options.optimize.imageOptimizationQuality - Controls the quality of image optimization (1-5, where 1 is highest quality).
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to PDF with default options
   * workflow.outputPdf();
   *
   * @example
   * // Set output format to PDF with specific options
   * workflow.outputPdf({
   *   userPassword: 'secret',
   *   userPermissions: ["printing"],
   *   metadata: {
   *     title: 'Important Document',
   *     author: 'Document System'
   *   },
   *   optimize: {
   *     mrcCompression: true,
   *     imageOptimizationQuality: 3
   *   }
   * });
   */
  outputPdf(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): WorkflowWithOutputStage<'pdf'> {
    this.builder.outputPdf(options);
    return this as WorkflowWithOutputStage<'pdf'>;
  }

  /**
   * Sets the output format to PDF/A (archival PDF).
   *
   * @param options - Additional options for PDF/A output.
   * @param options.conformance - The PDF/A conformance level to target. Options include 'pdfa-1b', 'pdfa-1a', 'pdfa-2b', 'pdfa-2a', 'pdfa-3b', 'pdfa-3a'.
   *                             Different levels have different requirements for long-term archiving.
   * @param options.vectorization - When true, attempts to convert raster content to vector graphics where possible, improving quality and reducing file size.
   * @param options.rasterization - When true, converts vector graphics to raster images, which can help with compatibility in some cases.
   * @param options.metadata - Document metadata properties like title and author. Metadata is important for archival documents.
   * @param options.labels - Custom labels to add to the document for organization and categorization.
   * @param options.userPassword - Password required to open the document. When set, the PDF will be encrypted.
   * @param options.ownerPassword - Password required to modify the document. Provides additional security beyond the user password.
   * @param options.userPermissions - Array of permissions granted to users who open the document with the user password.
   *                                 Options include: "printing", "modification", "content-copying", "annotation", "form-filling", etc.
   * @param options.optimize - PDF optimization settings to reduce file size and improve performance.
   * @param options.optimize.mrcCompression - When true, applies Mixed Raster Content compression to reduce file size.
   * @param options.optimize.imageOptimizationQuality - Controls the quality of image optimization (1-5, where 1 is highest quality).
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to PDF/A with default options
   * workflow.outputPdfA();
   *
   * @example
   * // Set output format to PDF/A with specific options
   * workflow.outputPdfA({
   *   conformance: 'pdfa-2b',
   *   vectorization: true,
   *   metadata: {
   *     title: 'Archive Document',
   *     author: 'Document System'
   *   },
   *   optimize: {
   *     mrcCompression: true
   *   }
   * });
   */
  outputPdfA(options?: {
    conformance?: components['schemas']['PDFAOutput']['conformance'];
    vectorization?: boolean;
    rasterization?: boolean;
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): WorkflowWithOutputStage<'pdfa'> {
    this.builder.outputPdfA(options);
    return this as WorkflowWithOutputStage<'pdfa'>;
  }

  /**
   * Sets the output format to PDF/UA (Universal Accessibility).
   *
   * @param options - Additional options for PDF/UA output.
   * @param options.metadata - Document metadata properties like title and author. Proper metadata is essential for accessible documents.
   * @param options.labels - Custom labels to add to the document for organization and categorization.
   * @param options.userPassword - Password required to open the document. When set, the PDF will be encrypted.
   * @param options.ownerPassword - Password required to modify the document. Provides additional security beyond the user password.
   * @param options.userPermissions - Array of permissions granted to users who open the document with the user password.
   *                                 Options include: "printing", "modification", "content-copying", "annotation", "form-filling", etc.
   * @param options.optimize - PDF optimization settings to reduce file size and improve performance.
   * @param options.optimize.mrcCompression - When true, applies Mixed Raster Content compression to reduce file size.
   * @param options.optimize.imageOptimizationQuality - Controls the quality of image optimization (1-5, where 1 is highest quality).
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to PDF/UA with default options
   * workflow.outputPdfUA();
   *
   * @example
   * // Set output format to PDF/UA with specific options
   * workflow.outputPdfUA({
   *   metadata: {
   *     title: 'Accessible Document',
   *     author: 'Document System'
   *   },
   *   optimize: {
   *     mrcCompression: true,
   *     imageOptimizationQuality: 3
   *   }
   * });
   */
  outputPdfUA(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): WorkflowWithOutputStage<'pdfua'> {
    this.builder.outputPdfUa(options);
    return this as WorkflowWithOutputStage<'pdfua'>;
  }

  /**
   * Sets the output format to an image format (PNG, JPEG, WEBP).
   *
   * @param format - The image format to output ('png', 'jpeg', 'jpg', or 'webp').
   *                 Each format has different characteristics:
   *                 - PNG: Lossless compression, supports transparency, best for graphics and screenshots
   *                 - JPEG/JPG: Lossy compression, smaller file size, best for photographs
   *                 - WEBP: Modern format with both lossy and lossless compression, good for web use
   * @param options - Additional options for image output, such as resolution, quality, etc.
   *                 Note: At least one of options.width, options.height, or options.dpi must be specified.
   * @param options.pages - Specifies which pages to convert to images. If omitted, all pages are converted.
   * @param options.pages.start - The first page to convert (0-based index).
   * @param options.pages.end - The last page to convert (0-based index).
   * @param options.width - The width of the output image in pixels. If specified without height, aspect ratio is maintained.
   * @param options.height - The height of the output image in pixels. If specified without width, aspect ratio is maintained.
   * @param options.dpi - The resolution in dots per inch. Higher values create larger, more detailed images.
   *                      Common values: 72 (web), 150 (standard), 300 (print quality), 600 (high quality).
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to PNG with dpi specified
   * workflow.outputImage('png', { dpi: 300 });
   *
   * @example
   * // Set output format to JPEG with specific options
   * workflow.outputImage('jpeg', {
   *   dpi: 300,
   *   pages: { start: 1, end: 3 }
   * });
   *
   * @example
   * // Set output format to WEBP with specific dimensions
   * workflow.outputImage('webp', {
   *   width: 1200,
   *   height: 800,
   *   dpi: 150
   * });
   */
  outputImage<T extends 'png' | 'jpeg' | 'jpg' | 'webp'>(
    format: T,
    options?: {
      pages?: components['schemas']['PageRange'];
      width?: number;
      height?: number;
      dpi?: number;
    },
  ): WorkflowWithOutputStage<T> {
    this.builder.outputImage(format, options);
    return this as unknown as WorkflowWithOutputStage<T>;
  }

  /**
   * Sets the output format to an Office document format (DOCX, XLSX, PPTX).
   *
   * @param format - The Office format to output ('docx' for Word, 'xlsx' for Excel, or 'pptx' for PowerPoint).
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to Word document (DOCX)
   * workflow.outputOffice('docx');
   *
   * @example
   * // Set output format to Excel spreadsheet (XLSX)
   * workflow.outputOffice('xlsx');
   *
   * @example
   * // Set output format to PowerPoint presentation (PPTX)
   * workflow.outputOffice('pptx');
   */
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowWithOutputStage<T> {
    this.builder.outputOffice(format);
    return this as unknown as WorkflowWithOutputStage<T>;
  }

  /**
   * Sets the output format to HTML.
   *
   * @param layout - The layout type to use for conversion to HTML:
   *                    - `page` layout keeps the original structure of the document, segmented by page.
   *                    - `reflow` layout converts the document into a continuous flow of text, without page breaks.
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to HTML with specific options
   * workflow.outputHtml('page');
   */
  outputHtml(layout: 'page' | 'reflow'): WorkflowWithOutputStage<'html'> {
    this.builder.outputHtml(layout);
    return this as WorkflowWithOutputStage<'html'>;
  }

  /**
   * Sets the output format to Markdown.
   *
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to Markdown with default options
   * workflow.outputMarkdown();
   */
  outputMarkdown(): WorkflowWithOutputStage<'markdown'> {
    this.builder.outputMarkdown();
    return this as WorkflowWithOutputStage<'markdown'>;
  }

  /**
   * Sets the output format to JSON content.
   *
   * @param options - Additional options for JSON output.
   * @param options.plainText - When true, extracts plain text content from the document and includes it in the JSON output.
   *                           This provides the raw text without structural information.
   * @param options.structuredText - When true, extracts text with structural information (paragraphs, headings, etc.)
   *                                and includes it in the JSON output.
   * @param options.keyValuePairs - When true, attempts to identify and extract key-value pairs from the document
   *                               (like form fields, labeled data, etc.) and includes them in the JSON output.
   * @param options.tables - When true, attempts to identify and extract tabular data from the document
   *                        and includes it in the JSON output as structured table objects.
   * @param options.language - Specifies the language(s) of the document content for better text extraction.
   *                          Can be a single language code or an array of language codes for multi-language documents.
   *                          Examples: "english", "french", "german", or ["english", "spanish"].
   * @returns The workflow builder instance for method chaining.
   *
   * @example
   * // Set output format to JSON with default options
   * workflow.outputJson();
   *
   * @example
   * // Set output format to JSON with specific options
   * workflow.outputJson({
   *   plainText: true,
   *   structuredText: true,
   *   keyValuePairs: true,
   *   tables: true,
   *   language: "english"
   * });
   *
   * @example
   * // Set output format to JSON with multiple languages
   * workflow.outputJson({
   *   plainText: true,
   *   tables: true,
   *   language: ["english", "french", "german"]
   * });
   */
  outputJson(options?: {
    plainText?: boolean;
    structuredText?: boolean;
    keyValuePairs?: boolean;
    tables?: boolean;
    language?: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][];
  }): WorkflowWithOutputStage<'json-content'> {
    this.builder.outputJson(options);
    return this as WorkflowWithOutputStage<'json-content'>;
  }

  // Execution methods
  execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>> {
    return this.builder.execute(options);
  }

  /**
   * Performs a dry run of the workflow without generating the final output.
   * This is useful for validating the workflow configuration and estimating processing time.
   *
   * @returns A promise that resolves to the dry run result, containing validation information and estimated processing time.
   *
   * @example
   * // Perform a dry run with default options
   * const dryRunResult = await workflow
   *   .addFilePart('/path/to/document.pdf')
   *   .outputPdf()
   *   .dryRun();
   */
  dryRun(): Promise<WorkflowDryRunResult> {
    return this.builder.dryRun();
  }
}
