const mockGoogleGenAI = jest.fn((options) => ({ options }));

jest.mock('@google/genai', () => ({ GoogleGenAI: mockGoogleGenAI }));

const {
  DEFAULT_ATTEMPT_TIMEOUT_MS,
  ERROR_CODES,
  GeminiReliabilityError,
  classifyGeminiError,
  createGeminiClient,
  executeGeminiRequest,
  extractRetryDelayMs,
} = require('../src/services/geminiReliabilityService');

const providerError = (status, details = []) => {
  const error = new Error(JSON.stringify({ error: { code: status, status: 'RESOURCE_EXHAUSTED', details } }));
  error.status = status;
  return error;
};

const createHarness = (overrides = {}) => {
  let currentTime = 0;
  const sleep = jest.fn(async (milliseconds) => { currentTime += milliseconds; });
  return {
    feature: 'test_feature',
    model: 'test-model',
    logger: { warn: jest.fn() },
    now: () => currentTime,
    random: () => 1,
    sleep,
    runAttempt: (operation, timeoutMs) => operation({ signal: null, timeoutMs }),
    ...overrides,
  };
};

describe('Gemini reliability service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('configures one SDK attempt and an explicit provider timeout', () => {
    createGeminiClient({ apiKey: 'secret-key' });
    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'secret-key',
      httpOptions: {
        timeout: DEFAULT_ATTEMPT_TIMEOUT_MS,
        retryOptions: { attempts: 1 },
      },
    });
  });

  test('returns a successful request without retrying', async () => {
    const operation = jest.fn().mockResolvedValue('ok');
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(harness.sleep).not.toHaveBeenCalled();
    expect(harness.logger.warn).not.toHaveBeenCalled();
  });

  test.each([429, 500, 503])('retries temporary HTTP %s once', async (status) => {
    const operation = jest.fn()
      .mockRejectedValueOnce(providerError(status))
      .mockResolvedValue('ok');
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(harness.sleep).toHaveBeenCalledTimes(1);
  });

  test('returns a safe temporary error after retry exhaustion', async () => {
    const operation = jest.fn().mockRejectedValue(providerError(503));
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).rejects.toMatchObject({
      name: 'GeminiReliabilityError',
      code: ERROR_CODES.TEMPORARILY_UNAVAILABLE,
      httpStatus: 503,
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('does not retry confirmed daily quota exhaustion', async () => {
    const error = providerError(429, [{
      '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
      violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }],
    }]);
    const operation = jest.fn().mockRejectedValue(error);
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).rejects.toMatchObject({
      code: ERROR_CODES.QUOTA_EXHAUSTED,
      httpStatus: 429,
    });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(harness.sleep).not.toHaveBeenCalled();
  });

  test.each([400, 401])('does not retry provider client/configuration error %s', async (status) => {
    const operation = jest.fn().mockRejectedValue(providerError(status));
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).rejects.toMatchObject({
      code: ERROR_CODES.CONFIGURATION,
      httpStatus: 503,
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('retries only recognized temporary network errors', async () => {
    const networkError = Object.assign(new Error('socket failed'), { code: 'ECONNRESET' });
    const operation = jest.fn().mockRejectedValueOnce(networkError).mockResolvedValue('ok');
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);

    const unknown = jest.fn().mockRejectedValue(new Error('programming failure'));
    await expect(executeGeminiRequest({ ...createHarness(), operation: unknown })).rejects.toMatchObject({
      code: ERROR_CODES.GENERIC,
    });
    expect(unknown).toHaveBeenCalledTimes(1);
  });

  test('retries an attempt timeout and returns a safe timeout after exhaustion', async () => {
    const timeoutError = Object.assign(new Error('timed out'), { code: 'GEMINI_ATTEMPT_TIMEOUT' });
    const operation = jest.fn();
    const harness = createHarness({ runAttempt: jest.fn().mockRejectedValue(timeoutError) });
    await expect(executeGeminiRequest({ ...harness, operation })).rejects.toMatchObject({
      code: ERROR_CODES.TIMEOUT,
      httpStatus: 504,
    });
    expect(harness.runAttempt).toHaveBeenCalledTimes(2);
  });

  test('classifies provider request timeout status as a timeout', async () => {
    const operation = jest.fn().mockRejectedValue(providerError(408));
    await expect(executeGeminiRequest({ ...createHarness(), operation })).rejects.toMatchObject({
      code: ERROR_CODES.TIMEOUT,
      httpStatus: 504,
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('enforces the overall operation budget before another attempt', async () => {
    let currentTime = 0;
    const runAttempt = jest.fn(async () => {
      currentTime += 20_000;
      throw providerError(503);
    });
    const harness = createHarness({ now: () => currentTime, runAttempt, operationTimeoutMs: 20_100 });
    await expect(executeGeminiRequest({ ...harness, operation: jest.fn() })).rejects.toMatchObject({
      code: ERROR_CODES.TEMPORARILY_UNAVAILABLE,
    });
    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(harness.sleep).not.toHaveBeenCalled();
  });

  test('uses and caps structured provider retry delay', async () => {
    const error = providerError(429, [{
      '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '12s',
    }]);
    expect(extractRetryDelayMs(error)).toBe(12_000);
    const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('ok');
    const harness = createHarness();
    await executeGeminiRequest({ ...harness, operation });
    expect(harness.sleep).toHaveBeenCalledWith(5_000);
  });

  test('does not retry invalid AI output', async () => {
    const error = Object.assign(new Error('invalid JSON containing private output'), {
      code: ERROR_CODES.INVALID_RESPONSE,
    });
    const operation = jest.fn().mockRejectedValue(error);
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_RESPONSE,
      httpStatus: 502,
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('returns typed safe errors without raw provider content', async () => {
    const operation = jest.fn().mockRejectedValue(Object.assign(
      new Error('API key secret-key and private prompt'), { status: 401 }
    ));
    const harness = createHarness();
    let caught;
    try {
      await executeGeminiRequest({ ...harness, operation });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GeminiReliabilityError);
    expect(JSON.stringify(caught)).not.toMatch(/secret-key|private prompt/);
    expect(caught.message).toBe('The AI service is not configured correctly.');
  });

  test('logs only normalized fields and never the provider error', async () => {
    const operation = jest.fn().mockRejectedValue(Object.assign(
      new Error('secret-key private prompt document contents'), { status: 400 }
    ));
    const harness = createHarness();
    await expect(executeGeminiRequest({ ...harness, operation })).rejects.toBeDefined();
    expect(harness.logger.warn).toHaveBeenCalledWith({
      feature: 'test_feature', model: 'test-model', code: ERROR_CODES.CONFIGURATION,
      providerStatus: 400, attempt: 1, maxAttempts: 2, retryDelayMs: null,
      timestamp: '1970-01-01T00:00:00.000Z',
    });
    expect(JSON.stringify(harness.logger.warn.mock.calls)).not.toMatch(/secret-key|private prompt|document contents/);
  });

  test('classifies malformed provider errors safely without retrying', () => {
    expect(classifyGeminiError({ unexpected: true })).toEqual({
      code: ERROR_CODES.GENERIC, retryable: false, status: null,
    });
  });
});
