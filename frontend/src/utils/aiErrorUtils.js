const aiErrorMessages = Object.freeze({
  AI_QUOTA_EXHAUSTED: 'AI usage is temporarily unavailable because the service quota has been reached. Please try again later.',
  AI_TEMPORARILY_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again.',
  AI_TIMEOUT: 'The AI service took too long to respond. Please try again.',
  AI_CONFIGURATION_ERROR: 'The AI service is currently unavailable because its configuration needs attention.',
  AI_INVALID_RESPONSE: 'The AI service returned an invalid response. Please try again later.',
  AI_ERROR: 'The AI request could not be completed. Please try again later.',
  DOCUMENT_FILE_REQUIRED: 'Choose a TXT, PDF, or Word file to upload.',
  DOCUMENT_UPLOAD_INVALID: 'The upload could not be processed. Check the file and try again.',
  DOCUMENT_FILE_UNSUPPORTED: 'This file type is not supported. Choose a TXT, PDF, or DOCX file.',
  DOCUMENT_FILE_INVALID: 'This file is invalid, corrupt, or protected and could not be read.',
  DOCUMENT_FILE_EMPTY: 'No usable text was found in this file.',
  DOCUMENT_FILE_TOO_LARGE: 'This file is larger than the 5 MB upload limit.',
  DOCUMENT_EXTRACTED_TEXT_TOO_LARGE: 'The extracted document text is too large to index.',
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
