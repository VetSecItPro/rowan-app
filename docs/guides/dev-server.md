# Development Server Guide

> **Quick Start:** Use `/dev` slash command or run the one-liner below.

## One Command to Start Clean (Use This)

```bash
pkill -f "next" 2>/dev/null; rm -rf ".next 2" "node_modules 2" ".next 3" "node_modules 3" .next 2>/dev/null; PATH="$HOME/.nvm/versions/node/v20.19.6/bin:$PATH" npm run dev
```

**What it does (~5 seconds):**
- Kills orphaned processes
- Auto-removes duplicate folders
- Clears cache
- Starts server with correct PATH

**Expected:** "Ready in ~5s" → first page compile 15-30s → done.

---

## If It Still Fails

### Hangs >60 seconds during compile
**Nuclear option:**
```bash
pkill -f "next" 2>/dev/null; rm -rf .next node_modules package-lock.json && npm install && npm run dev
```

### "npm not found"
Already handled by the one-liner (uses full PATH).

### Port 3000 in use
Already handled (pkill kills orphaned processes).

### 500 errors in browser
Hard refresh (Cmd+Shift+R) - it's browser cache, not the server.

---

## Environment

| Setting | Value |
|---------|-------|
| Next.js | 15.4.10 |
| Node.js | 20.19.6 (via nvm) |
| Node Path | `~/.nvm/versions/node/v20.19.6/bin/` |
| Bundler | Webpack |
| URL | http://localhost:3000 |

---

## Root Causes Reference

| Issue | Cause | Fixed By |
|-------|-------|----------|
| Compile hangs forever | Duplicate `node_modules 2` / `.next 2` folders | Auto-removed in one-liner |
| Compile hangs forever | Corrupted node_modules | Nuclear option |
| Compile hangs forever | Circular imports in code | Fix the code |
| npm not found | nvm not in PATH | Full PATH in one-liner |
| Port in use | Orphaned process | pkill in one-liner |
| Browser 500 errors | Stale browser cache | Hard refresh |
