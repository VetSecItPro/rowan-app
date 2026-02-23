// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
    footer?: React.ReactNode;
  }) =>
    isOpen ? <div><h2>{title}</h2>{children}{footer}</div> : null,
}));
vi.mock('@/lib/types/unified-calendar-item', () => ({
  UNIFIED_ITEM_COLORS: {
    event: { bg: 'bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-300', dot: 'bg-purple-500' },
    task: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-300', dot: 'bg-blue-500' },
    meal: { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-300', dot: 'bg-orange-500' },
    reminder: { bg: 'bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-300', dot: 'bg-pink-500' },
    goal: { bg: 'bg-indigo-900/30', border: 'border-indigo-500', text: 'text-indigo-300', dot: 'bg-indigo-500' },
  },
  UNIFIED_ITEM_LABELS: {
    event: 'Event',
    task: 'Task',
    meal: 'Meal',
    reminder: 'Reminder',
    goal: 'Goal',
  },
}));

import { UnifiedItemPreviewModal } from '@/components/calendar/UnifiedItemPreviewModal';
import type { UnifiedCalendarItem } from '@/lib/types/unified-calendar-item';

const makeItem = (overrides: Partial<UnifiedCalendarItem> = {}): UnifiedCalendarItem => ({
  id: 'item-1',
  itemType: 'event',
  title: 'Project Review',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  status: 'not-started',
  originalItem: {} as never,
  ...overrides,
});

describe('UnifiedItemPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(
      <UnifiedItemPreviewModal
        item={makeItem()}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Project Review')).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(
      <UnifiedItemPreviewModal
        item={makeItem()}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Project Review')).toBeNull();
  });

  it('shows time information', () => {
    render(
      <UnifiedItemPreviewModal
        item={makeItem()}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(document.body.textContent).toContain('AM');
  });

  it('shows navigation button in footer', () => {
    render(
      <UnifiedItemPreviewModal
        item={makeItem({ itemType: 'task' })}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    // Footer button reads "Edit in Tasks" - check body text
    expect(document.body.textContent).toContain('Edit in');
  });
});
