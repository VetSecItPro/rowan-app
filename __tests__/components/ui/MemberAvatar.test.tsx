// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MemberAvatar, MemberAvatarGroup } from '@/components/ui/MemberAvatar';

describe('MemberAvatar', () => {
  it('renders without crashing', () => {
    render(<MemberAvatar name="John Doe" />);
    expect(screen.getByText('J')).toBeDefined();
  });

  it('shows first letter of name as initial', () => {
    render(<MemberAvatar name="Alice Smith" />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('shows tooltip with full name', () => {
    render(<MemberAvatar name="Bob Jones" showTooltip={true} />);
    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(screen.getByRole('tooltip').textContent).toContain('Bob Jones');
  });

  it('hides tooltip when showTooltip is false', () => {
    render(<MemberAvatar name="Bob Jones" showTooltip={false} />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('uses aria-label with name', () => {
    render(<MemberAvatar name="Carol White" />);
    expect(screen.getByLabelText('Carol White')).toBeDefined();
  });

  it('applies sm size classes', () => {
    const { container } = render(<MemberAvatar name="Alice" size="sm" />);
    expect(container.querySelector('.w-6')).toBeDefined();
  });

  it('applies lg size classes', () => {
    const { container } = render(<MemberAvatar name="Alice" size="lg" />);
    expect(container.querySelector('.w-10')).toBeDefined();
  });
});

describe('MemberAvatarGroup', () => {
  const members = [
    { name: 'Alice' },
    { name: 'Bob' },
    { name: 'Carol' },
    { name: 'Dave' },
  ];

  it('renders without crashing', () => {
    render(<MemberAvatarGroup members={members} />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('shows max avatars by default (3)', () => {
    render(<MemberAvatarGroup members={members} />);
    // 3 visible + 1 overflow
    expect(screen.getByText('+1')).toBeDefined();
  });

  it('shows overflow count for extra members', () => {
    render(<MemberAvatarGroup members={members} max={2} />);
    expect(screen.getByText('+2')).toBeDefined();
  });

  it('shows no overflow when all members fit', () => {
    render(<MemberAvatarGroup members={members.slice(0, 2)} max={3} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
