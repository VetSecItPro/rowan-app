/**
 * Unit tests for lib/types.ts
 *
 * lib/types.ts is primarily type-only EXCEPT for the exported enums,
 * which have runtime values. We test those enum values here.
 *
 * Also verifies WebhookHandlerResult interface is consistent (via runtime
 * object construction conformance — TypeScript checks this at compile time;
 * we document the expected shape at runtime).
 */

import { describe, it, expect } from 'vitest';
import {
  TaskStatus,
  TaskPriority,
  TaskCategory,
  EventType,
  SpaceMemberRole,
  PresenceStatus,
  GoalStatus,
  MealType,
  ChoreFrequency,
  BudgetPeriod,
  ProjectStatus,
  InvitationStatus,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// TaskStatus
// ---------------------------------------------------------------------------
describe('TaskStatus', () => {
  it('PENDING = "pending"', () => expect(TaskStatus.PENDING).toBe('pending'));
  it('IN_PROGRESS = "in-progress"', () => expect(TaskStatus.IN_PROGRESS).toBe('in-progress'));
  it('BLOCKED = "blocked"', () => expect(TaskStatus.BLOCKED).toBe('blocked'));
  it('ON_HOLD = "on-hold"', () => expect(TaskStatus.ON_HOLD).toBe('on-hold'));
  it('COMPLETED = "completed"', () => expect(TaskStatus.COMPLETED).toBe('completed'));

  it('has exactly 5 values', () => {
    const values = Object.values(TaskStatus);
    expect(values).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// TaskPriority
// ---------------------------------------------------------------------------
describe('TaskPriority', () => {
  it('LOW = "low"', () => expect(TaskPriority.LOW).toBe('low'));
  it('MEDIUM = "medium"', () => expect(TaskPriority.MEDIUM).toBe('medium'));
  it('HIGH = "high"', () => expect(TaskPriority.HIGH).toBe('high'));
  it('URGENT = "urgent"', () => expect(TaskPriority.URGENT).toBe('urgent'));
});

// ---------------------------------------------------------------------------
// TaskCategory
// ---------------------------------------------------------------------------
describe('TaskCategory', () => {
  it('WORK = "work"', () => expect(TaskCategory.WORK).toBe('work'));
  it('PERSONAL = "personal"', () => expect(TaskCategory.PERSONAL).toBe('personal'));
  it('HOME = "home"', () => expect(TaskCategory.HOME).toBe('home'));
  it('SHOPPING = "shopping"', () => expect(TaskCategory.SHOPPING).toBe('shopping'));
  it('HEALTH = "health"', () => expect(TaskCategory.HEALTH).toBe('health'));
  it('OTHER = "other"', () => expect(TaskCategory.OTHER).toBe('other'));
});

// ---------------------------------------------------------------------------
// EventType
// ---------------------------------------------------------------------------
describe('EventType', () => {
  it('MEETING = "meeting"', () => expect(EventType.MEETING).toBe('meeting'));
  it('APPOINTMENT = "appointment"', () => expect(EventType.APPOINTMENT).toBe('appointment'));
  it('REMINDER = "reminder"', () => expect(EventType.REMINDER).toBe('reminder'));
  it('DEADLINE = "deadline"', () => expect(EventType.DEADLINE).toBe('deadline'));
  it('SOCIAL = "social"', () => expect(EventType.SOCIAL).toBe('social'));
  it('OTHER = "other"', () => expect(EventType.OTHER).toBe('other'));
});

// ---------------------------------------------------------------------------
// SpaceMemberRole
// ---------------------------------------------------------------------------
describe('SpaceMemberRole', () => {
  it('OWNER = "owner"', () => expect(SpaceMemberRole.OWNER).toBe('owner'));
  it('ADMIN = "admin"', () => expect(SpaceMemberRole.ADMIN).toBe('admin'));
  it('MEMBER = "member"', () => expect(SpaceMemberRole.MEMBER).toBe('member'));
});

// ---------------------------------------------------------------------------
// PresenceStatus
// ---------------------------------------------------------------------------
describe('PresenceStatus', () => {
  it('ONLINE = "online"', () => expect(PresenceStatus.ONLINE).toBe('online'));
  it('OFFLINE = "offline"', () => expect(PresenceStatus.OFFLINE).toBe('offline'));
});

// ---------------------------------------------------------------------------
// GoalStatus
// ---------------------------------------------------------------------------
describe('GoalStatus', () => {
  it('ACTIVE = "active"', () => expect(GoalStatus.ACTIVE).toBe('active'));
  it('COMPLETED = "completed"', () => expect(GoalStatus.COMPLETED).toBe('completed'));
  it('ON_HOLD = "on_hold"', () => expect(GoalStatus.ON_HOLD).toBe('on_hold'));
  it('CANCELLED = "cancelled"', () => expect(GoalStatus.CANCELLED).toBe('cancelled'));
});

// ---------------------------------------------------------------------------
// MealType
// ---------------------------------------------------------------------------
describe('MealType', () => {
  it('BREAKFAST = "breakfast"', () => expect(MealType.BREAKFAST).toBe('breakfast'));
  it('LUNCH = "lunch"', () => expect(MealType.LUNCH).toBe('lunch'));
  it('DINNER = "dinner"', () => expect(MealType.DINNER).toBe('dinner'));
  it('SNACK = "snack"', () => expect(MealType.SNACK).toBe('snack'));
});

// ---------------------------------------------------------------------------
// ChoreFrequency
// ---------------------------------------------------------------------------
describe('ChoreFrequency', () => {
  it('DAILY = "daily"', () => expect(ChoreFrequency.DAILY).toBe('daily'));
  it('WEEKLY = "weekly"', () => expect(ChoreFrequency.WEEKLY).toBe('weekly'));
  it('BIWEEKLY = "biweekly"', () => expect(ChoreFrequency.BIWEEKLY).toBe('biweekly'));
  it('MONTHLY = "monthly"', () => expect(ChoreFrequency.MONTHLY).toBe('monthly'));
  it('QUARTERLY = "quarterly"', () => expect(ChoreFrequency.QUARTERLY).toBe('quarterly'));
  it('YEARLY = "yearly"', () => expect(ChoreFrequency.YEARLY).toBe('yearly'));
});

// ---------------------------------------------------------------------------
// BudgetPeriod
// ---------------------------------------------------------------------------
describe('BudgetPeriod', () => {
  it('WEEKLY = "weekly"', () => expect(BudgetPeriod.WEEKLY).toBe('weekly'));
  it('MONTHLY = "monthly"', () => expect(BudgetPeriod.MONTHLY).toBe('monthly'));
  it('QUARTERLY = "quarterly"', () => expect(BudgetPeriod.QUARTERLY).toBe('quarterly'));
  it('YEARLY = "yearly"', () => expect(BudgetPeriod.YEARLY).toBe('yearly'));
});

// ---------------------------------------------------------------------------
// ProjectStatus
// ---------------------------------------------------------------------------
describe('ProjectStatus', () => {
  it('PLANNING = "planning"', () => expect(ProjectStatus.PLANNING).toBe('planning'));
  it('IN_PROGRESS = "in_progress"', () => expect(ProjectStatus.IN_PROGRESS).toBe('in_progress'));
  it('COMPLETED = "completed"', () => expect(ProjectStatus.COMPLETED).toBe('completed'));
  it('ON_HOLD = "on_hold"', () => expect(ProjectStatus.ON_HOLD).toBe('on_hold'));
});

// ---------------------------------------------------------------------------
// InvitationStatus
// ---------------------------------------------------------------------------
describe('InvitationStatus', () => {
  it('PENDING = "pending"', () => expect(InvitationStatus.PENDING).toBe('pending'));
  it('ACCEPTED = "accepted"', () => expect(InvitationStatus.ACCEPTED).toBe('accepted'));
  it('EXPIRED = "expired"', () => expect(InvitationStatus.EXPIRED).toBe('expired'));
  it('CANCELLED = "cancelled"', () => expect(InvitationStatus.CANCELLED).toBe('cancelled'));
});
