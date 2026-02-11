/**
 * Playwright Auth Teardown
 *
 * Runs after all E2E tests complete:
 * 1. Deletes test users via teardown script (local only)
 * 2. Removes storage state files
 *
 * In CI, user cleanup is handled by the dedicated cleanup-users job
 * in smart-e2e.yml to avoid race conditions between parallel shards.
 */

import { test as teardown } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

teardown.describe('Auth Teardown', () => {
  teardown('cleanup test users and auth state', () => {
    // In CI, test user cleanup is handled by the cleanup-users job.
    // Per-shard teardown would delete users that other shards still need.
    if (!process.env.CI) {
      console.log('\n🧹 Tearing down E2E test users...');

      try {
        execSync('npx tsx tests/e2e/setup/teardown-test-users.ts', {
          stdio: 'inherit',
          env: process.env,
        });
        console.log('✅ Test users deleted\n');
      } catch (error) {
        console.error('⚠️ Test user teardown failed (may have already been deleted):', error);
      }
    } else {
      console.log('\n✅ CI detected — skipping user teardown (handled by cleanup-users job)\n');
    }

    // Delete storage state files (safe to do in CI — each shard has its own)
    console.log('🧹 Deleting auth storage state files...');
    const authDir = path.join(__dirname, '.auth');

    try {
      if (fs.existsSync(authDir)) {
        const files = fs.readdirSync(authDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(authDir, file));
            console.log(`  ✓ Deleted ${file}`);
          }
        }
      }
      console.log('✅ Auth state cleaned\n');
    } catch (error) {
      console.error('⚠️ Failed to delete auth state files:', error);
    }
  });
});
