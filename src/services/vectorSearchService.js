const DocumentChunk = require('../models/DocumentChunk');
const { generateEmbedding } = require('./embeddingService');
const cosineSimilarity = require('../utils/cosineSimilarity');

const DEFAULT_CANDIDATE_LIMIT = 8;
const DEFAULT_FINAL_LIMIT = 5;
const DEFAULT_MIN_SCORE = 0.2;
const DEFAULT_CONTEXT_CHAR_BUDGET = 5000;
const DIVERSITY_SCORE_MARGIN = 0.05;
const DUPLICATE_SIMILARITY = 0.85;

const idValue = (value) => String(value?._id || value || '');
const normalizeForComparison = (value) => String(value || '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenSimilarity = (left, right) => {
  const leftTokens = new Set(normalizeForComparison(left).split(' ').filter(Boolean));
  const rightTokens = new Set(normalizeForComparison(right).split(' ').filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  leftTokens.forEach((token) => { if (rightTokens.has(token)) intersection += 1; });
  return intersection / Math.min(leftTokens.size, rightTokens.size);
};

const sourceKey = (item) => `${idValue(item.chunk.document)}:${item.chunk.pageNumber || ''}`;

const removeDuplicateContexts = (ranked) => ranked.filter((candidate, index, all) => (
  all.slice(0, index).every((earlier) => (
    tokenSimilarity(candidate.chunk.content, earlier.chunk.content) < DUPLICATE_SIMILARITY
  ))
));

const selectDiverseContexts = (ranked, { limit, contextCharBudget }) => {
  const remaining = [...ranked];
  const selected = [];
  const usedSources = new Set();
  let usedCharacters = 0;
  while (remaining.length > 0 && selected.length < limit && usedCharacters < contextCharBudget) {
    const bestScore = remaining[0].score;
    const close = remaining.filter((item) => bestScore - item.score <= DIVERSITY_SCORE_MARGIN);
    const next = close.find((item) => !usedSources.has(sourceKey(item))) || remaining[0];
    remaining.splice(remaining.indexOf(next), 1);
    const content = String(next.chunk.content || '').slice(0, contextCharBudget - usedCharacters);
    if (!content) break;
    selected.push({ ...next, context: content });
    usedCharacters += content.length;
    usedSources.add(sourceKey(next));
  }
  return selected;
};

const selectRelevantChunks = (rankedChunks, options = {}) => {
  const limit = options.limit || DEFAULT_FINAL_LIMIT;
  const candidateLimit = options.candidateLimit || DEFAULT_CANDIDATE_LIMIT;
  const minimumScore = options.minimumScore ?? DEFAULT_MIN_SCORE;
  const contextCharBudget = options.contextCharBudget || DEFAULT_CONTEXT_CHAR_BUDGET;
  const ranked = rankedChunks
    .filter((item) => Number.isFinite(item.score) && item.score >= minimumScore)
    .sort((left, right) => right.score - left.score
      || idValue(left.chunk).localeCompare(idValue(right.chunk)))
    .slice(0, candidateLimit);
  return selectDiverseContexts(removeDuplicateContexts(ranked), { limit, contextCharBudget });
};

const searchSimilarChunks = async (query, projectId, options = {}) => {
  if (!query || !query.trim()) throw new Error('Search query is required.');
  const chunks = await DocumentChunk.find({ project: projectId });
  if (chunks.length === 0) return [];
  const queryEmbedding = await generateEmbedding(query);
  return selectRelevantChunks(chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  })), typeof options === 'number' ? { limit: options } : options);
};

module.exports = {
  DEFAULT_CANDIDATE_LIMIT,
  DEFAULT_CONTEXT_CHAR_BUDGET,
  DEFAULT_FINAL_LIMIT,
  DEFAULT_MIN_SCORE,
  searchSimilarChunks,
  selectRelevantChunks,
  tokenSimilarity,
};
