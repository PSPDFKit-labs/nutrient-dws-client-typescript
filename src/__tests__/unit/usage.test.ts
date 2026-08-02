import { NutrientClient } from '../../client';
import type { AccountUsage, ProductName } from '../../types';
import { AuthenticationError, ValidationError } from '../../errors';
import * as httpModule from '../../http';

jest.mock('../../http');

const mockSendRequest = httpModule.sendRequest as jest.MockedFunction<
  typeof httpModule.sendRequest
>;

const sampleUsageResponse: AccountUsage = {
  subscription: { type: 'paid', status: 'active' },
  usage: {
    counters: [
      { code: 'credits', unit: 'credits', used: '1234.5', total: '5000' },
      { code: 'pages', unit: 'pages', used: null, total: null },
    ],
  },
};

function makeClient(): NutrientClient {
  return new NutrientClient({ apiKey: 'test-key' });
}

function mockResponse(data: unknown): void {
  mockSendRequest.mockResolvedValue({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
  } as never);
}

describe('NutrientClient.getUsage()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('request shape', () => {
    it('sends exactly one GET request to /account/processor/usage', async () => {
      mockResponse(sampleUsageResponse);

      await makeClient().getUsage('processor');

      expect(mockSendRequest).toHaveBeenCalledTimes(1);
      const call = mockSendRequest.mock.calls[0]?.[0] as {
        method: string;
        endpoint: string;
        data: unknown;
      };
      expect(call.method).toBe('GET');
      expect(call.endpoint).toBe('/account/processor/usage');
      expect(call.data).toBeUndefined();
    });

    const products: ProductName[] = [
      'processor',
      'viewer',
      'signing_workflow',
      'accessibility',
      'data_extraction',
    ];

    it.each(products)('substitutes the product slug for %s', async (product) => {
      mockResponse(sampleUsageResponse);

      await makeClient().getUsage(product);

      const call = mockSendRequest.mock.calls[0]?.[0] as { endpoint: string };
      expect(call.endpoint).toBe(`/account/${product}/usage`);
    });
  });

  describe('response passthrough', () => {
    it('does not coerce counter used/total decimal strings to numbers, and preserves null', async () => {
      mockResponse(sampleUsageResponse);

      const result = await makeClient().getUsage('processor');

      const [creditsCounter, pagesCounter] = result.usage?.counters ?? [];
      expect(typeof creditsCounter?.used).toBe('string');
      expect(creditsCounter?.used).toBe('1234.5');
      expect(typeof creditsCounter?.total).toBe('string');
      expect(creditsCounter?.total).toBe('5000');
      expect(pagesCounter?.used).toBeNull();
      expect(pagesCounter?.total).toBeNull();
    });

    it('resolves without throwing for an empty {} response', async () => {
      mockResponse({});

      await expect(makeClient().getUsage('processor')).resolves.toEqual({});
    });

    it('resolves without throwing for a response with subscription but no usage', async () => {
      const data = { subscription: { type: 'free', status: 'active' } };
      mockResponse(data);

      await expect(makeClient().getUsage('processor')).resolves.toEqual(data);
    });
  });

  describe('error paths', () => {
    it.each([401, 403])('propagates AuthenticationError for a %d response', async (statusCode) => {
      mockSendRequest.mockRejectedValue(
        new AuthenticationError('Invalid API key', undefined, statusCode),
      );

      await expect(makeClient().getUsage('processor')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('propagates a 404 ValidationError with details.error === "unknown_product"', async () => {
      mockSendRequest.mockRejectedValue(
        new ValidationError('unknown_product', { error: 'unknown_product' }, 404),
      );

      await expect(makeClient().getUsage('processor')).rejects.toMatchObject({
        statusCode: 404,
        details: { error: 'unknown_product' },
      });
    });
  });
});

describe('NutrientClient.getAccountInfo() deprecation warning', () => {
  let warnSpy: jest.SpyInstance<void, Parameters<typeof console.warn>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse({ signedIn: true, subscriptionType: 'paid' });
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('warns exactly once for a single call', async () => {
    await makeClient().getAccountInfo();

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns twice for two calls on the same client (no dedupe)', async () => {
    const client = makeClient();

    await client.getAccountInfo();
    await client.getAccountInfo();

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('mentions getUsage in the warning message', async () => {
    await makeClient().getAccountInfo();

    expect(warnSpy.mock.calls[0]?.[0]).toEqual(expect.stringContaining('getUsage'));
  });

  it('does not warn when calling getUsage()', async () => {
    await makeClient().getUsage('processor');

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
