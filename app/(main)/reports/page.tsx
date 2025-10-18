'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ReportsPage } from '@/components/reports/ReportsPage';

export default function ReportsPageRoute() {
  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Financial Reports' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReportsPage />
      </div>
    </FeatureLayout>
  );
}