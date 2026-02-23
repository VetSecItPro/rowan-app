// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    ensureSystemTemplates: vi.fn().mockResolvedValue(undefined),
    getTemplates: vi.fn().mockResolvedValue([]),
    deleteTemplate: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title }: {
    isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string;
  }) => isOpen ? (
    <div>
      <div>{title}</div>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null,
}));

import { TemplateLibrary } from '@/components/calendar/TemplateLibrary';
import { calendarService } from '@/lib/services/calendar-service';

describe('TemplateLibrary', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    spaceId: 'space-1',
    onSelectTemplate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<TemplateLibrary {...defaultProps} />);
    await waitFor(() => {
      // Component renders its own header (not via Modal) with "Event Templates"
      expect(screen.getByText('Event Templates')).toBeTruthy();
    });
  });

  it('renders nothing when closed', () => {
    render(<TemplateLibrary {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Event Templates')).toBeNull();
  });

  it('shows empty state when no templates', async () => {
    render(<TemplateLibrary {...defaultProps} />);
    await waitFor(() => {
      // Empty state message is "No templates found in this category"
      expect(screen.getByText('No templates found in this category')).toBeTruthy();
    });
  });

  it('shows category filter buttons', async () => {
    render(<TemplateLibrary {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeTruthy();
    });
  });

  it('shows templates when loaded', async () => {
    vi.mocked(calendarService.getTemplates).mockResolvedValueOnce([
      {
        id: 'tpl-1',
        space_id: 'space-1',
        name: 'Weekly Standup',
        title: 'Weekly Standup',
        category: 'work',
        duration_minutes: 30,
        default_duration: 30,
        is_system: false,
        is_system_template: false,
        use_count: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ] as never);
    render(<TemplateLibrary {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Weekly Standup')).toBeTruthy();
    });
  });
});
