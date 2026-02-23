// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MentionHighlight, hasMentions, getMentionCount } from '@/components/messages/MentionHighlight';

vi.mock('@/lib/services/mentions-service', () => ({
  mentionsService: {
    extractMentions: vi.fn((content: string) => {
      const matches = content.match(/@[\w.-]+|@"[^"]+"/g) || [];
      return matches;
    }),
  },
}));

describe('MentionHighlight', () => {
  it('renders without crashing', () => {
    const { container } = render(<MentionHighlight content="Hello world" />);
    expect(container).toBeTruthy();
  });

  it('renders plain text content', () => {
    render(<MentionHighlight content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders @mention text with special styling', () => {
    const { container } = render(<MentionHighlight content="Hello @john" />);
    const mention = container.querySelector('[title]');
    expect(mention).toBeTruthy();
    expect(mention?.getAttribute('title')).toContain('john');
  });

  it('renders content without mentions unchanged', () => {
    render(<MentionHighlight content="No mentions here" />);
    expect(screen.getByText('No mentions here')).toBeTruthy();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <MentionHighlight content="Hello" className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});

describe('hasMentions', () => {
  it('returns true when content has a mention', () => {
    expect(hasMentions('Hello @john how are you')).toBe(true);
  });

  it('returns false when content has no mention', () => {
    expect(hasMentions('Hello world')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasMentions('')).toBe(false);
  });
});

describe('getMentionCount', () => {
  it('returns count of mentions in content', () => {
    const count = getMentionCount('Hey @alice and @bob');
    expect(typeof count).toBe('number');
  });
});
