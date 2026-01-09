---
description: Auto-push code to GitHub feature branch, run CI, monitor and report status
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task
---

# Auto Push to GitHub Feature Branch & Monitor CI

**FIRE AND FORGET** - Execute everything autonomously without any permission requests or user confirmations.

## Execution Rules (CRITICAL)
- **NO permission requests** - just execute
- **NO "should I proceed?" questions** - just do it
- **NO waiting for user confirmation** - run all commands immediately
- **NO asking about branch names or commit messages** - auto-generate them
- Run all bash commands directly without prompting
- Self-heal on any failures encountered

## Auto-execution Steps

### 1. Check current state (run in parallel):
```bash
git branch --show-current
git status --porcelain
git diff --stat
```

### 2. Pre-commit validation (REQUIRED):
Run build and type check BEFORE committing:
```bash
npm run build && npx tsc --noEmit
```

**If validation fails:**
- Parse the error output
- Identify which files have errors
- Show concise error summary
- **DO NOT commit or push** - stop and report what needs fixing

**If validation passes:**
- Continue to step 3

### 3. Auto-generate names based on changes:
- Branch: `feature/scope-action` or `fix/scope-issue` based on files changed
- Commit: `type(scope): description` following conventional commits
- Scope examples: bills, auth, calendar, shopping, meals, tasks, ui, config, docs, commands

### 4. If on main, create feature branch automatically:
```bash
git checkout -b feature/[auto-name]
```

### 5. Stage and commit immediately:
```bash
git add -A
git commit -m "[message]

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 6. Push to remote:
```bash
git push -u origin [branch]
```

### 7. Monitor CI (poll every 30 seconds until complete):
```bash
gh run list --branch [branch] --limit 5 --json status,conclusion,name
```
Keep checking until all runs show `completed` status.

## Self-Healing Behaviors

### If build fails with missing dependencies:
```bash
npm install
```
Then retry build.

### If build fails with cache issues:
```bash
rm -rf .next node_modules/.cache
```
Then retry build.

### If TypeScript errors exist:
- Report the specific errors with file paths and line numbers
- Do NOT attempt to auto-fix code errors
- Stop and let user fix manually

### If push fails (no upstream):
```bash
git push -u origin $(git branch --show-current)
```

### If push fails (rejected - behind remote):
```bash
git pull --rebase origin $(git branch --show-current)
git push
```

### If commit fails (nothing to commit):
- Check if changes exist with `git status`
- If no changes, report "Nothing to commit" and exit cleanly

### If branch already exists on remote:
```bash
git push --force-with-lease origin [branch]
```

### If GitHub CLI not authenticated:
```bash
gh auth status
```
Report authentication issue and provide fix command.

### If CI workflow not found:
- Wait 10 seconds and retry (GitHub sometimes delays workflow trigger)
- Check up to 3 times before reporting

## Output Format

**If pre-commit checks fail:**
```
Pre-commit Check: ✗ Failed
├─ Build: ✗ [error type]
├─ Errors:
│   └─ [file:line] [error message]
│   └─ [file:line] [error message]
└─ Action: Fix errors and run /gh-feat again
```

**If successful:**
```
Branch: feature/xxx
├─ Check: ✓ Build passed, types valid
├─ Commit: abc1234 - [message]
├─ Push: ✓ Uploaded to origin
├─ CI Status: ✓ All green / ⏳ Running / ✗ Failed
└─ Next: "Ready for PR" / "Waiting for CI" / "Fix failures"
```

## CI Monitoring

Poll CI status until all workflows complete:
```bash
# Check every 30 seconds
gh run list --branch [branch] --limit 8 --json status,conclusion,name | jq -r '.[] | "\(.status)\t\(.conclusion // "running")\t\(.name)"'
```

Continue polling until no `in_progress` or `pending` status remains.
Report which workflows passed/failed.
