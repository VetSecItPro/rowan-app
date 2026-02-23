// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })), usePathname: vi.fn(() => '/'), useSearchParams: vi.fn(() => new URLSearchParams()) }));
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: vi.fn(() => ({ user: { id: 'user-1' }, currentSpace: { id: 'space-1' }, session: null, loading: false, signOut: vi.fn() })), AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/services/categories-tags-service', () => ({
  getTags: vi.fn().mockResolvedValue([]),
  createTag: vi.fn().mockResolvedValue({ id: 'tag-1', name: 'New Tag' }),
  getExpenseTags: vi.fn().mockResolvedValue([]),
  addTagToExpense: vi.fn().mockResolvedValue({}),
  removeTagFromExpense: vi.fn().mockResolvedValue({}),
  getGoalTags: vi.fn().mockResolvedValue([]),
  addTagToGoal: vi.fn().mockResolvedValue({}),
  removeTagFromGoal: vi.fn().mockResolvedValue({}),
  getTaskTags: vi.fn().mockResolvedValue([]),
  addTagToTask: vi.fn().mockResolvedValue({}),
  removeTagFromTask: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => (c as string[]).filter(Boolean).join(' ') }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => React.createElement('button', { onClick }, children) }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children) }));
vi.mock('@/components/ui/popover', () => ({ Popover: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), PopoverContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), PopoverTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));
vi.mock('@/components/ui/command', () => ({ Command: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CommandEmpty: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CommandGroup: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props), CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => React.createElement('div', { onClick: onSelect }, children), CommandList: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h3', null, children) }));
vi.mock('@/components/ui/alert', () => ({ Alert: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), AlertDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));

import { TagManager } from '@/components/categories/TagManager';

describe('TagManager', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', async () => {
    render(React.createElement(TagManager, { itemId: 'item-1', itemType: 'task' }));
    await waitFor(() => { expect(document.body).toBeTruthy(); });
  });

  it('shows Add tags button or label', async () => {
    render(React.createElement(TagManager, { itemId: 'item-1', itemType: 'task' }));
    await waitFor(() => {
      // "Add tags" or "Add Tags" may appear multiple times - use getAllByText
      const addTagEls = screen.queryAllByText(/Add [Tt]ags/i);
      expect(addTagEls.length).toBeGreaterThan(0);
    });
  });

  it('shows existing tags', async () => {
    const { getTaskTags } = await import('@/lib/services/categories-tags-service');
    vi.mocked(getTaskTags).mockResolvedValueOnce([
      { id: 'tag-1', name: 'urgent', space_id: 'space-1', color: null, description: null, created_at: '2024-01-01' }
    ]);
    render(React.createElement(TagManager, { itemId: 'item-1', itemType: 'task' }));
    await waitFor(() => { expect(screen.getByText('urgent')).toBeTruthy(); });
  });
});
