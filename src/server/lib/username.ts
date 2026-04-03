const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 12;
const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'dashboard',
  'help',
  'hostinginfo',
  'hostinginfo',
  'login',
  'logout',
  'null',
  'root',
  'settings',
  'signup',
  'staff',
  'team',
  'moderator',
  'mod',
  'official',
  'support',
  'system',
  'undefined',
  'user',
  'www',
]);

const BLOCKED_WORD_FRAGMENTS = [
  'asshole',
  'bastard',
  'bitch',
  'cunt',
  'dick',
  'fuck',
  'porn',
  'shit',
  'slut',
  'whore',
  'xxx',
];

export type UsernameValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: string };

export function validateUsername(value: unknown): UsernameValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { valid: false, error: 'Username is required' };
  }

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    };
  }

  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or less`,
    };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Username can only use letters and numbers',
    };
  }

  const lowered = normalized.toLowerCase();

  if (RESERVED_USERNAMES.has(lowered)) {
    return { valid: false, error: 'That username is reserved' };
  }

  if (BLOCKED_WORD_FRAGMENTS.some((word) => lowered.includes(word))) {
    return { valid: false, error: 'Username contains blocked words' };
  }

  return { valid: true, normalized };
}
