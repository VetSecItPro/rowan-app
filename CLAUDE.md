# Rowan Development Standards

> **CRITICAL**: All code must be correct on first attempt. Security is foundational.

## Development Philosophy (MAIN MANDATE)

**Work slowly, safely, strategically, and comprehensively.**

### Core Principles
1. **Safety First** - Every change must be implemented carefully to avoid breaking existing functionality elsewhere in the app
2. **No Band-Aid Fixes** - When troubleshooting, think around the whole problem. Understand root causes before implementing solutions
3. **Clean Code** - Push quality code that we can be proud of. Minimize technical debt at all times
4. **Comprehensive Thinking** - Consider the full impact of changes across the entire codebase before implementing
5. **Strategic Implementation** - Plan changes thoughtfully rather than rushing to implement

### Implementation Standards
- **Before writing code:** Understand how the change affects other parts of the app
- **Before fixing bugs:** Investigate the root cause, not just the symptom
- **Before refactoring:** Ensure all dependent code is identified and updated
- **Before merging:** Verify nothing is broken in related features

### Troubleshooting Approach
1. **Go slow** - Rushed fixes create more problems
2. **Think holistically** - Consider the entire system, not just the immediate issue
3. **Find root causes** - Don't mask symptoms with quick patches
4. **Test thoroughly** - Verify the fix doesn't break anything else
5. **Document learnings** - Prevent the same issue from recurring

### Quality Over Speed
- A well-implemented feature that takes longer is better than a rushed feature that creates tech debt
- Every line of code should serve a clear purpose
- When in doubt, ask questions and clarify requirements before coding

## Stack

### Core Framework
- **Next.js 16.0.10** (App Router) - React framework with Turbopack/Webpack dev server
- **React 19** - UI library
- **TypeScript 5** - Strict mode enabled

### Database & Auth
- **Supabase** - PostgreSQL database + Authentication + Row Level Security
  - `@supabase/supabase-js ^2.58.0`
  - `@supabase/ssr ^0.8.0`

### Styling
- **Tailwind CSS 4** - Utility-first CSS
- **Framer Motion 12** - Animations
- **Lucide React** - Icon library

### Backend Services
- **Upstash Redis** - Rate limiting & caching (`@upstash/ratelimit`, `@upstash/redis`)
- **Resend 6** - Transactional email
- **Stripe 20** - Payments

### Monitoring & Security
- **Sentry 10** - Error tracking
- **DOMPurify** - XSS sanitization

### Data & Forms
- **Zod 4** - Schema validation
- **date-fns 4** - Date utilities
- **Sonner** - Toast notifications

## Known Issues & Workarounds

### Next.js 16 Dev Server Race Conditions (December 2024)
**Issue:** The Next.js 16 dev server frequently crashes with ENOENT errors on startup:
```
Error: ENOENT: no such file or directory, open '.next/dev/prerender-manifest.json'
Error: ENOENT: no such file or directory, open '.next/dev/static/chunks/app/layout.js'
```

**Root Cause:** File system race conditions in Next.js 16's webpack/turbopack dev server when generating build artifacts.

**Workaround:**
1. The dev server is **unstable in Claude Code CLI environment** - it may crash on first request
2. **For local development**, the user should run `npm run dev` directly in their terminal (not via Claude)
3. **For CI/CD**, `npm run build` works reliably - use GitHub Actions for verification
4. TypeScript checks (`npx tsc --noEmit`) work fine and should be used for validation

**DO NOT** waste tokens repeatedly trying different dev server approaches. This is a known limitation.

## Security Rules

### Authentication
- Never bypass RLS
- No service_role key on client
- Always validate `auth.uid()` matches resource owner
- Min 8 char passwords, validated client + server
- Use crypto.randomUUID() for tokens

### Data Protection
- ALL queries filtered by `space_id`
- RLS policies enforce space boundaries
- No cross-space access

### Input Validation
- Validate all input with Zod schemas
- Sanitize HTML (DOMPurify)
- Never use `dangerouslySetInnerHTML` without sanitization

### API Security
- Rate limit all API routes (Upstash Redis)
- No API keys in client code
- Validate request bodies, headers, auth
- No stack traces in production errors

### Environment Variables
- `NEXT_PUBLIC_*` = client-safe
- No `NEXT_PUBLIC_` prefix = server-only
- Never commit `.env.local`

## Code Quality

### TypeScript
- No `any` types
- Use interfaces from `lib/types.ts`
- `strict: true` in tsconfig

### Naming
- camelCase: variables, functions
- PascalCase: components, types
- UPPER_SNAKE_CASE: constants
- Files: PascalCase (components), camelCase (utils), kebab-case (routes)

### Error Handling
```typescript
// Service Layer
try {
  const validated = Schema.parse(data);
  const { data: result, error } = await supabase...
  if (error) throw error;
  return { success: true, data: result };
} catch (error) {
  console.error('Error:', error);
  return { success: false, error: 'Failed' };
}
```

## Architecture

### Service Layer (MANDATORY)
ALL database operations go through `lib/services/`

```typescript
// lib/services/tasks-service.ts
export async function getTasks(spaceId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('space_id', spaceId);
  if (error) throw error;
  return data;
}
```

### Real-time Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { filter: `space_id=eq.${id}` }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel); // MANDATORY cleanup
}, []);
```

## Database

### RLS Policy Pattern
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Space access" ON tasks
USING (space_id IN (
  SELECT space_id FROM space_members WHERE user_id = auth.uid()
));
```

## UI/UX Requirements
- Loading states for all async operations
- Empty states for list views
- Dark mode: `dark:` variants on all colors
- Error messages: user-friendly, no technical details

### PortalDropdown Component
**Reference Name:** "PortalDropdown" or "Use the PortalDropdown"
**Location:** `/components/ui/Dropdown.tsx`

**When to use:**
- Any dropdown positioning issues in modals
- Native `<select>` dropdowns that appear "off to the side"
- Dropdowns clipped by parent container overflow
- Z-index conflicts with modals or overlays

**Key Features:**
- Portal-based rendering at `document.body` level
- Modal-safe positioning (never clipped)
- Automatic placement calculation
- Z-index management (`z-index: 10000`)
- Responsive design

**Implementation Pattern:**
```tsx
import { Dropdown } from '@/components/ui/Dropdown';

// Replace problematic native selects with:
<Dropdown
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  placeholder="Select option..."
  className="your-styling"
/>
```

**Proven Solutions:**
- ✅ UnifiedItemModal dropdown alignment
- ✅ DateTimePicker calendar positioning
- ✅ TaskCard filter dropdown issues
- ✅ Modal overflow constraints

## MCP Configuration

### Supabase MCP
**Project**: `SUPABASE_PROJECT_REF`
**Authentication**: OAuth (browser-based login)

**Correct `.mcp.json` configuration:**
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=SUPABASE_PROJECT_REF"
    }
  }
}
```

**If "Needs authentication" appears:**
1. Restart Claude Code (Cmd+Shift+P → "Reload Window" or restart terminal)
2. Claude Code will open browser for Supabase OAuth login
3. Login and authorize access
4. MCP tools become available

**DO NOT use PAT tokens** - Supabase MCP switched to OAuth in 2025. No headers needed.

**Capabilities**:
- Direct SQL queries and database operations
- Database migration management
- Real-time table monitoring
- RLS policy management

**Troubleshooting:**
- If MCP won't connect, remove and re-add: `claude mcp remove supabase -s project && claude mcp add supabase "https://mcp.supabase.com/mcp?project_ref=SUPABASE_PROJECT_REF" --transport http --scope project`
- Restart Claude Code after any MCP config changes

### Vercel MCP
**Status**: ✅ Connected
**Authentication**: OAuth via Claude Code
**Team**: VetSecItPro (`[REDACTED_TEAM_ID]`)
**Project**: rowan-app (`[REDACTED_PROJECT_ID]`)

**Capabilities**:
- Direct deployment to Vercel (`vercel deploy`)
- Deployment monitoring and logs
- Protected URL access
- Project management

## Git Workflow & Deployment

### Hybrid Deployment Strategy
We use **dual deployment paths** for optimal workflow:

**🚀 Direct Deployment** (Development/Testing):
```bash
# Quick iteration cycle
vercel deploy          # Preview deployment for rapid testing
vercel deploy --prod   # Direct production deployment (emergency)
```

**🔄 GitHub Actions** (Official Releases):
```bash
# Automated production pipeline
git push origin main   # Triggers automated deployment
```

**When to use each**:
- **Direct Deployment**: Quick prototypes, demos, emergency hotfixes, feature testing
- **GitHub Actions**: Official releases, team collaboration, automated testing pipeline

### CRITICAL: Branching Strategy
**NEVER commit directly to main branch. Always use feature branches.**

**Required workflow:**
1. **Start new work:** `git checkout -b feature/description`
2. **Push branch:** `git push -u origin feature/description`
3. **Work and commit** on feature branch normally
4. **Test before PR:** `npm run build && npx tsc --noEmit`
5. **Create PR:** `gh pr create --title "Title" --body "Description"`
6. **GitHub Actions automatically:** Creates preview deployment and posts URL in PR
7. **Merge via GitHub UI** after review
8. **GitHub Actions automatically:** Runs migrations, checks, and deploys to production

**Branch naming conventions:**
- `feature/task-improvements` - new features
- `fix/authentication-bug` - bug fixes
- `refactor/service-layer` - code refactoring
- `experiment/ui-redesign` - experimental/risky changes

**Pre-approved tasks (no permission needed):**
- Git commits and pushes **on feature branches**
- Feature branch creation and management
- Pull request creation and merging
- All GitHub Actions operations (deployments, migrations, checks)
- **Complete security audits and code reviews**
- **Implementing security fixes and optimizations**
- **Running any commands (cd, npm, npx, bash, git, etc.) during audits**
- **Systematic codebase review without approval requests**

**Commit message format:** `type(scope): description`
- feat, fix, docs, style, refactor, test, chore

**Automated CI/CD Pipeline:**
- **PR Created:** GitHub Actions deploys to Vercel preview, posts URL in PR comments
- **PR Merged to Main:** GitHub Actions runs migrations → type checks → deploys to production
- **No manual Vercel commands needed** - everything is automated via GitHub Actions
- **Database migrations** are automatically applied when detected in commits
- **Build failures** are caught in CI before deployment

**Feature branch workflow:**
1. `git checkout -b feature/description`
2. `git push -u origin feature/description`
3. Work and commit normally: `git add . && git commit -m "message"`
4. `git push` (to feature branch)
5. When work is complete: Test `npm run build && npx tsc --noEmit`
6. **ASK USER**: "Ready to create PR for this feature?" (don't auto-create)
7. Create PR: `gh pr create --title "Title" --body "Description"`
8. GitHub Actions creates preview deployment automatically
9. If local tests fail: fix on feature branch, push again
10. **When everything runs fine with no errors and no more work needed:**
    - Confidently advise: "This feature is complete and ready to merge"
    - **ASK USER**: "Ready to merge PR into main?" before merging
    - After merge: GitHub Actions automatically deploys to production
11. **AFTER MERGE - Delete local branch:** `git checkout main && git pull && git branch -d feature/description`

**Standard commit format:**
```bash
git commit -m "$(cat <<'EOF'
feat(scope): description

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Branch Cleanup (MANDATORY)

**GitHub Settings:** Auto-delete on merge is ENABLED
- Remote branches are automatically deleted when PR is merged
- No manual remote cleanup needed

**After Every PR Merge:**
```bash
git checkout main
git pull origin main
git branch -d feature/your-branch   # Delete local branch
```

**Why This Matters:**
- Stale branches become outdated and can break code if merged later
- Old branches may delete newer features (happened with 6,000+ lines lost)
- Clean repo = clear understanding of what's active vs abandoned

**Before Merging Any Old Branch:**
1. Check how far behind main: `git rev-list --count branch..main`
2. Check what would be deleted: `git diff main..branch --stat`
3. If branch deletes files that exist in main = **DO NOT MERGE** (branch is stale)
4. If branch is >10 commits behind = **Rebase or recreate from main**

**Periodic Cleanup (if needed):**
```bash
# Delete all local branches already merged to main
git branch --merged main | grep -v "main" | xargs git branch -d

# Prune stale remote references
git fetch --prune
```

**Safe Branch Analysis Before Merge:**
```bash
# 1. How many commits behind main?
git rev-list --count feature/branch..main

# 2. What files would change (look for deletions of main's files)?
git diff main..feature/branch --stat

# 3. Are key files identical or different?
git diff main:path/to/file feature/branch:path/to/file

# If deletions > additions AND deletes files main has = STALE, delete branch
```

## Feature Colors
```typescript
const COLORS = {
  tasks: 'blue', calendar: 'purple', reminders: 'pink',
  messages: 'green', shopping: 'emerald', meals: 'orange',
  household: 'amber', goals: 'indigo'
};
```

## Common Mistakes to Avoid
- ❌ **Committing directly to main** → ✅ **Always use feature branches**
- ❌ Direct Supabase calls in components → ✅ Use service layer
- ❌ Missing subscription cleanup → ✅ Return cleanup in useEffect
- ❌ Hardcoded IDs → ✅ From context/session
- ❌ No input validation → ✅ Zod schemas
- ❌ Missing space_id filter → ✅ Always filter
- ❌ `any` types → ✅ Proper interfaces
- ❌ Missing loading/empty states → ✅ Always include
- ❌ Skipping build/type tests before PR → ✅ Always test before PR

## Review Checklist
- [ ] **Working on feature branch (not main)**
- [ ] **Build passes: npm run build**
- [ ] **TypeScript compiles: npx tsc --noEmit**
- [ ] RLS policies on new tables
- [ ] Zod validation
- [ ] Rate limiting on APIs
- [ ] Space data isolation
- [ ] No `console.log` in production
- [ ] Real-time cleanup
- [ ] Dark mode tested
- [ ] Mobile responsive
- [ ] **PR created with proper title/description**
