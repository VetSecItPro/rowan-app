#!/usr/bin/env tsx
/**
 * Tech Stack Detector
 * Auto-detects project framework, test runner, and structure
 */

import fs from 'fs';
import path from 'path';
import { TechStack } from './types';

export async function detectTechStack(rootDir: string = process.cwd()): Promise<TechStack> {
  const hasAppDir = fs.existsSync(path.join(rootDir, 'app'));
  const hasPagesDir = fs.existsSync(path.join(rootDir, 'pages'));
  const hasSrcDir = fs.existsSync(path.join(rootDir, 'src'));

  let framework: TechStack['framework'] = 'other';

  // Detect Next.js
  if (hasAppDir) {
    framework = 'next-app-router';
  } else if (hasPagesDir) {
    framework = 'next-pages';
  } else if (hasSrcDir) {
    // Check for React
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
    );

    if (packageJson.dependencies?.react || packageJson.dependencies?.['react-dom']) {
      framework = 'react-spa';
    } else if (packageJson.dependencies?.vue) {
      framework = 'vue';
    } else if (packageJson.dependencies?.svelte) {
      framework = 'svelte';
    }
  }

  // Detect test runner
  let testRunner: TechStack['testRunner'] = 'none';
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
  );

  if (packageJson.devDependencies?.['@playwright/test']) {
    testRunner = 'playwright';
  } else if (packageJson.devDependencies?.cypress) {
    testRunner = 'cypress';
  } else if (packageJson.devDependencies?.selenium) {
    testRunner = 'selenium';
  }

  // Detect package manager
  let packageManager: TechStack['packageManager'] = 'npm';
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(rootDir, 'bun.lockb'))) {
    packageManager = 'bun';
  }

  return {
    framework,
    testRunner,
    hasAppDir,
    hasPagesDir,
    hasSrcDir,
    packageManager,
  };
}

// CLI usage
if (require.main === module) {
  detectTechStack().then((stack) => {
    console.log('Tech Stack Detection:');
    console.log('━'.repeat(50));
    console.log(`Framework:       ${stack.framework}`);
    console.log(`Test Runner:     ${stack.testRunner}`);
    console.log(`Package Manager: ${stack.packageManager}`);
    console.log(`Has app/:        ${stack.hasAppDir}`);
    console.log(`Has pages/:      ${stack.hasPagesDir}`);
    console.log(`Has src/:        ${stack.hasSrcDir}`);
    console.log('━'.repeat(50));
  });
}
