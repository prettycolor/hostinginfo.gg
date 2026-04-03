export type AvatarImageTier =
  | "default"
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "reserved";

export type AvatarImageHealthStatus = "ok" | "legacy" | "invalid";

export interface AvatarImageHealth {
  status: AvatarImageHealthStatus;
  issue: string | null;
  rawPath: string | null;
  normalizedPath: string;
  expectedPattern: string;
  expectedFolder: string;
  suggestedPath: string | null;
}

const AVATAR_FILE_PATTERN = /\.(png|jpe?g|webp|gif|avif)$/i;
const LEGACY_SEED_FILE_PATTERN = /\/avatars\/[^/]+\/avatar-\d+\.[a-z0-9]+$/i;

const expectedFolderByTier: Record<AvatarImageTier, string> = {
  default: "default",
  common: "default",
  uncommon: "common",
  rare: "rare",
  epic: "epic",
  legendary: "legendary",
  reserved: "reserved",
};

function normalizeTier(value: unknown): AvatarImageTier {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "default" ||
    normalized === "common" ||
    normalized === "uncommon" ||
    normalized === "rare" ||
    normalized === "epic" ||
    normalized === "legendary" ||
    normalized === "reserved"
  ) {
    return normalized;
  }
  return "common";
}

export function getExpectedAvatarFolder(tier: unknown): string {
  return expectedFolderByTier[normalizeTier(tier)];
}

export function normalizeAvatarPathForAudit(rawPath: unknown): string | null {
  if (typeof rawPath !== "string") return null;

  let normalized = rawPath.trim().replace(/\\/g, "/");
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      // Keep original path when URL parsing fails.
    }
  }

  const hashIndex = normalized.indexOf("#");
  if (hashIndex >= 0) normalized = normalized.slice(0, hashIndex);

  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) normalized = normalized.slice(0, queryIndex);

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

  return normalized;
}

function extractFolderAndFile(pathValue: string): {
  folder: string | null;
  fileName: string | null;
} {
  const match = pathValue.match(/^\/avatars\/([^/]+)\/([^/]+)$/i);
  return {
    folder: match?.[1]?.toLowerCase() || null,
    fileName: match?.[2] || null,
  };
}

export function auditAvatarImagePath(params: {
  rawPath: unknown;
  normalizedPath: string;
  tier: unknown;
}): AvatarImageHealth {
  const expectedFolder = getExpectedAvatarFolder(params.tier);
  const expectedPattern = `/avatars/${expectedFolder}/<file>`;
  const normalizedRaw = normalizeAvatarPathForAudit(params.rawPath);
  const normalizedResult =
    normalizeAvatarPathForAudit(params.normalizedPath) ||
    String(params.normalizedPath || "");

  const { folder: normalizedFolder, fileName: normalizedFileName } =
    extractFolderAndFile(normalizedResult);
  const suggestedPath = normalizedFileName
    ? `/avatars/${expectedFolder}/${normalizedFileName}`
    : null;

  if (!normalizedRaw) {
    return {
      status: "invalid",
      issue: "missing-image-path",
      rawPath: null,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  const legacySeedMatch = LEGACY_SEED_FILE_PATTERN.test(normalizedRaw);
  if (legacySeedMatch) {
    return {
      status: "invalid",
      issue: "legacy-seed-filename",
      rawPath: normalizedRaw,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  const { folder: rawFolder, fileName: rawFileName } =
    extractFolderAndFile(normalizedRaw);

  if (!rawFolder || !rawFileName || !AVATAR_FILE_PATTERN.test(rawFileName)) {
    return {
      status: "invalid",
      issue: "invalid-avatar-path-format",
      rawPath: normalizedRaw,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  if (!normalizedFolder || !normalizedFileName) {
    return {
      status: "invalid",
      issue: "normalized-path-not-avatar-asset",
      rawPath: normalizedRaw,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  if (!AVATAR_FILE_PATTERN.test(normalizedFileName)) {
    return {
      status: "invalid",
      issue: "normalized-file-extension-invalid",
      rawPath: normalizedRaw,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  const folderMatchesExpected = normalizedFolder === expectedFolder;
  const rawDiffersFromNormalized =
    normalizedRaw.toLowerCase() !== normalizedResult.toLowerCase();

  if (!folderMatchesExpected) {
    return {
      status: "legacy",
      issue: "tier-folder-mismatch",
      rawPath: normalizedRaw,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  if (rawDiffersFromNormalized) {
    return {
      status: "legacy",
      issue: "legacy-path-normalized",
      rawPath: normalizedRaw,
      normalizedPath: normalizedResult,
      expectedPattern,
      expectedFolder,
      suggestedPath,
    };
  }

  return {
    status: "ok",
    issue: null,
    rawPath: normalizedRaw,
    normalizedPath: normalizedResult,
    expectedPattern,
    expectedFolder,
    suggestedPath: `/avatars/${expectedFolder}/${normalizedFileName}`,
  };
}
