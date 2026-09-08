const { GoogleGenAI } = require('@google/genai');

const DEFAULT_ATTEMPT_TIMEOUT_MS = 20_000;
const DEFAULT_OPERATION_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_RETRY_DELAY_MS = 5_000;

const ERROR_CODES = Object.freeze({
  QUOTA_EXHAUSTED: 'AI_QUOTA_EXHAUSTED',
  TEMPORARILY_UNAVAILABLE: 'AI_TEMPORARILY_UNAVAILABLE',
  TIMEOUT: 'AI_TIMEOUT',
  CONFIGURATION: 'AI_CONFIGURATION_ERROR',
  INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  GENERIC: 'AI_ERROR',
});

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const TEMPORARY_NETWORK_CODES = new Set([
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

class GeminiReliabilityError extends Error {
  constructor({ code, message, httpStatus, retryAfterSeconds }) {
    super(message);
    this.name = 'GeminiReliabilityError';
    this.code = code;
    this.httpStatus = httpStatus;
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
}

const safeErrorDefinitions = Object.freeze({
  [ERROR_CODES.QUOTA_EXHAUSTED]: {
    message: 'AI usage is temporarily unavailable because the service quota has been reached. Please try again later.',
    httpStatus: 429,
  },
  [ERROR_CODES.TEMPORARILY_UNAVAILABLE]: {
    message: 'The AI service is temporarily unavailable. Please try again.',
    httpStatus: 503,
  },
  [ERROR_CODES.TIMEOUT]: {
    message: 'The AI service took too long to respond. Please try again.',
    httpStatus: 504,
  },
  [ERROR_CODES.CONFIGURATION]: {
    message: 'The AI service is not configured correctly.',
    httpStatus: 503,
  },
  [ERROR_CODES.INVALID_RESPONSE]: {
    message: 'The AI service returned an invalid response. Please try again later.',
    httpStatus: 502,
  },
  [ERROR_CODES.GENERIC]: {
    message: 'The AI request could not be completed.',
    httpStatus: 502,
  },
});

const getStatus = (error) => {
  const candidates = [error?.status, error?.statusCode, error?.error?.code];
  const status = candidates.find((value) => Number.isInteger(Number(value)));
  return status === undefined ? null : Number(status);
};

const parseProviderPayload = (error) => {
  if (error?.error && typeof error.error === 'object') {
    return error.error;
  }
  if (typeof error?.message !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(error.message);
    return parsed && typeof parsed === 'object' ? (parsed.error || parsed) : null;
  } catch (parseError) {
    return null;
  }
};

const collectStructuredStrings = (value, output = [], seen = new Set()) => {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) {
    return output;
  }
  seen.add(value);
  Object.values(value).forEach((item) => collectStructuredStrings(item, output, seen));
  return output;
};

const hasConfirmedQuotaExhaustion = (error) => {
  const payload = parseProviderPayload(error);
  if (!payload) return false;
  const details = Array.isArray(payload.details) ? payload.details : [];
  const quotaDetails = details.filter((detail) => (
    typeof detail === 'object'
    && /QuotaFailure/i.test(String(detail['@type'] || detail.type || ''))
  ));
  return quotaDetails.some((detail) => collectStructuredStrings(detail).some((value) => (
    /(?:per[_\s-]?day|perday|daily)/i.test(value)
  )));
};

const durationToMilliseconds = (value) => {
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)s$/i);
    return match ? Math.round(Number(match[1]) * 1000) : null;
  }
  if (value && typeof value === 'object') {
    const seconds = Number(value.seconds || 0);
    const nanos = Number(value.nanos || 0);
    const milliseconds = (seconds * 1000) + (nanos / 1_000_000);
    return Number.isFinite(milliseconds) && milliseconds >= 0 ? Math.round(milliseconds) : null;
  }
  return null;
};

const extractRetryDelayMs = (error) => {
  const payload = parseProviderPayload(error);
  const details = Array.isArray(payload?.details) ? payload.details : [];
  const retryInfo = details.find((detail) => (
    typeof detail === 'object'
    && /RetryInfo/i.test(String(detail['@type'] || detail.type || ''))
  ));
  return durationToMilliseconds(retryInfo?.retryDelay);
};

const isTimeoutError = (error) => (
  error?.code === 'GEMINI_ATTEMPT_TIMEOUT'
  || error?.code === 'GEMINI_OPERATION_TIMEOUT'
  || error?.name === 'TimeoutError'
  || (error?.name === 'AbortError' && error?.timedOut === true)
);

const getNetworkCode = (error) => {
  const values = [error?.code, error?.cause?.code];
  return values.find((value) => typeof value === 'string') || null;
};

const classifyGeminiError = (error) => {
  if (error instanceof GeminiReliabilityError) {
    return { code: error.code, retryable: false, status: error.httpStatus };
  }
  if (error?.code === ERROR_CODES.INVALID_RESPONSE) {
    return { code: ERROR_CODES.INVALID_RESPONSE, retryable: false, status: null };
  }
  const status = getStatus(error);
  if (status === 429 && hasConfirmedQuotaExhaustion(error)) {
    return { code: ERROR_CODES.QUOTA_EXHAUSTED, retryable: false, status };
  }
  if (isTimeoutError(error)) {
    return { code: ERROR_CODES.TIMEOUT, retryable: true, status };
  }
  if (status === 408) {
    return { code: ERROR_CODES.TIMEOUT, retryable: true, status };
  }
  if (status !== null && RETRYABLE_STATUSES.has(status)) {
    return { code: ERROR_CODES.TEMPORARILY_UNAVAILABLE, retryable: true, status };
  }
  if (TEMPORARY_NETWORK_CODES.has(getNetworkCode(error))) {
    return { code: ERROR_CODES.TEMPORARILY_UNAVAILABLE, retryable: true, status: null };
  }
  if ([400, 401, 403, 404].includes(status)) {
    return { code: ERROR_CODES.CONFIGURATION, retryable: false, status };
  }
  return { code: ERROR_CODES.GENERIC, retryable: false, status };
};

const toSafeError = (classification, retryDelayMs = null) => {
  const definition = safeErrorDefinitions[classification.code] || safeErrorDefinitions[ERROR_CODES.GENERIC];
  return new GeminiReliabilityError({
    code: classification.code,
    message: definition.message,
    httpStatus: definition.httpStatus,
    retryAfterSeconds: retryDelayMs === null ? undefined : Math.ceil(retryDelayMs / 1000),
  });
};

const createGeminiClient = ({ apiKey, attemptTimeoutMs = DEFAULT_ATTEMPT_TIMEOUT_MS } = {}) => (
  new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: attemptTimeoutMs,
      retryOptions: { attempts: 1 },
    },
  })
);

const defaultSleep = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const defaultRunAttempt = (operation, timeoutMs) => new Promise((resolve, reject) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    const error = new Error('Gemini provider attempt timed out.');
    error.code = 'GEMINI_ATTEMPT_TIMEOUT';
    error.timedOut = true;
    controller.abort();
    reject(error);
  }, timeoutMs);
  if (typeof timeout.unref === 'function') timeout.unref();

  Promise.resolve()
    .then(() => operation({ signal: controller.signal }))
    .then(resolve, reject)
    .finally(() => clearTimeout(timeout));
});

const executeGeminiRequest = async ({
  feature,
  model,
  operation,
  logger = console,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  attemptTimeoutMs = DEFAULT_ATTEMPT_TIMEOUT_MS,
  operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
  initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  maxRetryDelayMs = DEFAULT_MAX_RETRY_DELAY_MS,
  now = Date.now,
  random = Math.random,
  sleep = defaultSleep,
  runAttempt = defaultRunAttempt,
} = {}) => {
  if (typeof operation !== 'function') {
    throw new TypeError('Gemini operation must be a function.');
  }
  const attempts = Math.max(1, Math.min(DEFAULT_MAX_ATTEMPTS, Number(maxAttempts) || 1));
  const startedAt = now();

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const remainingBudget = operationTimeoutMs - (now() - startedAt);
    if (remainingBudget <= 0) {
      return Promise.reject(toSafeError({ code: ERROR_CODES.TIMEOUT }));
    }
    try {
      return await runAttempt(operation, Math.min(attemptTimeoutMs, remainingBudget));
    } catch (error) {
      const classification = classifyGeminiError(error);
      const providerDelay = extractRetryDelayMs(error);
      const exponentialDelay = initialDelayMs * (2 ** (attempt - 1));
      const jitteredDelay = Math.round(exponentialDelay * Math.max(0, Math.min(1, random())));
      const requestedDelay = providerDelay === null ? jitteredDelay : providerDelay;
      const retryDelayMs = Math.min(maxRetryDelayMs, Math.max(0, requestedDelay));
      const canRetry = classification.retryable
        && attempt < attempts
        && (now() - startedAt + retryDelayMs) < operationTimeoutMs;

      if (typeof logger?.warn === 'function') {
        logger.warn({
          feature: typeof feature === 'string' ? feature : 'unknown',
          model: typeof model === 'string' ? model : 'unknown',
          code: classification.code,
          providerStatus: classification.status,
          attempt,
          maxAttempts: attempts,
          retryDelayMs: canRetry ? retryDelayMs : null,
          timestamp: new Date(now()).toISOString(),
        });
      }

      if (!canRetry) {
        throw toSafeError(classification, providerDelay);
      }
      await sleep(retryDelayMs);
    }
  }
  throw toSafeError({ code: ERROR_CODES.GENERIC });
};

module.exports = {
  DEFAULT_ATTEMPT_TIMEOUT_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_RETRY_DELAY_MS,
  DEFAULT_OPERATION_TIMEOUT_MS,
  ERROR_CODES,
  GeminiReliabilityError,
  classifyGeminiError,
  createGeminiClient,
  executeGeminiRequest,
  extractRetryDelayMs,
  hasConfirmedQuotaExhaustion,
};
