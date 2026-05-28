import { NutrientClient } from '../../client';
import type { ParseResponseMarkdown, ParseResponseSpatial, extractComponents } from '../../types';
import { NutrientError, ValidationError } from '../../errors';

type ParagraphElement = extractComponents['schemas']['ParagraphElement'];
type TableElement = extractComponents['schemas']['TableElement'];
import * as inputsModule from '../../inputs';
import * as httpModule from '../../http';

jest.mock('../../inputs');
jest.mock('../../http');

const mockSendRequest = httpModule.sendRequest as jest.MockedFunction<
  typeof httpModule.sendRequest
>;
const mockProcessFileInput = inputsModule.processFileInput as jest.MockedFunction<
  typeof inputsModule.processFileInput
>;
const mockGetRemoteUrl = inputsModule.getRemoteUrl as jest.MockedFunction<
  typeof inputsModule.getRemoteUrl
>;

const sampleSpatialResponse: ParseResponseSpatial = {
  status: 200,
  requestId: 'req_e5f6g7h8',
  output: {
    elements: [
      {
        id: 'a1b2c3d4-1111-4000-8000-000000000001',
        type: 'paragraph',
        role: 'Title',
        text: 'Quarterly Report',
        confidence: 0.95,
        readingOrder: 0,
        bounds: { x: 200, y: 139, width: 1111, height: 97 },
        page: { pageIndex: 0, pageNumber: 1, width: 1700, height: 2200 },
      } satisfies ParagraphElement,
      {
        id: 'a1b2c3d4-2222-4000-8000-000000000002',
        type: 'table',
        rowCount: 2,
        columnCount: 2,
        cells: [
          {
            id: 'c-001',
            bounds: { x: 100, y: 200, width: 200, height: 50 },
            confidence: 0.92,
            row: 0,
            column: 0,
            rowSpan: 1,
            colSpan: 1,
            text: 'Region',
          },
        ],
        confidence: 0.92,
        readingOrder: 1,
        bounds: { x: 100, y: 200, width: 600, height: 200 },
        page: { pageIndex: 0, pageNumber: 1, width: 1700, height: 2200 },
      } satisfies TableElement,
    ],
  },
  metrics: { processingTimeMs: 4200, pagesProcessed: 1 },
  usage: { data_extraction_credits: { cost: 1.5, remainingCredits: 850 } },
  configuration: { mode: 'structure', outputFormat: 'spatial' },
};

const sampleMarkdownResponse: ParseResponseMarkdown = {
  status: 200,
  requestId: 'req_a1b2c3d4',
  output: { markdown: '# Document Title\n\nFirst paragraph.' },
  metrics: { processingTimeMs: 312, pagesProcessed: 1 },
  usage: { data_extraction_credits: { cost: 1, remainingCredits: 849 } },
  configuration: { mode: 'text', outputFormat: 'markdown' },
};

const normalizedFile = {
  data: Buffer.from('%PDF-1.4 fake'),
  filename: 'doc.pdf',
};

function makeClient(): NutrientClient {
  return new NutrientClient({ apiKey: 'test-key' });
}

describe('NutrientClient.parse()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessFileInput.mockResolvedValue(normalizedFile);
    mockGetRemoteUrl.mockReturnValue(null);
  });

  describe('request shape', () => {
    it('sends a multipart POST to /extraction/parse for a local file', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      await makeClient().parse('document.pdf', { mode: 'structure' });

      expect(mockSendRequest).toHaveBeenCalledTimes(1);
      const call = mockSendRequest.mock.calls[0]?.[0] as {
        method: string;
        endpoint: string;
        data: { instructions: { mode?: string }; file?: unknown };
      };
      expect(call.method).toBe('POST');
      expect(call.endpoint).toBe('/extraction/parse');
      expect(call.data.file).toBe(normalizedFile);
      expect(call.data.instructions).toEqual({ mode: 'structure' });
    });

    it('sends a JSON POST to /extraction/parse for a URL input', async () => {
      mockGetRemoteUrl.mockReturnValue('https://example.com/doc.pdf');
      mockSendRequest.mockResolvedValue({
        data: sampleMarkdownResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      await makeClient().parse('https://example.com/doc.pdf', { mode: 'text' });

      const call = mockSendRequest.mock.calls[0]?.[0] as {
        method: string;
        endpoint: string;
        data: { instructions: { url?: string; mode?: string }; file?: unknown };
      };
      expect(call.endpoint).toBe('/extraction/parse');
      expect(call.data.file).toBeUndefined();
      expect(call.data.instructions).toEqual({
        mode: 'text',
        url: 'https://example.com/doc.pdf',
      });
      expect(mockProcessFileInput).not.toHaveBeenCalled();
    });

    it('forwards the apiVersion option as x-nutrient-api-version', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      await makeClient().parse('document.pdf', {
        mode: 'understand',
        apiVersion: '2026-05-25',
      });

      const call = mockSendRequest.mock.calls[0]?.[0] as {
        headers?: Record<string, string>;
      };
      expect(call.headers).toEqual({ 'x-nutrient-api-version': '2026-05-25' });
    });

    it('serialises language and output options into instructions', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      await makeClient().parse('document.pdf', {
        mode: 'understand',
        output: { format: 'spatial', includeWords: true },
        language: ['eng', 'spa'],
      });

      const call = mockSendRequest.mock.calls[0]?.[0] as {
        data: {
          instructions: {
            mode?: string;
            output?: { format: string; includeWords?: boolean };
            options?: { language?: unknown };
          };
        };
      };
      expect(call.data.instructions).toEqual({
        mode: 'understand',
        output: { format: 'spatial', includeWords: true },
        options: { language: ['eng', 'spa'] },
      });
    });

    it('omits optional fields when not provided', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      await makeClient().parse('document.pdf');

      const call = mockSendRequest.mock.calls[0]?.[0] as {
        data: { instructions: object };
        headers?: Record<string, string>;
      };
      expect(call.data.instructions).toEqual({});
      expect(call.headers).toBeUndefined();
    });
  });

  describe('mode coverage', () => {
    const modes = ['text', 'structure', 'understand', 'agentic'] as const;

    it.each(modes)('serialises mode=%s into instructions', async (mode) => {
      mockSendRequest.mockResolvedValue({
        data:
          mode === 'text'
            ? sampleMarkdownResponse
            : { ...sampleSpatialResponse, configuration: { mode, outputFormat: 'spatial' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const result = await makeClient().parse('document.pdf', { mode });

      const call = mockSendRequest.mock.calls[0]?.[0] as {
        data: { instructions: { mode?: string } };
      };
      expect(call.data.instructions.mode).toBe(mode);
      // The mocked response echoes the configured mode, so result.configuration.mode
      // round-trips correctly for downstream branching.
      expect(result.configuration.mode).toBe(mode);
    });
  });

  describe('output-shape coverage', () => {
    it('returns spatial elements when configuration.outputFormat is spatial', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const result = (await makeClient().parse('document.pdf', {
        mode: 'structure',
        output: { format: 'spatial' },
      })) as ParseResponseSpatial;

      expect(result.configuration.outputFormat).toBe('spatial');
      expect(Array.isArray(result.output.elements)).toBe(true);
      expect(result.output.elements[0]?.type).toBe('paragraph');
    });

    it('returns whole-document Markdown when configuration.outputFormat is markdown', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleMarkdownResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const result = (await makeClient().parse('document.pdf', {
        mode: 'text',
        output: { format: 'markdown' },
      })) as ParseResponseMarkdown;

      expect(result.configuration.outputFormat).toBe('markdown');
      expect(result.output.markdown.startsWith('# ')).toBe(true);
    });

    it('surfaces extraction-credit usage (not processor credits)', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const result = await makeClient().parse('document.pdf');
      // The field name `data_extraction_credits` is the explicit billing-bucket
      // marker so callers cannot confuse it with processor API credits.
      expect(result.usage?.data_extraction_credits?.cost).toBe(1.5);
      expect(result.usage?.data_extraction_credits?.remainingCredits).toBe(850);
    });
  });

  describe('error paths', () => {
    it('propagates ValidationError from the HTTP layer (e.g. 400 invalid mode)', async () => {
      mockSendRequest.mockRejectedValue(
        new ValidationError('The request is malformed', {
          errorDetails: { source: 'request', code: 'invalid_request' },
        }),
      );

      await expect(
        makeClient().parse('document.pdf', { mode: 'understand' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('propagates errors raised by the file input layer', async () => {
      mockProcessFileInput.mockRejectedValue(
        new ValidationError('File not found: missing.pdf', { filePath: 'missing.pdf' }),
      );

      await expect(makeClient().parse('missing.pdf')).rejects.toBeInstanceOf(ValidationError);
      expect(mockSendRequest).not.toHaveBeenCalled();
    });
  });

  describe('Data Extraction API key routing', () => {
    it('routes parse() via extractApiKey when set, leaving apiKey untouched', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const client = new NutrientClient({
        apiKey: 'processor-key',
        extractApiKey: 'extract-key',
      });
      await client.parse('document.pdf');

      const passedOptions = mockSendRequest.mock.calls[0]?.[1];
      expect(passedOptions?.apiKey).toBe('extract-key');
      // Original client options must not be mutated.
      expect(client['options'].apiKey).toBe('processor-key');
      expect(client['options'].extractApiKey).toBe('extract-key');
    });

    it('falls back to apiKey when extractApiKey is not provided', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const client = new NutrientClient({ apiKey: 'processor-key' });
      await client.parse('document.pdf');

      const passedOptions = mockSendRequest.mock.calls[0]?.[1];
      expect(passedOptions?.apiKey).toBe('processor-key');
    });

    it('forwards an extractApiKey getter unchanged so http.ts resolves it lazily', async () => {
      mockSendRequest.mockResolvedValue({
        data: sampleSpatialResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const extractGetter = jest.fn(() => Promise.resolve('lazy-extract-key'));
      const client = new NutrientClient({
        apiKey: 'processor-key',
        extractApiKey: extractGetter,
      });
      await client.parse('document.pdf');

      const passedOptions = mockSendRequest.mock.calls[0]?.[1];
      expect(passedOptions?.apiKey).toBe(extractGetter);
      // The client itself does not invoke the getter — that's http.ts's job.
      expect(extractGetter).not.toHaveBeenCalled();
    });

    it('uses extractApiKey for URL inputs too', async () => {
      mockGetRemoteUrl.mockReturnValue('https://example.com/doc.pdf');
      mockSendRequest.mockResolvedValue({
        data: sampleMarkdownResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      } as never);

      const client = new NutrientClient({
        apiKey: 'processor-key',
        extractApiKey: 'extract-key',
      });
      await client.parse('https://example.com/doc.pdf', { mode: 'text' });

      const passedOptions = mockSendRequest.mock.calls[0]?.[1];
      expect(passedOptions?.apiKey).toBe('extract-key');
    });
  });
});

describe('NutrientClient.parseToMarkdown()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessFileInput.mockResolvedValue(normalizedFile);
    mockGetRemoteUrl.mockReturnValue(null);
  });

  it('returns the markdown string and defaults to mode=text', async () => {
    mockSendRequest.mockResolvedValue({
      data: sampleMarkdownResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
    } as never);

    const md = await makeClient().parseToMarkdown('document.pdf');
    expect(md).toBe('# Document Title\n\nFirst paragraph.');

    const call = mockSendRequest.mock.calls[0]?.[0] as {
      data: { instructions: { mode?: string; output?: { format: string } } };
    };
    expect(call.data.instructions.mode).toBe('text');
    expect(call.data.instructions.output).toEqual({ format: 'markdown' });
  });

  it('throws NutrientError on output mismatch (defensive)', async () => {
    mockSendRequest.mockResolvedValue({
      data: sampleSpatialResponse, // server returned spatial despite our markdown ask
      status: 200,
      statusText: 'OK',
      headers: {},
    } as never);

    await expect(makeClient().parseToMarkdown('document.pdf')).rejects.toBeInstanceOf(
      NutrientError,
    );
  });
});

describe('NutrientClient.parseElements()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessFileInput.mockResolvedValue(normalizedFile);
    mockGetRemoteUrl.mockReturnValue(null);
  });

  it('returns the elements array and defaults to mode=structure', async () => {
    mockSendRequest.mockResolvedValue({
      data: sampleSpatialResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
    } as never);

    const elements = await makeClient().parseElements('document.pdf');
    expect(elements).toHaveLength(2);
    expect(elements[0]?.type).toBe('paragraph');
    expect(elements[1]?.type).toBe('table');

    const call = mockSendRequest.mock.calls[0]?.[0] as {
      data: {
        instructions: { mode?: string; output?: { format: string; includeWords?: boolean } };
      };
    };
    expect(call.data.instructions.mode).toBe('structure');
    expect(call.data.instructions.output).toEqual({ format: 'spatial', includeWords: false });
  });

  it('forwards includeWords=true into the request', async () => {
    mockSendRequest.mockResolvedValue({
      data: sampleSpatialResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
    } as never);

    await makeClient().parseElements('document.pdf', 'understand', true);

    const call = mockSendRequest.mock.calls[0]?.[0] as {
      data: { instructions: { output?: { includeWords?: boolean } } };
    };
    expect(call.data.instructions.output?.includeWords).toBe(true);
  });

  it('throws NutrientError when the server returned markdown instead of spatial', async () => {
    mockSendRequest.mockResolvedValue({
      data: sampleMarkdownResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
    } as never);

    await expect(makeClient().parseElements('document.pdf')).rejects.toBeInstanceOf(NutrientError);
  });
});
