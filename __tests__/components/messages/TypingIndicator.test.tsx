// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from '@/components/messages/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders without crashing', () => {
    const { container } = render(<TypingIndicator />);
    expect(container).toBeTruthy();
  });

  it('shows default userName "Someone"', () => {
    render(<TypingIndicator />);
    expect(screen.getByText('Someone')).toBeTruthy();
  });

  it('shows provided userName', () => {
    render(<TypingIndicator userName="Alice" />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders animated dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
  });

  it('applies userColor to the username', () => {
    const { container } = render(<TypingIndicator userName="Bob" userColor="#FF0000" />);
    const nameEl = container.querySelector('p');
    expect(nameEl?.style.color).toBe('rgb(255, 0, 0)');
  });
});
