import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { remindersBulkService } from '@/lib/services/reminders-bulk-service';
import { createClient } from '@/lib/supabase/client';

function chain(resolved: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'single'].forEach(m => {
    c[m] = vi.fn(handler);
  });
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('remindersBulkService - empty input shortcuts', () => {
  it('completeReminders returns success for empty list', async () => {
    const r = await remindersBulkService.completeReminders([]);
    expect(r).toEqual({ success: true, successCount: 0, failedCount: 0, errors: [] });
  });

  it('deleteReminders returns success for empty list', async () => {
    const r = await remindersBulkService.deleteReminders([]);
    expect(r.success).toBe(true);
  });

  it('reassignReminders returns success for empty list', async () => {
    const r = await remindersBulkService.reassignReminders([], 'u1');
    expect(r.success).toBe(true);
  });

  it('changePriority returns success for empty list', async () => {
    const r = await remindersBulkService.changePriority([], 'high');
    expect(r.success).toBe(true);
  });

  it('changeCategory returns success for empty list', async () => {
    const r = await remindersBulkService.changeCategory([], 'bills');
    expect(r.success).toBe(true);
  });
});

describe('remindersBulkService - happy path', () => {
  it('completeReminders updates all when DB returns matching IDs', async () => {
    const c = chain({ data: [{ id: 'r1' }, { id: 'r2' }], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    const r = await remindersBulkService.completeReminders(['r1', 'r2']);
    expect(r).toEqual({ success: true, successCount: 2, failedCount: 0, errors: [] });
  });

  it('deleteReminders reports partial failure when some IDs missing', async () => {
    const c = chain({ data: [{ id: 'r1' }], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    const r = await remindersBulkService.deleteReminders(['r1', 'r2', 'r3']);
    expect(r.success).toBe(false);
    expect(r.successCount).toBe(1);
    expect(r.failedCount).toBe(2);
    expect(r.errors[0]).toMatch(/r2.*r3|r3.*r2/);
  });

  it('reassignReminders supports null assignee (unassign)', async () => {
    const c = chain({ data: [{ id: 'r1' }], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    const r = await remindersBulkService.reassignReminders(['r1'], null);
    expect(r.success).toBe(true);
  });

  it('changePriority returns failure when DB errors', async () => {
    const c = chain({ data: null, error: { message: 'permission denied' } });
    vi.mocked(createClient).mockReturnValue(c as never);

    const r = await remindersBulkService.changePriority(['r1'], 'urgent');
    expect(r.success).toBe(false);
    expect(r.failedCount).toBe(1);
    expect(r.errors[0]).toMatch(/permission denied/);
  });

  it('changeCategory updates with new category', async () => {
    const c = chain({ data: [{ id: 'r1' }, { id: 'r2' }], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    const r = await remindersBulkService.changeCategory(['r1', 'r2'], 'health');
    expect(r.successCount).toBe(2);
  });
});

describe('remindersBulkService - export helpers', () => {
  const sample = [
    {
      id: 'r1',
      title: 'Take "meds"',
      description: 'with food',
      category: 'health',
      priority: 'high',
      status: 'open',
      reminder_time: '2025-01-01T09:00:00Z',
      assignee: { name: 'Alice' },
      created_at: '2024-12-30T00:00:00Z',
    },
  ] as never;

  it('exportToJSON returns valid JSON of input', () => {
    const json = remindersBulkService.exportToJSON(sample);
    const parsed = JSON.parse(json);
    expect(parsed[0].id).toBe('r1');
  });

  it('exportToCSV returns empty string for empty input', () => {
    expect(remindersBulkService.exportToCSV([])).toBe('');
  });

  it('exportToCSV escapes embedded double quotes', () => {
    const csv = remindersBulkService.exportToCSV(sample);
    // The "meds" double-quotes should become ""meds""
    expect(csv).toContain('""meds""');
    // Header row present
    expect(csv.split('\n')[0]).toContain('Title');
  });
});
