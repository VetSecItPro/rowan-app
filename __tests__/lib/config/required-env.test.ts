/**
 * Tests for required-env.ts (Phase 13.4 production env validation).
 */

import { describe, it, expect } from 'vitest';
import { checkProductionEnv, PRODUCTION_REQUIRED_ENV } from '@/lib/config/required-env';

function envWith(present: string[]): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of present) env[name] = 'set-value';
  return env;
}

const ALL = PRODUCTION_REQUIRED_ENV.map((e) => e.name);
const CRITICAL = PRODUCTION_REQUIRED_ENV.filter((e) => e.severity === 'critical').map((e) => e.name);
const WARN = PRODUCTION_REQUIRED_ENV.filter((e) => e.severity === 'warn').map((e) => e.name);

describe('checkProductionEnv', () => {
  it('is ok when every required var is present', () => {
    const result = checkProductionEnv(envWith(ALL));
    expect(result.ok).toBe(true);
    expect(result.missingCritical).toHaveLength(0);
    expect(result.missingWarn).toHaveLength(0);
  });

  it('fails (ok=false) when a critical var is missing', () => {
    const present = ALL.filter((n) => n !== CRITICAL[0]);
    const result = checkProductionEnv(envWith(present));
    expect(result.ok).toBe(false);
    expect(result.missingCritical.map((e) => e.name)).toContain(CRITICAL[0]);
  });

  it('stays ok=true when only a warn-level var is missing', () => {
    const present = ALL.filter((n) => n !== WARN[0]);
    const result = checkProductionEnv(envWith(present));
    expect(result.ok).toBe(true);
    expect(result.missingWarn.map((e) => e.name)).toContain(WARN[0]);
  });

  it('treats empty-string and whitespace as missing', () => {
    const env = envWith(ALL);
    env[CRITICAL[0]] = '';
    env[CRITICAL[1] ?? CRITICAL[0]] = '   ';
    const result = checkProductionEnv(env);
    expect(result.ok).toBe(false);
    expect(result.missingCritical.length).toBeGreaterThan(0);
  });

  it('reports all missing vars, not just the first', () => {
    const result = checkProductionEnv({});
    const reported = [...result.missingCritical, ...result.missingWarn].map((e) => e.name);
    expect(reported.sort()).toEqual([...ALL].sort());
  });

  it('every required var declares a non-empty reason', () => {
    for (const v of PRODUCTION_REQUIRED_ENV) {
      expect(v.reason.length).toBeGreaterThan(0);
    }
  });
});
