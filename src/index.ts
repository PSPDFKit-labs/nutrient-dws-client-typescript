// Main exports
export { NutrientClient } from './client';
export { BuildActions, BuildOutputs } from './build';

// Builder exports
export { WorkflowBuilder, StagedWorkflowBuilder } from './builders';

// Error exports
export {
  NutrientError,
  ValidationError,
  APIError,
  AuthenticationError,
  NetworkError,
} from './errors';

// Type exports
export type {
  // Client options
  NutrientClientOptions,

  // Input types
  FileInput,
  FilePathInput,
  BufferInput,
  Uint8ArrayInput,
  UrlInput,

  // Workflow types
  WorkflowResult,
  WorkflowExecuteOptions,
  WorkflowInitialStage,
  WorkflowWithPartsStage,
  WorkflowWithActionsStage,
  WorkflowWithOutputStage,
  OutputTypeMap,
  TypedWorkflowResult,
  WorkflowDryRunResult,

  // Data Extraction (`/extraction/parse`) — hand-composed client-facing types.
  // Schema primitives (Mode, Element and the six subtypes, Bounds, PageRef,
  // Word, Metrics, Usage, Configuration, ParseErrorResponse, etc.) live in the
  // `extractComponents` namespace below — same pattern as `components` for the
  // Processor spec.
  ExtractionCredits,
  ParseOutputOptions,
  ParseInstructions,
  ParseOptions,
  ParseResponse,
  ParseResponseSpatial,
  ParseResponseMarkdown,

  // Generated spec namespaces
  components,
  operations,
  paths,
  extractComponents,
  extractOperations,
  extractPaths,
} from './types';

// Utility exports
export {
  validateFileInput,
  processFileInput,
  isRemoteFileInput,
  type NormalizedFileData,
} from './inputs';
export { type ActionWithFileInput } from './build';
export { getLibraryVersion, getUserAgent } from './utils';
