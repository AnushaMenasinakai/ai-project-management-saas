const aiErrorMessages = Object.freeze({
  AI_QUOTA_EXHAUSTED: 'AI usage is temporarily unavailable because the service quota has been reached. Please try again later.',
  AI_TEMPORARILY_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again.',
  AI_TIMEOUT: 'The AI service took too long to respond. Please try again.',
  AI_CONFIGURATION_ERROR: 'The AI service is currently unavailable because its configuration needs attention.',
  AI_INVALID_RESPONSE: 'The AI service returned an invalid response. Please try again later.',
  AI_ERROR: 'The AI request could not be completed. Please try again later.',
  DOCUMENT_EMBEDDING_LIMIT_EXCEEDED: 'This document exceeds the current AI embedding limit. Shorten the content and try again.',
});

export const formatAiError = (error, fallbackMessage = 'The AI request could not be completed.') => {
  const responseData = error?.response?.data;
  const code = typeof responseData?.code === 'string' ? responseData.code : '';
  if (Object.hasOwn(aiErrorMessages, code)) return aiErrorMessages[code];

  return typeof responseData?.message === 'string' && responseData.message.trim()
    ? responseData.message.trim()
    : fallbackMessage;
};

export default formatAiError;
