const JSZip = require('jszip');
const mockPdfDestroy = jest.fn(async () => undefined);
jest.mock('pdf-parse', () => ({
  PasswordException: class PasswordException extends Error {},
  PDFParse: class PDFParse {
    constructor({ data }) { this.data = data; }
    async getText() {
      const content = Buffer.from(this.data).toString('ascii');
      if (content.includes('broken')) throw new Error('parser internals');
      if (content.includes('protected')) {
        throw Object.assign(new Error('password detail'), { name: 'PasswordException' });
      }
      if (content.includes('scanned')) {
        return { text: '\n-- 1 of 1 --\n', total: 1, pages: [{ num: 1, text: '' }] };
      }
      return {
        text: 'Release planning notes',
        total: 1,
        pages: [{ num: 1, text: 'Release planning notes' }],
      };
    }
    destroy() { return mockPdfDestroy(); }
  },
}));
const {
  DocumentFileError,
  MAX_EXTRACTED_TEXT_LENGTH,
  extractDocumentFile,
  normalizeExtractedText,
  sanitizeFilename,
} = require('../src/services/fileExtractionService');

const file = (originalname, mimetype, buffer) => ({ originalname, mimetype, buffer });

const makePdf = () => Buffer.from('%PDF-1.4\nfixture');

const makeDocx = async (text) => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder('_rels').file('.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder('word').file('document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
};

describe('document file extraction', () => {
  test('extracts and normalizes strict UTF-8 TXT metadata', async () => {
    const result = await extractDocumentFile(file('notes.txt', 'text/plain', Buffer.from('\uFEFFFirst\r\n\r\n\r\nSecond')));
    expect(result).toEqual({
      text: 'First\n\nSecond',
      metadata: expect.objectContaining({
        originalFilename: 'notes.txt', mimeType: 'text/plain', fileSize: expect.any(Number),
      }),
    });
  });

  test('extracts a text PDF, preserves page count, and accepts the PDF signature', async () => {
    const buffer = makePdf();
    const result = await extractDocumentFile(file('plan.pdf', 'application/pdf', buffer));
    expect(result.text).toContain('Release planning notes');
    expect(result.metadata).toMatchObject({ originalFilename: 'plan.pdf', pageCount: 1 });
    expect(result.segments).toEqual([{ pageNumber: 1, text: 'Release planning notes' }]);
    expect(mockPdfDestroy).toHaveBeenCalled();
  });

  test('extracts DOCX raw text without inventing page metadata', async () => {
    const buffer = await makeDocx('Architecture decision record');
    const result = await extractDocumentFile(file(
      'decision.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer
    ));
    expect(result.text).toBe('Architecture decision record');
    expect(result.metadata.pageCount).toBeUndefined();
    expect(result.segments).toBeUndefined();
  });

  test('rejects an image-only PDF even when the parser adds page separators', async () => {
    await expect(extractDocumentFile(file(
      'scan.pdf', 'application/pdf', Buffer.from('%PDF-scanned')
    ))).rejects.toMatchObject({ code: 'DOCUMENT_FILE_EMPTY', httpStatus: 422 });
  });

  test.each([
    file('notes.exe', 'application/octet-stream', Buffer.from('plain text')),
    file('notes.txt', 'application/pdf', Buffer.from('plain text')),
  ])('rejects unsupported extension or MIME combinations', async (upload) => {
    await expect(extractDocumentFile(upload)).rejects.toMatchObject({
      code: 'DOCUMENT_FILE_UNSUPPORTED', httpStatus: 415,
    });
  });

  test.each([
    file('broken.pdf', 'application/pdf', Buffer.from('%PDF-broken')),
    file('protected.pdf', 'application/pdf', Buffer.from('%PDF-protected')),
    file('broken.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from('PK\u0003\u0004broken')),
    file('binary.txt', 'text/plain', Buffer.from([0x61, 0x00, 0x62])),
    file('invalid.txt', 'text/plain', Buffer.from([0xc3, 0x28])),
  ])('returns a controlled invalid-file error for corrupt or invalid input', async (upload) => {
    await expect(extractDocumentFile(upload)).rejects.toBeInstanceOf(DocumentFileError);
    await expect(extractDocumentFile(upload)).rejects.toMatchObject({
      code: 'DOCUMENT_FILE_INVALID', httpStatus: 422,
    });
  });

  test('rejects empty and excessive extracted text', async () => {
    await expect(extractDocumentFile(file('empty.txt', 'text/plain', Buffer.from(' \n\t '))))
      .rejects.toMatchObject({ code: 'DOCUMENT_FILE_EMPTY' });
    await expect(extractDocumentFile(file(
      'large.txt', 'text/plain', Buffer.from('x'.repeat(MAX_EXTRACTED_TEXT_LENGTH + 1))
    ))).rejects.toMatchObject({ code: 'DOCUMENT_EXTRACTED_TEXT_TOO_LARGE' });
  });

  test('sanitizes malicious display filenames and normalizes controls safely', () => {
    expect(sanitizeFilename('..\\private\\bad<name>.txt')).toBe('bad_name_.txt');
    expect(normalizeExtractedText('one\u0000\r\n\r\n\r\ntwo')).toBe('one\n\ntwo');
  });
});
