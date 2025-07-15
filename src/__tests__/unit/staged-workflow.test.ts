import { StagedWorkflowBuilder } from '../../builders';
import { WorkflowBuilder } from '../../builders';
import type { FileInput, NutrientClientOptions, OutputTypeMap } from '../../types';
import type { components } from '../../generated/api-types';

// Mock dependencies
jest.mock('../../builders/workflow');

// Mock interfaces for workflow stages
// @ts-expect-error Mocked type
interface MockWorkflowBuilder<TOutput extends keyof OutputTypeMap | undefined = undefined>
  extends WorkflowBuilder<TOutput> {
  addFilePart: jest.MockedFunction<WorkflowBuilder<TOutput>['addFilePart']>;
  addHtmlPart: jest.MockedFunction<WorkflowBuilder<TOutput>['addHtmlPart']>;
  addNewPage: jest.MockedFunction<WorkflowBuilder<TOutput>['addNewPage']>;
  addDocumentPart: jest.MockedFunction<WorkflowBuilder<TOutput>['addDocumentPart']>;
  applyActions: jest.MockedFunction<WorkflowBuilder<TOutput>['applyActions']>;
  applyAction: jest.MockedFunction<WorkflowBuilder<TOutput>['applyAction']>;
  outputPdf: jest.MockedFunction<WorkflowBuilder<TOutput>['outputPdf']>;
  outputPdfA: jest.MockedFunction<WorkflowBuilder<TOutput>['outputPdfA']>;
  outputPdfUa: jest.MockedFunction<WorkflowBuilder<TOutput>['outputPdfUa']>;
  outputImage: jest.MockedFunction<WorkflowBuilder<TOutput>['outputImage']>;
  outputOffice: jest.MockedFunction<WorkflowBuilder<TOutput>['outputOffice']>;
  outputHtml: jest.MockedFunction<WorkflowBuilder<TOutput>['outputHtml']>;
  outputMarkdown: jest.MockedFunction<WorkflowBuilder<TOutput>['outputMarkdown']>;
  outputJson: jest.MockedFunction<WorkflowBuilder<TOutput>['outputJson']>;
  execute: jest.MockedFunction<WorkflowBuilder<TOutput>['execute']>;
  dryRun: jest.MockedFunction<WorkflowBuilder<TOutput>['dryRun']>;
}

describe('StagedWorkflowBuilder', () => {
  const validOptions: NutrientClientOptions = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com/v1',
  };

  let mockWorkflowBuilder: MockWorkflowBuilder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock WorkflowBuilder
    mockWorkflowBuilder = {
      addFilePart: jest.fn().mockReturnThis(),
      addHtmlPart: jest.fn().mockReturnThis(),
      addNewPage: jest.fn().mockReturnThis(),
      addDocumentPart: jest.fn().mockReturnThis(),
      applyActions: jest.fn().mockReturnThis(),
      applyAction: jest.fn().mockReturnThis(),
      outputPdf: jest.fn().mockReturnThis(),
      outputPdfA: jest.fn().mockReturnThis(),
      outputPdfUa: jest.fn().mockReturnThis(),
      outputImage: jest.fn().mockReturnThis(),
      outputOffice: jest.fn().mockReturnThis(),
      outputHtml: jest.fn().mockReturnThis(),
      outputMarkdown: jest.fn().mockReturnThis(),
      outputJson: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ success: true, output: { buffer: new Uint8Array() } }),
      dryRun: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as MockWorkflowBuilder;

    // Mock the WorkflowBuilder constructor
    (WorkflowBuilder as jest.MockedClass<typeof WorkflowBuilder>).mockImplementation(
      () => mockWorkflowBuilder,
    );
  });

  describe('constructor', () => {
    it('should create a new StagedWorkflowBuilder with valid options', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      expect(builder).toBeDefined();
      expect(WorkflowBuilder).toHaveBeenCalledWith(validOptions);
    });
  });

  describe('part methods', () => {
    it('should delegate addFilePart to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const file: FileInput = 'test-file.pdf';
      const options = { pages: { start: 0, end: 5 } };
      const actions = [
        { type: 'ocr', language: 'english' },
      ] as components['schemas']['BuildAction'][];

      const result = builder.addFilePart(file, options, actions);

      expect(mockWorkflowBuilder.addFilePart).toHaveBeenCalledWith(file, options, actions);
      expect(result).toBe(builder);
    });

    it('should delegate addHtmlPart to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const html: FileInput = Buffer.from('<html><body>Test</body></html>');
      const actions = [
        { type: 'ocr', language: 'english' },
      ] as components['schemas']['BuildAction'][];

      const result = builder.addHtmlPart(html, undefined, undefined, actions);

      expect(mockWorkflowBuilder.addHtmlPart).toHaveBeenCalledWith(
        html,
        undefined,
        undefined,
        actions,
      );
      expect(result).toBe(builder);
    });

    it('should delegate addNewPage to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const options = { pageCount: 2 };
      const actions = [
        { type: 'ocr', language: 'english' },
      ] as components['schemas']['BuildAction'][];

      const result = builder.addNewPage(options, actions);

      expect(mockWorkflowBuilder.addNewPage).toHaveBeenCalledWith(options, actions);
      expect(result).toBe(builder);
    });

    it('should delegate addDocumentPart to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const documentId = 'doc-123';
      const options = { layer: 'layer1' };
      const actions = [
        { type: 'ocr', language: 'english' },
      ] as components['schemas']['BuildAction'][];

      const result = builder.addDocumentPart(documentId, options, actions);

      expect(mockWorkflowBuilder.addDocumentPart).toHaveBeenCalledWith(
        documentId,
        options,
        actions,
      );
      expect(result).toBe(builder);
    });
  });

  describe('action methods', () => {
    it('should delegate applyActions to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const actions = [
        { type: 'ocr', language: 'english' },
        { type: 'flatten' },
      ] as components['schemas']['BuildAction'][];

      const result = builder.applyActions(actions);

      expect(mockWorkflowBuilder.applyActions).toHaveBeenCalledWith(actions);
      expect(result).toBe(builder);
    });

    it('should delegate applyAction to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const action = { type: 'ocr', language: 'english' } as components['schemas']['BuildAction'];

      const result = builder.applyAction(action);

      expect(mockWorkflowBuilder.applyAction).toHaveBeenCalledWith(action);
      expect(result).toBe(builder);
    });
  });

  describe('output methods', () => {
    it('should delegate outputPdf to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const options = { userPassword: 'password' };

      const result = builder.outputPdf(options);

      expect(mockWorkflowBuilder.outputPdf).toHaveBeenCalledWith(options);
      expect(result).toBeDefined();
    });

    it('should delegate outputPdfA to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const options = { conformance: 'pdfa-2b' as const };

      const result = builder.outputPdfA(options);

      expect(mockWorkflowBuilder.outputPdfA).toHaveBeenCalledWith(options);
      expect(result).toBeDefined();
    });

    it('should delegate outputPdfUA to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const options = { metadata: { title: 'Test PDF' } };

      const result = builder.outputPdfUA(options);

      expect(mockWorkflowBuilder.outputPdfUa).toHaveBeenCalledWith(options);
      expect(result).toBeDefined();
    });

    it('should delegate outputImage to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const format = 'png';
      const options = { dpi: 300 };

      const result = builder.outputImage(format, options);

      expect(mockWorkflowBuilder.outputImage).toHaveBeenCalledWith(format, options);
      expect(result).toBeDefined();
    });

    it('should delegate outputOffice to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const format = 'docx';

      const result = builder.outputOffice(format);

      expect(mockWorkflowBuilder.outputOffice).toHaveBeenCalledWith(format);
      expect(result).toBeDefined();
    });

    it('should delegate outputHtml to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);

      const result = builder.outputHtml('reflow');

      expect(mockWorkflowBuilder.outputHtml).toHaveBeenCalledWith('reflow');
      expect(result).toBeDefined();
    });

    it('should delegate outputMarkdown to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);

      const result = builder.outputMarkdown();

      expect(mockWorkflowBuilder.outputMarkdown).toHaveBeenCalledWith();
      expect(result).toBeDefined();
    });

    it('should delegate outputJson to WorkflowBuilder', () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const options = { plainText: true };

      const result = builder.outputJson(options);

      expect(mockWorkflowBuilder.outputJson).toHaveBeenCalledWith(options);
      expect(result).toBeDefined();
    });
  });

  describe('execution methods', () => {
    it('should delegate execute to WorkflowBuilder', async () => {
      const builder = new StagedWorkflowBuilder<'pdf'>(validOptions);
      const expectedResult = {
        success: true,
        output: { buffer: new Uint8Array(), mimeType: 'application/pdf' },
      };
      mockWorkflowBuilder.execute.mockResolvedValue(expectedResult);

      const result = await builder.execute();

      expect(mockWorkflowBuilder.execute).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should delegate dryRun to WorkflowBuilder', async () => {
      const builder = new StagedWorkflowBuilder(validOptions);
      const expectedResult = {
        success: true,
        analysis: { cost: 1.0 },
      };
      mockWorkflowBuilder.dryRun.mockResolvedValue(expectedResult);

      const result = await builder.dryRun();

      expect(mockWorkflowBuilder.dryRun).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('type safety', () => {
    it('should maintain type safety through the builder pattern', () => {
      const builder = new StagedWorkflowBuilder(validOptions);

      // Initial stage
      const withParts = builder.addFilePart('test.pdf');

      // With parts stage
      const withActions = withParts.applyAction({ type: 'flatten' });

      // With output stage
      const withOutput = withActions.outputPdf();

      // Execute
      void withOutput.execute();

      expect(mockWorkflowBuilder.addFilePart).toHaveBeenCalled();
      expect(mockWorkflowBuilder.applyAction).toHaveBeenCalled();
      expect(mockWorkflowBuilder.outputPdf).toHaveBeenCalled();
      expect(mockWorkflowBuilder.execute).toHaveBeenCalled();
    });
  });
});
