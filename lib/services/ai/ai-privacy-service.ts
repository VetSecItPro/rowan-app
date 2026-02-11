/**
 * AI Privacy Service
 *
 * Protects sensitive data from being sent to the AI model:
 * - Detects PII (SSN, CC numbers, phone numbers) in user messages
 * - Redacts sensitive fields from space context before LLM calls
 * - Provides warning messages when PII is detected
 */

import type { SpaceContext } from './system-prompt';

// ---------------------------------------------------------------------------
// PII detection patterns
// ---------------------------------------------------------------------------

const PII_PATTERNS: Record<string, RegExp> = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
  routing_number: /\brouting\b.*?\b\d{9}\b/gi,
  phone: /\b(?:\+1[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Extended patterns for broader PII coverage
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  drivers_license: /\b[A-Z]{1,2}\d{5,8}\b/g,
  bank_account: /\b(?:account|acct)\s*#?\s*\d{8,17}\b/gi,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
  dob: /\b(?:dob|date of birth|born)\s*:?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi,
};

// Human-readable labels for warning messages
const PII_LABELS: Record<string, string> = {
  ssn: 'Social Security Number',
  credit_card: 'credit card number',
  routing_number: 'bank routing number',
  phone: 'phone number',
  email: 'email address',
  passport: 'passport number',
  drivers_license: "driver's license number",
  bank_account: 'bank account number',
  iban: 'IBAN',
  dob: 'date of birth',
};

// ---------------------------------------------------------------------------
// Sensitive field names to redact from context objects
// ---------------------------------------------------------------------------

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'api_key',
  'ssn',
  'social_security',
  'credit_card',
  'bank_account',
  'routing_number',
  'authorization',
  'cookie',
  'bearer',
  'jwt',
  'refresh_token',
  'access_token',
]);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PIIDetectionResult {
  hasPII: boolean;
  types: string[];
  warningMessage?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check a user message for PII patterns.
 * Returns detection info — does NOT block the message.
 */
export function detectPIIInUserInput(message: string): PIIDetectionResult {
  const detectedTypes: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      detectedTypes.push(type);
    }
  }

  if (detectedTypes.length === 0) {
    return { hasPII: false, types: [] };
  }

  const labels = detectedTypes.map((t) => PII_LABELS[t] ?? t);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  const warningMessage = `Your message appears to contain a ${list}. For your privacy, avoid sharing sensitive personal information in chat.`;

  return { hasPII: true, types: detectedTypes, warningMessage };
}

/**
 * Replace detected PII in a string with [REDACTED].
 */
export function redactPII(text: string): string {
  let result = text;

  for (const pattern of Object.values(PII_PATTERNS)) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }

  return result;
}

/**
 * Deep-clone a SpaceContext and redact any PII / sensitive fields
 * before passing it to the LLM.
 */
export function sanitizeContextForLLM(context: SpaceContext): SpaceContext {
  // Deep clone via structured clone (avoids prototype issues)
  const clone = structuredClone(context);
  return sanitizeObject(clone);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walk an object, redacting sensitive field names
 * and PII patterns found in string values.
 */
function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactPII(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i]);
    }
    return obj;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[-\s]/g, '_');

      if (SENSITIVE_FIELDS.has(normalizedKey)) {
        (obj as Record<string, unknown>)[key] = '[REDACTED]';
      } else {
        (obj as Record<string, unknown>)[key] = sanitizeObject(
          (obj as Record<string, unknown>)[key]
        );
      }
    }
    return obj;
  }

  return obj;
}
