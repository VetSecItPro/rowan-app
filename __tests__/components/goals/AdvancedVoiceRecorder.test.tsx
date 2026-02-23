// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => ({
      load: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      destroy: vi.fn(),
      playPause: vi.fn(),
      getCurrentTime: vi.fn(() => 0),
      getDuration: vi.fn(() => 60),
      seekTo: vi.fn(),
      setPlaybackRate: vi.fn(),
      setVolume: vi.fn(),
    })),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { AdvancedVoiceRecorder } from '@/components/goals/AdvancedVoiceRecorder';

const defaultProps = {
  onSendVoice: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  goalTitle: 'My Test Goal',
};

describe('AdvancedVoiceRecorder', () => {
  it('renders without crashing', () => {
    const { container } = render(<AdvancedVoiceRecorder {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows goal title header when goalTitle provided', () => {
    render(<AdvancedVoiceRecorder {...defaultProps} />);
    expect(screen.getByText('Voice Check-In')).toBeTruthy();
    expect(screen.getByText(/My Test Goal/)).toBeTruthy();
  });

  it('does not show voice check-in header when no goalTitle', () => {
    render(<AdvancedVoiceRecorder onSendVoice={defaultProps.onSendVoice} />);
    expect(screen.queryByText('Voice Check-In')).toBeNull();
  });

  it('shows template chooser section', () => {
    render(<AdvancedVoiceRecorder {...defaultProps} />);
    expect(screen.getByText('Choose a template (optional)')).toBeTruthy();
  });

  it('shows Show templates toggle button', () => {
    render(<AdvancedVoiceRecorder {...defaultProps} />);
    expect(screen.getByText(/Show templates/)).toBeTruthy();
  });

  it('shows templates when Show templates is clicked', () => {
    render(<AdvancedVoiceRecorder {...defaultProps} />);
    fireEvent.click(screen.getByText(/Show templates/));
    expect(screen.getByText('Progress Update')).toBeTruthy();
    expect(screen.getByText('Challenges & Blockers')).toBeTruthy();
    expect(screen.getByText('Personal Reflection')).toBeTruthy();
    expect(screen.getByText('Next Steps Planning')).toBeTruthy();
  });

  it('shows start recording button', () => {
    render(<AdvancedVoiceRecorder {...defaultProps} />);
    expect(screen.getByLabelText('Start recording')).toBeTruthy();
  });

  it('shows tap to start recording hint', () => {
    render(<AdvancedVoiceRecorder {...defaultProps} />);
    expect(screen.getByText('Tap to start recording')).toBeTruthy();
  });

  it('renders with custom templates', () => {
    const customTemplates = [
      {
        id: 'custom-1',
        name: 'Custom Template',
        category: 'general' as const,
        prompt: 'Custom prompt',
        questions: ['Question 1'],
      },
    ];
    render(<AdvancedVoiceRecorder {...defaultProps} templates={customTemplates} />);
    fireEvent.click(screen.getByText(/Show templates/));
    expect(screen.getByText('Custom Template')).toBeTruthy();
  });
});
