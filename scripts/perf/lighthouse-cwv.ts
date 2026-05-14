#!/usr/bin/env npx tsx
/**
 * Real Core Web Vitals measurement via PageSpeed Insights API.
 *
 * Replaces the curl-timings estimate from prior /perf runs with authoritative
 * Lighthouse data sourced from Google's infrastructure. Closes PROD-005 from
 * the 2026-05-01 perf audit (the "PSI rate-limited / no key" finding that
 * blocked real CWV measurement).
 *
 * Usage:
 *   pnpm perf:cwv                  # mobile strategy (conservative budget)
 *   pnpm perf:cwv -- --desktop     # desktop strategy
 *   pnpm perf:cwv -- --route /pricing  # single route
 *
 * Auth:
 *   Set GOOGLE_PAGESPEED_API_KEY in .env.local for 25K/day quota. Without it
 *   the script still works on PSI's keyless tier with a 3s delay between
 *   requests to avoid 429s.
 *
 * Output:
 *   .perf/cwv-<YYYYMMDD-HHMMSS>.json  -- raw per-route metrics + scores
 *   stdout                             -- markdown table for paste-into-report
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.PERF_TARGET_URL ?? 'https://rowan-app.vercel.app';
const API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY;
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Same 13 routes as the 2026-05-01 baseline so deltas are apples-to-apples.
const ROUTES = [
  '/', '/landing2', '/pricing', '/privacy', '/terms', '/accessibility',
  '/security', '/articles', '/login', '/signup', '/forgot-password',
];

interface LighthouseAudit {
  numericValue?: number;
}

interface LighthouseResult {
  audits?: Record<string, LighthouseAudit | undefined>;
  categories?: {
    performance?: { score?: number };
  };
}

interface PsiResponse {
  lighthouseResult?: LighthouseResult;
}

interface RouteMetrics {
  route: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  perfScore: number | null;
  lcp: number | null;
  fcp: number | null;
  cls: number | null;
  tbt: number | null;   // Total Blocking Time — Lighthouse's INP proxy
  si: number | null;    // Speed Index
  ttfb: number | null;
  error?: string;
}

const args = process.argv.slice(2);
const strategy: 'mobile' | 'desktop' = args.includes('--desktop') ? 'desktop' : 'mobile';
const routeArg = args[args.indexOf('--route') + 1];
const targetRoutes = args.includes('--route') && routeArg ? [routeArg] : ROUTES;

function audit(lh: LighthouseResult | undefined, id: string): number | null {
  const a = lh?.audits?.[id];
  return typeof a?.numericValue === 'number' ? a.numericValue : null;
}

async function measure(route: string): Promise<RouteMetrics> {
  const fullUrl = `${BASE_URL}${route}`;
  const params = new URLSearchParams({
    url: fullUrl,
    strategy,
    category: 'performance',
  });
  if (API_KEY) params.set('key', API_KEY);

  const result: RouteMetrics = {
    route, url: fullUrl, strategy,
    perfScore: null, lcp: null, fcp: null, cls: null, tbt: null, si: null, ttfb: null,
  };

  try {
    const r = await fetch(`${PSI_ENDPOINT}?${params}`);
    if (!r.ok) {
      result.error = `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
      return result;
    }
    const data = await r.json() as PsiResponse;
    const lh = data.lighthouseResult;
    result.perfScore = Math.round((lh?.categories?.performance?.score ?? 0) * 100);
    result.lcp = audit(lh, 'largest-contentful-paint');
    result.fcp = audit(lh, 'first-contentful-paint');
    result.cls = audit(lh, 'cumulative-layout-shift');
    result.tbt = audit(lh, 'total-blocking-time');
    result.si = audit(lh, 'speed-index');
    result.ttfb = audit(lh, 'server-response-time');
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

function fmt(n: number | null, unit: 'ms' | 'cls' | 'score'): string {
  if (n === null) return '—';
  if (unit === 'cls') return n.toFixed(3);
  if (unit === 'score') return String(n);
  return `${Math.round(n)}ms`;
}

function budget(metric: 'lcp' | 'fcp' | 'cls' | 'tbt' | 'ttfb', v: number | null): string {
  if (v === null) return '—';
  const thresholds = { lcp: 2500, fcp: 1800, cls: 0.1, tbt: 200, ttfb: 800 };
  return v <= thresholds[metric] ? '✅' : '⚠️';
}

(async () => {
  console.log(`📊 PSI Core Web Vitals — ${strategy} strategy`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Auth: ${API_KEY ? '✓ keyed (25K/day quota)' : '✗ keyless (3s pacing)'}`);
  console.log(`   Routes: ${targetRoutes.length}\n`);

  const results: RouteMetrics[] = [];
  for (const route of targetRoutes) {
    process.stdout.write(`  ${route} … `);
    const m = await measure(route);
    if (m.error) {
      process.stdout.write(`❌ ${m.error}\n`);
    } else {
      process.stdout.write(`${m.perfScore}/100  LCP=${fmt(m.lcp, 'ms')}  CLS=${fmt(m.cls, 'cls')}  TBT=${fmt(m.tbt, 'ms')}\n`);
    }
    results.push(m);
    // PSI keyless tier rate-limits at ~4 QPS. With a key, no pacing needed.
    if (!API_KEY && targetRoutes.indexOf(route) < targetRoutes.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 15);
  mkdirSync('.perf', { recursive: true });
  const jsonPath = `.perf/cwv-${stamp}.json`;
  writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    strategy,
    keyed: !!API_KEY,
    results,
  }, null, 2));

  // Markdown summary
  console.log(`\n## Core Web Vitals (PSI, ${strategy})\n`);
  console.log('| Route | Score | LCP | FCP | CLS | TBT | TTFB |');
  console.log('|---|---|---|---|---|---|---|');
  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.route} | — | ❌ ${r.error.slice(0, 40)} | | | | |`);
      continue;
    }
    console.log(
      `| ${r.route} ` +
      `| ${fmt(r.perfScore, 'score')} ` +
      `| ${fmt(r.lcp, 'ms')} ${budget('lcp', r.lcp)} ` +
      `| ${fmt(r.fcp, 'ms')} ${budget('fcp', r.fcp)} ` +
      `| ${fmt(r.cls, 'cls')} ${budget('cls', r.cls)} ` +
      `| ${fmt(r.tbt, 'ms')} ${budget('tbt', r.tbt)} ` +
      `| ${fmt(r.ttfb, 'ms')} ${budget('ttfb', r.ttfb)} |`
    );
  }
  const valid = results.filter(r => !r.error && r.perfScore !== null);
  if (valid.length) {
    const avg = (k: keyof RouteMetrics) =>
      valid.reduce((s, r) => s + (r[k] as number ?? 0), 0) / valid.length;
    console.log(`\n**Median perf score:** ${Math.round(avg('perfScore'))}/100`);
    console.log(`**Avg LCP:** ${Math.round(avg('lcp'))}ms · **Avg CLS:** ${avg('cls').toFixed(3)} · **Avg TBT:** ${Math.round(avg('tbt'))}ms`);
  }
  console.log(`\n💾 ${jsonPath}`);

  const failures = results.filter(r => r.error).length;
  process.exit(failures > 0 ? 1 : 0);
})();
