/**
 * Middleware Barrel Export
 * Central export point for all API middleware functions
 */

// Subscription tier checking
export {
  withSubscriptionCheck,
  checkSubscriptionTier,
  getFeatureKey,
  type RouteHandler as SubscriptionRouteHandler,
  type FeatureAccessKey,
} from './subscription-check';

// Usage limits checking
export {
  withUsageCheck,
  checkUsageLimit,
  trackUsage,
  type RouteHandler as UsageRouteHandler,
} from './usage-check';

// Combined feature gating (subscription + usage)
export {
  withFeatureGating,
} from './feature-gating';

// Re-export the shared RouteHandler type
import type { RouteHandler as SubscriptionHandler } from './subscription-check';
export type RouteHandler = SubscriptionHandler;
