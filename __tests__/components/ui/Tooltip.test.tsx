// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Tooltip } from '@/components/ui/Tooltip';

describe('Tooltip', () => {
  it('renders without crashing', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText('Hover me')).toBeDefined();
  });

  it('renders children', () => {
    render(
      <Tooltip content="Help text">
        <span>Trigger</span>
      </Tooltip>
    );
    expect(screen.getByText('Trigger')).toBeDefined();
  });

  it('does not show tooltip initially', () => {
    render(
      <Tooltip content="Hidden tooltip">
        <button>Trigger</button>
      </Tooltip>
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip on mouse enter', () => {
    render(
      <Tooltip content="Visible tooltip">
        <button>Trigger</button>
      </Tooltip>
    );
    const container = screen.getByText('Trigger').closest('div')!;
    fireEvent.mouseEnter(container);
    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(screen.getByText('Visible tooltip')).toBeDefined();
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Tooltip">
        <button>Trigger</button>
      </Tooltip>
    );
    const container = screen.getByText('Trigger').closest('div')!;
    fireEvent.mouseEnter(container);
    expect(screen.getByRole('tooltip')).toBeDefined();
    fireEvent.mouseLeave(container);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip on focus', () => {
    render(
      <Tooltip content="Focus tooltip">
        <button>Trigger</button>
      </Tooltip>
    );
    const container = screen.getByText('Trigger').closest('div')!;
    fireEvent.focus(container);
    expect(screen.getByRole('tooltip')).toBeDefined();
  });

  it('does not show tooltip when content is empty', () => {
    render(
      <Tooltip content="">
        <button>Trigger</button>
      </Tooltip>
    );
    const container = screen.getByText('Trigger').closest('div')!;
    fireEvent.mouseEnter(container);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
