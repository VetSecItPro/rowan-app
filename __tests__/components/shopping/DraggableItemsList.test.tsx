// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr: unknown[]) => arr),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticMedium: vi.fn(),
  hapticLight: vi.fn(),
}));

vi.mock('@/lib/constants/shopping-categories', () => ({
  getCategoryIcon: vi.fn((cat: string) => `icon-${cat}`),
  getCategoryLabel: vi.fn((cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1)),
}));

vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { DraggableItemsList } from '@/components/shopping/DraggableItemsList';
import type { ShoppingItem } from '@/lib/services/shopping-service';

const mockItems: ShoppingItem[] = [
  {
    id: 'item-1',
    list_id: 'list-1',
    name: 'Milk',
    quantity: 1,
    checked: false,
    category: 'dairy',
    sort_order: 0,
    created_at: '2026-01-01',
  },
  {
    id: 'item-2',
    list_id: 'list-1',
    name: 'Bread',
    quantity: 2,
    checked: true,
    category: 'bakery',
    sort_order: 1,
    created_at: '2026-01-01',
  },
];

describe('DraggableItemsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <DraggableItemsList
        items={mockItems}
        onReorder={vi.fn()}
        onToggleItem={vi.fn()}
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders DndContext', () => {
    render(
      <DraggableItemsList
        items={mockItems}
        onReorder={vi.fn()}
        onToggleItem={vi.fn()}
      />
    );
    expect(screen.getByTestId('dnd-context')).toBeTruthy();
  });

  it('renders item names', () => {
    render(
      <DraggableItemsList
        items={mockItems}
        onReorder={vi.fn()}
        onToggleItem={vi.fn()}
      />
    );
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Bread')).toBeTruthy();
  });

  it('renders items grouped by category', () => {
    render(
      <DraggableItemsList
        items={mockItems}
        onReorder={vi.fn()}
        onToggleItem={vi.fn()}
      />
    );
    // Should render category labels
    expect(screen.getByText('Dairy')).toBeTruthy();
    expect(screen.getByText('Bakery')).toBeTruthy();
  });

  it('renders empty state with no items', () => {
    const { container } = render(
      <DraggableItemsList
        items={[]}
        onReorder={vi.fn()}
        onToggleItem={vi.fn()}
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows quantity when greater than 1', () => {
    render(
      <DraggableItemsList
        items={mockItems}
        onReorder={vi.fn()}
        onToggleItem={vi.fn()}
      />
    );
    expect(screen.getByText('Qty: 2')).toBeTruthy();
  });
});
