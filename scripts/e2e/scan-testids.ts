#!/usr/bin/env tsx
/**
 * TestID Scanner
 * Scans codebase for interactive elements missing data-testid attributes
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { MissingTestId, ScanResult } from './types';
import { detectTechStack } from './detect-stack';

interface ComponentUsage {
  [componentName: string]: number;
}

const INTERACTIVE_PATTERNS = [
  // Buttons
  /<button(?![^>]*data-testid=)/g,
  /<Button(?![^>]*testId=)/g,
  /<MagneticButton(?![^>]*testId=)/g,

  // Links
  /<Link(?![^>]*data-testid=)(?![^>]*testId=)/g,
  /<a(?![^>]*data-testid=)/g,

  // Inputs
  /<input(?![^>]*data-testid=)/g,
  /<Input(?![^>]*testId=)/g,
  /<textarea(?![^>]*data-testid=)/g,
  /<select(?![^>]*data-testid=)/g,

  // Forms
  /<form(?![^>]*data-testid=)/g,

  // Modals & Dialogs
  /<Modal(?![^>]*testId=)/g,
  /<Dialog(?![^>]*testId=)/g,
  /<div(?=[^>]*role="dialog")(?![^>]*data-testid=)/g,
];

const HIGH_PRIORITY_COMPONENTS = [
  'Modal.tsx',
  'Sidebar.tsx',
  'PublicHeader.tsx',
  'magnetic-button.tsx',
  'Button.tsx',
  'Input.tsx',
];

const HIGH_PRIORITY_PATHS = [
  'app/(auth)',
  'components/ui',
  'components/navigation',
  'components/layout',
];

export async function scanForMissingTestIds(rootDir: string = process.cwd()): Promise<ScanResult> {
  const stack = await detectTechStack(rootDir);

  // Determine scan paths based on tech stack
  const scanPaths =
    stack.framework === 'next-app-router'
      ? ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}']
      : stack.framework === 'next-pages'
        ? ['pages/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}']
        : ['src/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'];

  const ignorePaths = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
  ];

  const files = await glob(scanPaths, {
    cwd: rootDir,
    ignore: ignorePaths,
    absolute: true,
  });

  const suggestions: MissingTestId[] = [];
  const componentUsage: ComponentUsage = {};

  // Track component usage for priority scoring
  for (const file of files) {
    const componentName = path.basename(file);
    componentUsage[componentName] = (componentUsage[componentName] || 0) + 1;
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(rootDir, file);
    const componentName = path.basename(file);

    // Check if this is a high-priority component/path
    const isHighPriorityComponent = HIGH_PRIORITY_COMPONENTS.some((comp) =>
      file.includes(comp)
    );
    const isHighPriorityPath = HIGH_PRIORITY_PATHS.some((p) => relativePath.startsWith(p));
    const usageCount = componentUsage[componentName] || 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for buttons
      if (/<button(?![^>]*data-testid=)/.test(line) || /<Button(?![^>]*testId=)/.test(line)) {
        const context = extractContext(line);
        const testId = generateTestId(relativePath, 'button', context);
        const priority = determinePriority(
          isHighPriorityComponent,
          isHighPriorityPath,
          usageCount
        );

        suggestions.push({
          file: relativePath,
          line: lineNumber,
          elementType: 'button',
          suggestedTestId: testId,
          context,
          priority,
          reason: getPriorityReason(priority, isHighPriorityComponent, usageCount),
        });
      }

      // Check for inputs
      if (/<input(?![^>]*data-testid=)/.test(line) || /<Input(?![^>]*testId=)/.test(line)) {
        const context = extractContext(line);
        const inputType = extractInputType(line);
        const testId = generateTestId(relativePath, inputType || 'input', context);
        const priority = determinePriority(
          isHighPriorityComponent,
          isHighPriorityPath,
          usageCount
        );

        suggestions.push({
          file: relativePath,
          line: lineNumber,
          elementType: 'input',
          suggestedTestId: testId,
          context,
          priority,
          reason: getPriorityReason(priority, isHighPriorityComponent, usageCount),
        });
      }

      // Check for links
      if (/<Link(?![^>]*data-testid=)(?![^>]*testId=)/.test(line) || /<a(?![^>]*data-testid=)/.test(line)) {
        const context = extractContext(line);
        const testId = generateTestId(relativePath, 'link', context);
        const priority = determinePriority(
          isHighPriorityComponent,
          isHighPriorityPath,
          usageCount
        );

        suggestions.push({
          file: relativePath,
          line: lineNumber,
          elementType: 'link',
          suggestedTestId: testId,
          context,
          priority,
          reason: getPriorityReason(priority, isHighPriorityComponent, usageCount),
        });
      }

      // Check for modals
      if (/<Modal(?![^>]*testId=)/.test(line) || /<Dialog(?![^>]*testId=)/.test(line)) {
        const context = extractContext(line);
        const testId = generateTestId(relativePath, 'modal', context);
        const priority = 'high'; // Modals are always high priority

        suggestions.push({
          file: relativePath,
          line: lineNumber,
          elementType: 'modal',
          suggestedTestId: testId,
          context,
          priority,
          reason: 'Modal component - affects multiple features',
        });
      }

      // Check for selects and textareas
      if (/<select(?![^>]*data-testid=)/.test(line)) {
        const context = extractContext(line);
        const testId = generateTestId(relativePath, 'select', context);
        const priority = determinePriority(
          isHighPriorityComponent,
          isHighPriorityPath,
          usageCount
        );

        suggestions.push({
          file: relativePath,
          line: lineNumber,
          elementType: 'select',
          suggestedTestId: testId,
          context,
          priority,
          reason: getPriorityReason(priority, isHighPriorityComponent, usageCount),
        });
      }

      if (/<textarea(?![^>]*data-testid=)/.test(line)) {
        const context = extractContext(line);
        const testId = generateTestId(relativePath, 'textarea', context);
        const priority = determinePriority(
          isHighPriorityComponent,
          isHighPriorityPath,
          usageCount
        );

        suggestions.push({
          file: relativePath,
          line: lineNumber,
          elementType: 'textarea',
          suggestedTestId: testId,
          context,
          priority,
          reason: getPriorityReason(priority, isHighPriorityComponent, usageCount),
        });
      }
    }
  }

  const totalComponents = files.length;
  const componentsWithTestIds = files.filter((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    return /data-testid=|testId=/.test(content);
  }).length;

  const currentCoverage = totalComponents > 0 ? (componentsWithTestIds / totalComponents) * 100 : 0;

  return {
    repo: path.basename(rootDir),
    scanDate: new Date().toISOString().split('T')[0],
    totalFiles: files.length,
    totalComponents,
    missingTestIds: suggestions.length,
    currentCoverage: Math.round(currentCoverage * 100) / 100,
    suggestions: suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
  };
}

function extractContext(line: string): string {
  // Extract text content or aria-label
  const textMatch = line.match(/>(.*?)</);
  if (textMatch && textMatch[1].trim()) {
    return textMatch[1].trim().slice(0, 30);
  }

  const ariaLabelMatch = line.match(/aria-label=["']([^"']+)["']/);
  if (ariaLabelMatch) {
    return ariaLabelMatch[1].slice(0, 30);
  }

  const placeholderMatch = line.match(/placeholder=["']([^"']+)["']/);
  if (placeholderMatch) {
    return placeholderMatch[1].slice(0, 30);
  }

  return '';
}

function extractInputType(line: string): string | null {
  const typeMatch = line.match(/type=["']([^"']+)["']/);
  return typeMatch ? typeMatch[1] : null;
}

function generateTestId(filePath: string, elementType: string, context: string): string {
  // Extract context from file path
  const parts = filePath.split('/');
  let contextPrefix = '';

  // Determine context based on file location
  if (filePath.includes('app/(auth)')) {
    if (filePath.includes('login')) contextPrefix = 'login';
    else if (filePath.includes('signup')) contextPrefix = 'signup';
    else contextPrefix = 'auth';
  } else if (filePath.includes('components/navigation')) {
    contextPrefix = 'nav';
  } else if (filePath.includes('components/ui/Modal')) {
    contextPrefix = 'modal';
  } else if (filePath.includes('components/home')) {
    contextPrefix = 'hero';
  } else if (filePath.includes('PublicHeader')) {
    contextPrefix = 'public-header';
  } else if (filePath.includes('Sidebar')) {
    contextPrefix = 'sidebar';
  } else {
    // Use file name as context
    const fileName = parts[parts.length - 1].replace(/\.(tsx?|jsx?)$/, '');
    contextPrefix = fileName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  // Generate action based on element type
  let action = elementType;
  if (elementType === 'button') {
    if (context.toLowerCase().includes('submit')) action = 'submit-button';
    else if (context.toLowerCase().includes('close')) action = 'close-button';
    else if (context.toLowerCase().includes('cancel')) action = 'cancel-button';
    else if (context.toLowerCase().includes('save')) action = 'save-button';
    else if (context.toLowerCase().includes('delete')) action = 'delete-button';
    else if (context.toLowerCase().includes('upgrade')) action = 'upgrade-button';
    else if (context.toLowerCase().includes('sign')) action = 'signup-button';
    else action = 'button';
  } else if (elementType === 'input') {
    action = 'input';
  } else if (elementType === 'email') {
    action = 'email-input';
  } else if (elementType === 'password') {
    action = 'password-input';
  }

  // Clean and combine
  const cleanContext = context
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 20);

  if (cleanContext) {
    return `${contextPrefix}-${cleanContext}-${action}`.replace(/--+/g, '-');
  }

  return `${contextPrefix}-${action}`.replace(/--+/g, '-');
}

function determinePriority(
  isHighPriorityComponent: boolean,
  isHighPriorityPath: boolean,
  usageCount: number
): MissingTestId['priority'] {
  if (isHighPriorityComponent || usageCount > 10) {
    return 'high';
  }
  if (isHighPriorityPath || usageCount > 5) {
    return 'medium';
  }
  return 'low';
}

function getPriorityReason(
  priority: MissingTestId['priority'],
  isHighPriorityComponent: boolean,
  usageCount: number
): string {
  if (priority === 'high') {
    if (isHighPriorityComponent) {
      return 'Base component used in multiple features';
    }
    return `Widely used component (${usageCount} usages)`;
  }
  if (priority === 'medium') {
    return 'Moderately used component';
  }
  return 'Low usage component';
}

// CLI usage
if (require.main === module) {
  scanForMissingTestIds().then((result) => {
    console.log('\n🔍 TestID Scanner Results');
    console.log('━'.repeat(60));
    console.log(`Repository:       ${result.repo}`);
    console.log(`Scan Date:        ${result.scanDate}`);
    console.log(`Files Scanned:    ${result.totalFiles}`);
    console.log(`Components:       ${result.totalComponents}`);
    console.log(`Coverage:         ${result.currentCoverage.toFixed(2)}%`);
    console.log(`Missing TestIDs:  ${result.missingTestIds}`);
    console.log('━'.repeat(60));

    // Group by priority
    const high = result.suggestions.filter((s) => s.priority === 'high');
    const medium = result.suggestions.filter((s) => s.priority === 'medium');
    const low = result.suggestions.filter((s) => s.priority === 'low');

    console.log(`\n🔴 High Priority:   ${high.length}`);
    console.log(`🟡 Medium Priority: ${medium.length}`);
    console.log(`🟢 Low Priority:    ${low.length}`);

    // Save results
    const outputDir = path.join(process.cwd(), '.test-suggestions');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `${result.scanDate}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

    console.log(`\n✅ Results saved to: ${outputFile}`);
    console.log('\nTop 10 High Priority Missing TestIDs:');
    console.log('━'.repeat(60));

    high.slice(0, 10).forEach((suggestion, i) => {
      console.log(`${i + 1}. ${suggestion.file}:${suggestion.line}`);
      console.log(`   Suggested: data-testid="${suggestion.suggestedTestId}"`);
      console.log(`   Reason: ${suggestion.reason}`);
      console.log('');
    });
  });
}
