// @vitest-environment jsdom
/**
 * Tests for LazyVisible (Phase 14): defers children until near the viewport.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LazyVisible } from '@/components/home/LazyVisible';

let intersectCb: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  intersectCb = null;
  observe.mockClear();
  disconnect.mockClear();
  // IntersectionObserver is constructed with `new`, so the stub must be a class.
  // @ts-expect-error - test stub
  global.IntersectionObserver = class {
    constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      intersectCb = cb;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
    takeRecords = vi.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  };
});

afterEach(() => { vi.restoreAllMocks(); });

describe('LazyVisible', () => {
  it('does not render children until intersecting', () => {
    render(<LazyVisible><p>Deferred content</p></LazyVisible>);
    expect(screen.queryByText('Deferred content')).toBeNull();
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('renders children once the section scrolls into view', () => {
    render(<LazyVisible><p>Deferred content</p></LazyVisible>);
    expect(screen.queryByText('Deferred content')).toBeNull();
    act(() => { intersectCb?.([{ isIntersecting: true }]); });
    expect(screen.getByText('Deferred content')).toBeDefined();
    // Once visible it stops observing (one-shot).
    expect(disconnect).toHaveBeenCalled();
  });

  it('renders immediately when IntersectionObserver is unavailable (graceful fallback)', () => {
    // @ts-expect-error - simulate old browser / SSR
    global.IntersectionObserver = undefined;
    render(<LazyVisible><p>Always content</p></LazyVisible>);
    expect(screen.getByText('Always content')).toBeDefined();
  });
});
