/**
 * Type definitions for the Nutrient Data Extraction API (`POST /extraction/parse`).
 *
 * These types mirror the public OpenAPI 3.1 contract published at
 * https://www.nutrient.io/api/reference/data-extraction/public/ (version `2026-05-25`).
 *
 * Note on billing: `/extraction/parse` is billed against **extraction credits**, a
 * bucket separate from the **processor API credits** consumed by `/build`, `/sign`,
 * OCR, conversion, and the other endpoints on the rest of `NutrientClient`. The
 * response surfaces this explicitly in `usage.data_extraction_credits`.
 *
 * @see ParseResponse for the full response shape
 * @see ParseMode for the four processing pipelines
 */

/**
 * Processing pipeline for `/extraction/parse`.
 *
 * Each mode bills a different amount of **extraction credits** per page, drawn from
 * the account's extraction-credits bucket (separate from processor API credits).
 *
 * - `text` — Plain text extraction. Markdown output only. 1 extraction credit/page.
 * - `structure` — OCR-backed structured extraction with spatial element output. 1.5 extraction credits/page.
 * - `understand` — Deeper document analysis with semantic enrichment. 9 extraction credits/page. (Default)
 * - `agentic` — VLM-augmented extraction for complex documents needing visual reasoning. 18 extraction credits/page.
 *
 * The `agentic` mode may not yet be activated on every account; if it isn't, the
 * server returns a `400` with an `errorDetails.code` you can branch on.
 */
export type ParseMode = 'text' | 'structure' | 'understand' | 'agentic';

/**
 * Output format for `/extraction/parse`.
 *
 * - `spatial` — Flat list of typed elements (paragraph, table, formula, picture,
 *   keyValueRegion, handwriting) with bounding boxes, confidence, reading order,
 *   and page references. Not available with `mode: 'text'`.
 * - `markdown` — Whole-document Markdown representation, suited for RAG, search
 *   indexing, and content pipelines.
 */
export type ParseOutputFormat = 'spatial' | 'markdown';

/**
 * Output configuration for `/extraction/parse`.
 *
 * Defaults: `text` mode emits `markdown`; `structure`, `understand`, and `agentic`
 * emit `spatial`.
 */
export interface ParseOutputOptions {
  /** Output format. Required when `output` is provided. */
  format: ParseOutputFormat;
  /**
   * Include word-level OCR data nested inside paragraph and table cell elements.
   * Only applicable when `format` is `'spatial'`. Defaults to `false`.
   */
  includeWords?: boolean;
}

/**
 * Additional processing options for `/extraction/parse`.
 */
export interface ParseProcessingOptions {
  /**
   * OCR language hint. Only honoured for `structure`, `understand`, and `agentic` modes.
   *
   * Accepts:
   * - A lowercase language name (`'english'`, `'german'`).
   * - An ISO 639-2 code (`'eng'`, `'deu'`).
   * - A `+`-joined string for multilingual OCR (`'eng+spa'`).
   * - An array of codes (`['eng', 'spa']`).
   *
   * Defaults to `'eng'` server-side.
   */
  language?: string | string[];
}

/**
 * Instruction payload sent to `/extraction/parse`. All fields are optional; an empty
 * object resolves to `mode: 'understand'` with spatial output server-side.
 */
export interface ParseInstructions {
  /**
   * URL of a remote document to parse. Used by the JSON request shape; when
   * passing a local file or buffer, omit this field.
   */
  url?: string;
  mode?: ParseMode;
  output?: ParseOutputOptions;
  options?: ParseProcessingOptions;
}

/**
 * Bounding box of an element on the page.
 *
 * `(x, y)` is the top-left corner. The origin is the top-left of the page, with
 * x increasing right and y increasing down. Coordinates are in render-space pixels;
 * `page.width` and `page.height` describe the same pixel canvas.
 */
export interface ParseBounds {
  /** Distance from the page's left edge to the box's left edge, in pixels. */
  x: number;
  /** Distance from the page's top edge to the box's top edge, in pixels. */
  y: number;
  /** Width of the bounding box in pixels. */
  width: number;
  /** Height of the bounding box in pixels. */
  height: number;
}

/**
 * Source page reference for an extracted element.
 */
export interface ParsePageRef {
  /** 0-based page index. */
  pageIndex: number;
  /** 1-based page number for human-facing labels. */
  pageNumber: number;
  /** Page width in render-space pixels (matches the bounds coordinate space). */
  width: number;
  /** Page height in render-space pixels. */
  height: number;
}

/**
 * Word-level OCR result. Included inside `ParagraphElement.words`,
 * `HandwritingElement.words`, and `ParseTableCell.words` when
 * `output.includeWords === true`.
 */
export interface ParseWord {
  /** The word's text. */
  text: string;
  bounds: ParseBounds;
  /** OCR confidence score in `[0, 1]`. */
  confidence: number;
}

/**
 * Semantic role of a paragraph element. `null` when the role is undetermined.
 */
export type ParagraphRole =
  | 'Text'
  | 'Title'
  | 'SectionHeader'
  | 'Header'
  | 'Footer'
  | 'Caption'
  | 'Footnote'
  | 'ListItem'
  | 'PageNumber'
  | 'Code'
  | 'CheckboxSelected'
  | 'CheckboxUnselected';

/** Fields shared by every spatial element. */
export interface ParseElementBase {
  /** Unique element identifier (UUID). */
  id: string;
  bounds: ParseBounds;
  /** Detection confidence score in `[0, 1]`. */
  confidence: number;
  /** Reading order index within the page. */
  readingOrder: number;
  page: ParsePageRef;
}

export interface ParagraphElement extends ParseElementBase {
  type: 'paragraph';
  role?: ParagraphRole | null;
  text: string;
  /** Word-level OCR data. Present only when `includeWords` is `true`. */
  words?: ParseWord[] | null;
}

export interface FormulaElement extends ParseElementBase {
  type: 'formula';
  /** LaTeX representation of the formula. */
  latex: string;
}

export interface PictureElement extends ParseElementBase {
  type: 'picture';
  /** Image classification category (e.g. `chart`, `photo`, `diagram`). */
  classification: string;
  /** Confidence score for the classification in `[0, 1]`. */
  classificationConfidence: number;
  /** AI-generated alternative text. */
  altDescription: string;
  /** IDs of associated caption paragraph elements. */
  captionIds?: string[] | null;
  /** IDs of associated footnote paragraph elements. */
  footnoteIds?: string[] | null;
}

/** A single cell inside a `TableElement`. */
export interface ParseTableCell {
  id: string;
  bounds: ParseBounds;
  /** Detection confidence score in `[0, 1]`. */
  confidence: number;
  /** 0-indexed row. */
  row: number;
  /** 0-indexed column. */
  column: number;
  /** Number of rows this cell spans. */
  rowSpan: number;
  /** Number of columns this cell spans. */
  colSpan: number;
  text: string;
  /** Word-level OCR data. Present only when `includeWords` is `true`. */
  words?: ParseWord[] | null;
}

export interface TableElement extends ParseElementBase {
  type: 'table';
  rowCount: number;
  columnCount: number;
  cells: ParseTableCell[];
  captionIds?: string[] | null;
  footnoteIds?: string[] | null;
}

/** Question or answer entity within a `KeyValuePair`. */
export interface KeyValueEntity {
  id: string;
  bounds: ParseBounds;
  /** Detection confidence score in `[0, 1]`. */
  confidence: number;
  /** Entity type. The empty string is returned when the role is unclassified. */
  entityType: 'QUESTION' | 'ANSWER' | '';
  /** Extracted value (text or other primitive). */
  value: unknown;
}

export interface KeyValuePair {
  id: string;
  /** The key/question entity. `null` when only a value was detected. */
  key?: KeyValueEntity | null;
  /** The value/answer entity. `null` when only a key was detected. */
  value?: KeyValueEntity | null;
  /** Confidence for the key-value relationship in `[0, 1]`. */
  relationshipConfidence?: number | null;
}

export interface KeyValueRegionElement extends ParseElementBase {
  type: 'keyValueRegion';
  pairs: KeyValuePair[];
}

export interface HandwritingElement extends ParseElementBase {
  type: 'handwriting';
  text: string;
  /** Word-level OCR data. Present only when `includeWords` is `true`. */
  words?: ParseWord[] | null;
}

/**
 * Discriminated union of every spatial element type. Use the `type` field for
 * narrowing.
 */
export type ParseElement =
  | ParagraphElement
  | FormulaElement
  | PictureElement
  | TableElement
  | KeyValueRegionElement
  | HandwritingElement;

/**
 * Processing metrics for a `/extraction/parse` call.
 */
export interface ParseMetrics {
  processingTimeMs: number;
  pagesProcessed: number;
}

/**
 * Extraction-credit usage for a `/extraction/parse` call.
 *
 * **Extraction credits** are a separate billing bucket from processor API credits;
 * an extraction call never debits processor credits and vice-versa.
 */
export interface ParseUsage {
  data_extraction_credits?: {
    /** Extraction credits consumed by this request. */
    cost: number;
    /** Remaining extraction credits in the account. */
    remainingCredits: number;
  };
}

/**
 * Echoes the resolved configuration the server used for this request.
 */
export interface ParseConfiguration {
  mode: ParseMode;
  outputFormat: ParseOutputFormat;
}

/**
 * Successful `/extraction/parse` response with spatial element output.
 *
 * Narrow on `configuration.outputFormat === 'spatial'` (or `'markdown'` for the
 * other variant) to access `output.elements` vs `output.markdown` with type safety.
 */
export interface ParseResponseSpatial {
  status: 200;
  /** Unique request identifier for debugging and support. */
  requestId: string;
  output: {
    elements: ParseElement[];
    /** Always absent on spatial responses. Kept on the shape so consumers can use
     * a single `output` property without conditional access. */
    markdown?: undefined;
  };
  metrics: ParseMetrics;
  usage?: ParseUsage;
  configuration: ParseConfiguration & { outputFormat: 'spatial' };
}

/**
 * Successful `/extraction/parse` response with whole-document Markdown output.
 */
export interface ParseResponseMarkdown {
  status: 200;
  /** Unique request identifier for debugging and support. */
  requestId: string;
  output: {
    markdown: string;
    /** Always absent on markdown responses. */
    elements?: undefined;
  };
  metrics: ParseMetrics;
  usage?: ParseUsage;
  configuration: ParseConfiguration & { outputFormat: 'markdown' };
}

/**
 * Discriminated union of every successful `/extraction/parse` response. Narrow on
 * `configuration.outputFormat` (or simply branch on `output.markdown` /
 * `output.elements`) to pick between the two output shapes.
 */
export type ParseResponse = ParseResponseSpatial | ParseResponseMarkdown;

/**
 * Path-level error detail returned inside `ParseErrorDetails.failingPaths`.
 */
export interface ParseErrorFailingPath {
  /** JSON path to the invalid field (e.g. `$.mode`). */
  path: string;
  /** Human-readable validation message. */
  details: string;
}

/**
 * Structured error details returned by the server on validation/processing errors.
 */
export interface ParseErrorDetails {
  /**
   * Error origin:
   * - `request` — validation errors (invalid parameters, unsupported format).
   * - `processing` — backend processing failures.
   * - `maestro` — Maestro engine failures.
   */
  source?: string;
  /** Machine-readable error code stable enough for client branching. */
  code?: string;
  /** Per-field validation errors. Present on validation responses. */
  failingPaths?: ParseErrorFailingPath[];
}

/**
 * Error response envelope returned on 4xx/5xx responses from `/extraction/parse`.
 *
 * The TypeScript client surfaces this body as the `details` of the thrown
 * `APIError` / `ValidationError` / `AuthenticationError`.
 */
export interface ParseErrorResponse {
  status: number;
  requestId: string;
  errorMessage: string;
  errorDetails?: ParseErrorDetails;
}

/**
 * Options accepted by {@link import('../client').NutrientClient.parse | NutrientClient.parse}.
 *
 * All fields are optional; the server falls back to `mode: 'understand'` with
 * spatial output when nothing is provided.
 */
export interface ParseOptions {
  mode?: ParseMode;
  output?: ParseOutputOptions;
  /** OCR language hint. See {@link ParseProcessingOptions.language}. */
  language?: string | string[];
  /**
   * Optional API-version override sent as the `x-nutrient-api-version` header.
   * Defaults to the version pinned at API-key creation time.
   */
  apiVersion?: string;
}
