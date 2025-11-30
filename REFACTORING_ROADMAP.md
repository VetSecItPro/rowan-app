# 🔧 Rowan App - Technical Debt & Refactoring Roadmap

> **Generated from Governance Audit - November 30, 2025**
>
> This document outlines technical debt and code quality improvements identified during a comprehensive governance audit. All items are **non-blocking** and can be addressed incrementally.

---

## 📊 Executive Summary

**Overall Code Health: STRONG** ✅

- **Security**: Excellent (zero critical issues)
- **Architecture**: Good (some service layer violations)
- **Type Safety**: Good (44 `any` types to fix)
- **Code Cleanup**: Minor (console statements audit needed)

**Priority**: All items are LOW to MEDIUM priority. The application is production-ready as-is.

---

## 🎯 Priority 1: Service Layer Compliance

### Issue
20 components are making direct Supabase database calls instead of using the service layer pattern defined in `CLAUDE.md`.

### Impact
- **Functional**: None (all features work correctly)
- **Maintainability**: Medium (harder to refactor database logic)
- **Testing**: Medium (harder to mock and test)

### Components Requiring Refactoring

#### High-Value Refactors (Most Used)
1. `components/goals/GoalComments.tsx`
   - Direct calls to: `goal_comments` table
   - Recommendation: Create `goal-comments-service.ts` or extend `comments-service.ts`

2. `components/tasks/ApprovalModal.tsx`
   - Direct calls to: `task_approvals` table
   - Recommendation: Use existing `task-approvals-service.ts`

3. `components/meals/NewRecipeModal.tsx`
   - Direct calls to: `recipes` table
   - Recommendation: Extend existing `meals-service.ts`

4. `components/shared/UnifiedItemModal.tsx`
   - Direct calls to: Multiple tables
   - Recommendation: Use appropriate service for each entity type

#### Medium-Value Refactors
5. `components/reminders/MentionInput.tsx`
6. `components/reminders/UserPicker.tsx`
7. `components/meals/TwoWeekCalendarView.tsx`
8. `components/meals/IngredientReviewModal.tsx`
9. `components/meals/WeekCalendarView.tsx`

#### Lower-Priority Refactors
10. `components/shared/SpaceMembersIndicator.tsx`
11. `components/expenses/RecurringBillsCalendar.tsx`
12. `components/expenses/RecurringPatternsList.tsx`
13. `components/goals/ActivityFeed.tsx`
14. `components/goals/badges/BadgeNotification.tsx`
15. `components/goals/CheckInReactions.tsx`
16. `components/goals/CheckInHistoryTimeline.tsx`
17. `components/shopping/NewShoppingListModal.tsx`
18. `components/messages/MessageNotificationBell.tsx`
19. `components/messages/ForwardMessageModal.tsx`
20. `components/tasks/DraggableTaskList.tsx`

### Refactoring Pattern

```typescript
// ❌ BEFORE: Direct Supabase call in component
const { data, error } = await supabase
  .from('goal_comments')
  .select('*')
  .eq('goal_id', goalId);

// ✅ AFTER: Use service layer
import { commentsService } from '@/lib/services/comments-service';
const comments = await commentsService.getGoalComments(goalId);
```

### Estimated Effort
- Per component: 30-60 minutes
- Total: 10-20 hours spread across multiple sessions

---

## 🔷 Priority 2: TypeScript Type Safety

### Issue
44 occurrences of `any` type across 20 files, reducing type safety.

### Files Requiring Type Fixes

#### High Priority (Most Occurrences)
1. **`lib/services/shopping-service.ts`** - 10 occurrences
   ```typescript
   // Lines requiring fixes:
   // 94: items?: any → items?: CreateItemInput[]
   // 97: input as any → proper type assertion
   // 112: items?: any → items?: CreateItemInput[]
   // 115: updates as any → proper type assertion
   // 116: finalUpdates: any → Record<string, unknown>
   // 183: { checked } as any → proper partial type
   // 220: callback: (payload: any) → callback: (payload: RealtimePayload)
   // 241: callback: (payload: any) → callback: (payload: RealtimePayload)
   // 281: item: any → item: ShoppingItem
   // 321: items: any[] → items: CreateItemInput[]
   ```

2. **`app/admin/analytics/page.tsx`** - 4 occurrences
   - Admin page, lower priority for production

3. **Other Files** - 30 occurrences total
   - `components/budget/ProjectLineItems.tsx`: 3
   - `lib/services/task-snooze-service.ts`: 2
   - `lib/services/notification-queue-service.ts`: 2
   - `lib/services/task-calendar-service.ts`: 2
   - `components/budget/ProjectDashboard.tsx`: 2
   - Various other files: 1 each

### Recommended Approach
1. Fix shopping-service.ts first (most occurrences, high-value service)
2. Create proper TypeScript interfaces where missing
3. Use `unknown` instead of `any` for truly dynamic data
4. Add type guards for runtime validation

### Type Safety Improvements

```typescript
// ❌ BEFORE
async createList(input: CreateListInput & { items?: any })

// ✅ AFTER
interface CreateListWithItems extends CreateListInput {
  items?: CreateItemInput[];
}
async createList(input: CreateListWithItems)
```

### Estimated Effort
- shopping-service.ts: 2 hours
- Other files: 4-6 hours total

---

## 🧹 Priority 3: Console Statement Cleanup

### Issue
102 console statements found in `/app/api/**` routes.

### Current Status
- **Acceptable**: Most are `console.error()` for error logging
- **Risk**: Some may log sensitive data (needs audit)

### Action Items
1. **Audit for Sensitive Data** (1-2 hours)
   - Search for console statements that log user data, tokens, or API keys
   - Replace with Sentry logging where appropriate

2. **Standardize Logging** (2-3 hours)
   - Use Sentry for production error tracking (already integrated)
   - Keep `console.error()` for development
   - Remove unnecessary `console.log()` statements

### Logging Best Practice

```typescript
// ❌ AVOID: May log sensitive data
console.log('User data:', userData);

// ✅ BETTER: Use Sentry with sanitization
Sentry.captureException(error, {
  tags: { endpoint: '/api/users' },
  extra: { userId: user.id } // Don't log full user object
});
```

---

## 📋 Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
- [x] Fix Edamam API key exposure (COMPLETED)
- [ ] Fix TypeScript types in shopping-service.ts
- [ ] Audit console statements for sensitive data

### Phase 2: Service Layer (10-15 hours, spread across sprints)
- [ ] Refactor top 5 high-value components
- [ ] Create missing service functions
- [ ] Document service layer patterns

### Phase 3: Remaining Type Safety (4-6 hours)
- [ ] Fix remaining TypeScript `any` types
- [ ] Add missing interfaces
- [ ] Improve type coverage

### Phase 4: Polish (2-3 hours)
- [ ] Clean up console statements
- [ ] Update documentation
- [ ] Add type safety tests

---

## 🎯 Success Metrics

Track improvement over time:
- **Service Layer Compliance**: 0/20 components refactored → Goal: 20/20
- **Type Safety**: 44 `any` types → Goal: <10
- **Console Statements**: 102 → Goal: <20 (error logging only)

---

## 📌 Notes

- **No Breaking Changes**: All refactoring should be backwards compatible
- **Test Coverage**: Add tests when refactoring components
- **Documentation**: Update CLAUDE.md with new service patterns
- **Incremental Progress**: Address 2-3 items per sprint

---

## 🔗 Related Documents

- [CLAUDE.md](/CLAUDE.md) - Development standards and patterns
- [Tech Stack.md](/Tech%20Stack.md) - Technology documentation
- Governance Audit Report: `.claude/audits/security-audit-2025-11-29.md`

---

**Last Updated**: November 30, 2025
**Status**: Living document - update as items are completed
