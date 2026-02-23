// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NudgeCard } from '@/components/nudges/NudgeCard';
import type { SmartNudge } from '@/lib/services/smart-nudges-service';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const baseNudge: SmartNudge = {
  nudge_id: 'nudge-1',
  goal_id: 'goal-1',
  goal_title: 'Run a 5K',
  title: 'Keep up the momentum!',
  message: 'You have not logged activity in 3 days.',
  category: 'reminder',
  priority: 2,
  icon: 'bell',
  action_text: 'Log Activity',
  days_since_activity: 3,
  days_until_deadline: 10,
};

describe('NudgeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NudgeCard nudge={baseNudge} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the nudge title', () => {
    render(<NudgeCard nudge={baseNudge} />);
    expect(screen.getByText('Keep up the momentum!')).toBeTruthy();
  });

  it('renders the nudge message', () => {
    render(<NudgeCard nudge={baseNudge} />);
    expect(screen.getByText('You have not logged activity in 3 days.')).toBeTruthy();
  });

  it('renders the action button when action_text is set', () => {
    render(<NudgeCard nudge={baseNudge} />);
    expect(screen.getByText('Log Activity')).toBeTruthy();
  });

  it('renders the goal title', () => {
    render(<NudgeCard nudge={baseNudge} />);
    expect(screen.getByText(/run a 5k/i)).toBeTruthy();
  });

  it('shows days since activity metadata', () => {
    render(<NudgeCard nudge={baseNudge} />);
    expect(screen.getByText(/3d since update/i)).toBeTruthy();
  });

  it('shows days until deadline metadata', () => {
    render(<NudgeCard nudge={baseNudge} />);
    expect(screen.getByText(/10d remaining/i)).toBeTruthy();
  });

  it('calls onAction with dismissed when dismiss is clicked', () => {
    const onAction = vi.fn();
    render(<NudgeCard nudge={baseNudge} onAction={onAction} />);
    const menuBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(menuBtn);
    const dismissBtn = screen.getByText('Dismiss');
    fireEvent.click(dismissBtn);
    expect(onAction).toHaveBeenCalledWith('nudge-1', 'dismissed');
  });

  it('calls onAction with snoozed when snooze is clicked', () => {
    const onAction = vi.fn();
    render(<NudgeCard nudge={baseNudge} onAction={onAction} />);
    const menuBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(menuBtn);
    const snoozeBtn = screen.getByText('Snooze');
    fireEvent.click(snoozeBtn);
    expect(onAction).toHaveBeenCalledWith('nudge-1', 'snoozed');
  });

  it('renders high priority ring for priority >= 3', () => {
    const highPriorityNudge = { ...baseNudge, priority: 3 };
    const { container } = render(<NudgeCard nudge={highPriorityNudge} />);
    expect(container.querySelector('[class*="ring-2"]')).toBeTruthy();
  });
});
