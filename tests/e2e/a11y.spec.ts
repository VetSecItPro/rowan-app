/**
 * Accessibility regression guard (Phase 16.6).
 *
 * Runs axe-core against the public (no-auth) pages on every CI run so runtime
 * a11y regressions - color contrast, heading hierarchy, missing form labels,
 * ARIA misuse - are caught automatically instead of by a manual audit months
 * later. A code-level reviewer cannot judge runtime contrast; a real browser +
 * axe can.
 *
 * Gate: fails on `critical` violations (the severe, rare class). `serious` and
 * `moderate` are logged but not yet gated - they are tracked as a health metric
 * ("trend, don't gate") and the bar can be ratcheted up as the count drops.
 * This lands a real guard without a red first run on pre-existing lower-severity
 * findings.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { dismissCookieBanner } from './helpers/test-utils';

const PUBLIC_PAGES = ['/', '/login', '/signup', '/pricing'];

for (const path of PUBLIC_PAGES) {
  test(`a11y: ${path} has no critical violations`, async ({ page }) => {
    await page.goto(path);
    await dismissCookieBanner(page);
    // Let the route settle so dynamically-rendered content is in the DOM.
    await page.waitForLoadState('networkidle').catch(() => {});

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const byImpact = (impact: string) =>
      results.violations.filter((v) => v.impact === impact);

    const critical = byImpact('critical');
    const serious = byImpact('serious');
    const moderate = byImpact('moderate');

    // Visibility for the tracked-but-not-gated tiers.
     
    console.log(
      `[a11y] ${path} - critical:${critical.length} serious:${serious.length} moderate:${moderate.length}`,
    );
    for (const v of [...critical, ...serious]) {
       
      console.log(`[a11y]   ${v.impact}: ${v.id} (${v.nodes.length}) - ${v.help}`);
    }

    expect(
      critical,
      `Critical a11y violations on ${path}: ${critical.map((v) => v.id).join(', ')}`,
    ).toEqual([]);
  });
}
