/**
 * Unit tests for lib/utils/session-crypto-edge.ts
 *
 * Tests AES-256-GCM encrypt/decrypt roundtrips using the Web Crypto API,
 * session validation, and secret generation — all compatible with the
 * Edge Runtime.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger-edge', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  encryptSessionData,
  decryptSessionData,
  validateSessionData,
  generateSessionSecret,
} from '@/lib/utils/session-crypto-edge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A valid 64-character hex key (32 bytes)
const VALID_KEY = 'a'.repeat(64);

function setEnv(key: string | undefined) {
  if (key === undefined) {
    delete process.env.ADMIN_SESSION_SECRET;
  } else {
    process.env.ADMIN_SESSION_SECRET = key;
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

  it('should return a non-empty base64 string', async () => {
    const result = await encryptSessionData({ adminId: 'a1', email: 'a@test.com', expiresAt: futureTimestamp() });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should produce different ciphertext for the same plaintext (random IV)', async () => {
    const data = { adminId: 'a1', email: 'a@test.com', expiresAt: futureTimestamp() };
    const enc1 = await encryptSessionData(data);
    const enc2 = await encryptSessionData(data);
    expect(enc1).not.toBe(enc2);
  });

  it('should produce a valid base64 string (decodable)', async () => {
    const result = await encryptSessionData({ test: true });
    expect(() => atob(result)).not.toThrow();
  });

  it('should throw when ADMIN_SESSION_SECRET is not set', async () => {
    setEnv(undefined);
    await expect(encryptSessionData({ adminId: 'x' })).rejects.toThrow('ADMIN_SESSION_SECRET');
  });

  it('should throw when ADMIN_SESSION_SECRET has wrong length', async () => {
    setEnv('short');
    await expect(encryptSessionData({ adminId: 'x' })).rejects.toThrow();
  });

  it('should encrypt arbitrary JSON-serialisable objects', async () => {
    const data = { nested: { a: [1, 2, 3] }, flag: true };
    const result = await encryptSessionData(data);
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// decryptSessionData
// ---------------------------------------------------------------------------

describe('decryptSessionData', () => {
  beforeEach(() => setEnv(VALID_KEY));
  afterEach(() => setEnv(undefined));

  it('should decrypt data that was encrypted with the same key', async () => {
    const original = { adminId: 'admin-1', email: 'admin@test.com', expiresAt: futureTimestamp() };
    const encrypted = await encryptSessionData(original);
    const decrypted = await decryptSessionData(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should roundtrip complex nested objects correctly', async () => {
    const original = { user: { id: 'u1', roles: ['admin', 'owner'] }, ts: 12345 };
    const encrypted = await encryptSessionData(original);
    const decrypted = await decryptSessionData(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should throw when given tampered ciphertext', async () => {
    const encrypted = await encryptSessionData({ adminId: 'a1' });
    // Flip a character in the middle of the base64 payload
    const tampered = encrypted.slice(0, 20) + (encrypted[20] === 'A' ? 'B' : 'A') + encrypted.slice(21);
    await expect(decryptSessionData(tampered)).rejects.toThrow('Failed to decrypt session data');
  });

  it('should throw when given completely invalid base64', async () => {
    await expect(decryptSessionData('not-valid-base64!!!')).rejects.toThrow();
  });

  it('should throw when ADMIN_SESSION_SECRET is not set during decryption', async () => {
    const encrypted = await encryptSessionData({ adminId: 'a1' });
    setEnv(undefined);
    await expect(decryptSessionData(encrypted)).rejects.toThrow();
  });

  it('should throw when decrypting with a different key', async () => {
    const encrypted = await encryptSessionData({ adminId: 'a1' });
    setEnv('b'.repeat(64));
    await expect(decryptSessionData(encrypted)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateSessionData
// ---------------------------------------------------------------------------

describe('validateSessionData', () => {
  it('should return true for a valid, unexpired session', () => {
    const session = { adminId: 'a1', email: 'a@test.com', expiresAt: futureTimestamp() };
    expect(validateSessionData(session)).toBe(true);
  });

  it('should return false for an expired session', () => {
    const session = { adminId: 'a1', email: 'a@test.com', expiresAt: pastTimestamp() };
    expect(validateSessionData(session)).toBe(false);
  });

  it('should return false when adminId is missing', () => {
    const session = { email: 'a@test.com', expiresAt: futureTimestamp() };
    expect(validateSessionData(session)).toBe(false);
  });

  it('should return false when email is missing', () => {
    const session = { adminId: 'a1', expiresAt: futureTimestamp() };
    expect(validateSessionData(session)).toBe(false);
  });

  it('should return false when expiresAt is missing', () => {
    const session = { adminId: 'a1', email: 'a@test.com' };
    expect(validateSessionData(session)).toBe(false);
  });

  it('should return false for null input', () => {
    expect(validateSessionData(null)).toBe(false);
  });

  it('should return false for a non-object input', () => {
    expect(validateSessionData('not-an-object')).toBe(false);
    expect(validateSessionData(42)).toBe(false);
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

  it('should return different values on successive calls (random)', () => {
    const a = generateSessionSecret();
    const b = generateSessionSecret();
    expect(a).not.toBe(b);
  });

  it('should produce a string usable as ADMIN_SESSION_SECRET', () => {
    const secret = generateSessionSecret();
    expect(secret.length).toBe(64);
    // Should be parseable as hex (each pair = 1 byte)
    expect(() => Buffer.from(secret, 'hex')).not.toThrow();
  });
});
