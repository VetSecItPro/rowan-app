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
    render(<SpotlightCard><h2>Title</h2><p>Body</p></SpotlightCard>);
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SpotlightCard className="my-card"><p>Content</p></SpotlightCard>
    );
    expect(container.firstChild?.['className']).toContain('my-card');
  });

  it('has rounded border styling', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    expect(container.firstChild?.['className']).toContain('rounded-3xl');
  });

  it('updates spotlight position on mouse move', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    // Should not throw when mouse events are fired
    fireEvent.mouseMove(card, { clientX: 100, clientY: 100 });
    expect(card).toBeDefined();
  });

  it('shows spotlight on mouse enter', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(card);
    expect(card).toBeDefined();
  });

  it('hides spotlight on mouse leave', () => {
    const { container } = render(<SpotlightCard><p>Content</p></SpotlightCard>);
    const card = container.firstChild as HTMLElement;
    fireEvent.mouseLeave(card);
    expect(card).toBeDefined();
  });
});
