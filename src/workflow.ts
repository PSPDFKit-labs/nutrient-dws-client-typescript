import type { NutrientClientOptions, WorkflowInitialStage } from './types';
import { StagedWorkflowBuilder } from './builders';

/**
 * Factory function to create a new workflow builder with staged interface
 * @param clientOptions - Client configuration options
 * @returns A new staged workflow builder instance
 */
export function workflow(clientOptions: NutrientClientOptions): WorkflowInitialStage {
  return new StagedWorkflowBuilder(clientOptions);
}
