// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { FeatureCard } from '@/components/home/FeatureCard';
import { CheckSquare } from 'lucide-react';

describe('FeatureCard', () => {
  const defaultProps = {
    title: 'Tasks',
    description: 'Manage your household tasks',
    icon: CheckSquare,
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'shadow-blue-500/20',
    href: '/tasks',
  };

  it('renders without crashing', () => {
    const { container } = render(<FeatureCard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the title', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Tasks')).toBeTruthy();
  });

  it('renders the description', () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText('Manage your household tasks')).toBeTruthy();
  });

  it('renders as a link with correct href', () => {
    render(<FeatureCard {...defaultProps} />);
    const link = document.querySelector('a[href="/tasks"]');
    expect(link).toBeTruthy();
  });

  it('renders the icon', () => {
    const { container } = render(<FeatureCard {...defaultProps} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
