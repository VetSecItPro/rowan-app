// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
  }),
}));

import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ChangePasswordForm />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Change Password heading', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByText('Change Password')).toBeTruthy();
  });

  it('renders current password field', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText('Current Password')).toBeTruthy();
  });

  it('renders new password field', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText('New Password')).toBeTruthy();
  });

  it('renders confirm new password field', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText('Confirm New Password')).toBeTruthy();
  });

  it('renders Update Password button', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByText('Update Password')).toBeTruthy();
  });

  it('submit button is disabled when fields are empty', () => {
    render(<ChangePasswordForm />);
    const button = screen.getByText('Update Password').closest('button')!;
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('shows password requirements when typing in new password field', () => {
    render(<ChangePasswordForm />);
    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: 'test' } });
    expect(screen.getByText('Password requirements:')).toBeTruthy();
  });

  it('shows all password requirement items', () => {
    render(<ChangePasswordForm />);
    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: 'Test1' } });
    expect(screen.getByText('At least 8 characters')).toBeTruthy();
    expect(screen.getByText('Contains uppercase letter')).toBeTruthy();
    expect(screen.getByText('Contains lowercase letter')).toBeTruthy();
    expect(screen.getByText('Contains a number')).toBeTruthy();
    expect(screen.getByText('Passwords match')).toBeTruthy();
  });

  it('toggles password visibility for current password', () => {
    render(<ChangePasswordForm />);
    const currentPasswordInput = screen.getByLabelText('Current Password');
    expect(currentPasswordInput.getAttribute('type')).toBe('password');
    // Find the eye toggle button for current password (first toggle button)
    const toggleButtons = screen.getAllByRole('button');
    fireEvent.click(toggleButtons[0]);
    expect(currentPasswordInput.getAttribute('type')).toBe('text');
  });
});
