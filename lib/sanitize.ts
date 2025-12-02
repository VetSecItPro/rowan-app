import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization utilities for preventing XSS attacks
 * Uses DOMPurify for robust HTML sanitization
 */

/**
 * Sanitize plain text input by removing all HTML tags
 * Use for fields that should NEVER contain HTML (names, titles, etc.)
 *
 * @param input - User-provided text input
 * @returns Sanitized text with all HTML tags removed
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove all HTML tags and trim whitespace
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  }).trim();
}

/**
 * Sanitize HTML content for safe rendering
 * Use for fields that may contain formatted text (descriptions, messages)
 * Allows only safe HTML tags and strips potentially dangerous content
 *
 * @param input - User-provided HTML content
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Allow only safe formatting tags, no scripts or dangerous attributes
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  }).trim();
}

/**
 * Sanitize a URL to prevent javascript: and data: URI XSS
 * Use for any user-provided URLs
 *
 * @param url - User-provided URL
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Allow http(s), mailto, tel, or relative URLs
  if (
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('mailto:') ||
    lowerUrl.startsWith('tel:') ||
    lowerUrl.startsWith('/') ||
    lowerUrl.startsWith('#')
  ) {
    return trimmed;
  }

  // If no protocol, assume relative URL
  if (!lowerUrl.includes(':')) {
    return trimmed;
  }

  // Unknown protocol, block it
  return '';
}
