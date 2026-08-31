const requiredEnvironmentVariables = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GEMINI_API_KEY',
  'EMBEDDING_MODEL',
  'FRONTEND_ORIGIN',
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => typeof process.env[name] !== 'string' || !process.env[name].trim()
);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missingEnvironmentVariables.join(', ')}`
  );
}

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

let frontendOrigin;

try {
  const frontendUrl = new URL(process.env.FRONTEND_ORIGIN);

  if (!['http:', 'https:'].includes(frontendUrl.protocol)) {
    throw new Error();
  }

  frontendOrigin = frontendUrl.origin;
} catch (error) {
  throw new Error('FRONTEND_ORIGIN must be a valid HTTP or HTTPS origin.');
}

module.exports = Object.freeze({
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  geminiApiKey: process.env.GEMINI_API_KEY,
  embeddingModel: process.env.EMBEDDING_MODEL,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  frontendOrigin,
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  requestBodyLimit: '1mb',
});
