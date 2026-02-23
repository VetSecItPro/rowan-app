// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { Separator } from '@/components/ui/separator';

describe('Separator', () => {
  it('renders without crashing', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders horizontal by default', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild?.['className']).toContain('h-[1px] w-full');
  });

  it('renders vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild?.['className']).toContain('h-full w-[1px]');
  });

  it('applies custom className', () => {
    const { container } = render(<Separator className="my-separator" />);
    expect(container.firstChild?.['className']).toContain('my-separator');
  });

  it('has role=none when decorative (default)', () => {
    const { container } = render(<Separator decorative={true} />);
    expect(container.firstChild?.getAttribute('role')).toBe('none');
  });

  it('has role=separator when not decorative', () => {
    const { container } = render(<Separator decorative={false} />);
    expect(container.firstChild?.getAttribute('role')).toBe('separator');
  });
});
