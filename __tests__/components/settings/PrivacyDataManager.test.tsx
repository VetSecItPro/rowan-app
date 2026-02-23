// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ success: true, data: {} }),
  }),
}));

vi.mock('@/components/ui/Toggle', () => ({
  Toggle: ({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      data-testid={`toggle-${id}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    />
  ),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({
    success: true,
    data: {
      ccpa_do_not_sell: false,
      analytics_enabled: true,
      marketing_emails: false,
    },
  }),
});

import { PrivacyDataManager } from '@/components/settings/PrivacyDataManager';

describe('PrivacyDataManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<PrivacyDataManager />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading spinner initially', () => {
    const { container } = render(<PrivacyDataManager />);
    // Loading state renders an animated spinner element
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });
});
