// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetTabBar } from '@/components/budget/BudgetTabBar';

const mockPush = vi.fn();
const mockUsePathname = vi.fn(() => '/budget');

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: () => mockUsePathname(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: object, tag: string) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as keyof JSX.IntrinsicElements, props as React.HTMLAttributes<HTMLElement>, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('BudgetTabBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/budget');
  });

  it('renders without crashing', () => {
    render(<BudgetTabBar />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders all budget tabs', () => {
    render(<BudgetTabBar />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Vendors')).toBeInTheDocument();
  });

  it('marks Overview tab as active on /budget path', () => {
    render(<BudgetTabBar />);
    const overviewTab = screen.getByRole('tab', { name: 'Overview section' });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  it('marks other tabs as inactive on /budget path', () => {
    render(<BudgetTabBar />);
    const billsTab = screen.getByRole('tab', { name: 'Bills section' });
    expect(billsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('navigates to correct route when tab clicked', () => {
    render(<BudgetTabBar />);
    fireEvent.click(screen.getByText('Bills'));
    expect(mockPush).toHaveBeenCalledWith('/budget/bills');
  });

  it('navigates to Goals when clicked', () => {
    render(<BudgetTabBar />);
    fireEvent.click(screen.getByText('Goals'));
    expect(mockPush).toHaveBeenCalledWith('/budget/goals');
  });

  it('renders 5 tab buttons', () => {
    render(<BudgetTabBar />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(5);
  });

  it('marks bills tab active when on /budget/bills path', () => {
    mockUsePathname.mockReturnValue('/budget/bills');
    render(<BudgetTabBar />);
    const billsTab = screen.getByRole('tab', { name: 'Bills section' });
    expect(billsTab).toHaveAttribute('aria-selected', 'true');
  });
});
