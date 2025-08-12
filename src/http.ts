import axios, { type AxiosRequestConfig, type AxiosResponse, type ResponseType } from 'axios';
import FormData from 'form-data';
import { type NormalizedFileData } from './inputs';
import {
  APIError,
  AuthenticationError,
  NetworkError,
  NutrientError,
  ValidationError,
} from './errors';
import type { NutrientClientOptions } from './types';
import type { Methods, Endpoints, RequestConfig, ApiResponse, ResponseTypeMap } from './types';
import { getUserAgent } from './utils';

/**
 * Sends HTTP request to Nutrient DWS Processor API
 * Handles authentication, file uploads, and error conversion
 */
export async function sendRequest<Method extends Methods, Endpoint extends Endpoints<Method>>(
  config: RequestConfig<Method, Endpoint>,
  clientOptions: NutrientClientOptions,
  responseType: ResponseType,
): Promise<ApiResponse<Method, Endpoint>> {
  try {
    // Resolve API key (string or async function)
    const apiKey = await resolveApiKey(clientOptions.apiKey);

    // Build full URL
    const baseUrl = clientOptions.baseUrl ?? 'https://api.nutrient.io';
    const url = `${baseUrl.replace(/\/$/, '')}${config.endpoint.toString()}`;

    // Prepare request configuration
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': getUserAgent(),
        ...config.headers,
      },
      timeout: clientOptions.timeout ?? 0, // No default timeout
      validateStatus: () => true, // Handle all status codes manually
      responseType,
    };

    prepareRequestBody<Method, Endpoint>(axiosConfig, config);

    // Make request
    const response: AxiosResponse = await axios(axiosConfig);

    // Handle response
    return handleResponse<Method, Endpoint>(response);
  } catch (error) {
    throw convertError(error, config);
  }
}

/**
 * Resolves API key from string or async function
 */
async function resolveApiKey(apiKey: string | (() => Promise<string>)): Promise<string> {
  if (typeof apiKey === 'string') {
    return apiKey;
  }

  try {
    const resolvedKey = await apiKey();
    if (typeof resolvedKey !== 'string' || resolvedKey.length === 0) {
      throw new AuthenticationError('API key function must return a non-empty string', {
        resolvedType: typeof resolvedKey,
      });
    }
    return resolvedKey;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Failed to resolve API key from function', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Prepares request body with files and data
 */
function prepareRequestBody<Method extends Methods, Endpoint extends Endpoints<Method>>(
  axiosConfig: AxiosRequestConfig,
  config: RequestConfig<Method, Endpoint>,
): AxiosRequestConfig {
  if (config.method === 'POST') {
    if (['/build', '/analyze_build'].includes(config.endpoint as string)) {
      const typedConfig = config as RequestConfig<'POST', '/build'>;

      if (typedConfig.data.files && typedConfig.data.files.size > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        for (const [key, value] of typedConfig.data.files) {
          appendFileToFormData(formData, key, value);
        }
        formData.append('instructions', JSON.stringify(typedConfig.data.instructions));
        axiosConfig.data = formData;

        // Node.js FormData sets its own headers
        axiosConfig.headers = {
          ...axiosConfig.headers,
          ...formData.getHeaders(),
        };
      } else {
        // JSON only request
        axiosConfig.data = typedConfig.data.instructions;
        axiosConfig.headers = {
          ...axiosConfig.headers,
          'Content-Type': 'application/json',
        };
      }

      return axiosConfig;
    } else if (config.endpoint === '/sign') {
      const typedConfig = config as RequestConfig<'POST', '/sign'>;

      const formData = new FormData();
      appendFileToFormData(formData, 'file', typedConfig.data.file);
      if (typedConfig.data.image) {
        appendFileToFormData(formData, 'image', typedConfig.data.image);
      }
      if (typedConfig.data.graphicImage) {
        appendFileToFormData(formData, 'graphicImage', typedConfig.data.graphicImage);
      }
      if (typedConfig.data.data) {
        formData.append('data', JSON.stringify(typedConfig.data.data));
      } else {
        formData.append(
          'data',
          JSON.stringify({
            signatureType: 'cades',
            cadesLevel: 'b-lt',
          }),
        );
      }
      axiosConfig.data = formData;

      return axiosConfig;
    } else if (config.endpoint === '/ai/redact') {
      const typedConfig = config as RequestConfig<'POST', '/ai/redact'>;

      if (typedConfig.data.file && typedConfig.data.fileKey) {
        const formData = new FormData();
        appendFileToFormData(formData, typedConfig.data.fileKey, typedConfig.data.file);
        formData.append('data', JSON.stringify(typedConfig.data.data));
        axiosConfig.data = formData;
      } else {
        // JSON only request
        axiosConfig.data = typedConfig.data.data;
        axiosConfig.headers = {
          ...axiosConfig.headers,
          'Content-Type': 'application/json',
        };
      }

      return axiosConfig;
    }
  }
  // Fallback, passing data as JSON
  if (config.data) {
    axiosConfig.data = config.data;
    axiosConfig.headers = {
      ...axiosConfig.headers,
      'Content-Type': 'application/json',
    };
  }
  return axiosConfig;
}

/**
 * Appends file to FormData with proper format (Node.js only)
 */
function appendFileToFormData(formData: FormData, key: string, file: NormalizedFileData): void {
  if (Buffer.isBuffer(file.data)) {
    formData.append(key, file.data, {
      filename: file.filename,
      contentType: file.contentType,
    });
  } else if (file.data instanceof Uint8Array) {
    formData.append(key, Buffer.from(file.data), {
      filename: file.filename,
      contentType: file.contentType,
    });
  } else if (file.data && typeof file.data === 'object' && 'pipe' in file.data) {
    // Handle ReadableStream (including fs.ReadStream)
    formData.append(key, file.data, {
      filename: file.filename,
      contentType: file.contentType,
    });
  } else {
    throw new ValidationError('Expected Buffer, Uint8Array, or ReadableStream for file data', {
      dataType: typeof file.data,
    });
  }
}

/**
 * Handles HTTP response and converts to standardized format
 */
function handleResponse<Method extends Methods, Endpoint extends Endpoints<Method>>(
  response: AxiosResponse,
): ApiResponse<Method, Endpoint> {
  const { status, statusText, headers } = response;
  const data = response.data as ResponseTypeMap[Method][Endpoint];

  // Check for error status codes
  if (status >= 400) {
    throw createHttpError(status, statusText, data);
  }

  return {
    data,
    status,
    statusText,
    headers: headers as Record<string, string>,
  };
}

/**
 * Creates appropriate error for HTTP status codes
 */
function createHttpError(status: number, statusText: string, data: unknown): NutrientError {
  const message = extractErrorMessage(data) ?? `HTTP ${status}: ${statusText}`;
  const details =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : { response: data };

  if (status === 401 || status === 403) {
    return new AuthenticationError(message, details, status);
  }

  if (status >= 400 && status < 500) {
    return new ValidationError(message, details, status);
  }

  return new APIError(message, status, details);
}

/**
 * Extracts error message from response data with comprehensive DWS error handling
 */
function extractErrorMessage(data: unknown): string | null {
  if (typeof data === 'object' && data !== null) {
    const errorData = data as Record<string, unknown>;

    // DWS-specific error fields (prioritized)
    if (typeof errorData['error_description'] === 'string') {
      return errorData['error_description'];
    }
    if (typeof errorData['error_message'] === 'string') {
      return errorData['error_message'];
    }

    // Common error message fields
    if (typeof errorData['message'] === 'string') {
      return errorData['message'];
    }
    if (typeof errorData['error'] === 'string') {
      return errorData['error'];
    }
    if (typeof errorData['detail'] === 'string') {
      return errorData['detail'];
    }
    if (typeof errorData['details'] === 'string') {
      return errorData['details'];
    }

    // Handle nested error objects
    if (typeof errorData['error'] === 'object' && errorData['error'] !== null) {
      const nestedError = errorData['error'] as Record<string, unknown>;
      if (typeof nestedError['message'] === 'string') {
        return nestedError['message'];
      }
      if (typeof nestedError['description'] === 'string') {
        return nestedError['description'];
      }
    }

    // Handle errors array (common in validation responses)
    if (Array.isArray(errorData['errors']) && errorData['errors'].length > 0) {
      const firstError = errorData['errors'][0] as unknown;
      if (typeof firstError === 'string') {
        return firstError;
      }
      if (typeof firstError === 'object' && firstError !== null) {
        const errorObj = firstError as Record<string, unknown>;
        if (typeof errorObj['message'] === 'string') {
          return errorObj['message'];
        }
      }
    }
  }

  return null;
}

/**
 * Converts various error types to NutrientError
 */
function convertError<Method extends Methods, Endpoint extends Endpoints<Method>>(
  error: unknown,
  config: RequestConfig<Method, Endpoint>,
): NutrientError {
  if (error instanceof NutrientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response;
    const request = error.request as unknown;
    const message = error.message;

    if (response) {
      // HTTP error response
      return createHttpError(response.status, response.statusText, response.data);
    }

    if (request) {
      const sanitizedHeaders = config.headers;
      if (sanitizedHeaders) {
        delete sanitizedHeaders['Authorization']
      }
      // Network error (request made but no response)
      return new NetworkError('Network request failed', {
        message,
        endpoint: config.endpoint,
        method: config.method,
        headers: sanitizedHeaders,
      });
    }

    // Request setup error
    return new ValidationError('Request configuration error', { message,
      endpoint: config.endpoint,
      method: config.method,
      data: config.data,
    });
  }

  // Unknown error
  return new NutrientError('Unexpected error occurred', 'UNKNOWN_ERROR', {
    error: error instanceof Error ? error.message : String(error),
    endpoint: config.endpoint,
    method: config.method,
    data: config.data,
  });
}