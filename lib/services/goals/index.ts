/**
 * Goals Service — Barrel re-exports for all goal sub-services.
 *
 * Import from '@/lib/services/goals' to access all goal-related
 * types, services, and utilities.
 *
 * @module goals
 */

// Types
export * from './types';

// Sub-services
export { goalService } from './goal-service';
export { milestoneService } from './milestone-service';
export { checkinService } from './checkin-service';
export { activityService } from './activity-service';
