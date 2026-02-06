# Rowan App - Beta Launch & Admin Dashboard Plan

## 🎯 **PROJECT OVERVIEW**

Transform Rowan App from development mode to beta launch readiness with comprehensive admin oversight and user acquisition strategy.

### **Core Objectives:**
1. **Beta Access Control:** Limited to 30 beta testers with password protection
2. **Launch Notification System:** Collect emails for production launch
3. **Admin Dashboard:** Full oversight at `ops.rowanapp.com`
4. **Marketing Enhancement:** Professional + friendly content for feature pages
5. **Security:** Stealth admin access, no public admin references

---

## 📊 **CURRENT STATUS & PROGRESS**

**Last Updated:** October 27, 2025
**Current Phase:** Phase 1B Complete → Starting Phase 1A
**Commit:** feat(beta-launch): complete Phase 1B backend foundation (1e79a61)

### **✅ COMPLETED TASKS**

#### **Phase 1B: Backend Foundation (100% Complete)**
1. **Database Schema Ready**
   - ✅ `beta_access_requests` table with security tracking
   - ✅ `launch_notifications` table with GDPR compliance
   - ✅ `admin_users` table with vetsecitpro@gmail.com super_admin
   - ✅ `daily_analytics` table with comprehensive tracking functions
   - ✅ All tables have RLS policies, indexes, and utility functions
   - ✅ Combined SQL file created: `combined_beta_migrations.sql`

2. **Documentation & Planning**
   - ✅ Comprehensive admin-launch-plan.md created (391 lines)
   - ✅ Homepage structure analyzed (app/page.tsx lines 35, 37-42)
   - ✅ Database migration files created (4 separate + 1 combined)
   - ✅ All work committed and pushed to GitHub

#### **Previous Fixes (Already Applied)**
- ✅ Shopping trip scheduling schema fix (comprehensive)
- ✅ Schedule Shopping Trip modal X button styling fix

### **🔄 NEXT IMMEDIATE STEPS**

#### **REQUIRED: Database Migration Execution**
**❗ CRITICAL FIRST STEP:** Before continuing, you must run the SQL migrations:

1. **Copy file contents**: `combined_beta_migrations.sql` (420 lines)
2. **Paste into Supabase SQL Editor**
3. **Click "Run"** to create all 4 tables + functions
4. **Verify success** (should see success notices in SQL output)

This creates the foundation for all beta launch functionality.

#### **Phase 1A: Homepage Transformation (Next Session)**
1. **Homepage UI Changes**
   - 🔄 Remove login button from homepage only (keep on other pages)
   - ⏳ Remove hamburger menu from homepage only (keep on other pages)
   - ⏳ Add "Access for Beta Test" button (left side)
   - ⏳ Add "Get Notified on Launch" button (right side)

2. **Modal Components**
   - ⏳ Create BetaAccessModal with password validation (`RowanApp2025&$&$&$`)
   - ⏳ Create LaunchNotificationModal with email collection
   - ⏳ Add proper error handling and loading states

3. **API Endpoints**
   - ⏳ `/api/beta/validate` - password validation + user counting
   - ⏳ `/api/launch/notify` - email collection + storage

### **🎯 PHASE BREAKDOWN**

**Phase 1A (Week 1):** Homepage transformation + backend foundation
**Phase 1B (Week 1):** ✅ **COMPLETE** - Database + migrations
**Phase 2A (Week 2):** Admin dashboard core
**Phase 2B (Week 2):** Admin dashboard features
**Phase 3A (Week 3):** Marketing content overhaul
**Phase 3B (Week 3):** Content polish + SEO
**Phase 4 (Week 4):** Testing + beta launch

### **🔧 DEVELOPMENT SETUP STATUS**

- ✅ **Git:** All work committed (1e79a61) and pushed to GitHub
- ✅ **Database:** Schema files ready, waiting for SQL execution
- ✅ **Documentation:** Comprehensive plan and progress tracking
- 🔄 **Dev Server:** Running (npm run dev active)
- 🔄 **Build Status:** TypeScript compilation active

### **🚨 CRITICAL DEPENDENCIES**

1. **Database Migrations** - Must run `combined_beta_migrations.sql` first
2. **Homepage Analysis** - Located login button (line 37-42) and hamburger (line 35)
3. **Password Security** - Beta password stored in BETA_PASSWORD env var (max 30 users)
4. **Admin Email** - vetsecitpro@gmail.com configured as super_admin

### **📝 NOTES FOR NEXT SESSION**

- Homepage component structure mapped in app/page.tsx
- All database utility functions ready (increment_beta_requests, etc.)
- Admin authentication system designed but not implemented
- Email system (Resend) configuration pending
- Feature page marketing content rewrite planned but not started

---

## 🔐 **BETA PROGRAM SPECIFICATIONS**

### **Access Control**
- **Beta Password:** Stored in `BETA_PASSWORD` environment variable (never hardcoded)
- **User Limit:** 30 beta testers maximum
- **Overflow Handling:** Waitlist for additional requests
- **Validation:** Real-time password checking with rate limiting

### **Beta User Journey**
1. **Homepage:** Click "Access for Beta Test"
2. **Password Modal:** Enter beta password
3. **Validation:** Check password + available slots
4. **Success Path:** Special beta onboarding → normal account creation
5. **Failure Path:** Error message, option to join launch notifications

### **Beta Onboarding Experience**
- Welcome screen explaining beta status
- Set expectations about features in development
- Quick feedback collection setup
- Proceed to normal account creation
- Special beta badge/indicator in app

---

## 📧 **LAUNCH NOTIFICATION SYSTEM**

### **Email Collection**
- **Button:** "Get Notified on Launch"
- **Modal:** Name + Email collection
- **Validation:** Email format, duplicate checking
- **Confirmation:** Thank you message + timeline estimate

### **Email Management**
- **Storage:** Database with source tracking
- **Admin View:** Full list with export capabilities
- **Segmentation:** Homepage vs other sources
- **GDPR Compliance:** Unsubscribe options

---

## 🛡️ **ADMIN DASHBOARD ARCHITECTURE**

### **Access & Security**
- **URL:** `ops.rowanapp.com` (stealth naming)
- **Admin Email:** `vetsecitpro@gmail.com`
- **Authentication:** Separate admin login system
- **Security:** No public references, hidden from sitemaps
- **IP Restrictions:** Consider limiting to specific IPs

### **Dashboard Sections**

#### **1. User Management**
- Total registered users (all time)
- Active users (last 7/30 days)
- Beta vs regular user breakdown
- User registration timeline chart
- Account status tracking (active/suspended/deleted)

#### **2. Beta Program Control**
- Current beta users: X/30
- Beta access request log (approved/denied)
- Beta user engagement metrics
- Password attempt tracking (security)
- Beta waitlist management

#### **3. Launch Notifications**
- Total email signups with growth chart
- Recent signups (last 24 hours)
- Source tracking (homepage/features/other)
- Email list export (CSV format)
- Duplicate detection and cleanup

#### **4. App Analytics**
- Feature usage statistics
- Most popular app sections
- User retention rates
- Session duration averages
- Error rate monitoring

#### **5. System Health**
- Database performance metrics
- API response times
- Server uptime status
- Recent error logs
- Security alerts

#### **6. Marketing Insights**
- Homepage conversion rates
- Beta access conversion
- Feature page engagement
- User journey analytics
- A/B testing results (future)

---

## 📧 **EMAIL SYSTEM INTEGRATION**

### **Resend Configuration**
- **Service:** Resend.com (free tier: 100 emails/day)
- **From Address:** `noreply@rowanapp.com`
- **Reply-To:** `vetsecitpro@gmail.com`
- **Templates:** Professional HTML + plain text

### **Daily Digest Email**
**Sent to:** `vetsecitpro@gmail.com`
**Schedule:** Every day at 9:00 AM EST
**Content:**
```
Daily Rowan App Report - [Date]

📊 NEW ACTIVITY (Last 24 Hours):
• Launch Notification Signups: X new emails
• Beta Access Requests: X total (X approved, X denied)
• New User Registrations: X users
• User Activity: X active sessions

📈 CURRENT TOTALS:
• Registered Users: X total
• Active Beta Testers: X/30 slots used
• Launch Notification List: X emails
• Monthly Active Users: X

🔔 ALERTS:
• [Security alerts, system issues, or milestones]

📋 QUICK ACTIONS:
• Review pending beta requests: [link]
• View new signups: [link]
• Access full dashboard: https://ops.rowanapp.com

---
Rowan App Operations Team
```

### **Instant Alerts** (High Priority)
- Beta program at capacity (25+ users)
- Suspicious password attempts
- System errors or downtime
- Large signup spikes

---

## 🎨 **MARKETING CONTENT STRATEGY**

### **Tone Guidelines**
- **Professional + Friendly:** Welcoming but credible
- **Benefit-Focused:** What's in it for families?
- **Scenario-Based:** Real family situations
- **Conversion-Oriented:** Clear value propositions

### **Content Themes**
- **Time Savings:** "Reclaim 2 hours per week"
- **Family Harmony:** "Reduce household stress"
- **Organization:** "Never forget important tasks"
- **Coordination:** "Keep everyone on the same page"

### **Pages to Transform**
1. `/features/tasks` - Task Management
2. `/features/calendar` - Calendar & Events
3. `/features/reminders` - Smart Reminders
4. `/features/shopping` - Shopping Lists
5. `/features/meals` - Meal Planning
6. `/features/messages` - Family Communication
7. `/features/goals` - Goal Tracking
8. `/features/budget` - Budget Management

### **Content Structure**
- **Hero Section:** Compelling benefit statement
- **Problem/Solution:** Pain point → Rowan solution
- **Use Cases:** 3-4 real family scenarios
- **Features:** Key capabilities with benefits
- **Social Proof:** Future testimonials placeholder
- **CTA:** "Available in Beta" or "Coming Soon"

---

## 🗄️ **DATABASE SCHEMA**

### **New Tables Required**

#### **Beta Access Tracking**
```sql
CREATE TABLE beta_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_attempt TEXT,
  ip_address TEXT,
  user_agent TEXT,
  access_granted BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  notes TEXT
);
```

#### **Launch Notifications**
```sql
CREATE TABLE launch_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'homepage',
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);
```

#### **Admin Users**
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

#### **System Analytics**
```sql
CREATE TABLE daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  beta_requests INTEGER DEFAULT 0,
  launch_signups INTEGER DEFAULT 0,
  feature_usage JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1A: Homepage Transformation (Week 1)**
- Remove login button and hamburger menu from homepage only
- Add "Access for Beta Test" and "Get Notified on Launch" buttons
- Create modal components for both flows
- Implement password validation with rate limiting
- Add email collection with basic validation

### **Phase 1B: Backend Foundation (Week 1)**
- Create database tables and API endpoints
- Set up Resend integration for email notifications
- Implement beta user counting and limit enforcement
- Add basic analytics tracking

### **Phase 2A: Admin Dashboard Core (Week 2)**
- Set up `ops.rowanapp.com` subdomain routing
- Create admin authentication system
- Build dashboard layout and navigation
- Implement user management section

### **Phase 2B: Admin Dashboard Features (Week 2)**
- Beta program management interface
- Launch notification list with export
- Basic analytics and charts
- System health monitoring

### **Phase 3A: Marketing Content (Week 3)**
- Rewrite all feature explanation pages
- Focus on benefits and real use cases
- Professional + friendly tone
- Remove old CTAs, add "Coming Soon" messaging

### **Phase 3B: Content Polish (Week 3)**
- A/B testing setup for key pages
- SEO optimization for marketing pages
- Mobile responsiveness verification
- Performance optimization

### **Phase 4: Testing & Launch (Week 4)**
- End-to-end testing of beta flow
- Admin dashboard functionality testing
- Security penetration testing
- Performance testing under load
- Beta launch announcement

---

## 🔒 **SECURITY CONSIDERATIONS**

### **Admin Panel Security**
- Stealth URL (`ops.rowanapp.com`)
- Strong authentication (consider 2FA)
- Rate limiting on login attempts
- Session timeout management
- IP whitelisting option

### **Beta Access Security**
- Rate limiting on password attempts
- IP-based attempt tracking
- Temporary lockouts for failed attempts
- Audit logging for all access

### **Data Protection**
- GDPR compliance for email collection
- Secure storage of email addresses
- Unsubscribe functionality
- Data retention policies

### **General Security**
- Input validation on all forms
- SQL injection prevention
- XSS protection
- CSRF tokens
- Secure headers

---

## 📊 **SUCCESS METRICS**

### **Beta Program KPIs**
- Beta conversion rate (password attempts → accounts)
- Beta user engagement (sessions/week)
- Beta user retention (7-day, 30-day)
- Feature usage by beta users
- Beta user feedback scores

### **Launch Notification KPIs**
- Email signup conversion rate
- Email list growth rate
- Source attribution accuracy
- Unsubscribe rates
- Geographic distribution

### **Admin Dashboard KPIs**
- Dashboard usage frequency
- Response time to issues
- Data accuracy verification
- Report generation efficiency

---

## 🎯 **FUTURE ENHANCEMENTS**

### **Post-Beta Improvements**
- Advanced analytics and reporting
- User behavior tracking
- A/B testing framework
- Advanced segmentation
- Automated user onboarding flows

### **Scaling Considerations**
- Database optimization for larger datasets
- CDN implementation for global performance
- Advanced caching strategies
- Microservices architecture migration
- Multi-region deployment

---

## 📋 **PROJECT TIMELINE**

**Week 1:** Homepage transformation + backend foundation
**Week 2:** Admin dashboard development
**Week 3:** Marketing content overhaul
**Week 4:** Testing, polish, and beta launch

**Target Launch Date:** End of Week 4
**Beta Program Duration:** 4-6 weeks
**Production Launch:** TBD (next month estimate)

---

*This document serves as the master plan for Rowan App's beta launch transformation. All implementation should reference this plan for consistency and completeness.*