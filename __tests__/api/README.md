# API Integration Tests

## Overview

Comprehensive integration tests for Rowan's critical API routes, testing authentication, authorization, rate limiting, input validation, and error handling.

## Test Coverage

### Completed Test Files (10 routes, 94 tests, 83 passing)

1. **`/api/auth/signin`** - Authentication (7 tests)
   - ✅ Rate limiting
   - ✅ Invalid email format
   - ✅ Missing password
   - ✅ Invalid JSON
   - ✅ Invalid credentials
   - ✅ Successful signin
   - ⚠️ Email sanitization (1 failing - mock issue)
   - ✅ Rate limit headers

2. **`/api/csrf/token`** - CSRF token generation (4 tests)
   - ✅ Rate limiting
   - ✅ Existing token retrieval
   - ✅ New token generation
   - ✅ Error handling

3. **`/api/spaces/create`** - Space creation (6 tests)
   - ✅ Rate limiting
   - ✅ Authentication
   - ✅ Invalid input
   - ⚠️ Space limit enforcement (3 failing - mock setup issues)
   - ⚠️ Successful creation
   - ⚠️ Service errors

4. **`/api/tasks`** - Task management (12 tests)
   - ✅ GET: Rate limiting, auth, missing space_id, access control, filtering
   - ✅ POST: Auth, usage limits, invalid input
   - ⚠️ POST: Task creation (2 failing - validation schema mocks)

5. **`/api/subscriptions/usage`** - Usage tracking (12 tests)
   - ✅ GET: Rate limiting, auth, usage stats
   - ✅ POST: Rate limiting, auth, invalid types, access control
   - ✅ POST: Increment control

6. **`/api/subscriptions/check-upgrade`** - Upgrade checks (8 tests)
   - ✅ Rate limiting
   - ✅ Authentication
   - ✅ Invalid/missing feature
   - ✅ Upgrade needed/not needed
   - ✅ Error handling

7. **`/api/user/change-password`** - Password changes (7 tests)
   - ✅ Rate limiting
   - ✅ Authentication
   - ✅ Invalid password format
   - ✅ Incorrect current password
   - ✅ Same password validation
   - ✅ Successful change
   - ✅ Password requirements

8. **`/api/auth/password-reset`** - Password reset (6 tests)
   - ✅ Rate limiting
   - ✅ Invalid email
   - ✅ Security (success even when user doesn't exist)
   - ✅ Token creation and email
   - ✅ Email normalization
   - ✅ Method not allowed (GET)

9. **`/api/invitations/accept`** - Invitation acceptance (7 tests)
   - ✅ Rate limiting
   - ✅ Authentication
   - ✅ Missing/invalid token
   - ✅ Service errors
   - ✅ Successful acceptance
   - ✅ Extra field rejection

10. **`/api/chores`** - Chore management (8 tests)
    - ✅ GET: Auth, feature access, missing space_id, success
    - ✅ POST: Auth, feature access, invalid input
    - ⚠️ POST: Creation (1 failing - validation schema)

11. **`/api/goals`** - Goal management (10 tests)
    - ✅ GET: Auth, feature access, missing space_id, access control, success
    - ✅ POST: Auth, feature access, invalid input
    - ⚠️ POST: Creation, sanitization (2 failing - validation schema)

12. **`/api/shopping`** - Shopping list management (11 tests)
    - ✅ GET: Rate limiting, auth, missing space_id, access control, success
    - ✅ POST: Auth, usage limits, invalid input
    - ⚠️ POST: Creation, access control (2 failing - validation schema)

## Test Statistics

- **Total Tests**: 94
- **Passing**: 83 (88.3%)
- **Failing**: 11 (11.7%)
- **Routes Covered**: 12

## Known Issues

The failing tests are due to validation schema mocks not being properly configured. The schemas need to be mocked or the test data needs to match the actual Zod schemas exactly.

### Failing Tests

1. `auth/signin` - Email sanitization test (mock verification issue)
2. `spaces/create` - Space limit tests (3) - Supabase query mock setup
3. `tasks` - Task creation tests (2) - Validation schema
4. `chores` - Chore creation test (1) - Validation schema
5. `goals` - Goal creation/sanitization tests (2) - Validation schema
6. `shopping` - Shopping list creation tests (2) - Validation schema

## Running Tests

```bash
# Run all API tests
npx vitest run __tests__/api/

# Run specific route tests
npx vitest run __tests__/api/auth/signin/route.test.ts

# Run with coverage
npx vitest run __tests__/api/ --coverage

# Watch mode
npx vitest __tests__/api/
```

## Test Patterns

All tests follow this structure:

1. **Setup** - Mock dependencies
2. **Arrange** - Create request with test data
3. **Act** - Call route handler
4. **Assert** - Verify response status, headers, body

### Common Assertions

- `response.status` - HTTP status code
- `data.error` - Error messages
- `data.success` - Success flag
- `data.data` - Response payload
- Service method calls with correct parameters

## Next Steps

### Priority 1: Fix Failing Tests

Need to add validation schema mocks for:
- `createTaskSchema`
- `createChoreSchema`
- `createGoalSchema`
- `createShoppingListSchema`

### Priority 2: Additional Routes (Top 10 remaining)

4. `/api/webhooks/polar` [POST] - Stripe webhooks
5. `/api/admin/auth/login` [POST] - Admin authentication
7. `/api/privacy/account-deletion` [POST] - GDPR compliance
8. `/api/privacy/data-export` [POST] - Data export
13. `/api/ai/chat` [POST] - AI chat
14. `/api/polar/checkout` [POST] - Checkout
15. `/api/calendar/events` [POST/GET] - Calendar events

### Priority 3: Coverage Expansion

Once the top 20 are complete, expand to cover:
- PUT/PATCH/DELETE operations
- Edge cases and error conditions
- Integration with external services
- Real-time subscriptions

## Contributing

When adding new API route tests:

1. Create test file at `__tests__/api/<path>/route.test.ts`
2. Mock all external dependencies
3. Test all HTTP methods (GET, POST, PUT, DELETE)
4. Cover: rate limiting, auth, validation, success, errors
5. Use descriptive test names
6. Follow existing patterns

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Next.js Route Handler Testing](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)
