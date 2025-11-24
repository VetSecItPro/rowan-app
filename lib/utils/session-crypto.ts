import { createCipherGCM, createDecipherGCM, randomBytes } from 'crypto';

// Get encryption key from environment - must be 32 bytes for AES-256
const getEncryptionKey = (): Buffer => {
  const key = process.env.ADMIN_SESSION_SECRET;

  if (!key) {
    throw new Error('ADMIN_SESSION_SECRET environment variable is required');
  }

  if (key.length !== 64) { // 32 bytes = 64 hex characters
    throw new Error('ADMIN_SESSION_SECRET must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
};

/**
 * Encrypts admin session data using AES-256-GCM
 * Returns: base64(iv + authTag + encryptedData)
 */
export function encryptSessionData(data: object): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(16); // 16 bytes for GCM
    const cipher = createCipherGCM('aes-256-gcm', key, iv);

    const plaintext = JSON.stringify(data);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');

  } catch (error) {
    console.error('Session encryption failed:', error);
    throw new Error('Failed to encrypt session data');
  }
}

/**
 * Decrypts admin session data using AES-256-GCM
 * Input: base64(iv + authTag + encryptedData)
 */
export function decryptSessionData(encryptedData: string): object {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components: 16 bytes IV + 16 bytes authTag + rest is encrypted data
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);

    const decipher = createDecipherGCM('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));

  } catch (error) {
    console.error('Session decryption failed:', error);
    throw new Error('Failed to decrypt session data');
  }
}

/**
 * Validates session data integrity and expiration
 */
export function validateSessionData(sessionData: any): boolean {
  if (!sessionData || typeof sessionData !== 'object') {
    return false;
  }

  // Check required fields
  if (!sessionData.adminId || !sessionData.email || !sessionData.expiresAt) {
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