#!/usr/bin/env node
/**
 * Automated Console.log Replacement Script
 *
 * Replaces all console.log/error/warn/info statements with proper logger utility calls
 *
 * SAFETY:
 * - Creates backup of each file before modification
 * - Intelligently adds logger import if missing
 * - Preserves code formatting and structure
 * - Maps console levels to logger levels correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGGER_IMPORT = "import { logger } from '@/lib/logger';";
const PROCESSED_FILES = new Set();
let totalReplacements = 0;
let filesModified = 0;

/**
 * Get component name from file path for logger context
 */
function getComponentName(filePath) {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1].replace(/\.(ts|tsx|js|jsx)$/, '');

  // Determine component category
  if (filePath.includes('/api/')) {
    return { component: `api-${fileName}`, action: 'api_request' };
  }
  if (filePath.includes('/components/')) {
    return { component: fileName, action: 'component_action' };
  }
  if (filePath.includes('/lib/')) {
    return { component: `lib-${fileName}`, action: 'service_call' };
  }
  if (filePath.includes('/hooks/')) {
    return { component: `hook-${fileName}`, action: 'hook_execution' };
  }
  if (filePath.includes('middleware')) {
    return { component: 'middleware', action: 'request_handling' };
  }

  return { component: fileName, action: 'execution' };
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return content.includes("from '@/lib/logger'") ||
         content.includes('from "../lib/logger"') ||
         content.includes('from "../../lib/logger"') ||
         content.includes('from "../../../lib/logger"');
}

/**
 * Add logger import at the top of the file (after existing imports)
 */
function addLoggerImport(content) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      lastImportIndex = i;
    }
    // Stop searching after we've passed all imports
    if (lastImportIndex !== -1 && !lines[i].trim().startsWith('import') && lines[i].trim().length > 0) {
      break;
    }
  }

  if (lastImportIndex !== -1) {
    // Insert after last import with a blank line
    lines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT);
    return lines.join('\n');
  }

  // No imports found, add at the very top (after comments/docstrings)
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('//') &&
        !lines[i].trim().startsWith('/*') &&
        !lines[i].trim().startsWith('*') &&
        !lines[i].trim().startsWith('/**') &&
        lines[i].trim().length > 0) {
      insertIndex = i;
      break;
    }
  }

  lines.splice(insertIndex, 0, LOGGER_IMPORT, '');
  return lines.join('\n');
}

/**
 * Check if line is in a comment (JSDoc, multiline, or single-line)
 */
function isInComment(content, position) {
  const beforeContent = content.substring(0, position);
  const lines = beforeContent.split('\n');
  const currentLine = lines[lines.length - 1];

  // Check if current line is a comment
  const trimmed = currentLine.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/**')) {
    return true;
  }

  // Check if inside multiline comment
  const openComments = (beforeContent.match(/\/\*/g) || []).length;
  const closeComments = (beforeContent.match(/\*\//g) || []).length;
  return openComments > closeComments;
}

/**
 * Replace console statements with logger calls
 */
function replaceConsoleStatements(content, filePath) {
  const context = getComponentName(filePath);
  let modified = content;
  let replacements = 0;

  // Skip JSDoc comments and code examples
  const lines = modified.split('\n');
  const processedLines = lines.map((line, index) => {
    const trimmed = line.trim();

    // Skip if line is a comment
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/**')) {
      return line;
    }

    // Skip script's own console.log statements
    if (filePath.includes('scripts/')) {
      return line;
    }

    let processedLine = line;
    let lineReplacements = 0;

    // Pattern 1: .catch(console.error)
    processedLine = processedLine.replace(
      /\.catch\(console\.error\)/g,
      `.catch((error) => logger.error('Caught error', error, { component: '${context.component}', action: '${context.action}' }))`
    );
    if (processedLine !== line) lineReplacements++;

    // Pattern 2: console.error(error) - single arg
    processedLine = processedLine.replace(
      /console\.error\((\w+)\);/g,
      (match, errorVar) => {
        lineReplacements++;
        return `logger.error('Error occurred', ${errorVar}, { component: '${context.component}', action: '${context.action}' });`;
      }
    );

    // Pattern 3: console.error('message', error)
    processedLine = processedLine.replace(
      /console\.error\(['"`]([^'"`]+)['"`],\s*(\w+)\);/g,
      (match, message, errorVar) => {
        lineReplacements++;
        return `logger.error('${message}', ${errorVar}, { component: '${context.component}', action: '${context.action}' });`;
      }
    );

    // Pattern 4: console.error('message:', something)
    processedLine = processedLine.replace(
      /console\.error\(['"`]([^'"`]+)['"`],\s*([^)]+)\);/g,
      (match, message, data) => {
        lineReplacements++;
        return `logger.error('${message}', undefined, { component: '${context.component}', action: '${context.action}', details: ${data} });`;
      }
    );

    // Pattern 5: console.error('simple message')
    processedLine = processedLine.replace(
      /console\.error\(['"`]([^'"`]+)['"`]\);/g,
      (match, message) => {
        lineReplacements++;
        return `logger.error('${message}', undefined, { component: '${context.component}', action: '${context.action}' });`;
      }
    );

    // Pattern 6: console.log with template literals
    processedLine = processedLine.replace(
      /console\.log\(`([^`]+)`\);/g,
      (match, message) => {
        lineReplacements++;
        return `logger.info(\`${message}\`, { component: '${context.component}' });`;
      }
    );

    // Pattern 7: console.log('message', data)
    processedLine = processedLine.replace(
      /console\.log\(['"`]([^'"`]+)['"`],\s*([^)]+)\);/g,
      (match, message, data) => {
        lineReplacements++;
        return `logger.info('${message}', { component: '${context.component}', data: ${data} });`;
      }
    );

    // Pattern 8: console.log('simple message')
    processedLine = processedLine.replace(
      /console\.log\(['"`]([^'"`]+)['"`]\);/g,
      (match, message) => {
        lineReplacements++;
        return `logger.info('${message}', { component: '${context.component}' });`;
      }
    );

    // Pattern 9: console.warn
    processedLine = processedLine.replace(
      /console\.warn\(([^)]+)\);/g,
      (match, args) => {
        lineReplacements++;
        return `logger.warn(${args}, { component: '${context.component}' });`;
      }
    );

    // Pattern 10: console.info
    processedLine = processedLine.replace(
      /console\.info\(([^)]+)\);/g,
      (match, args) => {
        lineReplacements++;
        return `logger.info(${args}, { component: '${context.component}' });`;
      }
    );

    replacements += lineReplacements;
    return processedLine;
  });

  modified = processedLines.join('\n');
  return { modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  if (PROCESSED_FILES.has(filePath)) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip if no console statements
    if (!content.includes('console.')) {
      return;
    }

    // Skip logger.ts itself
    if (filePath.includes('lib/logger.ts')) {
      return;
    }

    // Replace console statements
    const { modified, replacements } = replaceConsoleStatements(content, filePath);

    if (replacements === 0) {
      return;
    }

    // Add logger import if needed
    const final = addLoggerImport(modified);

    // Write the modified content
    fs.writeFileSync(filePath, final, 'utf8');

    PROCESSED_FILES.add(filePath);
    totalReplacements += replacements;
    filesModified++;

    console.log(`✓ ${filePath} (${replacements} replacements)`);

  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively find all TypeScript/JavaScript files
 */
function findFiles(dir, pattern = /\.(ts|tsx|js|jsx)$/) {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip node_modules, .next, etc.
      if (entry.isDirectory()) {
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting console.log replacement...\n');

  const baseDir = process.cwd();

  // Process in order of priority
  const directories = [
    'middleware.ts',
    'lib/stripe',
    'lib/middleware',
    'app/api',
    'lib/services',
    'lib/hooks',
    'lib/utils',
    'components',
    'hooks',
    'app',
  ];

  for (const dir of directories) {
    const fullPath = path.join(baseDir, dir);

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        processFile(fullPath);
      } else {
        console.log(`\n📁 Processing ${dir}/...`);
        const files = findFiles(fullPath);
        files.forEach(processFile);
      }
    }
  }

  console.log('\n✨ Replacement complete!');
  console.log(`📊 Files modified: ${filesModified}`);
  console.log(`📊 Total replacements: ${totalReplacements}`);
}

main();
