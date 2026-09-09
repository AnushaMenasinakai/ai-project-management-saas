const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const MIN_BOUNDARY_RATIO = 0.6;

const findPreferredBoundary = (text, start, hardEnd, chunkSize) => {
  if (hardEnd >= text.length) return text.length;
  const minimumOffset = Math.floor(chunkSize * MIN_BOUNDARY_RATIO);
  const window = text.slice(start, hardEnd);
  const paragraph = window.lastIndexOf('\n\n');
  if (paragraph >= minimumOffset) return start + paragraph + 2;
  const line = window.lastIndexOf('\n');
  if (line >= minimumOffset) return start + line + 1;

  const sentencePattern = /[.!?](?:["')\]]*)\s+/g;
  let sentenceBoundary = -1;
  let sentenceMatch;
  while ((sentenceMatch = sentencePattern.exec(window)) !== null) {
    const boundary = sentenceMatch.index + sentenceMatch[0].length;
    if (boundary >= minimumOffset) sentenceBoundary = boundary;
  }
  if (sentenceBoundary >= 0) return start + sentenceBoundary;

  const space = window.lastIndexOf(' ');
  if (space >= minimumOffset) return start + space + 1;
  return hardEnd;
};

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
    const hardEnd = Math.min(start + chunkSize, normalizedText.length);
    const end = findPreferredBoundary(normalizedText, start, hardEnd, chunkSize);

    const chunk = normalizedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end === normalizedText.length) {
      break;
    }

    const overlapStart = Math.max(start + 1, end - overlap);
    const nextBoundary = normalizedText.slice(overlapStart, end).search(/\s/);
    start = nextBoundary >= 0 ? overlapStart + nextBoundary + 1 : overlapStart;
    while (start < end && /\s/.test(normalizedText[start])) start += 1;
  }

  return chunks;
}

module.exports = chunkText;
module.exports.DEFAULT_CHUNK_OVERLAP = DEFAULT_CHUNK_OVERLAP;
module.exports.DEFAULT_CHUNK_SIZE = DEFAULT_CHUNK_SIZE;
