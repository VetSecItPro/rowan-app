/**
 * AI Input Sanitizer — Security layer before messages reach the LLM
 *
 * 4.3.1: Detects prompt injection attempts
 * 4.3.7: Strips HTML, script injections, null bytes, control characters
 *
 * This runs BEFORE the message is sent to Gemini. It rejects malicious
 * input and sanitizes the rest.
 */

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum user message length (chars) */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Common prompt injection patterns.
 * These catch attempts to override system instructions, impersonate roles,
 * or manipulate the model's behavior.
 */
const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  // System prompt overrides
  { pattern: /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i, label: 'ignore_previous' },
  { pattern: /forget\s+(all\s+)?previous\s+(instructions?|prompts?|context)/i, label: 'forget_previous' },
  { pattern: /disregard\s+(all\s+)?previous\s+(instructions?|prompts?|rules)/i, label: 'disregard_previous' },
  { pattern: /override\s+(system|previous)\s+(prompt|instructions?)/i, label: 'override_system' },

  // Role impersonation
  { pattern: /you\s+are\s+now\s+(a|an|the)\s/i, label: 'role_override' },
  { pattern: /act\s+as\s+(a|an|if\s+you\s+are)\s/i, label: 'role_impersonation' },
  { pattern: /pretend\s+(to\s+be|you\s+are)\s/i, label: 'pretend_role' },
  { pattern: /from\s+now\s+on\s+(you|your)\s/i, label: 'behavior_override' },

  // System message injection
  { pattern: /^system\s*:/im, label: 'system_prefix' },
  { pattern: /\[system\]/i, label: 'system_bracket' },
  { pattern: /<<\s*SYS\s*>>/i, label: 'system_tag' },
  { pattern: /\[INST\]/i, label: 'inst_tag' },

  // Prompt extraction attempts
  { pattern: /reveal\s+(your\s+)?(system\s+)?prompt/i, label: 'prompt_extraction' },
  { pattern: /show\s+(me\s+)?(your\s+)?(system\s+|initial\s+)?instructions?/i, label: 'instruction_extraction' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?prompt/i, label: 'prompt_query' },
  { pattern: /print\s+(your\s+)?(system\s+)?prompt/i, label: 'prompt_print' },

  // Delimiter-based injection
  { pattern: /---+\s*NEW\s+(SYSTEM\s+)?INSTRUCTIONS?\s*---+/i, label: 'delimiter_injection' },
  { pattern: /===+\s*(ADMIN|SYSTEM|ROOT)\s*===+/i, label: 'admin_delimiter' },

  // Jailbreak keywords
  { pattern: /\bDAN\s+mode\b/i, label: 'dan_mode' },
  { pattern: /\bjailbreak\b/i, label: 'jailbreak' },
  { pattern: /\bdo\s+anything\s+now\b/i, label: 'do_anything_now' },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  wasBlocked: boolean;
  blockReason?: string;
  modifications: string[];
}

/**
 * Sanitize a user message before sending to the LLM.
 * Returns the sanitized message or blocks it if injection detected.
 */
export function sanitizeUserInput(message: string, userId?: string): SanitizationResult {
  const modifications: string[] = [];
  let sanitized = message;
  let wasBlocked = false;
  let blockReason: string | undefined;

  // 0. SECURITY: Length check FIRST to prevent regex DoS on oversized input
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      sanitized: '',
      wasModified: true,
      wasBlocked: true,
      blockReason: `Message too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      modifications: ['length_exceeded'],
    };
  }

  // 1. Check for prompt injection (before any transformation)
  const injectionMatch = detectPromptInjection(message);
  if (injectionMatch) {
    wasBlocked = true;
    blockReason = 'Your message was flagged for safety reasons. Please rephrase your request.';

    logger.warn('[AI Sanitizer] Prompt injection detected', {
      component: 'ai-sanitizer',
      action: 'injection_detected',
      label: injectionMatch.label,
      userId: userId ?? 'unknown',
      messageLength: message.length,
    });

    // Fire Sentry alert for injection attempts (non-blocking)
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureMessage(`AI prompt injection attempt: ${injectionMatch.label}`, {
        level: 'warning',
        tags: { alert_type: 'ai_prompt_injection', pattern: injectionMatch.label },
        extra: { userId, messageLength: message.length },
      });
    }).catch(() => {});

    return { sanitized: '', wasModified: true, wasBlocked: true, blockReason, modifications: ['prompt_injection_blocked'] };
  }

  // 2. Strip null bytes and control characters (except newlines/tabs)
  const beforeNull = sanitized;
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (sanitized !== beforeNull) modifications.push('stripped_control_chars');

  // 3. Strip HTML tags
  const beforeHtml = sanitized;
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  if (sanitized !== beforeHtml) modifications.push('stripped_html_tags');

  // 4. Strip potential script injections
  const beforeScript = sanitized;
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');
  if (sanitized !== beforeScript) modifications.push('stripped_script_patterns');

  // 5. Safety net: Truncate if stripping expanded the message somehow
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH);
    modifications.push(`truncated_to_${MAX_MESSAGE_LENGTH}_chars`);
  }

  // 6. Trim whitespace
  sanitized = sanitized.trim();

  return {
    sanitized,
    wasModified: modifications.length > 0,
    wasBlocked,
    blockReason,
    modifications,
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function detectPromptInjection(message: string): { pattern: RegExp; label: string } | null {
  for (const entry of INJECTION_PATTERNS) {
    if (entry.pattern.test(message)) {
      return entry;
    }
  }
  return null;
}
