# Contributing to Rowan

This file documents the conventions and quality bar for working in this repo. The maintainer's personal `CLAUDE.md` is gitignored, so anything that should propagate to contributors lives here.

For database-specific conventions, see [`supabase/migrations/README.md`](supabase/migrations/README.md). For service-layer conventions, see [`lib/services/README.md`](lib/services/README.md).

---

## Git workflow

**Never push or commit directly to `main`.** Every change ships through a feature branch + PR + green CI.

1. Create a branch: `feature/<short-description>`, `fix/<short>`, `refactor/<short>`, `chore/<short>`, or `experiment/<short>`.
2. Commit on the branch using semantic prefixes: `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `docs(scope): ...`, `chore(scope): ...`, `perf(scope): ...`, `test(scope): ...`.
3. Push and open a PR. CI runs Lint+TypeCheck, Build+Bundle, Security Audit (Semgrep + npm audit + secret scan), and Lighthouse.
4. **All required checks must pass before merge.** Branch protection has `enforce_admins: true` — admins do not bypass red checks. If a check is failing, fix the underlying issue or add a documented exception (e.g., `// nosemgrep:` with reason).
5. **Squash-merge.** Delete the branch after merge.

### Why no `--admin` bypass

PR #285 (2026-04-27) merged with a Semgrep finding via `--admin`. The finding was real (`mergePatterns` lacked an explicit `space_id` filter for defense-in-depth). The lesson: gates flag real issues; bypassing ships them. `enforce_admins: true` was enabled the same day to make this structural.

---

## File size policy

Overrides the global "split anything over 400 lines" rule. Three rules:

1. **Application code** (`lib/services/`, `lib/hooks/`, `app/api/`, `components/` excluding `app/(main)/settings/documentation/`):
   - 400-line **soft warning**
   - 600-line **hard limit** — when a file exceeds 600, the next person to touch it splits it (or documents why not)
2. **Documented exemptions** (no line cap):
   - `app/(main)/settings/documentation/**/*.tsx` — JSX-as-content static doc pages
   - `lib/data/**/*.ts` — data fixtures, content arrays, large enums
   - `lib/services/ai/tool-definitions.ts`, `lib/services/ai/tool-executor.ts` — list-shaped tool registries
3. **Trend, don't gate** — track count of >400-line application files as a code-health metric, not a CI blocker.

The 600 limit fits "real cognitive load." The exemptions catch files where splitting actively hurts (fragmenting readable static content, breaking 23+ importers for aesthetic reasons).

---

## Code quality

- **No `any` types.** Use interfaces from `lib/types.ts` or domain-specific types. Tests are exempt (mocks + fixtures commonly use `any`).
- **Naming:** `camelCase` (vars, functions), `PascalCase` (components, types, classes), `UPPER_SNAKE_CASE` (constants).
- **No direct Supabase in components.** ALL database operations go through `lib/services/` (mandatory). See [`lib/services/README.md`](lib/services/README.md).
- **Always cleanup real-time subscriptions.** Return an unsubscribe call from `useEffect`.
- **No `console.log`** outside scripts/tests. ESLint blocks it; use the `logger` from `@/lib/logger` instead.
- **No new `// FIXME` comments.** ESLint warns on them. `// TODO` is allowed for legitimate backlog markers but should ideally reference a tracked issue.

---

## Security

- **Never bypass RLS.** No `service_role` key on the client. Server-only services use `supabaseAdmin` from `@/lib/supabase/admin`.
- **Filter ALL queries by `space_id`** unless the table is global (e.g., `users`, `spaces` itself, `auth.users`). RLS policies enforce this server-side, but the client-side filter is defense-in-depth.
- **Validate input with Zod.** Sanitize HTML with DOMPurify (`@/lib/sanitize`). Sanitize plain text inputs at the service boundary.
- **Rate-limit every API route.** See `@/lib/ratelimit`.
- **Never commit `.env.local`.** Only `NEXT_PUBLIC_*` keys are client-safe.

The Semgrep config (`.semgrep.yml`) enforces the space_id rule and bans `SUPABASE_SERVICE_ROLE_KEY` in client-side paths. To suppress a false positive, add a same-line annotation: `// nosemgrep: <rule-id> — <reason>`.

---

## UI / styling

- **Dark mode only.** Rowan does not have a light mode. Use dark-tone classes directly (`bg-gray-900`, `text-white`, etc.) — no `dark:` prefixes needed, no theme toggle.
- **Mobile responsive.** Layouts must work on touch + small screens (Capacitor wrapper ships to iOS/Android).
- **No emojis or sparkle icons in code.** Use `lucide-react` icons. Specifically: `Wand2`, never `Sparkles`. No em dashes (`—`) in UI strings — use regular dashes or rephrase.

### Feature color map

```ts
const COLORS = {
  tasks: 'blue',       calendar: 'purple',  reminders: 'pink',
  messages: 'green',   shopping: 'emerald', meals: 'orange',
  household: 'amber',  goals: 'indigo',
};
```

Used for icon tints and feature-specific accents.

---

## Build notes

- **`lru-cache` v11+:** named export only. `import { LRUCache } from 'lru-cache'` — never default-import.
- **`isomorphic-dompurify` / `jsdom`:** must stay in `serverExternalPackages` in `next.config.mjs`. Webpack can't bundle `jsdom`'s `fs.readFileSync('default-stylesheet.css')`.
- **`@react-pdf/renderer`:** server-only. Only consumed from API routes and the email-template render path. Never import into a `'use client'` component.

---

## Reviews & ship

- For broad audits, the maintainer uses skills (`/sec-ship`, `/perf`, `/qatest`, `/monitor`, etc.). Each writes its report to `.{skill}-reports/` (gitignored).
- After-merge: `/monitor` is the standard post-deploy gate. Production HTTP 200 + verified content > "Vercel said success."

---

## Related docs

- [`supabase/migrations/README.md`](supabase/migrations/README.md) — migration policy + drift detection
- [`lib/services/README.md`](lib/services/README.md) — service layer + folder conventions
- [`eslint.config.mjs`](eslint.config.mjs) — lint rules with inline rationale
- [`lib/services/ai/ai-access-guard.ts`](lib/services/ai/ai-access-guard.ts) — AI tier policy (docstring)
