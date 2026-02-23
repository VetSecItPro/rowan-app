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
  showWarning: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('@/lib/services/event-attachments-service', () => ({
  eventAttachmentsService: {
    uploadAttachment: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    getLists: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/lib/services/shopping-integration-service', () => ({
  shoppingIntegrationService: {
    linkEventToList: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/lib/utils/timezone-utils', () => ({
  toDateTimeLocalValue: vi.fn((d: string) => d),
  fromDateTimeLocalValue: vi.fn((d: string) => d),
  fromUTC: vi.fn((d: string) => new Date(d)),
}));
vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/DateTimePicker', () => ({
  DateTimePicker: ({ label }: { label?: string }) => <div>{label}</div>,
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? <div><h2>{title}</h2>{children}</div> : null,
}));

import { NewEventModal } from '@/components/calendar/NewEventModal';

describe('NewEventModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<NewEventModal {...defaultProps} />);
    await waitFor(() => {
      // Modal title is "Create New Event"
      expect(screen.getByText('Create New Event')).toBeTruthy();
    });
  });

  it('renders nothing when closed', () => {
    render(<NewEventModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Create New Event')).toBeNull();
  });

  it('shows title input', async () => {
    render(<NewEventModal {...defaultProps} />);
    await waitFor(() => {
      // Placeholder is "e.g., Team meeting"
      expect(screen.getByPlaceholderText(/Team meeting/i)).toBeTruthy();
    });
  });

  it('shows More Options toggle for advanced fields', async () => {
    render(<NewEventModal {...defaultProps} />);
    await waitFor(() => {
      // Category is inside the "More Options" section which is hidden by default
      // But the toggle button should be visible
      expect(screen.getByText(/More/)).toBeTruthy();
    });
  });
});
