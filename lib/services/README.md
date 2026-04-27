# Service Layer Conventions

Every database operation in this app goes through a service in `lib/services/`. Components and API routes never call Supabase directly — they call a service function. This file documents the conventions enforced for that boundary.

For repo-wide rules, see [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md). For database/migration policy, see [`../../supabase/migrations/README.md`](../../supabase/migrations/README.md).

---

## When to create a sub-folder

Services live as flat files under `lib/services/` until a logical group reaches 3+ related files. At that point, create a sub-folder:

```
lib/services/messages/
  index.ts             # barrel re-export (or a sibling messages-service.ts)
  types.ts             # shared interfaces
  conversations.ts     # one logical concern
  threads.ts
  reactions.ts
  ...
```

The barrel keeps the public import path stable so existing call sites don't change. New features added to a sub-folder can be imported from the same `@/lib/services/<feature>-service` path that worked before the split.

**Rule:** create a sub-folder when adding the 3rd file to a related cluster, OR when a single flat service exceeds the 600-line app-code hard cap.

Existing sub-folders to mirror as templates: `ai/`, `calendar/`, `goals/`, `rewards/`, `messages/` (split 2026-04-27).

---

## `select('*')` exemption

The general rule is **never use `select('*')` on read queries.** Replace `'*'` with the columns the consumer actually needs. This reduces wire size, prevents accidental exposure of internal columns, and makes schema changes safer.

**Three exempt files** must keep `select('*')`:

- `data-export-service.ts`
- `space-export-service.ts`
- `bulk-operations-service.ts`

These power **GDPR Article 20 (Right to Data Portability)** and **Article 15 (Right of Access)**. The user is legally entitled to receive every column we store about them, including columns added after this comment was written. Each file has a header comment explaining the exemption — leave it in place.

---

## Always filter by `space_id`

Every multi-tenant table has a `space_id` foreign key. Queries must include `.eq('space_id', spaceId)` unless one of the following applies:

| Case | Example | Why |
|---|---|---|
| Lookup by primary key | `.eq('id', messageId)` | Scoped to a single row; RLS still enforces tenant boundary |
| Global table | `users`, `spaces`, `auth.users` | No `space_id` column |
| Tenant table itself | `spaces` | Querying the tenant table by `id` |
| Joined-and-filtered | `.eq('conversation.space_id', X)` | Tenant filter on the joined relation |

Semgrep rule `supabase-missing-space-id-filter` (in `.semgrep.yml`) enforces this. When one of the cases above applies and the rule still fires, suppress it with a same-line `// nosemgrep:` comment that documents the actual security model. See `notification-preferences-service.ts` and `recurring-expenses-service.ts` for examples.

---

## Sanitize at the service boundary

User-supplied content gets sanitized before any database write:

- Plain text → `sanitizePlainText` from `@/lib/sanitize`
- HTML → `sanitizePlainText` (we strip HTML by default; use the `safeHtml` variant only when rich text is intentional)
- URLs → `sanitizeUrl`
- Search input → `sanitizeSearchInput` from `@/lib/utils/input-sanitization`

Validation (Zod schemas) lives in API routes; sanitization lives in services. The split keeps services usable from cron jobs and server actions without duplicating Zod schemas.

---

## Server-only vs client-safe services

| Pattern | Where | Supabase client |
|---|---|---|
| Client-callable (most services) | `lib/services/*.ts` | `createClient()` from `@/lib/supabase/client` (anon key, RLS-enforced) |
| Server-only (cron jobs, webhooks, admin actions) | Same files, but invoked from `app/api/cron/`, `app/api/webhooks/` | `supabaseAdmin` from `@/lib/supabase/admin` (service role, bypasses RLS — use carefully) |
| Pure server (PDF generation, file conversion) | `pdf-generation-service.tsx`, `year-in-review-pdf.tsx`, etc. | No DB; pure render-to-blob |

Files marked **PERF: server-only** in their header must never be imported from `'use client'` components. The bundle analyzer flags this if it slips.

---

## Real-time subscriptions

Supabase channels must be cleaned up on unmount. Pattern:

```ts
useEffect(() => {
  const channel = messagesService.subscribeToMessages(conversationId, callbacks);
  return () => messagesService.unsubscribe(channel);
}, [conversationId]);
```

Real-time channels were consolidated from 15 down to 3 in 2026-04 (PR #267) — prefer subscribing to one channel per logical surface, not one per row.

---

## Naming conventions for new services

- File: `<feature>-service.ts` (or `<feature>/index.ts` in sub-folder form)
- Exported object: `<feature>Service` (camelCase) — e.g., `messagesService`, `tasksService`
- Methods: verb-noun, async — e.g., `getConversations`, `createMessage`, `markAsRead`

For services that don't expose a single object (helpers, utils, types-only), export named functions directly.
