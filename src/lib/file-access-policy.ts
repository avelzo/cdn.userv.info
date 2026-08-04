export interface StoredFilePolicyInput {
  id: string;
  userId: string;
  url?: string | null;
  isPublic: boolean;
}

export interface LegacyPublicPolicy {
  fileIds: ReadonlySet<string>;
  userIds: ReadonlySet<string>;
  paths: ReadonlySet<string>;
}

export function mayReadStoredFile(
  file: StoredFilePolicyInput,
  sessionUserId: string | undefined,
  legacy: LegacyPublicPolicy,
): { allowed: boolean; publicAccess: boolean } {
  const publicAccess = file.isPublic
    || legacy.fileIds.has(file.id)
    || legacy.userIds.has(file.userId)
    || Boolean(file.url && legacy.paths.has(file.url));
  return { publicAccess, allowed: publicAccess || sessionUserId === file.userId };
}
