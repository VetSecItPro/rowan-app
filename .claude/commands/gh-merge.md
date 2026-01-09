---
description: Merge PR to main after CI passes, cleanup branches, resolve conflicts automatically
allowed-tools: Bash(git *), Bash(gh *), Bash(npm *), Bash(npx *), Bash(sleep *), Bash(jq *), Bash(cat *), Bash(rm *), Bash(mkdir *), Bash(ls *), Bash(head *), Bash(tail *), Bash(grep *), Bash(find *), Bash(xargs *), Bash(kill *), Bash(pkill *), Bash(lsof *), Bash(echo *), Bash(source *), Bash(export *), Read, Write, Edit, Glob, Grep, Task
---

# Auto Merge PR & Cleanup

**FIRE AND FORGET** - Execute everything autonomously without any permission requests or user confirmations.

## Execution Rules (CRITICAL)
- **NO permission requests** - just execute
- **NO "should I proceed?" questions** - just do it
- **NO waiting for user confirmation** - run all commands immediately
- **NO asking about merge strategies** - auto-resolve conflicts
- Run all bash commands directly without prompting
- If conflicts occur, resolve them automatically using best judgment
- Self-heal on any failures encountered

## Pre-merge Validation (run in parallel)

### 1. Check current state:
```bash
git branch --show-current
git status --porcelain
git log origin/main..HEAD --oneline
```

### 2. Check for unpushed changes:
```bash
git fetch origin
git diff origin/$(git branch --show-current)..HEAD --stat 2>/dev/null || echo "No remote branch"
```

### 3. Find associated PR:
```bash
gh pr list --head $(git branch --show-current) --json number,title,state,mergeable,mergeStateStatus
```

### 4. Check CI status:
```bash
gh pr checks $(gh pr list --head $(git branch --show-current) --json number -q '.[0].number') 2>/dev/null
```

## Self-Healing Behaviors

### If unpushed local changes exist:
```bash
git add -A
git commit -m "chore: sync local changes before merge

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```
Then wait for CI to run and pass.

### If CI is still running:
Poll every 30 seconds until all checks complete:
```bash
gh pr checks [PR_NUMBER] --watch
```

### If no PR exists for current branch:
```bash
gh pr create --fill --head $(git branch --show-current)
```
Then wait for CI and retry merge.

### If merge conflicts exist (rebase strategy):
```bash
git fetch origin main
git rebase origin/main
```

If rebase has conflicts:
1. For `package-lock.json`:
   ```bash
   git checkout --theirs package-lock.json
   npm install
   git add package-lock.json
   git rebase --continue
   ```
2. For generated files (`.next`, `dist`):
   ```bash
   git rm -rf .next dist 2>/dev/null
   git rebase --continue
   ```
3. For source code conflicts:
   - Read both versions
   - Keep feature branch changes (ours) as primary
   - Integrate any non-conflicting main updates
   - `git add [resolved-files] && git rebase --continue`

After rebase:
```bash
git push --force-with-lease
```
Wait for CI to re-run and pass.

### If PR is not mergeable (GitHub says conflicts):
```bash
git fetch origin main
git merge origin/main --no-edit
```
Resolve conflicts same as rebase strategy, then:
```bash
git push
```

### If PR merge fails (branch protection):
Try with admin flag if available:
```bash
gh pr merge [PR_NUMBER] --squash --delete-branch --admin
```

### If remote branch already deleted:
Skip remote deletion step, continue with local cleanup.

## Merge Execution

Once all checks pass and PR is mergeable:

```bash
# Get PR number
PR_NUM=$(gh pr list --head $(git branch --show-current) --json number -q '.[0].number')

# Merge using squash (cleaner history)
gh pr merge $PR_NUM --squash --delete-branch
```

## Post-merge Cleanup (run sequentially)

### 1. Switch to main and pull:
```bash
git checkout main
git pull origin main
```

### 2. Delete local feature branch:
```bash
BRANCH=$(git branch --show-current 2>/dev/null)
git branch -d $BRANCH 2>/dev/null || git branch -D $BRANCH 2>/dev/null || true
```

### 3. Prune remote tracking branches:
```bash
git fetch --prune
git remote prune origin
```

### 4. Clean up any stale local branches:
```bash
git branch --merged main | grep -v "main" | grep -v "master" | xargs -r git branch -d 2>/dev/null || true
```

### 5. Verify cleanup:
```bash
git branch -a
```

## Background Monitoring

After initiating merge, monitor in background:
```bash
# Check merge status every 15 seconds
while true; do
  STATE=$(gh pr view $PR_NUM --json state -q '.state')
  if [ "$STATE" = "MERGED" ]; then
    echo "PR merged successfully"
    break
  fi
  sleep 15
done
```

Once merged, proceed with cleanup automatically.

## Output Format

Report concisely after completion:
```
PR #[number]: [title]
├─ CI Status: ✓ All checks passed
├─ Merge: ✓ Squashed and merged to main
├─ Remote branch: ✓ Deleted
├─ Local branch: ✓ Deleted
├─ Local main: ✓ Updated to [commit]
└─ Status: Complete
```

## Error Handling

- **CI Failed:** Report which check failed, do NOT merge, show failure details
- **Conflicts unresolvable:** Report files with conflicts, show conflict markers
- **PR not found:** Check if already merged with `gh pr list --state merged`, report status
- **Protected branch rules:** Try `--admin` flag, otherwise report blocker
- **Network errors:** Retry up to 3 times with 5 second delay

## Conflict Resolution Priority

1. **package-lock.json, yarn.lock:** Accept theirs, regenerate with `npm install`
2. **Generated files (.next, dist, build):** Delete entirely, will regenerate
3. **Config files:** Prefer feature branch version (ours)
4. **Source code:** Analyze context, keep feature changes, integrate main updates
5. **Database migrations:** Keep both files, ensure timestamp ordering
6. **Tests:** Keep both versions, ensure no duplicate test names
