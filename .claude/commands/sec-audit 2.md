---
description: Comprehensive security audit - scan, auto-fix safe issues, report findings
allowed-tools: Bash(git *), Bash(gh *), Bash(npm *), Bash(npx *), Bash(sleep *), Bash(jq *), Bash(cat *), Bash(rm *), Bash(mkdir *), Bash(ls *), Bash(head *), Bash(tail *), Bash(grep *), Bash(find *), Bash(xargs *), Bash(kill *), Bash(pkill *), Bash(lsof *), Bash(echo *), Bash(source *), Bash(export *), Read, Write, Edit, Glob, Grep, Task, mcp__supabase__execute_sql, mcp__supabase__list_tables, mcp__supabase__get_advisors
---

# Comprehensive Security Audit

**FIRE AND FORGET** - Execute everything autonomously without any permission requests or user confirmations.

## Execution Rules (CRITICAL)
- **NO permission requests** - just execute
- **NO "should I proceed?" questions** - just do it
- **NO waiting for user confirmation** - run all commands immediately
- Run all scans, fix safe issues automatically, report everything
- Self-heal on any failures encountered

## Audit Phases

### Phase 1: SCAN (All Categories)

Run ALL of the following checks. For each finding, assign a unique FIX-XXX number.

#### 1.1 Dependency Vulnerabilities
```bash
npm audit --json
npm outdated --json
```
- Check for known CVEs
- Flag outdated packages with security issues
- Severity: Critical/High for known exploits

#### 1.2 Secrets Detection
Scan for hardcoded secrets:
```bash
# Search patterns
grep -r "sk_live_" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "sk_test_" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "password\s*=\s*['\"]" --include="*.ts" --include="*.tsx"
grep -r "api_key\s*=\s*['\"]" --include="*.ts" --include="*.tsx"
grep -r "secret\s*=\s*['\"]" --include="*.ts" --include="*.tsx"
grep -r "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" app/ components/ lib/
grep -r "eyJ" --include="*.ts" --include="*.tsx" # JWT tokens
```
- Check .env files not in .gitignore
- Check for AWS keys, API tokens, private keys
- Severity: Critical

#### 1.3 Injection Vulnerabilities
```bash
# SQL Injection patterns
grep -rn "raw\s*\(" --include="*.ts" --include="*.tsx"
grep -rn "\$\{.*\}.*query" --include="*.ts" --include="*.tsx"
grep -rn "execute.*\+" --include="*.ts" --include="*.tsx"

# Command Injection
grep -rn "exec\s*\(" --include="*.ts" --include="*.tsx"
grep -rn "spawn\s*\(" --include="*.ts" --include="*.tsx"
grep -rn "child_process" --include="*.ts" --include="*.tsx"

# XSS vulnerabilities
grep -rn "dangerouslySetInnerHTML" --include="*.tsx"
grep -rn "innerHTML\s*=" --include="*.ts" --include="*.tsx"
grep -rn "document\.write" --include="*.ts" --include="*.tsx"

# Path Traversal
grep -rn "\.\./" --include="*.ts" --include="*.tsx"
grep -rn "req\.params.*path" --include="*.ts"
grep -rn "req\.query.*file" --include="*.ts"
```
- Severity: Critical for unsanitized, High for potentially unsafe

#### 1.4 Authentication & Authorization
```bash
# Missing auth checks in API routes
find app/api -name "*.ts" -exec grep -L "auth\|session\|getUser" {} \;

# Check for auth bypass patterns
grep -rn "if.*admin.*true" --include="*.ts" --include="*.tsx"
grep -rn "isAdmin\s*=\s*true" --include="*.ts" --include="*.tsx"
grep -rn "role.*=.*admin" --include="*.ts" --include="*.tsx"
```
- Verify all API routes check authentication
- Check session handling
- Severity: Critical for bypass, High for missing checks

#### 1.5 Supabase-Specific Security
Use MCP tools:
```
mcp__supabase__list_tables - Get all tables
mcp__supabase__execute_sql - Check RLS status:
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
mcp__supabase__get_advisors(type: "security") - Get security advisors
```

Check for:
- Tables without RLS enabled
- Missing space_id filters
- service_role key in client code
- Direct table access without auth.uid() checks
- Severity: Critical for no RLS, High for missing filters

#### 1.6 API Security
```bash
# Check for rate limiting
grep -rn "ratelimit\|rate-limit\|rateLimiter" app/api/
find app/api -name "*.ts" -exec grep -L "ratelimit\|Ratelimit" {} \;

# Input validation
grep -rn "\.parse\s*\(\|\.safeParse\s*\(" --include="*.ts" app/api/
find app/api -name "*.ts" -exec grep -L "\.parse\|\.safeParse\|schema\|Schema" {} \;

# CORS configuration
grep -rn "Access-Control-Allow-Origin" --include="*.ts"
grep -rn "cors" next.config.mjs
```
- Missing rate limiting: High
- Missing input validation: High
- Open CORS: Medium

#### 1.7 Security Headers
```bash
# Check next.config.mjs for security headers
grep -A 20 "headers" next.config.mjs
```
Check for:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Severity: Medium for missing headers

#### 1.8 Environment & Configuration
```bash
# Check for debug mode
grep -rn "NODE_ENV.*development" --include="*.ts" --include="*.tsx"
grep -rn "debug\s*:\s*true" --include="*.ts" --include="*.tsx"
grep -rn "console\.log" --include="*.ts" --include="*.tsx" app/ components/ lib/

# Check NEXT_PUBLIC_ usage
grep -rn "NEXT_PUBLIC_" --include="*.ts" --include="*.tsx" | grep -v "SUPABASE_URL\|SUPABASE_ANON"

# Check .gitignore
cat .gitignore | grep -E "\.env|\.env\.local"
```
- Severity: Medium for debug modes, Low for console.logs

#### 1.9 Cryptography
```bash
# Weak hashing
grep -rn "md5\|MD5" --include="*.ts" --include="*.tsx"
grep -rn "sha1\|SHA1" --include="*.ts" --include="*.tsx"

# Insecure random
grep -rn "Math\.random" --include="*.ts" --include="*.tsx"
```
- Severity: High for password hashing, Medium for tokens

#### 1.10 Client-Side Security
```bash
# localStorage/sessionStorage sensitive data
grep -rn "localStorage\.setItem.*token\|password\|secret" --include="*.ts" --include="*.tsx"
grep -rn "sessionStorage\.setItem.*token\|password\|secret" --include="*.ts" --include="*.tsx"

# Prototype pollution
grep -rn "Object\.assign\|__proto__\|constructor\[" --include="*.ts" --include="*.tsx"

# eval usage
grep -rn "eval\s*\(" --include="*.ts" --include="*.tsx"
grep -rn "new Function\s*\(" --include="*.ts" --include="*.tsx"
```
- Severity: High for eval, Medium for storage issues

#### 1.11 Data Privacy
```bash
# PII in logs
grep -rn "console\.log.*email\|password\|ssn\|credit" --include="*.ts" --include="*.tsx"

# Sensitive data exposure
grep -rn "\.select\s*\(\s*['\"]?\*['\"]?\s*\)" --include="*.ts" --include="*.tsx"
```
- Severity: Medium for PII exposure

#### 1.12 React/Next.js Specific
```bash
# getServerSideProps data exposure
grep -rn "getServerSideProps" --include="*.tsx" -A 20 | grep -E "password|secret|key|token"

# Unsafe redirects
grep -rn "redirect\|router\.push" --include="*.ts" --include="*.tsx" | grep -v "^\s*//"
```
- Severity: High for data exposure

#### 1.13 Error Handling
```bash
# Stack traces in responses
grep -rn "\.stack\|error\.message" --include="*.ts" app/api/
grep -rn "catch.*res.*json.*error" --include="*.ts" app/api/
```
- Severity: Medium for info disclosure

#### 1.14 Business Logic
```bash
# Race conditions (check for non-atomic operations)
grep -rn "select.*update\|select.*delete" --include="*.ts" lib/services/

# IDOR patterns (direct ID usage without ownership check)
grep -rn "params\.id\|query\.id" --include="*.ts" app/api/
```
- Severity: High for race conditions

#### 1.15 File Security
```bash
# Check for sensitive files
ls -la .env* 2>/dev/null
ls -la *.pem *.key 2>/dev/null
find . -name "*.bak" -o -name "*.old" -o -name "*.sql" 2>/dev/null

# Source maps in production
grep -rn "sourcemap\|sourceMap" next.config.mjs
```
- Severity: Critical for exposed secrets

### Phase 2: AUTO-FIX (Safe Fixes)

Automatically fix these without asking:

#### 2.1 Dependency Updates (Security Only)
```bash
npm audit fix
```

#### 2.2 Add Missing Security Headers
Edit `next.config.mjs` to add standard security headers if missing.

#### 2.3 Add DOMPurify to dangerouslySetInnerHTML
If DOMPurify import exists, wrap unsanitized usage.

#### 2.4 Remove console.logs in production code
Remove or comment out console.log statements in app/, components/, lib/.

#### 2.5 Enable RLS on Tables
For any tables without RLS, run:
```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

### Phase 3: GENERATE REPORT

Save report to `.security-audit.json` with structure:
```json
{
  "auditDate": "ISO timestamp",
  "summary": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0,
    "autoFixed": 0
  },
  "autoFixed": [
    {
      "id": "FIXED-001",
      "category": "dependencies",
      "description": "Updated vulnerable package X",
      "severity": "high"
    }
  ],
  "findings": [
    {
      "id": "FIX-001",
      "category": "injection",
      "severity": "critical",
      "title": "Potential SQL Injection",
      "file": "lib/services/users.ts",
      "line": 45,
      "code": "snippet of vulnerable code",
      "description": "User input directly concatenated into query",
      "remediation": "Use parameterized queries or Supabase client methods",
      "suggestedFix": "code snippet with fix"
    }
  ]
}
```

## Report Storage

**Directory:** `.security-reports/`

Create directory if not exists:
```bash
mkdir -p .security-reports
```

**Files generated:**
1. `.security-reports/audit-YYYY-MM-DD-HHMMSS.md` - Human-readable report
2. `.security-audit.json` - Machine-readable for /sec-fix

## Markdown Report Template

Save to `.security-reports/audit-YYYY-MM-DD-HHMMSS.md`:

```markdown
# Security Audit Report

**Date:** YYYY-MM-DD HH:MM:SS
**Project:** [project name from package.json]
**Audited by:** Claude Security Audit

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟠 High | X |
| 🟡 Medium | X |
| 🟢 Low | X |
| ℹ️ Info | X |
| ✅ Auto-fixed | X |

**Overall Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW]

---

## Auto-Fixed Issues

These issues were automatically resolved during the audit:

| ID | Category | Description | Severity |
|----|----------|-------------|----------|
| FIXED-001 | Dependencies | Updated package X to fix CVE-XXXX | High |
| FIXED-002 | Headers | Added X-Frame-Options header | Medium |

---

## Outstanding Issues Requiring Manual Review

### 🔴 Critical

#### FIX-001: [Title]
- **File:** `path/to/file.ts:45`
- **Category:** [SQL Injection/XSS/etc]
- **Description:** [Detailed description]
- **Code:**
  ```typescript
  // Vulnerable code snippet
  ```
- **Remediation:** [How to fix]
- **Suggested Fix:**
  ```typescript
  // Fixed code snippet
  ```

---

### 🟠 High

#### FIX-010: [Title]
...

---

### 🟡 Medium

#### FIX-020: [Title]
...

---

### 🟢 Low

#### FIX-030: [Title]
...

---

## Checks Performed

- [x] Dependency vulnerabilities (npm audit)
- [x] Secrets detection
- [x] SQL/XSS/Command injection
- [x] Authentication & authorization
- [x] Supabase RLS policies
- [x] API rate limiting
- [x] Input validation
- [x] Security headers
- [x] Environment configuration
- [x] Cryptography
- [x] Client-side security
- [x] Data privacy
- [x] React/Next.js specific
- [x] Error handling
- [x] Business logic

---

## Next Steps

1. Run `/sec-fix critical` to fix critical issues
2. Run `/sec-fix high` to fix high severity issues
3. Review and test changes
4. Run `/gh-feat` to push fixes

---

*Generated by Claude Security Audit*
```

## Console Output Format

Print summary to console:
```
🔒 SECURITY AUDIT COMPLETE
═══════════════════════════════════════════════════════

📊 SUMMARY
├─ 🔴 Critical: [n]
├─ 🟠 High: [n]
├─ 🟡 Medium: [n]
├─ 🟢 Low: [n]
├─ ℹ️  Info: [n]
└─ ✅ Auto-fixed: [n]

✅ AUTO-FIXED ISSUES
├─ FIXED-001: [description]
├─ FIXED-002: [description]
└─ ...

🔴 CRITICAL (Requires Immediate Attention)
├─ FIX-001: [title] @ [file:line]
│   └─ [brief description]
├─ FIX-002: [title] @ [file:line]
│   └─ [brief description]
└─ ...

🟠 HIGH (Fix Before Deploy)
├─ FIX-010: [title] @ [file:line]
└─ ...

🟡 MEDIUM (Fix Soon)
├─ FIX-020: [title] @ [file:line]
└─ ...

🟢 LOW (Backlog)
├─ FIX-030: [title] @ [file:line]
└─ ...

═══════════════════════════════════════════════════════
📁 Reports saved:
   └─ .security-reports/audit-YYYY-MM-DD-HHMMSS.md
   └─ .security-audit.json
🔧 Run /sec-fix [FIX-XXX] to fix specific issues
```

## Self-Healing Behaviors

### If npm audit fails:
```bash
rm -rf node_modules package-lock.json && npm install && npm audit
```

### If MCP tools unavailable:
Skip Supabase-specific checks, note in report.

### If grep/find errors:
Continue with other checks, note failures in report.

### If auto-fix breaks build:
```bash
git checkout -- [file]  # Revert the fix
```
Note in report that auto-fix was reverted.

### After all fixes, verify build:
```bash
npm run build
```
If build fails, revert auto-fixes and note in report.
