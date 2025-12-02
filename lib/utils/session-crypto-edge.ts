/**
 * Edge Runtime Compatible Session Encryption
 * Uses Web Crypto API instead of Node.js crypto module
 * Compatible with Next.js Edge Runtime (middleware)
 */

const CURRENT_KEY_VERSION = 1;

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert string to Uint8Array
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string
 */
function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.ADMIN_SESSION_SECRET;
  if (!keyHex) {
    throw new Error('ADMIN_SESSION_SECRET environment variable is required');
  }
  if (keyHex.length !== 64) {
    throw new Error('ADMIN_SESSION_SECRET must be 64 hex characters (32 bytes)');
  }
  return hexToBytes(keyHex);
}

/**
 * Import key for Web Crypto API
 */
async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts admin session data using AES-256-GCM with Web Crypto API
 * Returns: base64(version + iv + encryptedData + authTag)
 *
 * Format: [1 byte version][12 bytes IV][encrypted data][16 bytes authTag]
 * Note: GCM mode includes authentication tag in the output
 */
export async function encryptSessionData(data: object): Promise<string> {
  try {
    const keyData = getEncryptionKey();
    const key = await importKey(keyData);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const plaintext = stringToBytes(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128, // 16 bytes auth tag
      },
      key,
      plaintext
    );

    // Combine version + iv + encrypted data (includes auth tag)
    const encryptedBytes = new Uint8Array(encrypted);
    const combined = new Uint8Array(1 + iv.length + encryptedBytes.length);
    combined[0] = CURRENT_KEY_VERSION;
    combined.set(iv, 1);
    combined.set(encryptedBytes, 1 + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));

  } catch (error) {
    console.error('Session encryption failed:', error);
    throw new Error('Failed to encrypt session data');
  }
}

/**
 * Decrypts admin session data using AES-256-GCM with Web Crypto API
 * Input: base64(version + iv + encryptedData + authTag)
 *
 * Format: [1 byte version][12 bytes IV][encrypted data][16 bytes authTag]
 */
export async function decryptSessionData(encryptedData: string): Promise<object> {
  try {
    // Decode from base64
    const binaryString = atob(encryptedData);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // Extract version, IV, and encrypted data
    const version = combined[0];
    if (version !== CURRENT_KEY_VERSION) {
      throw new Error(`Unsupported key version: ${version}`);
    }

    const iv = combined.slice(1, 13); // 12 bytes
    const encrypted = combined.slice(13); // Rest is encrypted data + auth tag

    // Get and import key
    const keyData = getEncryptionKey();
    const key = await importKey(keyData);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      encrypted
    );

    const decryptedBytes = new Uint8Array(decrypted);
    const jsonString = bytesToString(decryptedBytes);
    return JSON.parse(jsonString);

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
 * Securely generates a random session secret
 */
export function generateSessionSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}
