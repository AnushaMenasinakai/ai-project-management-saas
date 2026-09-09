jest.mock('../src/models/DocumentChunk', () => ({ find: jest.fn() }));
jest.mock('../src/services/embeddingService', () => ({ generateEmbedding: jest.fn() }));

const chunkText = require('../src/utils/chunkText');
const { prepareDocumentChunks } = require('../src/services/documentChunkService');
const { generateEmbedding } = require('../src/services/embeddingService');
const {
  DEFAULT_MIN_SCORE,
  selectRelevantChunks,
  tokenSimilarity,
} = require('../src/services/vectorSearchService');
const { validateCitations } = require('../src/utils/ragSources');

const candidate = (id, document, score, content, pageNumber) => ({
  score,
  chunk: { _id: id, document, content, ...(pageNumber ? { pageNumber } : {}) },
});

describe('structure-aware document chunking', () => {
  test('prefers paragraph and sentence boundaries within the hard limit', () => {
    const text = `${'First paragraph sentence. '.repeat(4)}\n\n${'Second paragraph sentence. '.repeat(4)}`;
    const chunks = chunkText(text, 120, 20);
    expect(chunks.every((chunk) => chunk.length <= 120)).toBe(true);
    expect(chunks[0]).toMatch(/sentence\.$/);
    expect(chunks.join(' ')).toContain('Second paragraph sentence.');
  });

  test('falls back to a hard boundary with overlap and guaranteed progress', () => {
    const text = 'x'.repeat(275);
    const chunks = chunkText(text, 100, 20);
    expect(chunks).toHaveLength(4);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
    expect(chunks.at(-1).endsWith('x')).toBe(true);
  });

  test('retains all words from the input content', () => {
    const words = Array.from({ length: 80 }, (_, index) => `word${index}`);
    const chunks = chunkText(words.join(' '), 90, 15);
    words.forEach((word) => expect(chunks.join(' ')).toContain(word));
  });

  test('keeps PDF page chunks separate and leaves ordinary chunks compatible', async () => {
    generateEmbedding.mockResolvedValue([1, 0]);
    const paged = await prepareDocumentChunks('page one\npage two', {
      segments: [
        { pageNumber: 1, text: 'page one' },
        { pageNumber: 2, text: 'page two' },
      ],
    });
    expect(paged).toEqual([
      { content: 'page one', chunkIndex: 0, embedding: [1, 0], pageNumber: 1 },
      { content: 'page two', chunkIndex: 1, embedding: [1, 0], pageNumber: 2 },
    ]);
    await expect(prepareDocumentChunks('legacy text')).resolves.toEqual([
      { content: 'legacy text', chunkIndex: 0, embedding: [1, 0] },
    ]);
  });
});

describe('bounded retrieval selection', () => {
  test('applies the relevance threshold and ranks deterministically', () => {
    const selected = selectRelevantChunks([
      candidate('low', 'doc-a', DEFAULT_MIN_SCORE - 0.01, 'weak evidence'),
      candidate('b', 'doc-b', 0.8, 'second evidence'),
      candidate('a', 'doc-a', 0.9, 'best evidence'),
    ]);
    expect(selected.map((item) => item.chunk._id)).toEqual(['a', 'b']);
  });

  test('removes near-identical overlap and prefers diverse sources at close scores', () => {
    expect(tokenSimilarity('alpha beta gamma delta', 'alpha beta gamma delta extra')).toBeGreaterThan(0.85);
    const selected = selectRelevantChunks([
      candidate('a1', 'doc-a', 0.95, 'alpha beta gamma delta'),
      candidate('a2', 'doc-a', 0.94, 'alpha beta gamma delta extra'),
      candidate('a3', 'doc-a', 0.92, 'one project detail'),
      candidate('b1', 'doc-b', 0.91, 'another project fact'),
    ], { limit: 3 });
    expect(selected.map((item) => item.chunk._id)).toEqual(['a1', 'b1', 'a3']);
  });

  test('enforces final count and total context-size budgets', () => {
    const selected = selectRelevantChunks([
      candidate('a', 'doc-a', 0.9, 'a'.repeat(80)),
      candidate('b', 'doc-b', 0.8, 'b'.repeat(80)),
      candidate('c', 'doc-c', 0.7, 'c'.repeat(80)),
    ], { limit: 2, contextCharBudget: 100 });
    expect(selected).toHaveLength(2);
    expect(selected.reduce((total, item) => total + item.context.length, 0)).toBe(100);
  });

  test('rejects invented source identifiers but accepts selected identifiers', () => {
    expect(() => validateCitations('Supported by [S1].', new Set(['S1']))).not.toThrow();
    expect(() => validateCitations('Unsupported [S9].', new Set(['S1']))).toThrow(expect.objectContaining({
      code: 'AI_INVALID_RESPONSE',
    }));
  });
});
