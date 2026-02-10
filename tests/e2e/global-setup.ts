/**
 * Global Setup for E2E Tests
 *
 * Runs ONCE before all tests (including retries)
 * - Seeds test users to database (local only)
 * - In CI, the seed-users job handles seeding before shards run
 * - Runs before auth.setup.ts
 */

import { execSync } from 'child_process';

async function globalSetup() {
  // In CI, test users are seeded by the dedicated seed-users job in smart-e2e.yml.
  // Each shard should NOT re-seed — it causes FK constraint violations when
  // parallel shards' teardowns delete users while another shard's setup
  // tries to create subscriptions referencing those users.
  if (process.env.CI) {
    console.log('\n✅ [Global Setup] CI detected — skipping seed (handled by seed-users job)\n');
    return;
  }

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
