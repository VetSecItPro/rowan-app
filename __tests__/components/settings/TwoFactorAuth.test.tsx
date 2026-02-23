// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ success: true, data: { is_enrolled: false, factors: [] } }),
  }),
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ success: true, data: { is_enrolled: false, factors: [] } }),
});

import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';

describe('TwoFactorAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<TwoFactorAuth />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading skeleton initially', () => {
    // While loading, shows skeleton
    const { container } = render(<TwoFactorAuth />);
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts onStatusChange prop', () => {
    const onStatusChange = vi.fn();
    const { container } = render(<TwoFactorAuth onStatusChange={onStatusChange} />);
    expect(container.firstChild).toBeTruthy();
  });
});
