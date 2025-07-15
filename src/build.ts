import type { components } from './generated/api-types';
import type { FileInput } from './types';

const DEFAULT_DIMENSION = { value: 100, unit: '%' as const };

/**
 * Internal action type that holds FileInput for deferred registration
 */
export interface ActionWithFileInput<
  Action extends components['schemas']['BuildAction'] = components['schemas']['BuildAction'],
> {
  __needsFileRegistration: true;
  fileInput: FileInput;
  createAction: (fileHandle: components['schemas']['FileHandle']) => Action;
}

/**
 * Factory functions for creating common build actions
 */
export const BuildActions = {
  /**
   * Create an OCR action
   * @param language - Language(s) for OCR
   */
  ocr(
    language: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][],
  ): components['schemas']['OcrAction'] {
    return {
      type: 'ocr',
      language,
    };
  },

  /**
   * Create a rotation action
   * @param rotateBy - Rotation angle (90, 180, or 270)
   */
  rotate(rotateBy: 90 | 180 | 270): components['schemas']['RotateAction'] {
    return {
      type: 'rotate',
      rotateBy,
    };
  },

  /**
   * Create a text watermark action
   * @param text - Watermark text
   * @param options - Watermark options
   * @param options.width - Width dimension of the watermark (value and unit, e.g. {value: 100, unit: '%'})
   * @param options.height - Height dimension of the watermark (value and unit, e.g. {value: 100, unit: '%'})
   * @param options.top - Top position of the watermark (value and unit)
   * @param options.right - Right position of the watermark (value and unit)
   * @param options.bottom - Bottom position of the watermark (value and unit)
   * @param options.left - Left position of the watermark (value and unit)
   * @param options.rotation - Rotation of the watermark in counterclockwise degrees (default: 0)
   * @param options.opacity - Watermark opacity (0 is fully transparent, 1 is fully opaque)
   * @param options.fontFamily - Font family for the text (e.g. 'Helvetica')
   * @param options.fontSize - Size of the text in points
   * @param options.fontColor - Foreground color of the text (e.g. '#ffffff')
   * @param options.fontStyle - Text style array ('bold', 'italic', or both)
   */
  watermarkText(
    text: string,
    options: Partial<Omit<components['schemas']['TextWatermarkAction'], 'type' | 'text'>> = {
      width: DEFAULT_DIMENSION,
      height: DEFAULT_DIMENSION,
      rotation: 0,
    },
  ): components['schemas']['TextWatermarkAction'] {
    return {
      type: 'watermark',
      text,
      ...options,
      rotation: options.rotation ?? 0,
      width: options.width ?? DEFAULT_DIMENSION,
      height: options.height ?? DEFAULT_DIMENSION,
    };
  },

  /**
   * Create an image watermark action
   * @param image - Watermark image
   * @param options - Watermark options
   * @param options.width - Width dimension of the watermark (value and unit, e.g. {value: 100, unit: '%'})
   * @param options.height - Height dimension of the watermark (value and unit, e.g. {value: 100, unit: '%'})
   * @param options.top - Top position of the watermark (value and unit)
   * @param options.right - Right position of the watermark (value and unit)
   * @param options.bottom - Bottom position of the watermark (value and unit)
   * @param options.left - Left position of the watermark (value and unit)
   * @param options.rotation - Rotation of the watermark in counterclockwise degrees (default: 0)
   * @param options.opacity - Watermark opacity (0 is fully transparent, 1 is fully opaque)
   */
  watermarkImage(
    image: FileInput,
    options: Partial<Omit<components['schemas']['ImageWatermarkAction'], 'type' | 'image'>> = {
      width: DEFAULT_DIMENSION,
      height: DEFAULT_DIMENSION,
      rotation: 0,
    },
  ): ActionWithFileInput<components['schemas']['ImageWatermarkAction']> {
    return {
      __needsFileRegistration: true,
      fileInput: image,
      createAction: (
        fileHandle: components['schemas']['FileHandle'],
      ): components['schemas']['ImageWatermarkAction'] => ({
        type: 'watermark',
        image: fileHandle,
        ...options,
        rotation: options.rotation ?? 0,
        width: options.width ?? DEFAULT_DIMENSION,
        height: options.height ?? DEFAULT_DIMENSION,
      }),
    };
  },

  /**
   * Create a flatten action
   * @param annotationIds - Optional annotation IDs to flatten (all if not specified)
   */
  flatten(annotationIds?: (string | number)[]): components['schemas']['FlattenAction'] {
    return {
      type: 'flatten',
      ...(annotationIds && { annotationIds }),
    };
  },

  /**
   * Create an apply Instant JSON action
   * @param file - Instant JSON file input
   */
  applyInstantJson(
    file: FileInput,
  ): ActionWithFileInput<components['schemas']['ApplyInstantJsonAction']> {
    return {
      __needsFileRegistration: true,
      fileInput: file,
      createAction: (
        fileHandle: components['schemas']['FileHandle'],
      ): components['schemas']['ApplyInstantJsonAction'] => ({
        type: 'applyInstantJson',
        file: fileHandle,
      }),
    };
  },

  /**
   * Create an apply XFDF action
   * @param file - XFDF file input
   * @param options - Apply Xfdf options
   * @param options.ignorePageRotation - If true, ignores page rotation when applying XFDF data (default: false)
   * @param options.richTextEnabled - If true, plain text annotations will be converted to rich text annotations. If false, all text annotations will be plain text annotations (default: true)
   */
  applyXfdf(
    file: FileInput,
    options?: Partial<Omit<components['schemas']['ApplyXfdfAction'], 'type' | 'file'>>,
  ): ActionWithFileInput<components['schemas']['ApplyXfdfAction']> {
    return {
      __needsFileRegistration: true,
      fileInput: file,
      createAction: (
        fileHandle: components['schemas']['FileHandle'],
      ): components['schemas']['ApplyXfdfAction'] => ({
        type: 'applyXfdf',
        file: fileHandle,
        ...options,
      }),
    };
  },

  /**
   * Create redactions with text search
   * @param text - Text to search and redact
   * @param options - Redaction options
   * @param options.content - Visual aspects of the redaction annotation (background color, overlay text, etc.)
   * @param strategyOptions - Redaction strategy options
   * @param strategyOptions.includeAnnotations - If true, redaction annotations are created on top of annotations whose content match the provided text (default: true)
   * @param strategyOptions.caseSensitive - If true, the search will be case sensitive (default: false)
   * @param strategyOptions.start - The index of the page from where to start the search (default: 0)
   * @param strategyOptions.limit - Starting from start, the number of pages to search (default: to the end of the document)
   */
  createRedactionsText(
    text: string,
    options?: Omit<
      components['schemas']['CreateRedactionsAction'],
      'type' | 'strategyOptions' | 'strategy'
    >,
    strategyOptions?: Omit<components['schemas']['CreateRedactionsStrategyOptionsText'], 'text'>,
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'text',
      strategyOptions: {
        text,
        ...strategyOptions,
      },
      ...options,
    };
  },

  /**
   * Create redactions with regex pattern
   * @param regex - Regex pattern to search and redact
   * @param options - Redaction options
   * @param options.content - Visual aspects of the redaction annotation (background color, overlay text, etc.)
   * @param strategyOptions - Redaction strategy options
   * @param strategyOptions.includeAnnotations - If true, redaction annotations are created on top of annotations whose content match the provided regex (default: true)
   * @param strategyOptions.caseSensitive - If true, the search will be case sensitive (default: true)
   * @param strategyOptions.start - The index of the page from where to start the search (default: 0)
   * @param strategyOptions.limit - Starting from start, the number of pages to search (default: to the end of the document)
   */
  createRedactionsRegex(
    regex: string,
    options?: Omit<
      components['schemas']['CreateRedactionsAction'],
      'type' | 'strategyOptions' | 'strategy'
    >,
    strategyOptions?: Omit<components['schemas']['CreateRedactionsStrategyOptionsRegex'], 'regex'>,
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'regex',
      strategyOptions: {
        regex,
        ...strategyOptions,
      },
      ...options,
    };
  },

  /**
   * Create redactions with preset pattern
   * @param preset - Preset pattern to search and redact (e.g. 'email-address', 'credit-card-number', 'social-security-number', etc.)
   * @param options - Redaction options
   * @param options.content - Visual aspects of the redaction annotation (background color, overlay text, etc.)
   * @param strategyOptions - Redaction strategy options
   * @param strategyOptions.includeAnnotations - If true, redaction annotations are created on top of annotations whose content match the provided preset (default: true)
   * @param strategyOptions.start - The index of the page from where to start the search (default: 0)
   * @param strategyOptions.limit - Starting from start, the number of pages to search (default: to the end of the document)
   */
  createRedactionsPreset(
    preset: components['schemas']['SearchPreset'],
    options?: Omit<
      components['schemas']['CreateRedactionsAction'],
      'type' | 'strategyOptions' | 'strategy'
    >,
    strategyOptions?: Omit<
      components['schemas']['CreateRedactionsStrategyOptionsPreset'],
      'preset'
    >,
  ): components['schemas']['CreateRedactionsAction'] {
    return {
      type: 'createRedactions',
      strategy: 'preset',
      strategyOptions: {
        preset,
        ...strategyOptions,
      },
      ...options,
    };
  },

  /**
   * Apply previously created redactions
   */
  applyRedactions(): components['schemas']['ApplyRedactionsAction'] {
    return {
      type: 'applyRedactions',
    };
  },
};

/**
 * Factory functions for creating output configurations
 */
export const BuildOutputs = {
  /**
   * PDF output configuration
   * @param options - PDF output options
   */
  pdf(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): components['schemas']['PDFOutput'] {
    return {
      type: 'pdf',
      ...(options?.metadata && { metadata: options.metadata }),
      ...(options?.labels && { labels: options.labels }),
      ...(options?.userPassword && { user_password: options.userPassword }),
      ...(options?.ownerPassword && { owner_password: options.ownerPassword }),
      ...(options?.userPermissions && { user_permissions: options.userPermissions }),
      ...(options?.optimize && { optimize: options.optimize }),
    };
  },

  /**
   * PDF/A output configuration
   * @param options - PDF/A output options
   */
  pdfa(options?: {
    conformance?: components['schemas']['PDFAOutput']['conformance'];
    vectorization?: boolean;
    rasterization?: boolean;
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): components['schemas']['PDFAOutput'] {
    return {
      type: 'pdfa',
      ...(options?.conformance && { conformance: options.conformance }),
      ...(options?.vectorization !== undefined && { vectorization: options.vectorization }),
      ...(options?.rasterization !== undefined && { rasterization: options.rasterization }),
      ...(options?.metadata && { metadata: options.metadata }),
      ...(options?.labels && { labels: options.labels }),
      ...(options?.userPassword && { user_password: options.userPassword }),
      ...(options?.ownerPassword && { owner_password: options.ownerPassword }),
      ...(options?.userPermissions && { user_permissions: options.userPermissions }),
      ...(options?.optimize && { optimize: options.optimize }),
    };
  },

  /**
   * PDF/UA output configuration
   * @param options - PDF/UA output options
   */
  pdfua(options?: {
    metadata?: components['schemas']['Metadata'];
    labels?: components['schemas']['Label'][];
    userPassword?: string;
    ownerPassword?: string;
    userPermissions?: components['schemas']['PDFUserPermission'][];
    optimize?: components['schemas']['OptimizePdf'];
  }): components['schemas']['PDFUAOutput'] {
    return {
      type: 'pdfua',
      ...(options?.metadata && { metadata: options.metadata }),
      ...(options?.labels && { labels: options.labels }),
      ...(options?.userPassword && { user_password: options.userPassword }),
      ...(options?.ownerPassword && { owner_password: options.ownerPassword }),
      ...(options?.userPermissions && { user_permissions: options.userPermissions }),
      ...(options?.optimize && { optimize: options.optimize }),
    };
  },

  /**
   * Image output configuration
   * @param format - Image format type
   * @param options - Image output options
   */
  image(
    format: 'png' | 'jpeg' | 'jpg' | 'webp',
    options?: {
      pages?: components['schemas']['PageRange'];
      width?: number;
      height?: number;
      dpi?: number;
    },
  ): components['schemas']['ImageOutput'] {
    return {
      type: 'image',
      format,
      ...(options?.pages && { pages: options.pages }),
      ...(options?.width && { width: options.width }),
      ...(options?.height && { height: options.height }),
      ...(options?.dpi && { dpi: options.dpi }),
    };
  },

  /**
   * JSON content output configuration
   * @param options - JSON content extraction options
   */
  jsonContent(options?: {
    plainText?: boolean;
    structuredText?: boolean;
    keyValuePairs?: boolean;
    tables?: boolean;
    language?: components['schemas']['OcrLanguage'] | components['schemas']['OcrLanguage'][];
  }): components['schemas']['JSONContentOutput'] {
    return {
      type: 'json-content',
      ...(options?.plainText !== undefined && { plainText: options.plainText }),
      ...(options?.structuredText !== undefined && { structuredText: options.structuredText }),
      ...(options?.keyValuePairs !== undefined && { keyValuePairs: options.keyValuePairs }),
      ...(options?.tables !== undefined && { tables: options.tables }),
      ...(options?.language && { language: options.language }),
    };
  },

  /**
   * Office document output configuration
   * @param type - Office document type
   */
  office(type: 'docx' | 'xlsx' | 'pptx'): components['schemas']['OfficeOutput'] {
    return {
      type,
    };
  },

  /**
   * HTML output configuration
   * @param layout - The layout type to use for conversion to HTML
   */
  html(layout: 'page' | 'reflow'): components['schemas']['HTMLOutput'] {
    return {
      type: 'html',
      layout,
    };
  },

  /**
   * Markdown output configuration
   */
  markdown(): components['schemas']['MarkdownOutput'] {
    return {
      type: 'markdown',
    };
  },

  /**
   * Get MIME type and filename for a given output configuration
   * @param output - The output configuration
   * @returns MIME type and optional filename
   */
  getMimeTypeForOutput(
    output: Exclude<
      components['schemas']['BuildOutput'],
      components['schemas']['JSONContentOutput']
    >,
  ): { mimeType: string; filename?: string } {
    switch (output.type) {
      case 'pdf':
      case 'pdfa':
      case 'pdfua':
        return { mimeType: 'application/pdf', filename: 'output.pdf' };
      case 'image': {
        const imageOutput = output as components['schemas']['BuildOutput'] & { format?: string };
        const format = imageOutput.format ?? 'png';
        return {
          mimeType: format === 'jpg' ? 'image/jpeg' : `image/${format}`,
          filename: `output.${format}`,
        };
      }
      case 'docx':
        return {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          filename: 'output.docx',
        };
      case 'xlsx':
        return {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: 'output.xlsx',
        };
      case 'pptx':
        return {
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          filename: 'output.pptx',
        };
      case 'html':
        return {
          mimeType: 'text/html',
          filename: 'output.html',
        };
      case 'markdown':
        return {
          mimeType: 'text/markdown',
          filename: 'output.md',
        };
      default:
        return { mimeType: 'application/octet-stream', filename: 'output' };
    }
  },
};
