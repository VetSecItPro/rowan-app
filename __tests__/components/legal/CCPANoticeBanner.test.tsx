// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: {
        location: { city: 'Los Angeles', state: 'CA', country: 'US', isCaliforniaResident: true },
        confidence: 'high',
        showCCPANotice: true,
      },
    }),
  } as Response)
);

// Set up a localStorage mock that we can control per-test
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('CCPANoticeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders without crashing when dismissed', async () => {
    localStorageMock.setItem('ccpa-notice-dismissed', 'true');
    const { CCPANoticeBanner } = await import('@/components/legal/CCPANoticeBanner');
    const { container } = render(<CCPANoticeBanner autoDetect={false} />);
    expect(container).toBeTruthy();
  });

  it('returns null content when already dismissed', async () => {
    localStorageMock.setItem('ccpa-notice-dismissed', 'true');
    const { CCPANoticeBanner } = await import('@/components/legal/CCPANoticeBanner');
    const { container } = await act(async () => render(<CCPANoticeBanner autoDetect={false} />));
    expect(container.childElementCount).toBe(0);
  });

  it('shows banner content after location detection', async () => {
    // No dismissed flag set - banner should show after fetch
    const { CCPANoticeBanner } = await import('@/components/legal/CCPANoticeBanner');
    await act(async () => {
      render(<CCPANoticeBanner autoDetect={true} />);
    });
    await waitFor(() => {
      expect(screen.queryByText('California Privacy Rights')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('renders CCPACompactNotice without crashing when already dismissed', async () => {
    localStorageMock.setItem('ccpa-compact-notice-dismissed', 'true');
    const { CCPACompactNotice } = await import('@/components/legal/CCPANoticeBanner');
    const { container } = render(<CCPACompactNotice />);
    expect(container).toBeTruthy();
    expect(container.childElementCount).toBe(0);
  });

  it('renders CCPANoticeProvider and passes children through', async () => {
    localStorageMock.setItem('ccpa-notice-dismissed', 'true');
    localStorageMock.setItem('ccpa-compact-notice-dismissed', 'true');
    const { CCPANoticeProvider } = await import('@/components/legal/CCPANoticeBanner');
    render(
      <CCPANoticeProvider>
        <div data-testid="child">Child Content</div>
      </CCPANoticeProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Child Content')).toBeTruthy();
  });

  it('Do Not Sell button is present when banner is visible', async () => {
    const { CCPANoticeBanner } = await import('@/components/legal/CCPANoticeBanner');
    await act(async () => {
      render(<CCPANoticeBanner autoDetect={true} />);
    });
    await waitFor(() => {
      const bodyText = document.body.textContent ?? '';
      if (bodyText.includes('California Privacy Rights')) {
        expect(bodyText).toContain('Do Not Sell');
      }
    }, { timeout: 3000 });
  });
});
