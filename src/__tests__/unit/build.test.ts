import { BuildActions, BuildOutputs } from '../../build';
import type { components } from '../../generated/api-types';
import type { FileInput } from '../../types';

describe('BuildActions', () => {
  describe('ocr()', () => {
    it('should create OCR action with single language', () => {
      const action = BuildActions.ocr('english');

      expect(action).toEqual({
        type: 'ocr',
        language: 'english',
      });
    });

    it('should create OCR action with multiple languages', () => {
      const languages: components['schemas']['OcrLanguage'][] = ['english', 'spanish'];
      const action = BuildActions.ocr(languages);

      expect(action).toEqual({
        type: 'ocr',
        language: ['english', 'spanish'],
      });
    });
  });

  describe('rotate()', () => {
    it('should create rotation action for 90 degrees', () => {
      const action = BuildActions.rotate(90);

      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 90,
      });
    });

    it('should create rotation action for 180 degrees', () => {
      const action = BuildActions.rotate(180);

      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 180,
      });
    });

    it('should create rotation action for 270 degrees', () => {
      const action = BuildActions.rotate(270);

      expect(action).toEqual({
        type: 'rotate',
        rotateBy: 270,
      });
    });
  });

  describe('watermarkText()', () => {
    const defaultDimensions = {
      width: { value: 100, unit: '%' as const },
      height: { value: 100, unit: '%' as const },
    };

    it('should create text watermark action with minimal options', () => {
      const action = BuildActions.watermarkText('CONFIDENTIAL', defaultDimensions);

      expect(action).toEqual({
        type: 'watermark',
        text: 'CONFIDENTIAL',
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        rotation: 0,
      });
    });

    it('should create text watermark action with all options', () => {
      const options = {
        ...defaultDimensions,
        opacity: 0.5,
        rotation: 45,
        fontSize: 24,
        fontColor: '#ff0000',
        fontFamily: 'Arial',
        fontStyle: ['bold', 'italic'] as ('bold' | 'italic')[],
        top: { value: 10, unit: 'pt' as const },
        left: { value: 20, unit: 'pt' as const },
        right: { value: 30, unit: 'pt' as const },
        bottom: { value: 40, unit: 'pt' as const },
      };

      const action = BuildActions.watermarkText('DRAFT', options);

      expect(action).toEqual({
        type: 'watermark',
        text: 'DRAFT',
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        opacity: 0.5,
        rotation: 45,
        fontSize: 24,
        fontColor: '#ff0000',
        fontFamily: 'Arial',
        fontStyle: ['bold', 'italic'],
        top: { value: 10, unit: 'pt' },
        left: { value: 20, unit: 'pt' },
        right: { value: 30, unit: 'pt' },
        bottom: { value: 40, unit: 'pt' },
      });
    });
  });

  describe('watermarkImage()', () => {
    const defaultDimensions = {
      width: { value: 100, unit: '%' as const },
      height: { value: 100, unit: '%' as const },
    };

    it('should create image watermark action with minimal options', () => {
      const image = 'logo.png';
      const action = BuildActions.watermarkImage(image, defaultDimensions);

      expect(action.__needsFileRegistration).toBe(true);
      expect(action.fileInput).toBe('logo.png');
      expect(action.createAction('asset_0')).toEqual({
        type: 'watermark',
        image: 'asset_0',
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        rotation: 0,
      });
    });

    it('should create image watermark action with all options', () => {
      const image = 'watermark.png';
      const options = {
        ...defaultDimensions,
        opacity: 0.3,
        rotation: 30,
        top: { value: 10, unit: 'pt' as const },
        left: { value: 20, unit: 'pt' as const },
        right: { value: 30, unit: 'pt' as const },
        bottom: { value: 40, unit: 'pt' as const },
      };

      const action = BuildActions.watermarkImage(image, options);

      expect(action.__needsFileRegistration).toBe(true);
      expect(action.fileInput).toBe('watermark.png');
      expect(action.createAction('asset_0')).toEqual({
        type: 'watermark',
        image: 'asset_0',
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        opacity: 0.3,
        rotation: 30,
        top: { value: 10, unit: 'pt' },
        left: { value: 20, unit: 'pt' },
        right: { value: 30, unit: 'pt' },
        bottom: { value: 40, unit: 'pt' },
      });
    });
  });

  describe('flatten()', () => {
    it('should create flatten action without annotation IDs', () => {
      const action = BuildActions.flatten();

      expect(action).toEqual({
        type: 'flatten',
      });
    });

    it('should create flatten action with annotation IDs', () => {
      const annotationIds = ['ann1', 'ann2', 123];
      const action = BuildActions.flatten(annotationIds);

      expect(action).toEqual({
        type: 'flatten',
        annotationIds: ['ann1', 'ann2', 123],
      });
    });
  });

  describe('applyInstantJson()', () => {
    it('should create apply Instant JSON action with file registration', () => {
      const file: FileInput = 'annotations.json';
      const action = BuildActions.applyInstantJson(file);

      expect(action.__needsFileRegistration).toBe(true);
      expect(action.fileInput).toBe('annotations.json');
      expect(action.createAction('asset_0')).toEqual({
        type: 'applyInstantJson',
        file: 'asset_0',
      });
    });
  });

  describe('applyXfdf()', () => {
    it('should create apply XFDF action with file registration', () => {
      const file: FileInput = 'annotations.xfdf';
      const action = BuildActions.applyXfdf(file);

      expect(action.__needsFileRegistration).toBe(true);
      expect(action.fileInput).toBe('annotations.xfdf');
      expect(action.createAction('asset_1')).toEqual({
        type: 'applyXfdf',
        file: 'asset_1',
      });
    });
  });

  describe('applyRedactions()', () => {
    it('should create apply redactions action', () => {
      const action = BuildActions.applyRedactions();

      expect(action).toEqual({
        type: 'applyRedactions',
      });
    });
  });

  describe('createRedactionsText()', () => {
    it('should create text redactions action with minimal options', () => {
      const text = 'confidential';
      const action = BuildActions.createRedactionsText(text);

      expect(action).toEqual({
        type: 'createRedactions',
        strategy: 'text',
        strategyOptions: {
          text: 'confidential',
        },
      });
    });

    it('should create text redactions action with all options', () => {
      const text = 'secret';
      const options = {};
      const strategyOptions = {
        caseSensitive: true,
        wholeWord: true,
      };

      const action = BuildActions.createRedactionsText(text, options, strategyOptions);

      expect(action).toEqual({
        type: 'createRedactions',
        strategy: 'text',
        strategyOptions: {
          text: 'secret',
          caseSensitive: true,
          wholeWord: true,
        },
      });
    });
  });

  describe('createRedactionsRegex()', () => {
    it('should create regex redactions action with minimal options', () => {
      const regex = '\\d{3}-\\d{2}-\\d{4}';
      const action = BuildActions.createRedactionsRegex(regex);

      expect(action).toEqual({
        type: 'createRedactions',
        strategy: 'regex',
        strategyOptions: {
          regex: '\\d{3}-\\d{2}-\\d{4}',
        },
      });
    });

    it('should create regex redactions action with all options', () => {
      const regex = '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}';
      const options = {};
      const strategyOptions = {
        caseSensitive: false,
      };

      const action = BuildActions.createRedactionsRegex(regex, options, strategyOptions);

      expect(action).toEqual({
        type: 'createRedactions',
        strategy: 'regex',
        strategyOptions: {
          regex: '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}',
          caseSensitive: false,
        },
      });
    });
  });

  describe('createRedactionsPreset()', () => {
    it('should create preset redactions action with minimal options', () => {
      const preset = 'date';
      const action = BuildActions.createRedactionsPreset(preset);

      expect(action).toEqual({
        type: 'createRedactions',
        strategy: 'preset',
        strategyOptions: {
          preset: 'date',
        },
      });
    });

    it('should create preset redactions action with all options', () => {
      const preset = 'email-address';
      const options = {};
      const strategyOptions = {
        start: 1,
      };

      const action = BuildActions.createRedactionsPreset(preset, options, strategyOptions);

      expect(action).toEqual({
        type: 'createRedactions',
        strategy: 'preset',
        strategyOptions: {
          preset: 'email-address',
          start: 1,
        },
      });
    });
  });
});

describe('BuildOutputs', () => {
  describe('pdf()', () => {
    it('should create PDF output with no options', () => {
      const output = BuildOutputs.pdf();

      expect(output).toEqual({
        type: 'pdf',
      });
    });

    it('should create PDF output with all options', () => {
      const options = {
        metadata: { title: 'Test Document' },
        labels: [{ pages: [0], label: 'Page I-III' }],
        userPassword: 'user123',
        ownerPassword: 'owner123',
        userPermissions: ['print'] as string[] as components['schemas']['PDFUserPermission'][],
        optimize: { print: true } as components['schemas']['OptimizePdf'],
      };

      const output = BuildOutputs.pdf(options);

      expect(output).toEqual({
        type: 'pdf',
        metadata: { title: 'Test Document' },
        labels: [{ pages: [0], label: 'Page I-III' }],
        user_password: 'user123',
        owner_password: 'owner123',
        user_permissions: ['print'],
        optimize: { print: true },
      });
    });
  });

  describe('pdfa()', () => {
    it('should create PDF/A output with no options', () => {
      const output = BuildOutputs.pdfa();

      expect(output).toEqual({
        type: 'pdfa',
      });
    });

    it('should create PDF/A output with all options', () => {
      const options = {
        conformance: 'pdfa-1b' as const,
        vectorization: true,
        rasterization: false,
        metadata: { title: 'Test Document' },
        userPassword: 'user123',
        ownerPassword: 'owner123',
      };

      const output = BuildOutputs.pdfa(options);

      expect(output).toEqual({
        type: 'pdfa',
        conformance: 'pdfa-1b',
        vectorization: true,
        rasterization: false,
        metadata: { title: 'Test Document' },
        user_password: 'user123',
        owner_password: 'owner123',
      });
    });
  });

  describe('image()', () => {
    it('should create image output with default options', () => {
      const output = BuildOutputs.image('png');

      expect(output).toEqual({
        type: 'image',
        format: 'png',
      });
    });

    it('should create image output with custom options', () => {
      const options = {
        dpi: 300,
        pages: { start: 1, end: 5 },
      };

      const output = BuildOutputs.image('png', options);

      expect(output).toEqual({
        type: 'image',
        format: 'png',
        dpi: 300,
        pages: { start: 1, end: 5 },
      });
    });
  });

  describe('pdfua()', () => {
    it('should create PDF/UA output with no options', () => {
      const output = BuildOutputs.pdfua();

      expect(output).toEqual({
        type: 'pdfua',
      });
    });

    it('should create PDF/UA output with all options', () => {
      const options = {
        metadata: { title: 'Accessible Document' },
        labels: [{ pages: [0], label: 'Cover Page' }],
        userPassword: 'user123',
        ownerPassword: 'owner123',
        userPermissions: ['print'] as string[] as components['schemas']['PDFUserPermission'][],
        optimize: { print: true } as components['schemas']['OptimizePdf'],
      };

      const output = BuildOutputs.pdfua(options);

      expect(output).toEqual({
        type: 'pdfua',
        metadata: { title: 'Accessible Document' },
        labels: [{ pages: [0], label: 'Cover Page' }],
        user_password: 'user123',
        owner_password: 'owner123',
        user_permissions: ['print'],
        optimize: { print: true },
      });
    });
  });

  describe('jsonContent()', () => {
    it('should create JSON content output with default options', () => {
      const output = BuildOutputs.jsonContent();

      expect(output).toEqual({
        type: 'json-content',
      });
    });

    it('should create JSON content output with custom options', () => {
      const options = {
        plainText: false,
        structuredText: true,
        keyValuePairs: true,
        tables: false,
        language: 'english' as const,
      };

      const output = BuildOutputs.jsonContent(options);

      expect(output).toEqual({
        type: 'json-content',
        plainText: false,
        structuredText: true,
        keyValuePairs: true,
        tables: false,
        language: 'english',
      });
    });
  });

  describe('office()', () => {
    it('should create DOCX output', () => {
      const output = BuildOutputs.office('docx');

      expect(output).toEqual({
        type: 'docx',
      });
    });

    it('should create XLSX output', () => {
      const output = BuildOutputs.office('xlsx');

      expect(output).toEqual({
        type: 'xlsx',
      });
    });

    it('should create PPTX output', () => {
      const output = BuildOutputs.office('pptx');

      expect(output).toEqual({
        type: 'pptx',
      });
    });
  });

  describe('html()', () => {
    it('should create HTML output with page layout', () => {
      const output = BuildOutputs.html('page');

      expect(output).toEqual({
        type: 'html',
        layout: 'page',
      });
    });

    it('should create HTML output with reflow layout', () => {
      const output = BuildOutputs.html('reflow');

      expect(output).toEqual({
        type: 'html',
        layout: 'reflow',
      });
    });
  });

  describe('markdown()', () => {
    it('should create Markdown output', () => {
      const output = BuildOutputs.markdown();

      expect(output).toEqual({
        type: 'markdown',
      });
    });
  });

  describe('getMimeTypeForOutput()', () => {
    it('should return correct MIME type for PDF output', () => {
      const output = BuildOutputs.pdf();
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/pdf',
        filename: 'output.pdf',
      });
    });

    it('should return correct MIME type for PDF/A output', () => {
      const output = BuildOutputs.pdfa();
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/pdf',
        filename: 'output.pdf',
      });
    });

    it('should return correct MIME type for PDF/UA output', () => {
      const output = BuildOutputs.pdfua();
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/pdf',
        filename: 'output.pdf',
      });
    });

    it('should return correct MIME type for image output with custom format', () => {
      const output = BuildOutputs.image('jpeg');
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'image/jpeg',
        filename: 'output.jpeg',
      });
    });

    it('should return correct MIME type for DOCX output', () => {
      const output = BuildOutputs.office('docx');
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: 'output.docx',
      });
    });

    it('should return correct MIME type for XLSX output', () => {
      const output = BuildOutputs.office('xlsx');
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'output.xlsx',
      });
    });

    it('should return correct MIME type for PPTX output', () => {
      const output = BuildOutputs.office('pptx');
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        filename: 'output.pptx',
      });
    });

    it('should return correct MIME type for HTML output', () => {
      const output = BuildOutputs.html('page');
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'text/html',
        filename: 'output.html',
      });
    });

    it('should return correct MIME type for Markdown output', () => {
      const output = BuildOutputs.markdown();
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'text/markdown',
        filename: 'output.md',
      });
    });

    it('should return default MIME type for unknown output', () => {
      const output = { type: 'unknown' } as unknown as components['schemas']['BuildOutput'];
      // @ts-expect-error Expect type error in this test
      const result = BuildOutputs.getMimeTypeForOutput(output);

      expect(result).toEqual({
        mimeType: 'application/octet-stream',
        filename: 'output',
      });
    });
  });
});
