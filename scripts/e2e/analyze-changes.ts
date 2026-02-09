#!/usr/bin/env tsx
/**
 * Change Analyzer
 * Analyzes git changes to determine which E2E tests to run
 */

import { execSync } from 'child_process';
import { minimatch } from 'minimatch';
import { ChangeAnalysis } from './types';
import {
  FEATURE_TEST_MAP,
  SKIP_E2E_PATHS,
  FULL_E2E_PATHS,
  getCurrentRepoConfig,
} from './repo-config';

export async function analyzeChanges(
  changedFilesInput?: string[]
): Promise<ChangeAnalysis> {
  const config = getCurrentRepoConfig();

  // Get changed files from git or input
  const changedFiles = changedFilesInput || getChangedFiles();

  console.log(`\n📊 Analyzing ${changedFiles.length} changed files...`);

  // Check if changes should skip E2E entirely
  const shouldSkipE2E = changedFiles.every((file) =>
    SKIP_E2E_PATHS.some((pattern) => minimatch(file, pattern))
  );

  if (shouldSkipE2E) {
    return {
      changedFiles,
      affectedFeatures: [],
      testSuite: [],
      skipE2E: true,
      reason: 'Only docs/non-code files changed',
    };
  }

  // Check if changes require full E2E suite
  const requiresFullSuite = changedFiles.some((file) =>
    FULL_E2E_PATHS.some((pattern) => minimatch(file, pattern))
  );

  if (requiresFullSuite) {
    return {
      changedFiles,
      affectedFeatures: ['all'],
      testSuite: ['**/*.spec.ts'],
      skipE2E: false,
      reason: 'Critical paths changed - running full suite',
    };
  }

  // Determine affected features and tests
  const affectedFeatures = new Set<string>();
  const testSuite = new Set<string>();

  for (const file of changedFiles) {
    for (const [pathPattern, tests] of Object.entries(FEATURE_TEST_MAP)) {
      if (file.startsWith(pathPattern)) {
        affectedFeatures.add(pathPattern);

        // Add tests for this feature
        for (const test of tests) {
          testSuite.add(test);
        }
      }
    }
  }

  // If no specific tests matched, run a minimal smoke test
  if (testSuite.size === 0 && !shouldSkipE2E) {
    testSuite.add('auth-flow.spec.ts'); // Always run auth as smoke test
  }

  return {
    changedFiles,
    affectedFeatures: Array.from(affectedFeatures),
    testSuite: Array.from(testSuite),
    skipE2E: false,
    reason: `${affectedFeatures.size} features affected`,
  };
}

/**
 * Get changed files from git
 */
function getChangedFiles(): string[] {
  try {
    // Compare against main branch
    const baseBranch = process.env.BASE_BRANCH || 'main';

    // Get changed files in current branch vs base
    const output = execSync(`git diff --name-only origin/${baseBranch}...HEAD`, {
      encoding: 'utf-8',
    }).trim();

    if (!output) {
      // No changes found, check staged files
      const staged = execSync('git diff --name-only --cached', {
        encoding: 'utf-8',
      }).trim();

      if (!staged) {
        // No staged files, check working directory
        const unstaged = execSync('git diff --name-only', {
          encoding: 'utf-8',
        }).trim();

        return unstaged ? unstaged.split('\n') : [];
      }

      return staged.split('\n');
    }

    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('❌ Failed to get git changes:', error);
    // Fallback: run all tests
    return ['**/*'];
  }
}

/**
 * Format test suite for GitHub Actions matrix
 */
export function formatForGitHubMatrix(testSuite: string[]): string {
  // If wildcard, return all test files
  if (testSuite.includes('**/*.spec.ts')) {
    return JSON.stringify(['**/*.spec.ts']);
  }

  // Otherwise return specific tests
  return JSON.stringify(testSuite);
}

// CLI usage
if (require.main === module) {
  const inputFile = process.argv[2];
  let changedFiles: string[] | undefined;

  if (inputFile) {
    const fs = require('fs');
    const content = fs.readFileSync(inputFile, 'utf-8');
    changedFiles = content.split('\n').filter(Boolean);
  }

  analyzeChanges(changedFiles).then((analysis) => {
    console.log('\n🔍 Change Analysis Results');
    console.log('━'.repeat(60));
    console.log(`Changed Files:     ${analysis.changedFiles.length}`);
    console.log(`Skip E2E:          ${analysis.skipE2E}`);
    console.log(`Reason:            ${analysis.reason}`);
    console.log(`Affected Features: ${analysis.affectedFeatures.join(', ') || 'none'}`);
    console.log(`Test Suite:        ${analysis.testSuite.join(', ') || 'none'}`);
    console.log('━'.repeat(60));

    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `skip-e2e=${analysis.skipE2E}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `test-suite=${formatForGitHubMatrix(analysis.testSuite)}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `reason=${analysis.reason}\n`
      );
    }

    // Exit with appropriate code
    process.exit(0);
  });
}
