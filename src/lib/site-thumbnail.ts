import { mkdir, rename, unlink, writeFile } from 'fs/promises';
import { resolveInside } from '@/src/lib/storage-path';

export const SITE_THUMBNAIL_MAX_BYTES = 3 * 1024 * 1024;

export async function storeSiteThumbnail(root: string, buffer: Buffer): Promise<string> {
  const directory = resolveInside(root, 'site-thumbnails');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = `${crypto.randomUUID()}.webp`;
  const temporary = resolveInside(directory, `${filename}.tmp`);
  const destination = resolveInside(directory, filename);
  await writeFile(temporary, buffer, { flag: 'wx', mode: 0o600 });
  try {
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  return filename;
}
