import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const RUNTIME_DEV_JWT_SECRET = crypto.randomBytes(64).toString('hex');

function resolveJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Auth] JWT_SECRET must be set in production');
  }

  console.warn('[Auth] JWT_SECRET is not set; using runtime-generated development fallback secret');
  return RUNTIME_DEV_JWT_SECRET;
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = '24h'; // 24 hours - persistent session

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
