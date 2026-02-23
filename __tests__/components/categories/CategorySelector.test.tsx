// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })), usePathname: vi.fn(() => '/'), useSearchParams: vi.fn(() => new URLSearchParams()) }));
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: vi.fn(() => ({ user: { id: 'user-1' }, currentSpace: { id: 'space-1' }, session: null, loading: false, signOut: vi.fn() })), AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/services/categories-tags-service', () => ({ getCustomCategories: vi.fn().mockResolvedValue([]), getTags: vi.fn().mockResolvedValue([]), createCustomCategory: vi.fn().mockResolvedValue({ id: 'new-cat', name: 'Custom' }), createTag: vi.fn().mockResolvedValue({ id: 'new-tag', name: 'Custom Tag' }) }));
vi.mock('@/lib/constants/default-categories', () => ({ getDefaultCategoriesForDomain: vi.fn().mockReturnValue([{ id: 'housing', name: 'Housing', icon: '🏠', color: '#6366F1' }]), findDefaultCategory: vi.fn().mockReturnValue(null), getCategoryIcon: vi.fn().mockReturnValue('🏠') }));
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => (c as string[]).filter(Boolean).join(' ') }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => React.createElement('button', { onClick }, children) }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children) }));
vi.mock('@/components/ui/input', () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props) }));
vi.mock('@/components/ui/label', () => ({ Label: ({ children }: { children: React.ReactNode }) => React.createElement('label', null, children) }));
vi.mock('@/components/ui/popover', () => ({ Popover: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), PopoverContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), PopoverTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));
vi.mock('@/components/ui/command', () => ({ Command: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CommandEmpty: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CommandGroup: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props), CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => React.createElement('div', { onClick: onSelect }, children), CommandList: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));
vi.mock('@/components/ui/dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));

import { CategorySelector } from '@/components/categories/CategorySelector';

describe('CategorySelector', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', async () => {
    render(React.createElement(CategorySelector, { onChange: vi.fn() }));
    await waitFor(() => { expect(document.body).toBeTruthy(); });
  });

  it('shows placeholder text', async () => {
    render(React.createElement(CategorySelector, { onChange: vi.fn(), placeholder: 'Select category...' }));
    await waitFor(() => { expect(screen.getByText('Select category...')).toBeTruthy(); });
  });

  it('shows empty state message when no categories', async () => {
    render(React.createElement(CategorySelector, { onChange: vi.fn() }));
    await waitFor(() => {
      // When no custom categories are loaded, shows "No categories found"
      expect(screen.getByText('No categories found')).toBeTruthy();
    });
  });
});
