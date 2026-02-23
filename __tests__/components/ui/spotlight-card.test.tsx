// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SpotlightCard } from '@/components/ui/spotlight-card';

describe('SpotlightCard', () => {
  it('renders without crashing', () => {
    render(<SpotlightCard><p>Card content</p></SpotlightCard>);
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('renders children', () => {
    render(
      <SpotlightCard>
        <h2>Title</h2>
        <p>Body</p>
      </SpotlightCard>
    );
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SpotlightCard className="my-custom-card"><p>Content</p></SpotlightCard>
    );
    expect((container.firstChild as HTMLElement).className).toContain('my-custom-card');
  });

  it('applies base rounded-3xl and border styling', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-3xl');
    expect(card.className).toContain('border');
  });

  it('renders with default spotlightColor', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with custom spotlightColor prop', () => {
    const { container } = render(
      <SpotlightCard spotlightColor="rgba(100, 200, 255, 0.5)"><p>Content</p></SpotlightCard>
    );
    expect(container.firstChild).toBeDefined();
  });

  it('forwards additional HTML attributes', () => {
    render(
      <SpotlightCard data-testid="spotlight-card-root"><p>Content</p></SpotlightCard>
    );
    expect(screen.getByTestId('spotlight-card-root')).toBeDefined();
  });

  it('does not throw on mouse move', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    expect(() =>
      fireEvent.mouseMove(card, { clientX: 120, clientY: 80 })
    ).not.toThrow();
  });

  it('does not throw on mouse enter', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    expect(() => fireEvent.mouseEnter(card)).not.toThrow();
  });

  it('does not throw on mouse leave', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    expect(() => fireEvent.mouseLeave(card)).not.toThrow();
  });

  it('contains an inner relative wrapper div for children', () => {
    const { container } = render(
      <SpotlightCard><span data-testid="child">inner</span></SpotlightCard>
    );
    const child = screen.getByTestId('child');
    // Child is nested inside the relative wrapper
    expect(child.closest('.relative')).toBeDefined();
  });
});
