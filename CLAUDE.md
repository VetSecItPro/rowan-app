# Rowan Development Standards

> **CRITICAL**: All code must be correct on first attempt. Security is foundational.

## Stack
Next.js 15 App Router · Supabase (DB + Auth) · TypeScript strict · Tailwind · Zod · Upstash Redis · Resend

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

## Git Workflow & Deployment

### CRITICAL: Branching Strategy
**NEVER commit directly to main branch. Always use feature branches.**

**Required workflow:**
1. **Start new work:** `git checkout -b feature/description`
2. **Push branch:** `git push -u origin feature/description`
3. **Work and commit** on feature branch normally
4. **Test before PR:** `npm run build && npx tsc --noEmit`
5. **Create PR:** `gh pr create --title "Title" --body "Description"`
6. **Merge via GitHub UI** after review

**Branch naming conventions:**
- `feature/task-improvements` - new features
- `fix/authentication-bug` - bug fixes
- `refactor/service-layer` - code refactoring
- `experiment/ui-redesign` - experimental/risky changes

**Pre-approved tasks (no permission needed):**
- Git commits and pushes **on feature branches**
- Feature branch creation and management
- Pull request creation and merging
- Database migrations (`npx supabase db push`)
- Vercel deployments and monitoring
- Deployment troubleshooting and fixes
- **Complete security audits and code reviews**
- **Implementing security fixes and optimizations**
- **Running any commands (cd, npm, npx, bash, git, etc.) during audits**
- **Systematic codebase review without approval requests**

**Commit message format:** `type(scope): description`
- feat, fix, docs, style, refactor, test, chore

**Feature branch workflow:**
1. `git checkout -b feature/description`
2. `git push -u origin feature/description`
3. Work and commit normally: `git add . && git commit -m "message"`
4. `git push` (to feature branch)
5. When work is complete: Test `npm run build && npx tsc --noEmit`
6. **ASK USER**: "Ready to create PR for this feature?" (don't auto-create)
7. Create PR: `gh pr create --title "Title" --body "Description"`
8. Monitor Vercel deployment preview
9. If tests fail: fix on feature branch, push again
10. **ASK USER**: "Ready to merge PR?" before merging

**Standard commit format:**
```bash
git commit -m "$(cat <<'EOF'
feat(scope): description

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
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
