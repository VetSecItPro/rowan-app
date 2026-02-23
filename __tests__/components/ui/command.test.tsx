// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';

describe('Command', () => {
  it('renders without crashing', () => {
    const { container } = render(<Command><div>content</div></Command>);
    expect(container.firstChild).toBeDefined();
  });

  it('renders children', () => {
    render(<Command><span>Command content</span></Command>);
    expect(screen.getByText('Command content')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<Command className="my-cmd"><div /></Command>);
    expect((container.firstChild as HTMLElement).className).toContain('my-cmd');
  });
});

describe('CommandInput', () => {
  it('renders without crashing', () => {
    render(<CommandInput placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeDefined();
  });

  it('calls onValueChange when input changes', () => {
    const onValueChange = vi.fn();
    render(<CommandInput onValueChange={onValueChange} placeholder="Search" />);
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'test' } });
    expect(onValueChange).toHaveBeenCalledWith('test');
  });
});

describe('CommandList', () => {
  it('renders children', () => {
    render(<CommandList><div>items</div></CommandList>);
    expect(screen.getByText('items')).toBeDefined();
  });
});

describe('CommandEmpty', () => {
  it('renders children', () => {
    render(<CommandEmpty>No results found.</CommandEmpty>);
    expect(screen.getByText('No results found.')).toBeDefined();
  });
});

describe('CommandGroup', () => {
  it('renders children', () => {
    render(<CommandGroup><div>Group items</div></CommandGroup>);
    expect(screen.getByText('Group items')).toBeDefined();
  });

  it('renders heading when provided', () => {
    render(<CommandGroup heading="Suggestions"><div>item</div></CommandGroup>);
    expect(screen.getByText('Suggestions')).toBeDefined();
  });
});

describe('CommandItem', () => {
  it('renders without crashing', () => {
    render(<CommandItem>Item label</CommandItem>);
    expect(screen.getByText('Item label')).toBeDefined();
  });

  it('calls onSelect with value when clicked', () => {
    const onSelect = vi.fn();
    render(<CommandItem value="test-value" onSelect={onSelect}>Click me</CommandItem>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onSelect).toHaveBeenCalledWith('test-value');
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<CommandItem value="val" onSelect={onSelect} disabled>Disabled</CommandItem>);
    fireEvent.click(screen.getByText('Disabled'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('CommandSeparator', () => {
  it('renders without crashing', () => {
    const { container } = render(<CommandSeparator />);
    expect(container.firstChild).toBeDefined();
  });
});
