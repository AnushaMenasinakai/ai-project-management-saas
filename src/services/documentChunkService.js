const chunkText = require('../utils/chunkText');
const { generateEmbedding } = require('./embeddingService');

const prepareDocumentChunks = async (content) => {
  const chunks = chunkText(content);
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
  prepareDocumentChunks,
};
