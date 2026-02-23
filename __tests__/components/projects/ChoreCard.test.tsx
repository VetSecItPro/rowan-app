// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoreCard } from '@/components/projects/ChoreCard';
import type { Chore } from '@/lib/types';

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => 'Jan 15'),
}));

const baseChore: Chore = {
  id: 'chore-1',
  space_id: 'space-1',
  title: 'Wash dishes',
  description: 'Clean all the dishes',
  status: 'pending',
  frequency: 'daily',
  assigned_to: null,
  due_date: '2026-01-15',
  completion_percentage: 0,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ChoreCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders chore title', () => {
    render(<ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Wash dishes')).toBeTruthy();
  });

  it('renders chore description', () => {
    render(<ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Clean all the dishes')).toBeTruthy();
  });

  it('renders frequency', () => {
    render(<ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('daily')).toBeTruthy();
  });

  it('calls onStatusChange when toggle button is clicked', () => {
    const onStatusChange = vi.fn();
    render(<ChoreCard chore={baseChore} onStatusChange={onStatusChange} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/toggle chore status/i));
    expect(onStatusChange).toHaveBeenCalledWith('chore-1', 'completed');
  });

  it('applies line-through for completed chore', () => {
    render(
      <ChoreCard chore={{ ...baseChore, status: 'completed' }} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    const title = screen.getByText('Wash dishes');
    expect(title.className).toContain('line-through');
  });

  it('renders progress bar when completion_percentage > 0', () => {
    const { container } = render(
      <ChoreCard chore={{ ...baseChore, completion_percentage: 50 }} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(screen.getByText('50%')).toBeTruthy();
    expect(container.querySelector('[style*="width: 50%"]')).toBeTruthy();
  });

  it('opens options menu with Edit and Delete', () => {
    render(<ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Chore options menu'));
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onEdit when Edit is selected', () => {
    const onEdit = vi.fn();
    render(<ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Chore options menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(baseChore);
  });

  it('calls onDelete when Delete is selected', () => {
    const onDelete = vi.fn();
    render(<ChoreCard chore={baseChore} onStatusChange={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Chore options menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('chore-1');
  });
});
