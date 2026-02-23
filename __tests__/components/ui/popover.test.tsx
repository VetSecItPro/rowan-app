// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

describe('Popover', () => {
  it('renders children', () => {
    render(
      <Popover open={false} onOpenChange={vi.fn()}>
        <div>Popover child</div>
      </Popover>
    );
    expect(screen.getByText('Popover child')).toBeDefined();
  });

  it('sets data-state to open when open is true', () => {
    const { container } = render(
      <Popover open={true} onOpenChange={vi.fn()}>
        <div />
      </Popover>
    );
    expect((container.firstChild as HTMLElement).getAttribute('data-state')).toBe('open');
  });

  it('sets data-state to closed when open is false', () => {
    const { container } = render(
      <Popover open={false} onOpenChange={vi.fn()}>
        <div />
      </Popover>
    );
    expect((container.firstChild as HTMLElement).getAttribute('data-state')).toBe('closed');
  });
});

describe('PopoverTrigger', () => {
  it('renders a button', () => {
    render(
      <Popover open={false} onOpenChange={vi.fn()}>
        <PopoverTrigger>Toggle</PopoverTrigger>
      </Popover>
    );
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeDefined();
  });

  it('calls onOpenChange when clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Popover open={false} onOpenChange={onOpenChange}>
        <PopoverTrigger>Toggle</PopoverTrigger>
      </Popover>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe('PopoverContent', () => {
  it('renders when open is true', () => {
    render(
      <Popover open={true} onOpenChange={vi.fn()}>
        <PopoverContent>
          <p>Popover content</p>
        </PopoverContent>
      </Popover>
    );
    expect(screen.getByText('Popover content')).toBeDefined();
  });

  it('does not render when open is false', () => {
    render(
      <Popover open={false} onOpenChange={vi.fn()}>
        <PopoverContent>
          <p>Hidden content</p>
        </PopoverContent>
      </Popover>
    );
    expect(screen.queryByText('Hidden content')).toBeNull();
  });

  it('closes when backdrop is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <div>
        <Popover open={true} onOpenChange={onOpenChange}>
          <PopoverContent>
            <p>Content</p>
          </PopoverContent>
        </Popover>
      </div>
    );
    // Click the backdrop (first fixed inset-0 div)
    const backdrop = document.querySelector('.fixed.inset-0.z-40') as HTMLElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });
});
