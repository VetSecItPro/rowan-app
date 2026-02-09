#!/usr/bin/env tsx
/**
 * TestID PR Generator
 * Reads scan results and generates a PR with testid additions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ScanResult } from './types';

interface AppliedFix {
  file: string;
  line: number;
  original: string;
  updated: string;
  testId: string;
}

export async function generateTestIdPR(): Promise<void> {
  const outputDir = path.join(process.cwd(), '.test-suggestions');

  // Find latest scan result
  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('❌ No scan results found. Run scan-testids.ts first.');
    process.exit(1);
  }

  const latestFile = files.sort().reverse()[0];
  const scanResult: ScanResult = JSON.parse(
    fs.readFileSync(path.join(outputDir, latestFile), 'utf-8')
  );

  console.log(`\n🔧 Generating TestID PR from scan: ${latestFile}`);
  console.log('━'.repeat(60));

  // Focus on high-priority suggestions first
  const highPriority = scanResult.suggestions.filter((s) => s.priority === 'high');

  if (highPriority.length === 0) {
    console.log('✅ No high-priority missing testids found!');
    return;
  }

  console.log(`Found ${highPriority.length} high-priority missing testids`);
  console.log('Applying fixes...\n');

  const appliedFixes: AppliedFix[] = [];

  // Group by file for efficient processing
  const byFile = new Map<string, typeof highPriority>();
  for (const suggestion of highPriority) {
    const existing = byFile.get(suggestion.file) || [];
    existing.push(suggestion);
    byFile.set(suggestion.file, existing);
  }

  // Apply fixes file by file
  for (const [relativeFile, suggestions] of byFile.entries()) {
    const filePath = path.join(process.cwd(), relativeFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${relativeFile} (file not found)`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Sort suggestions by line number (descending) to avoid line number shifts
    const sortedSuggestions = suggestions.sort((a, b) => b.line - a.line);

    for (const suggestion of sortedSuggestions) {
      const lineIndex = suggestion.line - 1;
      if (lineIndex >= lines.length) continue;

      const originalLine = lines[lineIndex];
      let updatedLine = originalLine;

      // Apply testid based on element type
      if (suggestion.elementType === 'button') {
        if (originalLine.includes('<button')) {
          updatedLine = originalLine.replace(
            /<button/,
            `<button data-testid="${suggestion.suggestedTestId}"`
          );
        } else if (originalLine.includes('<Button')) {
          updatedLine = originalLine.replace(
            /<Button/,
            `<Button testId="${suggestion.suggestedTestId}"`
          );
        } else if (originalLine.includes('<MagneticButton')) {
          updatedLine = originalLine.replace(
            /<MagneticButton/,
            `<MagneticButton testId="${suggestion.suggestedTestId}"`
          );
        }
      } else if (suggestion.elementType === 'input') {
        updatedLine = originalLine.replace(
          /<input/,
          `<input data-testid="${suggestion.suggestedTestId}"`
        );
      } else if (suggestion.elementType === 'link') {
        if (originalLine.includes('<Link')) {
          updatedLine = originalLine.replace(
            /<Link/,
            `<Link data-testid="${suggestion.suggestedTestId}"`
          );
        } else if (originalLine.includes('<a')) {
          updatedLine = originalLine.replace(
            /<a/,
            `<a data-testid="${suggestion.suggestedTestId}"`
          );
        }
      } else if (suggestion.elementType === 'modal') {
        updatedLine = originalLine.replace(
          /<Modal/,
          `<Modal testId="${suggestion.suggestedTestId}"`
        );
      } else if (suggestion.elementType === 'select') {
        updatedLine = originalLine.replace(
          /<select/,
          `<select data-testid="${suggestion.suggestedTestId}"`
        );
      } else if (suggestion.elementType === 'textarea') {
        updatedLine = originalLine.replace(
          /<textarea/,
          `<textarea data-testid="${suggestion.suggestedTestId}"`
        );
      }

      if (updatedLine !== originalLine) {
        lines[lineIndex] = updatedLine;
        appliedFixes.push({
          file: relativeFile,
          line: suggestion.line,
          original: originalLine.trim(),
          updated: updatedLine.trim(),
          testId: suggestion.suggestedTestId,
        });
      }
    }

    // Write updated file
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`✅ Updated ${relativeFile} (${suggestions.length} fixes)`);
  }

  console.log(`\n✅ Applied ${appliedFixes.length} testid fixes`);

  // Generate PR summary
  const prTitle = `test: add ${appliedFixes.length} missing testids (high priority)`;
  const prBody = generatePRBody(scanResult, appliedFixes);

  // Save PR details
  const prDetailsFile = path.join(outputDir, 'pr-details.md');
  fs.writeFileSync(
    prDetailsFile,
    `# ${prTitle}\n\n${prBody}\n\n## Applied Fixes\n\n${appliedFixes
      .map(
        (fix) =>
          `- \`${fix.file}:${fix.line}\` - Added \`${fix.testId}\`\n  - Before: \`${fix.original}\`\n  - After: \`${fix.updated}\``
      )
      .join('\n\n')}`
  );

  console.log(`\n📄 PR details saved to: ${prDetailsFile}`);
  console.log('\n📋 PR Title:');
  console.log(prTitle);
  console.log('\n📋 PR Body:');
  console.log(prBody);

  // Instructions for creating PR
  console.log('\n📦 Next Steps:');
  console.log('1. Review the changes');
  console.log('2. Run: pnpm build && pnpm type-check');
  console.log('3. Create feature branch: git checkout -b test/add-testids-YYYY-MM-DD');
  console.log('4. Commit: git add . && git commit -m "test: add missing testids"');
  console.log('5. Push: git push -u origin test/add-testids-YYYY-MM-DD');
  console.log('6. Create PR using /gh-ship or gh CLI');
}

function generatePRBody(scanResult: ScanResult, appliedFixes: AppliedFix[]): string {
  const affectedFiles = new Set(appliedFixes.map((f) => f.file));

  return `## Summary

Automated testid additions from E2E intelligence scanner.

**Scan Date:** ${scanResult.scanDate}
**Current Coverage:** ${scanResult.currentCoverage.toFixed(2)}%
**Missing TestIDs:** ${scanResult.missingTestIds}
**Applied Fixes:** ${appliedFixes.length} (high priority only)
**Affected Files:** ${affectedFiles.size}

## Motivation

This PR adds \`data-testid\` attributes to ${appliedFixes.length} interactive elements that were missing them. These testids improve E2E test reliability by:

1. **Reducing brittle text-based selectors** - Tests won't break when button copy changes
2. **Faster test execution** - Testid lookups are more efficient than text searches
3. **Better test maintainability** - Clear, semantic selectors

## Changes

${Array.from(affectedFiles)
  .sort()
  .map((file) => {
    const fileFixes = appliedFixes.filter((f) => f.file === file);
    return `### \`${file}\` (${fileFixes.length} testids)\n\n${fileFixes
      .map((fix) => `- Line ${fix.line}: \`${fix.testId}\``)
      .join('\n')}`;
  })
  .join('\n\n')}

## Testing

- [ ] \`pnpm build\` passes
- [ ] \`pnpm type-check\` passes
- [ ] \`pnpm test:e2e\` passes (if E2E tests exist)

## Next Steps

This PR addresses **high-priority** missing testids only. The scanner found ${scanResult.missingTestIds - appliedFixes.length} additional medium/low priority items that can be addressed in future PRs.

---

*🤖 Auto-generated by E2E Intelligence Scanner*
*Generated: ${new Date().toISOString()}*
`;
}

// CLI usage
if (require.main === module) {
  generateTestIdPR().catch((error) => {
    console.error('❌ Error generating PR:', error);
    process.exit(1);
  });
}
