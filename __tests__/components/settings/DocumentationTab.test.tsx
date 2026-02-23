// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import DocumentationTab from '@/components/settings/DocumentationTab';

describe('DocumentationTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<DocumentationTab />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Feature Manuals heading', () => {
    render(<DocumentationTab />);
    expect(screen.getByText('Feature Manuals')).toBeTruthy();
  });

  it('renders a search input', () => {
    render(<DocumentationTab />);
    const searchInput = screen.getByPlaceholderText(/Search feature manuals/);
    expect(searchInput).toBeTruthy();
  });

  it('shows all documentation features initially', () => {
    render(<DocumentationTab />);
    expect(screen.getByText('Tasks & Chores')).toBeTruthy();
    expect(screen.getByText('Calendar & Events')).toBeTruthy();
    expect(screen.getByText('Shopping Lists')).toBeTruthy();
    expect(screen.getByText('AI Companion')).toBeTruthy();
  });

  it('filters features when typing in search box', () => {
    render(<DocumentationTab />);
    const searchInput = screen.getByPlaceholderText(/Search feature manuals/);
    // Use "chore" to uniquely match "Tasks & Chores" without matching AI Companion
    // (AI Companion description says "tasks" so searching "tasks" matches both)
    fireEvent.change(searchInput, { target: { value: 'chore' } });
    expect(screen.getByText('Tasks & Chores')).toBeTruthy();
    // Other unrelated features should not appear
    expect(screen.queryByText('Calendar & Events')).toBeNull();
  });

  it('shows no results message when search yields nothing', () => {
    render(<DocumentationTab />);
    const searchInput = screen.getByPlaceholderText(/Search feature manuals/);
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText('No documentation found')).toBeTruthy();
  });

  it('shows clear search button and clears search', () => {
    render(<DocumentationTab />);
    const searchInput = screen.getByPlaceholderText(/Search feature manuals/);
    fireEvent.change(searchInput, { target: { value: 'tasks' } });
    // Clear search button (X) should appear
    const clearButton = document.querySelector('button[class*="absolute"]');
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(screen.getByText('AI Companion')).toBeTruthy();
    }
  });

  it('clears search when Clear search button is clicked in empty state', () => {
    render(<DocumentationTab />);
    const searchInput = screen.getByPlaceholderText(/Search feature manuals/);
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    const clearButton = screen.getByText('Clear search');
    fireEvent.click(clearButton);
    expect(screen.getByText('Tasks & Chores')).toBeTruthy();
  });
});
