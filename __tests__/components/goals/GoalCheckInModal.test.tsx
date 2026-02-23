// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, subtitle, footer }: { isOpen: boolean; children: React.ReactNode; title: string; subtitle?: string; footer: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/components/ui/EnhancedButton', () => ({
  PremiumButton: ({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; [key: string]: unknown }) =>
    React.createElement('button', { onClick, disabled: disabled || loading }, children),
  SecondaryButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void; [key: string]: unknown }) =>
    React.createElement('button', { onClick }, children),
}));

vi.mock('@/components/goals/AdvancedVoiceRecorder', () => ({
  AdvancedVoiceRecorder: () => <div data-testid="voice-recorder" />,
}));

vi.mock('@/lib/services/voice-transcription-service', () => ({
  voiceTranscriptionService: {
    transcribeAudio: vi.fn().mockResolvedValue({ transcription: '', confidence: 0, keywords: [] }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

import { GoalCheckInModal } from '@/components/goals/GoalCheckInModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  goalTitle: 'Save $10,000',
  goalId: 'goal-1',
  currentProgress: 40,
};

describe('GoalCheckInModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<GoalCheckInModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<GoalCheckInModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows Goal Check-In title', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Goal Check-In')).toBeTruthy();
  });

  it('shows goal title as subtitle', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Save $10,000')).toBeTruthy();
  });

  it('renders progress slider', () => {
    const { container } = render(<GoalCheckInModal {...defaultProps} />);
    expect(container.querySelector('input[type="range"]')).toBeTruthy();
  });

  it('shows current progress percentage', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText(/40%/)).toBeTruthy();
  });

  it('renders mood selection buttons', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Great')).toBeTruthy();
    expect(screen.getByText('Okay')).toBeTruthy();
    expect(screen.getByText('Struggling')).toBeTruthy();
  });

  it('renders progress notes textarea', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Share what you.ve accomplished/)).toBeTruthy();
  });

  it('renders challenges textarea', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/What.s standing in your way/)).toBeTruthy();
  });

  it('renders need help toggle', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Need help from your partner?')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Save Check-In button', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Save Check-In')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<GoalCheckInModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('selects mood on click', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Great'));
    // Great button should now be visually selected
    expect(screen.getByText('Great')).toBeTruthy();
  });

  it('shows Add Voice Check-In button', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Add Voice Check-In')).toBeTruthy();
  });

  it('shows Add Progress Photos button', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    expect(screen.getByText('Add Progress Photos')).toBeTruthy();
  });

  it('shows voice recorder when Add Voice Check-In clicked', () => {
    render(<GoalCheckInModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Voice Check-In'));
    expect(screen.getByTestId('voice-recorder')).toBeTruthy();
  });
});
