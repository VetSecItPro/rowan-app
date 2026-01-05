/**
 * Sanitization utilities for preventing XSS attacks
 * Uses DOMPurify for robust HTML sanitization when available,
 * falls back to regex-based sanitization in serverless environments
 */

// Lazy-load DOMPurify to avoid JSDOM initialization issues in serverless
let DOMPurify: typeof import('isomorphic-dompurify').default | null = null;
let domPurifyLoadAttempted = false;

async function getDOMPurify() {
  if (!domPurifyLoadAttempted) {
    domPurifyLoadAttempted = true;
    try {
      const mod = await import('isomorphic-dompurify');
      DOMPurify = mod.default;
    } catch {
      // DOMPurify/JSDOM failed to load - use fallback
      DOMPurify = null;
    }
  }
  return DOMPurify;
}

/**
 * Fallback sanitization using regex (for when DOMPurify isn't available)
 * Strips all HTML tags but keeps text content
 */
function fallbackSanitizePlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&lt;/g, '<')   // Decode common entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

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

  // Use synchronous fallback - DOMPurify may not be available
  // For plain text (names, titles), regex stripping is sufficient
  return fallbackSanitizePlainText(input);
}

/**
 * Fallback HTML sanitization - strips all potentially dangerous content
 * Less precise than DOMPurify but safe for serverless environments
 */
function fallbackSanitizeHtml(input: string): string {
  // Remove script tags and their contents
  let result = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove style tags and their contents
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove on* event handlers
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  // Remove javascript: URLs
  result = result.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  // Remove data: URLs in src
  result = result.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  return result.trim();
}

/**
 * Sanitize HTML content for safe rendering
 * Use for fields that may contain formatted text (descriptions, messages)
 * Allows only safe HTML tags and strips potentially dangerous content
 *
 * @param input - User-provided HTML content
 * @returns Sanitized HTML safe for rendering
 */
export async function sanitizeHtml(input: string | null | undefined): Promise<string> {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const purify = await getDOMPurify();

  if (purify) {
    // Use DOMPurify when available
    return purify.sanitize(input, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['href', 'title', 'target'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    }).trim();
  }

  // Fallback to regex-based sanitization
  return fallbackSanitizeHtml(input);
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
