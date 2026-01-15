'use client';

import { Bold, Italic, Code, Link2 } from 'lucide-react';
import { RefObject } from 'react';

interface RichTextToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onFormatApplied?: () => void;
}

export function RichTextToolbar({ textareaRef, onFormatApplied }: RichTextToolbarProps) {
  const insertFormatting = (before: string, after: string, placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      textarea.value.substring(0, start) +
      before +
      textToInsert +
      after +
      textarea.value.substring(end);

    textarea.value = newText;

    // Set cursor position after inserted formatting
    const newCursorPos = start + before.length + textToInsert.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();

    // Trigger input event to update React state
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);

    onFormatApplied?.();
  };

  const buttons = [
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => insertFormatting('**', '**', 'bold text'),
    },
    {
      icon: Italic,
      label: 'Italic',
      onClick: () => insertFormatting('*', '*', 'italic text'),
    },
    {
      icon: Code,
      label: 'Code',
      onClick: () => insertFormatting('`', '`', 'code'),
    },
    {
      icon: Link2,
      label: 'Link',
      onClick: () => insertFormatting('[', '](url)', 'link text'),
    },
  ];

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 border-b border-gray-700">
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          onClick={button.onClick}
          className="p-2 rounded-md text-gray-400 hover:bg-gray-700 transition-colors active:scale-95"
          title={button.label}
          aria-label={button.label}
        >
          <button.icon className="w-4 h-4" />
        </button>
      ))}
      <div className="flex-1" />
      <span className="text-xs text-gray-400">
        Markdown supported
      </span>
    </div>
  );
}
