import type {
  FileInput,
  OutputTypeMap,
  TypedWorkflowResult,
  UrlInput,
  WorkflowDryRunResult,
  WorkflowExecuteOptions,
  WorkflowOutput,
} from '../types';
import type { ActionWithFileInput } from '../build';
import { BuildOutputs } from '../build';
import { BaseBuilder } from './base';
import { NutrientError, ValidationError } from '../errors';
import type { NormalizedFileData } from '../inputs';
import { isRemoteFileInput, processFileInput, validateFileInput } from '../inputs';
import type { components } from '../generated/api-types';
import type { ResponseType } from 'axios';

/**
 * Actions that can be applied to workflows - either regular actions or actions that need file registration
 */
export type ApplicableAction = components['schemas']['BuildAction'] | ActionWithFileInput;

/**
 * Workflow builder implementation using the composable Build API
 */
export class WorkflowBuilder<
  TOutput extends keyof OutputTypeMap | undefined = undefined,
> extends BaseBuilder<TypedWorkflowResult<TOutput>> {
  private buildInstructions: components['schemas']['BuildInstructions'] = {
    parts: [],
  };

  private assets: Map<string, Exclude<FileInput, UrlInput>> = new Map();
  private assetIndex = 0;
  private currentStep = 0;
  private isExecuted = false;

  /**
   * Registers an asset in the workflow and returns its key for use in actions
   * @param asset - The asset to register
   * @returns The asset key that can be used in BuildActions
   */
  private registerAssets(asset: Exclude<FileInput, UrlInput>): string {
    if (!validateFileInput(asset)) {
      throw new ValidationError('Invalid file input provided to workflow', { asset });
    }

    if (isRemoteFileInput(asset)) {
      throw new ValidationError("Remote file input doesn't need to be registered", { asset });
    }

    const assetKey = `asset_${this.assetIndex++}`;
    this.assets.set(assetKey, asset);

    return assetKey;
  }

  /**
   * Adds a file part to the workflow
   */
  addFilePart(
    file: FileInput,
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: ApplicableAction[],
  ): this {
    this.ensureNotExecuted();

    let fileField: components['schemas']['FileHandle'];
    if (isRemoteFileInput(file)) {
      fileField = { url: typeof file === 'string' ? file : file.url };
    } else {
      fileField = this.registerAssets(file);
    }

    const processedActions = actions
      ? actions.map((action) => this.processAction(action))
      : undefined;

    const filePart: components['schemas']['FilePart'] = {
      file: fileField,
      ...options,
      ...(processedActions && processedActions.length > 0 ? { actions: processedActions } : {}),
    };

    this.buildInstructions.parts.push(filePart);
    return this;
  }

  /**
   * Adds an HTML part to the workflow
   */
  addHtmlPart(
    html: FileInput,
    assets?: Exclude<FileInput, UrlInput>[],
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: ApplicableAction[],
  ): this {
    this.ensureNotExecuted();

    let htmlField: components['schemas']['FileHandle'];
    if (isRemoteFileInput(html)) {
      htmlField = { url: typeof html === 'string' ? html : html.url };
    } else {
      htmlField = this.registerAssets(html);
    }

    let assetsField: string[] | undefined;
    if (assets) {
      assetsField = [];
      for (const asset of assets) {
        if (isRemoteFileInput(asset)) {
          throw new ValidationError('Assets file input cannot be an URL', { input: asset });
        }
        const asset_key = this.registerAssets(asset);
        assetsField.push(asset_key);
      }
    }

    const processedActions = actions
      ? actions.map((action) => this.processAction(action))
      : undefined;

    const htmlPart: components['schemas']['HTMLPart'] = {
      html: htmlField,
      assets: assetsField,
      ...options,
      ...(processedActions && processedActions.length > 0 ? { actions: processedActions } : {}),
    };

    this.buildInstructions.parts.push(htmlPart);
    return this;
  }

  /**
   * Adds a new page part to the workflow
   */
  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: ApplicableAction[],
  ): this {
    this.ensureNotExecuted();

    const processedActions = actions
      ? actions.map((action) => this.processAction(action))
      : undefined;

    const newPagePart: components['schemas']['NewPagePart'] = {
      page: 'new',
      ...options,
      ...(processedActions && processedActions.length > 0 ? { actions: processedActions } : {}),
    };

    this.buildInstructions.parts.push(newPagePart);
    return this;
  }

  /**
   * Adds a document part by document ID
   */
  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: ApplicableAction[],
  ): this {
    this.ensureNotExecuted();

    const { layer, ...documentOptions } = options ?? {};

    const processedActions = actions
      ? actions.map((action) => this.processAction(action))
      : undefined;

    const documentPart: components['schemas']['DocumentPart'] = {
      document: { id: documentId, ...(layer && { layer }) },
      ...documentOptions,
      ...(processedActions && processedActions.length > 0 ? { actions: processedActions } : {}),
    };

    this.buildInstructions.parts.push(documentPart);
    return this;
  }

  /**
   * Processes an action, registering files if needed
   */
  private processAction(action: ApplicableAction): components['schemas']['BuildAction'] {
    if (this.isActionWithFileInput(action)) {
      // Register the file and create the actual action
      let fileHandle: components['schemas']['FileHandle'];
      if (isRemoteFileInput(action.fileInput)) {
        fileHandle = {
          url: typeof action.fileInput === 'string' ? action.fileInput : action.fileInput.url,
        };
      } else {
        fileHandle = this.registerAssets(action.fileInput);
      }
      return action.createAction(fileHandle);
    }
    return action;
  }

  /**
   * Type guard to check if action needs file registration
   */
  private isActionWithFileInput(action: ApplicableAction): action is ActionWithFileInput {
    return typeof action === 'object' && action !== null && '__needsFileRegistration' in action;
  }

  /**
   * Applies actions to the entire document
   */
  applyActions(actions: ApplicableAction[]): this {
    this.ensureNotExecuted();

    this.buildInstructions.actions ??= [];

    const processedActions = actions.map((action) => this.processAction(action));
    this.buildInstructions.actions.push(...processedActions);
    return this;
  }

  /**
   * Applies a single action to the entire document
   */
  applyAction(action: ApplicableAction): this {
    return this.applyActions([action]);
  }

  /**
   * Sets the output configuration
   */
  private output(output: components['schemas']['BuildOutput']): this {
    this.ensureNotExecuted();
    this.buildInstructions.output = output;
    return this;
  }

  /**
   * Sets PDF output
   */
  outputPdf(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): WorkflowBuilder<'pdf'> {
    this.output(BuildOutputs.pdf(options));
    return this as WorkflowBuilder<'pdf'>;
  }

  /**
   * Sets PDF/A output
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
  }): WorkflowBuilder<'pdfa'> {
    this.output(BuildOutputs.pdfa(options));
    return this as WorkflowBuilder<'pdfa'>;
  }

  /**
   * Sets PDF/UA output
   */
  outputPdfUa(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): WorkflowBuilder<'pdfua'> {
    this.output(BuildOutputs.pdfua(options));
    return this as WorkflowBuilder<'pdfua'>;
  }

  /**
   * Sets image output
   */
  outputImage<T extends 'png' | 'jpeg' | 'jpg' | 'webp'>(
    format: T,
    options?: {
      pages?: components['schemas']['PageRange'];
      width?: number;
      height?: number;
      dpi?: number;
    },
  ): WorkflowBuilder<T> {
    if (!options?.dpi && !options?.height && !options?.width) {
      throw new ValidationError(
        'Image output requires at least one of the following options: dpi, height, width',
      );
    }
    this.output(BuildOutputs.image(format, options));
    return this as unknown as WorkflowBuilder<T>;
  }

  /**
   * Sets Office format output
   */
  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowBuilder<T> {
    this.output(BuildOutputs.office(format));
    return this as unknown as WorkflowBuilder<T>;
  }

  /**
   * Sets HTML output
   */
  outputHtml(layout: 'page' | 'reflow'): WorkflowBuilder<'html'> {
    this.output(BuildOutputs.html(layout));
    return this as WorkflowBuilder<'html'>;
  }

  /**
   * Set Markdown output
   */
  outputMarkdown(): WorkflowBuilder<'markdown'> {
    this.output(BuildOutputs.markdown());
    return this as WorkflowBuilder<'markdown'>;
  }

  /**
   * Sets JSON content extraction output
   */
  outputJson(options?: {
    plainText?: boolean;
    structuredText?: boolean;
    keyValuePairs?: boolean;
    tables?: boolean;
    language?: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][];
  }): WorkflowBuilder<'json-content'> {
    this.output(BuildOutputs.jsonContent(options));
    return this as WorkflowBuilder<'json-content'>;
  }

  /**
   * Validates the workflow before execution
   */
  private validate(): void {
    if (this.buildInstructions.parts.length === 0) {
      throw new ValidationError('Workflow has no parts to execute');
    }

    this.buildInstructions.output ??= { type: 'pdf' };
  }

  /**
   * Ensures the workflow hasn't been executed
   */
  private ensureNotExecuted(): void {
    if (this.isExecuted) {
      throw new ValidationError(
        'This workflow has already been executed. Create a new workflow builder for additional operations.',
      );
    }
  }

  /**
   * Prepares files for the request
   */
  private async prepareFiles(): Promise<Map<string, NormalizedFileData>> {
    const requestFiles = new Map<string, NormalizedFileData>();

    const processedEntries: [string, NormalizedFileData][] = await Promise.all(
      Array.from(this.assets.entries()).map(async ([key, value]) => {
        const normalizedFileData = await processFileInput(value);
        return [key, normalizedFileData];
      }),
    );

    for (const [key, data] of processedEntries) {
      requestFiles.set(key, data);
    }

    return requestFiles;
  }

  /**
   * Cleans up resources after execution
   */
  private cleanup(): void {
    this.assets.clear();
    this.assetIndex = 0;
    this.currentStep = 0;
    this.isExecuted = true;
  }

  /**
   * Executes the workflow
   */
  async execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>> {
    this.ensureNotExecuted();
    this.currentStep = 0;

    const result: TypedWorkflowResult<TOutput> = {
      success: false,
      errors: [],
    };

    try {
      this.currentStep = 1;
      options?.onProgress?.(this.currentStep, 3);
      this.validate();

      this.currentStep = 2;
      options?.onProgress?.(this.currentStep, 3);

      const outputConfig = this.buildInstructions.output;
      if (!outputConfig || !outputConfig.type) {
        throw new Error('Output configuration is required');
      }

      const files = await this.prepareFiles();

      let responseType: ResponseType = 'arraybuffer';
      if (outputConfig.type === 'json-content') {
        responseType = 'json';
      } else if (['html', 'markdown'].includes(outputConfig.type as string)) {
        responseType = 'text';
      }

      const response = await this.sendRequest(
        '/build',
        {
          instructions: this.buildInstructions,
          files: files,
        },
        responseType,
      );

      this.currentStep = 3;
      options?.onProgress?.(this.currentStep, 3);

      if (outputConfig.type === 'json-content') {
        result.success = true;
        result.output = {
          data: response,
        } as unknown as TOutput extends keyof OutputTypeMap
          ? OutputTypeMap[TOutput]
          : WorkflowOutput;
      } else if (['html', 'markdown'].includes(outputConfig.type as string)) {
        const { mimeType, filename } = BuildOutputs.getMimeTypeForOutput(outputConfig);

        result.success = true;
        result.output = {
          content: response as string,
          mimeType,
          filename,
        } as TOutput extends keyof OutputTypeMap ? OutputTypeMap[TOutput] : WorkflowOutput;
      } else {
        const { mimeType, filename } = BuildOutputs.getMimeTypeForOutput(outputConfig);
        const buffer = new Uint8Array(response as unknown as ArrayBuffer);

        result.success = true;
        result.output = {
          buffer,
          mimeType,
          filename,
        } as TOutput extends keyof OutputTypeMap ? OutputTypeMap[TOutput] : WorkflowOutput;
      }
    } catch (error) {
      result.errors?.push({
        step: this.currentStep,
        error: NutrientError.wrap(error, `Workflow failed at step ${this.currentStep}`),
      });
    } finally {
      this.cleanup();
    }

    return result;
  }

  /**
   * Performs a dry run to analyze the workflow
   */
  async dryRun(): Promise<WorkflowDryRunResult> {
    this.ensureNotExecuted();

    const result: WorkflowDryRunResult = {
      success: false,
      errors: [],
    };

    try {
      this.validate();

      const response = await this.sendRequest(
        '/analyze_build',
        {
          instructions: this.buildInstructions,
        },
        'json',
      );

      result.success = true;
      result.analysis = response;
    } catch (error) {
      result.errors?.push({
        step: 0,
        error: NutrientError.wrap(error, 'Dry run failed'),
      });
    }

    return result;
  }
}
