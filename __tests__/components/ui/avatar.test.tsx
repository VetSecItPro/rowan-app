// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@radix-ui/react-avatar', () => ({
  Root: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={className} data-testid="avatar-root" {...props} />
  ),
  Image: React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
    ({ className, src, alt, ...props }, ref) => <img ref={ref} className={className} src={src} alt={alt} data-testid="avatar-image" {...props} />
  ),
  Fallback: React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => <span ref={ref} className={className} data-testid="avatar-fallback" {...props} />
  ),
}));

import { vi } from 'vitest';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

describe('Avatar', () => {
  it('renders without crashing', () => {
    render(<Avatar />);
    expect(screen.getByTestId('avatar-root')).toBeDefined();
  });

  it('renders AvatarImage', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
      </Avatar>
    );
    expect(screen.getByTestId('avatar-image')).toBeDefined();
  });

  it('renders AvatarFallback with initials', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<Avatar className="custom-avatar" />);
    expect(screen.getByTestId('avatar-root').className).toContain('custom-avatar');
  });
});
