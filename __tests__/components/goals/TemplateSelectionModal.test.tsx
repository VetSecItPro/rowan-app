// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getGoalTemplates: vi.fn().mockResolvedValue([
      {
        id: 't-1', title: 'Build Emergency Fund', description: 'Save 3-6 months', category: 'financial',
        icon: '💰', target_days: 180, is_public: true, usage_count: 245,
        created_at: '2026-01-01', updated_at: '2026-01-01',
      },
      {
        id: 't-2', title: 'Lose Weight', description: 'Get fit', category: 'health',
        icon: '🏃', target_days: 90, is_public: true, usage_count: 100,
        created_at: '2026-01-01', updated_at: '2026-01-01',
      },
    ]),
    getTemplateCategories: vi.fn().mockResolvedValue([
      { category: 'financial', count: 5, icon: '💰' },
      { category: 'health', count: 4, icon: '🏃' },
    ]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { TemplateSelectionModal } from '@/components/goals/TemplateSelectionModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSelectTemplate: vi.fn(),
  spaceId: 'space-1',
};

describe('TemplateSelectionModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<TemplateSelectionModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<TemplateSelectionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows Choose a Goal Template title', () => {
    render(<TemplateSelectionModal {...defaultProps} />);
    expect(screen.getByText('Choose a Goal Template')).toBeTruthy();
  });

  it('renders search input', () => {
    render(<TemplateSelectionModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search templates...')).toBeTruthy();
  });

  it('renders All Templates filter button', () => {
    render(<TemplateSelectionModal {...defaultProps} />);
    expect(screen.getByText('All Templates')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<TemplateSelectionModal {...defaultProps} />);
    expect(screen.getByTitle('Close without selecting a template')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<TemplateSelectionModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close without selecting a template'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Create from Scratch button when onCreateFromScratch provided', () => {
    const onCreateFromScratch = vi.fn();
    render(<TemplateSelectionModal {...defaultProps} onCreateFromScratch={onCreateFromScratch} />);
    expect(screen.getByTitle('Start with a blank goal instead of using a template')).toBeTruthy();
  });

  it('calls onCreateFromScratch when button clicked', () => {
    const onCreateFromScratch = vi.fn();
    render(<TemplateSelectionModal {...defaultProps} onCreateFromScratch={onCreateFromScratch} />);
    fireEvent.click(screen.getByTitle('Start with a blank goal instead of using a template'));
    expect(onCreateFromScratch).toHaveBeenCalled();
  });

  it('shows loading spinner initially', () => {
    const { container } = render(<TemplateSelectionModal {...defaultProps} />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('updates search query on input', () => {
    render(<TemplateSelectionModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search templates...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'emergency' } });
    expect(searchInput.value).toBe('emergency');
  });
});
