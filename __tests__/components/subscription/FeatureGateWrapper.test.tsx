// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/hooks/useFeatureGate', () => ({
  useFeatureGate: vi.fn(() => ({
    hasAccess: true,
    isLoading: false,
    featureName: 'Meal Planning',
    requiredTier: 'pro',
    promptUpgrade: vi.fn(),
    checkAndPrompt: vi.fn(() => true),
  })),
}));

import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { FeatureGateWrapper, GatedButton, ProBadge, FamilyBadge } from '@/components/subscription/FeatureGateWrapper';

const defaultGateReturn = {
  hasAccess: true,
  isLoading: false,
  featureName: 'Meal Planning',
  requiredTier: 'pro',
  promptUpgrade: vi.fn(),
  checkAndPrompt: vi.fn(() => true),
} as ReturnType<typeof useFeatureGate>;

describe('FeatureGateWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFeatureGate).mockReturnValue({ ...defaultGateReturn, promptUpgrade: vi.fn(), checkAndPrompt: vi.fn(() => true) });
  });

  it('renders children when user has access', () => {
    render(
      <FeatureGateWrapper feature="mealPlanning">
        <div>Protected content</div>
      </FeatureGateWrapper>
    );
    expect(screen.getByText('Protected content')).toBeTruthy();
  });

  it('shows loading fallback when loading', () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      hasAccess: false,
      isLoading: true,
      featureName: 'Meal Planning',
      requiredTier: 'pro',
      promptUpgrade: vi.fn(),
      checkAndPrompt: vi.fn(() => false),
    });

    render(
      <FeatureGateWrapper feature="mealPlanning" loadingFallback={<div>Loading...</div>}>
        <div>Protected content</div>
      </FeatureGateWrapper>
    );
    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(screen.queryByText('Protected content')).toBeNull();
  });

  it('shows default loading spinner when no loadingFallback and isLoading', () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      hasAccess: false,
      isLoading: true,
      featureName: 'Meal Planning',
      requiredTier: 'pro',
      promptUpgrade: vi.fn(),
      checkAndPrompt: vi.fn(() => false),
    });

    const { container } = render(
      <FeatureGateWrapper feature="mealPlanning">
        <div>Content</div>
      </FeatureGateWrapper>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows blocked page when no access and variant is page', () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      hasAccess: false,
      isLoading: false,
      featureName: 'Meal Planning',
      requiredTier: 'pro',
      promptUpgrade: vi.fn(),
      checkAndPrompt: vi.fn(() => false),
    });

    render(
      <FeatureGateWrapper feature="mealPlanning" variant="page">
        <div>Protected</div>
      </FeatureGateWrapper>
    );
    expect(screen.getByTestId('feature-locked-message')).toBeTruthy();
    expect(screen.getByText('View Plans')).toBeTruthy();
  });

  it('shows blocked inline when no access and variant is inline', () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      hasAccess: false,
      isLoading: false,
      featureName: 'Meal Planning',
      requiredTier: 'pro',
      promptUpgrade: vi.fn(),
      checkAndPrompt: vi.fn(() => false),
    });

    render(
      <FeatureGateWrapper feature="mealPlanning" variant="inline">
        <div>Protected</div>
      </FeatureGateWrapper>
    );
    expect(screen.getByText('Upgrade')).toBeTruthy();
  });

  it('shows custom blocked content when blockedContent prop provided', () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      hasAccess: false,
      isLoading: false,
      featureName: 'Meal Planning',
      requiredTier: 'pro',
      promptUpgrade: vi.fn(),
      checkAndPrompt: vi.fn(() => false),
    });

    render(
      <FeatureGateWrapper feature="mealPlanning" blockedContent={<div>Custom block</div>}>
        <div>Protected</div>
      </FeatureGateWrapper>
    );
    expect(screen.getByText('Custom block')).toBeTruthy();
  });
});

describe('GatedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default: user has access, checkAndPrompt returns true
    vi.mocked(useFeatureGate).mockReturnValue({ ...defaultGateReturn, promptUpgrade: vi.fn(), checkAndPrompt: vi.fn(() => true) });
  });

  it('renders button with children', () => {
    render(
      <GatedButton feature="mealPlanning" onClick={vi.fn()}>
        Click me
      </GatedButton>
    );
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onClick when user has access', () => {
    const onClick = vi.fn();
    render(
      <GatedButton feature="mealPlanning" onClick={onClick}>
        Click me
      </GatedButton>
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('ProBadge', () => {
  it('renders Pro badge', () => {
    render(<ProBadge />);
    expect(screen.getByText('Pro')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<ProBadge className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('custom-class');
  });
});

describe('FamilyBadge', () => {
  it('renders Family badge', () => {
    render(<FamilyBadge />);
    expect(screen.getByText('Family')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<FamilyBadge className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('custom-class');
  });
});
