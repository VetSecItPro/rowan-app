import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// Dynamic import to prevent recharts from bloating the main bundle
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

export const metadata: Metadata = {
  title: 'Year in Review | Rowan',
  description: 'Comprehensive annual summary of your achievements, goals, and progress.',
};

export default function YearInReviewPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <YearInReviewDashboard />
    </div>
  );
}