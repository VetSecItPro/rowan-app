// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

import { VendorModal } from '@/components/vendors/VendorModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
};

describe('VendorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<VendorModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the "Add New Vendor" title', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Add New Vendor')).toBeTruthy();
  });

  it('renders the Name field', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('John Smith')).toBeTruthy();
  });

  it('renders the Company Name field', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Smith Construction LLC')).toBeTruthy();
  });

  it('renders the Trade/Specialty select', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Trade/Specialty')).toBeTruthy();
    expect(screen.getByText('Select a trade...')).toBeTruthy();
  });

  it('renders Email field', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('john@smithconstruction.com')).toBeTruthy();
  });

  it('renders Phone field', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('(555) 123-4567')).toBeTruthy();
  });

  it('renders the Cancel button', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders the Add Vendor submit button', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Add Vendor')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<VendorModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<VendorModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows validation error when name is empty on submit', () => {
    render(<VendorModal {...defaultProps} />);
    const form = document.getElementById('vendor-form');
    if (form) fireEvent.submit(form);
    expect(screen.getByText('Name is required')).toBeTruthy();
  });

  it('renders Edit Vendor title when editing', () => {
    const editVendor = {
      id: 'v-1',
      space_id: 'space-1',
      name: 'John Smith',
      company_name: 'Smith LLC',
      trade: 'Electrician',
      email: 'john@example.com',
      phone: '555-1234',
      address: '123 Main St',
      website: '',
      license_number: '',
      insurance_verified: false,
      rating: 4.5,
      notes: '',
      is_preferred: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(<VendorModal {...defaultProps} editVendor={editVendor as never} />);
    expect(screen.getByText('Edit Vendor')).toBeTruthy();
    expect(screen.getByText('Update Vendor')).toBeTruthy();
  });

  it('renders Insurance Verified checkbox', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Insurance Verified')).toBeTruthy();
  });

  it('renders Preferred Vendor checkbox', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Preferred Vendor')).toBeTruthy();
  });

  it('renders Active Vendor checkbox', () => {
    render(<VendorModal {...defaultProps} />);
    expect(screen.getByText('Active Vendor')).toBeTruthy();
  });
});
