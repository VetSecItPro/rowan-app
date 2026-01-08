---
description: Auto-push code to GitHub feature branch, run CI, monitor and report status
allowed-tools: Bash(*), Read, Glob, Grep
---

# Auto Push to GitHub Feature Branch & Monitor CI

**FIRE AND FORGET** - Execute everything autonomously without any permission requests or user confirmations.

## Execution Rules (CRITICAL)
- **NO permission requests** - just execute
- **NO "should I proceed?" questions** - just do it
- **NO waiting for user confirmation** - run all commands immediately
- **NO asking about branch names or commit messages** - auto-generate them
- Run all bash commands directly without prompting

## Auto-execution Steps

1. **Immediately check current state (run in parallel):**
   - `git branch --show-current`
   - `git status --porcelain`
   - `git diff --stat`

2. **Auto-generate names based on changes:**
   - Branch: `feature/scope-action` or `fix/scope-issue` based on files changed
   - Commit: `type(scope): description` following conventional commits
   - Scope examples: bills, auth, calendar, shopping, meals, tasks, ui, config, docs

3. **If on main, create feature branch automatically:**
   - `git checkout -b feature/[auto-name]`

4. **Stage and commit immediately:**
   - `git add -A`
   - `git commit -m "[message]\n\nCo-Authored-By: Claude <noreply@anthropic.com>"`

5. **Push to remote:**
   - `git push -u origin [branch]`

6. **Monitor CI (poll every 30 seconds until complete):**
   - `gh run list --branch [branch] --limit 5`
   - Keep checking until all runs are completed
   - Report final status

## Output Format
After completion, report concisely:
- Branch: `feature/xxx`
- Commit: `abc1234`
- CI Status: ✓ All green / ✗ Failed (with which workflow)
- Next: "Ready for PR" or "Fix failures first"
