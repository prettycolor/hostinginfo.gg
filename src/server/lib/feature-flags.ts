export function isSignupEnabled(): boolean {
  return String(process.env.SIGNUP_ENABLED || '').toLowerCase() === 'true';
}

