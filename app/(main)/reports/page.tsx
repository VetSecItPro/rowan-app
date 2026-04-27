'use client';

import dynamic from 'next/dynamic';
import { FeatureLayout } from '@/components/layout/FeatureLayout';

// PERF: Reports is a power-user feature with heavy charts (recharts) and
// PDF generation. Lazy-load so it only ships to users who navigate here.
const ReportsPage = dynamic(
  () => import('@/components/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-gray-800 rounded" />
        <div className="h-64 bg-gray-800 rounded" />
        <div className="h-64 bg-gray-800 rounded" />
      </div>
    ),
  }
);

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
