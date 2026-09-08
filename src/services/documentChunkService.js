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

const prepareDocumentChunks = async (content) => {
  const chunks = chunkText(content);
  if (chunks.length > MAX_DOCUMENT_EMBEDDING_CHUNKS) {
    throw new DocumentEmbeddingLimitError();
  }
  const preparedChunks = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunkContent = chunks[index];
    const embedding = await generateEmbedding(chunkContent);

    preparedChunks.push({
      content: chunkContent,
      chunkIndex: index,
      embedding,
    });
  }

  return preparedChunks;
};

module.exports = {
  DocumentEmbeddingLimitError,
  MAX_DOCUMENT_EMBEDDING_CHUNKS,
  prepareDocumentChunks,
};
