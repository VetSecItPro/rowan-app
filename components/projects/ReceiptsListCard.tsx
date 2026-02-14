'use client';

import { useState, useEffect } from 'react';
import { Search, Receipt as ReceiptIcon, Calendar, DollarSign, Tag, Trash2, ExternalLink } from 'lucide-react';
import { receiptsService, type Receipt, type ReceiptSearchParams } from '@/lib/services/receipts-service';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface ReceiptsListCardProps {
  spaceId: string;
  onDelete?: (receiptId: string) => void;
}

/** Renders a card listing uploaded receipts for a project. */
export function ReceiptsListCard({ spaceId, onDelete }: ReceiptsListCardProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<ReceiptSearchParams>({});
  const [merchantQuery, setMerchantQuery] = useState('');

  useEffect(() => {
    loadReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadReceipts is a stable function
  }, [spaceId, searchParams]);

  async function loadReceipts() {
    try {
      setIsLoading(true);
      const data = await receiptsService.searchReceipts(spaceId, searchParams);
      setReceipts(data);
    } catch (error) {
      logger.error('Failed to load receipts:', error, { component: 'ReceiptsListCard', action: 'component_action' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      merchant_name: merchantQuery || undefined,
    });
  };

  const handleDelete = async (receiptId: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      await receiptsService.deleteReceipt(receiptId);
      setReceipts(receipts.filter(r => r.id !== receiptId));
      onDelete?.(receiptId);
    } catch (error) {
      logger.error('Failed to delete receipt:', error, { component: 'ReceiptsListCard', action: 'component_action' });
    }
  };

  const handleViewReceipt = async (receipt: Receipt) => {
    try {
      const url = await receiptsService.getReceiptImageUrl(receipt.storage_path);
      window.open(url, '_blank');
    } catch (error) {
      logger.error('Failed to get receipt URL:', error, { component: 'ReceiptsListCard', action: 'component_action' });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <ReceiptIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Receipts ({receipts.length})
              </h3>
              <p className="text-sm text-gray-400">
                View and search your uploaded receipts
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by merchant..."
              value={merchantQuery}
              onChange={(e) => setMerchantQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border-2 border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 shimmer-projects text-white rounded-lg hover:opacity-90 transition-all"
          >
            Search
          </button>
        </div>
      </div>

      {/* Receipts List */}
      <div className="p-6">
        {receipts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ReceiptIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No receipts found</p>
            {merchantQuery && (
              <button
                onClick={() => {
                  setMerchantQuery('');
                  setSearchParams({});
                }}
                className="text-sm text-amber-400 hover:underline mt-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {receipt.merchant_name || 'Unknown Merchant'}
                    </h4>
                    {receipt.category && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Tag className="w-3 h-3" />
                        {receipt.category}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(receipt.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
                    title="Delete receipt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {receipt.total_amount && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-white">
                        ${receipt.total_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {receipt.receipt_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleViewReceipt(receipt)}
                  className="w-full py-2 px-3 bg-gray-800 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Receipt
                </button>

                {receipt.ocr_confidence && (
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    OCR Confidence: {receipt.ocr_confidence.toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
