'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  Package,
  Calculator,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ProjectLineItem } from '@/lib/services/project-tracking-service';

interface CostBreakdownItem {
  category: string;
  item_count: number;
  total_estimated: number;
  total_actual: number;
}

interface ProjectLineItemsProps {
  projectId: string;
  lineItems: ProjectLineItem[];
  costBreakdown: CostBreakdownItem[];
  onRefresh: () => void;
}

export function ProjectLineItems({
  lineItems,
  costBreakdown,
}: ProjectLineItemsProps) {
  const [editingItem, setEditingItem] = useState<ProjectLineItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'category' | 'cost' | 'date'>('category');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Calculate totals
  const totalEstimated = lineItems.reduce((sum, item) => sum + item.estimated_cost, 0);
  const totalActual = lineItems.reduce((sum, item) => sum + item.actual_cost, 0);
  const totalPaid = lineItems.filter(item => item.is_paid).reduce((sum, item) => sum + item.actual_cost, 0);
  const totalUnpaid = lineItems.filter(item => !item.is_paid).reduce((sum, item) => sum + item.estimated_cost, 0);

  const variance = totalActual - totalEstimated;
  const variancePercentage = totalEstimated > 0 ? (variance / totalEstimated) * 100 : 0;

  // Get unique categories
  const categories = Array.from(new Set(lineItems.map(item => item.category))).sort();

  // Filter and sort items
  const filteredItems = lineItems.filter(item =>
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'category':
        aValue = a.category;
        bValue = b.category;
        break;
      case 'cost':
        aValue = a.estimated_cost;
        bValue = b.estimated_cost;
        break;
      case 'date':
        aValue = a.created_at;
        bValue = b.created_at;
        break;
      default:
        aValue = a.category;
        bValue = b.category;
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleMarkPaid = async (itemId: string) => {
    // TODO: Implement mark as paid functionality
    logger.info('Mark item as paid:', { component: 'ProjectLineItems', data: itemId });
  };

  const handleEditItem = (item: ProjectLineItem) => {
    setEditingItem(item);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this line item?')) {
      // TODO: Implement delete functionality
      logger.info('Delete item:', { component: 'ProjectLineItems', data: itemId });
    }
  };

  const handleAddItem = () => {
    logger.info('Add line item requested', { component: 'ProjectLineItems' });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Estimated Total</span>
          </div>
          <p className="text-xl font-bold text-blue-100">
            ${totalEstimated.toLocaleString()}
          </p>
        </div>

        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">Paid</span>
          </div>
          <p className="text-xl font-bold text-green-100">
            ${totalPaid.toLocaleString()}
          </p>
        </div>

        <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-300">Unpaid</span>
          </div>
          <p className="text-xl font-bold text-orange-100">
            ${totalUnpaid.toLocaleString()}
          </p>
        </div>

        <div className={`border rounded-xl p-4 ${
          variance >= 0
            ? 'bg-green-900/20 border-green-800'
            : 'bg-red-900/20 border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {variance >= 0 ? (
              <TrendingDown className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${
              variance >= 0
                ? 'text-green-300'
                : 'text-red-300'
            }`}>
              Variance
            </span>
          </div>
          <p className={`text-xl font-bold ${
            variance >= 0
              ? 'text-green-100'
              : 'text-red-100'
          }`}>
            {variance >= 0 ? '-' : '+'}${Math.abs(variance).toLocaleString()}
          </p>
          <p className={`text-xs ${
            variance >= 0
              ? 'text-green-400'
              : 'text-red-400'
          }`}>
            {variancePercentage.toFixed(1)}% {variance >= 0 ? 'under' : 'over'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'category' | 'cost' | 'date')}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm"
          >
            <option value="category">Sort by Category</option>
            <option value="cost">Sort by Cost</option>
            <option value="date">Sort by Date</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm hover:bg-gray-600 transition-colors"
          >
            {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder.toUpperCase()}
          </button>
        </div>

        <button
          onClick={handleAddItem}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Line Item
        </button>
      </div>

      {/* Cost Breakdown by Category */}
      {costBreakdown.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Cost Breakdown by Category
          </h3>
          <div className="space-y-3">
            {costBreakdown.map((category) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-white">
                    {category.category}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({category.item_count} items)
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    ${category.total_actual.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    Est: ${category.total_estimated.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line Items List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Line Items
            </h3>
            <span className="text-sm text-gray-400">
              {sortedItems.length} of {lineItems.length} items
            </span>
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">
              {selectedCategory === 'all' ? 'No line items yet' : `No items in ${selectedCategory}`}
            </p>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {sortedItems.map((item) => {
              const isEditing = editingItem?.id === item.id;
              return (
              <div
                key={item.id}
                className={`p-6 transition-colors ${
                  isEditing ? 'bg-blue-900/10' : 'hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        item.is_paid
                          ? 'bg-green-900/30'
                          : 'bg-orange-900/30'
                      }`}>
                        {item.is_paid ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">
                          {item.description}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                            {item.category}
                          </span>
                          {item.quantity > 1 && (
                            <span>Qty: {item.quantity}</span>
                          )}
                          {item.unit_price && (
                            <span>Unit: ${item.unit_price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-sm text-gray-400 mt-2 ml-11">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        ${item.actual_cost > 0 ? item.actual_cost.toFixed(2) : item.estimated_cost.toFixed(2)}
                      </div>
                      {item.actual_cost > 0 && item.actual_cost !== item.estimated_cost && (
                        <div className="text-sm text-gray-400">
                          Est: ${item.estimated_cost.toFixed(2)}
                        </div>
                      )}
                      {item.is_paid && item.paid_date && (
                        <div className="text-xs text-green-400">
                          Paid {format(parseISO(item.paid_date), 'MMM d')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!item.is_paid && (
                        <button
                          onClick={() => handleMarkPaid(item.id)}
                          className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Mark as paid"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit item"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Variance Alert */}
      {variance < 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-100 mb-1">
                Project Over Budget
              </h4>
              <p className="text-sm text-red-200">
                This project is ${Math.abs(variance).toLocaleString()} ({Math.abs(variancePercentage).toFixed(1)}%) over the estimated budget.
                Consider reviewing line items or adjusting the project scope.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
