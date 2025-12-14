'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// Dynamic import with ssr: false must be in a Client Component
const YearInReviewDashboard = dynamic(
  () => import('@/components/year-in-review/YearInReviewDashboard').then(mod => mod.YearInReviewDashboard),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    ),
    ssr: false,
  }
);

export function YearInReviewClient() {
  return <YearInReviewDashboard />;
}
