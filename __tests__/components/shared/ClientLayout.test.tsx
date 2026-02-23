// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ClientLayout } from '@/components/shared/ClientLayout';

describe('ClientLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ClientLayout>
        <div>Test</div>
      </ClientLayout>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders its children', () => {
    render(
      <ClientLayout>
        <div>Hello World</div>
      </ClientLayout>
    );
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders multiple children', () => {
    render(
      <ClientLayout>
        <span>Child A</span>
        <span>Child B</span>
      </ClientLayout>
    );
    expect(screen.getByText('Child A')).toBeTruthy();
    expect(screen.getByText('Child B')).toBeTruthy();
  });
});
