export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;

const supportedFileTypes = Object.freeze({
  txt: 'Text',
  pdf: 'PDF',
  docx: 'Word',
});

export const getFileExtension = (filename = '') => {
  const match = String(filename).toLowerCase().match(/\.([^.]+)$/);
  return match?.[1] || '';
};

export const isSupportedDocumentFile = (file) => (
  Boolean(file) && Object.hasOwn(supportedFileTypes, getFileExtension(file.name))
);

export const getDocumentFileTypeLabel = (value) => {
  const extension = typeof value === 'string'
    ? getFileExtension(value)
    : getFileExtension(value?.originalFilename || value?.name);
  if (extension && supportedFileTypes[extension]) return supportedFileTypes[extension];
  if (value?.mimeType === 'application/pdf') return 'PDF';
  if (value?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word';
  return value?.sourceType === 'text' ? 'Text' : 'File';
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getUploadFileValidationError = (file) => {
  if (!file) return 'Choose a TXT, PDF, or Word file to upload.';
  if (!isSupportedDocumentFile(file)) return 'Choose a supported TXT, PDF, or DOCX file.';
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return 'Choose a file that is 5 MB or smaller.';
  return '';
};
