'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Star,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  Edit3,
  Trash2,
  Shield,
  MapPin,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { VendorModal } from '@/components/vendors/VendorModal';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  getVendors,
  getPreferredVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorSpendSummary,
  type Vendor,
  type CreateVendorInput
} from '@/lib/services/project-tracking-service';

interface VendorWithSpend extends Vendor {
  totalSpent?: number;
  projectCount?: number;
}

interface VendorStats {
  total: number;
  preferred: number;
  active: number;
  totalSpend: number;
}

export default function VendorManagementPage() {
  const { currentSpace, user } = useAuth();

  const [vendors, setVendors] = useState<VendorWithSpend[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    total: 0,
    preferred: 0,
    active: 0,
    totalSpend: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load vendors and stats
  const loadVendorData = useCallback(async () => {
    if (!currentSpace) return;

    try {
      setLoading(true);
      setError(null);

      const vendorData = await getVendors(currentSpace.id);

      // Enhance vendors with spend data
      const enhancedVendors = await Promise.all(
        vendorData.map(async (vendor) => {
          try {
            const spendData = await getVendorSpendSummary(vendor.id);
            return {
              ...vendor,
              totalSpent: spendData?.total_spent || 0,
              projectCount: spendData?.project_count || 0
            };
          } catch {
            return {
              ...vendor,
              totalSpent: 0,
              projectCount: 0
            };
          }
        })
      );

      setVendors(enhancedVendors);

      // Calculate stats
      const total = enhancedVendors.length;
      const preferred = enhancedVendors.filter(v => v.is_preferred).length;
      const active = enhancedVendors.filter(v => v.is_active).length;
      const totalSpend = enhancedVendors.reduce((sum, v) => sum + (v.totalSpent || 0), 0);

      setStats({ total, preferred, active, totalSpend });
    } catch (err) {
      console.error('Failed to load vendors:', err);
      setError('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentSpace]);

  useEffect(() => {
    loadVendorData();
  }, [loadVendorData]);

  // Handle vendor creation
  const handleCreateVendor = async (vendorData: CreateVendorInput) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await createVendor({
        ...vendorData,
        space_id: currentSpace!.id,
        created_by: user.id
      });
      await loadVendorData();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create vendor:', error);
      throw error;
    }
  };

  // Handle vendor editing
  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowCreateModal(true);
  };

  // Handle vendor update
  const handleUpdateVendor = async (vendorData: CreateVendorInput) => {
    if (!editingVendor) return;

    try {
      await updateVendor(editingVendor.id, vendorData);
      await loadVendorData();
      setShowCreateModal(false);
      setEditingVendor(null);
    } catch (error) {
      console.error('Failed to update vendor:', error);
      throw error;
    }
  };

  // Handle vendor deletion
  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteVendor(vendorId);
      await loadVendorData();
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      setError('Failed to delete vendor. Please try again.');
    }
  };

  // Filter vendors
  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = searchQuery === '' ||
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.trade?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTrade = tradeFilter === 'all' || vendor.trade === tradeFilter;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'preferred' && vendor.is_preferred) ||
      (statusFilter === 'active' && vendor.is_active) ||
      (statusFilter === 'inactive' && !vendor.is_active);

    return matchesSearch && matchesTrade && matchesStatus;
  });

  // Get unique trades for filter
  const trades = Array.from(new Set(vendors.map(v => v.trade).filter(Boolean))).sort();

  if (!currentSpace) {
    return (
      <FeatureLayout
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Budget', href: '/projects?tab=budgets' },
          { label: 'Vendors' },
        ]}
      >
        <div className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Please select a space to continue</p>
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget', href: '/projects?tab=budgets' },
        { label: 'Vendors' },
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Vendor Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Manage your contractors, suppliers, and service providers all in one place
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vendors</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.preferred}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Preferred</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.active}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</h3>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${stats.totalSpend.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spend</h3>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Trade Filter */}
                <select
                  value={tradeFilter}
                  onChange={(e) => setTradeFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  <option value="all">All Trades</option>
                  {trades.map((trade) => (
                    <option key={trade} value={trade || ''}>
                      {trade}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="preferred">Preferred</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Add Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Vendor
              </button>
            </div>
          </div>

          {/* Vendors List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading vendors...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {vendors.length === 0 ? 'No Vendors Yet' : 'No Vendors Found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {vendors.length === 0
                  ? 'Get started by adding your first vendor'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {vendors.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Vendor
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onEdit={handleEditVendor}
                  onDelete={handleDeleteVendor}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Vendor Modal */}
      <VendorModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingVendor(null);
        }}
        onSave={editingVendor ? handleUpdateVendor : handleCreateVendor}
        editVendor={editingVendor}
      />
    </FeatureLayout>
  );
}

// Vendor Card Component
interface VendorCardProps {
  vendor: VendorWithSpend;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendorId: string) => void;
}

function VendorCard({ vendor, onEdit, onDelete }: VendorCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {vendor.name}
            </h3>
            {vendor.is_preferred && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
            {!vendor.is_active && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                Inactive
              </span>
            )}
          </div>

          {vendor.company_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="truncate">{vendor.company_name}</span>
            </div>
          )}

          {vendor.trade && (
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
              {vendor.trade}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(vendor)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Edit vendor"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(vendor.id)}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete vendor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {vendor.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            <span>{vendor.phone}</span>
          </div>
        )}

        {vendor.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4" />
            <span className="truncate">{vendor.email}</span>
          </div>
        )}

        {vendor.address && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{vendor.address}</span>
          </div>
        )}

        {vendor.website && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <ExternalLink className="w-4 h-4" />
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline truncate"
            >
              {vendor.website}
            </a>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Total Spend: </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${(vendor.totalSpent || 0).toLocaleString()}
          </span>
        </div>

        {vendor.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {vendor.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Insurance Badge */}
      {vendor.insurance_verified && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">
            Insurance Verified
          </span>
        </div>
      )}
    </div>
  );
}