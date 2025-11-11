# 🔍 PHASE 0: COMPREHENSIVE DEPENDENCY ANALYSIS
## Date: November 9, 2025 | Status: Completed

---

## 📊 **DEPENDENCY MAPPING RESULTS**

### **🔐 Authentication Dependencies (useAuth) - 20 Files**
Files that import and use the `useAuth()` hook:

**Core Pages:**
1. `app/(main)/dashboard/page.tsx`
2. `app/(main)/meals/page.tsx`
3. `app/(main)/tasks/page.tsx`
4. `app/(main)/goals/page.tsx`
5. `app/(main)/reminders/page.tsx`
6. `app/(main)/projects/page.tsx`
7. `app/(main)/expenses/page.tsx`
8. `app/(main)/recipes/page.tsx`
9. `app/(main)/recipes/new/page.tsx`
10. `app/(main)/recipes/discover/page.tsx`

**Budget Module Pages:**
11. `app/(main)/budget/recurring/page.tsx`
12. `app/(main)/budget/bills/page.tsx`
13. `app/(main)/budget/projects/[id]/page.tsx`
14. `app/(main)/budget/vendors/page.tsx`
15. `app/(main)/budget-setup/page.tsx`

**Other Pages:**
16. `app/(main)/invitations/accept/page.tsx`

**Components:**
17. `components/layout/Header.tsx` (CRITICAL - affects all pages)
18. `components/tasks/NewTaskModal.tsx`
19. `components/shared/UnifiedItemModal.tsx`

**Core Architecture:**
20. `lib/contexts/auth-context.tsx` (CRITICAL - the source)

### **🏢 Space Dependencies (currentSpace) - 20 Files**
Files that depend on `currentSpace` from auth context:

**Core Pages:** (Same as auth, indicating tight coupling)
1. `app/(main)/dashboard/page.tsx`
2. `app/(main)/meals/page.tsx`
3. `app/(main)/tasks/page.tsx`
4. `app/(main)/goals/page.tsx`
5. `app/(main)/reminders/page.tsx`
6. `app/(main)/projects/page.tsx`
7. `app/(main)/expenses/page.tsx`
8. `app/(main)/recipes/page.tsx`
9. `app/(main)/recipes/new/page.tsx`
10. `app/(main)/recipes/discover/page.tsx`

**Budget Module:** (Same as auth)
11. `app/(main)/budget/recurring/page.tsx`
12. `app/(main)/budget/bills/page.tsx`
13. `app/(main)/budget/projects/[id]/page.tsx`
14. `app/(main)/budget/vendors/page.tsx`
15. `app/(main)/budget-setup/page.tsx`

**Goals Sub-pages:**
16. `app/(main)/goals/analytics/page.tsx`
17. `app/(main)/goals/timeline/page.tsx`

**Components:**
18. `components/layout/Header.tsx` (CRITICAL)

**Core Architecture:**
19. `lib/contexts/auth-context.tsx` (CRITICAL)

### **🆔 Space ID Dependencies (spaceId/space_id) - 20 Files**
Files that explicitly use space IDs:

**Pages:** (Subset of above, indicating data operations)
1. `app/(main)/goals/page.tsx`
2. `app/(main)/meals/page.tsx`
3. `app/(main)/tasks/page.tsx`
4. `app/(main)/invitations/accept/page.tsx`

**Modal Components:**
5. `components/goals/TemplateSelectionModal.tsx`
6. `components/goals/NewGoalModal.tsx`
7. `components/goals/badges/BadgeCollection.tsx`
8. `components/tasks/NewTaskModal.tsx`
9. `components/shared/UnifiedItemModal.tsx`

**Service Layer:**
10. `lib/services/spaces-service.ts`
11. `lib/services/goals-service.ts`
12. `lib/services/achievement-service.ts`
13. `lib/services/space-auto-creation-service.ts`

**API Routes:**
14. `app/api/cron/process-notifications/route.ts`

**Core Components:**
15. `components/layout/Header.tsx`

**Database Migrations:**
16. `supabase/migrations/20251109051051_ensure_goal_activities_table.sql`
17. `supabase/migrations/20251108231152_fix_goal_activities_table.sql`
18. `supabase/migrations/20251108000000_fix_users_rls_performance.sql`
19. `supabase/migrations/20251108010000_fix_users_rls_circular_dependency.sql`

**Documentation:**
20. `auth-redesign-plan-9nov.md`

### **🎛️ Modal Components - 56 Files**
Complete list of modal components that may need space/auth integration:

**Goal Modals:**
- `components/goals/TemplateSelectionModal.tsx` ⚠️ (uses spaceId)
- `components/goals/NewGoalModal.tsx` ⚠️ (uses spaceId)
- `components/goals/NewMilestoneModal.tsx`
- `components/goals/DependenciesModal.tsx`
- `components/goals/CheckInFrequencyModal.tsx`
- `components/goals/GoalCheckInModal.tsx`

**Task Modals:**
- `components/tasks/NewTaskModal.tsx` ⚠️ (uses auth/spaceId)
- `components/tasks/SnoozeModal.tsx`
- `components/tasks/DependenciesModal.tsx`
- `components/tasks/ExportModal.tsx`
- `components/tasks/TemplatePickerModal.tsx`
- `components/tasks/AttachmentsModal.tsx`
- `components/tasks/ApprovalModal.tsx`

**Meal Modals:**
- `components/meals/NewMealModal.tsx`
- `components/meals/NewRecipeModal.tsx`
- `components/meals/IngredientReviewModal.tsx`
- `components/meals/RecipePreviewModal.tsx`
- `components/meals/GenerateListModal.tsx`
- `components/meals/QuickPlanModal.tsx`

**Project Modals:**
- `components/projects/NewProjectModal.tsx`
- `components/projects/NewBudgetModal.tsx`
- `components/projects/NewExpenseModal.tsx`
- `components/projects/NewBillModal.tsx`
- `components/projects/NewChoreModal.tsx`
- `components/projects/BudgetTemplateModal.tsx`
- `components/projects/ReceiptUploadModal.tsx`
- `components/projects/UpdateProgressModal.tsx`

**Calendar Modals:**
- `components/calendar/NewEventModal.tsx`
- `components/calendar/EventDetailModal.tsx`
- `components/calendar/EventProposalModal.tsx`
- `components/calendar/FindTimeModal.tsx`
- `components/calendar/EditSeriesModal.tsx`

**Shopping Modals:**
- `components/shopping/NewShoppingListModal.tsx`
- `components/shopping/TemplatePickerModal.tsx`
- `components/shopping/SaveTemplateModal.tsx`
- `components/shopping/ScheduleTripModal.tsx`

**Space Management Modals:**
- `components/spaces/CreateSpaceModal.tsx`
- `components/spaces/DeleteSpaceModal.tsx`
- `components/spaces/InvitePartnerModal.tsx`

**Message Modals:**
- `components/messages/NewMessageModal.tsx`
- `components/messages/NewConversationModal.tsx`
- `components/messages/ForwardMessageModal.tsx`

**Shared Modals:**
- `components/shared/UnifiedItemModal.tsx` ⚠️ (uses auth/spaceId)
- `components/shared/UnifiedDetailsModal.tsx`

**Other Modals:**
- `components/reminders/NewReminderModal.tsx`
- `components/household/NewExpenseModal.tsx`
- `components/household/NewChoreModal.tsx`
- `components/expenses/ExpenseSplitModal.tsx`
- `components/budget/ExpenseSplitModal.tsx`
- `components/vendors/VendorModal.tsx`
- `components/achievements/BadgeModal.tsx`
- `components/nudges/NudgeSettingsModal.tsx`
- `components/beta/BetaAccessModal.tsx`
- `components/beta/LaunchNotificationModal.tsx`

**Settings Modals:**
- `components/settings/AccountDeletionModal.tsx`
- `components/settings/CCPAOptOutModal.tsx`
- `components/settings/RestoreAccountModal.tsx`
- `components/settings/PasswordConfirmModal.tsx`
- `components/settings/ExportDataModal.tsx`

**Base Modal:**
- `components/ui/Modal.tsx` (Base component - needs analysis)

---

## ⚠️ **CRITICAL IMPACT ANALYSIS**

### **HIGH RISK - Breaking Changes**

**1. Core Authentication Context (`lib/contexts/auth-context.tsx`)**
- **Risk Level:** 🔴 CRITICAL
- **Impact:** ALL 20+ pages depend on this
- **Breaking Change:** Complete interface redesign
- **Mitigation:** Phased rollout with backward compatibility layer

**2. Header Component (`components/layout/Header.tsx`)**
- **Risk Level:** 🔴 CRITICAL
- **Impact:** Visible on every page
- **Breaking Change:** Auth/space display logic
- **Mitigation:** Extensive testing before deployment

**3. Main Pages (18 pages)**
- **Risk Level:** 🟡 HIGH
- **Impact:** All core app functionality
- **Breaking Change:** Loading states and auth checks
- **Mitigation:** Standardized pattern with thorough testing

### **MEDIUM RISK - Functional Changes**

**4. Modal Components (56 components)**
- **Risk Level:** 🟡 MEDIUM
- **Impact:** Feature-specific functionality
- **Breaking Change:** Space ID handling
- **Mitigation:** Component-by-component testing

**5. Service Layer (4 services)**
- **Risk Level:** 🟡 MEDIUM
- **Impact:** Data operations
- **Breaking Change:** Space context access
- **Mitigation:** Service interface updates

### **LOW RISK - Configuration Changes**

**6. API Routes (1 route)**
- **Risk Level:** 🟢 LOW
- **Impact:** Background processes
- **Breaking Change:** Minimal
- **Mitigation:** Standard testing

**7. Database Migrations (4 migrations)**
- **Risk Level:** 🟢 LOW
- **Impact:** Already deployed
- **Breaking Change:** None (historical)
- **Mitigation:** No action needed

---

## 🔄 **INTEGRATION POINTS ANALYSIS**

### **Critical Integration Points:**

**1. Provider Hierarchy**
```
app/layout.tsx
├── AuthProvider (NEW)
│   ├── Session management
│   └── User profile loading
└── SpacesProvider (NEW)
    ├── Space loading (depends on AuthProvider)
    ├── Current space selection
    └── Zero-spaces handling
```

**2. Context Dependencies**
```
Pages → useAuth() + useSpaces() → New Combined Hook
Modals → spaceId from SpacesContext
Header → Both auth and spaces states
Services → spaceId parameter passing
```

**3. State Flow**
```
1. User visits site
2. AuthProvider: Check session → Load profile
3. SpacesProvider: Load user spaces (if authenticated)
4. Pages: Wait for both contexts before rendering
5. App: Handle zero-spaces with onboarding
```

**4. Error Handling Flow**
```
Auth Error → AuthErrorComponent → Retry/Login redirect
Spaces Error → SpacesErrorComponent → Retry/Refresh
Network Error → Combined error handling
Zero Spaces → FirstSpaceOnboarding → Space creation
```

---

## 📋 **ROLLBACK PLAN FOR EACH PHASE**

### **Phase 0: Pre-Implementation (Current)**
- **Rollback:** N/A (analysis only)
- **Files Changed:** None
- **Database Impact:** None

### **Phase 1: Foundation Components**
- **Rollback:** Delete new UI components
- **Files Changed:** 3 new files in `components/ui/`
- **Database Impact:** None
- **Rollback Command:** `rm components/ui/{LoadingStates,ErrorStates,FirstSpaceOnboarding}.tsx`

### **Phase 2: AuthContext Redesign**
- **Rollback:** Restore backup of `lib/contexts/auth-context.tsx`
- **Files Changed:** 1 critical file
- **Database Impact:** None
- **Rollback Command:** `git restore lib/contexts/auth-context.tsx`

### **Phase 3: SpacesContext Creation**
- **Rollback:** Delete `lib/contexts/spaces-context.tsx`
- **Files Changed:** 1 new file
- **Database Impact:** None
- **Rollback Command:** `rm lib/contexts/spaces-context.tsx`

### **Phase 4: Integration Layer**
- **Rollback:** Delete `lib/hooks/useAuthWithSpaces.tsx`
- **Files Changed:** 1 new file
- **Database Impact:** None
- **Rollback Command:** `rm lib/hooks/useAuthWithSpaces.tsx`

### **Phase 5: Application Structure**
- **Rollback:** Restore backup of `app/layout.tsx`
- **Files Changed:** 1 critical file
- **Database Impact:** None
- **Rollback Command:** `git restore app/layout.tsx`

### **Phase 6: Middleware**
- **Rollback:** Restore backup of `middleware.ts`
- **Files Changed:** 1 file
- **Database Impact:** None
- **Rollback Command:** `git restore middleware.ts`

### **Phase 7-8: Page/Component Updates**
- **Rollback:** Git restore all modified files
- **Files Changed:** 18 pages + N components
- **Database Impact:** None
- **Rollback Command:** `git restore app/(main)/ components/`

### **Phase 9-12: Testing/Deployment**
- **Rollback:** Feature flag disable + git revert
- **Files Changed:** Multiple
- **Database Impact:** None
- **Rollback Command:** Deploy previous version

---

## 🚨 **BREAKING CHANGE MITIGATION STRATEGIES**

### **Strategy 1: Backward Compatibility Layer**
During Phase 2-4, maintain old auth interface while building new one:
```typescript
// Temporary compatibility shim
export function useAuth() {
  const auth = useNewAuth();
  const spaces = useSpaces();

  // Return old interface format during transition
  return {
    ...auth,
    currentSpace: spaces.currentSpace,
    spaces: spaces.spaces,
    // ... other compatibility mappings
  };
}
```

### **Strategy 2: Feature Flags**
Deploy with feature flags to enable/disable new architecture:
```typescript
const USE_NEW_AUTH = process.env.NEXT_PUBLIC_USE_NEW_AUTH === 'true';

export function AuthProvider({ children }) {
  if (USE_NEW_AUTH) {
    return <NewAuthProvider><NewSpacesProvider>{children}</NewSpacesProvider></NewAuthProvider>;
  }
  return <OldAuthProvider>{children}</OldAuthProvider>;
}
```

### **Strategy 3: Component Isolation Testing**
Test each component with both old and new auth patterns before switching:
```typescript
// Development testing component
function ComponentTester({ component: Component }) {
  const [useOld, setUseOld] = useState(false);

  return (
    <div>
      <button onClick={() => setUseOld(!useOld)}>
        Switch to {useOld ? 'New' : 'Old'} Auth
      </button>
      {useOld ? (
        <OldAuthProvider><Component /></OldAuthProvider>
      ) : (
        <NewAuthProvider><Component /></NewAuthProvider>
      )}
    </div>
  );
}
```

---

## 🎯 **PHASE COMPLETION CRITERIA**

### **Phase 0: ✅ COMPLETED**
- [x] Mapped all auth dependencies (20 files)
- [x] Mapped all currentSpace dependencies (20 files)
- [x] Mapped all spaceId dependencies (20 files)
- [x] Identified all modal components (56 files)
- [x] Created comprehensive impact analysis
- [x] Designed rollback plans for each phase
- [x] Identified critical integration points

### **Ready for Phase 1: Foundation Components**
- All dependencies mapped and analyzed
- Impact assessment completed
- Rollback strategies defined
- Risk mitigation planned

**Estimated Risk Level: MEDIUM (manageable with proper testing)**

---

**END OF PHASE 0 ANALYSIS**