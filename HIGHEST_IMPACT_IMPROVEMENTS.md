# 🚀 Highest Impact Improvements for Rowan

**Created:** October 8, 2025
**Status:** Ready for Implementation
**Current Phase:** Post-Authentication Enhancement

---

## 📋 **Current Status**

### ✅ Completed
- Real Supabase authentication (login, signup, password reset page)
- Route protection middleware
- Comprehensive RLS policies (all 25 tables secured)
- All 8 feature pages with basic CRUD
- Dashboard with stats
- Multi-space support (auth context)
- Dark mode
- Responsive design

### ⚠️ Missing Critical Features
- Email verification
- Password reset emails
- Space invitation system
- Profile editing
- Multi-space UI (switcher)

---

## 🎯 **HIGH PRIORITY** (Foundation & Trust)

### 1. Email Verification & Password Reset Email Flow
**Priority:** 🔴 CRITICAL
**Impact:** HIGH - Required for production
**Effort:** 2-3 hours
**Dependencies:** Resend API (already configured)

**What to Build:**
- Email verification on signup
  - Send verification email with Resend
  - Verification link handler
  - Redirect to dashboard after verification
  - Resend verification email option
- Password reset email flow
  - "Forgot Password" on login page
  - Email with reset link
  - Token validation
  - Password reset confirmation

**Technical Notes:**
- Resend API key: `process.env.RESEND_API_KEY`
- Email templates in `/emails` directory
- Use Supabase auth email templates or custom Resend

**Files to Create:**
- `app/api/auth/send-verification/route.ts`
- `app/api/auth/verify-email/route.ts`
- `app/api/auth/send-reset-email/route.ts`
- `emails/VerificationEmail.tsx` (React Email template)
- `emails/PasswordResetEmail.tsx`

---

### 2. Space Invitation System
**Priority:** 🔴 CRITICAL
**Impact:** HIGH - Core collaboration feature
**Effort:** 3-4 hours
**Dependencies:** None (table & RLS already exist)

**What to Build:**
- **Settings Page Enhancements:**
  - "Invite Members" modal
    - Email input field
    - Role selector (member/admin)
    - Send invitation button
  - "Pending Invitations" section
    - List of sent invitations
    - Cancel invitation option
  - "Space Members" list
    - Current members with roles
    - Remove member option (owner only)
- **Accept Invitation Flow:**
  - Email with invitation link
  - Accept/Decline page
  - Auto-join space on accept
  - Redirect to dashboard

**Database:**
- ✅ Table: `space_invitations` (already exists)
- ✅ RLS policies: Already configured
- Columns: `id`, `space_id`, `email`, `role`, `invited_by`, `status`, `token`, `expires_at`

**Technical Notes:**
- Generate cryptographically secure token (`crypto.randomUUID()`)
- Set expiration (7 days recommended)
- Email template with accept/decline links
- Update `space_members` table on acceptance

**Files to Create/Update:**
- `components/settings/InviteMemberModal.tsx`
- `components/settings/SpaceMembersList.tsx`
- `components/settings/PendingInvitationsList.tsx`
- `app/api/invitations/send/route.ts`
- `app/api/invitations/accept/route.ts`
- `app/api/invitations/decline/route.ts`
- `app/invite/[token]/page.tsx` (public accept page)
- `emails/SpaceInvitationEmail.tsx`
- Update: `app/(main)/settings/page.tsx`

---

### 3. Profile Editing & Avatar Upload
**Priority:** 🟡 HIGH
**Impact:** HIGH - Basic user expectation
**Effort:** 2-3 hours
**Dependencies:** Supabase Storage (for avatars)

**What to Build:**
- **Settings Page - Profile Section:**
  - Edit name (text input)
  - Edit pronouns (text input)
  - Change color theme (color picker)
  - Update timezone (dropdown with auto-detect)
  - Avatar upload
    - Click to upload image
    - Preview before save
    - Crop/resize (optional)
    - Delete avatar option
  - Change password
    - Current password
    - New password
    - Confirm password
  - Save/Cancel buttons
  - Success/error toast notifications

**Technical Notes:**
- Avatar storage: Supabase Storage bucket `avatars`
- Image optimization: Max 500x500px, JPEG/PNG
- File size limit: 2MB
- Update `users` table: `avatar_url`, `name`, `pronouns`, `color_theme`, `timezone`
- Password change: `supabase.auth.updateUser({ password })`

**Files to Create/Update:**
- `components/settings/ProfileEditForm.tsx`
- `components/settings/AvatarUpload.tsx`
- `components/settings/PasswordChangeForm.tsx`
- `app/api/profile/update/route.ts`
- `app/api/profile/upload-avatar/route.ts`
- Update: `app/(main)/settings/page.tsx`

---

### 4. Space Switcher & Multi-Space UI
**Priority:** 🟡 HIGH
**Impact:** MEDIUM - Needed for multi-space users
**Effort:** 2 hours
**Dependencies:** Auth context already supports it

**What to Build:**
- **Header Dropdown:**
  - Current space name/icon
  - List of user's spaces
  - "Switch to [Space Name]" option
  - "Create New Space" option
  - Visual indicator for active space
- **Create Space Modal:**
  - Space name input
  - Color theme selector
  - Create button
  - Auto-switch to new space

**Technical Notes:**
- Use `useAuth()` hook: `spaces`, `currentSpace`, `switchSpace()`, `refreshSpaces()`
- Store current space preference in localStorage
- Update space context on switch
- Real-time refresh of space list

**Files to Create/Update:**
- `components/layout/SpaceSwitcher.tsx`
- `components/spaces/CreateSpaceModal.tsx`
- `app/api/spaces/create/route.ts`
- Update: `components/layout/Header.tsx`
- Update: `lib/contexts/auth-context.tsx` (add localStorage persistence)

---

## ⚡ **MEDIUM PRIORITY** (UX Polish)

### 5. Proper Empty States
**Priority:** 🟢 MEDIUM
**Impact:** MEDIUM-HIGH - First impression
**Effort:** 2-3 hours

**What to Build:**
- Create `EmptyState` component (reusable)
  - Icon/illustration
  - Heading
  - Description
  - Primary CTA button
  - Secondary action (optional)
- Apply to all feature pages:
  - Tasks: "No tasks yet"
  - Events: "No events scheduled"
  - Messages: "Start a conversation"
  - Shopping: "Create your first list"
  - Meals: "Plan your first meal"
  - Household: "Add your first chore"
  - Goals: "Set your first goal"
  - Reminders: "Create a reminder"

**Design Notes:**
- Use Lucide icons (already in project)
- Gradient backgrounds matching feature colors
- Animation on hover
- Mobile responsive

**Files to Create:**
- `components/shared/EmptyState.tsx`
- Update all feature pages with empty state check

---

### 6. Loading States Audit
**Priority:** 🟢 MEDIUM
**Impact:** MEDIUM - Professional feel
**Effort:** 1-2 hours

**What to Build:**
- Create `LoadingSpinner` component (reusable)
- Create `SkeletonLoader` component
  - Card skeleton
  - List skeleton
  - Table skeleton
- Apply to:
  - Dashboard stats cards
  - Feature page data lists
  - Form submissions
  - Page transitions

**Technical Notes:**
- Use CSS animations for smooth transitions
- Shimmer effect for skeletons
- Consistent loading states across app

**Files to Create:**
- `components/shared/LoadingSpinner.tsx`
- `components/shared/SkeletonLoader.tsx`
- Update all async operations with loading states

---

### 7. Toast Notifications System
**Priority:** 🟢 MEDIUM
**Impact:** MEDIUM - User feedback
**Effort:** 2 hours
**Dependencies:** Already have `sonner` installed

**What to Build:**
- Configure Sonner toast provider
- Create toast utilities:
  - `toast.success(message)`
  - `toast.error(message)`
  - `toast.info(message)`
  - `toast.loading(message)`
- Apply to all CRUD operations:
  - Create success: "Task created successfully"
  - Update success: "Changes saved"
  - Delete success: "Item deleted"
  - Error: "Failed to save. Please try again."

**Files to Update:**
- `app/layout.tsx` (add Toaster component)
- All service files (add toast notifications)
- All page components (add toast on actions)

---

### 8. Search & Filters
**Priority:** 🟢 MEDIUM
**Impact:** MEDIUM - Scales with usage
**Effort:** 3-4 hours

**What to Build:**
- **Global Search (Header):**
  - Search input with cmd+K shortcut
  - Search across all features
  - Results grouped by type
  - Navigate to result on click
- **Per-Feature Filters:**
  - Tasks: Status, Priority, Assigned To, Due Date
  - Events: Type, Date Range
  - Shopping: List, Checked/Unchecked
  - Goals: Status, Category
- **Sort Options:**
  - Date created/updated
  - Alphabetical
  - Priority/Status
  - Custom order (drag-drop)

**Technical Notes:**
- Use client-side filtering for small datasets
- Consider Supabase full-text search for large datasets
- Debounce search input (300ms)
- Persist filter preferences in localStorage

**Files to Create:**
- `components/search/GlobalSearch.tsx`
- `components/shared/FilterDropdown.tsx`
- `components/shared/SortDropdown.tsx`
- `hooks/useSearch.ts`
- `hooks/useFilter.ts`

---

## 🚀 **NICE TO HAVE** (Enhanced Features)

### 9. Notifications System
**Priority:** 🔵 LOW
**Impact:** MEDIUM - Engagement
**Effort:** 5-6 hours

- Bell icon in header with badge
- Real-time notification listener
- Notification types:
  - Task assigned to you
  - Event reminder (15 min before)
  - New message in conversation
  - Space invitation received
  - Goal milestone completed
- Mark as read/unread
- Notification settings page

---

### 10. Onboarding Flow
**Priority:** 🔵 LOW
**Impact:** MEDIUM - New user experience
**Effort:** 4-5 hours

- Multi-step wizard after signup:
  - Welcome screen
  - Create/join space
  - Invite partner/family
  - Sample data creation
  - Feature tour
- Skip option
- Progress indicator
- Confetti animation on completion

---

### 11. PWA Setup
**Priority:** 🔵 LOW
**Impact:** HIGH (for mobile users)
**Effort:** 3-4 hours

- Add manifest.json
- Service worker for offline support
- Install prompt
- App icons (all sizes)
- Splash screens
- Push notification support

---

### 12. Activity Feed
**Priority:** 🔵 LOW
**Impact:** LOW-MEDIUM
**Effort:** 2-3 hours

- Dashboard widget showing recent activity
- Uses existing `activity_log` table
- "Who did what and when"
- Filter by feature/user
- Expand to full page view

---

## 📊 **Recommended Implementation Order**

### **Week 1: Core Collaboration** (10 hours)
1. ✅ Space Invitation System (4h)
   - Most requested feature
   - Unlocks true collaboration
   - Database already ready

2. ✅ Email Verification + Password Reset (3h)
   - Required for production
   - Builds trust
   - Security best practice

3. ✅ Profile Editing + Avatar Upload (3h)
   - Basic user expectation
   - Personalization
   - Professional polish

### **Week 2: UX Polish** (8 hours)
4. ✅ Space Switcher (2h)
5. ✅ Toast Notifications (2h)
6. ✅ Empty States (2h)
7. ✅ Loading States Audit (2h)

### **Week 3: Advanced Features** (8 hours)
8. ✅ Search & Filters (4h)
9. ✅ Notifications System (4h)

### **Week 4: Growth & Retention** (8 hours)
10. ✅ Onboarding Flow (4h)
11. ✅ PWA Setup (3h)
12. ✅ Activity Feed (1h)

---

## 🎯 **Success Metrics**

Track these to measure impact:

- **User Activation:** % of users who invite someone (target: 40%)
- **Retention:** % of users who return Day 7 (target: 50%)
- **Engagement:** Average features used per session (target: 3)
- **Collaboration:** % of spaces with 2+ members (target: 60%)
- **Profile Completion:** % of users with avatar + full profile (target: 70%)

---

## 🛠️ **Technical Debt to Address**

While implementing features, consider:

1. **Error Boundary Components**
   - Wrap major sections in error boundaries
   - Graceful fallbacks
   - Error reporting (Sentry?)

2. **API Route Rate Limiting**
   - Already have Upstash Redis
   - Apply to all API routes
   - Prevent abuse

3. **Input Validation**
   - Zod schemas for all forms
   - Consistent validation rules
   - Better error messages

4. **Performance Monitoring**
   - Add Vercel Analytics
   - Core Web Vitals tracking
   - Identify slow queries

5. **Testing**
   - Unit tests for utilities
   - Integration tests for auth
   - E2E tests for critical flows

---

## 📚 **Resources**

- [Resend Email API Docs](https://resend.com/docs)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [React Email Templates](https://react.email)
- [Sonner Toast Docs](https://sonner.emilkowal.ski/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

---

**Last Updated:** October 8, 2025
**Version:** 1.0
**Next Review:** After Week 1 completion

---

## 💡 **Quick Start Commands**

```bash
# Start development server
npm run dev

# Run type check
npm run type-check

# Run build
npm run build

# Push database migrations
npx supabase db push

# View migration status
npx supabase migration list
```

---

**Ready to build!** Start with Space Invitations for maximum impact. 🚀
