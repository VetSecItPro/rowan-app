'use client';

import { useState, useEffect } from 'react';
import { X, Star, Shield, Building2, Phone, Mail, MapPin, ExternalLink, User } from 'lucide-react';
import type { Vendor, CreateVendorInput } from '@/lib/services/project-tracking-service';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendor: CreateVendorInput) => Promise<void>;
  editVendor?: Vendor | null;
}

const commonTrades = [
  'General Contractor',
  'Electrician',
  'Plumber',
  'HVAC Technician',
  'Painter',
  'Carpenter',
  'Roofer',
  'Landscaper',
  'Flooring Specialist',
  'Kitchen & Bath',
  'Mason',
  'Insulation',
  'Drywall',
  'Tile & Stone',
  'Windows & Doors',
  'Security Systems',
  'Pool Service',
  'Appliance Repair',
  'Cleaning Service',
  'Pest Control',
  'Other'
];

export function VendorModal({ isOpen, onClose, onSave, editVendor }: VendorModalProps) {
  const [formData, setFormData] = useState<CreateVendorInput>({
    name: '',
    company_name: '',
    trade: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    license_number: '',
    insurance_verified: false,
    rating: undefined,
    notes: '',
    is_preferred: false,
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when editing
  useEffect(() => {
    if (editVendor) {
      setFormData({
        name: editVendor.name,
        company_name: editVendor.company_name || '',
        trade: editVendor.trade || '',
        email: editVendor.email || '',
        phone: editVendor.phone || '',
        address: editVendor.address || '',
        website: editVendor.website || '',
        license_number: editVendor.license_number || '',
        insurance_verified: editVendor.insurance_verified,
        rating: editVendor.rating || undefined,
        notes: editVendor.notes || '',
        is_preferred: editVendor.is_preferred,
        is_active: editVendor.is_active
      });
    } else {
      setFormData({
        name: '',
        company_name: '',
        trade: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        license_number: '',
        insurance_verified: false,
        rating: undefined,
        notes: '',
        is_preferred: false,
        is_active: true
      });
    }
    setErrors({});
  }, [editVendor, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    if (formData.rating !== undefined && (formData.rating < 1 || formData.rating > 5)) {
      newErrors.rating = 'Rating must be between 1 and 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save vendor:', error);
      setErrors({ general: 'Failed to save vendor. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CreateVendorInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editVendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="John Smith"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Smith Construction LLC"
              />
            </div>
          </div>

          {/* Trade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trade/Specialty
            </label>
            <select
              value={formData.trade}
              onChange={(e) => handleInputChange('trade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a trade...</option>
              {commonTrades.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="john@smithconstruction.com"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Address & Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <ExternalLink className="w-4 h-4 inline mr-1" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.website ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="https://smithconstruction.com"
            />
            {errors.website && <p className="text-red-600 text-sm mt-1">{errors.website}</p>}
          </div>

          {/* Professional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                License Number
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => handleInputChange('license_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="LIC123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Star className="w-4 h-4 inline mr-1" />
                Rating (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={formData.rating || ''}
                onChange={(e) => handleInputChange('rating', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.rating ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="4.5"
              />
              {errors.rating && <p className="text-red-600 text-sm mt-1">{errors.rating}</p>}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.insurance_verified}
                onChange={(e) => handleInputChange('insurance_verified', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Insurance Verified
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_preferred}
                onChange={(e) => handleInputChange('is_preferred', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Preferred Vendor
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Active Vendor
              </span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes about this vendor..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <SecondaryButton
              type="button"
              onClick={onClose}
              feature="projects"
            >
              Cancel
            </SecondaryButton>
            <CTAButton
              type="submit"
              disabled={saving}
              feature="projects"
              breathing
              ripple
              icon={editVendor ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            >
              {saving ? 'Saving...' : editVendor ? 'Update Vendor' : 'Add Vendor'}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}