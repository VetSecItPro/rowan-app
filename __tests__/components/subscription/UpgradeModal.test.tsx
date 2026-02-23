// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

vi.mock('@/lib/contexts/subscription-context', () => ({
  useSubscriptionSafe: vi.fn(() => ({
    tier: 'free',
    canAccess: vi.fn(() => false),
    showUpgradeModal: vi.fn(),
    isLoading: false,
  })),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, subtitle, footer, testId }: { isOpen: boolean; children: React.ReactNode; title: string; subtitle?: string; footer?: React.ReactNode; testId?: string }) =>
    isOpen ? (
      <div data-testid={testId || 'modal'}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
        {footer}
      </div>
    ) : null,
}));

import { useSubscriptionSafe } from '@/lib/contexts/subscription-context';
import { UpgradeModal, FeatureLockOverlay } from '@/components/subscription/UpgradeModal';

describe('UpgradeModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSubscriptionSafe).mockReturnValue({
      tier: 'free',
      canAccess: vi.fn(() => false),
      showUpgradeModal: vi.fn(),
      isLoading: false,
    } as ReturnType<typeof useSubscriptionSafe>);
  });

  it('renders when open', () => {
    const { container } = render(<UpgradeModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<UpgradeModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('upgrade-modal')).toBeNull();
  });

  it('displays default title when no feature specified', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
  });

  it('displays feature-specific title for mealPlanning', () => {
    render(<UpgradeModal {...defaultProps} feature="mealPlanning" />);
    expect(screen.getByText('Meal Planning')).toBeTruthy();
  });

  it('displays custom title when provided', () => {
    render(<UpgradeModal {...defaultProps} title="Get More Features" />);
    expect(screen.getByText('Get More Features')).toBeTruthy();
  });

  it('displays custom description when provided', () => {
    render(<UpgradeModal {...defaultProps} description="Upgrade for advanced features." />);
    expect(screen.getByText('Upgrade for advanced features.')).toBeTruthy();
  });

  it('shows Maybe Later button', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Maybe Later')).toBeTruthy();
  });

  it('shows View Plans link', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('View Plans')).toBeTruthy();
  });

  it('calls onClose when Maybe Later is clicked', () => {
    const onClose = vi.fn();
    render(<UpgradeModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Maybe Later'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Pro Plan includes section by default', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Pro Plan includes:')).toBeTruthy();
  });

  it('shows Family Plan includes for AI feature', () => {
    render(<UpgradeModal {...defaultProps} feature="ai" />);
    expect(screen.getByText('Family Plan includes:')).toBeTruthy();
  });

  it('shows Pro features list', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Unlimited tasks & calendar events')).toBeTruthy();
    expect(screen.getByText('Photo uploads (2GB storage)')).toBeTruthy();
  });

  it('shows pricing hint', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByText('Starting at $18/month')).toBeTruthy();
  });

  it('shows higher pricing for Family tier features', () => {
    render(<UpgradeModal {...defaultProps} feature="ai" />);
    expect(screen.getByText('Starting at $29/month')).toBeTruthy();
  });

  it('View Plans link points to /pricing', () => {
    render(<UpgradeModal {...defaultProps} />);
    const planLink = screen.getByText('View Plans').closest('a');
    expect(planLink?.getAttribute('href')).toBe('/pricing');
  });
});

describe('FeatureLockOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user has access', () => {
    vi.mocked(useSubscriptionSafe).mockReturnValue({
      tier: 'pro',
      canAccess: vi.fn(() => true),
      showUpgradeModal: vi.fn(),
      isLoading: false,
    } as ReturnType<typeof useSubscriptionSafe>);

    render(
      <FeatureLockOverlay feature="mealPlanning">
        <div>Protected content</div>
      </FeatureLockOverlay>
    );
    expect(screen.getByText('Protected content')).toBeTruthy();
  });

  it('shows lock overlay when no access', () => {
    vi.mocked(useSubscriptionSafe).mockReturnValue({
      tier: 'free',
      canAccess: vi.fn(() => false),
      showUpgradeModal: vi.fn(),
      isLoading: false,
    } as ReturnType<typeof useSubscriptionSafe>);

    render(
      <FeatureLockOverlay feature="mealPlanning">
        <div>Protected content</div>
      </FeatureLockOverlay>
    );
    expect(screen.getByText('Upgrade to Unlock')).toBeTruthy();
  });
});
