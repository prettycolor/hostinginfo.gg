export interface AvatarListItem {
  id: number;
  imagePath: string;
  isCurrent?: boolean;
}

function normalizeImageKey(imagePath: string): string {
  let normalized = String(imagePath || "")
    .trim()
    .replace(/\\/g, "/");

  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      // Keep original when URL parsing fails.
    }
  }

  const hashIndex = normalized.indexOf("#");
  if (hashIndex >= 0) {
    normalized = normalized.slice(0, hashIndex);
  }

  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) {
    normalized = normalized.slice(0, queryIndex);
  }

  normalized = normalized.replace(/\/{2,}/g, "/");

  if (normalized.includes("/public/avatars/")) {
    normalized = normalized
      .slice(normalized.indexOf("/public/avatars/"))
      .replace("/public/avatars/", "/avatars/");
  } else if (normalized.startsWith("public/avatars/")) {
    normalized = `/${normalized.replace(/^public\/avatars\//, "avatars/")}`;
  }

  if (normalized.includes("/avatars/")) {
    normalized = normalized.slice(normalized.indexOf("/avatars/"));
  } else if (normalized.includes("avatars/")) {
    normalized = `/${normalized.slice(normalized.indexOf("avatars/"))}`;
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace("/avatars/uncommon/", "/avatars/common/");

  return normalized.toLowerCase();
}

function isSelectedAvatar(
  avatar: AvatarListItem,
  selectedAvatarId: number | null,
): boolean {
  if (selectedAvatarId && avatar.id === selectedAvatarId) {
    return true;
  }
  return Boolean(avatar.isCurrent);
}

/**
 * Deduplicate avatar list entries by normalized image path.
 * Keeps ordering stable while preferring the selected/current avatar row
 * when duplicate image records exist in legacy datasets.
 */
export function dedupeAvatarsByImagePath<T extends AvatarListItem>(
  avatars: T[],
  selectedAvatarId: number | null,
): T[] {
  const deduped: T[] = [];
  const indexByKey = new Map<string, number>();

  for (const avatar of avatars) {
    const key = normalizeImageKey(avatar.imagePath);
    if (!key) {
      deduped.push(avatar);
      continue;
    }

    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, deduped.length);
      deduped.push(avatar);
      continue;
    }

    const existing = deduped[existingIndex];
    const existingIsSelected = isSelectedAvatar(existing, selectedAvatarId);
    const incomingIsSelected = isSelectedAvatar(avatar, selectedAvatarId);

    if (!existingIsSelected && incomingIsSelected) {
      deduped[existingIndex] = avatar;
    }
  }

  return deduped;
}
