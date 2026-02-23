// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ClientOnly } from '@/components/shared/ClientOnly';

describe('ClientOnly', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ClientOnly>
        <div>Client Content</div>
      </ClientOnly>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts a fallback prop', () => {
    const { container } = render(
      <ClientOnly fallback={<div>Loading...</div>}>
        <div>Client Content</div>
      </ClientOnly>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders children or fallback', () => {
    render(
      <ClientOnly fallback={<span>Fallback</span>}>
        <span>Content</span>
      </ClientOnly>
    );
    // Either fallback or content will be shown depending on mount state
    const text = document.body.textContent;
    expect(text === 'Fallback' || text === 'Content').toBe(true);
  });
});
