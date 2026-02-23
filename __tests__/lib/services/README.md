# Service Tests

This directory contains comprehensive unit tests for 24 service files in `/lib/services/`.

## Test Coverage Summary

All tests follow these patterns:
- ✅ Use Vitest (`describe`, `it`, `expect`, `vi`)
- ✅ Use `@/` path aliases
- ✅ Mock Supabase using `vi.hoisted()` and `vi.mock()`
- ✅ Test happy paths, error handling, and edge cases
- ✅ 5-10 tests per service file minimum
- ✅ No source file modifications

## Services Tested (24 total)

1. ✅ **ingredient-parser.test.ts** - CREATED ✅ ALL 28 TESTS PASSING
   - Tests for recipe ingredient parsing, aggregation, categorization
   - Covers: parseIngredient, parseRecipeIngredients, aggregateIngredients, formatIngredient, generateShoppingList, categorizeIngredient

2. ✅ **natural-language-parser.test.ts** - CREATED ✅ ALL 21 TESTS PASSING
   - Tests for event text parsing, category prediction, validation
   - Covers: parseEventText (time, location, duration, recurring), predictCategory, getEventSuggestions, isValidParsedEvent

3. ✅ **event-attachments-service.test.ts** - CREATED ✅ ALL 17 TESTS PASSING
   - Tests for file upload, download, delete for calendar events
   - Covers: uploadAttachment (validation, storage, db), getAttachments, getAttachmentUrl, downloadAttachment, deleteAttachment, getAttachmentCount
   - Security: file type validation, size limits, sanitization

4. ⚠️ **mentions-service.test.ts** - CREATED (has 7 failing tests - mock chain issues)
   - Tests for @mention extraction and resolution
   - Covers: extractMentions, resolveMentions, createMentions, getMentionsForMessage, getUnreadMentions, getUnreadMentionCount, markMentionAsRead, markMessageMentionsAsRead, deleteMentionsForMessage, getMentionableUsers, processMessageMentions
   - Issue: Supabase query chain mocking needs refinement for multiple .eq() calls

## Summary

**Completed:** 3 test files (66 tests, all passing)
- ingredient-parser.test.ts (28 tests)
- natural-language-parser.test.ts (21 tests)
- event-attachments-service.test.ts (17 tests)

**In Progress:** 1 test file (needs fixes)
- mentions-service.test.ts (29 tests, 7 failing due to mock chain issues)

**Remaining:** 20 services from original list of 24

### Remaining Services to Test

The following services have been analyzed and are ready for testing. Each requires:
- Supabase client mocking
- Auth user mocking where applicable
- RPC function mocking
- Storage operation mocking

**Database-dependent services** (require Supabase mocking):
- event-attachments-service.ts
- event-comments-service.ts
- event-proposals-service.ts
- expense-splitting-service.ts
- goal-analytics-service.ts
- goal-contributions-service.ts
- goal-dependencies-service.ts
- household-balance-service.ts
- in-app-notifications-service.ts
- member-management-service.ts
- mentions-service.ts
- milestone-notification-service.ts
- notification-queue-service.ts

**Client/API services** (require fetch mocking):
- export-service.ts (CSV generation, DOM operations)
- external-recipes-service.ts (API calls via fetch)
- geographic-detection-service.ts (IP geolocation APIs)
- geolocation-service.ts (localStorage + fetch)
- ocr-service.ts (fetch + file processing)

**Server-only services** (require server client mocking):
- feature-access-service.ts
- family-location-service.ts (Zod validation + GPS calculations)

**Mixed services**:
- file-upload-service.ts (Supabase storage + browser APIs)
- financial-reports-service.ts (class instance, RPC calls, chart generation)

## Test Patterns

### Pattern 1: Basic Service with Database Queries
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => ({ data: {}, error: null })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('service-name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data successfully', async () => {
    // Test implementation
  });
});
```

### Pattern 2: Service with Auth
```typescript
const mockAuth = vi.hoisted(() => ({
  getUser: vi.fn(() => ({ data: { user: { id: 'user-123' } }, error: null })),
}));

const mockSupabase = vi.hoisted(() => ({
  auth: mockAuth,
  from: vi.fn(() => mockSupabase),
  // ... rest of methods
}));
```

### Pattern 3: Client-side Service (localStorage + fetch)
```typescript
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

global.localStorage = mockLocalStorage as any;
global.fetch = vi.fn();
```

## Running Tests

```bash
# Run all service tests
pnpm test __tests__/lib/services

# Run specific test file
pnpm test __tests__/lib/services/ingredient-parser.test.ts

# Run with coverage
pnpm test:coverage __tests__/lib/services
```

## Test Requirements Checklist

For each service test file:
- [ ] Imports use @/ aliases
- [ ] Supabase/fetch properly mocked
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested (null, empty, invalid input)
- [ ] Auth scenarios tested (where applicable)
- [ ] All exported functions covered
- [ ] Proper cleanup in beforeEach/afterEach

## Detailed Status of Original 24 Services

From the user's original request:
1. ✅ **ingredient-parser.ts** - COMPLETE (28 tests passing)
2. ✅ **natural-language-parser.ts** - COMPLETE (21 tests passing)
3. ✅ **event-attachments-service.ts** - COMPLETE (17 tests passing)
4. ⚠️ **mentions-service.ts** - IN PROGRESS (7 failing tests, needs mock chain fixes)
5. ❌ **event-comments-service.ts** - NOT STARTED
6. ❌ **event-proposals-service.ts** - NOT STARTED
7. ❌ **expense-splitting-service.ts** - NOT STARTED
8. ❌ **export-service.ts** - NOT STARTED (pdf-export, space-export, task-export exist but not base export-service)
9. ❌ **external-recipes-service.ts** - NOT STARTED
10. ❌ **family-location-service.ts** - NOT STARTED
11. ❌ **feature-access-service.ts** - NOT STARTED
12. ❌ **file-upload-service.ts** - NOT STARTED
13. ❌ **financial-reports-service.ts** - NOT STARTED
14. ❌ **geographic-detection-service.ts** - NOT STARTED
15. ❌ **geolocation-service.ts** - NOT STARTED
16. ❌ **goal-analytics-service.ts** - NOT STARTED
17. ❌ **goal-contributions-service.ts** - NOT STARTED
18. ❌ **goal-dependencies-service.ts** - NOT STARTED
19. ❌ **household-balance-service.ts** - NOT STARTED
20. ❌ **in-app-notifications-service.ts** - NOT STARTED
21. ❌ **member-management-service.ts** - NOT STARTED
22. ❌ **milestone-notification-service.ts** - NOT STARTED
23. ❌ **notification-queue-service.ts** - NOT STARTED
24. ❌ **ocr-service.ts** - NOT STARTED

## Next Steps

Create tests for remaining 20 services following the patterns above. Priority order:
1. Pure function services (easiest, no DB): ingredient-parser ✅, natural-language-parser ✅
2. Simple CRUD services: mentions-service, milestone-notification-service
3. Complex services: expense-splitting-service, goal-analytics-service
4. API integration services: external-recipes-service, ocr-service
5. Storage services: file-upload-service, event-attachments-service
