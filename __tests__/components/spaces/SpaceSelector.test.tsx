// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SpaceSelector } from '@/components/spaces/SpaceSelector';
import type { Space } from '@/lib/types';

type SpaceWithRole = Space & { role: string };

const mockSpaces: SpaceWithRole[] = [
  { id: 'space-1', name: 'Johnson Family', role: 'admin', created_at: '2026-01-01', created_by: 'user-1' },
  { id: 'space-2', name: 'Work Projects', role: 'member', created_at: '2026-01-01', created_by: 'user-1' },
];

const singleSpace: SpaceWithRole[] = [
  { id: 'space-1', name: 'Johnson Family', role: 'admin', created_at: '2026-01-01', created_by: 'user-1' },
];

describe('SpaceSelector', () => {
  const defaultProps = {
    spaces: mockSpaces,
    currentSpace: mockSpaces[0],
    onSpaceChange: vi.fn(),
    onCreateSpace: vi.fn(),
    onInvitePartner: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SpaceSelector {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows current space name when multiple spaces', () => {
    render(<SpaceSelector {...defaultProps} />);
    expect(screen.getByText('Johnson Family')).toBeTruthy();
  });

  it('renders as static display when only one space', () => {
    render(
      <SpaceSelector
        {...defaultProps}
        spaces={singleSpace}
        currentSpace={singleSpace[0]}
      />
    );
    expect(screen.getByText('Johnson Family')).toBeTruthy();
  });

  it('opens dropdown when button is clicked with multiple spaces', () => {
    render(<SpaceSelector {...defaultProps} />);
    // Find the button that shows current space name
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(screen.getByText('Your Spaces')).toBeTruthy();
  });

  it('shows all spaces in dropdown', () => {
    render(<SpaceSelector {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByText('Johnson Family').length).toBeGreaterThan(0);
    expect(screen.getByText('Work Projects')).toBeTruthy();
  });

  it('shows Create New Space option in dropdown', () => {
    render(<SpaceSelector {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Create New Space')).toBeTruthy();
  });

  it('shows Invite to Space option when currentSpace exists', () => {
    render(<SpaceSelector {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Invite to Space')).toBeTruthy();
  });

  it('calls onCreateSpace when Create New Space is clicked', () => {
    const onCreateSpace = vi.fn();
    render(<SpaceSelector {...defaultProps} onCreateSpace={onCreateSpace} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Create New Space'));
    expect(onCreateSpace).toHaveBeenCalled();
  });

  it('calls onInvitePartner when Invite to Space is clicked', () => {
    const onInvitePartner = vi.fn();
    render(<SpaceSelector {...defaultProps} onInvitePartner={onInvitePartner} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Invite to Space'));
    expect(onInvitePartner).toHaveBeenCalled();
  });

  it('calls onSpaceChange when a different space is selected', () => {
    const onSpaceChange = vi.fn();
    render(<SpaceSelector {...defaultProps} onSpaceChange={onSpaceChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Work Projects'));
    expect(onSpaceChange).toHaveBeenCalledWith(mockSpaces[1]);
  });

  it('accepts header variant prop', () => {
    const { container } = render(
      <SpaceSelector {...defaultProps} variant="header" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows No Space when currentSpace is null and no spaces', () => {
    render(
      <SpaceSelector
        {...defaultProps}
        spaces={mockSpaces}
        currentSpace={null}
      />
    );
    expect(screen.getByText('No Space')).toBeTruthy();
  });
});
