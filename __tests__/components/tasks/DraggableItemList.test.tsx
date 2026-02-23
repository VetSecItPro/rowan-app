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
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ error: null }),
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
  TouchSensor: vi.fn(),
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

import { DraggableItemList } from '@/components/tasks/DraggableItemList';

const mockItems = [
  { id: 'item-1', title: 'Task 1', status: 'pending', priority: 'medium', sort_order: 0, type: 'task' as const },
  { id: 'item-2', title: 'Chore 1', status: 'completed', priority: 'low', sort_order: 1, type: 'chore' as const },
];

describe('DraggableItemList', () => {
  const defaultProps = {
    spaceId: 'space-1',
    initialItems: mockItems,
    onItemsReorder: vi.fn(),
    onStatusChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DraggableItemList {...defaultProps} />);
    expect(screen.getByTestId('dnd-context')).toBeDefined();
  });

  it('renders item titles', () => {
    render(<DraggableItemList {...defaultProps} />);
    expect(screen.getByText('Task 1')).toBeDefined();
    expect(screen.getByText('Chore 1')).toBeDefined();
  });

  it('shows empty state when no items', () => {
    render(<DraggableItemList {...defaultProps} initialItems={[]} />);
    expect(screen.getByText(/No tasks or chores yet/)).toBeDefined();
  });

  it('renders task type badge', () => {
    render(<DraggableItemList {...defaultProps} />);
    expect(screen.getByText('Task')).toBeDefined();
    expect(screen.getByText('Chore')).toBeDefined();
  });
});
