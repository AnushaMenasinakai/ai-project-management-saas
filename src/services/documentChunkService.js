const chunkText = require('../utils/chunkText');
const { generateEmbedding } = require('./embeddingService');

const MAX_DOCUMENT_EMBEDDING_CHUNKS = 25;

class DocumentEmbeddingLimitError extends Error {
  constructor() {
    super(`Document content exceeds the ${MAX_DOCUMENT_EMBEDDING_CHUNKS}-chunk embedding limit.`);
    this.name = 'DocumentEmbeddingLimitError';
    this.code = 'DOCUMENT_EMBEDDING_LIMIT_EXCEEDED';
    this.httpStatus = 413;
  }
}

const prepareDocumentChunks = async (content, { segments } = {}) => {
  const chunks = Array.isArray(segments) && segments.length > 0
    ? segments.flatMap((segment) => chunkText(segment.text).map((chunk) => ({
      content: chunk,
      ...(Number.isInteger(segment.pageNumber) && segment.pageNumber > 0
        ? { pageNumber: segment.pageNumber }
        : {}),
      ...(typeof segment.section === 'string' && segment.section.trim()
        ? { section: segment.section.trim().slice(0, 200) }
        : {}),
    })))
    : chunkText(content).map((chunk) => ({ content: chunk }));
  if (chunks.length > MAX_DOCUMENT_EMBEDDING_CHUNKS) {
    throw new DocumentEmbeddingLimitError();
  }
  const preparedChunks = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const chunkContent = chunk.content;
    const embedding = await generateEmbedding(chunkContent);

    preparedChunks.push({
      content: chunkContent,
      chunkIndex: index,
      embedding,
      ...(chunk.pageNumber ? { pageNumber: chunk.pageNumber } : {}),
      ...(chunk.section ? { section: chunk.section } : {}),
    });
  }

  return preparedChunks;
};

module.exports = {
  DocumentEmbeddingLimitError,
  MAX_DOCUMENT_EMBEDDING_CHUNKS,
  prepareDocumentChunks,
};
