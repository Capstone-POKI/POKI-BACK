import { BadRequestException } from '@nestjs/common';
import { assertAudioFile, assertPdfFile } from './file-validation';

function createFile(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return {
    originalname,
    mimetype,
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

describe('file validation', () => {
  it('accepts a PDF only when extension, MIME, and signature match', () => {
    const file = createFile(
      'deck.pdf',
      'application/pdf',
      Buffer.from('%PDF-1.7'),
    );

    expect(() => assertPdfFile(file)).not.toThrow();
    expect(() =>
      assertPdfFile(
        createFile('deck.pdf', 'application/pdf', Buffer.from('not-pdf')),
      ),
    ).toThrow(BadRequestException);
  });

  it('accepts supported audio signatures and rejects renamed files', () => {
    const file = createFile(
      'answer.webm',
      'audio/webm',
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]),
    );

    expect(() => assertAudioFile(file)).not.toThrow();
    expect(() =>
      assertAudioFile(
        createFile('answer.webm', 'audio/webm', Buffer.from('not-audio')),
      ),
    ).toThrow(BadRequestException);
  });
});
