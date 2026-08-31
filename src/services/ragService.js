const { GoogleGenAI } = require('@google/genai');
const { searchSimilarChunks } = require('./vectorSearchService');
const Document = require('../models/Document');
const config = require('../config/env');

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

const generateRagAnswer = async (question, projectId) => {
  if (!question || !question.trim()) {
    throw new Error('Question is required.');
  }

  const results = await searchSimilarChunks(question, projectId, 3);

  if (results.length === 0) {
    return {
      answer: 'I could not find relevant information in the project documents.',
      sources: [],
    };
  }

  const context = results
    .map(
      (result, index) =>
        `Source ${index + 1}:\n${result.chunk.content}`
    )
    .join('\n\n');

  const prompt = `
You are an AI assistant for a project management application.

Answer the user's question using only the provided project documents.

If the answer cannot be found in the documents, say that you do not have enough information.

Project documents:

${context}

User question:
${question}

Provide a clear and concise answer.
`;

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
  });

  return {
    answer: response.text,
    sources: await Promise.all(
  results.map(async (result) => {
    const document = await Document.findById(result.chunk.document);

    return {
      documentId: document?._id,
      title: document?.title,
      chunkId: result.chunk._id,
      score: result.score,
      content: result.chunk.content,
    };
  })
),
  };
};

module.exports = {
  generateRagAnswer,
};
