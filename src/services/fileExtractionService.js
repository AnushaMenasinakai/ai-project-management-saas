const path = require('path');
const { TextDecoder } = require('util');
const mammoth = require('mammoth');
const { PDFParse, PasswordException } = require('pdf-parse');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 100_000;

const FILE_ERROR_CODES = Object.freeze({
  UNSUPPORTED: 'DOCUMENT_FILE_UNSUPPORTED',
  INVALID: 'DOCUMENT_FILE_INVALID',
  EMPTY: 'DOCUMENT_FILE_EMPTY',
  TEXT_TOO_LARGE: 'DOCUMENT_EXTRACTED_TEXT_TOO_LARGE',
});

const FORMAT_CONFIG = Object.freeze({
  '.txt': {
    format: 'txt',
    mimeTypes: new Set(['text/plain', 'application/octet-stream']),
  },
  '.pdf': {
    format: 'pdf',
    mimeTypes: new Set(['application/pdf', 'application/octet-stream']),
  },
  '.docx': {
    format: 'docx',
    mimeTypes: new Set([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ]),
  },
});

class DocumentFileError extends Error {
  constructor({ code, message, httpStatus }) {
    super(message);
    this.name = 'DocumentFileError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const fileError = (code) => {
  const definitions = {
    [FILE_ERROR_CODES.UNSUPPORTED]: {
      message: 'Only TXT, PDF, and DOCX files are supported.', httpStatus: 415,
    },
    [FILE_ERROR_CODES.INVALID]: {
      message: 'The uploaded file is invalid, corrupt, or protected.', httpStatus: 422,
    },
    [FILE_ERROR_CODES.EMPTY]: {
      message: 'The uploaded file does not contain extractable text.', httpStatus: 422,
    },
    [FILE_ERROR_CODES.TEXT_TOO_LARGE]: {
      message: 'The extracted document text is too large.', httpStatus: 413,
    },
  };
  return new DocumentFileError({ code, ...definitions[code] });
};

const sanitizeFilename = (value) => {
  const normalized = typeof value === 'string' ? value.replace(/\\/g, '/') : '';
  const basename = path.posix.basename(normalized)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
  return (basename || 'document').slice(0, 255);
};

const normalizeExtractedText = (value) => (
  typeof value === 'string'
    ? value
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    : ''
);

const hasPdfSignature = (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-';
const hasZipSignature = (buffer) => (
  buffer.length >= 4
  && buffer[0] === 0x50
  && buffer[1] === 0x4b
  && [0x03, 0x05, 0x07].includes(buffer[2])
  && [0x04, 0x06, 0x08].includes(buffer[3])
);

const validateFileEnvelope = (file) => {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw fileError(FILE_ERROR_CODES.INVALID);
  }
  if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new DocumentFileError({
      code: 'DOCUMENT_FILE_TOO_LARGE',
      message: 'The uploaded file exceeds the 5 MB limit.',
      httpStatus: 413,
    });
  }
  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  const config = FORMAT_CONFIG[extension];
  if (!config || !config.mimeTypes.has(String(file.mimetype || '').toLowerCase())) {
    throw fileError(FILE_ERROR_CODES.UNSUPPORTED);
  }
  if (config.format === 'pdf' && !hasPdfSignature(file.buffer)) {
    throw fileError(FILE_ERROR_CODES.INVALID);
  }
  if (config.format === 'docx' && !hasZipSignature(file.buffer)) {
    throw fileError(FILE_ERROR_CODES.INVALID);
  }
  if (config.format === 'txt' && (hasPdfSignature(file.buffer) || hasZipSignature(file.buffer))) {
    throw fileError(FILE_ERROR_CODES.INVALID);
  }
  return { extension, ...config };
};

const extractTxt = (buffer) => {
  if (buffer.includes(0)) throw fileError(FILE_ERROR_CODES.INVALID);
  const disallowedControls = [...buffer].filter(
    (byte) => (byte < 0x20 && ![0x09, 0x0a, 0x0d].includes(byte)) || byte === 0x7f
  ).length;
  if (disallowedControls / buffer.length > 0.01) throw fileError(FILE_ERROR_CODES.INVALID);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (error) {
    throw fileError(FILE_ERROR_CODES.INVALID);
  }
};

const extractPdf = async (buffer) => {
  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const pages = Array.isArray(result.pages)
      ? result.pages
        .map((page, index) => ({
          pageNumber: Number.isInteger(page?.num) && page.num > 0 ? page.num : index + 1,
          text: normalizeExtractedText(page?.text),
        }))
        .filter((page) => page.text)
      : [];
    return {
      text: result.text,
      pageCount: result.total || result.pages?.length || undefined,
      ...(pages.length > 0 ? { segments: pages } : {}),
    };
  } catch (error) {
    if (error instanceof PasswordException || error?.name === 'PasswordException') {
      throw fileError(FILE_ERROR_CODES.INVALID);
    }
    throw fileError(FILE_ERROR_CODES.INVALID);
  } finally {
    if (parser) await parser.destroy().catch(() => undefined);
  }
};

const extractDocx = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  } catch (error) {
    throw fileError(FILE_ERROR_CODES.INVALID);
  }
};

const extractDocumentFile = async (file) => {
  const config = validateFileEnvelope(file);
  let extraction;
  if (config.format === 'txt') extraction = { text: extractTxt(file.buffer) };
  if (config.format === 'pdf') extraction = await extractPdf(file.buffer);
  if (config.format === 'docx') extraction = await extractDocx(file.buffer);

  const text = normalizeExtractedText(extraction?.text);
  if (!text) throw fileError(FILE_ERROR_CODES.EMPTY);
  if (text.length > MAX_EXTRACTED_TEXT_LENGTH) {
    throw fileError(FILE_ERROR_CODES.TEXT_TOO_LARGE);
  }

  return {
    text,
    ...(Array.isArray(extraction?.segments) ? { segments: extraction.segments } : {}),
    metadata: {
      originalFilename: sanitizeFilename(file.originalname),
      mimeType: file.mimetype.toLowerCase(),
      fileSize: file.buffer.length,
      ...(Number.isInteger(extraction?.pageCount) && extraction.pageCount > 0
        ? { pageCount: extraction.pageCount }
        : {}),
    },
  };
};

module.exports = {
  DocumentFileError,
  FILE_ERROR_CODES,
  MAX_EXTRACTED_TEXT_LENGTH,
  MAX_FILE_SIZE_BYTES,
  extractDocumentFile,
  normalizeExtractedText,
  sanitizeFilename,
  validateFileEnvelope,
};
