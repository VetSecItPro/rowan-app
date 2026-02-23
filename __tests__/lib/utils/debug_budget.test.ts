import { describe, it } from 'vitest';

const SPACE_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('debug budget schema', () => {
  it('schema parse test', async () => {
    const { createBudgetSchema } = await import('@/lib/validations/budget-schemas');
    try {
      const result = createBudgetSchema.parse({ space_id: SPACE_ID, monthly_budget: 3000 });
      console.log('Valid:', JSON.stringify(result));
    } catch(e: unknown) {
      const err = e as { issues?: unknown; message?: string };
      console.log('Schema Error:', JSON.stringify(err.issues || err.message));
    }
  });
});
