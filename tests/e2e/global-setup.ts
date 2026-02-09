/**
 * Global Setup for E2E Tests
 *
 * Runs ONCE before all tests (including retries)
 * - Seeds test users to database
 * - Runs before auth.setup.ts
 */

import { execSync } from 'child_process';

async function globalSetup() {
  console.log('\n🌱 [Global Setup] Seeding E2E test users...\n');

  try {
    execSync('npx tsx tests/e2e/setup/seed-test-users.ts', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('\n✅ [Global Setup] Test users seeded successfully\n');
  } catch (error) {
    console.error('\n❌ [Global Setup] Failed to seed test users:', error);
    throw error;
  }
}

export default globalSetup;
