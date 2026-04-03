import { defineConfig } from 'drizzle-kit';
import { env } from 'node:process';
import { getDatabaseCredentials } from './src/server/db/config';

/**
 * Drizzle Kit configuration for database migrations
 *
 * Usage:
 * - Generate migrations: npx drizzle-kit generate
 * - Push schema to database: npx drizzle-kit push
 *
 * Configuration source:
 * - Reads from /alloc/config.json
 * - Throws error if config file not found or invalid
 */
const credentials = getDatabaseCredentials();
const dbSslEnabled = ['1', 'true', 'yes', 'on'].includes((env.DB_SSL || '').toLowerCase());

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
    ...(dbSslEnabled
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  },
  verbose: true,
  strict: false,
});
