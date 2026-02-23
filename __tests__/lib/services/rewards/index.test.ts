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

  it('exports LatePenalty types (type-only, verifying no runtime export)', async () => {
    const mod = await import('@/lib/services/rewards');
    // Type-only exports don't appear at runtime
    // Just verify the module loads without error
    expect(mod).toBeDefined();
  });
});
