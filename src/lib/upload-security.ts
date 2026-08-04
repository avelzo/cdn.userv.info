import path from 'path';
import sharp from 'sharp';

function envPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const EXTENSION_BY_FORMAT: Record<string, string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};

export interface NormalizedImage {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  format: 'jpeg' | 'png' | 'webp';
  width: number;
  height: number;
}

export function isUploadSizeAllowed(size: number, maxBytes: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= maxBytes;
}

export function wouldExceedUploadQuota(
  existingTotal: number,
  existingDaily: number,
  incomingSize: number,
  totalLimit: number,
  dailyLimit: number,
): boolean {
  return existingTotal + incomingSize > totalLimit
    || existingDaily + incomingSize > dailyLimit;
}

export function validateOriginalImageName(filename: string): void {
  if (
    filename.length < 3
    || filename.length > 140
    || filename.includes('\0')
    || filename.includes('/')
    || filename.includes('\\')
    || filename.startsWith('.')
  ) {
    throw new Error('Invalid file name');
  }
  const extension = path.extname(filename).toLowerCase();
  const stem = filename.slice(0, -extension.length);
  if (!ALLOWED_EXTENSIONS.has(extension) || !stem || stem.includes('.')) {
    throw new Error('Only JPEG, PNG and WebP images with a single extension are allowed');
  }
}

export async function normalizeImage(input: Buffer, originalName: string): Promise<NormalizedImage> {
  validateOriginalImageName(originalName);
  const maxPixels = envPositiveInt('UPLOAD_MAX_PIXELS', 40_000_000);
  const maxWidth = envPositiveInt('UPLOAD_MAX_WIDTH', 12_000);
  const maxHeight = envPositiveInt('UPLOAD_MAX_HEIGHT', 12_000);
  const image = sharp(input, { failOn: 'error', limitInputPixels: maxPixels });
  const metadata = await image.metadata();
  const format = metadata.format;
  if (!format || !MIME_BY_FORMAT[format] || !metadata.width || !metadata.height) {
    throw new Error('The file is not a supported decodable image');
  }
  if (metadata.width > maxWidth || metadata.height > maxHeight
    || metadata.width * metadata.height > maxPixels) {
    throw new Error('Image dimensions exceed the configured limit');
  }

  const pipeline = image.rotate();
  let buffer: Buffer;
  if (format === 'jpeg') buffer = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  else if (format === 'png') buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  else buffer = await pipeline.webp({ quality: 90 }).toBuffer();

  const extension = EXTENSION_BY_FORMAT[format];
  return {
    buffer,
    originalName: `${path.basename(originalName, path.extname(originalName))}${extension}`,
    mimeType: MIME_BY_FORMAT[format],
    format: format as NormalizedImage['format'],
    width: metadata.width,
    height: metadata.height,
  };
}
