# Rowan Architecture

> A modern, production-grade family management platform built with Next.js 15, React 19, and Supabase.

---

## Overview

Rowan is a comprehensive household management application designed for families to coordinate tasks, schedules, budgets, meals, and more. The architecture prioritizes:

- **Offline-first** - Full functionality without internet connectivity
- **Real-time collaboration** - Live updates across family members
- **Multi-platform** - PWA + native iOS/Android via Capacitor
- **Security-first** - Row-level security, encrypted sessions, input validation
- **Scalability** - Serverless functions, edge middleware, service-based architecture

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **UI** | React 19, Tailwind CSS 4, Framer Motion 12 |
| **Language** | TypeScript 5 (strict mode) |
| **Database** | Supabase (PostgreSQL + Auth + Realtime) |
| **State** | React Query 5 with IndexedDB persistence |
| **Mobile** | Capacitor 8 (36 native plugins) |
| **Payments** | Stripe (subscriptions) |
| **Email** | Resend (transactional) |
| **Monitoring** | Sentry (error tracking) |
| **Rate Limiting** | Upstash Redis |

---

## Directory Structure

```
rowan-app/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication flows
│   ├── (main)/            # Protected feature routes
│   ├── (pages)/           # Marketing/public pages
│   ├── api/               # Backend API routes
│   ├── admin/             # Admin dashboard
│   └── settings/          # User preferences
├── components/            # React components (feature-based)
│   ├── [feature]/         # Feature-specific components
│   ├── layout/            # Navigation, header, footer
│   ├── ui/                # Shared UI primitives
│   └── shared/            # Cross-feature components
├── lib/                   # Core business logic
│   ├── services/          # Data access layer (117 files)
│   ├── hooks/             # React Query hooks
│   ├── types/             # TypeScript definitions
│   ├── validations/       # Zod schemas
│   ├── utils/             # Utility functions
│   ├── native/            # Capacitor bridges
│   └── react-query/       # Query client config
├── hooks/                 # Top-level custom hooks
├── emails/                # Email templates (React Email)
├── public/                # Static assets, service worker
├── supabase/              # Database migrations
└── docs/                  # Documentation
```

---

## Core Architecture Patterns

### Service Layer

All database operations flow through the service layer (`lib/services/`), providing:

- Centralized data access logic
- Consistent error handling
- Input validation via Zod
- Dependency injection for testing

```
Component → Hook → API Route → Service → Supabase
```

**Example service structure:**
```typescript
// lib/services/tasks-service.ts
export const tasksService = {
  async getTasks(spaceId: string, filters?: TaskFilters) { ... },
  async createTask(data: CreateTaskInput) { ... },
  async updateTask(taskId: string, updates: Partial<Task>) { ... },
  async deleteTask(taskId: string) { ... },
};
```

### Data Flow

**Read operations:**
```
React Component
    ↓ useQuery
Custom Hook (lib/hooks/)
    ↓ fetch
API Route (/api/[feature])
    ↓ validated request
Service Layer
    ↓ query
Supabase + RLS
```

**Write operations:**
```
User Action
    ↓ useMutation
API Route
    ↓ Zod validation
Service Layer
    ↓ insert/update
Supabase
    ↓ broadcast
Realtime Channel
    ↓ subscription
Other Connected Clients
```

### Real-time Updates

Supabase Realtime provides live collaboration:

```typescript
// Subscription pattern
const channel = supabase
  .channel(`tasks:${spaceId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `space_id=eq.${spaceId}`,
  }, handleChange)
  .subscribe();
```

**Optimization:** Updates are batched with 50ms debounce to prevent render storms.

### Offline-First

Three-layer persistence ensures offline capability:

1. **Service Worker** (`public/sw.js`) - Caches app shell, 3-second timeout fallback
2. **React Query** - In-memory cache with IndexedDB persistence
3. **IndexedDB** - 24-hour cache with version control

```typescript
// Offline persistence (lib/react-query/offline-persistence.ts)
const persister = createSyncStoragePersister({
  storage: indexedDB,
  key: 'rowan-cache',
  throttleTime: 1000,
});
```

---

## Feature Modules

### Core Features (13)

| Feature | Description | Key Components |
|---------|-------------|----------------|
| **Tasks** | Task management with subtasks, dependencies | `TaskCard`, `TaskList`, `TaskModal` |
| **Calendar** | Unified calendar with external sync | `CalendarView`, `EventModal` |
| **Goals** | Goal tracking with check-ins | `GoalCard`, `GoalProgress` |
| **Reminders** | Scheduled notifications | `ReminderList`, `ReminderModal` |
| **Shopping** | Shared shopping lists | `ShoppingList`, `ShoppingItem` |
| **Messages** | Family messaging | `MessageThread`, `ChatInput` |
| **Meals** | Meal planning & recipes | `MealPlan`, `RecipeCard` |
| **Budget** | Budget tracking & analysis | `BudgetOverview`, `ExpenseChart` |
| **Expenses** | Expense logging & splitting | `ExpenseForm`, `SplitView` |
| **Chores** | Chore rotation & penalties | `ChoreCard`, `RotationView` |
| **Location** | Family location sharing | `LocationMap`, `GeofenceEditor` |
| **Projects** | Project & milestone tracking | `ProjectBoard`, `MilestoneList` |
| **Rewards** | Family reward system | `RewardCard`, `RedemptionModal` |

### Supporting Systems

| System | Purpose | Implementation |
|--------|---------|----------------|
| **Achievements** | Gamification badges | `achievement-service.ts` |
| **Notifications** | Multi-channel delivery | `enhanced-notification-service.ts` |
| **Data Export** | GDPR/CCPA compliance | `data-export-service.ts` |
| **Analytics** | Usage insights | `activity-feed-service.ts` |

---

## API Architecture

### Route Structure

All API routes follow a consistent pattern:

```typescript
// app/api/[feature]/route.ts
export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const { success } = await checkRateLimit(ip);
  if (!success) return error(429);

  // 2. Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return error(401);

  // 3. Authorization
  const hasAccess = await verifySpaceAccess(user.id, spaceId);
  if (!hasAccess) return error(403);

  // 4. Validation
  const validated = schema.parse(body);

  // 5. Service call
  const result = await service.create(validated);

  // 6. Response
  return NextResponse.json(result);
}
```

### Background Jobs

Cron-triggered serverless functions handle:

- Calendar sync (Google, Apple CalDAV)
- Reminder notifications
- Daily digest emails
- Goal check-in reminders
- Account deletion processing

---

## Database Architecture

### Multi-Space Model

All domain data is isolated by `space_id`:

```
spaces (household/family unit)
    ↓ has many
space_members (user membership)
    ↓
users (individual accounts)

All feature tables:
    tasks.space_id → spaces.id
    events.space_id → spaces.id
    goals.space_id → spaces.id
    ... etc
```

### Row-Level Security

Every table has RLS policies enforcing:

- Users can only access spaces they belong to
- Write operations require active membership
- Sensitive operations require ownership

```sql
-- Example RLS policy
CREATE POLICY "Users can view tasks in their spaces"
ON tasks FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM space_members
    WHERE user_id = auth.uid()
  )
);
```

---

## Mobile Architecture

### Capacitor Integration

Native functionality via 36 Capacitor plugins:

| Category | Plugins |
|----------|---------|
| **Notifications** | push-notifications, local-notifications |
| **Location** | geolocation, native calendar |
| **Storage** | secure-storage, filesystem, preferences |
| **UI** | status-bar, splash-screen, keyboard, haptics |
| **Device** | camera, biometric-auth, network |
| **Platform** | share, browser, app-launcher |

### Native Bridges

```
lib/native/
├── capacitor.ts        # Platform detection
├── push-notifications.ts # FCM/APNs
├── geolocation.ts      # Location tracking
├── network.ts          # Connectivity detection
└── calendar.ts         # Native calendar access
```

### Deployment Model

- App loads from Vercel URL (`server.url` in Capacitor config)
- Instant updates without App Store review
- Native shell handles push tokens, deep links, biometrics

---

## State Management

### React Query

Primary state management via React Query:

```typescript
// Query key conventions
['tasks', spaceId]           // List
['tasks', spaceId, taskId]   // Detail
['tasks', spaceId, 'stats']  // Aggregates

// Mutation with optimistic updates
useMutation({
  mutationFn: tasksService.updateTask,
  onMutate: async (newData) => {
    // Optimistic update
    queryClient.setQueryData(['tasks', spaceId], ...);
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks', spaceId], context.previous);
  },
});
```

### Context Providers

```
AppQueryProvider (React Query)
  ↓
DeviceProvider (platform detection)
  ↓
AuthProvider (user session)
  ↓
SpacesProvider (space selection)
  ↓
SubscriptionProvider (billing state)
  ↓
Application Routes
```

---

## Security Model

### Authentication Flow

1. Email/password or OAuth (Google, Apple)
2. Email verification required (enforced after cutoff date)
3. Session stored in HTTP-only cookies (90-day expiry)
4. Refresh tokens handled by Supabase SSR

### Authorization Layers

| Layer | Enforcement |
|-------|-------------|
| **Middleware** | Session validation, CSRF protection |
| **API Routes** | Space membership verification |
| **Service Layer** | Input validation, business rules |
| **Database** | Row-level security policies |

### Input Validation

All user input validated with Zod schemas before processing:

```typescript
// lib/validations/task.ts
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().optional(),
}).strict();
```

---

## Performance Optimizations

### Code Splitting

- Dynamic imports for heavy components (charts, editors)
- Route-based code splitting via Next.js
- Tree-shaking of unused code

### Caching Strategy

| Layer | Strategy |
|-------|----------|
| **Browser** | Service worker app shell cache |
| **React Query** | Stale-while-revalidate, 5-min stale time |
| **API** | Cache-Control headers on read endpoints |
| **Database** | Query result caching via Supabase |

### Query Optimization

- Explicit column selection (no `SELECT *`)
- Indexed queries on filter/sort columns
- Batched operations with `Promise.all`
- Debounced real-time updates (50ms)

---

## Error Handling

### Client-Side

```typescript
// Global error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>

// Query error handling
useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
});
```

### Server-Side

```typescript
try {
  const result = await service.operation();
  return NextResponse.json(result);
} catch (error) {
  Sentry.captureException(error);
  logger.error('Operation failed', { error, context });
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

---

## Testing Strategy

### Test Types

| Type | Tools | Coverage |
|------|-------|----------|
| **E2E** | Playwright | Critical user flows |
| **Type Safety** | TypeScript strict mode | Full codebase |
| **Validation** | Zod runtime checks | All inputs |

### Build Verification

```bash
# Type checking
npx tsc --noEmit

# Production build
npm run build

# E2E tests
npx playwright test
```

---

## Deployment

### Infrastructure

| Component | Platform |
|-----------|----------|
| **Web App** | Vercel (serverless) |
| **Database** | Supabase (managed Postgres) |
| **File Storage** | Supabase Storage |
| **Email** | Resend |
| **Payments** | Stripe |
| **Monitoring** | Sentry |

### CI/CD Pipeline

```
Push to main
    ↓
GitHub Actions
    ├─ Type checking
    ├─ Build verification
    └─ Database migrations
    ↓
Vercel Production Deploy
    ↓
Health check verification
```

---

## Scaling Considerations

### Current Architecture Supports

- **Users:** Optimized for family-scale (2-10 members per space)
- **Spaces:** No hard limit, RLS ensures isolation
- **Data Volume:** Pagination on all list queries
- **Concurrent Users:** Serverless auto-scaling

### Future Scaling Paths

- Database read replicas for query-heavy workloads
- Edge caching for frequently accessed data
- Background job queues for heavy processing
- CDN for static asset delivery

---

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development standards and guidelines.

---

*Last updated: February 2026*
