import path from 'path';

export function resolveInside(root: string, ...segments: string[]): string {
  for (const segment of segments) {
    if (
      !segment
      || segment.includes('\0')
      || segment.includes('/')
      || segment.includes('\\')
      || segment === '.'
      || segment === '..'
      || /%2f|%5c|%00/i.test(segment)
    ) {
      throw new Error('Unsafe path segment');
    }
  }

  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...segments);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Path escapes storage root');
  }
  return resolved;
}

