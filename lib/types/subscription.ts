/**
 * Subscription & Monetization Type Definitions
 * Created: 2024-12-02
 *
 * Type definitions for subscription management, usage tracking,
 * and feature access control.
 */

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

/**
 * Subscription tier levels
 */
export type SubscriptionTier = 'free' | 'pro' | 'family';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'paused';

/**
 * Billing period
 */
export type SubscriptionPeriod = 'monthly' | 'annual';

/**
 * Complete subscription record
 */
export interface Subscription {
  id: string;
  user_id: string;

  // Subscription details
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  period: SubscriptionPeriod;

  // Polar integration
  polar_customer_id: string | null;
  polar_subscription_id: string | null;

  // Founding member program (first 1000 paid subscribers)
  is_founding_member: boolean;
  founding_member_number: number | null;
  founding_member_locked_price_id: string | null;

  // Trial
  trial_started_at: string | null;
  trial_ends_at: string | null;

  // Timestamps
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUBSCRIPTION EVENTS (Analytics)
// ============================================================================

/**
 * Types of subscription events
 */
export type SubscriptionEventType =
  | 'upgrade'
  | 'downgrade'
  | 'cancel'
  | 'reactivate'
  | 'payment_failed'
  | 'payment_succeeded';

/**
 * Sources that trigger upgrades (for conversion tracking)
 */
export type TriggerSource =
  | 'task_limit'
  | 'calendar_blocked'
  | 'meal_planning_blocked'
  | 'reminders_blocked'
  | 'goals_blocked'
  | 'household_blocked'
  | 'photo_upload_blocked'
  | 'message_limit'
  | 'quick_action_limit'
  | 'pricing_page'
  | 'upgrade_modal'
  | 'navigation_menu'
  | 'dashboard_banner'
  | 'admin_action'
  | 'other';

/**
 * Subscription event record
 */
export interface SubscriptionEvent {
  id: string;
  user_id: string;

  // Event details
  event_type: SubscriptionEventType;
  from_tier: SubscriptionTier | null;
  to_tier: SubscriptionTier | null;
  trigger_source: TriggerSource | null;

  // Additional context
  metadata: Record<string, string | number | boolean | null>;

  // Timestamp
  created_at: string;
}

// ============================================================================
// USAGE TRACKING (Rate Limiting)
// ============================================================================

/**
 * Types of usage that can be tracked/limited
 */
export type UsageType =
  | 'tasks_created'
  | 'messages_sent'
  | 'quick_actions_used'
  | 'shopping_list_updates';

/**
 * Daily usage record
 */
export interface DailyUsage {
  id: string;
  user_id: string;
  date: string; // ISO date string

  // Usage counters
  tasks_created: number;
  messages_sent: number;
  quick_actions_used: number;
  shopping_list_updates: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FEATURE LIMITS
// ============================================================================

/**
 * Feature limits for each tier
 */
export interface FeatureLimits {
  // Task limits
  maxActiveTasks: number; // Infinity for unlimited
  dailyTaskCreation: number;

  // Calendar
  canCreateCalendar: boolean;

  // Shopping lists
  maxShoppingLists: number;
  maxShoppingItems: number;
  dailyShoppingUpdates: number;

  // Messages
  messageHistoryDays: number; // Infinity for unlimited
  dailyMessages: number;

  // Quick actions
  dailyQuickActions: number;

  // Features
  canUploadPhotos: boolean;
  canUseMealPlanning: boolean;
  canUseReminders: boolean;
  canUseGoals: boolean;
  canUseHousehold: boolean;
  canUseLocation: boolean;
  canUseAI: boolean;
  canUseIntegrations: boolean;
  canUseEventProposals: boolean;

  // Real-time
  realtimeSyncDelay: number; // milliseconds (0 = instant)

  // Users & Spaces
  maxUsers: number;
  maxSpaces: number;

  // Storage
  storageGB?: number;
}

/**
 * Map of tier to feature limits
 */
export type FeatureLimitsMap = {
  [K in SubscriptionTier]: FeatureLimits;
};

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Response from subscription status API
 */
export interface SubscriptionStatusResponse {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  usage: DailyUsage | null;
  limits: FeatureLimits;
}

/**
 * Request to create checkout session
 */
export interface CreateCheckoutSessionRequest {
  tier: Exclude<SubscriptionTier, 'free'>; // 'pro' | 'family'
  period: SubscriptionPeriod;
}

/**
 * Response from create checkout session
 */
export interface CreateCheckoutSessionResponse {
  url: string;
  checkoutId: string;
}

/**
 * Request to cancel subscription
 */
export interface CancelSubscriptionRequest {
  reason?: string;
}

/**
 * Response from cancel subscription
 */
export interface CancelSubscriptionResponse {
  success: boolean;
  subscription: Subscription;
  message: string;
}

/**
 * Request to change subscription plan
 */
export interface ChangePlanRequest {
  newTier: Exclude<SubscriptionTier, 'free'>;
  newPeriod: SubscriptionPeriod;
}

/**
 * Response from change plan
 */
export interface ChangePlanResponse {
  success: boolean;
  subscription: Subscription;
  proration: {
    credit: number;
    charge: number;
    nextBillingDate: string;
  } | null;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Check if a feature is available for a tier
 */
export type FeatureAvailability = {
  available: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
};

/**
 * Usage check result
 */
export type UsageCheckResult = {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
};
