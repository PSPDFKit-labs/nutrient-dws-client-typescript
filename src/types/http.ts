import type { components, operations } from '../generated/api-types';
import type { NormalizedFileData } from '../inputs';
import type { ValueOf } from '@typescript-eslint/eslint-plugin/dist/util';

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
