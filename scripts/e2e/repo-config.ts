/**
 * Multi-Repo Configuration
 * Defines settings for all repos that use E2E intelligence
 */

import { RepoConfig } from './types';

export const REPO_CONFIGS: Record<string, RepoConfig> = {
  rowan: {
    name: 'rowan',
    framework: 'next-app-router',
    testRunner: 'playwright',
    buildCommand: 'pnpm build',
    testCommand: 'pnpm test:e2e',
    criticalPaths: [
      'app/(auth)',
      'components/ui',
      'components/navigation',
      'components/layout',
      'lib/services',
    ],
    scanPaths: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.ts'],
    ignorePaths: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'docs/**',
    ],
  },
  kaulby: {
    name: 'kaulby',
    framework: 'next-app-router', // Will auto-detect when deployed
    testRunner: 'playwright',
    buildCommand: 'npm run build',
    testCommand: 'npm run test:e2e',
    criticalPaths: ['app/(auth)', 'components/ui'],
    scanPaths: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignorePaths: ['**/node_modules/**', '**/.next/**', 'docs/**'],
  },
  clarus: {
    name: 'clarus',
    framework: 'next-app-router', // Will auto-detect when deployed
    testRunner: 'playwright',
    buildCommand: 'npm run build',
    testCommand: 'npm run test:e2e',
    criticalPaths: ['app/(auth)', 'components/ui'],
    scanPaths: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignorePaths: ['**/node_modules/**', '**/.next/**', 'docs/**'],
  },
  styrby: {
    name: 'styrby',
    framework: 'next-app-router', // Will auto-detect when deployed
    testRunner: 'playwright',
    buildCommand: 'npm run build',
    testCommand: 'npm run test:e2e',
    criticalPaths: ['app/(auth)', 'components/ui'],
    scanPaths: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignorePaths: ['**/node_modules/**', '**/.next/**', 'docs/**'],
  },
  steelmotion: {
    name: 'steelmotion',
    framework: 'next-app-router', // Will auto-detect when deployed
    testRunner: 'playwright',
    buildCommand: 'npm run build',
    testCommand: 'npm run test:e2e',
    criticalPaths: ['app/partnerships', 'components/forms'],
    scanPaths: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignorePaths: ['**/node_modules/**', '**/.next/**', 'docs/**'],
  },
};

/**
 * Get config for current repo
 */
export function getCurrentRepoConfig(): RepoConfig {
  const repoName = process.env.REPO_NAME || detectRepoName();
  return REPO_CONFIGS[repoName] || REPO_CONFIGS.rowan;
}

/**
 * Detect repo name from package.json
 */
function detectRepoName(): string {
  try {
    const packageJson = require('../../package.json');
    const name = packageJson.name || '';

    if (name.includes('rowan')) return 'rowan';
    if (name.includes('kaulby')) return 'kaulby';
    if (name.includes('clarus')) return 'clarus';
    if (name.includes('styrby')) return 'styrby';
    if (name.includes('steelmotion')) return 'steelmotion';
  } catch (error) {
    // Fallback to directory name
  }

  return 'rowan'; // default
}

/**
 * Feature-to-test mapping
 * Maps changed paths to relevant test files
 */
export const FEATURE_TEST_MAP: Record<string, string[]> = {
  // Auth flow
  'app/(auth)': ['auth-flow.spec.ts', 'auth.setup.ts'],

  // Monetization
  'app/(main)/settings': ['monetization.spec.ts'],
  'app/upgrade': ['monetization.spec.ts'],
  'lib/services/subscription': ['monetization.spec.ts'],

  // Base components (affects everything)
  'components/ui': ['**/*.spec.ts'], // Run all tests
  'components/navigation': ['**/*.spec.ts'],
  'components/layout': ['**/*.spec.ts'],

  // Features
  'app/(main)/tasks': ['tasks.spec.ts'],
  'app/(main)/calendar': ['calendar.spec.ts'],
  'app/(main)/reminders': ['reminders.spec.ts'],
  'app/(main)/shopping': ['shopping.spec.ts'],
  'app/(main)/meals': ['meals.spec.ts'],
  'app/(main)/household': ['household.spec.ts'],
  'app/(main)/goals': ['goals.spec.ts'],
  'app/(main)/messages': ['messages.spec.ts'],

  // Services (may affect multiple features)
  'lib/services': ['**/*.spec.ts'],

  // Test files themselves
  'tests/e2e': ['**/*.spec.ts'],
};

/**
 * Paths that should skip E2E entirely
 */
export const SKIP_E2E_PATHS = [
  'docs/**',
  '*.md',
  'README.md',
  '.gitignore',
  '.github/workflows/**', // Unless it's the e2e workflow itself
  'scripts/**', // Unless it's e2e scripts
  'supabase/migrations/**', // DB changes need separate testing
  '.vscode/**',
  '.idea/**',
  'public/images/**',
  'public/screenshots/**',
];

/**
 * Paths that always trigger full E2E suite
 */
export const FULL_E2E_PATHS = [
  'components/ui/**',
  'components/navigation/**',
  'components/layout/**',
  'lib/services/**',
  'middleware.ts',
  'next.config.mjs',
  'tests/e2e/**',
];
