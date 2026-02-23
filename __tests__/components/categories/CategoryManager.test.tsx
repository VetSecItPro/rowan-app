// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })), usePathname: vi.fn(() => '/'), useSearchParams: vi.fn(() => new URLSearchParams()) }));
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: vi.fn(() => ({ user: { id: 'user-1' }, currentSpace: { id: 'space-1' }, session: null, loading: false, signOut: vi.fn() })), AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/lib/services/categories-tags-service', () => ({ getCustomCategories: vi.fn().mockResolvedValue([]), getTags: vi.fn().mockResolvedValue([]), createCustomCategory: vi.fn().mockResolvedValue({}), deleteCustomCategory: vi.fn().mockResolvedValue({}), createTag: vi.fn().mockResolvedValue({}), deleteTag: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/constants/default-categories', () => ({ getDefaultCategoriesForDomain: vi.fn().mockReturnValue([{ id: 'housing', name: 'Housing', icon: '🏠', color: '#6366F1' }]) }));
vi.mock('@/lib/utils', () => ({ cn: (...c: unknown[]) => (c as string[]).filter(Boolean).join(' ') }));
vi.mock('@/components/ui/card', () => ({ Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h3', null, children), CardDescription: ({ children }: { children: React.ReactNode }) => React.createElement('p', null, children) }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => React.createElement('button', { onClick }, children) }));
vi.mock('@/components/ui/input', () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props) }));
vi.mock('@/components/ui/label', () => ({ Label: ({ children }: { children: React.ReactNode }) => React.createElement('label', null, children) }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => React.createElement('textarea', props) }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children) }));
vi.mock('@/components/ui/tabs', () => ({ Tabs: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), TabsContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), TabsList: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => React.createElement('button', { 'data-value': value }, children) }));
vi.mock('@/components/ui/dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));
vi.mock('@/components/ui/select', () => ({ Select: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), SelectItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), SelectTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), SelectValue: () => React.createElement('span') }));
vi.mock('@/components/ui/alert', () => ({ Alert: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children), AlertDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children) }));

import { CategoryManager } from '@/components/categories/CategoryManager';

describe('CategoryManager', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', async () => {
    render(React.createElement(CategoryManager));
    await waitFor(() => { expect(screen.getByText('Categories')).toBeTruthy(); });
  });

  it('shows default categories', async () => {
    render(React.createElement(CategoryManager));
    await waitFor(() => {
      // Housing may appear multiple times (default + custom section) - use getAllByText
      const housingEls = screen.getAllByText('Housing');
      expect(housingEls.length).toBeGreaterThan(0);
    });
  });

  it('shows Tags tab when showTags is true', async () => {
    render(React.createElement(CategoryManager, { showTags: true }));
    await waitFor(() => { expect(screen.getByText('Tags')).toBeTruthy(); });
  });
});
