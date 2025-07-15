import {
  NutrientError,
  ValidationError,
  APIError,
  AuthenticationError,
  NetworkError,
} from '../../errors';

describe('Error Classes', () => {
  describe('NutrientError', () => {
    it('should create a base error with message and code', () => {
      const error = new NutrientError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('NutrientError');
      expect(error.stack).toBeDefined();
      expect(error.details).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
    });

    it('should include details when provided', () => {
      const details = { foo: 'bar', baz: 123 };
      const error = new NutrientError('Test error', 'TEST_ERROR', details);

      expect(error.details).toEqual(details);
    });

    it('should include status code when provided', () => {
      const error = new NutrientError('Test error', 'TEST_ERROR', { foo: 'bar' }, 400);

      expect(error.statusCode).toBe(400);
    });

    it('should be instanceof Error', () => {
      const error = new NutrientError('Test error', 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NutrientError);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with default code', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should inherit from NutrientError', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NutrientError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should accept details and status code', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid input', details, 422);

      expect(error.details).toEqual(details);
      expect(error.statusCode).toBe(422);
    });
  });

  describe('APIError', () => {
    it('should create an API error with status code', () => {
      const error = new APIError('Server error', 500);

      expect(error.message).toBe('Server error');
      expect(error.code).toBe('API_ERROR');
      expect(error.name).toBe('APIError');
      expect(error.statusCode).toBe(500);
    });

    it('should inherit from NutrientError', () => {
      const error = new APIError('Server error', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NutrientError);
      expect(error).toBeInstanceOf(APIError);
    });

    it('should accept details', () => {
      const details = { endpoint: '/convert', method: 'POST' };
      const error = new APIError('Server error', 500, details);

      expect(error.details).toEqual(details);
    });
  });

  describe('AuthenticationError', () => {
    it('should create an authentication error with default code', () => {
      const error = new AuthenticationError('Invalid API key');

      expect(error.message).toBe('Invalid API key');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should inherit from NutrientError', () => {
      const error = new AuthenticationError('Invalid API key');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NutrientError);
      expect(error).toBeInstanceOf(AuthenticationError);
    });

    it('should accept details and status code', () => {
      const details = { reason: 'expired token' };
      const error = new AuthenticationError('Invalid API key', details, 401);

      expect(error.details).toEqual(details);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('NetworkError', () => {
    it('should create a network error with default code', () => {
      const error = new NetworkError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should inherit from NutrientError', () => {
      const error = new NetworkError('Connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NutrientError);
      expect(error).toBeInstanceOf(NetworkError);
    });

    it('should accept details', () => {
      const details = { timeout: 30000, endpoint: 'https://api.nutrient.io' };
      const error = new NetworkError('Connection failed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('Error serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' }, 422);
      const json = JSON.parse(JSON.stringify(error)) as {
        message: string;
        code: string;
        name: string;
        details: Record<string, unknown>;
        statusCode: number;
        stack: string;
      };

      expect(json.message).toBe('Invalid input');
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.name).toBe('ValidationError');
      expect(json.details).toEqual({ field: 'email' });
      expect(json.statusCode).toBe(422);
      // Stack trace is serialized
      expect(json.stack).toBeDefined();
      expect(typeof json.stack).toBe('string');
    });

    it('should maintain error properties when caught', () => {
      const throwAndCatch = (): NutrientError | null => {
        try {
          throw new APIError('Test error', 500, { foo: 'bar' });
        } catch (error) {
          return error as NutrientError;
        }
      };

      const error = throwAndCatch();
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Test error');
      expect(error?.code).toBe('API_ERROR');
      expect(error?.statusCode).toBe(500);
      expect(error?.details).toEqual({ foo: 'bar' });
    });
  });

  describe('toString method', () => {
    it('should format error with default code', () => {
      const error = new NutrientError('Test error');
      expect(error.toString()).toBe('NutrientError: Test error');
    });

    it('should include custom code when provided', () => {
      const error = new NutrientError('Test error', 'CUSTOM_CODE');
      expect(error.toString()).toBe('NutrientError: Test error (CUSTOM_CODE)');
    });

    it('should include status code when provided', () => {
      const error = new NutrientError('Test error', 'CUSTOM_CODE', {}, 404);
      expect(error.toString()).toBe('NutrientError: Test error (CUSTOM_CODE) [HTTP 404]');
    });

    it('should include status code without custom code', () => {
      const error = new NutrientError('Test error', 'NUTRIENT_ERROR', {}, 500);
      expect(error.toString()).toBe('NutrientError: Test error [HTTP 500]');
    });
  });

  describe('wrap method', () => {
    it('should return the original error if it is a NutrientError', () => {
      const originalError = new ValidationError('Original error');
      const wrappedError = NutrientError.wrap(originalError);

      expect(wrappedError).toBe(originalError);
    });

    it('should wrap standard Error instances', () => {
      const originalError = new Error('Standard error');
      const wrappedError = NutrientError.wrap(originalError);

      expect(wrappedError).toBeInstanceOf(NutrientError);
      expect(wrappedError.message).toBe('Standard error');
      expect(wrappedError.code).toBe('WRAPPED_ERROR');
      expect(wrappedError.details).toEqual({
        originalError: 'Error',
        originalMessage: 'Standard error',
        stack: originalError.stack,
      });
    });

    it('should wrap standard Error instances with custom message', () => {
      const originalError = new Error('Standard error');
      const wrappedError = NutrientError.wrap(originalError, 'Custom prefix');

      expect(wrappedError).toBeInstanceOf(NutrientError);
      expect(wrappedError.message).toBe('Custom prefix: Standard error');
      expect(wrappedError.code).toBe('WRAPPED_ERROR');
    });

    it('should handle non-Error objects', () => {
      const wrappedError = NutrientError.wrap('String error');

      expect(wrappedError).toBeInstanceOf(NutrientError);
      expect(wrappedError.message).toBe('An unknown error occurred');
      expect(wrappedError.code).toBe('UNKNOWN_ERROR');
      expect(wrappedError.details).toEqual({
        originalError: 'String error',
      });
    });

    it('should handle non-Error objects with custom message', () => {
      const wrappedError = NutrientError.wrap(null, 'Custom message');

      expect(wrappedError).toBeInstanceOf(NutrientError);
      expect(wrappedError.message).toBe('Custom message');
      expect(wrappedError.code).toBe('UNKNOWN_ERROR');
      expect(wrappedError.details).toEqual({
        originalError: 'null',
      });
    });
  });
});
