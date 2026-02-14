/**
 * Goals Service — Backwards-compatible facade.
 *
 * This file re-exports all types and composes a unified `goalsService` object
 * from the split sub-services. Existing imports from '@/lib/services/goals-service'
 * continue to work without changes.
 *
 * The actual implementations live in:
 *   - lib/services/goals/goal-service.ts      — Core goal CRUD, collaboration, templates, priority
 *   - lib/services/goals/milestone-service.ts  — Milestone CRUD
 *   - lib/services/goals/checkin-service.ts     — Check-in CRUD, settings, photos
 *   - lib/services/goals/activity-service.ts    — Activity feed, comments, reactions, mentions
 *   - lib/services/goals/types.ts               — Shared interfaces and type aliases
 *
 * @module goalsService
 */

// Re-export all types for backwards compatibility
export type {
  Milestone,
  GoalCollaborator,
  MilestoneTemplate,
  GoalDependency,
  GoalTemplate,
  Goal,
  CreateGoalInput,
  AddCollaboratorInput,
  CreateMilestoneInput,
  GoalStats,
  GoalCheckIn,
  GoalCheckInPhoto,
  CreateCheckInSettingsInput,
  UpdateCheckInSettingsInput,
  GoalCheckInSettings,
  CreateCheckInInput,
  GoalActivity,
  GoalComment,
  GoalCommentReaction,
  GoalMention,
  CreateCommentInput,
  CreateActivityInput,
} from './goals/types';

// Import sub-services to compose the unified goalsService object
import { goalService } from './goals/goal-service';
import { milestoneService } from './goals/milestone-service';
import { checkinService } from './goals/checkin-service';
import { activityService } from './goals/activity-service';

/**
 * Unified goals service object — combines all sub-services into a single
 * backwards-compatible API surface. All method signatures are preserved.
 */
export const goalsService = {
  // Goal CRUD (goal-service.ts)
  getGoals: goalService.getGoals.bind(goalService),
  getGoalById: goalService.getGoalById.bind(goalService),
  createGoal: goalService.createGoal.bind(goalService),
  updateGoal: goalService.updateGoal.bind(goalService),
  deleteGoal: goalService.deleteGoal.bind(goalService),

  // Collaboration (goal-service.ts)
  getGoalCollaborators: goalService.getGoalCollaborators.bind(goalService),
  addCollaborator: goalService.addCollaborator.bind(goalService),
  updateCollaboratorRole: goalService.updateCollaboratorRole.bind(goalService),
  removeCollaborator: goalService.removeCollaborator.bind(goalService),
  toggleGoalVisibility: goalService.toggleGoalVisibility.bind(goalService),

  // Templates (goal-service.ts)
  getGoalTemplates: goalService.getGoalTemplates.bind(goalService),
  getGoalTemplateById: goalService.getGoalTemplateById.bind(goalService),
  createGoalFromTemplate: goalService.createGoalFromTemplate.bind(goalService),
  getTemplateCategories: goalService.getTemplateCategories.bind(goalService),

  // Priority & ordering (goal-service.ts)
  updateGoalPriority: goalService.updateGoalPriority.bind(goalService),
  toggleGoalPin: goalService.toggleGoalPin.bind(goalService),
  reorderGoals: goalService.reorderGoals.bind(goalService),

  // Stats (goal-service.ts)
  getGoalStats: goalService.getGoalStats.bind(goalService),

  // Milestones (milestone-service.ts)
  createMilestone: milestoneService.createMilestone.bind(milestoneService),
  updateMilestone: milestoneService.updateMilestone.bind(milestoneService),
  toggleMilestone: milestoneService.toggleMilestone.bind(milestoneService),
  deleteMilestone: milestoneService.deleteMilestone.bind(milestoneService),
  getAllMilestones: milestoneService.getAllMilestones.bind(milestoneService),

  // Check-ins (checkin-service.ts)
  createCheckIn: checkinService.createCheckIn.bind(checkinService),
  getGoalCheckIns: checkinService.getGoalCheckIns.bind(checkinService),
  getCheckInById: checkinService.getCheckInById.bind(checkinService),
  getCheckInPhotos: checkinService.getCheckInPhotos.bind(checkinService),
  uploadCheckInPhotos: checkinService.uploadCheckInPhotos.bind(checkinService),
  updateCheckIn: checkinService.updateCheckIn.bind(checkinService),
  deleteCheckIn: checkinService.deleteCheckIn.bind(checkinService),
  getCheckInSettings: checkinService.getCheckInSettings.bind(checkinService),
  updateCheckInSettings: checkinService.updateCheckInSettings.bind(checkinService),
  getUpcomingCheckIns: checkinService.getUpcomingCheckIns.bind(checkinService),

  // Activity feed (activity-service.ts)
  getActivityFeed: activityService.getActivityFeed.bind(activityService),
  getGoalActivityFeed: activityService.getGoalActivityFeed.bind(activityService),
  createActivity: activityService.createActivity.bind(activityService),

  // Comments (activity-service.ts)
  getGoalComments: activityService.getGoalComments.bind(activityService),
  createComment: activityService.createComment.bind(activityService),
  updateComment: activityService.updateComment.bind(activityService),
  deleteComment: activityService.deleteComment.bind(activityService),
  toggleCommentReaction: activityService.toggleCommentReaction.bind(activityService),

  // Mentions (activity-service.ts)
  processMentions: activityService.processMentions.bind(activityService),
  getUserMentions: activityService.getUserMentions.bind(activityService),
  markMentionAsRead: activityService.markMentionAsRead.bind(activityService),
};

/** Convenience alias for goalService.createGoal. */
export const createGoal = goalService.createGoal.bind(goalService);
/** Convenience alias for goalService.updateGoal. */
export const updateGoal = goalService.updateGoal.bind(goalService);
/** Convenience alias for milestoneService.createMilestone. */
export const createMilestone = milestoneService.createMilestone.bind(milestoneService);
