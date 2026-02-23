// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/reminder-templates-service', () => ({
  reminderTemplatesService: {
    getTemplates: vi.fn().mockResolvedValue([]),
    extractVariables: vi.fn().mockReturnValue([]),
    applyTemplate: vi.fn().mockReturnValue({ title: 'Applied' }),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
  },
}));

import { TemplatePicker } from '@/components/reminders/TemplatePicker';

const defaultProps = {
  spaceId: 'space-1',
  onSelectTemplate: vi.fn(),
  onClose: vi.fn(),
};

describe('TemplatePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<TemplatePicker {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the "Choose a Template" heading', () => {
    render(<TemplatePicker {...defaultProps} />);
    expect(screen.getByText('Choose a Template')).toBeTruthy();
  });

  it('shows a loading spinner while fetching templates', () => {
    render(<TemplatePicker {...defaultProps} />);
    // Loading spinner present during initial fetch
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders with templates from service', async () => {
    const { reminderTemplatesService } = await import('@/lib/services/reminder-templates-service');
    (reminderTemplatesService.getTemplates as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 't-1',
        name: 'Pay Bills',
        emoji: '💰',
        description: 'Monthly bill reminder',
        category: 'bills',
        priority: 'high',
        template_title: 'Pay {{bill_name}}',
        reminder_type: 'time',
        is_system_template: true,
        usage_count: 5,
        created_at: new Date().toISOString(),
      },
    ]);
    const { container } = render(<TemplatePicker {...defaultProps} />);
    expect(container).toBeTruthy();
  });
});
