import { describe, it, expect } from 'vitest';

describe('rewards barrel exports', () => {
  it('re-exports pointsService', async () => {
    const mod = await import('@/lib/services/rewards');
    expect(mod.pointsService).toBeDefined();
  });

  it('re-exports rewardsService', async () => {
    const mod = await import('@/lib/services/rewards');
    expect(mod.rewardsService).toBeDefined();
  });
});
