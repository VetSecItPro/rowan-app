#!/usr/bin/env tsx
/**
 * Test Selector
 * Selects specific test files to run based on analysis
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { analyzeChanges } from './analyze-changes';

export async function selectTests(changedFiles?: string[]): Promise<string[]> {
  const analysis = await analyzeChanges(changedFiles);

  if (analysis.skipE2E) {
    console.log('⏭️  Skipping E2E tests:', analysis.reason);
    return [];
  }

  const testDir = path.join(process.cwd(), 'tests/e2e');

  // If full suite, return all test files
  if (analysis.testSuite.includes('**/*.spec.ts')) {
    const allTests = await glob('**/*.spec.ts', {
      cwd: testDir,
      absolute: false,
    });
    console.log(`🔄 Running FULL test suite (${allTests.length} files)`);
    return allTests;
  }

  // Otherwise, resolve patterns to actual files
  const selectedTests = new Set<string>();

  for (const pattern of analysis.testSuite) {
    const matchedFiles = await glob(pattern, {
      cwd: testDir,
      absolute: false,
    });

    for (const file of matchedFiles) {
      selectedTests.add(file);
    }
  }

  const tests = Array.from(selectedTests);
  console.log(`✅ Selected ${tests.length} test files:`, tests);

  return tests;
}

// CLI usage
if (require.main === module) {
  selectTests().then((tests) => {
    console.log('\n🎯 Test Selection Results');
    console.log('━'.repeat(60));

    if (tests.length === 0) {
      console.log('No E2E tests to run');
    } else {
      console.log(`Tests to run: ${tests.length}`);
      tests.forEach((test, i) => {
        console.log(`  ${i + 1}. ${test}`);
      });
    }

    console.log('━'.repeat(60));

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `test-count=${tests.length}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `tests=${JSON.stringify(tests)}\n`
      );
    }
  });
}
