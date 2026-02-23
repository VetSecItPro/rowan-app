// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Top-level mock function so we can adjust per-test
const mockIsSmartOnboardingEnabled = vi.fn(() => false);

vi.mock('@/lib/constants/feature-flags', () => ({
  featureFlags: {
    isSmartOnboardingEnabled: () => mockIsSmartOnboardingEnabled(),
    isPersonalWorkspacesEnabled: vi.fn(() => false),
    isMonetizationEnabled: vi.fn(() => false),
    isAICompanionEnabled: vi.fn(() => false),
    isWorkspaceMigrationEnabled: vi.fn(() => false),
    isPersonalWorkspaceSuiteEnabled: vi.fn(() => false),
    getAllFlags: vi.fn(() => ({})),
  },
  FEATURE_FLAGS: {
    PERSONAL_WORKSPACES: false,
    SMART_ONBOARDING: false,
    WORKSPACE_MIGRATION: false,
    MONETIZATION: false,
    AI_COMPANION: false,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User' },
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    currentSpace: null,
    spaces: [],
    refreshSpaces: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/services/personal-workspace-service', () => ({
  personalWorkspaceService: {
    ensurePersonalSpace: vi.fn().mockResolvedValue({ id: 'space-personal', name: 'My Workspace' }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SmartOnboarding } from '@/components/onboarding/SmartOnboarding';

describe('SmartOnboarding', () => {
  it('returns null when smart onboarding feature flag is disabled', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(false);
    const { container } = render(
      <SmartOnboarding isOpen={true} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the welcome modal when feature flag is enabled and modal is open', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Welcome to Rowan!')).toBeTruthy();
  });

  it('shows "Just for me" option when flag is enabled', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Just for me')).toBeTruthy();
  });

  it('shows "With family/partner" option when flag is enabled', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('With family/partner')).toBeTruthy();
  });

  it('shows the setup description text', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/perfect workspace for your needs/i)).toBeTruthy();
  });

  it('shows "Instant setup" badge for personal option', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Instant setup')).toBeTruthy();
  });

  it('shows "Collaboration features" badge for family option', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Collaboration features')).toBeTruthy();
  });

  it('advances to personal confirmation screen when "Just for me" is clicked', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Just for me'));
    expect(screen.getByText('Personal Workspace')).toBeTruthy();
  });

  it('advances to family confirmation screen when "With family/partner" is clicked', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('With family/partner'));
    expect(screen.getByText('Shared Workspace')).toBeTruthy();
  });

  it('shows "Create Personal Workspace" button in personal confirmation screen', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Just for me'));
    expect(screen.getByText('Create Personal Workspace')).toBeTruthy();
  });

  it('shows "Create Shared Workspace" button in family confirmation screen', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('With family/partner'));
    expect(screen.getByText('Create Shared Workspace')).toBeTruthy();
  });

  it('shows a Back button in the confirmation screen', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Just for me'));
    expect(screen.getByText('Back')).toBeTruthy();
  });

  it('returns to intent selection screen when Back is clicked', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    render(<SmartOnboarding isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Just for me'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Just for me')).toBeTruthy();
  });

  it('does not render modal content when isOpen is false but flag is enabled', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    const { container } = render(
      <SmartOnboarding isOpen={false} onClose={vi.fn()} />
    );
    // Modal uses AnimatePresence - when isOpen is false, content is not rendered
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('calls onClose when modal close button is clicked', () => {
    mockIsSmartOnboardingEnabled.mockReturnValue(true);
    const onClose = vi.fn();
    render(<SmartOnboarding isOpen={true} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
