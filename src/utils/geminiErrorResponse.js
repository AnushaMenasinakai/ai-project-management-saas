const { GeminiReliabilityError } = require('../services/geminiReliabilityService');

const sendGeminiErrorResponse = ({ error, feature, res, logger = console }) => {
  if (!(error instanceof GeminiReliabilityError)) return false;

  if (typeof logger?.warn === 'function') {
    logger.warn({
      feature,
      code: error.code,
      httpStatus: error.httpStatus,
      timestamp: new Date().toISOString(),
    });
  }

  const body = { code: error.code, message: error.message };
  if (Number.isFinite(error.retryAfterSeconds)) {
    body.retryAfterSeconds = error.retryAfterSeconds;
  }
  res.status(error.httpStatus).json(body);
  return true;
};

module.exports = sendGeminiErrorResponse;
