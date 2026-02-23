import { describe, it, expect } from 'vitest';

describe('goals barrel exports', () => {
  it('re-exports goalService', async () => {
    const mod = await import('@/lib/services/goals');
    expect(mod.goalService).toBeDefined();
  });

  it('re-exports milestoneService', async () => {
    const mod = await import('@/lib/services/goals');
    expect(mod.milestoneService).toBeDefined();
  });

  it('re-exports checkinService', async () => {
    const mod = await import('@/lib/services/goals');
    expect(mod.checkinService).toBeDefined();
  });

  it('re-exports activityService', async () => {
    const mod = await import('@/lib/services/goals');
    expect(mod.activityService).toBeDefined();
  });
});
