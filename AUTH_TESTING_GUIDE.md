# 🧪 Authentication Testing Guide

**Created:** October 7, 2025
**Phase:** 2.1 - Core Authentication Testing
**App URL:** http://localhost:3000

---

## ✅ Pre-Test Checklist

Before beginning tests, verify:
- [ ] Dev server is running (`npm run dev`)
- [ ] Supabase project is accessible
- [ ] Environment variables are set in `.env.local`
- [ ] Browser console is open (F12) to monitor for errors

---

## 🧪 Test Suite

### Test 1: Homepage & Navigation

**Objective:** Verify homepage loads and navigation works

**Steps:**
1. Navigate to http://localhost:3000
2. Verify homepage loads successfully
3. Check that "Login" button in header is visible
4. Check that "Create Your Account" button is visible
5. Verify theme toggle works (light/dark mode)

**Expected Results:**
- ✅ Homepage renders without errors
- ✅ Login button links to `/login`
- ✅ Create Account button links to `/signup`
- ✅ Theme toggle switches between light and dark mode
- ✅ No console errors

**Status:** ⏳ Pending

---

### Test 2: Route Protection (Unauthenticated)

**Objective:** Verify middleware protects feature pages from unauthenticated access

**Steps:**
1. Clear browser cookies/localStorage (fresh session)
2. Try to navigate directly to http://localhost:3000/dashboard
3. Try to navigate to http://localhost:3000/tasks
4. Try to navigate to http://localhost:3000/settings

**Expected Results:**
- ✅ All protected routes redirect to `/login`
- ✅ URL parameter `?redirectTo=` is set with original path
- ✅ Middleware runs without console errors

**Status:** ⏳ Pending

---

### Test 3: Sign-Up Flow

**Objective:** Create a new account and verify all data is stored correctly

**Steps:**
1. Navigate to http://localhost:3000/signup
2. Fill out the form:
   - **Name:** Test User
   - **Email:** test@example.com (use a real email you can access)
   - **Password:** TestPassword123 (at least 8 characters)
   - **Pronouns:** they/them (optional)
   - **Color Theme:** Select any theme
   - **Space Name:** Test Family (optional)
3. Click "Create account"
4. Wait for processing

**Expected Results:**
- ✅ Form validation works (email format, password length)
- ✅ No console errors during submission
- ✅ Loading state shows during account creation
- ✅ Redirect to `/dashboard` after successful signup
- ✅ User profile created in Supabase `users` table
- ✅ If space name provided, space created in `spaces` table
- ✅ User added to `space_members` table with role 'owner'

**Database Verification:**
```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'test@example.com';
SELECT * FROM public.users WHERE email = 'test@example.com';
SELECT * FROM public.spaces WHERE name = 'Test Family';
SELECT * FROM public.space_members WHERE user_id = '<user-id-from-above>';
```

**Status:** ⏳ Pending

---

### Test 4: Sign-Out Flow

**Objective:** Verify user can sign out and session is cleared

**Steps:**
1. While logged in, navigate to http://localhost:3000/settings
2. Click "Sign Out" button
3. Observe behavior

**Expected Results:**
- ✅ User is logged out
- ✅ Redirect to `/login`
- ✅ Session cleared from browser
- ✅ Attempting to access `/dashboard` redirects to `/login`

**Status:** ⏳ Pending

---

### Test 5: Sign-In Flow

**Objective:** Login with existing account

**Steps:**
1. Navigate to http://localhost:3000/login
2. Enter credentials from Test 3:
   - **Email:** test@example.com
   - **Password:** TestPassword123
3. Click "Sign in"

**Expected Results:**
- ✅ Loading state shows during sign-in
- ✅ Redirect to `/dashboard` after successful login
- ✅ No console errors
- ✅ Dashboard loads with user's data

**Error Testing:**
- Try wrong password → Should show "Invalid email or password"
- Try non-existent email → Should show "Invalid email or password"
- Try empty fields → Should show validation errors

**Status:** ⏳ Pending

---

### Test 6: Session Persistence

**Objective:** Verify session persists across page refreshes

**Steps:**
1. Log in successfully
2. Navigate to http://localhost:3000/dashboard
3. Refresh the page (F5)
4. Close tab and reopen http://localhost:3000/dashboard
5. Restart browser and navigate to http://localhost:3000/dashboard

**Expected Results:**
- ✅ User remains logged in after page refresh
- ✅ User remains logged in after closing/reopening tab
- ✅ User remains logged in after browser restart (until session expires)
- ✅ No redirect to login page

**Status:** ⏳ Pending

---

### Test 7: Route Protection (Authenticated)

**Objective:** Verify authenticated users can access all feature pages

**Steps:**
1. Log in successfully
2. Navigate to each feature page:
   - http://localhost:3000/dashboard
   - http://localhost:3000/tasks
   - http://localhost:3000/calendar
   - http://localhost:3000/messages
   - http://localhost:3000/reminders
   - http://localhost:3000/shopping
   - http://localhost:3000/meals
   - http://localhost:3000/household
   - http://localhost:3000/goals
   - http://localhost:3000/settings

**Expected Results:**
- ✅ All pages load successfully
- ✅ No redirects to login
- ✅ No console errors
- ✅ Loading states show while fetching data
- ✅ User's space data is loaded

**Status:** ⏳ Pending

---

### Test 8: Auth Page Redirects

**Objective:** Verify logged-in users can't access login/signup pages

**Steps:**
1. While logged in, try to navigate to http://localhost:3000/login
2. Try to navigate to http://localhost:3000/signup

**Expected Results:**
- ✅ Both pages redirect to `/dashboard`
- ✅ No flash of login/signup UI

**Status:** ⏳ Pending

---

### Test 9: RLS Policies - Data Isolation

**Objective:** Verify Row Level Security policies work with real authentication

**Steps:**
1. Log in as first user (from Test 3)
2. Navigate to http://localhost:3000/tasks
3. Create a test task
4. Open browser console and check Network tab
5. Look for `/tasks` API calls
6. Verify the task is scoped to user's space

**Database Verification:**
```sql
-- In Supabase SQL Editor
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tasks';

-- Test as specific user
SET LOCAL jwt.claims.sub = '<user-id>';
SELECT * FROM tasks; -- Should only return tasks for user's space
```

**Expected Results:**
- ✅ Tasks are scoped to user's space_id
- ✅ User cannot see tasks from other spaces
- ✅ RLS policies allow SELECT, INSERT, UPDATE, DELETE for space members

**Status:** ⏳ Pending

---

### Test 10: 406 Errors Resolution

**Objective:** Verify the 406 errors on `/budgets` endpoint are resolved

**Steps:**
1. Log in successfully
2. Navigate to http://localhost:3000/household
3. Open browser console → Network tab
4. Filter by "budgets"
5. Check for any 406 (Not Acceptable) errors

**Expected Results:**
- ✅ No 406 errors in console
- ✅ Budgets endpoint returns 200 OK
- ✅ Budgets data loads correctly (if any exist)

**Status:** ⏳ Pending

---

### Test 11: Multiple Users & Spaces

**Objective:** Test multi-user collaboration in same space

**Steps:**
1. Create second user account (different email)
2. Have second user create their own space
3. Verify first user cannot see second user's data
4. (Optional) Invite second user to first user's space
5. Verify both users can now see shared data

**Expected Results:**
- ✅ Users in different spaces cannot see each other's data
- ✅ Users in same space can see shared data
- ✅ RLS policies enforce space isolation

**Status:** ⏳ Pending (Optional for now)

---

### Test 12: Error Handling & Edge Cases

**Objective:** Test error scenarios and edge cases

**Steps:**

**Signup Errors:**
- Try to signup with existing email → Should show "account already exists"
- Try password < 8 chars → Should show validation error
- Try invalid email format → Should show validation error

**Login Errors:**
- Network error simulation (disconnect internet) → Should show connection error
- Try login during Supabase downtime → Should handle gracefully

**Session Errors:**
- Let session expire (manually clear auth tokens in localStorage)
- Try to access protected page → Should redirect to login

**Expected Results:**
- ✅ All errors handled gracefully with user-friendly messages
- ✅ No unhandled promise rejections in console
- ✅ Loading states clear on error

**Status:** ⏳ Pending

---

### Test 13: Performance & Loading States

**Objective:** Verify performance optimizations from Phase 1 are preserved

**Steps:**
1. Log in and navigate to http://localhost:3000/dashboard
2. Observe initial load time
3. Click on various feature cards to navigate
4. Check for lag or stuttering
5. Open React DevTools → Profiler
6. Record interaction and check for unnecessary re-renders

**Expected Results:**
- ✅ Dashboard loads quickly (< 2 seconds)
- ✅ No lag when clicking feature cards
- ✅ Loading states show during auth check
- ✅ Minimal unnecessary re-renders
- ✅ All React.memo, useMemo, useCallback optimizations working

**Status:** ⏳ Pending

---

### Test 14: Dark Mode with Auth

**Objective:** Verify dark mode works throughout auth flow

**Steps:**
1. Set browser to dark mode
2. Navigate to http://localhost:3000/login
3. Toggle theme with theme switcher
4. Login and verify theme persists
5. Navigate through feature pages

**Expected Results:**
- ✅ Dark mode works on login page
- ✅ Dark mode works on signup page
- ✅ Theme preference persists after login
- ✅ All pages respect dark mode

**Status:** ⏳ Pending

---

### Test 15: Mobile Responsiveness

**Objective:** Verify auth pages work on mobile

**Steps:**
1. Open browser DevTools → Toggle device toolbar (mobile view)
2. Test login page at various screen sizes (375px, 768px, 1024px)
3. Test signup page
4. Test dashboard and feature pages
5. Verify buttons are tappable and forms are usable

**Expected Results:**
- ✅ Login form usable on mobile
- ✅ Signup form usable on mobile
- ✅ All buttons appropriately sized
- ✅ No horizontal scrolling
- ✅ Text readable without zooming

**Status:** ⏳ Pending

---

## 🐛 Known Issues

(Document any issues discovered during testing)

**Issue 1:** (Example)
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Priority:** High/Medium/Low
- **Status:** Open/Fixed

---

## 📊 Testing Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Homepage & Navigation | ⏳ | |
| 2. Route Protection (Unauth) | ⏳ | |
| 3. Sign-Up Flow | ⏳ | |
| 4. Sign-Out Flow | ⏳ | |
| 5. Sign-In Flow | ⏳ | |
| 6. Session Persistence | ⏳ | |
| 7. Route Protection (Auth) | ⏳ | |
| 8. Auth Page Redirects | ⏳ | |
| 9. RLS Policies | ⏳ | |
| 10. 406 Errors | ⏳ | |
| 11. Multiple Users | ⏳ | Optional |
| 12. Error Handling | ⏳ | |
| 13. Performance | ⏳ | |
| 14. Dark Mode | ⏳ | |
| 15. Mobile Responsive | ⏳ | |

**Legend:**
- ⏳ Pending
- ✅ Passed
- ❌ Failed
- ⚠️ Issues Found

---

## 🔧 Debugging Tips

### Check Auth State
```javascript
// In browser console
localStorage.getItem('sb-<project-id>-auth-token')
```

### Check Supabase Session
```javascript
// In browser console
const { data: { session } } = await supabase.auth.getSession();
console.log(session);
```

### Check Network Requests
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for Supabase API calls
4. Check request/response headers and body

### Check RLS Policies
```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'tasks';
```

### Force Logout
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## ✅ Sign-Off

**Tested By:** _______________________
**Date:** _______________________
**Result:** Pass / Fail / Partial
**Notes:**

---

**Next Phase:** Phase 2.2 - Enhanced Features (Password Reset, Email Verification)

*Generated by Claude Code - October 7, 2025*
