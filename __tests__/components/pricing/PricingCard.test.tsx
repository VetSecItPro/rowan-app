// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingCard } from '@/components/pricing/PricingCard';

const baseProps = {
  tier: 'pro' as const,
  title: 'Pro Plan',
  description: 'For power users',
  monthlyPrice: 9,
  annualPrice: 90,
  period: 'monthly' as const,
  features: ['Feature One', 'Feature Two', 'Feature Three'],
  cta: 'Get Started',
  onSelect: vi.fn(),
};

describe('PricingCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<PricingCard {...baseProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders plan title', () => {
    render(<PricingCard {...baseProps} />);
    expect(screen.getByText('Pro Plan')).toBeTruthy();
  });

  it('renders plan description', () => {
    render(<PricingCard {...baseProps} />);
    expect(screen.getByText('For power users')).toBeTruthy();
  });

  it('renders monthly price', () => {
    render(<PricingCard {...baseProps} />);
    expect(screen.getByText('$9')).toBeTruthy();
  });

  it('renders annual price when period is annual', () => {
    render(<PricingCard {...baseProps} period="annual" />);
    expect(screen.getByText('$90')).toBeTruthy();
  });

  it('renders all feature items', () => {
    render(<PricingCard {...baseProps} />);
    expect(screen.getByText('Feature One')).toBeTruthy();
    expect(screen.getByText('Feature Two')).toBeTruthy();
    expect(screen.getByText('Feature Three')).toBeTruthy();
  });

  it('renders CTA button', () => {
    render(<PricingCard {...baseProps} />);
    expect(screen.getByRole('button', { name: /get started for pro plan/i })).toBeTruthy();
  });

  it('calls onSelect when CTA button is clicked', () => {
    const onSelect = vi.fn();
    render(<PricingCard {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /get started for pro plan/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('renders "Free" text for free tier', () => {
    render(<PricingCard {...baseProps} tier="free" monthlyPrice={0} />);
    expect(screen.getByText('Free')).toBeTruthy();
  });

  it('renders Most Popular badge when popular=true', () => {
    render(<PricingCard {...baseProps} popular={true} />);
    expect(screen.getByText('Most Popular')).toBeTruthy();
  });

  it('disables button when loading=true', () => {
    render(<PricingCard {...baseProps} loading={true} />);
    const btn = screen.getByRole('button', { name: /pro plan/i });
    expect(btn).toBeDisabled();
  });

  it('shows Processing text when loading=true', () => {
    render(<PricingCard {...baseProps} loading={true} />);
    expect(screen.getByText('Processing...')).toBeTruthy();
  });

  it('renders founding member badge when showFoundingMember=true', () => {
    render(<PricingCard {...baseProps} showFoundingMember={true} />);
    expect(screen.getByText(/founding member pricing/i)).toBeTruthy();
  });
});
