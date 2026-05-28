import type { components } from '../generated/extract-types';
import type { ExtractionCredits } from './extraction_credits';

export type { ExtractionCredits };

/**
 * Type definitions for the Nutrient Data Extraction API (`POST /extraction/parse`).
 *
 * The primitive schemas (element types, bounds, page references, request options)
 * are derived from `src/generated/extract-types.ts`, which is generated from
 * `dws-data-extraction-spec.yml` by `npm run generate:types:extract`. The
 * narrowed response unions (`ParseResponseSpatial` / `ParseResponseMarkdown`)
 * and the client-facing `ParseOptions` surface are hand-composed on top.
 *
 * Billing note: `/extraction/parse` is billed against **extraction credits**, a
 * bucket separate from the **processor API credits** consumed by `/build`,
 * `/sign`, OCR, conversion, and the other endpoints on `NutrientClient`. The
 * response surfaces this explicitly in `usage.data_extraction_credits`.
 *
 * @see ParseResponse for the full response shape
 * @see ParseMode for the four processing pipelines
 */

type Schemas = components['schemas'];

/**
 * Processing pipeline for `/extraction/parse`.
 *
 * Each mode bills a different amount of **extraction credits** per page, drawn
 * from the account's extraction-credits bucket (separate from processor API
 * credits).
 *
 * - `text` — Plain text extraction. Markdown output only. 1 extraction credit/page.
 * - `structure` — OCR-backed structured extraction with spatial element output. 1.5 extraction credits/page.
 * - `understand` — Deeper document analysis with semantic enrichment. 9 extraction credits/page. (Default)
 * - `agentic` — VLM-augmented extraction for complex documents needing visual reasoning. 18 extraction credits/page.
 */
export type ParseMode = Schemas['Mode'];

/**
 * Output format for `/extraction/parse`.
 *
 * - `spatial` — Flat list of typed elements (paragraph, table, formula, picture,
 *   keyValueRegion, handwriting) with bounding boxes, confidence, reading order,
 *   and page references. Not available with `mode: 'text'`.
 * - `markdown` — Whole-document Markdown representation, suited for RAG, search
 *   indexing, and content pipelines.
 */
export type ParseOutputFormat = Schemas['Configuration']['outputFormat'];

/**
 * Output configuration for `/extraction/parse`.
 *
 * Defaults: `text` mode emits `markdown`; `structure`, `understand`, and `agentic`
 * emit `spatial`. `includeWords` defaults to `false` server-side and is only
 * honoured when `format` is `'spatial'`.
 *
 * Hand-written (not derived from the spec) because the spec marks `includeWords`
 * as required; in practice it has a server-side default and clients omit it.
 */
export interface ParseOutputOptions {
  /** Output format. Required when `output` is provided. */
  format: ParseOutputFormat;
  /**
   * Include word-level OCR data nested inside paragraph and table cell elements.
   * Only applicable when `format` is `'spatial'`. Defaults to `false` server-side.
   */
  includeWords?: boolean;
}

/**
 * Additional processing options for `/extraction/parse`.
 */
export type ParseProcessingOptions = Schemas['ProcessingOptions'];

/**
 * Instruction payload sent to `/extraction/parse`. All fields are optional; an
 * empty object resolves to `mode: 'understand'` with spatial output server-side.
 *
 * Hand-written because the spec's `OutputOptions` makes `includeWords` required;
 * see {@link ParseOutputOptions}.
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
 * x increasing right and y increasing down. Coordinates are in render-space
 * pixels; `page.width` and `page.height` describe the same pixel canvas.
 */
export type ParseBounds = Schemas['Bounds'];

/**
 * Source page reference for an extracted element. Defines the coordinate space
 * that all element bounds on the page are relative to.
 */
export type ParsePageRef = Schemas['PageRef'];

/**
 * Word-level OCR result. Included inside `ParagraphElement.words`,
 * `HandwritingElement.words`, and `ParseTableCell.words` when
 * `output.includeWords === true`.
 */
export type ParseWord = Schemas['Word'];

/** Fields shared by every spatial element. */
export type ParseElementBase = Schemas['ElementBase'];

export type ParagraphElement = Schemas['ParagraphElement'];

/**
 * Semantic role of a paragraph element. `null` when the role is undetermined.
 */
export type ParagraphRole = NonNullable<ParagraphElement['role']>;

export type FormulaElement = Schemas['FormulaElement'];

export type PictureElement = Schemas['PictureElement'];

/** A single cell inside a `TableElement`. */
export type ParseTableCell = Schemas['TableCell'];

export type TableElement = Schemas['TableElement'];

/** Question or answer entity within a `KeyValuePair`. */
export type KeyValueEntity = Schemas['KeyValueEntity'];

export type KeyValuePair = Schemas['KeyValuePair'];

export type KeyValueRegionElement = Schemas['KeyValueRegionElement'];

export type HandwritingElement = Schemas['HandwritingElement'];

/**
 * Discriminated union of every spatial element type. Use the `type` field for
 * narrowing.
 */
export type ParseElement = Schemas['Element'];

/**
 * Processing metrics for a `/extraction/parse` call.
 */
export type ParseMetrics = Schemas['Metrics'];

/**
 * Extraction-credit usage for a `/extraction/parse` call.
 *
 * **Extraction credits** are a separate billing bucket from processor API
 * credits; an extraction call never debits processor credits and vice-versa.
 *
 * See {@link ExtractionCredits} for the shape of the billing object.
 */
export type ParseUsage = Schemas['Usage'];

/**
 * Echoes the resolved configuration the server used for this request.
 */
export type ParseConfiguration = Schemas['Configuration'];

/**
 * Successful `/extraction/parse` response with spatial element output.
 *
 * Hand-composed over the generated `ParseOutput` schema: the spec marks both
 * `elements` and `markdown` as optional on the same object, so callers without
 * narrowing have to use `?.` everywhere. These narrowed variants pin one field
 * present and the other `undefined`, allowing `if (output.markdown !== undefined)`
 * to discriminate cleanly.
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
 * Discriminated union of every successful `/extraction/parse` response. Narrow
 * on `configuration.outputFormat` (or simply branch on `output.markdown` /
 * `output.elements`) to pick between the two output shapes.
 */
export type ParseResponse = ParseResponseSpatial | ParseResponseMarkdown;

/** Path-level error detail returned inside `ParseErrorResponse.errorDetails.failingPaths`. */
export type ParseErrorFailingPath = NonNullable<
  NonNullable<Schemas['ParseErrorResponse']['errorDetails']>['failingPaths']
>[number];

/**
 * Structured error details returned by the server on validation/processing errors.
 */
export type ParseErrorDetails = NonNullable<Schemas['ParseErrorResponse']['errorDetails']>;

/**
 * Error response envelope returned on 4xx/5xx responses from `/extraction/parse`.
 *
 * The TypeScript client surfaces this body as the `details` of the thrown
 * `APIError` / `ValidationError` / `AuthenticationError`.
 */
export type ParseErrorResponse = Schemas['ParseErrorResponse'];

/**
 * Options accepted by {@link import('../client').NutrientClient.parse | NutrientClient.parse}.
 *
 * All fields are optional; the server falls back to `mode: 'understand'` with
 * spatial output when nothing is provided. Hand-written because `apiVersion` is
 * a client-only concern (header override, not body) and the request-side options
 * mirror the ergonomic surface in {@link ParseInstructions}.
 */
export interface ParseOptions {
  mode?: ParseMode;
  output?: ParseOutputOptions;
  /** OCR language hint. See {@link ParseProcessingOptions.language}. */
  language?: ParseProcessingOptions['language'];
  /**
   * Optional API-version override sent as the `x-nutrient-api-version` header.
   * Defaults to the version pinned at API-key creation time.
   */
  apiVersion?: string;
}
