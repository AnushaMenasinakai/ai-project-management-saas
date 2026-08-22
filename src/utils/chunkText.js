const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

function chunkText(
  text,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
) {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }

  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0.');
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error('overlap must be >= 0 and less than chunkSize.');
  }

  const normalizedText = text.trim();
  const chunks = [];

  let start = 0;

  while (start < normalizedText.length) {
    const end = Math.min(start + chunkSize, normalizedText.length);

    const chunk = normalizedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end === normalizedText.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}

module.exports = chunkText;