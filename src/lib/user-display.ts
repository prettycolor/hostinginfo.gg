interface UserIdentityLike {
  profileName?: string | null;
  fullName?: string | null;
  email?: string | null;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function emailHandle(email: string | null | undefined): string {
  const trimmed = clean(email);
  if (!trimmed) return '';
  const [handle] = trimmed.split('@');
  return clean(handle);
}

export function getUserDisplayName(
  user: UserIdentityLike | null | undefined,
  fallback = 'User',
): string {
  if (!user) return fallback;

  const username = clean(user.profileName);
  if (username) return username;

  const fullName = clean(user.fullName);
  if (fullName) return fullName;

  const handle = emailHandle(user.email);
  if (handle) return handle;

  return fallback;
}

export function getUserInitials(
  user: UserIdentityLike | null | undefined,
  fallback = 'U',
): string {
  if (!user) return fallback;

  const username = clean(user.profileName);
  if (username) return username.slice(0, 2).toUpperCase();

  const fullName = clean(user.fullName);
  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  const handle = emailHandle(user.email);
  if (handle) return handle.slice(0, 2).toUpperCase();

  return fallback;
}
