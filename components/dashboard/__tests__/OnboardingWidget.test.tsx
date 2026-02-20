/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWidget } from '../OnboardingWidget';

// Mock framer-motion
jest.mock('framer-motion', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionDiv = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  MotionDiv.displayName = 'MotionDiv';
  const MockPresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockPresence.displayName = 'AnimatePresence';
  return { motion: { div: MotionDiv }, AnimatePresence: MockPresence };
});

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockLink = ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

describe('OnboardingWidget', () => {
  const STORAGE_KEY = 'rowan_onboarding_progress';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should render the widget for new users', () => {
    render(<OnboardingWidget />);

    expect(screen.getByText(/Quick Start/i)).toBeInTheDocument();
    expect(screen.getByText(/You're on your 14-day Pro trial/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 5 complete/i)).toBeInTheDocument();
  });

  it('should display all 5 onboarding steps', () => {
    render(<OnboardingWidget />);

    expect(screen.getByText(/Create your first task/i)).toBeInTheDocument();
    expect(screen.getByText(/Set up a chore rotation/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a calendar event/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a shopping list/i)).toBeInTheDocument();
    expect(screen.getByText(/Invite your household/i)).toBeInTheDocument();
  });

  it('should mark a step as completed when clicked', async () => {
    render(<OnboardingWidget />);

    const taskLink = screen.getByText(/Create your first task/i).closest('a');
    fireEvent.click(taskLink!);

    await waitFor(() => {
      expect(screen.getByText(/1 of 5 complete/i)).toBeInTheDocument();
    });

    // Verify localStorage was updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.completedSteps).toContain('create-task');
  });

  it('should dismiss the widget when X button is clicked', async () => {
    const { container } = render(<OnboardingWidget />);

    const dismissButton = screen.getByLabelText(/Dismiss onboarding/i);
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(container.querySelector('.bg-gradient-to-br')).not.toBeInTheDocument();
    });

    // Verify localStorage was updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.dismissed).toBe(true);
  });

  it('should not render if user has completed 3 or more steps', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedSteps: ['create-task', 'setup-chore', 'add-event'],
        dismissed: false,
      })
    );

    const { container } = render(<OnboardingWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render if dismissed', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedSteps: [],
        dismissed: true,
      })
    );

    const { container } = render(<OnboardingWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('should calculate progress percentage correctly', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedSteps: ['create-task', 'setup-chore'],
        dismissed: false,
      })
    );

    render(<OnboardingWidget />);

    expect(screen.getByText(/2 of 5 complete/i)).toBeInTheDocument();
    expect(screen.getByText(/40%/i)).toBeInTheDocument();
  });

  it('should persist state across re-renders', () => {
    const { rerender } = render(<OnboardingWidget />);

    const taskLink = screen.getByText(/Create your first task/i).closest('a');
    fireEvent.click(taskLink!);

    rerender(<OnboardingWidget />);

    expect(screen.getByText(/1 of 5 complete/i)).toBeInTheDocument();
  });

  it('should load existing progress from localStorage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedSteps: ['create-task'],
        dismissed: false,
      })
    );

    render(<OnboardingWidget />);

    expect(screen.getByText(/1 of 5 complete/i)).toBeInTheDocument();
    expect(screen.getByText(/20%/i)).toBeInTheDocument();
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json');

    render(<OnboardingWidget />);

    // Should render as if no progress exists
    expect(screen.getByText(/0 of 5 complete/i)).toBeInTheDocument();
  });
});
