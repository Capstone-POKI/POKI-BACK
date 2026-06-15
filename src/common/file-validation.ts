import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

const AUDIO_EXTENSIONS = new Set([
  '.webm',
  '.mp3',
  '.m4a',
  '.wav',
  '.ogg',
  '.mp4',
]);

const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/ogg',
  'video/webm',
  'video/mp4',
]);

export function assertPdfFile(file?: Express.Multer.File): asserts file is Express.Multer.File {
  const extension = path.extname(file?.originalname ?? '').toLowerCase();
  const hasPdfSignature = file?.buffer.subarray(0, 5).toString('ascii') === '%PDF-';

  if (
    !file ||
    file.size <= 0 ||
    extension !== '.pdf' ||
    file.mimetype !== 'application/pdf' ||
    !hasPdfSignature
  ) {
    throw new BadRequestException({
      error: 'INVALID_FILE',
      message: '유효한 PDF 파일만 업로드 가능합니다',
    });
  }
}

function hasAudioSignature(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  const firstFour = buffer.subarray(0, 4).toString('ascii');
  if (firstFour === 'OggS' || firstFour === 'RIFF') return true;
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return true;
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return true;
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
  return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
}

export function assertAudioFile(
  file?: Express.Multer.File,
): asserts file is Express.Multer.File {
  const extension = path.extname(file?.originalname ?? '').toLowerCase();

  if (
    !file ||
    file.size <= 0 ||
    !AUDIO_EXTENSIONS.has(extension) ||
    !AUDIO_MIME_TYPES.has(file.mimetype) ||
    !hasAudioSignature(file.buffer)
  ) {
    throw new BadRequestException({
      error: 'INVALID_AUDIO_FILE',
      message: '유효한 음성 파일만 업로드 가능합니다',
    });
  }
}
