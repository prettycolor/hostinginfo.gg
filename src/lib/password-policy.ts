export const PASSWORD_MIN_LENGTH = 8;

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SYMBOL_REGEX = /[^A-Za-z0-9\s]/;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one symbol.";

export function isPasswordPolicyCompliant(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    UPPERCASE_REGEX.test(password) &&
    LOWERCASE_REGEX.test(password) &&
    NUMBER_REGEX.test(password) &&
    SYMBOL_REGEX.test(password)
  );
}

export function getPasswordPolicyError(
  password: string,
  label = "Password",
): string | null {
  if (isPasswordPolicyCompliant(password)) {
    return null;
  }

  return `${label} must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one symbol.`;
}
