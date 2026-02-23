// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainContent } from '@/components/layout/MainContent';

describe('MainContent', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MainContent>
        <div>Test content</div>
      </MainContent>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders children', () => {
    render(
      <MainContent>
        <div>Hello World</div>
      </MainContent>
    );
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders a main element with id main-content', () => {
    render(
      <MainContent>
        <p>Content</p>
      </MainContent>
    );
    const main = document.getElementById('main-content');
    expect(main).toBeTruthy();
    expect(main?.tagName.toLowerCase()).toBe('main');
  });

  it('renders multiple children', () => {
    render(
      <MainContent>
        <div>First</div>
        <div>Second</div>
        <div>Third</div>
      </MainContent>
    );
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByText('Third')).toBeTruthy();
  });

  it('has flex-1 class for layout', () => {
    render(
      <MainContent>
        <div>Content</div>
      </MainContent>
    );
    const main = document.getElementById('main-content');
    expect(main?.className).toContain('flex-1');
  });
});
