// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, React.FC>, {
    get: (_target, tag: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/reminders-service', () => ({
  remindersService: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/services/reminder-templates-service', () => ({
  reminderTemplatesService: {
    getTemplates: vi.fn().mockResolvedValue([]),
    extractVariables: vi.fn().mockReturnValue([]),
    applyTemplate: vi.fn().mockReturnValue({}),
    incrementUsage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/reminder-attachments-service', () => ({
  reminderAttachmentsService: {
    getAttachments: vi.fn().mockResolvedValue([]),
    uploadFile: vi.fn().mockResolvedValue({}),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
    getFileUrl: vi.fn().mockReturnValue('https://example.com/file'),
    isImage: vi.fn().mockReturnValue(false),
    getAttachmentIcon: vi.fn().mockReturnValue('📄'),
    formatFileSize: vi.fn().mockReturnValue('1 KB'),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: {
    children: React.ReactNode;
    isOpen: boolean;
    title: string;
    footer?: React.ReactNode;
  }) => isOpen ? (
    <div data-testid="modal">
      <h2>{title}</h2>
      {children}
      {footer}
    </div>
  ) : null,
}));

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/ui/DateTimePicker', () => ({
  DateTimePicker: ({ value, onChange, label }: {
    value: string;
    onChange: (v: string) => void;
    label?: string;
  }) => (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    />
  ),
}));

// UserPicker and TemplatePicker and AttachmentList/Uploader mocked to avoid deep deps
vi.mock('@/components/reminders/UserPicker', () => ({
  UserPicker: () => <div data-testid="user-picker" />,
}));

vi.mock('@/components/reminders/TemplatePicker', () => ({
  TemplatePicker: () => <div data-testid="template-picker" />,
}));

vi.mock('@/components/reminders/AttachmentList', () => ({
  AttachmentList: () => <div data-testid="attachment-list" />,
}));

vi.mock('@/components/reminders/AttachmentUploader', () => ({
  AttachmentUploader: () => <div data-testid="attachment-uploader" />,
}));

import { NewReminderModal } from '@/components/reminders/NewReminderModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
  spaceId: 'space-1',
};

describe('NewReminderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<NewReminderModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the modal title for new reminder', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByText('New Reminder')).toBeTruthy();
  });

  it('renders the title input field', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByText('Reminder Title *')).toBeTruthy();
  });

  it('renders the description textarea', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByText('Description')).toBeTruthy();
  });

  it('renders category buttons', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByText('Bills')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('renders the template button for new reminders', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByText('Start from a template')).toBeTruthy();
  });

  it('renders Cancel and Create Reminder buttons', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Create Reminder')).toBeTruthy();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<NewReminderModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<NewReminderModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  // Regression for BUG-2 (June 2026 QA sweep): submitting with an empty date
  // used to send remind_at=null → silent 400 → modal closed with no error and
  // no reminder created. The form must now block submit + show the requirement.
  it('BUG-2: blocks submit and shows an error when the date is empty', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<NewReminderModal {...defaultProps} onSave={onSave} />);

    // Submit the form without selecting a date. (Submit the <form> directly: the
    // Modal mock renders the footer submit button outside the form, and jsdom's
    // form-attribute association doesn't reliably fire requestSubmit on click.)
    const form = container.querySelector('#new-reminder-form') as HTMLFormElement;
    fireEvent.submit(form);

    // onSave must NOT be called (no null remind_at sent to the DB)...
    expect(onSave).not.toHaveBeenCalled();
    // ...and the user must see why.
    expect(screen.getByText('Please select a date and time')).toBeTruthy();
  });

  it('renders "Edit Reminder" title when editing', () => {
    const editReminder = {
      id: 'r-1',
      space_id: 'space-1',
      title: 'Existing Reminder',
      description: 'desc',
      emoji: '🔔',
      category: 'personal',
      reminder_time: '',
      priority: 'medium',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(<NewReminderModal {...defaultProps} editReminder={editReminder as never} />);
    expect(screen.getByText('Edit Reminder')).toBeTruthy();
    expect(screen.getByText('Save Changes')).toBeTruthy();
  });

  it('renders the user picker', () => {
    render(<NewReminderModal {...defaultProps} />);
    expect(screen.getByTestId('user-picker')).toBeTruthy();
  });
});
