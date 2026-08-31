const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

const generateEmbedding = async (text) => {
  if (!text || !text.trim()) {
    throw new Error('Text is required to generate an embedding.');
  }

  const response = await ai.models.embedContent({
    model: config.embeddingModel,
    contents: text,
  });

  return response.embeddings[0].values;
};

module.exports = {
  generateEmbedding,
};
