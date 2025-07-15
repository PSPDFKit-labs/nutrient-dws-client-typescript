import {
  getPdfPageCount,
  isRemoteFileInput,
  isValidPdf,
  processFileInput,
  processRemoteFileInput,
  validateFileInput,
} from '../../inputs';
import { ValidationError } from '../../errors';
import { Readable } from 'stream';
import fs from 'fs';
import type { FileInput } from '../../types';
import { samplePDF, TestDocumentGenerator } from '../helpers';

// Mock fetch for URL tests
global.fetch = jest.fn();

// Create test file data
function createTestBuffer(content: string = 'test content'): Buffer {
  return Buffer.from(content);
}

function createTestUint8Array(content: string = 'test content'): Uint8Array {
  return new TextEncoder().encode(content);
}

describe('Input Processing (Node.js only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileInput', () => {
    it('should validate string inputs', () => {
      expect(validateFileInput('test.pdf')).toBe(true);
      expect(validateFileInput('https://example.com/file.pdf')).toBe(true);
    });

    it('should validate Buffer objects', () => {
      const buffer = createTestBuffer();
      expect(validateFileInput(buffer)).toBe(true);
    });

    it('should validate Uint8Array objects', () => {
      const uint8Array = createTestUint8Array();
      expect(validateFileInput(uint8Array)).toBe(true);
    });

    it('should validate structured input objects', () => {
      expect(validateFileInput({ type: 'file-path', path: 'test.pdf' })).toBe(true);
      expect(
        validateFileInput({ type: 'buffer', buffer: Buffer.from('test'), filename: 'test.bin' }),
      ).toBe(true);
      expect(
        validateFileInput({
          type: 'uint8array',
          data: new Uint8Array([1, 2, 3]),
          filename: 'test.bin',
        }),
      ).toBe(true);
      expect(validateFileInput({ type: 'url', url: 'https://example.com/test.pdf' })).toBe(true);
    });

    it('should reject invalid inputs', () => {
      expect(validateFileInput(null)).toBe(false);
      expect(validateFileInput(undefined)).toBe(false);
      expect(validateFileInput(123)).toBe(false);
      expect(validateFileInput({})).toBe(false);
      expect(validateFileInput({ type: 'invalid' })).toBe(false);
    });
  });

  describe('processFileInput - Buffer', () => {
    it('should process Buffer object', async () => {
      const buffer = createTestBuffer('test content');
      const result = await processFileInput(buffer);

      expect(result).toEqual({
        data: buffer,
        filename: 'buffer',
      });
    });

    it('should process structured buffer input with custom filename', async () => {
      const buffer = createTestBuffer('test content');
      const input = { type: 'buffer' as const, buffer, filename: 'custom.pdf' };
      const result = await processFileInput(input);

      expect(result).toEqual({
        data: buffer,
        filename: 'custom.pdf',
      });
    });
  });

  describe('processFileInput - Uint8Array', () => {
    it('should process Uint8Array object', async () => {
      const uint8Array = createTestUint8Array('test content');
      const result = await processFileInput(uint8Array);

      expect(result).toEqual({
        data: uint8Array,
        filename: 'data.bin',
      });
    });

    it('should process structured uint8array input with custom filename', async () => {
      const uint8Array = createTestUint8Array('test content');
      const input = { type: 'uint8array' as const, data: uint8Array, filename: 'custom.bin' };
      const result = await processFileInput(input);

      expect(result).toEqual({
        data: uint8Array,
        filename: 'custom.bin',
      });
    });
  });

  describe('processFileInput - File Path', () => {
    it('should process file path', async () => {
      const mockStream = new Readable();

      const mockAccess = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined as never);
      const mockCreateReadStream = jest
        .spyOn(fs, 'createReadStream')
        .mockReturnValue(mockStream as fs.ReadStream);

      const result = await processFileInput('/path/to/test.pdf');

      expect(result).toEqual({
        data: mockStream,
        filename: 'test.pdf',
      });
      expect(mockAccess).toHaveBeenCalledWith('/path/to/test.pdf', 0);
      expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/test.pdf');
    });

    it('should process structured file-path input', async () => {
      const mockStream = new Readable();

      const mockAccess = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined as never);
      const mockCreateReadStream = jest
        .spyOn(fs, 'createReadStream')
        .mockReturnValue(mockStream as fs.ReadStream);

      const result = await processFileInput({ type: 'file-path', path: '/path/to/test.pdf' });

      expect(result).toEqual({
        data: mockStream,
        filename: 'test.pdf',
      });
      expect(mockAccess).toHaveBeenCalledWith('/path/to/test.pdf', 0);
      expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/test.pdf');
    });

    it('should throw error for non-existent file', async () => {
      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('File not found') as never);

      await expect(processFileInput('/path/to/nonexistent.pdf')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for other errors during processing', async () => {
      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined as never);
      jest.spyOn(fs, 'createReadStream').mockImplementation(() => {
        throw new Error('Some other error');
      });

      await expect(processFileInput('/path/to/test.pdf')).rejects.toThrow(ValidationError);
    });
  });

  describe('isRemoteFileInput', () => {
    const cases = [
      { name: 'URL string', input: 'https://example.com/test.pdf', expected: true },
      { name: 'File Path string', input: 'test.pdf', expected: false },
      { name: 'Buffer', input: Buffer.from('test'), expected: false },
      { name: 'Uint8Array', input: Uint8Array.from('test'), expected: false },
      {
        name: 'URL Input',
        input: { type: 'url', url: 'https://example.com/test.pdf' },
        expected: true,
      },
      { name: 'File Path Input', input: { type: 'file-path', path: 'test.pdf' }, expected: false },
      {
        name: 'Buffer Input',
        input: { type: 'buffer', buffer: Buffer.from('test') },
        expected: false,
      },
      {
        name: 'Uint8Array Input',
        input: { type: 'uint8array', data: Uint8Array.from('test') },
        expected: false,
      },
    ];

    it.each(cases)('should return $expected for $name', (testCase) => {
      expect(isRemoteFileInput(testCase.input as FileInput)).toBe(testCase.expected);
    });
  });

  describe('processFileInput - Invalid inputs', () => {
    it('should throw for URL', async () => {
      await expect(processFileInput('https://example.com/test.pdf')).rejects.toThrow(
        ValidationError,
      );
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        processFileInput({ type: 'url', url: 'https://example.com/test.pdf' } as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw for null or undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput(null as any)).rejects.toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput(undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw for unsupported types', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput(123 as any)).rejects.toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput({} as any)).rejects.toThrow(ValidationError);
    });

    it('should throw for unsupported input type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      await expect(processFileInput({ type: 'unsupported' } as any)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('processRemoteFileInput', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockClear();
    });

    it('should process URL string input', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await processRemoteFileInput('https://example.com/test.pdf');

      expect(fetch).toHaveBeenCalledWith('https://example.com/test.pdf');
      expect(mockResponse.arrayBuffer).toHaveBeenCalled();
      expect(result).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.any(Buffer),
        filename: 'buffer',
      });
    });

    it('should process URL object input', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await processRemoteFileInput({
        type: 'url',
        url: 'https://example.com/test.pdf',
      });

      expect(fetch).toHaveBeenCalledWith('https://example.com/test.pdf');
      expect(mockResponse.arrayBuffer).toHaveBeenCalled();
      expect(result).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.any(Buffer),
        filename: 'buffer',
      });
    });

    it('should throw ValidationError for non-OK response', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(processRemoteFileInput('https://example.com/test.pdf')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw ValidationError when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(processRemoteFileInput('https://example.com/test.pdf')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getPdfPageCount', () => {
    const cases = [
      {
        name: 'PDF with 1 page',
        input: TestDocumentGenerator.generateSimplePdf('Text'),
        expected: 1,
      },
      { name: 'PDF with 6 pages', input: samplePDF, expected: 6 },
    ];

    it.each(cases)('should return $expected for $name', async (testCase) => {
      // First convert FileInput to NormalizedFileData
      const normalizedData = await processFileInput(testCase.input);
      await expect(getPdfPageCount(normalizedData)).resolves.toEqual(testCase.expected);
    });

    it('should handle Buffer data', async () => {
      const pdfBuffer = Buffer.from(TestDocumentGenerator.generateSimplePdf('Text'));
      const normalizedData = {
        data: pdfBuffer,
        filename: 'test.pdf',
      };
      await expect(getPdfPageCount(normalizedData)).resolves.toEqual(1);
    });

    it('should handle Uint8Array data', async () => {
      const pdfBuffer = Buffer.from(TestDocumentGenerator.generateSimplePdf('Text'));
      const uint8Array = new Uint8Array(pdfBuffer);
      const normalizedData = {
        data: uint8Array,
        filename: 'test.pdf',
      };
      await expect(getPdfPageCount(normalizedData)).resolves.toEqual(1);
    });

    it('should handle ReadableStream data', async () => {
      const pdfBuffer = Buffer.from(TestDocumentGenerator.generateSimplePdf('Text'));
      const mockStream = new Readable();
      mockStream.push(pdfBuffer);
      mockStream.push(null); // End the stream

      const normalizedData = {
        data: mockStream,
        filename: 'test.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).resolves.toEqual(1);
    });

    it('should throw for invalid PDF data type', async () => {
      const normalizedData = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment
        data: 'not a valid data type' as any,
        filename: 'test.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });

    it('should throw when ReadableStream errors', async () => {
      const mockStream = new Readable({
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read() {
          this.emit('error', new Error('Stream error'));
        },
      });

      const normalizedData = {
        data: mockStream,
        filename: 'test.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });

    it('should throw when PDF has no objects', async () => {
      // Create a PDF-like buffer without any objects
      const invalidPdf = Buffer.from('%PDF-1.4\n%%EOF');
      const normalizedData = {
        data: invalidPdf,
        filename: 'invalid.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });

    it('should throw when PDF has no catalog object', async () => {
      // Create a PDF-like buffer with objects but no catalog
      const invalidPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /NotCatalog >>\nendobj\n%%EOF');
      const normalizedData = {
        data: invalidPdf,
        filename: 'invalid.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });

    it('should throw when PDF catalog has no Pages reference', async () => {
      // Create a PDF-like buffer with catalog but no Pages reference
      const invalidPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      const normalizedData = {
        data: invalidPdf,
        filename: 'invalid.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });

    it('should throw when Pages object is not found', async () => {
      // Create a PDF-like buffer with catalog and Pages reference but no Pages object
      const invalidPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF',
      );
      const normalizedData = {
        data: invalidPdf,
        filename: 'invalid.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });

    it('should throw when Pages object has no Count', async () => {
      // Create a PDF-like buffer with Pages object but no Count
      const invalidPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages >>\nendobj\n%%EOF',
      );
      const normalizedData = {
        data: invalidPdf,
        filename: 'invalid.pdf',
      };

      await expect(getPdfPageCount(normalizedData)).rejects.toThrow(ValidationError);
    });
  });

  describe('isValidPdf', () => {
    it('should return true for valid PDF files', async () => {
      // Test with generated PDF
      const validPdf = TestDocumentGenerator.generateSimplePdf('Test content');
      const normalizedValidPdf = await processFileInput(validPdf);
      await expect(isValidPdf(normalizedValidPdf)).resolves.toBe(true);

      // Test with sample PDF
      const normalizedSamplePdf = await processFileInput(samplePDF);
      await expect(isValidPdf(normalizedSamplePdf)).resolves.toBe(true);
    });

    it('should return false for non-PDF files', async () => {
      // Test with non-PDF buffer
      const nonPdfBuffer = Buffer.from('This is not a PDF file');
      const normalizedNonPdfBuffer = await processFileInput(nonPdfBuffer);
      await expect(isValidPdf(normalizedNonPdfBuffer)).resolves.toBe(false);

      // Test with non-PDF Uint8Array
      const nonPdfUint8Array = new TextEncoder().encode('This is not a PDF file');
      const normalizedNonPdfUint8Array = await processFileInput(nonPdfUint8Array);
      await expect(isValidPdf(normalizedNonPdfUint8Array)).resolves.toBe(false);
    });

    it('should handle invalid inputs gracefully', async () => {
      // For this test, we'll create normalized data directly since we're testing error cases
      // that would fail during processFileInput

      // Create a mock ReadableStream that throws an error when read
      const errorStream = new Readable({
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read() {
          this.emit('error', new Error('Read error'));
        },
      });

      const normalizedErrorData = {
        data: errorStream,
        filename: 'error.pdf',
      };

      await expect(isValidPdf(normalizedErrorData)).resolves.toBe(false);
    });

    it('should handle Buffer data', async () => {
      // Valid PDF Buffer
      const validPdfBuffer = Buffer.from(TestDocumentGenerator.generateSimplePdf('Text'));
      const normalizedValidData = {
        data: validPdfBuffer,
        filename: 'valid.pdf',
      };
      await expect(isValidPdf(normalizedValidData)).resolves.toBe(true);

      // Invalid PDF Buffer
      const invalidPdfBuffer = Buffer.from('Not a PDF');
      const normalizedInvalidData = {
        data: invalidPdfBuffer,
        filename: 'invalid.pdf',
      };
      await expect(isValidPdf(normalizedInvalidData)).resolves.toBe(false);
    });

    it('should handle Uint8Array data', async () => {
      // Valid PDF Uint8Array
      const validPdfBuffer = Buffer.from(TestDocumentGenerator.generateSimplePdf('Text'));
      const validUint8Array = new Uint8Array(validPdfBuffer);
      const normalizedValidData = {
        data: validUint8Array,
        filename: 'valid.pdf',
      };
      await expect(isValidPdf(normalizedValidData)).resolves.toBe(true);

      // Invalid PDF Uint8Array
      const invalidUint8Array = new TextEncoder().encode('Not a PDF');
      const normalizedInvalidData = {
        data: invalidUint8Array,
        filename: 'invalid.pdf',
      };
      await expect(isValidPdf(normalizedInvalidData)).resolves.toBe(false);
    });

    it('should handle ReadableStream data', async () => {
      // Valid PDF ReadableStream
      const validPdfBuffer = Buffer.from(TestDocumentGenerator.generateSimplePdf('Text'));
      const validStream = new Readable();
      validStream.push(validPdfBuffer);
      validStream.push(null); // End the stream

      const normalizedValidData = {
        data: validStream,
        filename: 'valid.pdf',
      };
      await expect(isValidPdf(normalizedValidData)).resolves.toBe(true);

      // Invalid PDF ReadableStream
      const invalidStream = new Readable();
      invalidStream.push(Buffer.from('Not a PDF'));
      invalidStream.push(null); // End the stream

      const normalizedInvalidData = {
        data: invalidStream,
        filename: 'invalid.pdf',
      };
      await expect(isValidPdf(normalizedInvalidData)).resolves.toBe(false);
    });

    it('should return false for invalid data types', async () => {
      const normalizedInvalidData = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment
        data: 'not a valid data type' as any,
        filename: 'invalid.pdf',
      };

      await expect(isValidPdf(normalizedInvalidData)).resolves.toBe(false);
    });

    it('should handle errors during processing', async () => {
      // Mock a general error during processing
      jest.spyOn(Buffer.prototype, 'slice').mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const normalizedData = {
        data: Buffer.from('test'),
        filename: 'test.pdf',
      };

      await expect(isValidPdf(normalizedData)).resolves.toBe(false);
    });
  });
});
