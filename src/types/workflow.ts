import type { FileInput, UrlInput } from './inputs';
import type { components } from '../generated/api-types';
import type { ApplicableAction } from '../builders/workflow';

/**
 * Maps output types to their specific output structures
 */
export type OutputTypeMap = {
  pdf: { buffer: Uint8Array; mimeType: 'application/pdf'; filename?: string };
  pdfa: { buffer: Uint8Array; mimeType: 'application/pdf'; filename?: string };
  pdfua: { buffer: Uint8Array; mimeType: 'application/pdf'; filename?: string };
  png: { buffer: Uint8Array; mimeType: 'image/png'; filename?: string };
  jpeg: { buffer: Uint8Array; mimeType: 'image/jpeg'; filename?: string };
  jpg: { buffer: Uint8Array; mimeType: 'image/jpeg'; filename?: string };
  webp: { buffer: Uint8Array; mimeType: 'image/webp'; filename?: string };
  docx: {
    buffer: Uint8Array;
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    filename?: string;
  };
  xlsx: {
    buffer: Uint8Array;
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    filename?: string;
  };
  pptx: {
    buffer: Uint8Array;
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    filename?: string;
  };
  html: { content: string; mimeType: `text/html`; filename?: string };
  markdown: { content: string; mimeType: `text/markdown`; filename?: string };
  'json-content': { data: components['schemas']['BuildResponseJsonContents'] };
};

/**
 * Builder pattern interfaces for workflow stages
 */

// Stage 1: Initial workflow - only part methods available
export interface WorkflowInitialStage {
  addFilePart(
    file: FileInput,
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: ApplicableAction[],
  ): WorkflowWithPartsStage;
  addHtmlPart(
    html: FileInput,
    assets?: Exclude<FileInput, UrlInput>[],
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: ApplicableAction[],
  ): WorkflowWithPartsStage;
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: ApplicableAction[],
  ): WorkflowWithPartsStage;
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: ApplicableAction[],
  ): WorkflowWithPartsStage;
}

// Stage 2: After parts added - parts, actions, and output methods available
// Extends initial stage since we can add more parts
export interface WorkflowWithPartsStage extends WorkflowInitialStage {
  // Action methods
  applyActions(actions: ApplicableAction[]): WorkflowWithActionsStage;
  applyAction(action: ApplicableAction): WorkflowWithActionsStage;

  // Output methods
  outputPdf(
    options?: Omit<components['schemas']['PDFOutput'], 'type'>,
  ): WorkflowWithOutputStage<'pdf'>;
  outputPdfA(
    options?: Omit<components['schemas']['PDFAOutput'], 'type'>,
  ): WorkflowWithOutputStage<'pdfa'>;
  outputPdfUA(
    options?: Omit<components['schemas']['PDFAOutput'], 'type'>,
  ): WorkflowWithOutputStage<'pdfua'>;
  outputImage<T extends 'png' | 'jpeg' | 'jpg' | 'webp'>(
    format: T,
    options?: Omit<components['schemas']['ImageOutput'], 'type' | 'format'>,
  ): WorkflowWithOutputStage<T>;
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowWithOutputStage<T>;
  outputHtml(
    layout: components['schemas']['HTMLOutput']['layout'],
  ): WorkflowWithOutputStage<'html'>;
  outputMarkdown(
    options?: Omit<components['schemas']['MarkdownOutput'], 'type'>,
  ): WorkflowWithOutputStage<'markdown'>;
  outputJson(
    options?: Omit<components['schemas']['JSONContentOutput'], 'type'>,
  ): WorkflowWithOutputStage<'json-content'>;
}

// Stage 3: After actions added - more actions and output methods available
// Type alias for previous stage since nothing changed and we can add more actions
export type WorkflowWithActionsStage = WorkflowWithPartsStage;

// Stage 4: After output set - only execute and dryRun available
export interface WorkflowWithOutputStage<
  TOutput extends keyof OutputTypeMap | undefined = undefined,
> {
  execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>>;
  dryRun(): Promise<WorkflowDryRunResult>;
}

/**
 * Represents an output file with its content and metadata
 */
export interface WorkflowOutput {
  /** The file content as a Uint8Array buffer */
  buffer: Uint8Array;
  /** The MIME type of the output file */
  mimeType: string;
  /** Optional filename if available */
  filename?: string;
}

/**
 * Result of a workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  output?: WorkflowOutput;
  errors?: Array<{
    step: number;
    error: Error;
  }>;
}

/**
 * Typed result of a workflow execution based on output configuration
 */
export type TypedWorkflowResult<T extends keyof OutputTypeMap | undefined> = {
  success: boolean;
  output?: T extends keyof OutputTypeMap ? OutputTypeMap[T] : WorkflowOutput;
  errors?: Array<{ step: number; error: Error }>;
};

/**
 * Result of a workflow dry run
 */
export interface WorkflowDryRunResult {
  success: boolean;
  analysis?: components['schemas']['AnalyzeBuildResponse'];
  errors?: Array<{
    step: number;
    error: Error;
  }>;
}

/**
 * Options for workflow execution
 */
export interface WorkflowExecuteOptions {
  /**
   * Progress callback
   */
  onProgress?: (step: number, total: number) => void;
}
