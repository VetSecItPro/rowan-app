---
description: Auto-push code to GitHub feature branch, run CI, monitor and report status
allowed-tools: Bash(git:*), Bash(gh:*), Bash(sleep:*)
---

# Auto Push to GitHub Feature Branch & Monitor CI

Run everything automatically - no arguments needed.

## Steps

1. **Check current branch and changes:**
```bash
git branch --show-current
git status --porcelain
git diff --stat
```

2. **Analyze changes and auto-generate:**
- Branch name: Based on files changed (e.g., `feature/bills-ui-fixes`, `fix/auth-validation`)
- Commit message: Based on diff summary, following conventional commits (feat/fix/refactor)

3. **Create branch if on main:**
```bash
git checkout -b feature/[auto-generated-name]
```

4. **Stage, commit, push:**
```bash
git add -A
git commit -m "[auto-generated-message]

Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin [branch-name]
```

5. **Monitor CI in background:**
```bash
gh run watch --exit-status
```

6. **Report:**
- ✓ Green: "CI passed - branch is ready for PR"
- ✗ Failed: "CI failed - run `gh run view` to see details"

## Auto-naming rules
- Look at changed files/folders to determine scope (bills, auth, calendar, etc.)
- Look at type of changes (new files = feat, modifications = fix/refactor)
- Keep branch name short: `feature/scope-action` or `fix/scope-issue`
- Commit message: `type(scope): brief description`
