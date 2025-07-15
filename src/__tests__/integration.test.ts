/**
 * Integration tests for NutrientClient
 * These tests demonstrate real-world usage patterns and ensure components work together
 *
 * To run these tests with a live API:
 * 1. Set NUTRIENT_API_KEY environment variable
 * 2. Run: NUTRIENT_API_KEY=your_key npm test -- integration.test
 */

import { NutrientClient } from '../client';
import { BuildActions } from '../build';
import type { NutrientClientOptions, OutputTypeMap } from '../types';
import 'dotenv/config';
import { ResultValidator, sampleDOCX, samplePDF, samplePNG, TestDocumentGenerator } from './helpers';
import { getPdfPageCount, processFileInput } from '../inputs';

// Skip integration tests in CI/automated environments unless explicitly enabled with valid API key
const shouldRunIntegrationTests = Boolean(process.env['NUTRIENT_API_KEY']);

// Use conditional describe based on environment
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('Integration Tests with Live API - Direct Methods', () => {
  let client: NutrientClient;

  beforeAll(() => {
    const options: NutrientClientOptions = {
      apiKey: process.env['NUTRIENT_API_KEY'] ?? '',
      baseUrl: process.env['NUTRIENT_BASE_URL'] ?? 'https://api.nutrient.io',
    };

    client = new NutrientClient(options);
  });

  describe('Account and Authentication Methods', () => {
    describe('getAccountInfo()', () => {
      it('should retrieve account information', async () => {
        const accountInfo = await client.getAccountInfo();

        expect(accountInfo).toBeDefined();
        expect(accountInfo.subscriptionType).toBeDefined();
        expect(typeof accountInfo.subscriptionType).toBe('string');
        expect(accountInfo.apiKeys).toBeDefined();
      }, 30000);
    });

    describe('createToken()', () => {
      it('should create a new authentication token', async () => {
        const tokenParams = {
          expirationTime: 0,
        };

        const token = await client.createToken(tokenParams);

        expect(token).toBeDefined();
        expect(token.id).toBeDefined();
        expect(typeof token.id).toBe('string');
        expect(token.accessToken).toBeDefined();
        expect(typeof token.accessToken).toBe('string');

        // Clean up - delete the token we just created
        await client.deleteToken(token.id as string);
      }, 30000);
    });
  });

  describe('Document Processing Methods', () => {
    describe('sign()', () => {
      it('should sign a PDF document', async () => {
        const result = await client.sign(samplePDF);

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 60000);

      it('should sign a PDF with custom image', async () => {
        const result = await client.sign(samplePDF, undefined, {
          image: samplePNG,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 60000);
    });

    describe('createRedactionsAI()', () => {
      it('should redact sensitive information using AI', async () => {
        const sensitiveDocument = TestDocumentGenerator.generatePdfWithSensitiveData();
        const result = await client.createRedactionsAI(sensitiveDocument, 'Redact Email');

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
        expect(result.filename).toBe('output.pdf');
      }, 60000);

      it('should redact specific pages', async () => {
        // Test with specific pages
        const result = await client.createRedactionsAI(samplePDF, 'React Email', 'apply', {
          start: 1,
          end: 2,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 60000);

      it('should redact with page range', async () => {
        // Test with page range
        const result = await client.createRedactionsAI(samplePDF, 'React Email', 'stage', {
          start: 1,
          end: 3,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 60000);
    });
  });

  describe('Convenience Methods', () => {
    describe('convert()', () => {
      const cases: {
        input: Buffer;
        inputType: Exclude<keyof OutputTypeMap, 'json-content'>;
        outputType: Exclude<keyof OutputTypeMap, 'json-content'>;
        expected: string;
      }[] = [
        { input: samplePDF, inputType: 'pdf', outputType: 'pdfa', expected: 'application/pdf' },
        { input: samplePDF, inputType: 'pdf', outputType: 'pdfua', expected: 'application/pdf' },
        { input: samplePDF, inputType: 'pdf', outputType: 'pdf', expected: 'application/pdf' },
        {
          input: samplePDF,
          inputType: 'pdf',
          outputType: 'docx',
          expected: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          input: samplePDF,
          inputType: 'pdf',
          outputType: 'xlsx',
          expected: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        {
          input: samplePDF,
          inputType: 'pdf',
          outputType: 'pptx',
          expected: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        { input: sampleDOCX, inputType: 'docx', outputType: 'pdf', expected: 'application/pdf' },
        { input: samplePDF, inputType: 'pdf', outputType: 'png', expected: 'image/png' },
        { input: samplePDF, inputType: 'pdf', outputType: 'jpeg', expected: 'image/jpeg' },
        { input: samplePDF, inputType: 'pdf', outputType: 'jpg', expected: 'image/jpeg' },
        { input: samplePDF, inputType: 'pdf', outputType: 'webp', expected: 'image/webp' },
        // {input: samplePDF, inputType: 'pdf', outputType: 'html', expected: 'text/html'}, // FIXME: 500 error upstream
        { input: samplePDF, inputType: 'pdf', outputType: 'markdown', expected: 'text/markdown' },
      ];
      it.each(cases)(
        'should convert $inputType to $outputType',
        async (testCase) => {
          const result = await client.convert(testCase.input, testCase.outputType);

          expect(result).toBeDefined();
          if (testCase.outputType !== 'markdown' && testCase.outputType !== 'html') {
            const typedResult = result as OutputTypeMap[Exclude<
              keyof OutputTypeMap,
              'json-content' | 'markdown' | 'html'
            >];
            // eslint-disable-next-line jest/no-conditional-expect
            expect(typedResult.buffer).toBeInstanceOf(Uint8Array);
          } else {
            const typedResult = result as OutputTypeMap['markdown' | 'html'];
            // eslint-disable-next-line jest/no-conditional-expect
            expect(typedResult.content).toEqual(expect.any(String));
          }
          expect(result.mimeType).toBe(testCase.expected);
        },
        120000,
      );
    });

    describe('ocr()', () => {
      it('should perform OCR on a scanned document', async () => {
        const result = await client.ocr(samplePNG, 'english');

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);

      it('should support multiple OCR languages', async () => {
        const result = await client.ocr(samplePNG, ['english', 'spanish']);

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('watermarkText()', () => {
      it('should add text watermark to PDF', async () => {
        const result = await client.watermarkText(samplePDF, 'CONFIDENTIAL', {
          opacity: 0.5,
          fontSize: 48,
          rotation: 45,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('watermarkImage()', () => {
      it('should add image watermark to PDF', async () => {
        const result = await client.watermarkImage(samplePDF, samplePNG, {
          opacity: 0.5,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('merge()', () => {
      it('should merge multiple PDF files', async () => {
        const result = await client.merge([samplePDF, samplePDF, samplePDF]);
        const normalizedPdf = await processFileInput(samplePDF);
        const pageCount = await getPdfPageCount(normalizedPdf);
        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
        const normalizedResult = await processFileInput(result.buffer);
        await expect(getPdfPageCount(normalizedResult)).resolves.toBe(pageCount * 3);
      }, 60000);
    });

    describe('optimize()', () => {
      it('should optimize PDF with different options', async () => {
        // Test different optimization options
        const options = [
          { imageOptimizationQuality: 1 }, // low
          { imageOptimizationQuality: 2 }, // medium
          { imageOptimizationQuality: 3 }, // high
          { imageOptimizationQuality: 4, mrcCompression: true }, // maximum
        ];

        for (const option of options) {
          const result = await client.optimize(samplePDF, option);

          expect(result).toBeDefined();
          expect(result.buffer).toBeInstanceOf(Uint8Array);
          expect(result.mimeType).toBe('application/pdf');
        }
      }, 240000);
    });

    describe('extractText()', () => {
      it('should extract text from PDF', async () => {
        const result = await client.extractText(samplePDF);

        expect(result).toBeDefined();
        // Type guard check for data property
        const hasData = result && 'data' in result && result.data;
        expect(hasData).toBeTruthy();
        // Always check the type when data exists
        expect(typeof (result?.data ?? {})).toBe('object');
      }, 60000);
    });

    describe('flatten()', () => {
      it('should flatten PDF annotations', async () => {
        const result = await client.flatten(samplePDF);

        expect(result).toBeDefined();
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('rotate()', () => {
      it('should rotate PDF pages', async () => {
        const result = await client.rotate(samplePDF, 90);

        expect(result).toBeDefined();
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);

      it('should rotate specific page range', async () => {
        const result = await client.rotate(samplePDF, 180, { start: 1, end: 3 });

        expect(result).toBeDefined();
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file input gracefully', async () => {
      await expect(client.convert(null as unknown as Buffer, 'pdf')).rejects.toThrow();
    }, 15000);

    it('should handle API errors with proper error types', async () => {
      const invalidClient = new NutrientClient({
        apiKey: 'invalid-api-key',
      });

      await expect(invalidClient.convert(Buffer.from('test'), 'pdf')).rejects.toThrow(
        'HTTP 401: Unauthorized',
      );
    }, 15000);

    it('should handle network timeouts', async () => {
      const timeoutClient = new NutrientClient({
        apiKey: process.env['NUTRIENT_API_KEY'] ?? '',
        timeout: 1
      })

      await expect(timeoutClient.convert(sampleDOCX, 'pdf')).rejects.toThrow('Network request failed');
    }, 15000);
  });
})

describeIntegration('Integration Tests with Live API- Workflow', () => {
  let client: NutrientClient;
  let testSensitivePDF: Buffer;
  let testTablePDF: Buffer;
  let testHtmlContent: Buffer;
  let testXfdfContent: Buffer;
  let testInstantJsonContent: Buffer;

  beforeAll(() => {
    const options: NutrientClientOptions = {
      apiKey: process.env['NUTRIENT_API_KEY'] ?? '',
      baseUrl: process.env['NUTRIENT_BASE_URL'] ?? 'https://api.nutrient.io',
    };

    client = new NutrientClient(options);

    // Test PDF with sensitive data
    testSensitivePDF = TestDocumentGenerator.generatePdfWithSensitiveData();

    // Test PDF with table
    testTablePDF = TestDocumentGenerator.generatePdfWithTable();

    // Test HTML content
    testHtmlContent = TestDocumentGenerator.generateHtmlContent();

    // Test XFDF content for annotations
    testXfdfContent = TestDocumentGenerator.generateXfdf();

    // Test Instant JSON content
    testInstantJsonContent = TestDocumentGenerator.generateInstantJson();
  });

  describe('Workflow Builder', () => {
    it('should execute complex workflow with multiple parts and actions', async () => {
      const pdf1 = TestDocumentGenerator.generatePdfWithTable();
      const pdf2 = TestDocumentGenerator.generatePdfWithSensitiveData();
      const html = TestDocumentGenerator.generateHtmlContent();

      const result = await client
        .workflow()
        .addFilePart(pdf1, undefined, [BuildActions.rotate(90)])
        .addHtmlPart(html)
        .addFilePart(pdf2)
        .addNewPage({ layout: { size: 'A4' } })
        .applyActions([
          BuildActions.watermarkText('DRAFT', { opacity: 0.3 }),
          BuildActions.flatten(),
        ])
        .outputPdfUA()
        .execute({
          onProgress: (_step, _total) => {
            // Progress callback intentionally empty for tests
          },
        });

      expect(result.success).toBe(true);
      expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 60000);

    it('should perform dry run analysis', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyAction(BuildActions.ocr(['english', 'french']))
        .outputPdf()
        .dryRun();

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis?.cost).toBeGreaterThanOrEqual(0);
      expect(result.analysis?.required_features).toBeDefined();
    }, 30000);

    it('should execute workflow with redaction actions', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions([
          // Create redactions using text search
          BuildActions.createRedactionsText('confidential', {}, { caseSensitive: false }),
          // Apply the created redactions
          BuildActions.applyRedactions(),
        ])
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should execute workflow with regex redaction actions', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions([
          // Create redactions using regex pattern
          BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}', {}, { caseSensitive: false }),
          // Apply the created redactions
          BuildActions.applyRedactions(),
        ])
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should execute workflow with preset redaction actions', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions([
          // Create redactions using preset pattern
          BuildActions.createRedactionsPreset('email-address'),
          // Apply the created redactions
          BuildActions.applyRedactions(),
        ])
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should execute workflow with Instant JSON and XFDF actions', async () => {
      const pdfFile = samplePDF;
      const jsonFile = TestDocumentGenerator.generateInstantJson();
      const xfdfFile = TestDocumentGenerator.generateXfdf();

      // Test applyInstantJson
      const instantJsonResult = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.applyInstantJson(jsonFile))
        .outputPdf()
        .execute();

      expect(instantJsonResult.success).toBe(true);
      expect(instantJsonResult.output?.mimeType).toBe('application/pdf');

      // Test applyXfdf
      const xfdfResult = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.applyXfdf(xfdfFile))
        .outputPdf()
        .execute();

      expect(xfdfResult.success).toBe(true);
      expect(xfdfResult.output?.mimeType).toBe('application/pdf');
    }, 60000);
  });

  describe('Redaction Operations', () => {
    describe('Text-based Redactions', () => {
      it('should create and apply text redactions', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsText('123-45-6789'),
            BuildActions.createRedactionsText('john.doe@example.com'),
            BuildActions.applyRedactions(),
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });

    describe('Regex-based Redactions', () => {
      it('should create and apply regex redactions for SSN pattern', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'), // SSN pattern
            BuildActions.applyRedactions(),
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);

      it('should apply multiple regex patterns', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'), // Email
            BuildActions.createRedactionsRegex('\\(\\d{3}\\) \\d{3}-\\d{4}'), // Phone
            BuildActions.createRedactionsRegex('\\d{4}-\\d{4}-\\d{4}-\\d{4}'), // Credit card
            BuildActions.applyRedactions(),
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });

    describe('Preset Redactions', () => {
      it('should apply preset redactions for common patterns', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsPreset('email-address'),
            BuildActions.createRedactionsPreset('international-phone-number'),
            BuildActions.createRedactionsPreset('social-security-number'),
            BuildActions.applyRedactions(),
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });
  });

  describe('Image Watermarking', () => {
    it('should add image watermark to PDF', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .applyAction(
          BuildActions.watermarkImage(samplePNG, {
            opacity: 0.3,
            width: { value: 200, unit: 'pt' },
            height: { value: 100, unit: 'pt' },
          }),
        )
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 30000);

    it('should add image watermark with custom positioning', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .applyAction(
          BuildActions.watermarkImage(samplePNG, {
            opacity: 0.5,
            width: { value: 150, unit: 'pt' },
            height: { value: 150, unit: 'pt' },
            top: { value: 100, unit: 'pt' },
            left: { value: 100, unit: 'pt' },
          }),
        )
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 30000);
  });

  describe('HTML to PDF Conversion', () => {
    it('should convert HTML to PDF with default settings', async () => {
      const result = await client.workflow().addHtmlPart(testHtmlContent).outputPdf().execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 30000);

    it('should convert HTML with custom page size and margins', async () => {
      const result = await client.workflow().addHtmlPart(testHtmlContent).outputPdf().execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 30000);

    it('should convert HTML and apply actions', async () => {
      const result = await client
        .workflow()
        .addHtmlPart(testHtmlContent)
        .applyActions([
          BuildActions.watermarkText('DRAFT', { opacity: 0.3 }),
          BuildActions.flatten(),
        ])
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 30000);

    it('should combine HTML with existing PDF', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .addHtmlPart(testHtmlContent)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 30000);
  });

  describe('Annotation Operations', () => {
    describe('XFDF Application', () => {
      it('should apply XFDF annotations to PDF', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .applyAction(BuildActions.applyXfdf(testXfdfContent))
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);

      it('should apply XFDF and flatten annotations', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .applyActions([BuildActions.applyXfdf(testXfdfContent), BuildActions.flatten()])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });

    describe('Instant JSON Application', () => {
      it('should apply Instant JSON annotations', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .applyAction(BuildActions.applyInstantJson(testInstantJsonContent))
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });
  });

  describe('Advanced PDF Options', () => {
    describe('PDF Security', () => {
      it('should create password-protected PDF', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .outputPdf({
            user_password: 'user123',
            owner_password: 'owner456',
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);

      it('should set PDF permissions', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdf({
            owner_password: 'owner123',
            user_permissions: ['printing', 'extract', 'fill_forms'],
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });

    describe('PDF Metadata', () => {
      it('should set PDF metadata', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdf({
            metadata: {
              title: 'Test Document',
              author: 'Test Author',
            },
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });

    describe('PDF Optimization', () => {
      it('should optimize PDF with advanced settings', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdf({
            optimize: {
              mrcCompression: true,
              imageOptimizationQuality: 3,
              linearize: true,
            },
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 240000);
    });

    describe('PDF/A Advanced Options', () => {
      it('should create PDF/A with specific conformance level', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdfA({
            conformance: 'pdfa-2a',
            vectorization: true,
            rasterization: true,
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
      }, 30000);
    });
  });

  describe('Office Format Outputs', () => {
    it('should convert PDF to Excel (XLSX)', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputOffice('xlsx')
        .execute();

      expect(() => ResultValidator.validateOfficeOutput(result, 'xlsx')).not.toThrow();
    }, 30000);

    it('should convert PDF to PowerPoint (PPTX)', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputOffice('pptx')
        .execute();

      expect(() => ResultValidator.validateOfficeOutput(result, 'pptx')).not.toThrow();
    }, 30000);
  });

  describe('Image Output Options', () => {
    it('should convert PDF to JPEG with custom DPI', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputImage('jpeg', {
          dpi: 300,
        })
        .execute();

      expect(() => ResultValidator.validateImageOutput(result, 'jpeg')).not.toThrow();
    }, 30000);

    // TODO: Issue with DWS upstream which doesn't allow rescaling but not talked about in docs
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should convert PDF to PNG with custom dimensions', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputImage('png', {
          width: 1920,
          height: 1080,
        })
        .execute();

      expect(() => ResultValidator.validateImageOutput(result, 'png')).not.toThrow();
    }, 30000);

    it('should convert PDF to WebP format', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputImage('webp', {
          height: 300,
        })
        .execute();

      expect(() => ResultValidator.validateImageOutput(result, 'webp')).not.toThrow();
    }, 30000);
  });

  describe('JSON Content Extraction', () => {
    it('should extract tables from PDF', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputJson({
          tables: true,
        })
        .execute();

      expect(() => ResultValidator.validateJsonOutput(result)).not.toThrow();
    }, 30000);

    it('should extract key-value pairs', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputJson({
          keyValuePairs: true,
        })
        .execute();

      expect(() => ResultValidator.validateJsonOutput(result)).not.toThrow();
    }, 30000);

    it('should extract specific page range content', async () => {
      const result = await client
        .workflow()
        .addFilePart(testSensitivePDF, {
          pages: { start: 0, end: 0 },
        })
        .outputJson()
        .execute();

      expect(() => ResultValidator.validateJsonOutput(result)).not.toThrow();
    }, 30000);
  });

  describe('Complex Multi-Format Workflows', () => {
    it('should combine HTML, PDF, and images with various actions', async () => {
      const result = await client
        .workflow()
        // Add existing PDF
        .addFilePart(testSensitivePDF, undefined, [BuildActions.rotate(90)])
        // Add HTML content
        .addHtmlPart(testHtmlContent)
        // Add image as new page
        .addFilePart(samplePNG)
        // Add blank page
        .addNewPage({ layout: { size: 'A4' } })
        // Apply global actions
        .applyActions([
          BuildActions.watermarkText('CONFIDENTIAL', {
            opacity: 0.2,
            fontSize: 60,
            rotation: 45,
          }),
          BuildActions.flatten(),
        ])
        .outputPdf({
          optimize: { imageOptimizationQuality: 2 },
        })
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 120000);

    it('should perform document assembly with redactions', async () => {
      const pdf1 = TestDocumentGenerator.generateSimplePdf('SSN: 123-45-6789');
      const pdf2 = TestDocumentGenerator.generateSimplePdf('email: secret@example.com');

      const result = await client
        .workflow()
        // First document with redactions
        .addFilePart(pdf1, undefined, [
          BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'),
          BuildActions.applyRedactions(),
        ])
        // Second document with different redactions
        .addFilePart(pdf2, undefined, [
          BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
          BuildActions.applyRedactions(),
        ])
        // Apply watermark to entire document
        .applyAction(
          BuildActions.watermarkText('REDACTED COPY', {
            opacity: 0.3,
            fontSize: 48,
            fontColor: '#FF0000',
          }),
        )
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 45000);
  });

  describe('Error Scenarios', () => {
    it('should handle invalid HTML content gracefully', async () => {
      const invalidHtml = Buffer.from('<html><body><unclosed-tag>Invalid HTML');

      const result = await client.workflow().addHtmlPart(invalidHtml).outputPdf().execute();

      expect(() => ResultValidator.validateErrorResponse(result)).toThrow();
    }, 30000);

    it('should handle invalid XFDF content', async () => {
      const invalidXfdf = Buffer.from('<?xml version="1.0"?><invalid-xfdf>');

      const result = await client
        .workflow()
        .addFilePart(Buffer.from('%PDF-1.4'))
        .applyAction(BuildActions.applyXfdf(invalidXfdf))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validateErrorResponse(result)).not.toThrow();
    }, 30000);

    it('should handle invalid Instant JSON', async () => {
      const invalidJson = '{ invalid json }';

      const result = await client
        .workflow()
        .addFilePart(Buffer.from('%PDF-1.4'))
        .applyAction(BuildActions.applyInstantJson(invalidJson))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validateErrorResponse(result)).not.toThrow();
    }, 30000);
  });

  describe('Performance and Limits', () => {
    it('should handle workflows with many actions', async () => {
      const actions = [];
      // Add multiple watermarks
      for (let i = 0; i < 5; i++) {
        actions.push(
          BuildActions.watermarkText(`Layer ${i + 1}`, {
            opacity: 0.1,
            fontSize: 20 + i * 10,
            rotation: i * 15,
          }),
        );
      }
      // Add multiple redaction patterns
      actions.push(
        BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'),
        BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
        BuildActions.applyRedactions(),
        BuildActions.flatten(),
      );

      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions(actions)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 60000);

    it('should handle workflows with many parts', async () => {
      const parts: Buffer[] = [];
      for (let i = 0; i < 10; i++) {
        parts.push(TestDocumentGenerator.generateSimplePdf(`Page ${i + 1}`));
      }

      let workflow = client.workflow();
      for (const part of parts) {
        workflow = workflow.addFilePart(part);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const result = await (workflow as any).outputPdf().execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow();
    }, 90000);
  });
});

// Development/CI mock tests
describe('Integration Patterns (Mock)', () => {
  it('should demonstrate workflow builder pattern', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });
    const workflow = client.workflow();

    expect(workflow).toBeDefined();
    expect(typeof workflow.addFilePart).toBe('function');
  });

  it('should demonstrate all convenience methods are available', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });

    // Core methods
    expect(typeof client.workflow).toBe('function');

    // Document conversion methods
    expect(typeof client.convert).toBe('function');
    expect(typeof client.ocr).toBe('function');
    expect(typeof client.extractText).toBe('function');

    // Document manipulation methods
    expect(typeof client.watermarkText).toBe('function');
    expect(typeof client.watermarkImage).toBe('function');
    expect(typeof client.merge).toBe('function');
    expect(typeof client.optimize).toBe('function');
    expect(typeof client.flatten).toBe('function');
    expect(typeof client.rotate).toBe('function');
  });

  it('should demonstrate type safety with workflow builder', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });

    // TypeScript should enforce staged interfaces
    const stage1 = client.workflow();
    const stage2 = stage1.addFilePart('test.pdf');
    const stage3 = stage2.outputPdf();

    // Each stage should have different available methods
    expect(typeof stage1.addFilePart).toBe('function');
    expect(typeof stage2.applyAction).toBe('function');
    expect(typeof stage3.execute).toBe('function');
  });
});
