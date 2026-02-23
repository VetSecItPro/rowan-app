// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticMedium: vi.fn(),
  hapticLight: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { DraggableTaskList } from '@/components/tasks/DraggableTaskList';

const mockTasks = [
  { id: 'task-1', title: 'First Task', status: 'pending', priority: 'high', sort_order: 0 },
  { id: 'task-2', title: 'Second Task', status: 'completed', priority: 'low', sort_order: 1 },
];

describe('DraggableTaskList', () => {
  const defaultProps = {
    spaceId: 'space-1',
    initialTasks: mockTasks,
    onTaskClick: vi.fn(),
    onStatusChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DraggableTaskList {...defaultProps} />);
    expect(screen.getByTestId('dnd-context')).toBeDefined();
  });

  it('renders task titles', () => {
    render(<DraggableTaskList {...defaultProps} />);
    expect(screen.getByText('First Task')).toBeDefined();
    expect(screen.getByText('Second Task')).toBeDefined();
  });

  it('shows empty state when no tasks', () => {
    render(<DraggableTaskList {...defaultProps} initialTasks={[]} />);
    expect(screen.getByText(/No tasks yet/)).toBeDefined();
  });

  it('renders drag handles', () => {
    render(<DraggableTaskList {...defaultProps} />);
    const handles = screen.getAllByTitle('Drag to reorder');
    expect(handles.length).toBe(2);
  });
});
