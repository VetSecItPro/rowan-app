// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@radix-ui/react-progress', () => ({
  Root: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: number }>(
    ({ className, value, children, ...props }, ref) => (
      <div ref={ref} className={className} data-testid="progress-root" role="progressbar" aria-valuenow={value} {...props}>
        {children}
      </div>
    )
  ),
  Indicator: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <div className={className} data-testid="progress-indicator" style={style} />
  ),
}));

import { vi } from 'vitest';
import { Progress } from '@/components/ui/progress';

describe('Progress', () => {
  it('renders without crashing', () => {
    const { container } = render(<Progress value={50} />);
    expect(container).toBeDefined();
  });

  it('renders progress root element', () => {
    const { getByTestId } = render(<Progress value={50} />);
    expect(getByTestId('progress-root')).toBeDefined();
  });

  it('renders indicator element', () => {
    const { getByTestId } = render(<Progress value={75} />);
    expect(getByTestId('progress-indicator')).toBeDefined();
  });

  it('applies value to transform style', () => {
    const { getByTestId } = render(<Progress value={25} />);
    const indicator = getByTestId('progress-indicator');
    expect(indicator.style.transform).toBe('translateX(-75%)');
  });

  it('handles 0 value', () => {
    const { getByTestId } = render(<Progress value={0} />);
    const indicator = getByTestId('progress-indicator');
    expect(indicator.style.transform).toBe('translateX(-100%)');
  });

  it('handles 100 value', () => {
    const { getByTestId } = render(<Progress value={100} />);
    const indicator = getByTestId('progress-indicator');
    expect(indicator.style.transform).toBe('translateX(-0%)');
  });

  it('applies custom className', () => {
    const { getByTestId } = render(<Progress value={50} className="my-progress" />);
    expect(getByTestId('progress-root').className).toContain('my-progress');
  });
});
