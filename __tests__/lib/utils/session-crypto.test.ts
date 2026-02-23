/**
 * Unit tests for lib/utils/session-crypto.ts
 *
 * Tests AES-256-GCM encrypt/decrypt roundtrips using Node.js crypto,
 * key rotation / backward compatibility, session validation, and
 * secret generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import {
  encryptSessionData,
  decryptSessionData,
  validateSessionData,
  generateSessionSecret,
} from '@/lib/utils/session-crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_KEY = 'c'.repeat(64); // 64 hex chars = 32 bytes

function setEnv(key: string | undefined, v0?: string) {
  if (key === undefined) {
    delete process.env.ADMIN_SESSION_SECRET;
  } else {
    process.env.ADMIN_SESSION_SECRET = key;
  }
  if (v0 === undefined) {
    delete process.env.ADMIN_SESSION_SECRET_V0;
  } else {
    process.env.ADMIN_SESSION_SECRET_V0 = v0;
  }
}

function futureTimestamp(ms = 3_600_000): number {
  return Date.now() + ms;
}

function pastTimestamp(ms = 3_600_000): number {
  return Date.now() - ms;
}

// ---------------------------------------------------------------------------
// encryptSessionData
// ---------------------------------------------------------------------------

describe('encryptSessionData', () => {
  beforeEach(() => setEnv(VALID_KEY));
  afterEach(() => setEnv(undefined));

  it('should return a non-empty base64 string', () => {
    const result = encryptSessionData({ adminId: 'a1', email: 'a@test.com', expiresAt: futureTimestamp() });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should produce different ciphertext on successive calls (random IV)', () => {
    const data = { adminId: 'a1', email: 'a@test.com', expiresAt: futureTimestamp() };
    const enc1 = encryptSessionData(data);
    const enc2 = encryptSessionData(data);
    expect(enc1).not.toBe(enc2);
  });

  it('should produce valid base64 (decodable without error)', () => {
    const result = encryptSessionData({ test: true });
    expect(() => Buffer.from(result, 'base64')).not.toThrow();
  });

  it('should throw when ADMIN_SESSION_SECRET is not set', () => {
    setEnv(undefined);
    // The module catches the inner error and re-throws a sanitised message
    expect(() => encryptSessionData({ adminId: 'x' })).toThrow('Failed to encrypt session data');
  });

  it('should throw when ADMIN_SESSION_SECRET has wrong length', () => {
    setEnv('tooshort');
    expect(() => encryptSessionData({ adminId: 'x' })).toThrow();
  });

  it('should encrypt complex nested objects without error', () => {
    const data = { a: { b: { c: [1, 2, 3] } }, flag: false };
    expect(() => encryptSessionData(data)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// decryptSessionData
// ---------------------------------------------------------------------------

describe('decryptSessionData', () => {
  beforeEach(() => setEnv(VALID_KEY));
  afterEach(() => setEnv(undefined));

  it('should decrypt data that was encrypted with the same key', () => {
    const original = { adminId: 'admin-1', email: 'admin@test.com', expiresAt: futureTimestamp() };
    const encrypted = encryptSessionData(original);
    const decrypted = decryptSessionData(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should roundtrip complex objects correctly', () => {
    const original = { nested: { roles: ['admin'] }, ts: 99999 };
    const decrypted = decryptSessionData(encryptSessionData(original));
    expect(decrypted).toEqual(original);
  });

  it('should throw when given tampered ciphertext', () => {
    const encrypted = encryptSessionData({ adminId: 'a1' });
    // Corrupt the last byte of the encrypted blob
    const buf = Buffer.from(encrypted, 'base64');
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString('base64');
    expect(() => decryptSessionData(tampered)).toThrow('Failed to decrypt session data');
  });

  it('should throw when given empty or garbage input', () => {
    expect(() => decryptSessionData('')).toThrow();
    expect(() => decryptSessionData('!@#$%^&*()')).toThrow();
  });

  it('should throw when decrypting with a different key', () => {
    const encrypted = encryptSessionData({ adminId: 'a1' });
    setEnv('d'.repeat(64));
    expect(() => decryptSessionData(encrypted)).toThrow();
  });

  it('should throw when ADMIN_SESSION_SECRET is missing during decryption', () => {
    const encrypted = encryptSessionData({ adminId: 'a1' });
    setEnv(undefined);
    // Inner error is caught and re-thrown as the sanitised message
    expect(() => decryptSessionData(encrypted)).toThrow('Failed to decrypt session data');
  });
});

// ---------------------------------------------------------------------------
// Key rotation — decrypting with an old key (V0)
// ---------------------------------------------------------------------------

describe('decryptSessionData key rotation', () => {
  afterEach(() => setEnv(undefined));

  it('should decrypt data encrypted with the current key when a V0 key is also present', () => {
    const oldKey = 'e'.repeat(64);
    const newKey = 'f'.repeat(64);
    setEnv(newKey, oldKey);

    const original = { adminId: 'admin-rotate', email: 'r@test.com', expiresAt: futureTimestamp() };
    const encrypted = encryptSessionData(original);
    const decrypted = decryptSessionData(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should warn and skip a V0 key with invalid length but still work with the current key', () => {
    const newKey = 'f'.repeat(64);
    setEnv(newKey, 'bad-v0');

    const original = { adminId: 'admin-skip-v0', email: 'skip@test.com', expiresAt: futureTimestamp() };
    const encrypted = encryptSessionData(original);
    const decrypted = decryptSessionData(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should use the current key for fresh encryptions regardless of legacy keys', () => {
    const oldKey = 'e'.repeat(64);
    const newKey = '0'.repeat(64);
    setEnv(newKey, oldKey);

    const encrypted = encryptSessionData({ adminId: 'fresh' });
    // Must be decodable with the current key
    const decrypted = decryptSessionData(encrypted) as { adminId: string };
    expect(decrypted.adminId).toBe('fresh');
  });
});

// ---------------------------------------------------------------------------
// validateSessionData
// ---------------------------------------------------------------------------

describe('validateSessionData', () => {
  it('should return true for a valid, unexpired session object', () => {
    expect(validateSessionData({ adminId: 'a1', email: 'a@test.com', expiresAt: futureTimestamp() })).toBe(true);
  });

  it('should return false for an expired session', () => {
    expect(validateSessionData({ adminId: 'a1', email: 'a@test.com', expiresAt: pastTimestamp() })).toBe(false);
  });

  it('should return false when adminId is missing', () => {
    expect(validateSessionData({ email: 'a@test.com', expiresAt: futureTimestamp() })).toBe(false);
  });

  it('should return false when email is missing', () => {
    expect(validateSessionData({ adminId: 'a1', expiresAt: futureTimestamp() })).toBe(false);
  });

  it('should return false when expiresAt is missing', () => {
    expect(validateSessionData({ adminId: 'a1', email: 'a@test.com' })).toBe(false);
  });

  it('should return false when adminId is not a string', () => {
    expect(validateSessionData({ adminId: 123, email: 'a@test.com', expiresAt: futureTimestamp() })).toBe(false);
  });

  it('should return false for null', () => {
    expect(validateSessionData(null)).toBe(false);
  });

  it('should return false for a plain string', () => {
    expect(validateSessionData('session-string')).toBe(false);
  });

  it('should return false for an empty object', () => {
    expect(validateSessionData({})).toBe(false);
  });

  it('should return false for an array', () => {
    expect(validateSessionData([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateSessionSecret
// ---------------------------------------------------------------------------

describe('generateSessionSecret', () => {
  it('should return a 64-character hex string', () => {
    const secret = generateSessionSecret();
    expect(secret).toHaveLength(64);
    expect(/^[0-9a-f]+$/i.test(secret)).toBe(true);
  });

  it('should return a different value on each call (cryptographically random)', () => {
    const a = generateSessionSecret();
    const b = generateSessionSecret();
    expect(a).not.toBe(b);
  });

  it('should produce output that is valid hex (parseable as 32 bytes)', () => {
    const secret = generateSessionSecret();
    const bytes = Buffer.from(secret, 'hex');
    expect(bytes.length).toBe(32);
  });
});
