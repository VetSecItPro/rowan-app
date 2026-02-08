/**
 * Playwright Auth Teardown
 *
 * Runs after all E2E tests complete:
 * 1. Deletes test users via teardown script
 * 2. Removes storage state files
 */

import { test as teardown } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

teardown.describe('Auth Teardown', () => {
  teardown('cleanup test users and auth state', () => {
    console.log('\n🧹 Tearing down E2E test users...');

    try {
      execSync('npx tsx tests/e2e/setup/teardown-test-users.ts', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('✅ Test users deleted\n');
    } catch (error) {
      console.error('⚠️ Test user teardown failed (may have already been deleted):', error);
      // Don't throw — allow teardown to continue
    }

    // Delete storage state files
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
      // Don't throw — teardown should always succeed
    }
  });
});
