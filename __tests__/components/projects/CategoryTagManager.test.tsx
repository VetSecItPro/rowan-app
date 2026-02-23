// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// The actual service path is 'categories-tags-service' (plural)
vi.mock('@/lib/services/categories-tags-service', () => ({
  getCustomCategories: vi.fn().mockResolvedValue([
    { id: 'cat-1', name: 'Travel', icon: 'Globe', color: '#3b82f6', space_id: 'space-1', created_by: 'user-1' },
  ]),
  getTags: vi.fn().mockResolvedValue([
    { id: 'tag-1', name: 'vacation', space_id: 'space-1', created_by: 'user-1' },
  ]),
  createCustomCategory: vi.fn().mockResolvedValue({ id: 'cat-2', name: 'Work' }),
  updateCustomCategory: vi.fn().mockResolvedValue(undefined),
  deleteCustomCategory: vi.fn().mockResolvedValue(undefined),
  createTag: vi.fn().mockResolvedValue({ id: 'tag-2', name: 'business' }),
  deleteTag: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('CategoryTagManager', () => {
  it('renders without crashing', async () => {
    const { CategoryTagManager } = await import('@/components/projects/CategoryTagManager');
    const { container } = render(
      <CategoryTagManager spaceId="space-1" userId="user-1" onClose={vi.fn()} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders Categories heading', async () => {
    const { CategoryTagManager } = await import('@/components/projects/CategoryTagManager');
    render(<CategoryTagManager spaceId="space-1" userId="user-1" onClose={vi.fn()} />);
    await waitFor(() => {
      // Use getAllByText since "Categories" may appear multiple times (tab + heading)
      const elements = screen.getAllByText(/categories/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('renders loaded category name', async () => {
    const { CategoryTagManager } = await import('@/components/projects/CategoryTagManager');
    render(<CategoryTagManager spaceId="space-1" userId="user-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Travel')).toBeTruthy();
    });
  });

  it('renders Tags section', async () => {
    const { CategoryTagManager } = await import('@/components/projects/CategoryTagManager');
    render(<CategoryTagManager spaceId="space-1" userId="user-1" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/tags/i)).toBeTruthy();
    });
  });

  it('renders loaded tag after switching to Tags tab', async () => {
    const { CategoryTagManager } = await import('@/components/projects/CategoryTagManager');
    render(<CategoryTagManager spaceId="space-1" userId="user-1" onClose={vi.fn()} />);
    // Wait for data to load, then click the Tags tab to see tags
    await waitFor(() => {
      // Tags tab button should appear with count
      const tagsTab = screen.getByText(/Tags/);
      expect(tagsTab).toBeTruthy();
      fireEvent.click(tagsTab);
    });
    await waitFor(() => {
      expect(screen.getByText('vacation')).toBeTruthy();
    });
  });
});
