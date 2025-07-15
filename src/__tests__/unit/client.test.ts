/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NutrientClient } from '../../client';
import type {
  FileInput,
  NutrientClientOptions,
  OutputTypeMap,
  TypedWorkflowResult,
  UrlInput,
  WorkflowDryRunResult,
  WorkflowExecuteOptions,
  WorkflowInitialStage,
  WorkflowWithOutputStage,
} from '../../types';
import type { components } from '../../generated/api-types';
import { ValidationError } from '../../errors';
import * as workflowModule from '../../workflow';
import * as inputsModule from '../../inputs';
import * as httpModule from '../../http';
import { TestDocumentGenerator } from '../helpers';

// Mock dependencies
jest.mock('../../inputs');
jest.mock('../../http');
jest.mock('../../workflow');

// Mock interfaces for workflow stages
interface MockWorkflowInitialStage extends WorkflowInitialStage {
  addFilePart: jest.MockedFunction<
    (
      file: FileInput,
      options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
  addHtmlPart: jest.MockedFunction<
    (
      html: FileInput,
      assets?: Exclude<FileInput, UrlInput>[],
      options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
  addNewPage: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
  addDocumentPart: jest.MockedFunction<
    (
      documentId: string,
      options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
        layer?: string;
      },
      actions?: components['schemas']['BuildAction'][],
    ) => MockWorkflowWithPartsStage
  >;
}

interface MockWorkflowWithPartsStage extends MockWorkflowInitialStage {
  applyActions: jest.MockedFunction<
    (actions: components['schemas']['BuildAction'][]) => MockWorkflowWithPartsStage
  >;
  applyAction: jest.MockedFunction<
    (action: components['schemas']['BuildAction']) => MockWorkflowWithPartsStage
  >;
  outputPdf: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['PDFOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'pdf'>
  >;
  outputPdfA: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['PDFAOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'pdfa'>
  >;
  outputPdfUA: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['PDFUAOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'pdfua'>
  >;
  outputImage: jest.MockedFunction<
    <T extends 'png' | 'jpg' | 'jpeg' | 'webp'>(
      format: T,
      options?: Omit<components['schemas']['ImageOutput'], 'type' | 'format'>,
    ) => MockWorkflowWithOutputStage<T>
  >;
  outputOffice: jest.MockedFunction<
    <T extends 'docx' | 'xlsx' | 'pptx'>(format: T) => MockWorkflowWithOutputStage<T>
  >;
  outputHtml: jest.MockedFunction<
    (layout: 'page' | 'reflow') => MockWorkflowWithOutputStage<'html'>
  >;
  outputMarkdown: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['MarkdownOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'markdown'>
  >;
  outputJson: jest.MockedFunction<
    (
      options?: Omit<components['schemas']['JSONContentOutput'], 'type'>,
    ) => MockWorkflowWithOutputStage<'json-content'>
  >;
}

interface MockWorkflowWithOutputStage<T extends keyof OutputTypeMap | undefined = undefined>
  extends WorkflowWithOutputStage<T> {
  execute: jest.MockedFunction<
    (options?: WorkflowExecuteOptions) => Promise<TypedWorkflowResult<T>>
  >;
  dryRun: jest.MockedFunction<() => Promise<WorkflowDryRunResult>>;
}

const mockValidateFileInput = inputsModule.validateFileInput as jest.MockedFunction<
  typeof inputsModule.validateFileInput
>;
const mockIsValidPdf = inputsModule.isValidPdf as jest.MockedFunction<
  typeof inputsModule.isValidPdf
>;
const mockGetPdfPageCount = inputsModule.getPdfPageCount as jest.MockedFunction<
  typeof inputsModule.getPdfPageCount
>;
const mockSendRequest = httpModule.sendRequest as jest.MockedFunction<
  typeof httpModule.sendRequest
>;
const mockWorkflow = workflowModule.workflow as jest.MockedFunction<typeof workflowModule.workflow>;

/**
 * Creates a mock workflow instance for testing
 * @param {MockWorkflowWithOutputStage} [customMockOutputStage] - Optional custom mock output stage
 * @returns {MockWorkflowWithPartsStage & MockWorkflowWithOutputStage} The mock workflow instance
 */
function createMockWorkflowInstance(
  customMockOutputStage?: MockWorkflowWithOutputStage,
): MockWorkflowWithPartsStage & MockWorkflowWithOutputStage {
  const mockOutputStage =
    customMockOutputStage ??
    ({
      execute: jest.fn().mockResolvedValue({ success: true, output: { buffer: new Uint8Array() } }),
      dryRun: jest.fn(),
    } as MockWorkflowWithOutputStage);

  const mockWorkflowInstance = {
    addFilePart: jest.fn().mockReturnThis(),
    addHtmlPart: jest.fn().mockReturnThis(),
    addNewPage: jest.fn().mockReturnThis(),
    addDocumentPart: jest.fn().mockReturnThis(),
    applyActions: jest.fn().mockReturnThis(),
    applyAction: jest.fn().mockReturnThis(),
    outputPdf: jest.fn().mockReturnValue(mockOutputStage),
    outputPdfA: jest.fn().mockReturnValue(mockOutputStage),
    outputPdfUA: jest.fn().mockReturnValue(mockOutputStage),
    outputImage: jest.fn().mockReturnValue(mockOutputStage),
    outputOffice: jest.fn().mockReturnValue(mockOutputStage),
    outputHtml: jest.fn().mockReturnValue(mockOutputStage),
    outputMarkdown: jest.fn().mockReturnValue(mockOutputStage),
    outputJson: jest.fn().mockReturnValue(mockOutputStage),
    execute: mockOutputStage.execute,
    dryRun: mockOutputStage.dryRun,
  } as MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

  mockWorkflow.mockReturnValue(mockWorkflowInstance);

  return mockWorkflowInstance;
}

describe('NutrientClient', () => {
  const validOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com/v1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFileInput.mockReturnValue(true);
    mockIsValidPdf.mockResolvedValue(true);
    mockGetPdfPageCount.mockResolvedValue(10);
    mockSendRequest.mockResolvedValue({
      data: TestDocumentGenerator.generateSimplePdf() as never,
      status: 200,
      statusText: 'OK',
      headers: {},
    });
  });

  describe('constructor', () => {
    it('should create client with valid options', () => {
      const client = new NutrientClient(validOptions);
      expect(client).toBeDefined();
    });

    it('should create client with minimal options', () => {
      const client = new NutrientClient({ apiKey: 'test-key' });
      expect(client).toBeDefined();
    });

    it('should create client with async API key function', () => {
      const asyncApiKey = (): Promise<string> => Promise.resolve('async-key');
      const client = new NutrientClient({ apiKey: asyncApiKey });
      expect(client).toBeDefined();
    });

    it('should throw ValidationError for missing options', () => {
      expect(() => new NutrientClient(null as unknown as NutrientClientOptions)).toThrow(
        ValidationError,
      );
      expect(() => new NutrientClient(null as unknown as NutrientClientOptions)).toThrow(
        'Client options are required',
      );
    });

    it('should throw ValidationError for missing API key', () => {
      expect(() => new NutrientClient({} as NutrientClientOptions)).toThrow(ValidationError);
      expect(() => new NutrientClient({} as NutrientClientOptions)).toThrow('API key is required');
    });

    it('should throw ValidationError for invalid API key type', () => {
      expect(() => new NutrientClient({ apiKey: 123 as unknown as string })).toThrow(
        ValidationError,
      );
      expect(() => new NutrientClient({ apiKey: 123 as unknown as string })).toThrow(
        'API key must be a string or a function that returns a Promise<string>',
      );
    });

    it('should throw ValidationError for invalid base URL type', () => {
      expect(
        () =>
          new NutrientClient({
            apiKey: 'test-key',
            baseUrl: 123 as unknown as string,
          }),
      ).toThrow(ValidationError);
      expect(
        () =>
          new NutrientClient({
            apiKey: 'test-key',
            baseUrl: 123 as unknown as string,
          }),
      ).toThrow('Base URL must be a string');
    });
  });

  describe('workflow()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowInitialStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should create workflow instance', () => {
      const workflow = client.workflow();

      expect(mockWorkflow).toHaveBeenCalledWith(validOptions);
      expect(workflow).toBe(mockWorkflowInstance);
    });

    it('should pass client options to workflow', () => {
      const customOptions = { apiKey: 'custom-key', baseUrl: 'https://custom.api.com' };
      const customClient = new NutrientClient(customOptions);

      customClient.workflow();

      expect(mockWorkflow).toHaveBeenCalledWith(customOptions);
    });
  });

  describe('ocr()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should perform OCR with single language and default PDF output', async () => {
      const file = 'test-file.pdf';
      const language = 'english';

      await client.ocr(file, language);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'ocr', language: 'english' },
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should perform OCR with multiple languages', async () => {
      const file = 'test-file.pdf';
      const languages = ['english', 'spanish'] as components['schemas']['OcrLanguage'][];

      await client.ocr(file, languages);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'ocr', language: ['english', 'spanish'] },
      ]);
    });

    it('should perform OCR with default PDF output', async () => {
      const file = 'test-file.pdf';
      const language = 'english';

      await client.ocr(file, language);

      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.outputPdfA).not.toHaveBeenCalled();
    });
  });

  describe('watermark()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should add text watermark with default options', async () => {
      const file = 'test-file.pdf';
      const text = 'CONFIDENTIAL';

      await client.watermarkText(file, text);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'watermark',
          text: 'CONFIDENTIAL',
          width: expect.objectContaining({ value: 100, unit: '%' }),
          height: expect.objectContaining({ value: 100, unit: '%' }),
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
    });

    it('should add text watermark with custom options', async () => {
      const file = 'test-file.pdf';
      const text = 'DRAFT';
      const options = {
        opacity: 0.5,
        fontSize: 24,
        fontColor: '#ff0000',
        rotation: 45,
      };

      await client.watermarkText(file, text, options);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'watermark',
          text: 'DRAFT',
          opacity: 0.5,
          fontSize: 24,
          fontColor: '#ff0000',
          rotation: 45,
        }),
      ]);
    });

    it('should add watermark with default PDF output', async () => {
      const file = 'test-file.pdf';
      const text = 'CONFIDENTIAL';

      await client.watermarkText(file, text);

      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.outputPdfA).not.toHaveBeenCalled();
    });
  });

  describe('watermarkImage()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should add image watermark with default options', async () => {
      const file = 'test-file.pdf';
      const image = 'watermark.png';

      await client.watermarkImage(file, image);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          __needsFileRegistration: true,
          fileInput: 'watermark.png',
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
    });

    it('should add image watermark with custom options', async () => {
      const file = 'test-file.pdf';
      const image = 'watermark.png';
      const options = {
        opacity: 0.5,
        rotation: 45,
      };

      await client.watermarkImage(file, image, options);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          __needsFileRegistration: true,
          fileInput: 'watermark.png',
        }),
      ]);
    });

    it('should add image watermark with default PDF output', async () => {
      const file = 'test-file.pdf';
      const image = 'watermark.png';

      await client.watermarkImage(file, image);

      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.outputPdfA).not.toHaveBeenCalled();
    });
  });

  describe('merge()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should merge multiple files', async () => {
      const files = ['file1.pdf', 'file2.pdf', 'file3.pdf'];

      await client.merge(files);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith('file1.pdf');
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith('file2.pdf');
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith('file3.pdf');
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should throw ValidationError when less than 2 files are provided', async () => {
      const files = ['file1.pdf'];

      await expect(client.merge(files)).rejects.toThrow(ValidationError);
      await expect(client.merge(files)).rejects.toThrow(
        'At least 2 files are required for merge operation',
      );
    });

    it('should throw ValidationError when empty array is provided', async () => {
      const files: FileInput[] = [];

      await expect(client.merge(files)).rejects.toThrow(ValidationError);
      await expect(client.merge(files)).rejects.toThrow(
        'At least 2 files are required for merge operation',
      );
    });
  });

  describe('extractText()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      const mockOutputStage = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          output: {
            data: { text: 'Extracted text content' },
          },
        }),
        dryRun: jest.fn(),
      } as MockWorkflowWithOutputStage;

      mockWorkflowInstance = createMockWorkflowInstance(mockOutputStage);
    });

    it('should extract text from a document', async () => {
      const file = 'test-file.pdf';

      const result = await client.extractText(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined);
      expect(mockWorkflowInstance.outputJson).toHaveBeenCalledWith({
        plainText: true,
        tables: false,
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
      expect(result).toEqual({
        data: { text: 'Extracted text content' },
      });
    });

    it('should extract text from specific pages', async () => {
      const file = 'test-file.pdf';
      const pages = { start: 0, end: 2 };

      await client.extractText(file, pages);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, { pages });
    });
  });

  describe('extractTable()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      const mockOutputStage = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          output: {
            data: { tables: [{ rows: [], columns: [] }] },
          },
        }),
        dryRun: jest.fn(),
      } as MockWorkflowWithOutputStage;

      mockWorkflowInstance = createMockWorkflowInstance(mockOutputStage);
    });

    it('should extract tables from a document', async () => {
      const file = 'test-file.pdf';

      const result = await client.extractTable(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined);
      expect(mockWorkflowInstance.outputJson).toHaveBeenCalledWith({
        plainText: false,
        tables: true,
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
      expect(result).toEqual({
        data: { tables: [{ rows: [], columns: [] }] },
      });
    });

    it('should extract tables from specific pages', async () => {
      const file = 'test-file.pdf';
      const pages = { start: 0, end: 2 };

      await client.extractTable(file, pages);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, { pages });
    });
  });

  describe('extractKeyValuePairs()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      const mockOutputStage = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          output: {
            data: { keyValuePairs: [{ key: 'Name', value: 'John Doe' }] },
          },
        }),
        dryRun: jest.fn(),
      } as MockWorkflowWithOutputStage;

      mockWorkflowInstance = createMockWorkflowInstance(mockOutputStage);
    });

    it('should extract key-value pairs from a document', async () => {
      const file = 'test-file.pdf';

      const result = await client.extractKeyValuePairs(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined);
      expect(mockWorkflowInstance.outputJson).toHaveBeenCalledWith({
        plainText: false,
        tables: false,
        keyValuePairs: true,
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
      expect(result).toEqual({
        data: { keyValuePairs: [{ key: 'Name', value: 'John Doe' }] },
      });
    });

    it('should extract key-value pairs from specific pages', async () => {
      const file = 'test-file.pdf';
      const pages = { start: 0, end: 2 };

      await client.extractKeyValuePairs(file, pages);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, { pages });
    });
  });

  describe('flatten()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should flatten all annotations in a document', async () => {
      const file = 'test-file.pdf';

      await client.flatten(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'flatten' },
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should flatten specific annotations in a document', async () => {
      const file = 'test-file.pdf';
      const annotationIds = ['ann1', 'ann2', 123];

      await client.flatten(file, annotationIds);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'flatten', annotationIds: ['ann1', 'ann2', 123] },
      ]);
    });
  });

  describe('rotate()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should rotate all pages in a document', async () => {
      const file = 'test-file.pdf';
      const angle = 90;

      await client.rotate(file, angle);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'rotate', rotateBy: 90 },
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should rotate specific pages in a document', async () => {
      const file = 'test-file.pdf';
      const angle = 180;
      const pages = { start: 1, end: 3 };

      await client.rotate(file, angle, pages);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, { pages }, [
        { type: 'rotate', rotateBy: 180 },
      ]);
    });
  });

  describe('passwordProtect()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should password protect a document with user and owner passwords', async () => {
      const file = 'test-file.pdf';
      const userPassword = 'user123';
      const ownerPassword = 'owner456';

      await client.passwordProtect(file, userPassword, ownerPassword);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledWith({
        user_password: 'user123',
        owner_password: 'owner456',
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should password protect a document with specific permissions', async () => {
      const file = 'test-file.pdf';
      const userPassword = 'user123';
      const ownerPassword = 'owner456';
      const permissions = [
        'printing',
        'extract_accessibility',
      ] as components['schemas']['PDFUserPermission'][];

      await client.passwordProtect(file, userPassword, ownerPassword, permissions);

      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledWith({
        user_password: 'user123',
        owner_password: 'owner456',
        user_permissions: ['printing', 'extract_accessibility'],
      });
    });
  });

  describe('setMetadata()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should set metadata for a document', async () => {
      const file = 'test-file.pdf';
      const metadata = { title: 'My Document', author: 'John Doe' };

      await client.setMetadata(file, metadata);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledWith({
        metadata: { title: 'My Document', author: 'John Doe' },
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('setPageLabels()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should set page labels for a document', async () => {
      const file = 'test-file.pdf';
      const labels = [
        { pages: [0, 1, 2], label: 'Cover' },
        { pages: [3, 4, 5], label: 'Chapter 1' },
      ];

      await client.setPageLabels(file, labels);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledWith({
        labels: [
          { pages: [0, 1, 2], label: 'Cover' },
          { pages: [3, 4, 5], label: 'Chapter 1' },
        ],
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('applyInstantJson()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should apply Instant JSON to a document', async () => {
      const file = 'test-file.pdf';
      const jsonFile = 'annotations.json';

      await client.applyInstantJson(file, jsonFile);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          __needsFileRegistration: true,
          fileInput: 'annotations.json',
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('applyXfdf()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should apply XFDF to a document with default options', async () => {
      const file = 'test-file.pdf';
      const xfdfFile = 'annotations.xfdf';

      await client.applyXfdf(file, xfdfFile);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          __needsFileRegistration: true,
          fileInput: 'annotations.xfdf',
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should apply XFDF to a document with custom options', async () => {
      const file = 'test-file.pdf';
      const xfdfFile = 'annotations.xfdf';
      const options = {
        ignorePageRotation: true,
        richTextEnabled: false,
      };

      await client.applyXfdf(file, xfdfFile, options);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          __needsFileRegistration: true,
          fileInput: 'annotations.xfdf',
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
    });
  });

  describe('createRedactionsPreset()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should create redactions with preset pattern', async () => {
      const file = 'test-file.pdf';
      const preset = 'email-address';

      await client.createRedactionsPreset(file, preset);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'createRedactions',
          strategy: 'preset',
          strategyOptions: expect.objectContaining({
            preset: 'email-address',
          }),
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should create redactions with preset pattern and options', async () => {
      const file = 'test-file.pdf';
      const preset = 'social-security-number';
      const presetOptions = {
        includeAnnotations: true,
      };

      await client.createRedactionsPreset(
        file,
        preset,
        'stage',
        { start: 0, end: 4 },
        presetOptions,
      );

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'createRedactions',
          strategy: 'preset',
          strategyOptions: expect.objectContaining({
            preset: 'social-security-number',
            includeAnnotations: true,
            start: 0,
            limit: 5,
          }),
        }),
      ]);
    });
  });

  describe('createRedactionsRegex()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should create redactions with regex pattern', async () => {
      const file = 'test-file.pdf';
      const regex = '\\d{3}-\\d{2}-\\d{4}';

      await client.createRedactionsRegex(file, regex);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'createRedactions',
          strategy: 'regex',
          strategyOptions: expect.objectContaining({
            regex: '\\d{3}-\\d{2}-\\d{4}',
          }),
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should create redactions with regex pattern and options', async () => {
      const file = 'test-file.pdf';
      const regex = '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}';
      const regexOptions = {
        caseSensitive: false,
      };

      await client.createRedactionsRegex(file, regex, 'stage', undefined, regexOptions);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'createRedactions',
          strategy: 'regex',
          strategyOptions: expect.objectContaining({
            regex: '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}',
            caseSensitive: false,
          }),
        }),
      ]);
    });
  });

  describe('createRedactionsText()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should create redactions with text search', async () => {
      const file = 'test-file.pdf';
      const text = 'confidential';

      await client.createRedactionsText(file, text);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'createRedactions',
          strategy: 'text',
          strategyOptions: expect.objectContaining({
            text: 'confidential',
          }),
        }),
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should create redactions with text search and options', async () => {
      const file = 'test-file.pdf';
      const text = 'secret';
      const textOptions = {
        caseSensitive: true,
        wholeWord: true,
      };

      await client.createRedactionsText(file, text, 'stage', undefined, textOptions);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        expect.objectContaining({
          type: 'createRedactions',
          strategy: 'text',
          strategyOptions: expect.objectContaining({
            text: 'secret',
            caseSensitive: true,
            wholeWord: true,
          }),
        }),
      ]);
    });
  });

  describe('applyRedactions()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should apply redactions to a document', async () => {
      const file = 'test-file.pdf';

      await client.applyRedactions(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, undefined, [
        { type: 'applyRedactions' },
      ]);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('addPage()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should add a single blank page to a document', async () => {
      const file = 'test-file.pdf';

      await client.addPage(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.addNewPage).toHaveBeenCalledWith({ pageCount: 1 });
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should add multiple blank pages to a document', async () => {
      const file = 'test-file.pdf';
      const count = 3;

      await client.addPage(file, count);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.addNewPage).toHaveBeenCalledWith({ pageCount: 3 });
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should add a blank page at a specific index', async () => {
      const file = 'test-file.pdf';
      const count = 1;
      const index = 2;

      await client.addPage(file, count, index);

      // Mock getPdfPageCount to test index logic
      // This is a simplified test since we can't easily mock the internal implementation
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 1, start: 0 },
      });
      expect(mockWorkflowInstance.addNewPage).toHaveBeenCalled();
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('optimize()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should optimize a document with default options', async () => {
      const file = 'test-file.pdf';

      await client.optimize(file);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledWith({
        optimize: { imageOptimizationQuality: 2 },
      });
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should optimize a document with custom options', async () => {
      const file = 'test-file.pdf';
      const options = { grayscaleText: true, grayscaleGraphics: false };

      await client.optimize(file, options);

      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledWith({
        optimize: { grayscaleText: true, grayscaleGraphics: false },
      });
    });
  });

  describe('split()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should split a PDF into multiple documents', async () => {
      const file = 'test-file.pdf';
      const pageRanges: { start: number; end: number }[] = [
        { start: 0, end: 2 },
        { start: 3, end: 5 },
      ];

      const result = await client.split(file, pageRanges);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 2, start: 0 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 5, start: 3 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledTimes(2);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalledTimes(2);
      expect(mockWorkflowInstance.execute).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('duplicatePages()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should duplicate specific pages in a document', async () => {
      const file = 'test-file.pdf';
      const pageIndices = [0, 2];

      await client.duplicatePages(file, pageIndices);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 0, start: 0 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 2, start: 2 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledTimes(2);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('deletePages()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should delete specific pages from a document', async () => {
      const file = 'test-file.pdf';
      const pageIndices = [3, 1, 1];

      await client.deletePages(file, pageIndices);

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 0, start: 0 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 2, start: 2 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file, {
        pages: { end: 9, start: 4 },
      });
      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledTimes(3);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });
  });

  describe('convert()', () => {
    let client: NutrientClient;
    let mockWorkflowInstance: MockWorkflowWithPartsStage & MockWorkflowWithOutputStage;

    beforeEach(() => {
      client = new NutrientClient(validOptions);
      mockWorkflowInstance = createMockWorkflowInstance();
    });

    it('should convert to PDF', async () => {
      const file = 'test-file.docx';

      await client.convert(file, 'pdf');

      expect(mockWorkflowInstance.addFilePart).toHaveBeenCalledWith(file);
      expect(mockWorkflowInstance.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowInstance.execute).toHaveBeenCalled();
    });

    it('should convert to PDF/A', async () => {
      const file = 'test-file.docx';

      await client.convert(file, 'pdfa');

      expect(mockWorkflowInstance.outputPdfA).toHaveBeenCalled();
    });

    it('should convert to DOCX', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'docx');

      expect(mockWorkflowInstance.outputOffice).toHaveBeenCalledWith('docx');
    });

    it('should convert to XLSX', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'xlsx');

      expect(mockWorkflowInstance.outputOffice).toHaveBeenCalledWith('xlsx');
    });

    it('should convert to PPTX', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'pptx');

      expect(mockWorkflowInstance.outputOffice).toHaveBeenCalledWith('pptx');
    });

    it('should convert to image', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'png');

      expect(mockWorkflowInstance.outputImage).toHaveBeenCalled();
    });

    it('should convert to PDF/UA', async () => {
      const file = 'test-file.docx';

      await client.convert(file, 'pdfua');

      expect(mockWorkflowInstance.outputPdfUA).toHaveBeenCalled();
    });

    it('should convert to HTML', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'html');

      expect(mockWorkflowInstance.outputHtml).toHaveBeenCalled();
    });

    it('should convert to Markdown', async () => {
      const file = 'test-file.pdf';

      await client.convert(file, 'markdown');

      expect(mockWorkflowInstance.outputMarkdown).toHaveBeenCalled();
    });

    it('should throw ValidationError for unsupported format', async () => {
      const file = 'test-file.pdf';

      await expect(
        client.convert(
          file,
          'unsupported' as
            | 'pdf'
            | 'pdfa'
            | 'pdfua'
            | 'png'
            | 'jpeg'
            | 'jpg'
            | 'webp'
            | 'html'
            | 'docx'
            | 'xlsx'
            | 'pptx'
            | 'markdown',
        ),
      ).rejects.toThrow(ValidationError);
      await expect(
        client.convert(
          file,
          'unsupported' as
            | 'pdf'
            | 'pdfa'
            | 'pdfua'
            | 'png'
            | 'jpeg'
            | 'jpg'
            | 'webp'
            | 'html'
            | 'docx'
            | 'xlsx'
            | 'pptx'
            | 'markdown',
        ),
      ).rejects.toThrow('Unsupported target format: unsupported');
    });
  });
});
