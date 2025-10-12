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
- ALL queries filtered by `partnership_id`
- RLS policies enforce partnership boundaries
- No cross-partnership access

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
export async function getTasks(partnershipId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('partnership_id', partnershipId);
  if (error) throw error;
  return data;
}
```

### Real-time Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { filter: `partnership_id=eq.${id}` }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel); // MANDATORY cleanup
}, []);
```

## Database

### RLS Policy Pattern
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partnership access" ON tasks
USING (partnership_id IN (
  SELECT partnership_id FROM partnership_members WHERE user_id = auth.uid()
));
```

## UI/UX Requirements
- Loading states for all async operations
- Empty states for list views
- Dark mode: `dark:` variants on all colors
- Error messages: user-friendly, no technical details

## Git Workflow & Deployment
**Pre-approved tasks (no permission needed):**
- Git commits and pushes
- Database migrations (`npx supabase db push`)
- Vercel deployments and monitoring
- Deployment troubleshooting and fixes
- **Complete security audits and code reviews**
- **Implementing security fixes and optimizations**
- **Running any commands (cd, npm, npx, bash, git, etc.) during audits**
- **Systematic codebase review without approval requests**

Format: `type(scope): description`
- feat, fix, docs, style, refactor, test, chore

Commit flow:
1. `git add .`
2. `git commit -m "message\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>"`
3. `git push`
4. Monitor Vercel deployment with `vercel ls`
5. If deployment fails: check logs, fix issues, retry until successful
6. If migration fails: analyze error, fix, retry until successful

If commit fails: fix issue and retry until successful

## Feature Colors
```typescript
const COLORS = {
  tasks: 'blue', calendar: 'purple', reminders: 'pink',
  messages: 'green', shopping: 'emerald', meals: 'orange',
  household: 'amber', goals: 'indigo'
};
```

## Common Mistakes to Avoid
- ❌ Direct Supabase calls in components → ✅ Use service layer
- ❌ Missing subscription cleanup → ✅ Return cleanup in useEffect
- ❌ Hardcoded IDs → ✅ From context/session
- ❌ No input validation → ✅ Zod schemas
- ❌ Missing partnership_id filter → ✅ Always filter
- ❌ `any` types → ✅ Proper interfaces
- ❌ Missing loading/empty states → ✅ Always include

## Review Checklist
- [ ] RLS policies on new tables
- [ ] Zod validation
- [ ] Rate limiting on APIs
- [ ] Partnership data isolation
- [ ] No `console.log` in production
- [ ] Real-time cleanup
- [ ] Dark mode tested
- [ ] Mobile responsive
