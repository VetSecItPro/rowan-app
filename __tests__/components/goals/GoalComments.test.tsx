// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getGoalComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({}),
    updateComment: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
    toggleCommentReaction: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock shadcn/ui components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className: `card ${className || ''}` }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className: `card-content ${className || ''}` }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { className: 'card-header' }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h3', { className: `card-title ${className || ''}` }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    variant?: string;
    className?: string;
  }) => React.createElement('button', { onClick, disabled, className }, children),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className: `avatar ${className || ''}` }, children),
  AvatarImage: ({ src }: { src?: string }) =>
    React.createElement('img', { src }),
  AvatarFallback: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', null, children),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ placeholder, value, onChange, className, onKeyDown }: {
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  }) => React.createElement('textarea', { placeholder, value, onChange, className, onKeyDown }),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className: `scroll-area ${className || ''}` }, children),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => React.createElement('hr'),
}));

import { GoalComments } from '@/components/goals/GoalComments';

describe('GoalComments', () => {
  it('renders without crashing', () => {
    const { container } = render(<GoalComments goalId="goal-1" />);
    expect(container).toBeTruthy();
  });

  it('shows loading skeleton initially', () => {
    const { container } = render(<GoalComments goalId="goal-1" />);
    // The component shows loading skeleton with animate-pulse initially
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<GoalComments goalId="goal-1" className="custom" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts different goalId values', () => {
    const { container } = render(<GoalComments goalId="goal-abc-123" />);
    expect(container).toBeTruthy();
  });
});
