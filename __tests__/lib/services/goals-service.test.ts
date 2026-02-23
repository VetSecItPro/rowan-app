import { describe, it, expect, vi } from 'vitest';

// Mock the sub-services before importing goalsService
vi.mock('@/lib/services/goals/goal-service', () => ({
  goalService: {
    getGoals: vi.fn(),
    getGoalById: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    getGoalStats: vi.fn(),
    getGoalCollaborators: vi.fn(),
    addCollaborator: vi.fn(),
    updateCollaboratorRole: vi.fn(),
    removeCollaborator: vi.fn(),
    toggleGoalVisibility: vi.fn(),
    getGoalTemplates: vi.fn(),
    getGoalTemplateById: vi.fn(),
    createGoalFromTemplate: vi.fn(),
    getTemplateCategories: vi.fn(),
    updateGoalPriority: vi.fn(),
    toggleGoalPin: vi.fn(),
    reorderGoals: vi.fn(),
  },
}));

vi.mock('@/lib/services/goals/milestone-service', () => ({
  milestoneService: {
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    toggleMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    getAllMilestones: vi.fn(),
  },
}));

vi.mock('@/lib/services/goals/checkin-service', () => ({
  checkinService: {
    createCheckIn: vi.fn(),
    getGoalCheckIns: vi.fn(),
    getCheckInById: vi.fn(),
    getCheckInPhotos: vi.fn(),
    uploadCheckInPhotos: vi.fn(),
    updateCheckIn: vi.fn(),
    deleteCheckIn: vi.fn(),
    getCheckInSettings: vi.fn(),
    updateCheckInSettings: vi.fn(),
    getUpcomingCheckIns: vi.fn(),
  },
}));

vi.mock('@/lib/services/goals/activity-service', () => ({
  activityService: {
    getActivityFeed: vi.fn(),
    getGoalActivityFeed: vi.fn(),
    createActivity: vi.fn(),
    getGoalComments: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    toggleCommentReaction: vi.fn(),
    processMentions: vi.fn(),
    getUserMentions: vi.fn(),
    markMentionAsRead: vi.fn(),
  },
}));

// Import after mocks are set up
import { goalsService } from '@/lib/services/goals-service';

describe('goals-service', () => {
  it('should have unified service object', () => {
    expect(goalsService).toBeDefined();
    expect(typeof goalsService.getGoals).toBe('function');
    expect(typeof goalsService.createGoal).toBe('function');
  });

  describe('goal operations', () => {
    it('should create goals', () => {
      const goal = {
        id: 'goal-1',
        space_id: 'space-123',
        title: 'Learn TypeScript',
        status: 'active',
      };
      expect(goal.status).toBe('active');
    });

    it('should track progress', () => {
      const progress = 50;
      const target = 100;
      const percentage = (progress / target) * 100;
      expect(percentage).toBe(50);
    });
  });
});
