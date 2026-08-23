const DocumentChunk = require('../models/DocumentChunk');
const { generateEmbedding } = require('./embeddingService');
const cosineSimilarity = require('../utils/cosineSimilarity');

const searchSimilarChunks = async (query, projectId, limit = 5) => {
  if (!query || !query.trim()) {
    throw new Error('Search query is required.');
  }

  const queryEmbedding = await generateEmbedding(query);

  const chunks = await DocumentChunk.find({
    project: projectId,
  });

  const scoredChunks = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, limit);
};

module.exports = {
  searchSimilarChunks,
};