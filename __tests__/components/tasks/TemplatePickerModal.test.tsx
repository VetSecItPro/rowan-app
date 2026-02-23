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

vi.mock('@/lib/services/task-templates-service', () => ({
  taskTemplatesService: {
    getTemplates: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('use-debounce', () => ({
  useDebounce: (value: unknown) => [value],
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TemplatePickerModal } from '@/components/tasks/TemplatePickerModal';

describe('TemplatePickerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(<TemplatePickerModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  it('renders modal title', () => {
    render(<TemplatePickerModal {...defaultProps} />);
    expect(screen.getByText('Task Templates')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    render(<TemplatePickerModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows search input', () => {
    render(<TemplatePickerModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search templates...')).toBeDefined();
  });

  it('shows empty state when no templates', async () => {
    render(<TemplatePickerModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeDefined();
    });
  });

  it('renders templates when available', async () => {
    const { taskTemplatesService } = await import('@/lib/services/task-templates-service');
    (taskTemplatesService.getTemplates as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 't-1', name: 'Weekly Chores', title: 'Weekly cleanup', use_count: 5, priority: 'medium', is_favorite: false },
    ]);
    render(<TemplatePickerModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Weekly Chores')).toBeDefined();
    });
  });
});
