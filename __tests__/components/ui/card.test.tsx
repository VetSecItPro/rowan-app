// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('Card', () => {
  it('renders without crashing', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-card">Content</Card>);
    expect(container.firstChild?.['className']).toContain('my-card');
  });

  it('renders children', () => {
    render(<Card><p>Inner content</p></Card>);
    expect(screen.getByText('Inner content')).toBeDefined();
  });
});

describe('CardHeader', () => {
  it('renders without crashing', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeDefined();
  });
});

describe('CardTitle', () => {
  it('renders without crashing', () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByText('My Title')).toBeDefined();
  });

  it('renders as h3', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toBeDefined();
  });
});

describe('CardDescription', () => {
  it('renders without crashing', () => {
    render(<CardDescription>Some description</CardDescription>);
    expect(screen.getByText('Some description')).toBeDefined();
  });
});

describe('CardContent', () => {
  it('renders without crashing', () => {
    render(<CardContent>Content area</CardContent>);
    expect(screen.getByText('Content area')).toBeDefined();
  });
});

describe('CardFooter', () => {
  it('renders without crashing', () => {
    render(<CardFooter>Footer actions</CardFooter>);
    expect(screen.getByText('Footer actions')).toBeDefined();
  });
});

describe('Card composition', () => {
  it('renders full card composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
    expect(screen.getByText('Content')).toBeDefined();
    expect(screen.getByText('Footer')).toBeDefined();
  });
});
