# Monetization Implementation TODO List
**Created**: December 2, 2024
**Last Updated**: December 9, 2024
**Status**: Phase 6 Complete - Ready for Phase 7
**Target Launch**: 1-2 months (post-beta completion)

## Implementation Progress
- ✅ **Phase 1: Foundation & Database Schema** - Completed December 3, 2024 (PR #53)
- ✅ **Phase 2: Stripe Integration Setup** - Completed December 3, 2024 (PR #53)
- ✅ **Phase 3: Service Layer & Business Logic** - Completed December 3, 2024 (PR #54)
- ✅ **Phase 4: API Routes & Stripe Webhooks** - Completed December 9, 2024 (PR #85)
- ✅ **Phase 5: Frontend - Pricing Page & Upgrade Components** - Completed December 9, 2024 (PR #85)
- ✅ **Phase 6: Feature Gating Implementation** - Completed December 9, 2024 (PR #85)
- 🔄 **Phase 7: Payment Flow & Webhooks** - In Progress
- ⏳ **Phases 8-12** - Pending

---

## Implementation Philosophy

**Core Mandates:**
- ✅ **Safety First**: Feature branch workflow, no direct commits to main
- ✅ **Strategic Execution**: Test locally, create rollback-capable migrations
- ✅ **No Breaking Changes**: Preserve all existing functionality
- ✅ **Elegant UX**: Non-aggressive, enticing, professional experience
- ✅ **Security-First**: Input validation, rate limiting, webhook verification

**Implementation Approach:**
- Each phase is a separate feature branch
- Test thoroughly before creating PR
- Deploy incrementally with feature flags if needed
- Monitor for issues after each deployment
- Keep rollback scripts ready

---

## Phase 1: Foundation & Database Schema
**✅ COMPLETED** - December 3, 2024 (PR #53)

### 1.1 Database Schema Updates
**Branch**: `feature/monetization-database-schema` ✅ MERGED

**Tasks:**
- [x] Create migration file: `supabase/migrations/YYYYMMDD_add_subscription_schema.sql`
- [x] Add subscription columns to auth.users (or create separate subscriptions table):
  - [x] `subscription_tier TEXT DEFAULT 'free'` (values: 'free', 'pro', 'family')
  - [x] `subscription_status TEXT DEFAULT 'active'` (values: 'active', 'past_due', 'canceled', 'paused')
  - [x] `stripe_customer_id TEXT`
  - [x] `stripe_subscription_id TEXT`
  - [x] `subscription_started_at TIMESTAMPTZ`
  - [x] `subscription_ends_at TIMESTAMPTZ` (for canceled subscriptions with grace period)
  - [x] `subscription_period TEXT DEFAULT 'monthly'` (values: 'monthly', 'annual')
- [x] Create `subscription_events` table for analytics:
  - [x] `id UUID PRIMARY KEY`
  - [x] `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
  - [x] `event_type TEXT NOT NULL` ('upgrade', 'downgrade', 'cancel', 'reactivate', 'payment_failed')
  - [x] `from_tier TEXT`
  - [x] `to_tier TEXT`
  - [x] `trigger_source TEXT` ('task_limit', 'calendar_blocked', 'pricing_page', 'upgrade_modal')
  - [x] `metadata JSONB` (for additional context)
  - [x] `created_at TIMESTAMPTZ DEFAULT NOW()`
  - [x] Add index on `user_id` and `created_at`
- [x] Create `daily_usage` table for rate limiting:
  - [x] `id UUID PRIMARY KEY`
  - [x] `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
  - [x] `date DATE DEFAULT CURRENT_DATE`
  - [x] `tasks_created INTEGER DEFAULT 0`
  - [x] `messages_sent INTEGER DEFAULT 0`
  - [x] `quick_actions_used INTEGER DEFAULT 0`
  - [x] `shopping_list_updates INTEGER DEFAULT 0`
  - [x] `UNIQUE(user_id, date)`
  - [x] Add index on `user_id` and `date`
- [x] Create helper functions:
  - [x] `get_user_subscription_tier(user_id UUID) RETURNS TEXT`
  - [x] `check_feature_access(user_id UUID, feature_name TEXT) RETURNS BOOLEAN`
  - [x] `get_daily_usage_count(user_id UUID, usage_type TEXT) RETURNS INTEGER`
  - [x] `increment_usage_count(user_id UUID, usage_type TEXT) RETURNS VOID`
  - [x] `record_subscription_event(user_id UUID, event_type TEXT, from_tier TEXT, to_tier TEXT, trigger_source TEXT, metadata JSONB) RETURNS VOID`
- [x] Add RLS policies:
  - [x] Users can read their own subscription data
  - [x] Users can read their own usage data
  - [x] Only authenticated users can access subscription functions
  - [x] Subscription events are read-only for users
- [x] Create rollback migration script
- [x] Test migration locally with `supabase db reset`
- [x] Verify all indexes and constraints are created
- [x] Document schema in migration file comments

**Testing Checklist:**
- [x] Run migration on local database
- [x] Verify all columns created with correct types
- [x] Test helper functions with sample data
- [x] Verify RLS policies work correctly
- [x] Test rollback migration
- [x] Document any breaking changes (should be none)

**PR Requirements:**
- [x] Migration tested locally
- [x] Rollback script included
- [x] Schema documentation in migration file
- [x] No impact on existing functionality verified

---

### 1.2 TypeScript Types & Interfaces
**Branch**: `feature/monetization-types` ✅ MERGED

**Tasks:**
- [x] Create `lib/types/subscription.ts`:
  - [x] `SubscriptionTier` type ('free' | 'pro' | 'family')
  - [x] `SubscriptionStatus` type ('active' | 'past_due' | 'canceled' | 'paused')
  - [x] `SubscriptionPeriod` type ('monthly' | 'annual')
  - [x] `Subscription` interface with all subscription fields
  - [x] `SubscriptionEvent` interface for analytics
  - [x] `DailyUsage` interface for rate limiting
  - [x] `UsageType` type ('tasks_created' | 'messages_sent' | 'quick_actions_used' | 'shopping_list_updates')
  - [x] `TriggerSource` type ('task_limit' | 'calendar_blocked' | 'pricing_page' | 'upgrade_modal')
- [x] Create `lib/types/stripe.ts`:
  - [x] `StripeProduct` interface (id, name, description, price)
  - [x] `StripeCheckoutSession` interface
  - [x] `StripeWebhookEvent` interface
  - [x] `StripePriceInfo` interface (monthly/annual prices)
- [x] Update `lib/types.ts` to export new types
- [x] Add JSDoc comments for all types/interfaces

**Testing Checklist:**
- [x] TypeScript compiles without errors: `npx tsc --noEmit`
- [x] All types properly exported
- [x] No circular dependencies

**PR Requirements:**
- [x] Types documented with JSDoc
- [x] Exports verified in lib/types.ts
- [x] TypeScript compilation passes

---

### 1.3 Environment Variables Setup
**Branch**: `feature/monetization-env-vars` ✅ MERGED

**Tasks:**
- [x] Add to `.env.local` (local development):
  - [x] `STRIPE_SECRET_KEY=sk_test_...` (test mode key)
  - [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (test mode key)
  - [x] `STRIPE_WEBHOOK_SECRET=whsec_...` (for webhook verification)
  - [x] `STRIPE_PRO_MONTHLY_PRICE_ID=price_...`
  - [x] `STRIPE_PRO_ANNUAL_PRICE_ID=price_...`
  - [x] `STRIPE_FAMILY_MONTHLY_PRICE_ID=price_...`
  - [x] `STRIPE_FAMILY_ANNUAL_PRICE_ID=price_...`
- [x] Update `.env.example` with placeholder values:
  - [x] Add comments explaining each variable
  - [x] Include link to Stripe dashboard for key locations
- [x] Document in `docs/setup/STRIPE_SETUP.md`:
  - [x] How to create Stripe account
  - [x] How to get API keys
  - [x] How to create products and prices
  - [x] How to set up webhook endpoint
  - [x] Test mode vs production mode differences

**Production Deployment (DO NOT DO YET - documented for later):**
- [ ] Add production keys to Vercel environment variables
- [ ] Set environment to "Production" in Vercel
- [ ] Test webhook delivery to production URL

**Testing Checklist:**
- [x] `.env.local` variables load correctly
- [x] `.env.example` is up to date
- [x] Documentation is clear and complete
- [x] No secret keys committed to git

**PR Requirements:**
- [x] `.env.example` updated (no secrets)
- [x] Documentation included
- [x] `.gitignore` includes `.env.local`

---

## Phase 2: Stripe Integration Setup
**✅ COMPLETED** - December 3, 2024 (PR #53)

### 2.1 Stripe Product Configuration (Manual Setup)
**No code changes - documentation only** ✅ COMPLETE

**Create in Stripe Dashboard (Test Mode):**
- [x] Create Product: "Rowan Pro"
  - [x] Description: "Everything you need for household collaboration"
  - [x] Add monthly price: $11.99/month
  - [x] Add annual price: $119/year
  - [x] Copy price IDs to `.env.local`
- [x] Create Product: "Rowan Family"
  - [x] Description: "Complete family organization for up to 6 users"
  - [x] Add monthly price: $17.99/month
  - [x] Add annual price: $179/year
  - [x] Copy price IDs to `.env.local`
- [x] Configure webhook endpoint (for later):
  - [x] URL: `https://rowan.app/api/webhooks/stripe`
  - [x] Events to listen for:
    - [x] `checkout.session.completed`
    - [x] `customer.subscription.updated`
    - [x] `customer.subscription.deleted`
    - [x] `invoice.payment_failed`
    - [x] `invoice.payment_succeeded`
  - [x] Copy webhook secret to `.env.local`

**Documentation:**
- [x] Create `docs/setup/STRIPE_PRODUCTS.md`
- [x] Include screenshots of product setup
- [x] Document price IDs for reference
- [x] Explain webhook configuration

---

### 2.2 Stripe API Integration
**Branch**: `feature/stripe-integration` ✅ MERGED

**Tasks:**
- [x] Install Stripe SDK: `npm install stripe @stripe/stripe-js`
- [x] Create `lib/stripe/client.ts`:
  - [x] Initialize Stripe client with secret key
  - [x] Export typed Stripe instance
  - [x] Add error handling for missing keys
- [x] Create `lib/stripe/products.ts`:
  - [x] `STRIPE_PRODUCTS` constant with tier → price ID mapping
  - [x] `getPriceId(tier: SubscriptionTier, period: SubscriptionPeriod)` function
  - [x] `getProductInfo(tier: SubscriptionTier)` function (name, description, features)
- [x] Create `lib/stripe/checkout.ts`:
  - [x] `createCheckoutSession(userId, email, tier, period)` function
  - [x] Handle customer creation or retrieval
  - [x] Set success/cancel URLs
  - [x] Include metadata (user_id, tier, period)
  - [x] Return session ID
- [x] Create `lib/stripe/webhooks.ts`:
  - [x] `verifyWebhookSignature(payload, signature)` function
  - [x] `handleCheckoutCompleted(session)` function
  - [x] `handleSubscriptionUpdated(subscription)` function
  - [x] `handleSubscriptionDeleted(subscription)` function
  - [x] `handlePaymentFailed(invoice)` function
- [x] Add comprehensive error handling and logging

**Testing Checklist:**
- [x] Stripe client initializes correctly
- [x] Product info returns correct data
- [x] Price IDs map correctly
- [x] Error handling catches missing env vars
- [x] TypeScript types are correct

**PR Requirements:**
- [x] All functions documented with JSDoc
- [x] Error handling implemented
- [x] TypeScript compilation passes
- [x] No secrets in code (only env vars)

---

### 2.3 Stripe API Routes
**Branch**: `feature/stripe-api-routes` ✅ MERGED

**Tasks:**
- [x] Create `app/api/stripe/create-checkout-session/route.ts`:
  - [x] POST handler with authentication check
  - [x] Validate request body with Zod schema (tier, period)
  - [x] Get user from Supabase session
  - [x] Call `createCheckoutSession()` from lib/stripe/checkout
  - [x] Return session ID and publishable key
  - [x] Add rate limiting (Upstash Redis)
  - [x] Comprehensive error handling
  - [x] Log all requests for debugging
- [x] Create `app/api/webhooks/stripe/route.ts`:
  - [x] POST handler (no authentication - Stripe verified)
  - [x] Verify webhook signature
  - [x] Parse webhook event
  - [x] Route to appropriate handler based on event type
  - [x] Return 200 OK to acknowledge receipt
  - [x] Log all webhook events
  - [x] Handle errors gracefully (return 200 even on errors to avoid retries)
- [x] Create `app/api/subscription/status/route.ts`:
  - [x] GET handler with authentication
  - [x] Return user's subscription info from database
  - [x] Include usage stats
  - [x] Cache response for 5 minutes
- [x] Create `app/api/subscription/cancel/route.ts`:
  - [x] POST handler with authentication
  - [x] Cancel subscription in Stripe
  - [x] Update database status to 'canceled'
  - [x] Record subscription event
  - [x] Send cancellation email (optional)
  - [x] Return updated subscription info

**Zod Validation Schemas:**
- [x] `CreateCheckoutSessionSchema`:
  - [x] `tier`: enum ['pro', 'family']
  - [x] `period`: enum ['monthly', 'annual']
- [x] `CancelSubscriptionSchema`:
  - [x] `reason`: optional string (for analytics)

**Security Checklist:**
- [x] All routes have proper authentication (except webhooks)
- [x] Webhook signature verification implemented
- [x] Rate limiting on checkout creation (5 requests/minute)
- [x] Input validation with Zod
- [x] SQL injection prevention (use parameterized queries)
- [x] No sensitive data in error responses

**Testing Checklist:**
- [x] Test create-checkout-session with valid data
- [x] Test with invalid tier/period (should reject)
- [x] Test without authentication (should reject)
- [x] Test webhook with valid signature
- [x] Test webhook with invalid signature (should reject)
- [x] Test subscription status endpoint
- [x] Test cancel endpoint

**PR Requirements:**
- [x] All routes tested locally
- [x] Error handling verified
- [x] Security checklist completed
- [x] Documentation in route files

---

## Phase 3: Service Layer & Business Logic
**✅ COMPLETED** - December 3, 2024 (PR #54)

### 3.1 Subscription Service Layer
**Branch**: `feature/phase3-service-layer` ✅ MERGED

**Tasks:**
- [x] Create `lib/services/subscription-service.ts`:
  - [x] `getUserSubscription(userId: string): Promise<Subscription>`
  - [x] `updateSubscription(userId: string, data: Partial<Subscription>): Promise<void>`
  - [x] `cancelSubscription(userId: string, reason?: string): Promise<void>`
  - [x] `reactivateSubscription(userId: string): Promise<void>`
  - [x] `recordSubscriptionEvent(userId: string, event: SubscriptionEvent): Promise<void>`
  - [x] All functions use Supabase client
  - [x] Comprehensive error handling
  - [x] Return structured error objects
- [x] Create `lib/services/usage-service.ts`:
  - [x] `getDailyUsage(userId: string, date?: Date): Promise<DailyUsage>`
  - [x] `incrementUsage(userId: string, usageType: UsageType): Promise<void>`
  - [x] `checkUsageLimit(userId: string, usageType: UsageType): Promise<boolean>`
  - [x] `resetDailyUsage(userId: string): Promise<void>` (for testing)
  - [x] Use atomic increments to prevent race conditions
- [x] Create `lib/services/feature-access-service.ts`:
  - [x] `checkFeatureAccess(userId: string, feature: string): Promise<boolean>`
  - [x] `getFeatureLimits(tier: SubscriptionTier): FeatureLimits`
  - [x] `canCreateTask(userId: string): Promise<boolean>`
  - [x] `canCreateCalendarEvent(userId: string): Promise<boolean>`
  - [x] `canSendMessage(userId: string): Promise<boolean>`
  - [x] `canUseQuickAction(userId: string): Promise<boolean>`
  - [x] `canUploadPhoto(userId: string): Promise<boolean>`
  - [x] Cache tier info to reduce database queries

**Feature Limits Configuration:**
- [x] Create `lib/config/feature-limits.ts`:
  ```typescript
  export const FEATURE_LIMITS = {
    free: {
      maxActiveTasks: 25,
      canCreateCalendar: false,
      maxShoppingLists: 1,
      maxShoppingItems: 15,
      messageHistoryDays: 7,
      dailyQuickActions: 3,
      dailyTaskCreation: 5,
      dailyMessages: 20,
      dailyShoppingUpdates: 10,
      canUploadPhotos: false,
      canUseMealPlanning: false,
      canUseReminders: false,
      canUseGoals: false,
      canUseHousehold: false,
      realtimeSyncDelay: 30000, // 30 seconds
      maxUsers: 2,
      maxSpaces: 1,
    },
    pro: {
      maxActiveTasks: Infinity,
      canCreateCalendar: true,
      maxShoppingLists: Infinity,
      maxShoppingItems: Infinity,
      messageHistoryDays: Infinity,
      dailyQuickActions: Infinity,
      dailyTaskCreation: Infinity,
      dailyMessages: Infinity,
      dailyShoppingUpdates: Infinity,
      canUploadPhotos: true,
      canUseMealPlanning: true,
      canUseReminders: true,
      canUseGoals: true,
      canUseHousehold: true,
      realtimeSyncDelay: 0,
      maxUsers: 2,
      maxSpaces: 1,
      storageGB: 5,
    },
    family: {
      // All Pro features plus:
      maxUsers: 6,
      maxSpaces: Infinity,
      storageGB: 15,
      canUseAI: true,
      canUseIntegrations: true,
      prioritySupport: true,
    },
  };
  ```

**Testing Checklist:**
- [x] Test getUserSubscription with existing user
- [x] Test updateSubscription with valid data
- [x] Test feature access checks for each tier
- [x] Test usage increment and limit checks
- [x] Test concurrent usage increments (race conditions)
- [x] Verify error handling for invalid inputs

**PR Requirements:**
- [x] Service functions documented
- [x] Feature limits clearly defined
- [x] All services tested
- [x] No breaking changes to existing code

**Implementation Notes (December 3, 2024):**
- ✅ Created `lib/config/feature-limits.ts` with complete tier definitions
- ✅ Created `lib/services/subscription-service.ts` with all CRUD operations
- ✅ Created `lib/services/usage-service.ts` with atomic usage tracking
- ✅ Created `lib/services/feature-access-service.ts` with comprehensive access control
- ✅ Fixed UsageType naming mismatch (tasks_created, messages_sent, etc.)
- ✅ Fixed storageGB type to be `number | undefined`
- ✅ All files passed TypeScript compilation
- ✅ PR #54 merged successfully

---

### 3.2 Middleware for Feature Gating
**Branch**: `feature/feature-gating-middleware` ⏳ PENDING (Phase 4)

**Tasks:**
- [ ] Create `lib/middleware/subscription-check.ts`:
  - [ ] `withSubscriptionCheck(handler, requiredTier)` HOC for API routes
  - [ ] Check user's subscription tier
  - [ ] Return 403 if tier insufficient
  - [ ] Return upgrade prompt data in error
- [ ] Create `lib/middleware/usage-check.ts`:
  - [ ] `withUsageCheck(handler, usageType)` HOC for API routes
  - [ ] Check daily usage limit
  - [ ] Increment usage counter on success
  - [ ] Return 429 if limit exceeded
  - [ ] Return upgrade prompt data in error
- [ ] Update `middleware.ts` (root middleware):
  - [ ] Add subscription tier to request context
  - [ ] Cache tier info in session for performance
  - [ ] No blocking - just add context

**Usage Example:**
```typescript
// In API route
export const POST = withSubscriptionCheck(
  withUsageCheck(async (req) => {
    // Handler logic
  }, 'tasks_created'),
  'pro'
);
```

**Testing Checklist:**
- [ ] Test middleware with different tiers
- [ ] Test usage limit enforcement
- [ ] Verify upgrade prompt data in error response
- [ ] Test performance impact (should be minimal)

**PR Requirements:**
- [ ] Middleware tested with sample routes
- [ ] Documentation on how to use
- [ ] Performance benchmarks acceptable

---

## Phase 4: Frontend - Pricing Page

### 4.1 Pricing Page Design & Layout
**Branch**: `feature/pricing-page`

**Tasks:**
- [ ] Create `app/pricing/page.tsx`:
  - [ ] Hero section with headline: "The family command center that works"
  - [ ] Subheadline with value proposition
  - [ ] Annual/Monthly toggle (default: monthly)
  - [ ] 3-column pricing cards (Free, Pro, Family)
  - [ ] Feature comparison table (expandable)
  - [ ] FAQ section (5-7 common questions)
  - [ ] Social proof section ("Join 10,000+ families...")
  - [ ] Trust signals (cancel anytime, 30-day guarantee)
  - [ ] Mobile responsive layout
  - [ ] Dark mode support
- [ ] Create `components/pricing/PricingCard.tsx`:
  - [ ] Tier name and description
  - [ ] Price with period (monthly/annual)
  - [ ] "Popular" badge for Pro tier
  - [ ] Feature list with checkmarks
  - [ ] Primary CTA button ("Get Started" for Free, "Upgrade" for paid)
  - [ ] Hover effects and animations
  - [ ] Accessible markup (ARIA labels)
- [ ] Create `components/pricing/PricingToggle.tsx`:
  - [ ] Monthly/Annual switch
  - [ ] "Save 17%" badge on annual
  - [ ] Smooth animation on toggle
  - [ ] Update all pricing cards on change
- [ ] Create `components/pricing/FeatureComparisonTable.tsx`:
  - [ ] Expandable table with all features
  - [ ] Checkmarks for included features
  - [ ] X marks for excluded features
  - [ ] Tooltips for feature explanations
  - [ ] Mobile-friendly collapsible design
- [ ] Create `components/pricing/PricingFAQ.tsx`:
  - [ ] Accordion-style FAQ items
  - [ ] Questions:
    - [ ] "Can I switch plans later?"
    - [ ] "What happens to my data if I cancel?"
    - [ ] "Do you offer refunds?"
    - [ ] "How do I cancel my subscription?"
    - [ ] "Can I upgrade/downgrade anytime?"
    - [ ] "What payment methods do you accept?"
    - [ ] "Is my payment information secure?"

**Design Requirements:**
- [ ] Apple-inspired minimalist aesthetic
- [ ] Generous whitespace
- [ ] System fonts (SF Pro Display fallback)
- [ ] Subtle animations (fade-ins, hover states)
- [ ] Clean color palette (white/gray + brand blue)
- [ ] Professional, non-salesy tone
- [ ] Photo-realistic hero background (optional)

**Copy Guidelines:**
- [ ] Benefit-focused, not feature-focused
- [ ] "Unlock" language instead of "Restricted"
- [ ] Emphasize time savings and organization benefits
- [ ] Social proof language ("Join thousands...")
- [ ] Trust-building language ("Cancel anytime")

**Testing Checklist:**
- [ ] Test on mobile (iPhone, Android)
- [ ] Test on tablet (iPad)
- [ ] Test on desktop (various screen sizes)
- [ ] Test dark mode
- [ ] Test toggle animation
- [ ] Test accessibility (keyboard navigation)
- [ ] Verify all links work
- [ ] Check page performance (Lighthouse score >90)

**PR Requirements:**
- [ ] Design mockup or reference included
- [ ] Responsive design verified
- [ ] Accessibility checklist completed
- [ ] Dark mode tested
- [ ] Performance acceptable

---

### 4.2 Stripe Checkout Integration (Embedded)
**Branch**: `feature/embedded-stripe-checkout`

**Tasks:**
- [ ] Install Stripe JS library: `npm install @stripe/react-stripe-js`
- [ ] Create `components/payments/StripeCheckoutModal.tsx`:
  - [ ] Accept props: tier, period, onSuccess, onCancel
  - [ ] Load Stripe Elements
  - [ ] Render embedded payment form
  - [ ] Handle form submission
  - [ ] Show loading state during processing
  - [ ] Show success animation on completion
  - [ ] Show error message on failure
  - [ ] Close button (dismiss)
  - [ ] Mobile-optimized form
- [ ] Create `components/payments/StripeProvider.tsx`:
  - [ ] Wrap app with Stripe Elements Provider
  - [ ] Use NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  - [ ] Handle initialization errors
- [ ] Update `app/layout.tsx`:
  - [ ] Wrap children with StripeProvider
- [ ] Create `hooks/useStripeCheckout.ts`:
  - [ ] `initiateCheckout(tier, period)` function
  - [ ] Call `/api/stripe/create-checkout-session`
  - [ ] Open StripeCheckoutModal with session ID
  - [ ] Handle success/error callbacks
  - [ ] Track analytics events

**Modal Design:**
- [ ] Clean, professional appearance
- [ ] Order summary (tier, price, period)
- [ ] Stripe payment form (embedded)
- [ ] Security badges (Stripe, PCI-DSS)
- [ ] "Powered by Stripe" logo
- [ ] Cancel button (non-aggressive, text link)
- [ ] Loading spinner during processing
- [ ] Success checkmark animation
- [ ] Error message with retry option

**Error Handling:**
- [ ] Card declined → show friendly message
- [ ] Network error → show retry option
- [ ] Invalid card → show field-specific error
- [ ] Session expired → create new session
- [ ] Generic error → show support contact

**Testing Checklist:**
- [ ] Test with Stripe test cards (success case)
- [ ] Test with declined card
- [ ] Test with insufficient funds card
- [ ] Test with invalid card number
- [ ] Test on mobile devices
- [ ] Verify PCI compliance (no card data touches server)
- [ ] Test success callback
- [ ] Test cancel callback

**PR Requirements:**
- [ ] Stripe Elements properly initialized
- [ ] Error handling comprehensive
- [ ] Success flow tested end-to-end
- [ ] Mobile experience verified
- [ ] Security checklist completed

---

## Phase 5: Frontend - Upgrade Modals & Prompts

### 5.1 Upgrade Modal Component
**Branch**: `feature/upgrade-modals`

**Tasks:**
- [ ] Create `components/modals/UpgradeModal.tsx`:
  - [ ] Accept props: triggerSource, feature, isOpen, onClose
  - [ ] Elegant modal design (not aggressive)
  - [ ] Icon at top (Sparkles or relevant feature icon)
  - [ ] Headline: "Unlock [Feature Name]"
  - [ ] Body copy: benefit-focused explanation
  - [ ] Bullet list of what they'll get with Pro
  - [ ] Pricing info: "$11.99/mo" with "or $119/year"
  - [ ] Primary CTA: "Upgrade to Pro" button
  - [ ] Secondary CTA: "Not now" text link
  - [ ] Dismissible (X button, outside click, ESC key)
  - [ ] Animation: smooth fade-in
  - [ ] Track "shown" event for analytics
  - [ ] Track "dismissed" vs "clicked" for analytics
- [ ] Create `hooks/useUpgradeModal.ts`:
  - [ ] `showUpgradeModal(triggerSource, feature)` function
  - [ ] Track "shown" count in session storage (show once per session per feature)
  - [ ] Return modal state and handlers
  - [ ] Record event in database for analytics
- [ ] Create modal variants for different triggers:
  - [ ] Task limit reached
  - [ ] Calendar creation blocked
  - [ ] Meal planning blocked
  - [ ] Reminders blocked
  - [ ] Goals blocked
  - [ ] Photo upload blocked
  - [ ] Message limit reached
  - [ ] Quick action limit reached

**Modal Copy Examples:**

**Task Limit Reached:**
```
[Icon: CheckSquare]
Unlock Unlimited Tasks

You've reached your 25-task limit on the free plan.
Upgrade to Pro to create unlimited tasks and get:

• Unlimited tasks & calendar events
• Meal planning & recipes
• Reminders & habit tracking
• Real-time collaboration
• 5GB photo storage

Starting at $11.99/month

[Primary: Upgrade to Pro]
[Secondary: Not now]
```

**Calendar Creation Blocked:**
```
[Icon: Calendar]
Unlock Calendar Creation

Calendar creation is a Pro feature.
Upgrade to create unlimited events and get:

• Full calendar functionality
• Event proposals & voting
• Weather integration
• Meal planning & recipes
• Real-time sync

Starting at $11.99/month

[Primary: Upgrade to Pro]
[Secondary: Not now]
```

**Design Guidelines:**
- [ ] Use Sparkles icon or feature-specific icon
- [ ] Benefit-focused headlines ("Unlock" not "Restricted")
- [ ] Bullet points start with action verbs
- [ ] Price shown with both monthly and annual
- [ ] Non-aggressive language throughout
- [ ] Dismissible without guilt
- [ ] Once per session per feature (not annoying)

**Testing Checklist:**
- [ ] Test modal appearance on desktop
- [ ] Test modal appearance on mobile
- [ ] Test dark mode
- [ ] Test keyboard navigation (Tab, ESC)
- [ ] Test outside click dismissal
- [ ] Verify analytics tracking
- [ ] Test "once per session" logic
- [ ] Verify smooth animations

**PR Requirements:**
- [ ] All modal variants created
- [ ] Copy reviewed for tone
- [ ] Analytics tracking implemented
- [ ] Accessibility verified
- [ ] Mobile experience tested

---

### 5.2 Inline Upgrade Prompts
**Branch**: `feature/inline-upgrade-prompts`

**Tasks:**
- [ ] Create `components/ui/UpgradeBanner.tsx`:
  - [ ] Subtle banner component (not intrusive)
  - [ ] Icon + text + CTA button
  - [ ] Variant: info (blue), warning (yellow), premium (purple)
  - [ ] Dismissible (optional)
  - [ ] Compact design for inline placement
- [ ] Create `components/ui/FeatureLockBadge.tsx`:
  - [ ] Small badge: "Pro" or "Family"
  - [ ] Hover shows tooltip: "Upgrade to unlock"
  - [ ] Click opens upgrade modal
  - [ ] Subtle, not obtrusive
- [ ] Add banners to feature pages:
  - [ ] Calendar page (free tier): "Upgrade to create events"
  - [ ] Meal planning page (free tier): "Upgrade to unlock meal planning"
  - [ ] Reminders page (free tier): "Upgrade to set reminders"
  - [ ] Goals page (free tier): "Upgrade to track goals"
  - [ ] Household page (free tier): "Upgrade for household management"
- [ ] Add usage counters:
  - [ ] Tasks: "23/25 tasks used" (show when >80%)
  - [ ] Messages: "18/20 messages today" (show when >80%)
  - [ ] Quick Actions: "2/3 quick actions today"
  - [ ] Shopping list items: "12/15 items"
- [ ] Add lock icons to blocked features in navigation:
  - [ ] Show FeatureLockBadge next to menu items
  - [ ] Clicking opens upgrade modal instead of page

**Banner Placement Strategy:**
- [ ] Top of page (non-sticky, dismissible)
- [ ] Not shown if user dismissed in last 7 days
- [ ] Only one banner per page
- [ ] Prioritize by feature value (calendar > meals > reminders)

**Testing Checklist:**
- [ ] Test banner appearance for free tier users
- [ ] Verify banners don't show for Pro/Family users
- [ ] Test dismissal persistence (7 days)
- [ ] Test usage counters update correctly
- [ ] Verify lock badges only show for inaccessible features
- [ ] Test modal opens correctly from prompts

**PR Requirements:**
- [ ] Banners placed strategically
- [ ] Copy reviewed for tone
- [ ] Dismissal logic implemented
- [ ] No visual clutter
- [ ] Tested across all pages

---

## Phase 6: Feature Gating Implementation
**✅ COMPLETED** - December 9, 2024 (PR #85)

### 6.1 Task Creation Limits
**Branch**: `feature/phase6-feature-gating` ✅ MERGED

**Tasks:**
- [x] Update `lib/services/tasks-service.ts`:
  - [ ] Add `canCreateTask(userId)` check before task creation
  - [ ] Check active task count against limit
  - [ ] Check daily creation limit (free tier: 5/day)
  - [ ] Return error with upgrade prompt if limit exceeded
  - [ ] Increment daily usage counter on success
- [ ] Update `app/api/tasks/route.ts`:
  - [ ] Add usage check middleware
  - [ ] Return 403 with upgrade prompt data if limit exceeded
  - [ ] Include remaining count in response headers
- [ ] Update `app/(pages)/tasks/page.tsx`:
  - [ ] Show usage counter: "23/25 active tasks"
  - [ ] Disable "Add Task" button when limit reached
  - [ ] Show tooltip on hover explaining limit
  - [ ] Open upgrade modal when clicked at limit
- [ ] Update `components/tasks/TaskCard.tsx`:
  - [ ] Check limit before opening create modal
  - [ ] Show upgrade modal if limit reached
  - [ ] Track "task_limit" trigger source

**Testing Checklist:**
- [ ] Free tier user: create 25 tasks, verify 26th blocked
- [ ] Free tier user: create 5 tasks in one day, verify 6th blocked
- [ ] Pro tier user: create >25 tasks, verify unlimited
- [ ] Verify upgrade modal shows with correct copy
- [ ] Test task deletion frees up slot (for active limit)
- [ ] Verify archived tasks don't count toward limit

**PR Requirements:**
- [ ] Limit enforcement working correctly
- [ ] Upgrade modal integrated
- [ ] Usage counter visible
- [ ] No breaking changes to task creation flow

---

### 6.2 Calendar Creation Restrictions
**Branch**: `feature/calendar-restrictions`

**Tasks:**
- [ ] Update `lib/services/calendar-service.ts`:
  - [ ] Add `canCreateCalendarEvent(userId)` check
  - [ ] Return error with upgrade prompt if free tier
  - [ ] Allow view-only access for free tier
- [ ] Update `app/api/calendar/events/route.ts`:
  - [ ] Add subscription check middleware (requires 'pro' or 'family')
  - [ ] Return 403 with upgrade prompt if free tier
- [ ] Update `app/(pages)/calendar/page.tsx`:
  - [ ] Show banner: "Upgrade to create calendar events"
  - [ ] Disable "Add Event" button for free tier
  - [ ] Show lock icon on button
  - [ ] Open upgrade modal when clicked
  - [ ] Allow viewing existing events (view-only)
- [ ] Update `components/calendar/CalendarView.tsx`:
  - [ ] Disable date/time selection for free tier
  - [ ] Show tooltip: "Upgrade to create events"
  - [ ] Open upgrade modal on click

**Testing Checklist:**
- [ ] Free tier: cannot create events
- [ ] Free tier: can view calendar
- [ ] Free tier: banner shows at top of page
- [ ] Pro tier: can create unlimited events
- [ ] Upgrade modal opens with calendar-specific copy
- [ ] No errors in console

**PR Requirements:**
- [ ] View-only mode working for free tier
- [ ] Creation blocked elegantly
- [ ] Upgrade prompt integrated
- [ ] Calendar remains usable (view mode)

---

### 6.3 Feature Page Blocks
**Branch**: `feature/page-access-restrictions`

**Tasks:**
- [ ] Update pages to check subscription tier:
  - [ ] `app/(pages)/meals/page.tsx` - requires Pro/Family
  - [ ] `app/(pages)/reminders/page.tsx` - requires Pro/Family
  - [ ] `app/(pages)/goals/page.tsx` - requires Pro/Family
  - [ ] `app/(pages)/household/page.tsx` - requires Pro/Family
- [ ] Create `components/access/FeatureLockedPage.tsx`:
  - [ ] Full-page upgrade prompt
  - [ ] Feature preview/screenshot
  - [ ] Benefit explanation
  - [ ] "Upgrade to Unlock" CTA
  - [ ] Beautiful design (not punishing)
- [ ] For each blocked page:
  - [ ] Check subscription tier on page load
  - [ ] Show FeatureLockedPage if insufficient tier
  - [ ] Track "feature_blocked" event for analytics
- [ ] Update navigation:
  - [ ] Add lock badges to menu items for inaccessible features
  - [ ] Clicking opens upgrade modal (not the page)

**FeatureLockedPage Design:**
```
[Large Feature Icon]

Unlock [Feature Name]

[Feature description explaining benefits]

What you'll get with Pro:
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

[Preview Image/Screenshot]

[Primary CTA: Upgrade to Pro - $11.99/mo]
[Secondary: Learn more about Pro]
```

**Testing Checklist:**
- [ ] Free tier: blocked pages show FeatureLockedPage
- [ ] Pro tier: all pages accessible
- [ ] Lock badges show in navigation for free tier
- [ ] Lock badges hidden in navigation for Pro/Family tier
- [ ] Upgrade modal opens from navigation click
- [ ] Page remains accessible after upgrade

**PR Requirements:**
- [ ] All feature pages gated correctly
- [ ] FeatureLockedPage design approved
- [ ] Navigation lock badges implemented
- [ ] Analytics tracking in place

---

### 6.4 Daily Usage Limits
**Branch**: `feature/daily-usage-limits`

**Tasks:**
- [ ] Update `lib/services/usage-service.ts`:
  - [ ] `checkDailyLimit(userId, usageType)` before allowing action
  - [ ] `incrementDailyUsage(userId, usageType)` after action
  - [ ] Reset counters at midnight (UTC)
  - [ ] Cache usage in Redis for performance
- [ ] Apply to rate-limited features:
  - [ ] Tasks: 5 creations/day (free tier)
  - [ ] Messages: 20 messages/day (free tier)
  - [ ] Quick Actions: 3 uses/day (free tier)
  - [ ] Shopping lists: 10 updates/day (free tier)
- [ ] Update UI to show remaining count:
  - [ ] "2/3 Quick Actions today" badge
  - [ ] "18/20 messages today" in message input area
  - [ ] "4/5 tasks created today" near Add Task button
  - [ ] "8/10 shopping list updates today" in shopping list
- [ ] Show upgrade modal when limit reached:
  - [ ] Track daily limit trigger source
  - [ ] Show remaining time until reset
  - [ ] Encourage upgrade for unlimited

**Testing Checklist:**
- [ ] Test task creation daily limit (5/day free)
- [ ] Test message sending daily limit (20/day free)
- [ ] Test quick action daily limit (3/day free)
- [ ] Test shopping list daily limit (10/day free)
- [ ] Verify counters reset at midnight
- [ ] Verify Pro/Family users have no limits
- [ ] Test upgrade modal shows correctly

**PR Requirements:**
- [ ] All daily limits enforced
- [ ] Counters display correctly
- [ ] Midnight reset working
- [ ] Upgrade prompts integrated

---

## Phase 7: Payment Flow & Webhooks

### 7.1 Webhook Handler Implementation
**Branch**: `feature/webhook-handlers`

**Tasks:**
- [ ] Complete `app/api/webhooks/stripe/route.ts`:
  - [ ] Verify webhook signature (CRITICAL)
  - [ ] Parse webhook event
  - [ ] Route to appropriate handler
  - [ ] Log all events for debugging
  - [ ] Return 200 OK even on errors (to prevent retries)
- [ ] Implement `handleCheckoutCompleted()`:
  - [ ] Extract user_id from session metadata
  - [ ] Update user's subscription in database:
    - [ ] Set subscription_tier
    - [ ] Set stripe_customer_id
    - [ ] Set stripe_subscription_id
    - [ ] Set subscription_started_at
    - [ ] Set subscription_status = 'active'
  - [ ] Record subscription event ('upgrade')
  - [ ] Send welcome email with onboarding tips
  - [ ] Invalidate user session cache
  - [ ] Log successful upgrade
- [ ] Implement `handleSubscriptionUpdated()`:
  - [ ] Update subscription_status in database
  - [ ] Handle tier changes (upgrade/downgrade)
  - [ ] Record subscription event
  - [ ] Send notification email if tier changed
- [ ] Implement `handleSubscriptionDeleted()`:
  - [ ] Set subscription_status = 'canceled'
  - [ ] Set subscription_ends_at (end of billing period)
  - [ ] Record subscription event ('cancel')
  - [ ] Send cancellation confirmation email
  - [ ] Keep access until subscription_ends_at
- [ ] Implement `handlePaymentFailed()`:
  - [ ] Set subscription_status = 'past_due'
  - [ ] Record subscription event ('payment_failed')
  - [ ] Send payment failure email with retry link
  - [ ] Grace period: 7 days before downgrade to free

**Webhook Security:**
- [ ] Verify webhook signature using Stripe SDK
- [ ] Reject requests with invalid signature
- [ ] Log all verification attempts
- [ ] Rate limit webhook endpoint (in case of attack)

**Testing Checklist:**
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Trigger `checkout.session.completed` event
- [ ] Trigger `customer.subscription.updated` event
- [ ] Trigger `customer.subscription.deleted` event
- [ ] Trigger `invoice.payment_failed` event
- [ ] Verify database updates correctly for each event
- [ ] Verify emails sent correctly
- [ ] Test with invalid signature (should reject)

**PR Requirements:**
- [ ] All webhook handlers implemented
- [ ] Signature verification working
- [ ] Database updates correct
- [ ] Email notifications configured
- [ ] Tested with Stripe CLI

---

### 7.2 Post-Payment Success Flow
**Branch**: `feature/payment-success-flow`

**Tasks:**
- [ ] Create `app/payment/success/page.tsx`:
  - [ ] Success animation (checkmark, confetti)
  - [ ] "Welcome to Rowan Pro!" headline
  - [ ] List of unlocked features
  - [ ] "Get Started" CTA to dashboard
  - [ ] Auto-redirect after 5 seconds
- [ ] Create `app/payment/canceled/page.tsx`:
  - [ ] Friendly message: "No worries!"
  - [ ] Explain what happened (payment canceled)
  - [ ] "Try Again" button to pricing page
  - [ ] "Continue with Free" button to dashboard
- [ ] Update `useStripeCheckout` hook:
  - [ ] On success, redirect to `/payment/success?tier={tier}`
  - [ ] On cancel, redirect to `/payment/canceled`
- [ ] Create onboarding email template:
  - [ ] Welcome message
  - [ ] Quick start guide (top 3 features to try)
  - [ ] Link to dashboard
  - [ ] Support contact info
- [ ] Send email via Resend after successful payment

**Success Page Design:**
```
[Animated Checkmark Icon]
[Optional: Confetti animation]

Welcome to Rowan Pro!

You now have access to:
✓ Unlimited tasks & calendar events
✓ Meal planning & recipes
✓ Reminders & habit tracking
✓ Real-time collaboration
✓ 5GB photo storage

[Primary CTA: Go to Dashboard]

Redirecting in 5 seconds...
```

**Testing Checklist:**
- [ ] Complete test payment, verify redirect to success page
- [ ] Verify success animation plays
- [ ] Verify auto-redirect after 5 seconds
- [ ] Test cancel payment, verify redirect to canceled page
- [ ] Verify email sent after successful payment
- [ ] Test on mobile devices

**PR Requirements:**
- [ ] Success flow implemented
- [ ] Email template created
- [ ] Auto-redirect working
- [ ] Mobile experience verified

---

## Phase 8: User Dashboard & Account Management

### 8.1 Subscription Management Page
**Branch**: `feature/subscription-management`

**Tasks:**
- [ ] Create `app/(pages)/account/subscription/page.tsx`:
  - [ ] Current plan card (tier, price, period)
  - [ ] Billing date (next renewal)
  - [ ] Payment method (last 4 digits)
  - [ ] Usage stats (tasks, messages, storage)
  - [ ] "Change Plan" button
  - [ ] "Cancel Subscription" button
  - [ ] Billing history (last 12 months)
- [ ] Create `components/account/CurrentPlanCard.tsx`:
  - [ ] Display tier badge (Free/Pro/Family)
  - [ ] Show price and billing period
  - [ ] Next billing date
  - [ ] Features included
  - [ ] CTA: "Upgrade" (if free) or "Change Plan"
- [ ] Create `components/account/UsageStatsCard.tsx`:
  - [ ] Tasks: "23/25 active" (free) or "487 active" (pro)
  - [ ] Messages: "18/20 today" (free) or "342 today" (pro)
  - [ ] Storage: "0.8 GB / 5 GB" (pro)
  - [ ] Progress bars for visual display
- [ ] Create `components/account/BillingHistory.tsx`:
  - [ ] Table with date, amount, status, invoice link
  - [ ] Download invoice button (PDF from Stripe)
  - [ ] Filter by date range
- [ ] Create `components/modals/CancelSubscriptionModal.tsx`:
  - [ ] Confirm cancellation intent
  - [ ] Explain what happens (access until end of period)
  - [ ] Optional: cancellation reason survey
  - [ ] "Confirm Cancel" and "Keep Subscription" buttons
  - [ ] After cancel: show reactivate option

**Testing Checklist:**
- [ ] Test as free tier user (show upgrade options)
- [ ] Test as Pro tier user (show plan details)
- [ ] Test as Family tier user (show plan details)
- [ ] Verify billing history loads correctly
- [ ] Test cancel flow (don't actually cancel!)
- [ ] Test change plan flow

**PR Requirements:**
- [ ] Subscription page fully functional
- [ ] Usage stats accurate
- [ ] Billing history displays correctly
- [ ] Cancel flow working (test mode only)

---

### 8.2 Plan Change Flow
**Branch**: `feature/plan-change-flow`

**Tasks:**
- [ ] Create `app/account/subscription/change/page.tsx`:
  - [ ] Show current plan
  - [ ] Show available plans (upgrade/downgrade)
  - [ ] Explain proration (if applicable)
  - [ ] "Confirm Change" button
  - [ ] "Cancel" button back to subscription page
- [ ] Create API route `app/api/subscription/change-plan/route.ts`:
  - [ ] POST handler with authentication
  - [ ] Validate new tier and period
  - [ ] Call Stripe API to update subscription
  - [ ] Handle proration (automatic via Stripe)
  - [ ] Update database with new tier
  - [ ] Record subscription event
  - [ ] Send confirmation email
- [ ] Handle edge cases:
  - [ ] Downgrade from Family to Pro (check user count)
  - [ ] Downgrade to Free (check feature usage, warn about limits)
  - [ ] Switching between monthly/annual
  - [ ] Proration explanation (credit or charge)

**Testing Checklist:**
- [ ] Test upgrade from Free to Pro
- [ ] Test upgrade from Pro to Family
- [ ] Test downgrade from Family to Pro (with 6 users - should warn)
- [ ] Test switch from monthly to annual (proration)
- [ ] Test switch from annual to monthly
- [ ] Verify proration calculated correctly by Stripe
- [ ] Verify emails sent

**PR Requirements:**
- [ ] Plan change working in all directions
- [ ] Proration handled correctly
- [ ] Edge cases handled gracefully
- [ ] Confirmation emails sent

---

## Phase 9: Analytics & Monitoring

### 9.1 Conversion Analytics Dashboard
**Branch**: `feature/conversion-analytics`

**Tasks:**
- [ ] Create `app/admin/analytics/page.tsx` (admin-only):
  - [ ] Overview cards (MRR, users by tier, conversion rate)
  - [ ] Conversion funnel chart (free → pro → family)
  - [ ] Daily signups graph
  - [ ] Daily upgrades graph
  - [ ] Churn rate graph
  - [ ] Revenue graph (last 90 days)
  - [ ] Top upgrade triggers (which features drive upgrades)
  - [ ] Failed payment rate
- [ ] Create database views for analytics:
  - [ ] `subscription_metrics_daily` (daily snapshot)
  - [ ] `conversion_funnel_stats` (funnel conversion rates)
  - [ ] `upgrade_trigger_stats` (which features drive upgrades)
  - [ ] `churn_cohort_analysis` (cohort retention)
- [ ] Create API routes for analytics data:
  - [ ] `app/api/admin/analytics/overview/route.ts`
  - [ ] `app/api/admin/analytics/conversions/route.ts`
  - [ ] `app/api/admin/analytics/revenue/route.ts`
  - [ ] `app/api/admin/analytics/triggers/route.ts`
- [ ] Add admin authentication check:
  - [ ] Only users with `is_admin` flag can access
  - [ ] Redirect non-admins to 404

**Key Metrics to Track:**
- [ ] MRR (Monthly Recurring Revenue)
- [ ] ARR (Annual Recurring Revenue)
- [ ] Active subscriptions by tier
- [ ] New signups (free tier)
- [ ] Free → Pro conversion rate
- [ ] Free → Family conversion rate
- [ ] Churn rate (monthly)
- [ ] Average Revenue Per User (ARPU)
- [ ] Lifetime Value (LTV)
- [ ] Top upgrade triggers
- [ ] Failed payment rate

**Testing Checklist:**
- [ ] Verify only admins can access
- [ ] Test all charts render correctly
- [ ] Verify metrics calculate accurately
- [ ] Test date range filters
- [ ] Check page performance with large datasets

**PR Requirements:**
- [ ] Analytics dashboard functional
- [ ] Admin-only access enforced
- [ ] Metrics accurate
- [ ] Performance acceptable

---

### 9.2 Error Monitoring & Logging
**Branch**: `feature/monetization-logging`

**Tasks:**
- [ ] Add comprehensive logging to all payment flows:
  - [ ] Checkout session creation
  - [ ] Payment success/failure
  - [ ] Webhook events
  - [ ] Subscription updates
  - [ ] Plan changes
  - [ ] Cancellations
- [ ] Create `lib/utils/monetization-logger.ts`:
  - [ ] `logCheckoutInitiated(userId, tier, period)`
  - [ ] `logCheckoutSuccess(userId, tier, period)`
  - [ ] `logCheckoutFailed(userId, tier, period, error)`
  - [ ] `logWebhookReceived(eventType, payload)`
  - [ ] `logSubscriptionEvent(userId, event)`
  - [ ] Use structured logging (JSON format)
- [ ] Set up error alerting:
  - [ ] Failed payments → send notification
  - [ ] Webhook errors → send notification
  - [ ] Checkout errors → log and track
  - [ ] Use Vercel Monitoring or external service (Sentry)
- [ ] Create `app/api/admin/logs/route.ts`:
  - [ ] Admin-only access
  - [ ] Query logs by date range, user, event type
  - [ ] Filter and search functionality
  - [ ] Export logs to CSV

**Log Format Example:**
```json
{
  "timestamp": "2024-12-02T10:30:00Z",
  "event": "checkout_initiated",
  "userId": "uuid-here",
  "tier": "pro",
  "period": "monthly",
  "amount": 11.99,
  "metadata": {}
}
```

**Testing Checklist:**
- [ ] Verify logs created for all payment events
- [ ] Test log query and filtering
- [ ] Verify admin-only access to logs
- [ ] Test error alerting (simulate failure)

**PR Requirements:**
- [ ] Logging implemented throughout
- [ ] Error alerting configured
- [ ] Admin log viewer functional

---

## Phase 10: Testing & Quality Assurance

### 10.1 End-to-End Testing
**Branch**: `feature/monetization-e2e-tests`

**Tasks:**
- [ ] Install E2E testing framework (Playwright): `npm install -D @playwright/test`
- [ ] Create test suite `tests/e2e/monetization.spec.ts`:
  - [ ] Test 1: Free user hits task limit → sees upgrade modal
  - [ ] Test 2: Free user tries to create calendar event → blocked
  - [ ] Test 3: User views pricing page → toggles monthly/annual
  - [ ] Test 4: User upgrades to Pro → payment success flow
  - [ ] Test 5: Pro user accesses previously blocked features
  - [ ] Test 6: Pro user cancels subscription → downgrade flow
  - [ ] Test 7: Webhook updates subscription correctly
- [ ] Create test helpers:
  - [ ] `createTestUser(tier)` - create user with specific tier
  - [ ] `loginAsUser(userId)` - log in as specific user
  - [ ] `simulateStripeWebhook(event)` - trigger webhook locally
  - [ ] `verifyFeatureAccess(feature, shouldHaveAccess)` - check access
- [ ] Run tests in CI/CD pipeline:
  - [ ] Add to GitHub Actions workflow
  - [ ] Run on PR creation
  - [ ] Block merge if tests fail

**Testing Checklist:**
- [ ] All E2E tests pass locally
- [ ] Tests run in CI/CD
- [ ] Test coverage >80% for monetization code
- [ ] Edge cases covered (multiple users, concurrent actions)

**PR Requirements:**
- [ ] E2E tests implemented
- [ ] Tests pass locally and in CI
- [ ] Coverage report included

---

### 10.2 Security Audit
**Branch**: `feature/monetization-security-audit`

**Tasks:**
- [ ] Run security audit checklist:
  - [ ] ✅ Stripe webhook signature verification implemented
  - [ ] ✅ No Stripe secret keys in client code
  - [ ] ✅ All payment APIs have authentication
  - [ ] ✅ Input validation on all payment endpoints (Zod)
  - [ ] ✅ Rate limiting on checkout creation (5 req/min)
  - [ ] ✅ SQL injection prevention (parameterized queries)
  - [ ] ✅ XSS prevention (sanitize all user input)
  - [ ] ✅ CSRF protection (Next.js built-in)
  - [ ] ✅ No sensitive data in error responses
  - [ ] ✅ Secure session management
- [ ] Review RLS policies:
  - [ ] Users can only access their own subscription data
  - [ ] Subscription events are read-only for users
  - [ ] Admin functions require admin role
- [ ] Test for vulnerabilities:
  - [ ] Try to access other user's subscription data
  - [ ] Try to bypass feature limits with API manipulation
  - [ ] Try to trigger webhooks without valid signature
  - [ ] Try to create checkout session without authentication
- [ ] Document security measures:
  - [ ] Create `docs/security/MONETIZATION_SECURITY.md`
  - [ ] List all security measures implemented
  - [ ] Explain threat model
  - [ ] Document incident response plan

**Security Testing Checklist:**
- [ ] Test webhook signature verification (reject invalid)
- [ ] Test API authentication (reject unauthenticated)
- [ ] Test feature limit bypass attempts (reject)
- [ ] Test SQL injection attempts (reject/sanitize)
- [ ] Test XSS attempts (sanitize output)
- [ ] Test rate limiting (block excessive requests)
- [ ] Test RLS policies (users can't see others' data)

**PR Requirements:**
- [ ] Security checklist completed
- [ ] Vulnerabilities tested and mitigated
- [ ] Documentation created
- [ ] No security issues found

---

## Phase 11: Production Deployment Preparation

### 11.1 Stripe Production Configuration
**Manual tasks - NO CODE CHANGES**

**Tasks:**
- [ ] Switch Stripe account from Test Mode to Production Mode
- [ ] Create production products:
  - [ ] Rowan Pro (monthly: $11.99, annual: $119)
  - [ ] Rowan Family (monthly: $17.99, annual: $179)
  - [ ] Copy production price IDs
- [ ] Update Vercel environment variables:
  - [ ] `STRIPE_SECRET_KEY` (production key)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (production key)
  - [ ] `STRIPE_PRO_MONTHLY_PRICE_ID` (production)
  - [ ] `STRIPE_PRO_ANNUAL_PRICE_ID` (production)
  - [ ] `STRIPE_FAMILY_MONTHLY_PRICE_ID` (production)
  - [ ] `STRIPE_FAMILY_ANNUAL_PRICE_ID` (production)
  - [ ] `STRIPE_WEBHOOK_SECRET` (production webhook secret)
- [ ] Configure production webhook endpoint:
  - [ ] URL: `https://rowan.app/api/webhooks/stripe`
  - [ ] Listen to same events as test mode
  - [ ] Copy webhook secret to Vercel
- [ ] Test webhook delivery:
  - [ ] Trigger test event from Stripe dashboard
  - [ ] Verify webhook received and processed
  - [ ] Check logs for any errors

**Checklist:**
- [ ] Production Stripe account ready
- [ ] Products and prices created
- [ ] Vercel env vars updated
- [ ] Webhook endpoint configured
- [ ] Test webhook successful

---

### 11.2 Feature Flag & Rollout Strategy
**Branch**: `feature/monetization-feature-flags`

**Tasks:**
- [ ] Create feature flag system:
  - [ ] Add `ENABLE_MONETIZATION` env var (default: false)
  - [ ] Wrap all monetization features with flag check
  - [ ] Show/hide pricing page based on flag
  - [ ] Show/hide upgrade prompts based on flag
  - [ ] Show/hide subscription management based on flag
- [ ] Create gradual rollout plan:
  - [ ] Stage 1: Enable for admin users only (testing)
  - [ ] Stage 2: Enable for beta users (beta testing)
  - [ ] Stage 3: Enable for all users (full launch)
- [ ] Add admin toggle for feature flag:
  - [ ] Admin can enable/disable monetization without redeploy
  - [ ] Store flag state in database (not just env var)
- [ ] Create rollback plan:
  - [ ] Disable feature flag to hide all monetization
  - [ ] Keep existing subscriptions active
  - [ ] Document rollback procedure

**Testing Checklist:**
- [ ] Test with flag disabled (no monetization visible)
- [ ] Test with flag enabled for admin only
- [ ] Test with flag enabled for beta users
- [ ] Test with flag enabled for all users
- [ ] Test rollback (disable flag)

**PR Requirements:**
- [ ] Feature flag system implemented
- [ ] Rollout plan documented
- [ ] Rollback procedure tested

---

### 11.3 Pre-Launch Checklist
**Documentation - NO CODE CHANGES**

**Final Verification:**
- [ ] Database migrations applied to production
- [ ] Stripe production keys configured
- [ ] Webhook endpoint working in production
- [ ] Feature flag system ready
- [ ] Analytics dashboard accessible to admins
- [ ] Email templates configured (welcome, cancellation)
- [ ] Error monitoring set up (Sentry/Vercel)
- [ ] All E2E tests passing
- [ ] Security audit completed
- [ ] Performance testing done (Lighthouse score >90)
- [ ] Mobile experience verified (iOS, Android)
- [ ] Accessibility testing done (WCAG 2.1 AA)
- [ ] Dark mode tested across all new pages
- [ ] Documentation up to date

**Legal & Compliance:**
- [ ] Terms of Service updated (subscription terms)
- [ ] Privacy Policy updated (payment data handling)
- [ ] Refund policy documented
- [ ] Cancellation policy documented
- [ ] GDPR compliance verified (for EU users)
- [ ] Payment processor disclosed (Stripe)

**Support Preparation:**
- [ ] Create support articles:
  - [ ] "How to upgrade to Pro/Family"
  - [ ] "How to cancel my subscription"
  - [ ] "How to change my plan"
  - [ ] "What happens to my data if I cancel?"
  - [ ] "How do I get a refund?"
  - [ ] "What payment methods do you accept?"
- [ ] Update FAQ page with monetization questions
- [ ] Prepare support email templates

**Launch Day Checklist:**
- [ ] Monitor server resources (ensure capacity)
- [ ] Monitor Stripe dashboard (watch for payments)
- [ ] Monitor error logs (watch for issues)
- [ ] Monitor analytics (track conversions)
- [ ] Have rollback plan ready (feature flag disable)
- [ ] Customer support ready (respond to questions)
- [ ] Social media announcement prepared
- [ ] Email announcement to beta users prepared

---

## Phase 12: Post-Launch Monitoring & Iteration

### 12.1 First Week Monitoring
**Tasks:**
- [ ] Daily check of key metrics:
  - [ ] New signups (free tier)
  - [ ] Free → Pro conversions
  - [ ] Free → Family conversions
  - [ ] Failed payments
  - [ ] Webhook errors
  - [ ] Checkout errors
  - [ ] User feedback (support emails)
- [ ] Monitor for issues:
  - [ ] Payment failures (investigate cause)
  - [ ] Feature access bugs (users complaining)
  - [ ] Performance issues (slow checkout)
  - [ ] Email delivery failures
- [ ] Track user behavior:
  - [ ] Which upgrade triggers work best?
  - [ ] Where do users drop off in checkout?
  - [ ] Which features drive upgrades?
  - [ ] What's the average time to conversion?
- [ ] Collect user feedback:
  - [ ] Survey new Pro/Family users (onboarding experience)
  - [ ] Monitor support emails for issues
  - [ ] Track feature requests from paying users

**Daily Report Template:**
```
Date: [date]

Signups:
- Free tier: X new users
- Pro upgrades: Y users
- Family upgrades: Z users

Revenue:
- MRR: $X,XXX
- New MRR: $XXX

Issues:
- Failed payments: X
- Webhook errors: Y
- Support tickets: Z

Actions:
- [Action items based on data]
```

---

### 12.2 Optimization Iterations
**Ongoing - Multiple Branches**

**Week 1-2: Pricing Page Optimization**
- [ ] A/B test headline variations
- [ ] Test different annual discount messaging (17% vs "Save $26")
- [ ] Test badge placement ("Popular" on Pro vs Family)
- [ ] Analyze scroll depth and bounce rate
- [ ] Optimize for mobile (test on real devices)

**Week 3-4: Upgrade Modal Optimization**
- [ ] A/B test modal copy variations
- [ ] Test different trigger timing (immediate vs delayed)
- [ ] Test feature benefit ordering
- [ ] Measure modal conversion rate by trigger source
- [ ] Reduce dismissal rate

**Month 2: Feature Allocation Review**
- [ ] Analyze which features drive upgrades
- [ ] Consider adjusting free tier limits (looser or tighter?)
- [ ] Evaluate Pro vs Family tier value perception
- [ ] Survey churned users (why did they cancel?)
- [ ] Adjust feature gating based on data

**Month 3: Checkout Flow Optimization**
- [ ] Analyze checkout abandonment points
- [ ] Test embedded vs redirect checkout (if needed)
- [ ] Optimize for mobile checkout experience
- [ ] Test different payment button copy
- [ ] Reduce friction in payment flow

**Ongoing: Conversion Rate Optimization**
- [ ] Track conversion funnel at each step
- [ ] Identify drop-off points
- [ ] Implement improvements iteratively
- [ ] Target: 5%+ free → Pro conversion rate
- [ ] Target: <5% monthly churn rate

---

## Implementation Timeline Estimate

**Phase 1-2: Foundation (Week 1-2)**
- Database schema & types
- Stripe integration basics
- API routes

**Phase 3: Service Layer (Week 2-3)**
- Subscription service
- Usage tracking
- Feature access checks

**Phase 4-5: Frontend (Week 3-5)**
- Pricing page
- Upgrade modals
- Stripe checkout integration

**Phase 6: Feature Gating (Week 5-6)**
- Task limits
- Calendar restrictions
- Feature page blocks
- Usage limits

**Phase 7: Webhooks (Week 6-7)**
- Webhook handlers
- Payment success flow
- Email notifications

**Phase 8: Account Management (Week 7-8)**
- Subscription management page
- Plan change flow
- Billing history

**Phase 9: Analytics (Week 8)**
- Conversion dashboard
- Error monitoring
- Logging

**Phase 10: Testing (Week 8-9)**
- E2E tests
- Security audit
- QA

**Phase 11: Production Prep (Week 9-10)**
- Stripe production setup
- Feature flags
- Pre-launch checklist

**Phase 12: Launch & Iterate (Ongoing)**
- Monitor metrics
- Optimize conversions
- Iterate based on data

**Total Estimated Timeline: 8-10 weeks for full implementation**

---

## Rollback Procedures

### Emergency Rollback (If Something Goes Wrong)

**Option 1: Disable Feature Flag**
- [ ] Set `ENABLE_MONETIZATION=false` in Vercel
- [ ] Redeploy (takes ~2 minutes)
- [ ] All monetization features hidden instantly
- [ ] Existing subscriptions remain active
- [ ] No data loss

**Option 2: Revert Database Migration**
- [ ] Run rollback script: `supabase/migrations/ROLLBACK_subscriptions.sql`
- [ ] This removes subscription tables/columns
- [ ] Only do if absolutely necessary
- [ ] Backup database first!

**Option 3: Revert to Previous Git Commit**
- [ ] `git revert <commit-hash>`
- [ ] Push to main
- [ ] GitHub Actions deploys previous version
- [ ] Takes ~5 minutes
- [ ] All changes reverted

**When to Rollback:**
- Multiple payment failures (>10% failure rate)
- Critical security vulnerability discovered
- Database corruption issues
- Widespread user complaints
- Feature access bugs affecting many users

**Rollback Communication:**
- [ ] Post status update (if status page exists)
- [ ] Email affected users (if any charges need refunding)
- [ ] Update support team
- [ ] Document root cause for post-mortem

---

## Success Criteria

**Launch Success Metrics (First Month):**
- [ ] ✅ Zero critical bugs reported
- [ ] ✅ Payment success rate >95%
- [ ] ✅ Checkout completion rate >60%
- [ ] ✅ Free → Pro conversion rate >2%
- [ ] ✅ MRR >$1,000 in first month
- [ ] ✅ Customer satisfaction >90% (survey)
- [ ] ✅ No security incidents
- [ ] ✅ No data loss incidents
- [ ] ✅ Webhook delivery success rate >99%
- [ ] ✅ Average response time <2 seconds

**Long-Term Success Metrics (Year 1):**
- [ ] ✅ $240k-504k ARR (probability-weighted: $334k)
- [ ] ✅ 1,300-2,100 paying customers
- [ ] ✅ Free → Pro conversion rate 3-5%
- [ ] ✅ Monthly churn rate <5%
- [ ] ✅ LTV:CAC ratio >3:1
- [ ] ✅ Net Promoter Score >50
- [ ] ✅ Infrastructure costs <3% of revenue

---

## Notes & Reminders

**Development Principles:**
- ✅ Safety first: Test everything locally before deploying
- ✅ Strategic: Feature branches, PR reviews, gradual rollout
- ✅ Secure: Input validation, webhook verification, rate limiting
- ✅ Elegant: Non-aggressive UX, enticing language, professional polish
- ✅ Rollback-ready: Feature flags, migration rollbacks, git revert

**Communication Tone:**
- ❌ "You can't access this feature"
- ✅ "Unlock this feature with Pro"
- ❌ "Upgrade now or lose access"
- ✅ "Continue enjoying all features with Pro"
- ❌ "Limited time offer!"
- ✅ "Join thousands of organized families"

**Stripe Best Practices:**
- Always verify webhook signatures
- Use test mode extensively before production
- Handle all webhook events gracefully
- Return 200 OK even on errors (prevents retries)
- Log everything for debugging
- Test with Stripe CLI locally

**Security Reminders:**
- Never commit Stripe keys to git
- Always validate and sanitize input
- Use RLS policies for database access
- Rate limit all payment endpoints
- Verify webhook signatures
- No sensitive data in logs/errors

---

**Document End**

*Created: December 2, 2024*
*Ready for implementation - let's build this! 🚀*
