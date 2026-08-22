const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const embeddingModel = process.env.EMBEDDING_MODEL;

const generateEmbedding = async (text) => {
  if (!text || !text.trim()) {
    throw new Error('Text is required to generate an embedding.');
  }

  const response = await ai.models.embedContent({
    model: embeddingModel,
    contents: text,
  });

  return response.embeddings[0].values;
};

module.exports = {
  generateEmbedding,
};