'use client';

import { useState, useCallback } from 'react';
import { ReceiptText, Upload } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { BudgetTabBar } from '@/components/budget/BudgetTabBar';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { LazyReceiptsListCard, LazyReceiptUploadModal } from '@/lib/utils/lazy-components';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';

/**
 * Receipts sub-view of the /budget hub (PR14). Preserves the former /projects
 * "receipts" tab: the OCR-backed receipts list plus an upload entry point.
 * ReceiptsListCard self-loads on spaceId; a refresh key forces a reload after
 * an upload or delete without threading a data hook through.
 */
export function BudgetReceiptsClient() {
  const { currentSpace } = useAuthWithSpaces();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Budget', href: '/budget' },
        { label: 'Receipts' },
      ]}
    >
      <BudgetTabBar />

      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Receipts
              </h1>
              <p className="text-gray-400 mt-1">Capture and store receipts, with text scanned automatically</p>
            </div>
            {currentSpace && (
              <CTAButton onClick={() => setIsUploadOpen(true)} feature="projects" icon={<Upload className="w-5 h-5" />} className="!rounded-full">
                Upload Receipt
              </CTAButton>
            )}
          </div>

          {currentSpace ? (
            <LazyReceiptsListCard key={refreshKey} spaceId={currentSpace.id} onDelete={refresh} />
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <ReceiptText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading...</p>
            </div>
          )}
        </div>
      </div>

      {currentSpace && (
        <LazyReceiptUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          spaceId={currentSpace.id}
          onSuccess={refresh}
        />
      )}
    </FeatureLayout>
  );
}
