import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { reminderTemplatesService } from '@/lib/services/reminder-templates-service';
import { createClient } from '@/lib/supabase/client';

function chain(resolved: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'or', 'order', 'limit', 'single', 'rpc'].forEach(m => {
    c[m] = vi.fn(handler);
  });
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

const baseTemplate = {
  id: 'tmpl-1',
  space_id: 'space-1',
  created_by: 'user-1',
  name: 'Doctor visit',
  description: 'Generic medical reminder',
  emoji: '🏥',
  category: 'health',
  priority: 'high',
  template_title: 'Visit Dr. [DOCTOR_NAME] for [REASON]',
  template_description: 'Bring [DOCUMENT] to your appointment with [DOCTOR_NAME]',
  reminder_type: 'time',
  default_time_offset_minutes: 60,
  default_location: 'Clinic',
  repeat_pattern: null,
  repeat_days: [],
  is_system_template: false,
  usage_count: 5,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reminderTemplatesService.applyTemplate', () => {
  it('replaces variables in title and description', () => {
    const result = reminderTemplatesService.applyTemplate(baseTemplate, {
      DOCTOR_NAME: 'Smith',
      REASON: 'checkup',
      DOCUMENT: 'insurance card',
    });
    expect(result.title).toBe('Visit Dr. Smith for checkup');
    expect(result.description).toBe('Bring insurance card to your appointment with Smith');
  });

  it('uses customTime when provided for time-based templates', () => {
    const ct = '2025-12-31T15:00:00Z';
    const result = reminderTemplatesService.applyTemplate(baseTemplate, {}, ct);
    expect(result.reminder_time).toBe(ct);
  });

  it('computes reminder_time from offset when no customTime provided', () => {
    const result = reminderTemplatesService.applyTemplate(baseTemplate, {});
    expect(result.reminder_time).toBeDefined();
    // Should be in the future
    expect(new Date(result.reminder_time!).getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  it('omits reminder_time for non-time-based templates', () => {
    const locTemplate = { ...baseTemplate, reminder_type: 'location' };
    const result = reminderTemplatesService.applyTemplate(locTemplate, {});
    expect(result.reminder_time).toBeUndefined();
  });

  it('preserves bracketed text when no matching variable supplied', () => {
    const result = reminderTemplatesService.applyTemplate(baseTemplate, {});
    expect(result.title).toContain('[DOCTOR_NAME]');
  });
});

describe('reminderTemplatesService.extractVariables', () => {
  it('returns deduplicated variable list from title and description', () => {
    const vars = reminderTemplatesService.extractVariables(baseTemplate);
    expect(vars.sort()).toEqual(['DOCTOR_NAME', 'DOCUMENT', 'REASON']);
  });

  it('returns empty array when no variables present', () => {
    const tpl = { ...baseTemplate, template_title: 'No vars here', template_description: 'Plain text' };
    expect(reminderTemplatesService.extractVariables(tpl)).toEqual([]);
  });

  it('handles missing template_description', () => {
    const tpl = { ...baseTemplate, template_description: null };
    const vars = reminderTemplatesService.extractVariables(tpl);
    expect(vars.sort()).toEqual(['DOCTOR_NAME', 'REASON']);
  });
});

describe('reminderTemplatesService DB operations', () => {
  it('getSystemTemplates returns empty array when no rows', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    const result = await reminderTemplatesService.getSystemTemplates();
    expect(result).toEqual([]);
  });

  it('getSystemTemplates throws on supabase error', async () => {
    const c = chain({ data: null, error: { message: 'rls' } });
    vi.mocked(createClient).mockReturnValue(c as never);
    await expect(reminderTemplatesService.getSystemTemplates()).rejects.toThrow();
  });

  it('getTemplateById returns null on error', async () => {
    const c = chain({ data: null, error: { message: 'not found' } });
    vi.mocked(createClient).mockReturnValue(c as never);
    const result = await reminderTemplatesService.getTemplateById('tmpl-x');
    expect(result).toBeNull();
  });

  it('incrementUsage swallows errors silently (non-critical)', async () => {
    const c = chain({ data: null, error: { message: 'rpc fail' } });
    vi.mocked(createClient).mockReturnValue(c as never);
    // Should not throw
    await expect(reminderTemplatesService.incrementUsage('tmpl-1')).resolves.toBeUndefined();
  });

  it('getPopularTemplates respects custom limit', async () => {
    const c = chain({ data: [], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    await reminderTemplatesService.getPopularTemplates('s1', 3);
    expect(c.limit).toHaveBeenCalledWith(3);
  });
});
