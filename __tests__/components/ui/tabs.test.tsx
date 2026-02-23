// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

describe('Tabs', () => {
  const defaultProps = {
    value: 'tab1',
    onValueChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <Tabs {...defaultProps}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByText('Tab 1')).toBeDefined();
  });

  it('renders all tab triggers', () => {
    render(
      <Tabs {...defaultProps}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByText('Tab 1')).toBeDefined();
    expect(screen.getByText('Tab 2')).toBeDefined();
  });

  it('calls onValueChange when tab is clicked', () => {
    render(
      <Tabs {...defaultProps}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab 2'));
    expect(defaultProps.onValueChange).toHaveBeenCalled();
  });

  it('applies data-value attribute with active tab', () => {
    const { container } = render(
      <Tabs value="tab1" onValueChange={vi.fn()}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const tabsRoot = container.firstChild as HTMLElement;
    expect(tabsRoot.getAttribute('data-value')).toBe('tab1');
  });
});

describe('TabsTrigger', () => {
  it('renders as a button', () => {
    render(
      <Tabs value="t1" onValueChange={vi.fn()}>
        <TabsList>
          <TabsTrigger value="t1">Tab</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole('button', { name: 'Tab' })).toBeDefined();
  });

  it('calls onValueChange when clicked', () => {
    const onValueChange = vi.fn();
    render(
      <Tabs value="t1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="t1">Tab 1</TabsTrigger>
          <TabsTrigger value="t2">Tab 2</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onValueChange).toHaveBeenCalled();
  });
});

describe('TabsContent', () => {
  it('renders content when currentValue matches value', () => {
    // Render TabsContent directly with matching currentValue and value
    render(
      <TabsContent value="active" currentValue="active">
        Active content
      </TabsContent>
    );
    expect(screen.getByText('Active content')).toBeDefined();
  });

  it('does not render when currentValue does not match value', () => {
    const { container } = render(
      <TabsContent value="inactive" currentValue="active">
        Inactive content
      </TabsContent>
    );
    expect(container.firstChild).toBeNull();
  });
});
