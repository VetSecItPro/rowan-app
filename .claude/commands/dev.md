---
description: Start a clean development server (fast, handles all common issues)
allowed-tools: Bash(pkill:*), Bash(rm:*), Bash(ls:*), Bash(npm:*), Bash(PATH=*:*), Bash(lsof:*)
---

# Start Clean Dev Server

Run this single command to start a clean dev server. It auto-fixes common issues:

```bash
pkill -f "next" 2>/dev/null; rm -rf ".next 2" "node_modules 2" ".next 3" "node_modules 3" .next 2>/dev/null; PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH" npm run dev
```

Run in background so user can continue working. Server runs at http://localhost:3000.

**What this does (all in one command, takes ~5 seconds):**
1. Kills orphaned Next.js processes
2. Auto-removes duplicate folders (node_modules 2, .next 2, etc.)
3. Clears .next cache
4. Starts dev server with correct PATH

**Expected:** "Ready in ~5s", then first page compile takes 15-30 seconds.

**If it still hangs after 60+ seconds**, run nuclear option:
```bash
pkill -f "next" 2>/dev/null; rm -rf .next node_modules package-lock.json && npm install && npm run dev
```
