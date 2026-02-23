// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

import { Breadcrumbs } from '@/components/admin/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders without crashing', () => {
    const { container } = render(<Breadcrumbs currentPage="Users" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Admin Dashboard link text', () => {
    render(<Breadcrumbs currentPage="Users" />);
    expect(screen.getByText('Admin Dashboard')).toBeTruthy();
  });

  it('displays the current page name', () => {
    render(<Breadcrumbs currentPage="Users" />);
    expect(screen.getByText('Users')).toBeTruthy();
  });

  it('displays the current page name for different values', () => {
    render(<Breadcrumbs currentPage="Analytics" />);
    expect(screen.getByText('Analytics')).toBeTruthy();
  });

  it('navigates to admin dashboard when clicked', () => {
    render(<Breadcrumbs currentPage="Users" />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('renders a chevron separator', () => {
    const { container } = render(<Breadcrumbs currentPage="Revenue" />);
    // ChevronRight icon from lucide renders as an SVG
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
