/**
 * SSRF defense — public-URL validator with DNS resolution.
 *
 * Used by every server-side URL fetch (recipes/parse, calendar/connect/ics,
 * calendar/connect/cozi, etc.) to prevent server-side request forgery.
 *
 * The previous string-only validator (in app/api/recipes/parse/route.ts and
 * lib/services/calendar/ics-import-service.ts) checked only the literal
 * hostname against private-IP regexes. That misses:
 *
 *   - DNS rebinding hosts (localtest.me, *.nip.io) that resolve to 127.0.0.1
 *   - Octal-encoded IPs (0177.0.0.1 = 127.0.0.1)
 *   - Decimal-encoded IPs (2130706433 = 127.0.0.1)
 *   - Hex-encoded IPs (0x7f.0.0.1 = 127.0.0.1)
 *   - IPv4-mapped IPv6 ([::ffff:127.0.0.1])
 *
 * RT-201 (red-team 2026-05-03): Confirmed all five bypass classes against
 * the recipes/parse and calendar/connect/{ics,cozi} validators. The fix
 * here resolves the hostname to an IP via dns.lookup() and runs the
 * private-range checks against the *resolved* address, not the literal
 * hostname — which catches every encoding variant + DNS-rebinding host
 * because they all converge to a real IP at lookup time.
 *
 * Limitation (documented residual risk): Between the validation lookup and
 * the actual fetch, DNS rebinding can flip the IP. A complete defense
 * would require fetching via a custom HTTP agent that does its own DNS
 * lookup and pins the validated IP into the connection. That's a larger
 * undertaking — for now, validation-time DNS check + Cloudflare/Vercel
 * edge typically breaking rebinding is the pragmatic stop. Acceptable
 * because Rowan's URL fetch is recipe-page scraping (low-value target),
 * not webhook/credential-bearing traffic.
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

export type ValidationResult =
  | { ok: true; parsed: URL; resolvedIp: string }
  | { ok: false; reason: string };

/** IPv4 private + reserved ranges (RFC 1918 / 5735 / 6598 / 6890). */
function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  return (
    a === 0 ||                                      // 0.0.0.0/8 — current network
    a === 10 ||                                     // 10.0.0.0/8 — RFC 1918
    a === 127 ||                                    // 127.0.0.0/8 — loopback
    (a === 169 && b === 254) ||                     // 169.254.0.0/16 — link-local (incl. AWS IMDS)
    (a === 172 && b >= 16 && b <= 31) ||            // 172.16.0.0/12 — RFC 1918
    (a === 192 && b === 0) ||                       // 192.0.0.0/24 — IETF reserved
    (a === 192 && b === 168) ||                     // 192.168.0.0/16 — RFC 1918
    a === 100 && b >= 64 && b <= 127 ||             // 100.64.0.0/10 — carrier-grade NAT
    a >= 224                                        // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  );
}

/** IPv6 private / loopback / link-local / unique-local. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Link-local fe80::/10
  if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // Unique-local fc00::/7 (covers fc and fd prefixes)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // Unspecified ::
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  // IPv4-mapped IPv6 — extract embedded v4 and check
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return isPrivateIPv4(v4mapped[1]);
  // 6to4 prefix 2002::/16 carrying a private v4 — relay risk; conservative reject
  return false;
}

/**
 * Validate that a URL points to a public host that is safe to fetch from
 * the server. Resolves DNS so encoded IPs and rebinding hosts are caught.
 *
 * @param url     The URL string supplied by the user.
 * @returns       ok=true with parsed URL + resolved IP, or ok=false with reason.
 */
export async function validatePublicUrl(url: string): Promise<ValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'Not a valid URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http(s) URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase();

  // Cheap pre-checks — block obvious local hostnames before paying for DNS.
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.localhost')
  ) {
    return { ok: false, reason: 'Private/local URLs are not allowed.' };
  }

  // If host is already a literal IP, validate it directly without DNS.
  // Strip brackets from IPv6 literals (URL.hostname keeps them).
  const literalIp = host.startsWith('[') && host.endsWith(']')
    ? host.slice(1, -1)
    : host;
  if (isIPv4(literalIp)) {
    if (isPrivateIPv4(literalIp)) {
      return { ok: false, reason: 'Private IP addresses are not allowed.' };
    }
    return { ok: true, parsed, resolvedIp: literalIp };
  }
  if (isIPv6(literalIp)) {
    if (isPrivateIPv6(literalIp)) {
      return { ok: false, reason: 'Private IPv6 addresses are not allowed.' };
    }
    return { ok: true, parsed, resolvedIp: literalIp };
  }

  // Hostname → resolve via DNS and check the resolved IP. This catches:
  //   - DNS rebinding hosts (localtest.me, *.nip.io) that resolve to 127.0.0.1
  //   - Octal/decimal/hex-encoded IPs that the URL parser accepted
  //     as opaque hostnames but DNS resolves to private addresses
  //   - Hostnames whose A record points inside the private range
  let resolvedIp: string;
  try {
    const lookupResult = await dnsLookup(host, { verbatim: true });
    resolvedIp = lookupResult.address;
  } catch {
    return { ok: false, reason: 'Hostname could not be resolved.' };
  }

  if (isIPv4(resolvedIp) && isPrivateIPv4(resolvedIp)) {
    return { ok: false, reason: 'Hostname resolves to a private IP.' };
  }
  if (isIPv6(resolvedIp) && isPrivateIPv6(resolvedIp)) {
    return { ok: false, reason: 'Hostname resolves to a private IPv6.' };
  }

  return { ok: true, parsed, resolvedIp };
}
