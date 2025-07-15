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
} from './types';

// Utility exports
export {
  validateFileInput,
  processFileInput,
  isRemoteFileInput,
  processRemoteFileInput,
  type NormalizedFileData,
} from './inputs';
export { type ActionWithFileInput } from './build';
