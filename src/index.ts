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

  // Data Extraction (`/extraction/parse`) types
  ParseMode,
  ParseOutputFormat,
  ParseOutputOptions,
  ParseProcessingOptions,
  ParseInstructions,
  ParseOptions,
  ParseResponse,
  ParseResponseSpatial,
  ParseResponseMarkdown,
  ParseElement,
  ParagraphElement,
  ParagraphRole,
  FormulaElement,
  PictureElement,
  TableElement,
  ParseTableCell,
  KeyValueRegionElement,
  KeyValuePair,
  KeyValueEntity,
  HandwritingElement,
  ParseElementBase,
  ParseBounds,
  ParsePageRef,
  ParseWord,
  ParseMetrics,
  ParseUsage,
  ParseConfiguration,
  ParseErrorResponse,
  ParseErrorDetails,
  ParseErrorFailingPath,
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
