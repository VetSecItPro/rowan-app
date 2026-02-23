// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Tooltip } from '@/components/shared/Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders its children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Trigger button</button>
      </Tooltip>
    );
    expect(screen.getByText('Trigger button')).toBeTruthy();
  });

  it('does not show tooltip content by default (hidden on mount)', () => {
    render(
      <Tooltip content="Hidden tooltip">
        <button>Hover me</button>
      </Tooltip>
    );
    // Tooltip content is hidden by default (requires hover)
    expect(screen.queryByText('Hidden tooltip')).toBeNull();
  });

  it('accepts position prop', () => {
    const { container } = render(
      <Tooltip content="Right tooltip" position="right">
        <button>Trigger</button>
      </Tooltip>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts delay prop', () => {
    const { container } = render(
      <Tooltip content="Delayed tooltip" delay={500}>
        <button>Trigger</button>
      </Tooltip>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(
      <Tooltip content="Styled tooltip" className="custom-class">
        <button>Trigger</button>
      </Tooltip>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders trigger as inline-block', () => {
    const { container } = render(
      <Tooltip content="Test">
        <span>Trigger</span>
      </Tooltip>
    );
    const wrapper = container.querySelector('.inline-block');
    expect(wrapper).toBeTruthy();
  });

  it('supports all position variants', () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const;
    positions.forEach((position) => {
      const { container } = render(
        <Tooltip content="Test" position={position}>
          <button>Trigger</button>
        </Tooltip>
      );
      expect(container.firstChild).toBeTruthy();
    });
  });
});
