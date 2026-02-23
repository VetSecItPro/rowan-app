// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    getTemplates: vi.fn().mockResolvedValue([]),
    createTemplate: vi.fn().mockResolvedValue({ id: 'tpl-1' }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock('@/components/shopping/CreateCustomTemplateModal', () => ({
  CreateCustomTemplateModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-custom-template-modal" /> : null,
}));

import { TemplatePickerModal } from '@/components/shopping/TemplatePickerModal';

describe('TemplatePickerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTemplate: vi.fn().mockResolvedValue(undefined),
    onStartFresh: vi.fn(),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<TemplatePickerModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<TemplatePickerModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Choose a Template title', () => {
    render(<TemplatePickerModal {...defaultProps} />);
    expect(screen.getByText('Choose a Template')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<TemplatePickerModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Start Fresh button', () => {
    render(<TemplatePickerModal {...defaultProps} />);
    expect(screen.getByText('Start Fresh')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<TemplatePickerModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onStartFresh and onClose when Start Fresh is clicked', () => {
    const onStartFresh = vi.fn();
    const onClose = vi.fn();
    render(<TemplatePickerModal {...defaultProps} onStartFresh={onStartFresh} onClose={onClose} />);
    fireEvent.click(screen.getByText('Start Fresh'));
    expect(onStartFresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Quick Start Templates section when no saved templates', async () => {
    render(<TemplatePickerModal {...defaultProps} />);
    // Wait for async template loading to complete
    await vi.waitFor(() => {
      expect(screen.getByText('Quick Start Templates')).toBeTruthy();
    });
  });

  it('shows no templates message when no saved templates', async () => {
    render(<TemplatePickerModal {...defaultProps} />);
    await vi.waitFor(() => {
      expect(screen.getByText('No templates saved yet')).toBeTruthy();
    });
  });

  it('shows pre-built template options', async () => {
    render(<TemplatePickerModal {...defaultProps} />);
    await vi.waitFor(() => {
      expect(screen.getByText('Weekly Groceries')).toBeTruthy();
    });
  });

  it('shows Create Custom Template option', async () => {
    render(<TemplatePickerModal {...defaultProps} />);
    await vi.waitFor(() => {
      expect(screen.getByText('Create Custom Template')).toBeTruthy();
    });
  });
});
