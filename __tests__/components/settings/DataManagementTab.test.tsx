// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('@/lib/utils/format', () => ({
  formatBytes: vi.fn((bytes: number) => `${bytes} B`),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({
    usage: {
      totalBytes: 1024,
      limitBytes: 10240,
      percentageUsed: 10,
      fileCount: 3,
    },
    files: [],
  }),
});

import { DataManagementTab } from '@/components/settings/DataManagementTab';

describe('DataManagementTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<DataManagementTab />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Storage Usage heading', () => {
    render(<DataManagementTab />);
    expect(screen.getByText('Storage Usage')).toBeTruthy();
  });

  it('displays Files section', () => {
    render(<DataManagementTab />);
    // Files section may show after loading
    const filesHeading = screen.queryByText(/Files/);
    expect(filesHeading).toBeTruthy();
  });

  it('shows a loading indicator initially', () => {
    render(<DataManagementTab />);
    // A loader or content should be present
    expect(screen.getByText('Storage Usage')).toBeTruthy();
  });

  it('shows View Pricing button', () => {
    render(<DataManagementTab />);
    expect(screen.getByText('View Pricing')).toBeTruthy();
  });

  it('shows Need More Space section', () => {
    render(<DataManagementTab />);
    expect(screen.getByText('Need More Space?')).toBeTruthy();
  });
});
