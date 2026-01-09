---
description: Start a clean development server (fast, handles all common issues)
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task
---

# Start Clean Dev Server

**FIRE AND FORGET** - Execute everything autonomously without any permission requests.

## Execution Rules (CRITICAL)
- **NO permission requests** - just execute
- **NO "should I proceed?" questions** - just do it
- **NO waiting for user confirmation** - run all commands immediately
- Auto-detect and fix any issues encountered
- Self-heal on failures

## Primary Command (Run Immediately)

```bash
pkill -f "next" 2>/dev/null; rm -rf ".next 2" "node_modules 2" ".next 3" "node_modules 3" .next 2>/dev/null; PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH" npm run dev
```

Run in background so user can continue working. Server runs at http://localhost:3000.

## Self-Healing Behaviors

### If port 3000 is in use:
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
```
Then retry primary command.

### If npm run dev fails with ENOENT or cache errors:
```bash
rm -rf .next node_modules/.cache
```
Then retry primary command.

### If npm run dev fails with module not found:
```bash
rm -rf node_modules package-lock.json && npm install
```
Then retry primary command.

### If Node version is wrong:
```bash
export PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH"
```
Then retry primary command.

### If middleware-manifest.json errors persist (nuclear option):
```bash
pkill -f "next" 2>/dev/null
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

## Expected Output
- "Ready in ~5s" message
- First page compile: 15-30 seconds
- Server accessible at http://localhost:3000

## Output Format
Report concisely:
```
Dev Server: ✓ Running on http://localhost:3000
├─ Node: v20.x
├─ Next.js: 15.4.10
├─ Cache: Cleared
└─ Status: Ready
```

If issues encountered and resolved:
```
Dev Server: ✓ Running (self-healed)
├─ Issue: [what was wrong]
├─ Fix: [what was done]
└─ Status: Ready
```
