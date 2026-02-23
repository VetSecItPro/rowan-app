// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    currentSpace: null,
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({})),
      })),
    })),
    removeChannel: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { SpaceMembersIndicator } from '@/components/shared/SpaceMembersIndicator';

describe('SpaceMembersIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when currentSpace is null', () => {
    const { container } = render(<SpaceMembersIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing', () => {
    const { container } = render(<SpaceMembersIndicator />);
    // With null space, renders null which is fine
    expect(container).toBeTruthy();
  });
});
