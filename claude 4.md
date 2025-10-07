# CLAUDE.md - Rowan Development Standards

> **CRITICAL REQUIREMENT**: All code written for this project must be correct on the first attempt to minimize security vulnerabilities, data exposure, and architectural flaws. Security is foundational, not an afterthought.

---

## 1. PROJECT CONTEXT

**Rowan** is a collaborative life management application for couples and families. It provides task management, shared calendars, reminders, messaging, shopping lists, meal planning, household management, and goal tracking.

**Stack:**
- Next.js 15 with App Router
- Supabase (Database + Auth)
- TypeScript (strict mode)
- Tailwind CSS + next-themes
- Zod validation
- Upstash Redis (rate limiting)
- Resend (email)

**Security-First Mandate:** Every feature must implement proper authentication, authorization (RLS), input validation, and error handling from the start.

---

## 2. SECURITY-FIRST PRINCIPLES

### Authentication & Authorization

**Security Requirements:**
- **Never bypass RLS**: All database queries must respect Row Level Security policies
- **No service_role key on client**: Server-only API routes can use service_role, never client-side
- **Session validation**: Always verify `auth.uid()` matches the resource owner
- **Token security**: Use cryptographically secure tokens (crypto.randomUUID() or similar)
- **Password requirements**: Minimum 8 characters, enforce in both client and server validation

```typescript
// ✅ CORRECT: Always check auth in Server Components
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Proceed with authenticated logic
}

// ❌ WRONG: Using service_role key on client
const supabase = createClient(url, SERVICE_ROLE_KEY); // NEVER!
```

### Data Protection

**Partnership Isolation Rules:**
1. Every query MUST filter by `partnership_id`
2. RLS policies MUST enforce partnership boundaries
3. NO cross-partnership data access
4. **Soft deletes considered**: For audit trails, consider soft deletes with `deleted_at` timestamp

```typescript
// ✅ CORRECT: Partnership-scoped query
const { data } = await supabase
  .from('tasks')
  .select('*')
  .eq('partnership_id', partnershipId);

// ❌ WRONG: Missing partnership filter
const { data } = await supabase
  .from('tasks')
  .select('*'); // Exposes all data!
```

### Input Validation & Sanitization

**Validation Rules:**
- **Validate everything**: All user input must be validated with Zod schemas
- **Sanitize HTML**: Use DOMPurify or escape HTML in emails/user-generated content
- **SQL injection prevention**: Use Supabase parameterized queries (built-in protection)
- **XSS prevention**: Never use `dangerouslySetInnerHTML` without sanitization
- **File upload validation**: Validate file types, sizes, and scan for malware if implementing uploads

```typescript
// ✅ CORRECT: Zod schema validation
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  due_date: z.string().datetime().optional(),
});

// Validate before DB operation
const validated = TaskSchema.parse(formData);
```

### API Security

**API Protection Requirements:**
- **Rate limiting**: All API routes must implement rate limiting (Upstash Redis)
- **CORS configuration**: Restrict origins in production
- **API key protection**: Never expose API keys in client-side code
- **Request validation**: Validate request bodies, headers, and authentication
- **Error messages**: Don't expose stack traces or sensitive info in production errors

```typescript
// ✅ CORRECT: Rate-limited API route
import { ratelimit } from '@/lib/ratelimit';

export async function POST(req: Request) {
  // Rate limit check
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Proceed with request
}
```

### Environment Variables

```bash
# ✅ Public (safe for client)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_APP_URL=...

# ❌ Private (server only - no NEXT_PUBLIC_ prefix)
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 3. CODE QUALITY STANDARDS

### TypeScript Requirements

```typescript
// tsconfig.json must have:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}

// ❌ WRONG: Using 'any'
function processData(data: any) { }

// ✅ CORRECT: Proper typing
function processData(data: Task[]) { }
```

**No `any` types allowed**—use proper interfaces from `lib/types.ts`

### Error Handling Pattern

```typescript
// Service Layer
export async function createTask(data: CreateTaskInput) {
  try {
    const validated = TaskSchema.parse(data);
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: task };
  } catch (error) {
    console.error('Create task error:', error);
    return { success: false, error: 'Failed to create task' };
  }
}

// Component Layer
const handleCreate = async () => {
  setLoading(true);
  const result = await createTask(formData);
  setLoading(false);

  if (result.success) {
    toast.success('Task created');
  } else {
    toast.error(result.error);
  }
};
```

### Naming Conventions

```typescript
// Variables & Functions: camelCase
const userName = 'John';
function getUserData() {}

// Components & Types: PascalCase
interface UserProfile {}
function TaskCard() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Files:
// - Components: PascalCase (TaskCard.tsx)
// - Utilities: camelCase (formatDate.ts)
// - Routes: kebab-case (reset-password/)
```

---

## 4. ARCHITECTURE PATTERNS

### Service Layer Pattern (MANDATORY)

**ALL database operations MUST go through `lib/services/`**

**Pattern 1: Individual Function Exports**
```typescript
// lib/services/taskService.ts
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  partnership_id: z.string().uuid(),
  assigned_to: z.string().uuid().optional(),
});

/**
 * Create a new task
 * @param data - Task creation data
 * @returns Created task or error
 */
export async function createTask(data: z.infer<typeof TaskSchema>) {
  try {
    const supabase = createClient();
    const validated = TaskSchema.parse(data);

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: task };
  } catch (error) {
    console.error('[taskService] createTask error:', error);
    return { success: false, error: 'Failed to create task' };
  }
}

/**
 * Get all tasks for a partnership
 * @param partnershipId - Partnership UUID
 * @returns Array of tasks
 */
export async function getTasks(partnershipId: string) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[taskService] getTasks error:', error);
    return { success: false, error: 'Failed to fetch tasks' };
  }
}
```

**Pattern 2: Object Export (Alternative)**
```typescript
// lib/services/example-service.ts
import { supabase } from '@/lib/supabase';
import type { Example, CreateExampleData } from '@/lib/types';

export const exampleService = {
  /**
   * Get all examples for a partnership
   */
  async getExamples(partnershipId: string): Promise<Example[]> {
    const { data, error } = await supabase
      .from('examples')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch examples: ${error.message}`);
    return data || [];
  },

  /**
   * Create a new example
   */
  async createExample(data: CreateExampleData): Promise<Example> {
    const { data: example, error } = await supabase
      .from('examples')
      .insert({
        ...data,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create example: ${error.message}`);
    return example;
  },

  /**
   * Subscribe to real-time changes
   */
  subscribeToExamples(
    partnershipId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`examples:${partnershipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'examples',
          filter: `partnership_id=eq.${partnershipId}`,
        },
        callback
      )
      .subscribe();
  },
};
```

**Component Usage Examples:**
```typescript
// ✅ CORRECT - Component uses service
import { tasksService } from '@/lib/services/tasks-service';

function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    tasksService.getTasks(partnershipId)
      .then(setTasks)
      .catch(console.error);
  }, [partnershipId]);
}

// ❌ WRONG - Direct Supabase call in component
function TaskList() {
  const { data } = await supabase.from('tasks').select('*');
  setTasks(data);
}
```

### Real-time Subscription Pattern

```typescript
'use client';

useEffect(() => {
  const supabase = createClient();

  const channel = supabase
    .channel('tasks_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `partnership_id=eq.${partnershipId}`
    }, (payload) => {
      // Handle real-time update
      if (payload.eventType === 'INSERT') {
        setTasks(prev => [payload.new, ...prev]);
      }
    })
    .subscribe();

  // MANDATORY: Cleanup subscription
  return () => {
    supabase.removeChannel(channel);
  };
}, [partnershipId]);
```

### Component Organization

```
components/
├── auth/           # Authentication components
├── dashboard/      # Dashboard-specific
├── shared/         # Reusable across features
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── LoadingSpinner.tsx
└── theme/          # Theme-related
    ├── ThemeProvider.tsx
    └── ThemeToggle.tsx
```

---

## 5. DATABASE SECURITY

### RLS Policy Pattern

```sql
-- MANDATORY: Enable RLS on ALL tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "Users can view partnership tasks"
ON tasks FOR SELECT
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policy
CREATE POLICY "Users can create partnership tasks"
ON tasks FOR INSERT
WITH CHECK (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE Policy
CREATE POLICY "Users can update partnership tasks"
ON tasks FOR UPDATE
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE Policy
CREATE POLICY "Users can delete partnership tasks"
ON tasks FOR DELETE
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);
```

### Testing RLS Policies

```sql
-- Test as specific user
SET request.jwt.claim.sub = 'user-uuid-here';

-- Try to access data
SELECT * FROM tasks; -- Should only return user's partnership tasks
```

---

## 6. INPUT VALIDATION

### Form Validation with Zod

```typescript
// schemas/taskSchemas.ts
import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long'),
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  due_date: z.string()
    .datetime()
    .optional(),
  priority: z.enum(['low', 'medium', 'high'])
    .default('medium'),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// Component usage
const form = useForm<CreateTaskInput>({
  resolver: zodResolver(CreateTaskSchema),
});
```

### API Route Validation

```typescript
// app/api/tasks/route.ts
export async function POST(req: Request) {
  const body = await req.json();

  // Validate input
  const result = CreateTaskSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: result.error.errors },
      { status: 400 }
    );
  }

  // Proceed with validated data
  const task = await createTask(result.data);
  return Response.json(task);
}
```

---

## 7. RATE LIMITING

### Upstash Implementation

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

// API route protection
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return Response.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }

  // Process request
}
```

---

## 8. UI/UX PATTERNS

### Loading States (REQUIRED)

```typescript
function TaskList() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  // Render tasks
}
```

### Empty States (REQUIRED)

```typescript
function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center p-12">
        <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          No tasks yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create your first task to get started
        </p>
        <Button onClick={openCreateModal} className="mt-4">
          Create Task
        </Button>
      </div>
    );
  }

  // Render tasks
}
```

### Dark Mode Support (REQUIRED)

```typescript
// Always include dark: variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <h1 className="text-gray-900 dark:text-white">Title</h1>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>
```

---

## 9. PERFORMANCE OPTIMIZATION

### Memoization Patterns

```typescript
// Expensive calculation
const filteredTasks = useMemo(() => {
  return tasks.filter(task =>
    task.status === filter &&
    task.title.toLowerCase().includes(search.toLowerCase())
  );
}, [tasks, filter, search]);

// Stable callback references
const handleDelete = useCallback((taskId: string) => {
  deleteTask(taskId);
}, [deleteTask]);
```

### Debounced Search

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((value: string) => {
  performSearch(value);
}, 300);

<input
  onChange={(e) => debouncedSearch(e.target.value)}
  placeholder="Search..."
/>
```

---

## 10. PROJECT-SPECIFIC CONVENTIONS

### Feature Color Mapping

```typescript
const FEATURE_COLORS = {
  tasks: { bg: 'bg-blue-500', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  calendar: { bg: 'bg-purple-500', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
  reminders: { bg: 'bg-pink-500', text: 'text-pink-600', gradient: 'from-pink-500 to-pink-600' },
  messages: { bg: 'bg-green-500', text: 'text-green-600', gradient: 'from-green-500 to-green-600' },
  shopping: { bg: 'bg-emerald-500', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
  meals: { bg: 'bg-orange-500', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
  household: { bg: 'bg-amber-500', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' },
  goals: { bg: 'bg-indigo-500', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
};
```

### Icon Sizing Standards

```typescript
// Feature icons (cards, headers)
<CheckSquare className="w-7 h-7" />

// Control icons (buttons)
<Plus className="w-5 h-5" />

// Small icons (inline)
<ChevronRight className="w-4 h-4" />
```

### Spacing Standards

```typescript
// Card padding
<div className="p-6">

// Grid gaps
<div className="grid gap-6">

// Page containers
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
```

---

## 11. COMMON PITFALLS TO AVOID

### Security Vulnerabilities

**1. Exposing API Keys**
```typescript
// ❌ WRONG: API key exposed
const apiKey = 'sk_live_123'; // Hardcoded!

// ✅ CORRECT: Environment variable
const apiKey = process.env.RESEND_API_KEY;
```

**2. Bypassing RLS**
```typescript
// ❌ WRONG: Using service_role key on client
const supabase = createClient(url, SERVICE_ROLE_KEY);

// ✅ CORRECT: Use anon key, let RLS handle permissions
const supabase = createClient(url, ANON_KEY);
```

**3. SQL Injection**
```typescript
// ❌ WRONG: String interpolation (vulnerable)
supabase.rpc('search', { query: `WHERE title LIKE '%${userInput}%'` });

// ✅ CORRECT: Parameterized queries (Supabase handles this)
supabase.from('tasks').select('*').ilike('title', `%${userInput}%`);
```

**4. Missing RLS Policies**
```typescript
// ❌ WRONG: No RLS policy
const { data } = await supabase.from('tasks').select('*');

// ✅ CORRECT: RLS enforced + partnership filter
const { data } = await supabase
  .from('tasks')
  .select('*')
  .eq('partnership_id', partnershipId);
```

### Memory Leaks

**1. Missing Subscription Cleanup**
```typescript
// ❌ WRONG: No cleanup
useEffect(() => {
  const channel = supabase.channel('tasks').subscribe();
}, []);

// ✅ CORRECT: Proper cleanup
useEffect(() => {
  const channel = supabase.channel('tasks').subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**2. Event Listeners**
```typescript
// ❌ WRONG: Missing cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ CORRECT: Proper cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Data Integrity Issues

**1. Hardcoded IDs**
```typescript
// ❌ WRONG: Hardcoded IDs
const tasks = await tasksService.getTasks('hardcoded-uuid');

// ✅ CORRECT: From context/session
const { currentPartnership } = usePartnership();
const tasks = await tasksService.getTasks(currentPartnership.id);
```

**2. Missing Validation**
```typescript
// ❌ WRONG: No validation
async function createTask(data: any) {
  return supabase.from('tasks').insert(data);
}

// ✅ CORRECT: Zod validation
async function createTask(data: CreateTaskData) {
  const validated = TaskSchema.parse(data);
  return supabase.from('tasks').insert(validated);
}
```

---

## 12. GIT WORKFLOW

### Conventional Commits

```bash
# Format: <type>(<scope>): <description>

feat(auth): add password reset flow
fix(tasks): resolve duplicate task creation
docs(readme): update setup instructions
style(ui): improve dark mode contrast
refactor(services): extract task logic to service layer
test(tasks): add task creation tests
chore(deps): update dependencies
```

### Branch Naming

```bash
feature/task-management
fix/auth-redirect-loop
refactor/service-layer
docs/api-documentation
```

---

## 13. CODE REVIEW CHECKLIST

Before submitting PR, verify:

### Security
- [ ] No API keys exposed in client-side code
- [ ] RLS policies applied to all new tables
- [ ] Input validation with Zod schemas
- [ ] Rate limiting on API routes
- [ ] No XSS vulnerabilities (sanitized HTML)
- [ ] Partnership data isolation enforced

### Code Quality
- [ ] TypeScript compiles: `npm run type-check`
- [ ] Linter passes: `npm run lint`
- [ ] No `console.log` in production code
- [ ] Proper error handling in all async operations
- [ ] JSDoc comments for service methods
- [ ] No `any` types used

### Architecture
- [ ] Database operations through service layer
- [ ] Real-time subscriptions have cleanup
- [ ] No direct Supabase calls in components
- [ ] Proper separation of concerns
- [ ] Reusable components in `components/shared/`

### UX
- [ ] Loading states for async operations
- [ ] Empty states for list views
- [ ] Error messages user-friendly
- [ ] Dark mode tested and working
- [ ] Mobile responsive
- [ ] Keyboard navigation works
- [ ] ARIA labels for accessibility

---

## 14. WORKING WITH CLAUDE CODE

### Effective Prompts

**Be Specific - Creating a new service file:**
```
Create lib/services/goals-service.ts following the exact pattern used in
tasks-service.ts. Include getGoals, createGoal, updateGoal, deleteGoal,
getGoalStats (active, completed, overall progress %), and subscribeToGoals
with proper cleanup. Use Goal and CreateGoalData types from lib/types.ts.
Include comprehensive error handling and JSDoc comments for all methods.
```

**Request Security Review:**
```
Review the invitation API route for security vulnerabilities. Check:
- Input validation completeness
- Rate limiting implementation
- Email content XSS prevention
- Token cryptographic security
- Error message information disclosure
```

**Specify Complete Implementation:**
```
Build the complete Calendar page at app/(main)/calendar/page.tsx with:
- Month/week/day view toggle
- Event creation inline form with validation
- Real-time updates subscription with cleanup
- Loading and empty states
- Dark mode support
- Stats cards showing total, upcoming, personal, shared events
Ensure proper TypeScript types and error handling throughout.
```

**Complete Feature Implementation:**
```
Create app/(main)/tasks/page.tsx with:
- Server Component for initial data fetch
- Client components for interactions
- Loading and empty states
- Dark mode support
- Real-time updates
- Partnership-scoped data
Use taskService.ts for all DB operations
```

---

## 15. ENVIRONMENT VARIABLES REFERENCE

```bash
# .env.local

# Supabase (Public - safe for client)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# App URL (Public)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Service Role (Private - server only)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Resend (Private)
RESEND_API_KEY=re_xxx...

# Upstash Redis (Private)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx...

# Environment
NODE_ENV=development
```

**Security Rules:**
- ✅ `NEXT_PUBLIC_*` - Safe for client-side
- ❌ No `NEXT_PUBLIC_` prefix - Server-only
- ❌ Never commit `.env.local` to git

---

## 16. TROUBLESHOOTING GUIDE

### Real-time Updates Not Working

1. Check RLS policies allow SELECT for partnership members
2. Verify subscription cleanup in useEffect return
3. Ensure correct partnership_id filter in subscription
4. Check Supabase Realtime is enabled in dashboard

```typescript
// Debug real-time
useEffect(() => {
  const channel = supabase
    .channel('debug_channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `partnership_id=eq.${partnershipId}`
    }, (payload) => {
      console.log('Real-time payload:', payload);
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  return () => supabase.removeChannel(channel);
}, [partnershipId]);
```

### Authentication Errors

1. Clear localStorage and sessionStorage
2. Verify `.env.local` has correct Supabase credentials
3. Check RLS policies don't block user creation (use `WITH CHECK`)
4. Verify auth session is being set in AuthContext

```typescript
// Debug authentication
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Error:', error);

// Common issues:
- Expired session → refresh token
- Missing auth cookies → check middleware
- Wrong auth flow → verify email/password vs magic link
```

### Build Failures

1. Run `npm run type-check` for TypeScript errors
2. Run `npm run lint` for ESLint issues
3. Check all imports use correct paths (@/ alias)
4. Verify environment variables are set

```bash
# Check TypeScript errors
npm run type-check

# Check linting
npm run lint

# Build for production
npm run build

# Common issues:
- No 'any' types allowed
- All imports resolved
- Environment variables prefixed correctly
- No client-side API key usage
```

### Database Access Denied

1. Check RLS is enabled on the table
2. Verify user is member of a partnership
3. Test RLS policies with specific user UUID
4. Check partnership_id is correctly set

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- Test as specific user
SET LOCAL jwt.claims.sub = 'user-uuid-here';
SELECT * FROM tasks; -- Should return only user's partnership tasks
```

---

## Pre-Approved Commands (No Permission Needed)

### Git Operations
- `git add .`, `git commit`, `git push`, `git status`, `git branch`

### Package Management
- `npm install <package>`, `npm run dev`, `npm run build`

### File Operations
- Create/move/rename files, update imports, create components

### Development Workflow
- Clear cache (`rm -rf .next`), fix imports, update Tailwind classes

### Mobile Optimization Tasks (Pre-Approved October 6, 2025)
- **Full mobile responsiveness optimization for all feature pages**
- Apply responsive Tailwind classes: `p-4 sm:p-8`, `text-2xl sm:text-4xl`, `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`
- Stack headers/sections on mobile: `flex-col sm:flex-row`
- Optimize touch targets, modals, and interactive elements for mobile
- Test pages at 375px, 768px, 1024px viewports
- Commit mobile fixes without requesting permission
- **Mandate**: Do not break existing desktop functionality while adding mobile support

---

**Version:** 1.2.0
**Last Updated:** October 6, 2025
**Security Review Date:** October 5, 2025

*This file serves as the single source of truth for all development decisions on the Rowan project.*
