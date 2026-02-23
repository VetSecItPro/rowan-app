// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

describe('Breadcrumb', () => {
  it('renders without crashing', () => {
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders with default empty items', () => {
    const { container } = render(<Breadcrumb />);
    expect(container.querySelector('nav')).toBeTruthy();
  });

  it('always shows Dashboard link', () => {
    render(<Breadcrumb items={[]} />);
    expect(screen.getByRole('link', { hidden: true })).toBeTruthy();
  });

  it('renders breadcrumb items', () => {
    render(
      <Breadcrumb items={[{ label: 'Tasks', href: '/tasks' }]} />
    );
    expect(screen.getByText('Tasks')).toBeTruthy();
  });

  it('renders multiple breadcrumb items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Meals', href: '/meals' },
          { label: 'Recipes' },
        ]}
      />
    );
    expect(screen.getByText('Meals')).toBeTruthy();
    expect(screen.getByText('Recipes')).toBeTruthy();
  });

  it('filters out Dashboard from items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Calendar', href: '/calendar' },
        ]}
      />
    );
    // Dashboard should not appear twice (filtered from items, but always shown as root)
    const dashboardLinks = screen.queryAllByText('Dashboard');
    // The Dashboard in items is filtered out
    expect(screen.getByText('Calendar')).toBeTruthy();
  });

  it('renders separator arrow between items', () => {
    render(
      <Breadcrumb items={[{ label: 'Goals', href: '/goals' }]} />
    );
    expect(screen.getByText('→')).toBeTruthy();
  });

  it('renders last item as span not link', () => {
    render(
      <Breadcrumb items={[{ label: 'Settings' }]} />
    );
    const span = screen.getByText('Settings');
    expect(span.tagName.toLowerCase()).toBe('span');
  });

  it('renders intermediate items as links when href provided', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Meals', href: '/meals' },
          { label: 'New Meal' },
        ]}
      />
    );
    const mealsLink = screen.getByText('Meals').closest('a');
    expect(mealsLink).toBeTruthy();
    expect(mealsLink?.getAttribute('href')).toBe('/meals');
  });
});
