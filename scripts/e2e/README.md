# E2E Intelligence System

An intelligent, self-improving E2E testing infrastructure that automatically scans for missing testids, analyzes code changes, and runs only relevant tests.

## 🎯 Goals

1. **Reduce ship time** from 45 minutes to <15 minutes
2. **Eliminate brittle selectors** that break when copy changes
3. **Run tests intelligently** based on what actually changed
4. **Self-maintain** through automated weekly scans

## 📦 Components

### Phase 1: Automated TestID Scanner ✅

Scans codebase for interactive elements missing `data-testid` attributes.

**Scripts:**
- `scan-testids.ts` - Main scanner logic
- `detect-stack.ts` - Tech stack auto-detection
- `generate-testids.ts` - PR generator for fixes
- `types.ts` - TypeScript interfaces

**Workflow:**
- `.github/workflows/testid-scanner.yml` - Weekly automation (Mondays at midnight UTC)

**Usage:**
```bash
# Run scanner manually
pnpm tsx scripts/e2e/scan-testids.ts

# Generate PR with fixes
pnpm tsx scripts/e2e/generate-testids.ts
```

**Output:**
- Saves results to `.test-suggestions/YYYY-MM-DD.json`
- Groups findings by priority (high/medium/low)
- Generates PR with high-priority fixes

### Phase 2: Intelligent CI Workflow ✅

Analyzes changed files and runs only relevant tests.

**Scripts:**
- `analyze-changes.ts` - Change analyzer
- `select-tests.ts` - Test selector
- `repo-config.ts` - Multi-repo configuration

**Workflow:**
- `.github/workflows/smart-e2e.yml` - Smart E2E workflow

**Logic:**
```
docs-only changes          → Skip E2E entirely
auth changes               → Run auth tests only
critical components        → Run full suite
specific feature changes   → Run feature tests only
```

**Usage:**
```bash
# Analyze changes manually
pnpm tsx scripts/e2e/analyze-changes.ts

# Select tests based on changes
pnpm tsx scripts/e2e/select-tests.ts
```

## 🧪 Testing the System

### Test Tech Stack Detection
```bash
pnpm tsx scripts/e2e/detect-stack.ts
# Expected: next-app-router, playwright, pnpm
```

### Test Scanner
```bash
pnpm tsx scripts/e2e/scan-testids.ts
# Expected: Finds 2000+ missing testids, saves to .test-suggestions/
```

### Test Change Analyzer

**Scenario 1: Docs-only changes**
```bash
echo -e "docs/README.md\ndocs/ARCHITECTURE.md" > /tmp/test-changes.txt
pnpm tsx scripts/e2e/analyze-changes.ts /tmp/test-changes.txt
# Expected: skip-e2e=true, reason="Only docs/non-code files changed"
```

**Scenario 2: Auth changes**
```bash
echo -e "app/(auth)/login/page.tsx" > /tmp/test-changes.txt
pnpm tsx scripts/e2e/analyze-changes.ts /tmp/test-changes.txt
# Expected: skip-e2e=false, test-suite=["auth-flow.spec.ts", "auth.setup.ts"]
```

**Scenario 3: Critical component changes**
```bash
echo -e "components/ui/Modal.tsx" > /tmp/test-changes.txt
pnpm tsx scripts/e2e/analyze-changes.ts /tmp/test-changes.txt
# Expected: skip-e2e=false, test-suite=["**/*.spec.ts"], reason="Critical paths changed"
```

**Scenario 4: Feature-specific changes**
```bash
echo -e "app/(main)/tasks/page.tsx" > /tmp/test-changes.txt
pnpm tsx scripts/e2e/analyze-changes.ts /tmp/test-changes.txt
# Expected: skip-e2e=false, test-suite=["tasks.spec.ts"]
```

## 📊 Current Status

### Phase 1 Status: ✅ Complete
- ✅ Scanner built and tested
- ✅ Found 2,682 missing testids (1,695 high priority)
- ✅ Current coverage: 0% (baseline established)
- ✅ Weekly automation configured
- ✅ PR generator ready

### Phase 2 Status: ✅ Complete
- ✅ Change analyzer built and tested
- ✅ Test selector working
- ✅ Multi-repo config created
- ✅ Smart E2E workflow configured
- ✅ All test scenarios validated

## 🔮 Next Phases

### Phase 3: Self-Healing Tests (Planned)
- Resilient selector helpers
- Auto-suggestion on failure
- Rewrite existing tests to use resilient selectors
- Add testids to high-priority components

### Phase 4: Cross-Repo Library (Planned)
- Create `e2e-intelligence` shared repo
- Reusable workflow templates
- Cross-repo metrics dashboard

### Phase 5: Documentation System (Planned)
- Auto-generated E2E pattern docs
- Coverage tracking
- Weekly health reports

## 📈 Expected Impact

### Time Savings
- **Before:** 45 min ship time (E2E failures + iterations)
- **After Phase 2:** ~20 min (intelligent test selection)
- **After Phase 3:** <15 min (self-healing tests)

### Test Reliability
- **Before:** 47+ brittle text-based selectors
- **After Phase 3:** 0 brittle selectors (all use testids)

### Maintenance Effort
- **Before:** Manual intervention on every E2E failure
- **After Phase 5:** Near-zero (automated scanning + self-healing)

## 🛠️ Configuration

### Adding New Feature Mappings

Edit `scripts/e2e/repo-config.ts`:

```typescript
export const FEATURE_TEST_MAP: Record<string, string[]> = {
  // Add new feature
  'app/(main)/new-feature': ['new-feature.spec.ts'],
};
```

### Adjusting Test Selection

Edit critical paths in `repo-config.ts`:

```typescript
export const FULL_E2E_PATHS = [
  'components/ui/**',        // Always runs full suite
  'components/navigation/**', // Always runs full suite
  // Add more critical paths
];
```

### Skip Patterns

Edit skip patterns in `repo-config.ts`:

```typescript
export const SKIP_E2E_PATHS = [
  'docs/**',           // Skip E2E for docs
  '*.md',              // Skip for markdown files
  // Add more skip patterns
];
```

## 🔄 Workflows

### Weekly TestID Scan (Automated)
1. Runs every Monday at midnight UTC
2. Scans codebase for missing testids
3. Generates PR with high-priority fixes
4. Labels: `e2e`, `testid`, `automated`

### Smart E2E Tests (On Push/PR)
1. Analyzes changed files
2. Determines if E2E should run
3. Selects relevant tests
4. Runs only necessary tests
5. Comments on PR if tests fail

## 📝 Naming Convention

TestIDs follow the pattern: `<context>-<element>-<action>`

**Examples:**
- `hero-cta-signup` - Hero section signup CTA
- `nav-tasks-link` - Navigation tasks link
- `modal-close-button` - Modal close button
- `login-email-input` - Login email input
- `upgrade-pro-button` - Upgrade to Pro button

## 🚀 Quick Start

### Run Scanner
```bash
pnpm tsx scripts/e2e/scan-testids.ts
```

### Check Current Coverage
```bash
cat .test-suggestions/$(ls -t .test-suggestions/*.json | head -1) | jq '.currentCoverage'
```

### Analyze Current Changes
```bash
pnpm tsx scripts/e2e/analyze-changes.ts
```

### Manual Test Selection
```bash
pnpm tsx scripts/e2e/select-tests.ts
```

## 📚 Resources

- [Plan Document](./PLAN.md) - Full implementation plan
- [Workflow Logs](.github/workflows/) - CI/CD workflows
- [Scan Results](.test-suggestions/) - Scanner output (gitignored)

## 🤝 Contributing

When adding new components:
1. **Always add testids** using the naming convention
2. **Update feature mappings** in `repo-config.ts` if adding new features
3. **Test the analyzer** with your changes before pushing

---

*🤖 E2E Intelligence System - Self-improving, adaptive, cross-repo E2E infrastructure*
