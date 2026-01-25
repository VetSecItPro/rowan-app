// Phase 14: Chore Rewards Services
// Export all rewards-related services

export { pointsService } from './points-service';
export { rewardsService } from './rewards-service';

// Late penalty types and client-safe utilities only
// NOTE: Server-side penalty functions must be imported directly from
// '@/lib/services/rewards/late-penalty-service' in API routes
export type {
  LatePenalty,
  LatePenaltySettings,
  PenaltyCalculation,
  ApplyPenaltyResult,
} from './late-penalty-service';
