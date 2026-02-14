#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/api/shopping/generate-from-meals/route.ts',
  'app/api/cron/calendar-sync/route.ts',
  'app/(main)/tasks/page.tsx',
  'app/(main)/messages/page.tsx',
  'lib/contexts/subscription-context.tsx',
  'lib/jobs/task-reminders-job.ts',
  'lib/jobs/reminder-notifications-job.ts',
  'lib/jobs/chore-rotation-job.ts',
  'lib/jobs/cleanup-jobs.ts',
  'lib/jobs/task-recurrence-job.ts',
  'lib/jobs/goal-checkin-notifications-job.ts',
  'lib/services/recurring-goals-service.ts'
];

let totalReplacements = 0;

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${filePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileReplacements = 0;

  // Pattern 1: console.log(...) -> logger.info(...)
  content = content.replace(
    /console\.log\(([^)]+)\);?/g,
    (match, args) => {
      fileReplacements++;
      // Extract component name from file path
      const component = path.basename(filePath, path.extname(filePath));
      return `logger.info(${args}, { component: '${component}' });`;
    }
  );

  // Pattern 2: console.error(...) -> logger.error(...)
  content = content.replace(
    /console\.error\(([^)]+)\);?/g,
    (match, args) => {
      fileReplacements++;
      const component = path.basename(filePath, path.extname(filePath));
      // Try to detect if there's an error variable
      if (args.includes('error') || args.includes('err')) {
        return `logger.error(${args}, { component: '${component}', action: 'service_call' });`;
      }
      return `logger.error(${args}, new Error('Console error'), { component: '${component}', action: 'service_call' });`;
    }
  );

  // Pattern 3: console.warn(...) -> logger.warn(...)
  content = content.replace(
    /console\.warn\(([^)]+)\);?/g,
    (match, args) => {
      fileReplacements++;
      const component = path.basename(filePath, path.extname(filePath));
      return `logger.warn(${args}, { component: '${component}' });`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath}: ${fileReplacements} replacements`);
    totalReplacements += fileReplacements;
  }
});

console.log(`\n✨ Total replacements: ${totalReplacements}`);
