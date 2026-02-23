// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RichTextToolbar } from '@/components/messages/RichTextToolbar';

describe('RichTextToolbar', () => {
  const onFormatApplied = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithTextarea = (text = '') => {
    const ref = { current: null as HTMLTextAreaElement | null };
    const result = render(
      <div>
        <textarea ref={(el) => { ref.current = el; }} defaultValue={text} />
        <RichTextToolbar textareaRef={ref} onFormatApplied={onFormatApplied} />
      </div>
    );
    return result;
  };

  it('renders without crashing', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    const { container } = render(
      <RichTextToolbar textareaRef={ref} onFormatApplied={onFormatApplied} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders Bold button', () => {
    renderWithTextarea();
    expect(screen.getByTitle('Bold')).toBeTruthy();
  });

  it('renders Italic button', () => {
    renderWithTextarea();
    expect(screen.getByTitle('Italic')).toBeTruthy();
  });

  it('renders Code button', () => {
    renderWithTextarea();
    expect(screen.getByTitle('Code')).toBeTruthy();
  });

  it('renders Link button', () => {
    renderWithTextarea();
    expect(screen.getByTitle('Link')).toBeTruthy();
  });

  it('renders 4 format buttons', () => {
    renderWithTextarea();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);
  });

  it('calls onFormatApplied when Bold is clicked', () => {
    renderWithTextarea('Hello world');
    const boldBtn = screen.getByTitle('Bold');
    fireEvent.click(boldBtn);
    expect(onFormatApplied).toHaveBeenCalled();
  });

  it('calls onFormatApplied when Italic is clicked', () => {
    renderWithTextarea('Hello world');
    const italicBtn = screen.getByTitle('Italic');
    fireEvent.click(italicBtn);
    expect(onFormatApplied).toHaveBeenCalled();
  });

  it('inserts bold markdown when Bold button is clicked', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(
      <div>
        <textarea ref={(el) => { ref.current = el; }} defaultValue="" />
        <RichTextToolbar textareaRef={ref} onFormatApplied={onFormatApplied} />
      </div>
    );
    const boldBtn = screen.getByTitle('Bold');
    fireEvent.click(boldBtn);
    if (ref.current) {
      expect(ref.current.value).toContain('**');
    }
  });

  it('does not crash when textareaRef is null', () => {
    const ref = { current: null };
    const { container } = render(
      <RichTextToolbar textareaRef={ref} onFormatApplied={onFormatApplied} />
    );
    const boldBtn = screen.getByTitle('Bold');
    fireEvent.click(boldBtn);
    expect(container.firstChild).not.toBeNull();
  });
});
