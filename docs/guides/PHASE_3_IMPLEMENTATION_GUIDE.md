# Phase 3: Service Layer Refactoring - Implementation Guide

> **Status**: Ready for implementation
> **Estimated Effort**: 10-15 hours across multiple sessions
> **Risk Level**: MEDIUM (functional changes to 20 components)

---

## 📋 Overview

20 components are making direct Supabase database calls instead of using the service layer pattern. This guide provides step-by-step instructions for refactoring each component.

**Key Principle**: Replace direct `supabase.from('table_name')` calls with service layer functions.

---

## ✅ Prerequisites Completed

- [x] Phase 1: TypeScript type safety improvements (23/44 `any` types fixed)
- [x] Phase 2: Console statement security audit (2 critical issues fixed)
- [x] Service layer analysis completed
- [x] Existing services verified and documented below

---

## 🎯 Refactoring Strategy

### Batch 1: High-Value Components (Use existing services)
These already have complete service implementations - just need to swap calls.

### Batch 2: Medium-Value Components (May need service extensions)
Service exists but may need additional functions.

### Batch 3: Lower-Priority Components
Less frequently used, but still important for consistency.

---

## 📦 Batch 1: High-Value Refactors (Existing Services)

### 1. **components/goals/GoalComments.tsx**
**Service**: `lib/services/goals-service.ts`

**Current Issue**: Direct calls to `goal_comments` table
**Available Functions**:
- `goalsService.getGoalComments(goalId)`
- `goalsService.createComment(input)`
- `goalsService.updateComment(commentId, content)`
- `goalsService.deleteComment(commentId, userId)`

**Refactoring Pattern**:
```typescript
// ❌ BEFORE
const { data, error } = await supabase
  .from('goal_comments')
  .select('*')
  .eq('goal_id', goalId);

// ✅ AFTER
import { goalsService } from '@/lib/services/goals-service';
const comments = await goalsService.getGoalComments(goalId);
```

**Testing**: Verify comments load, create, edit, and delete correctly

---

### 2. **components/tasks/ApprovalModal.tsx**
**Service**: `lib/services/task-approvals-service.ts`

**Current Issue**: Direct calls to `task_approvals` table
**Available Functions**: Already exists! Just needs to use it.

**Refactoring Pattern**:
```typescript
// ❌ BEFORE
const { data, error } = await supabase
  .from('task_approvals')
  .insert([approval]);

// ✅ AFTER
import { taskApprovalsService } from '@/lib/services/task-approvals-service';
await taskApprovalsService.createApproval(approvalInput);
```

**Testing**: Verify task approval workflow still works

---

### 3. **components/meals/NewRecipeModal.tsx**
**Service**: `lib/services/meals-service.ts`

**Current Issue**: Direct calls to `recipes` table
**Available Functions**:
- `mealsService.createRecipe(input)`
- `mealsService.updateRecipe(id, input)`

**Refactoring Pattern**:
```typescript
// ❌ BEFORE
const { data, error } = await supabase
  .from('recipes')
  .insert([recipe]);

// ✅ AFTER
import { mealsService } from '@/lib/services/meals-service';
await mealsService.createRecipe(recipeInput);
```

**Testing**: Verify recipe creation and editing

---

### 4. **components/shared/UnifiedItemModal.tsx**
**Service**: Multiple services depending on entity type

**Current Issue**: Direct calls to multiple tables based on entity type
**Strategy**: Use switch statement to route to appropriate service

**Refactoring Pattern**:
```typescript
// ❌ BEFORE
const { data, error } = await supabase
  .from(entityTable)
  .insert([item]);

// ✅ AFTER
switch (entityType) {
  case 'task':
    return await tasksService.createTask(input);
  case 'goal':
    return await goalsService.createGoal(input);
  // ... etc
}
```

**Testing**: Test all entity types (tasks, goals, expenses, etc.)

---

## 📦 Batch 2: Medium-Value Refactors

### 5. **components/reminders/MentionInput.tsx**
**Service**: `lib/services/comments-service.ts` (has mention functions)

**Available Functions**:
- `extractMentions(text)` - Extract @mentions from text
- `getUnreadMentions(userId)` - Get unread mentions

**May Need**: Check if all mention functionality is covered

---

### 6. **components/reminders/UserPicker.tsx**
**Service**: May need to extend `users-service.ts` or create user picker service

**Current Issue**: Direct queries to `users` table
**Action**: Check if existing user service has what we need, extend if necessary

---

### 7-9. **Meal Components** (3 files)
- `components/meals/TwoWeekCalendarView.tsx`
- `components/meals/IngredientReviewModal.tsx`
- `components/meals/WeekCalendarView.tsx`

**Service**: `lib/services/meals-service.ts`

**Strategy**: Audit each component's database calls and map to existing service functions

---

### 10-11. **Expense Components** (2 files)
- `components/expenses/RecurringBillsCalendar.tsx`
- `components/expenses/RecurringPatternsList.tsx`

**Service**: `lib/services/expenses-service.ts`

**Likely Needs**: Recurring bill specific functions (may need to extend service)

---

## 📦 Batch 3: Lower-Priority Refactors

### 12. **components/shared/SpaceMembersIndicator.tsx**
**Service**: Space/user service

### 13-16. **Goal Components** (4 files)
- `components/goals/ActivityFeed.tsx`
- `components/goals/badges/BadgeNotification.tsx`
- `components/goals/CheckInReactions.tsx`
- `components/goals/CheckInHistoryTimeline.tsx`

**Service**: `lib/services/goals-service.ts`

---

### 17-20. **Shopping/Messages/Tasks** (4 files)
- `components/shopping/NewShoppingListModal.tsx`
- `components/messages/MessageNotificationBell.tsx`
- `components/messages/ForwardMessageModal.tsx`
- `components/tasks/DraggableTaskList.tsx`

**Services**:
- `lib/services/shopping-service.ts`
- `lib/services/messages-service.ts`
- `lib/services/tasks-service.ts`

---

## 🔧 Step-by-Step Refactoring Process

For each component:

### 1. **Analyze Current State**
```bash
# Find all direct Supabase calls
grep -n "supabase.from" components/path/to/Component.tsx
```

### 2. **Identify Service Functions**
- Check if service already has required functions
- Document any missing functions that need to be added

### 3. **Refactor Imports**
```typescript
// Remove direct supabase import (if not needed elsewhere)
// import { createClient } from '@/lib/supabase/client';

// Add service import
import { serviceNameService } from '@/lib/services/service-name-service';
```

### 4. **Replace Database Calls**
- Replace each `supabase.from()` call with service function
- Maintain same error handling patterns
- Keep loading states unchanged

### 5. **Test Thoroughly**
```bash
# Run build
npm run build

# Test in development
npm run dev

# Manually test the feature
```

### 6. **Commit Incrementally**
```bash
git add components/path/to/Component.tsx
git commit -m "refactor(component): use service layer instead of direct DB calls

- Replaced supabase.from('table') with serviceNameService.function()
- No functional changes, improves maintainability
- Verified functionality with manual testing

Related to REFACTORING_ROADMAP.md Phase 3"
```

---

## 🛡️ Safety Guidelines

### DO:
✅ Test each component after refactoring
✅ Commit after each successful refactor
✅ Maintain existing error handling
✅ Keep the same user experience
✅ Run `npm run build` before committing

### DON'T:
❌ Refactor multiple components in one commit
❌ Change functionality while refactoring
❌ Remove error handling
❌ Skip testing
❌ Rush through batch refactors

---

## 📊 Progress Tracking

Create a checklist as you complete each refactor:

```markdown
### Batch 1 Progress
- [ ] GoalComments.tsx
- [ ] ApprovalModal.tsx
- [ ] NewRecipeModal.tsx
- [ ] UnifiedItemModal.tsx

### Batch 2 Progress
- [ ] MentionInput.tsx
- [ ] UserPicker.tsx
- [ ] TwoWeekCalendarView.tsx
- [ ] IngredientReviewModal.tsx
- [ ] WeekCalendarView.tsx
- [ ] RecurringBillsCalendar.tsx
- [ ] RecurringPatternsList.tsx

### Batch 3 Progress
- [ ] SpaceMembersIndicator.tsx
- [ ] ActivityFeed.tsx
- [ ] BadgeNotification.tsx
- [ ] CheckInReactions.tsx
- [ ] CheckInHistoryTimeline.tsx
- [ ] NewShoppingListModal.tsx
- [ ] MessageNotificationBell.tsx
- [ ] ForwardMessageModal.tsx
- [ ] DraggableTaskList.tsx
```

---

## 🎓 Example: Complete Refactor

### Before: GoalComments.tsx
```typescript
const loadComments = async () => {
  const { data: commentsData, error } = await supabase
    .from('goal_comments')
    .select('*, users!goal_comments_user_id_fkey(id, email, full_name, avatar_url)')
    .eq('goal_id', goalId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  setComments(commentsData || []);
};
```

### After: GoalComments.tsx
```typescript
import { goalsService } from '@/lib/services/goals-service';

const loadComments = async () => {
  try {
    const comments = await goalsService.getGoalComments(goalId);
    setComments(comments);
  } catch (error) {
    console.error('Error loading comments:', error);
    // Handle error appropriately
  }
};
```

**Benefits**:
- ✅ Single source of truth for goal comment queries
- ✅ Easier to test (can mock service)
- ✅ Easier to maintain (change query in one place)
- ✅ Consistent error handling

---

## 🚀 Next Steps

1. **Start with Batch 1** - These have complete services and are highest priority
2. **One component at a time** - Test thoroughly before moving to next
3. **Commit frequently** - Small, focused commits are safer
4. **Update this guide** - Check off completed items as you go
5. **Update REFACTORING_ROADMAP.md** - Mark Phase 3 items as complete

---

## 📞 Need Help?

- Check `CLAUDE.md` for service layer patterns
- Review existing refactored services for examples
- Test locally before committing
- Use feature branches for risky refactors

---

**Last Updated**: 2025-11-30
**Status**: Phase 1 & 2 Complete, Phase 3 Ready to Start
