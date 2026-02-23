import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('calendar barrel exports', () => {
  it('re-exports googleCalendarService', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.googleCalendarService).toBeDefined();
  });

  it('re-exports icsImportService', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.icsImportService).toBeDefined();
  });

  it('re-exports eventMapper', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.eventMapper).toBeDefined();
  });

  it('re-exports calendarSyncService', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.calendarSyncService).toBeDefined();
  });

  it('re-exports unifiedCalendarService', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.unifiedCalendarService).toBeDefined();
  });

  it('re-exports countdownService', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.countdownService).toBeDefined();
  });

  it('re-exports importantDatesService', async () => {
    const mod = await import('@/lib/services/calendar');
    expect(mod.importantDatesService).toBeDefined();
  });
});
