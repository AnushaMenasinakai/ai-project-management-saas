const { createInvalidResponseError } = require('../services/geminiReliabilityService');

const validateCitations = (answer, sourceIds) => {
  const citations = [...answer.matchAll(/\[(S\d+)\]/g)].map((match) => match[1]);
  if (citations.some((citation) => !sourceIds.has(citation))) {
    throw createInvalidResponseError();
  }
};

module.exports = { validateCitations };
