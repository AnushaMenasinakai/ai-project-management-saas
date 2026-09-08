const config = require('../config/env');
const {
  createGeminiClient,
  createInvalidResponseError,
  executeGeminiRequest,
} = require('./geminiReliabilityService');

const ai = createGeminiClient({ apiKey: config.geminiApiKey });

const generateEmbedding = async (text) => {
  if (!text || !text.trim()) {
    throw new Error('Text is required to generate an embedding.');
  }

  const response = await executeGeminiRequest({
    feature: 'embedding_generation',
    model: config.embeddingModel,
    operation: ({ signal }) => ai.models.embedContent({
      model: config.embeddingModel,
      contents: text,
      config: { abortSignal: signal },
    }),
  });

  const vector = response?.embeddings?.[0]?.values;
  if (!Array.isArray(vector) || vector.length === 0
    || !vector.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw createInvalidResponseError();
  }

  return vector;
};

module.exports = {
  generateEmbedding,
};
