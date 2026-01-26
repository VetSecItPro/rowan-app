---
description: Run Playwright browser tests with Chrome (auto-launches browser)
allowed-tools: Bash(npm *), Bash(npx *), Bash(pkill *), Bash(lsof *), Bash(kill *), Bash(cat *), Bash(ls *), Bash(head *), Bash(tail *), Bash(grep *), Read, Write, Edit, Glob, Grep, Task
---

# Browser Testing with Playwright

**FIRE AND FORGET** - Execute tests autonomously without permission requests.

## Usage

When user says:
- "test" or "/test" → Run all tests in headed Chrome
- "test monetization" → Run monetization tests only
- "test smoke" → Run smoke tests only
- "test [filename]" → Run specific test file
- "test ui" → Open Playwright UI for interactive testing
- "test debug" → Run tests in debug mode with step-through

## Execution Rules (CRITICAL)
- **NO permission requests** - just execute
- **NO "should I proceed?" questions** - just do it
- **Auto-start dev server** if not running
- **Auto-launch Chrome** in headed mode for visibility
- Report results clearly

## Commands

### Run All Tests (Default)
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:watch
```

### Run Specific Test File
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:file -- tests/e2e/[filename].spec.ts
```

### Run Monetization Tests
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:monetization
```

### Run Smoke Tests
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:smoke
```

### Open Playwright UI
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:ui
```

### Debug Mode (Step Through)
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:debug
```

### Slow Motion (500ms delay between actions)
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:slow
```

### View Last Report
```bash
cd /Users/airborneshellback/vibecode-projects/rowan-app && npm run test:report
```

## Pre-Flight Checks

Before running tests, ensure:
1. Dev server is running (`npm run dev`) - tests auto-start it if not
2. No process blocking port 3000

### If port 3000 is blocked:
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
```

## Output Format

Report results clearly:
```
Playwright Tests: ✓ Completed
├─ Tests: 12 passed, 0 failed
├─ Duration: 45s
├─ Browser: Chrome (headed)
└─ Report: playwright-report/index.html
```

If failures:
```
Playwright Tests: ✗ Failed
├─ Tests: 10 passed, 2 failed
├─ Failed:
│   ├─ monetization.spec.ts:34 - "pricing page displays correctly"
│   └─ smoke.spec.ts:78 - "task creation works"
├─ Screenshots: test-results/
└─ Report: Run `npm run test:report` to view
```

## Available Test Files

- `tests/e2e/monetization.spec.ts` - Subscription features, pricing, checkout
- `tests/e2e/smoke.spec.ts` - Core functionality smoke tests
- `tests/e2e/helpers/test-utils.ts` - Shared test utilities

## Creating New Tests

When asked to create a new test:
1. Create file at `tests/e2e/[feature].spec.ts`
2. Import from `@playwright/test`
3. Use helpers from `./helpers/test-utils`
4. Run to verify

Example template:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rowan/);
  });
});
```
