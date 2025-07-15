/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import { sendRequest } from '../../http';
import type { NutrientClientOptions, RequestConfig } from '../../types';
import type { NormalizedFileData } from '../../inputs';
import { AuthenticationError, type NetworkError } from '../../errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Mock form-data with a simple implementation
const mockFormDataInstance: {
  append: jest.Mock;
  getHeaders: jest.Mock;
} = {
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({
    'content-type': 'multipart/form-data; boundary=----test',
  }),
};

// Mock Stream
const mockStream: NodeJS.ReadableStream = {
  pipe: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  removeAllListeners: jest.fn(),
  setMaxListeners: jest.fn(),
  getMaxListeners: jest.fn(),
  listeners: jest.fn(),
  rawListeners: jest.fn(),
  emit: jest.fn(),
  listenerCount: jest.fn(),
  eventNames: jest.fn(),
  read: jest.fn(),
  isPaused: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  [Symbol.asyncIterator]: jest.fn(),
  readable: true,
  setEncoding: jest.fn(),
  unpipe: jest.fn(),
  unshift: jest.fn(),
  wrap: jest.fn(),
};

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => mockFormDataInstance);
});

// Mock file input processing
jest.mock('../../inputs', () => ({
  processFileInput: jest.fn().mockImplementation((input: unknown): Promise<NormalizedFileData> => {
    if (typeof input === 'string' && input === 'test-file.pdf') {
      // Return a mock stream for file path inputs
      return Promise.resolve({
        data: mockStream,
        filename: 'test-file.pdf',
        contentType: 'application/pdf',
      });
    }
    return Promise.resolve({
      data: Buffer.from('mock file data'),
      filename: 'file.bin',
      contentType: 'application/octet-stream',
    });
  }),
}));

describe('HTTP Layer', () => {
  const mockClientOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com/v1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset form-data mock
    mockFormDataInstance.append.mockClear();
    mockFormDataInstance.getHeaders.mockClear();
    mockFormDataInstance.getHeaders.mockReturnValue({
      'content-type': 'multipart/form-data; boundary=----test',
    });
    // Reset axios.isAxiosError mock
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
  });

  describe('sendRequest', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = {
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      const result = await sendRequest(config, mockClientOptions, 'json');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://api.test.com/v1/account/info',
          headers: {
            Authorization: 'Bearer test-api-key',
          },
        }),
      );

      expect(result).toEqual({
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      });
    });

    it('should handle async API key provider', async () => {
      const asyncOptions: NutrientClientOptions = {
        apiKey: jest.fn().mockResolvedValue('async-api-key') as () => Promise<string>,
      };

      const mockResponse = {
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await sendRequest(config, asyncOptions, 'json');

      expect(asyncOptions.apiKey as jest.Mock).toHaveBeenCalled();
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer async-api-key',
          }),
        }),
      );
    });

    it('should throw AuthenticationError for invalid async API key', async () => {
      const asyncOptions: NutrientClientOptions = {
        apiKey: jest.fn().mockResolvedValue('') as () => Promise<string>,
      };

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await expect(sendRequest(config, asyncOptions, 'json')).rejects.toThrow(AuthenticationError);
      await expect(sendRequest(config, asyncOptions, 'json')).rejects.toThrow(
        'API key function must return a non-empty string',
      );
    });

    it('should throw AuthenticationError when async API key function fails', async () => {
      const asyncOptions: NutrientClientOptions = {
        apiKey: jest
          .fn()
          .mockRejectedValue(new Error('Token fetch failed')) as () => Promise<string>,
      };

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await expect(sendRequest(config, asyncOptions, 'json')).rejects.toThrow(AuthenticationError);
      await expect(sendRequest(config, asyncOptions, 'json')).rejects.toThrow(
        'Failed to resolve API key from function',
      );
    });

    it('should send JSON data with proper headers', async () => {
      const mockResponse = {
        data: { id: 123 },
        status: 201,
        statusText: 'Created',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'POST', '/build'> = {
        endpoint: '/build',
        method: 'POST',
        data: {
          instructions: { parts: [{ file: 'test.pdf' }] },
        },
      };

      await sendRequest(config, mockClientOptions, 'arraybuffer');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parts: expect.arrayContaining([expect.objectContaining({ file: 'test.pdf' })]),
          }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should send files with FormData', async () => {
      const mockResponse = {
        data: { uploaded: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'POST', '/build'> = {
        endpoint: '/build',
        method: 'POST',
        data: {
          files: new Map<string, NormalizedFileData>([
            [
              'document',
              {
                data: new Uint8Array([1, 2, 3, 4]),
                filename: 'file.bin',
                contentType: 'application/octet-stream',
              },
            ],
          ]),
          instructions: {
            parts: [{ file: 'document' }],
            output: { type: 'pdf' },
          },
        },
      };

      await sendRequest(config, mockClientOptions, 'arraybuffer');

      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'document',
        expect.any(Buffer), // Expecting a Buffer in Node.js
        { filename: 'file.bin', contentType: 'application/octet-stream' },
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith('instructions', expect.any(String));
    });

    it('should handle 401 authentication error', async () => {
      const mockResponse = {
        data: { error: 'Invalid API key' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await expect(sendRequest(config, mockClientOptions, 'json')).rejects.toMatchObject({
        name: 'AuthenticationError',
        message: 'Invalid API key',
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
      });
    });

    it('should handle 400 validation error', async () => {
      const mockResponse = {
        data: { message: 'Invalid parameters' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'POST', '/build'> = {
        endpoint: '/build',
        method: 'POST',
        data: {} as never,
      };

      await expect(sendRequest(config, mockClientOptions, 'arraybuffer')).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Invalid parameters',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should handle network errors', async () => {
      const networkError = {
        isAxiosError: true,
        request: {},
        message: 'Network Error',
      };

      mockedAxios.mockRejectedValueOnce(networkError);
      (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await expect(sendRequest(config, mockClientOptions, 'json')).rejects.toMatchObject({
        name: 'NetworkError',
        message: 'Network request failed',
        code: 'NETWORK_ERROR',
      });
    });

    it('should not leak API key in network error details', async () => {
      const networkError = {
        isAxiosError: true,
        request: {},
        message: 'Network Error',
      };

      mockedAxios.mockRejectedValueOnce(networkError);
      (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
        headers: {
          // The vulnerability exists when the user overrides the Authorization in the Request Config
          // apiKey is properly sanitized if the user only uses the clientOption to set the API key
          Authorization: 'Bearer secret-api-key-that-should-not-leak',
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      };

      const errorPromise = sendRequest(config, mockClientOptions, 'json');

      // Verify the promise rejects with the expected error
      await expect(errorPromise).rejects.toHaveProperty('name', 'NetworkError');
      await expect(errorPromise).rejects.toHaveProperty('message', 'Network request failed');
      await expect(errorPromise).rejects.toHaveProperty('code', 'NETWORK_ERROR');

      // Capture the error to verify its details
      let thrownError: NetworkError | undefined;
      try {
        await errorPromise;
      } catch (error) {
        console.error(error)
        thrownError = error as NetworkError;
      }

      // Now we can safely check the error details
      expect(thrownError).toBeDefined();
      expect(thrownError?.details).toHaveProperty('headers');
      expect(thrownError?.details?.['headers']).toHaveProperty('X-Custom-Header', 'custom-value');
      expect(thrownError?.details?.['headers']).not.toHaveProperty('Authorization');

      // Verify the API key is not present in the stringified error
      const errorString = JSON.stringify(thrownError);
      expect(errorString).not.toContain('secret-api-key-that-should-not-leak');
    });

    it('should use custom timeout', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await sendRequest(config, { ...mockClientOptions, timeout: 60000 }, 'json');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        }),
      );
    });

    it('should use default timeout when not specified', async () => {
      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await sendRequest(config, mockClientOptions, 'json');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 0, // Default timeout
        }),
      );
    });

    it('should handle multiple files in request', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'POST', '/build'> = {
        endpoint: '/build',
        method: 'POST',
        data: {
          files: new Map<string, NormalizedFileData>([
            [
              'file1',
              {
                data: new Uint8Array([1, 2, 3]),
                filename: 'file1.bin',
                contentType: 'application/octet-stream',
              },
            ],
            [
              'file2',
              {
                data: new Uint8Array([4, 5, 6]),
                filename: 'file2.bin',
                contentType: 'application/octet-stream',
              },
            ],
            [
              'file3',
              {
                data: new Uint8Array([7, 8, 9]),
                filename: 'file3.bin',
                contentType: 'application/octet-stream',
              },
            ],
          ]),
          instructions: {
            parts: [{ file: 'file1' }, { file: 'file2' }, { file: 'file3' }],
            output: { type: 'pdf' },
          },
        },
      };

      await sendRequest(config, mockClientOptions, 'arraybuffer');

      expect(mockFormDataInstance.append).toHaveBeenCalledTimes(4); // 3 files + 1 instructions
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file1',
        expect.any(Buffer), // Expecting a Buffer in Node.js
        { filename: 'file1.bin', contentType: 'application/octet-stream' },
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file2',
        expect.any(Buffer), // Expecting a Buffer in Node.js
        { filename: 'file2.bin', contentType: 'application/octet-stream' },
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'file3',
        expect.any(Buffer), // Expecting a Buffer in Node.js
        { filename: 'file3.bin', contentType: 'application/octet-stream' },
      );
      expect(mockFormDataInstance.append).toHaveBeenCalledWith(
        'instructions',
        expect.any(String), // JSON stringified instructions
      );
    });

    it('should handle binary response data', async () => {
      const binaryData = Buffer.from('PDF content here');
      const mockResponse = {
        data: binaryData,
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/pdf',
        },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'POST', '/build'> = {
        endpoint: '/build',
        method: 'POST',
        data: {
          instructions: { parts: [{ file: 'test.pdf' }] },
        },
      };

      const result = await sendRequest(config, mockClientOptions, 'arraybuffer');

      expect(result.data).toBe(binaryData);
      expect(result.headers['content-type']).toBe('application/pdf');
    });

    it('should strip trailing slashes from base URL', async () => {
      const optionsWithTrailingSlash: NutrientClientOptions = {
        apiKey: 'test-key',
        baseUrl: 'https://api.nutrient.io/',
      };

      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: RequestConfig<'GET', '/account/info'> = {
        endpoint: '/account/info',
        method: 'GET',
        data: undefined,
      };

      await sendRequest(config, optionsWithTrailingSlash, 'json');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.nutrient.io/account/info',
        }),
      );
    });
  });
});
