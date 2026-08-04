import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { consumeRateLimit } from '../src/lib/rate-limit.ts';
import { resolveInside } from '../src/lib/storage-path.ts';
import {
  isUploadSizeAllowed,
  normalizeImage,
  validateOriginalImageName,
  wouldExceedUploadQuota,
} from '../src/lib/upload-security.ts';
import { mayReadStoredFile } from '../src/lib/file-access-policy.ts';

const USER_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const USER_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const EMPTY_LEGACY = { fileIds: new Set(), userIds: new Set(), paths: new Set() };

test('rate limiter rejects excess requests and resets after its window', () => {
  const key = `test-${crypto.randomUUID()}`;
  assert.equal(consumeRateLimit(key, 2, 1_000, 1_000).allowed, true);
  assert.equal(consumeRateLimit(key, 2, 1_000, 1_100).allowed, true);
  const rejected = consumeRateLimit(key, 2, 1_000, 1_200);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfter, 1);
  assert.equal(consumeRateLimit(key, 2, 1_000, 2_001).allowed, true);
});

test('path confinement rejects raw and encoded traversal', () => {
  const root = '/tmp/cdn-security-test';
  assert.equal(resolveInside(root, 'users', 'abc'), '/tmp/cdn-security-test/users/abc');
  for (const value of ['..', '../secret', '..\\secret', '%2fetc', '%5csecret', '%00.jpg', 'a/b']) {
    assert.throws(() => resolveInside(root, value));
  }
});

test('private files are visible only to their owner', () => {
  const file = { id: 'cccccccccccccccccccccccc', userId: USER_A, isPublic: false, url: '/private.jpg' };
  assert.equal(mayReadStoredFile(file, USER_A, EMPTY_LEGACY).allowed, true);
  assert.equal(mayReadStoredFile(file, USER_B, EMPTY_LEGACY).allowed, false);
  assert.equal(mayReadStoredFile(file, undefined, EMPTY_LEGACY).allowed, false);
});

test('public and explicitly grandfathered files remain publicly readable', () => {
  const publicFile = { id: 'cccccccccccccccccccccccc', userId: USER_A, isPublic: true };
  assert.equal(mayReadStoredFile(publicFile, undefined, EMPTY_LEGACY).allowed, true);
  const privateFile = { ...publicFile, isPublic: false };
  const legacy = { ...EMPTY_LEGACY, fileIds: new Set([privateFile.id]) };
  assert.equal(mayReadStoredFile(privateFile, undefined, legacy).publicAccess, true);
});

test('suspicious and unsupported names are rejected', () => {
  for (const filename of ['photo.php.jpg', 'vector.svg', 'index.html', 'image', '.hidden.jpg']) {
    assert.throws(() => validateOriginalImageName(filename));
  }
});

test('file size and user quotas are enforced at their boundaries', () => {
  assert.equal(isUploadSizeAllowed(10, 10), true);
  assert.equal(isUploadSizeAllowed(11, 10), false);
  assert.equal(wouldExceedUploadQuota(90, 20, 10, 100, 50), false);
  assert.equal(wouldExceedUploadQuota(91, 20, 10, 100, 50), true);
  assert.equal(wouldExceedUploadQuota(20, 41, 10, 100, 50), true);
});

for (const format of ['jpeg', 'png', 'webp']) {
  test(`valid ${format} content is decoded and normalized`, async () => {
    const input = await sharp({
      create: { width: 32, height: 24, channels: 3, background: '#336699' },
    })[format]().toBuffer();
    const normalized = await normalizeImage(input, `sample.${format === 'jpeg' ? 'jpg' : format}`);
    assert.equal(normalized.format, format);
    assert.equal(normalized.mimeType, `image/${format}`);
    assert.equal(normalized.width, 32);
    assert.equal(normalized.height, 24);
  });
}

test('declared extension cannot turn HTML into an image', async () => {
  await assert.rejects(normalizeImage(Buffer.from('<html><script>alert(1)</script></html>'), 'photo.jpg'));
});

test('SVG content is rejected even with an image extension', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
  await assert.rejects(normalizeImage(svg, 'photo.jpg'));
});

test('pixel quota is enforced', async () => {
  const previous = process.env.UPLOAD_MAX_PIXELS;
  process.env.UPLOAD_MAX_PIXELS = '50';
  try {
    const input = await sharp({
      create: { width: 10, height: 10, channels: 3, background: '#000000' },
    }).png().toBuffer();
    await assert.rejects(normalizeImage(input, 'large.png'));
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_MAX_PIXELS;
    else process.env.UPLOAD_MAX_PIXELS = previous;
  }
});
