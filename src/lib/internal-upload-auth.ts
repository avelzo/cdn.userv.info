import { timingSafeEqual } from 'crypto';

const THUMBNAIL_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

export function isInternalUploadAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header?.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function isSiteThumbnailFilename(value: string): boolean {
  return THUMBNAIL_FILENAME.test(value);
}
