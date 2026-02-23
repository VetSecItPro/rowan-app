// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoreCard } from '@/components/household/ChoreCard';
import type { Chore } from '@/lib/types';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const makeChore = (overrides: Partial<Chore> = {}): Chore => ({
  id: 'chore-1',
  space_id: 'space-1',
  title: 'Wash dishes',
  description: 'Do the kitchen dishes',
  frequency: 'daily',
  status: 'pending',
  due_date: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  assigned_to: null,
  ...overrides,
});

describe('ChoreCard', () => {
  const onStatusChange = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const chore = makeChore();
    const { container } = render(
      <ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('displays chore title', () => {
    const chore = makeChore({ title: 'Vacuum the floor' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Vacuum the floor')).toBeTruthy();
  });

  it('displays chore description when provided', () => {
    const chore = makeChore({ description: 'Use the big vacuum' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Use the big vacuum')).toBeTruthy();
  });

  it('displays chore frequency', () => {
    const chore = makeChore({ frequency: 'weekly' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('weekly')).toBeTruthy();
  });

  it('calls onStatusChange when status button is clicked', () => {
    const chore = makeChore({ status: 'pending' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    const allButtons = screen.getAllByRole('button');
    // First button is the status toggle
    fireEvent.click(allButtons[0]);
    expect(onStatusChange).toHaveBeenCalledWith('chore-1', 'in-progress');
  });

  it('cycles status from in-progress to blocked', () => {
    const chore = makeChore({ status: 'in-progress' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    const allButtons = screen.getAllByRole('button');
    fireEvent.click(allButtons[0]);
    expect(onStatusChange).toHaveBeenCalledWith('chore-1', 'blocked');
  });

  it('cycles status from completed back to pending', () => {
    const chore = makeChore({ status: 'completed' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    const allButtons = screen.getAllByRole('button');
    fireEvent.click(allButtons[0]);
    expect(onStatusChange).toHaveBeenCalledWith('chore-1', 'pending');
  });

  it('applies line-through style when chore is completed', () => {
    const chore = makeChore({ status: 'completed', title: 'Done chore' });
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    const title = screen.getByText('Done chore');
    expect(title.className).toContain('line-through');
  });

  it('opens the options menu when more-options button is clicked', () => {
    const chore = makeChore();
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    const menuBtn = screen.getByLabelText('Chore options menu');
    fireEvent.click(menuBtn);
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onEdit when edit option is clicked', () => {
    const chore = makeChore();
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Chore options menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(chore);
  });

  it('calls onDelete when delete option is clicked', () => {
    const chore = makeChore();
    render(<ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Chore options menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('chore-1');
  });

  it('renders without description when not provided', () => {
    const chore = makeChore({ description: '' });
    const { container } = render(
      <ChoreCard chore={chore} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(container.firstChild).not.toBeNull();
  });
});
