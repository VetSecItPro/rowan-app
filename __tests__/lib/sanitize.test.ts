/**
 * Unit tests for lib/sanitize.ts
 *
 * Tests XSS prevention via:
 * - sanitizePlainText: strips all HTML, decodes entities
 * - sanitizeHtml (fallback): removes scripts, event handlers, dangerous URIs
 * - sanitizeUrl: blocks javascript:, data:, vbscript: protocols
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizePlainText, sanitizeHtml, sanitizeRichHtml, sanitizeUrl } from '@/lib/sanitize';

describe('sanitizePlainText', () => {
  it('should return empty string for null/undefined/empty', () => {
    expect(sanitizePlainText(null)).toBe('');
    expect(sanitizePlainText(undefined)).toBe('');
    expect(sanitizePlainText('')).toBe('');
  });

  it('should return non-string inputs as empty string', () => {
    // @ts-expect-error testing runtime safety
    expect(sanitizePlainText(123)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(sanitizePlainText({})).toBe('');
  });

  it('should pass through clean text unchanged', () => {
    expect(sanitizePlainText('Hello World')).toBe('Hello World');
    expect(sanitizePlainText('Buy groceries for the family')).toBe('Buy groceries for the family');
  });

  it('should strip HTML tags', () => {
    expect(sanitizePlainText('<b>bold</b>')).toBe('bold');
    expect(sanitizePlainText('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizePlainText('<div class="test">content</div>')).toBe('content');
  });

  it('should strip nested HTML tags', () => {
    expect(sanitizePlainText('<div><p><b>deep</b></p></div>')).toBe('deep');
  });

  it('should decode common HTML entities', () => {
    expect(sanitizePlainText('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(sanitizePlainText('&lt;not a tag&gt;')).toBe('<not a tag>');
    expect(sanitizePlainText('&quot;quoted&quot;')).toBe('"quoted"');
    expect(sanitizePlainText('it&#39;s fine')).toBe("it's fine");
    expect(sanitizePlainText('non&nbsp;breaking')).toBe('non breaking');
  });

  it('should trim whitespace', () => {
    expect(sanitizePlainText('  hello  ')).toBe('hello');
    expect(sanitizePlainText('  <b>trimmed</b>  ')).toBe('trimmed');
  });

  it('should handle XSS attack vectors', () => {
    // Script injection
    expect(sanitizePlainText('<script>document.cookie</script>')).toBe('document.cookie');

    // Event handler injection
    expect(sanitizePlainText('<img onerror="alert(1)" src="x">')).toBe('');

    // SVG-based XSS
    expect(sanitizePlainText('<svg onload="alert(1)">')).toBe('');

    // Iframe injection
    expect(sanitizePlainText('<iframe src="evil.com"></iframe>')).toBe('');
  });
});

describe('sanitizeHtml (fallback path)', () => {
  it('should return empty string for null/undefined/empty', async () => {
    expect(await sanitizeHtml(null)).toBe('');
    expect(await sanitizeHtml(undefined)).toBe('');
    expect(await sanitizeHtml('')).toBe('');
  });

  it('should remove script tags and their contents', async () => {
    const result = await sanitizeHtml('<p>Hello</p><script>alert("xss")</script><p>World</p>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should remove style tags and their contents', async () => {
    const result = await sanitizeHtml('<p>Hi</p><style>body{display:none}</style>');
    expect(result).not.toContain('style');
    expect(result).not.toContain('display:none');
    expect(result).toContain('Hi');
  });

  it('should remove on* event handlers', async () => {
    const result = await sanitizeHtml('<img onerror="alert(1)" src="x.jpg">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('should neutralize javascript: URIs in href', async () => {
    const result = await sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('should remove data: URIs in src', async () => {
    const result = await sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
    expect(result).not.toContain('data:');
  });

  it('should preserve safe HTML', async () => {
    const result = await sanitizeHtml('<p>Hello <strong>World</strong></p>');
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('Hello');
  });
});

describe('sanitizeUrl', () => {
  it('should return empty string for null/undefined/empty', () => {
    expect(sanitizeUrl(null)).toBe('');
    expect(sanitizeUrl(undefined)).toBe('');
    expect(sanitizeUrl('')).toBe('');
  });

  it('should return non-string inputs as empty string', () => {
    // @ts-expect-error testing runtime safety
    expect(sanitizeUrl(123)).toBe('');
  });

  it('should allow safe HTTP(S) URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com/path?q=1')).toBe('http://example.com/path?q=1');
    expect(sanitizeUrl('https://sub.domain.com:8080/path')).toBe('https://sub.domain.com:8080/path');
  });

  it('should allow mailto and tel URLs', () => {
    expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('should allow relative URLs', () => {
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    expect(sanitizeUrl('#anchor')).toBe('#anchor');
    expect(sanitizeUrl('relative/path')).toBe('relative/path');
  });

  it('should block javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
    expect(sanitizeUrl('JavaScript:void(0)')).toBe('');
  });

  it('should block data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('DATA:text/html,test')).toBe('');
  });

  it('should block vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:MsgBox("xss")')).toBe('');
    expect(sanitizeUrl('VBSCRIPT:test')).toBe('');
  });

  it('should block file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    expect(sanitizeUrl('FILE:///etc/shadow')).toBe('');
  });

  it('should block unknown protocols', () => {
    expect(sanitizeUrl('ftp://malicious.com')).toBe('');
    expect(sanitizeUrl('custom://handler')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
  });
});

// sanitizeRichHtml powers outbound email bodies. Its whole reason to exist is to
// avoid a module-top isomorphic-dompurify import (which crashes the route at load
// in the serverless runtime via the jsdom -> ESM @exodus/bytes chain). Whether the
// DOMPurify lazy-load succeeds or falls back to regex, these invariants must hold.
describe('sanitizeRichHtml', () => {
  it('returns empty string for nullish / non-string input', async () => {
    expect(await sanitizeRichHtml(null)).toBe('');
    expect(await sanitizeRichHtml(undefined)).toBe('');
    expect(await sanitizeRichHtml('')).toBe('');
    // @ts-expect-error - exercising the runtime type guard
    expect(await sanitizeRichHtml(123)).toBe('');
  });

  it('preserves email layout tags (tables, img, div) - the reason it differs from sanitizeHtml', async () => {
    const out = await sanitizeRichHtml('<table><tr><td>cell</td></tr></table>');
    expect(out).toContain('<td');
    expect(out).toContain('cell');
    const img = await sanitizeRichHtml('<img src="https://x.test/a.png" alt="a">');
    expect(img).toContain('<img');
  });

  it('strips <script> and its contents', async () => {
    const out = await sanitizeRichHtml('<p>hi</p><script>steal(document.cookie)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain('steal(document.cookie)');
    expect(out).toContain('hi');
  });

  it('strips inline event handlers and javascript: URLs', async () => {
    const out = await sanitizeRichHtml('<a href="javascript:alert(1)" onclick="alert(2)">x</a>');
    expect(out).not.toMatch(/onclick/i);
    expect(out.toLowerCase()).not.toContain('javascript:alert(1)');
  });
});

describe('sanitize entrypoints never import isomorphic-dompurify at module top', () => {
  // Regression guard for the prod 500: the three routes that 500'd all imported
  // `isomorphic-dompurify` directly at module scope, crashing at load. They must
  // only ever reach it through lib/sanitize's lazy getDOMPurify() try/catch.
  const routes = [
    'app/api/welcome/route.ts',
    'app/api/user/profile/route.ts',
    'app/api/notifications/email/route.ts',
  ];
  for (const rel of routes) {
    it(`${rel} has no top-level isomorphic-dompurify import`, () => {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src).not.toMatch(/^\s*import\s+.*from\s+['"]isomorphic-dompurify['"]/m);
    });
  }
});
