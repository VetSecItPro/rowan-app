// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from '@/components/ui/dialog';

describe('Dialog', () => {
  it('renders children', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <div>Dialog child</div>
      </Dialog>
    );
    expect(screen.getByText('Dialog child')).toBeDefined();
  });

  it('sets data-state to open when open is true', () => {
    const { container } = render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <div />
      </Dialog>
    );
    expect((container.firstChild as HTMLElement).getAttribute('data-state')).toBe('open');
  });

  it('sets data-state to closed when open is false', () => {
    const { container } = render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <div />
      </Dialog>
    );
    expect((container.firstChild as HTMLElement).getAttribute('data-state')).toBe('closed');
  });
});

describe('DialogTrigger', () => {
  it('renders a button', () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Open' })).toBeDefined();
  });

  it('calls onOpenChange when clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe('DialogContent', () => {
  it('renders when open is true', () => {
    render(
      <Dialog open={true} onOpenChange={vi.fn()}>
        <DialogContent>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('does not render when open is false', () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()}>
        <DialogContent>
          <p>Hidden</p>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onOpenChange when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('DialogHeader', () => {
  it('renders children', () => {
    render(<DialogHeader><h2>Header</h2></DialogHeader>);
    expect(screen.getByText('Header')).toBeDefined();
  });
});

describe('DialogFooter', () => {
  it('renders children', () => {
    render(<DialogFooter><button>Confirm</button></DialogFooter>);
    expect(screen.getByText('Confirm')).toBeDefined();
  });
});

describe('DialogTitle', () => {
  it('renders text', () => {
    render(<DialogTitle>My Title</DialogTitle>);
    expect(screen.getByText('My Title')).toBeDefined();
  });
});

describe('DialogDescription', () => {
  it('renders text', () => {
    render(<DialogDescription>Description text</DialogDescription>);
    expect(screen.getByText('Description text')).toBeDefined();
  });
});

describe('DialogOverlay', () => {
  it('renders when open is true', () => {
    const { container } = render(<DialogOverlay open={true} onOpenChange={vi.fn()} />);
    expect(container.firstChild).toBeDefined();
  });

  it('does not render when open is false', () => {
    const { container } = render(<DialogOverlay open={false} onOpenChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
