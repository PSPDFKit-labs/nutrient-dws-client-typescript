import type { NutrientClientOptions, RequestTypeMap, ResponseTypeMap } from '../types';
import { sendRequest } from '../http';
import type { ResponseType } from 'axios';

/**
 * Base builder class that all builders extend from.
 * Provides common functionality for API interaction.
 */
export abstract class BaseBuilder<TResult = unknown> {
  protected clientOptions: NutrientClientOptions;

  constructor(clientOptions: NutrientClientOptions) {
    this.clientOptions = clientOptions;
  }

  /**
   * Sends a request to the API
   */
  protected async sendRequest<T extends '/build' | '/analyze_build'>(
    path: T,
    options: RequestTypeMap['POST'][T],
    responseType: ResponseType,
  ): Promise<ResponseTypeMap['POST'][T]> {
    const config = {
      endpoint: path,
      method: 'POST' as const,
      data: {
        instructions: options.instructions,
        files: 'files' in options ? options.files : undefined,
      },
    };

    const response = await sendRequest(config, this.clientOptions, responseType);
    return response.data;
  }

  /**
   * Abstract method that child classes must implement for execution
   */
  abstract execute(): Promise<TResult>;
}
