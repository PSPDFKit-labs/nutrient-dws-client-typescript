import type { components, operations } from '../generated/api-types';
import type { components as extractComponents } from '../generated/extract-types';
import type { NormalizedFileData } from '../inputs';
import type { ValueOf } from '@typescript-eslint/eslint-plugin/dist/util';

type ExtractSchemas = extractComponents['schemas'];

// ─────────────────────────────────────────────────────────────────────────────
// `/extraction/parse` — hand-composed request and response types
//
// The schema primitives (Mode, OutputFormat, Element and the six element
// subtypes, Bounds, PageRef, Word, TableCell, KeyValuePair, KeyValueEntity,
// Metrics, Usage, Configuration, ParseErrorResponse) live in the generated
// extract-types and are accessible to consumers via the `extractComponents`
// re-export from the package root. The types defined below are the four
// shapes the spec doesn't express on its own:
//
// - `ParseOutputOptions` / `ParseInstructions` — spec marks
//   `OutputOptions.includeWords` as required but the server defaults it.
// - `ParseResponseSpatial` / `ParseResponseMarkdown` — cross-field
//   discriminated narrowing so `if (output.markdown !== undefined)` works
//   without per-call `?.` access.
// - `ParseOptions` — adds the client-only `apiVersion` header concern that
//   isn't a body field in the spec.
// - `ExtractionCredits` — derived alias for the billing-bucket sub-shape.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extraction-credit usage returned by the Data Extraction API
 * (`POST /extraction/parse`).
 *
 * **Extraction credits** are a separate billing bucket from the **processor
 * API credits** consumed by `/build`, `/sign`, OCR, and every other endpoint
 * on `NutrientClient`. An extraction call never debits processor credits and
 * vice-versa. The server surfaces this object at
 * `ParseResponse.usage.data_extraction_credits`.
 */
export type ExtractionCredits = NonNullable<ExtractSchemas['Usage']['data_extraction_credits']>;

/**
 * Output configuration for `/extraction/parse`.
 *
 * Defaults: `text` mode emits `markdown`; `structure`, `understand`, and
 * `agentic` emit `spatial`. `includeWords` defaults to `false` server-side and
 * is only honoured when `format` is `'spatial'`. Hand-written because the spec
 * marks `includeWords` as required.
 */
export interface ParseOutputOptions {
  /** Output format. */
  format: ExtractSchemas['Configuration']['outputFormat'];
  /**
   * Include word-level OCR data nested inside paragraph and table cell
   * elements. Only applicable when `format` is `'spatial'`.
   */
  includeWords?: boolean;
}

/**
 * Instruction payload sent to `/extraction/parse`. All fields are optional; an
 * empty object resolves to `mode: 'understand'` with spatial output server-side.
 */
export interface ParseInstructions {
  /**
   * URL of a remote document to parse. Used by the JSON request shape; when
   * passing a local file or buffer, omit this field.
   */
  url?: string;
  mode?: ExtractSchemas['Mode'];
  output?: ParseOutputOptions;
  options?: ExtractSchemas['ProcessingOptions'];
}

/**
 * Options accepted by `NutrientClient.parse()`. Hand-written because
 * `apiVersion` is a client-only header override, not a body field in the spec.
 */
export interface ParseOptions {
  mode?: ExtractSchemas['Mode'];
  output?: ParseOutputOptions;
  /** OCR language hint. Only honoured for `structure` / `understand` / `agentic` modes. */
  language?: ExtractSchemas['ProcessingOptions']['language'];
  /**
   * Optional API-version override sent as the `x-nutrient-api-version` header.
   * Defaults to the version pinned at API-key creation time.
   */
  apiVersion?: string;
}

/**
 * Successful `/extraction/parse` response with spatial element output.
 *
 * Hand-composed over the generated `ParseOutput` schema: the spec marks both
 * `elements` and `markdown` as optional on the same object, forcing `?.` access
 * at every call site. These narrowed variants pin one field present and the
 * other `undefined`, allowing `if (output.markdown !== undefined)` to
 * discriminate cleanly.
 */
export interface ParseResponseSpatial {
  status: 200;
  /** Unique request identifier for debugging and support. */
  requestId: string;
  output: {
    elements: ExtractSchemas['Element'][];
    markdown?: undefined;
  };
  metrics: ExtractSchemas['Metrics'];
  usage?: ExtractSchemas['Usage'];
  configuration: ExtractSchemas['Configuration'] & { outputFormat: 'spatial' };
}

/** Successful `/extraction/parse` response with whole-document Markdown output. */
export interface ParseResponseMarkdown {
  status: 200;
  /** Unique request identifier for debugging and support. */
  requestId: string;
  output: {
    markdown: string;
    elements?: undefined;
  };
  metrics: ExtractSchemas['Metrics'];
  usage?: ExtractSchemas['Usage'];
  configuration: ExtractSchemas['Configuration'] & { outputFormat: 'markdown' };
}

/**
 * Discriminated union of every successful `/extraction/parse` response. Narrow
 * on `configuration.outputFormat` (or simply branch on `output.markdown` /
 * `output.elements`) to pick between the two output shapes.
 */
export type ParseResponse = ParseResponseSpatial | ParseResponseMarkdown;

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint request/response type maps
// ─────────────────────────────────────────────────────────────────────────────

export type RequestTypeMap = {
  GET: {
    '/account/info': undefined;
  };
  POST: {
    '/build': {
      instructions: components['schemas']['BuildInstructions'];
      files?: Map<string, NormalizedFileData>;
    };
    '/analyze_build': {
      instructions: components['schemas']['BuildInstructions'];
    };
    '/sign': {
      file: NormalizedFileData;
      data?: components['schemas']['CreateDigitalSignature'];
      image?: NormalizedFileData;
      graphicImage?: NormalizedFileData;
    };
    '/ai/redact': {
      data: components['schemas']['RedactData'];
      fileKey?: string;
      file?: NormalizedFileData;
    };
    '/tokens': components['schemas']['CreateAuthTokenParameters'];
    /**
     * `/extraction/parse` request body. `instructions` is always sent (callers
     * may pass an empty object for server defaults). Use exactly one of:
     * - `file` + `instructions` for multipart upload (local files, buffers, streams).
     * - `instructions.url` only for URL-based input (sent as `application/json`).
     */
    '/extraction/parse': {
      instructions: ParseInstructions;
      file?: NormalizedFileData;
    };
  };
  DELETE: {
    '/tokens': { id: string };
  };
};

export type ResponseTypeMap = {
  GET: {
    '/account/info': operations['get-account-info']['responses']['200']['content']['application/json'];
  };
  POST: {
    '/build': ValueOf<components['responses']['BuildResponseOk']['content']>;
    '/analyze_build': components['schemas']['AnalyzeBuildResponse'];
    '/sign': string;
    '/ai/redact': string;
    '/tokens': components['schemas']['CreateAuthTokenResponse'];
    '/extraction/parse': ParseResponse;
  };
  DELETE: {
    '/tokens': undefined;
  };
};

export type Methods = keyof RequestTypeMap & keyof ResponseTypeMap;
export type Endpoints<Method extends Methods> = keyof RequestTypeMap[Method] &
  keyof ResponseTypeMap[Method];

/**
 * HTTP request configuration for API calls
 */
export interface RequestConfig<Method extends Methods, Endpoint extends Endpoints<Method>> {
  method: Method;
  endpoint: Endpoint;
  data: RequestTypeMap[Method][Endpoint];
  headers?: Record<string, string>;
}

/**
 * Response from API call
 */
export interface ApiResponse<Method extends Methods, Endpoint extends Endpoints<Method>> {
  data: ResponseTypeMap[Method][Endpoint];
  status: number;
  statusText: string;
  headers: Record<string, string>;
}
