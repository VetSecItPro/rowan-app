// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/tasks'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

import { EnhancedButton, PrimaryButton, SecondaryButton, CTAButton, PremiumButton } from '@/components/ui/EnhancedButton';

describe('EnhancedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<EnhancedButton>Click me</EnhancedButton>);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('renders children', () => {
    render(<EnhancedButton>Submit</EnhancedButton>);
    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<EnhancedButton onClick={onClick}>Click</EnhancedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is passed', () => {
    render(<EnhancedButton disabled>Click</EnhancedButton>);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('is disabled when loading is true', () => {
    render(<EnhancedButton loading>Click</EnhancedButton>);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('shows loading spinner when loading is true', () => {
    const { container } = render(<EnhancedButton loading>Click</EnhancedButton>);
    expect(container.querySelector('.animate-spin')).toBeDefined();
  });

  it('shows success checkmark when success is true', () => {
    const { container } = render(<EnhancedButton success>Click</EnhancedButton>);
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('renders icon on the left by default', () => {
    const icon = <span data-testid="icon">star</span>;
    render(<EnhancedButton icon={icon}>Click</EnhancedButton>);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('renders icon on the right when iconPosition is right', () => {
    const icon = <span data-testid="icon">star</span>;
    render(<EnhancedButton icon={icon} iconPosition="right">Click</EnhancedButton>);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<EnhancedButton className="custom-btn">Click</EnhancedButton>);
    expect(screen.getByRole('button').className).toContain('custom-btn');
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<EnhancedButton disabled onClick={onClick}>Click</EnhancedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('PrimaryButton', () => {
  it('renders without crashing', () => {
    render(<PrimaryButton>Primary</PrimaryButton>);
    expect(screen.getByText('Primary')).toBeDefined();
  });
});

describe('SecondaryButton', () => {
  it('renders without crashing', () => {
    render(<SecondaryButton>Secondary</SecondaryButton>);
    expect(screen.getByText('Secondary')).toBeDefined();
  });
});

describe('CTAButton', () => {
  it('renders without crashing', () => {
    render(<CTAButton>CTA</CTAButton>);
    expect(screen.getByText('CTA')).toBeDefined();
  });
});

describe('PremiumButton', () => {
  it('renders without crashing', () => {
    render(<PremiumButton>Premium</PremiumButton>);
    expect(screen.getByText('Premium')).toBeDefined();
  });
});
