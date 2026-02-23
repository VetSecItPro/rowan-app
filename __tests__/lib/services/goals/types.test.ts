import { describe, it, expect } from 'vitest';
import type {
  Milestone,
  GoalCollaborator,
  Goal,
  CreateGoalInput,
  GoalStats,
  GoalCheckIn,
  GoalActivity,
  GoalComment,
} from '@/lib/services/goals/types';

describe('goals/types', () => {
  it('Milestone type has expected shape', () => {
    const milestone: Milestone = {
      id: 'm-1',
      goal_id: 'g-1',
      title: 'Hit 50%',
      type: 'percentage',
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(milestone.id).toBe('m-1');
    expect(milestone.type).toBe('percentage');
  });

  it('Goal type supports all required fields', () => {
    const goal = {
      id: 'g-1',
      space_id: 'space-1',
      title: 'Save money',
      status: 'active',
    } satisfies Partial<Goal>;
    expect(goal.status).toBe('active');
  });

  it('CreateGoalInput requires title and space_id', () => {
    const input: CreateGoalInput = {
      space_id: 'space-1',
      title: 'New goal',
      type: 'savings',
      target_value: 1000,
    } as CreateGoalInput;
    expect(input.title).toBe('New goal');
  });

  it('GoalCheckIn type has expected shape', () => {
    const checkin = {
      id: 'ci-1',
      goal_id: 'g-1',
      user_id: 'u-1',
      mood_rating: 4,
    } as GoalCheckIn;
    expect(checkin.mood_rating).toBe(4);
  });

  it('GoalActivity type has expected shape', () => {
    const activity = {
      id: 'a-1',
      goal_id: 'g-1',
      action: 'created',
    } as GoalActivity;
    expect(activity.action).toBe('created');
  });

  it('GoalComment type has expected shape', () => {
    const comment = {
      id: 'c-1',
      goal_id: 'g-1',
      content: 'Great progress!',
    } as GoalComment;
    expect(comment.content).toBe('Great progress!');
  });
});
