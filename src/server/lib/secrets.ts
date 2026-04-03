import { readFileSync } from 'node:fs';

/**
 * Secret stored in config.json
 */
interface StoredSecret {
  VALUE: string | object;
  SYSTEM_MANAGED: boolean;
}

/**
 * Config storage structure
 */
interface ConfigStorage {
  [key: string]: StoredSecret | any;
}

/**
 * Path to the config file in the container
 */
const CONFIG_PATH = '/alloc/config.json';

/**
 * Read and parse the config.json file
 *
 * @returns Parsed config object
 * @throws Error if file cannot be read or parsed
 */
function readConfig(): ConfigStorage {
  try {
    const content = readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read config from ${CONFIG_PATH}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a config entry is a valid non-system-managed secret
 *
 * @param value - Config entry to check
 * @returns True if entry is a non-system-managed secret
 */
function isNonSystemManagedSecret(value: any): value is StoredSecret {
  return (
    value !== null &&
    typeof value === 'object' &&
    'VALUE' in value &&
    'SYSTEM_MANAGED' in value &&
    value.SYSTEM_MANAGED === false
  );
}

/**
 * Get a non-system-managed secret value by name
 *
 * Fetches a secret from /alloc/config.json if it exists and is not system-managed.
 *
 * @param secretName - Name of the secret to retrieve
 * @returns Secret value (string or object) if found and non-system-managed, null otherwise
 *
 * @example
 * ```typescript
 * const apiKey = getSecret('OPENAI_API_KEY');
 * if (apiKey) {
 *   console.log('API Key:', apiKey);
 * }
 * ```
 */
export function getSecret(secretName: string): string | object | null {
  try {
    const config = readConfig();

    if (!(secretName in config)) {
      return null;
    }

    const entry = config[secretName];

    if (!isNonSystemManagedSecret(entry)) {
      return null;
    }

    return entry.VALUE;
  } catch (error) {
    console.error(`Failed to get secret '${secretName}':`, error);
    return null;
  }
}

/**
 * List all non-system-managed secret names
 *
 * Returns an array of secret names from /alloc/config.json that are marked as
 * non-system-managed (SYSTEM_MANAGED: false).
 *
 * @returns Array of non-system-managed secret names
 *
 * @example
 * ```typescript
 * const secretNames = listSecretNames();
 * console.log('Available secrets:', secretNames);
 * // Output: ['OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'DATABASE_URL']
 * ```
 */
export function listSecretNames(): string[] {
  try {
    const config = readConfig();
    const secretNames: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      if (isNonSystemManagedSecret(value)) {
        secretNames.push(key);
      }
    }

    return secretNames.sort();
  } catch (error) {
    console.error('Failed to list secret names:', error);
    return [];
  }
}
