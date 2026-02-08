import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Key rotation support for admin session encryption
 * Supports multiple active keys for graceful rotation
 */

// Key version byte prefix (1 byte prepended to encrypted data)
const CURRENT_KEY_VERSION = 1;

/**
 * Get all active encryption keys from environment
 * Supports key rotation with backward compatibility
 *
 * Format:
 * - ADMIN_SESSION_SECRET: Current primary key (always used for encryption)
 * - ADMIN_SESSION_SECRET_V0: Previous key version 0 (for decryption only)
 * - ADMIN_SESSION_SECRET_V1: Previous key version 1 (for decryption only)
 */
const getEncryptionKeys = (): Map<number, Buffer> => {
  const keys = new Map<number, Buffer>();

  // Primary key (current version) - required
  const primaryKey = process.env.ADMIN_SESSION_SECRET;
  if (!primaryKey) {
    throw new Error('ADMIN_SESSION_SECRET environment variable is required');
  }
  if (primaryKey.length !== 64) { // 32 bytes = 64 hex characters
    throw new Error('ADMIN_SESSION_SECRET must be 64 hex characters (32 bytes)');
  }
  keys.set(CURRENT_KEY_VERSION, Buffer.from(primaryKey, 'hex'));

  // Previous key versions (optional, for rotation)
  for (let version = 0; version < CURRENT_KEY_VERSION; version++) {
    const oldKey = process.env[`ADMIN_SESSION_SECRET_V${version}`];
    if (oldKey) {
      if (oldKey.length !== 64) {
        logger.warn(`ADMIN_SESSION_SECRET_V${version} has invalid length, skipping`, { component: 'lib-session-crypto' });
        continue;
      }
      keys.set(version, Buffer.from(oldKey, 'hex'));
    }
  }

  return keys;
};

/**
 * Get the current encryption key (for new encryptions)
 */
const getCurrentEncryptionKey = (): Buffer => {
  const keys = getEncryptionKeys();
  const currentKey = keys.get(CURRENT_KEY_VERSION);
  if (!currentKey) {
    throw new Error('Current encryption key not found');
  }
  return currentKey;
};

/**
 * Get encryption key by version (for decryption of old sessions)
 */
const getEncryptionKeyByVersion = (version: number): Buffer => {
  const keys = getEncryptionKeys();
  const key = keys.get(version);
  if (!key) {
    throw new Error(`Encryption key version ${version} not found`);
  }
  return key;
};

/**
 * Encrypts admin session data using AES-256-GCM with key versioning
 * Returns: base64(version + iv + authTag + encryptedData)
 *
 * Format: [1 byte version][16 bytes IV][16 bytes authTag][encrypted data]
 */
export function encryptSessionData(data: object): string {
  try {
    const key = getCurrentEncryptionKey();
    const iv = randomBytes(16); // 16 bytes for GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv) as ReturnType<typeof createCipheriv> & { getAuthTag: () => Buffer };

    const plaintext = JSON.stringify(data);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine version + iv + authTag + encrypted data (version enables key rotation)
    const versionByte = Buffer.from([CURRENT_KEY_VERSION]);
    const combined = Buffer.concat([versionByte, iv, authTag, encrypted]);
    return combined.toString('base64');

  } catch (error) {
    logger.error('Session encryption failed:', error, { component: 'lib-session-crypto', action: 'service_call' });
    throw new Error('Failed to encrypt session data');
  }
}

/**
 * Decrypts admin session data using AES-256-GCM with key rotation support
 * Input: base64(version + iv + authTag + encryptedData) OR legacy base64(iv + authTag + encryptedData)
 *
 * Supports both:
 * - New format: [1 byte version][16 bytes IV][16 bytes authTag][encrypted data]
 * - Legacy format: [16 bytes IV][16 bytes authTag][encrypted data] (assumes version 0)
 */
export function decryptSessionData(encryptedData: string): object {
  try {
    const combined = Buffer.from(encryptedData, 'base64');

    // Determine if this is versioned format or legacy format
    let version: number;
    let iv: Buffer;
    let authTag: Buffer;
    let encrypted: Buffer;

    // Check if first byte could be a version number (0-255)
    // Legacy format: starts with random IV (first byte unlikely to be 0 or 1)
    // New format: starts with version byte (0 or 1)
    const firstByte = combined[0];

    if (combined.length >= 34 && firstByte <= CURRENT_KEY_VERSION) {
      // New format with version byte
      version = firstByte;
      iv = combined.subarray(1, 17);
      authTag = combined.subarray(17, 33);
      encrypted = combined.subarray(33);
    } else {
      // Legacy format without version byte (backward compatibility)
      version = 0;
      iv = combined.subarray(0, 16);
      authTag = combined.subarray(16, 32);
      encrypted = combined.subarray(32);
    }

    // Get the appropriate key for this version
    const key = getEncryptionKeyByVersion(version);

    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 }) as ReturnType<typeof createDecipheriv> & { setAuthTag: (tag: Buffer) => void };
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));

  } catch (error) {
    logger.error('Session decryption failed:', error, { component: 'lib-session-crypto', action: 'service_call' });
    throw new Error('Failed to decrypt session data');
  }
}

/**
 * Validates session data integrity and expiration
 */
type SessionData = {
  adminId: string;
  email: string;
  expiresAt: number;
};

const isSessionData = (value: unknown): value is SessionData => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.adminId === 'string' &&
    typeof record.email === 'string' &&
    typeof record.expiresAt === 'number'
  );
};

export function validateSessionData(sessionData: unknown): boolean {
  if (!isSessionData(sessionData)) {
    return false;
  }

  // Check expiration
  if (Date.now() > sessionData.expiresAt) {
    return false;
  }

  return true;
}

/**
 * Securely generates a random session secret for development
 * Production should use a proper secret management system
 */
export function generateSessionSecret(): string {
  return randomBytes(32).toString('hex');
}
