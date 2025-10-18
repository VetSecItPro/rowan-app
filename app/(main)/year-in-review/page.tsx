import { Metadata } from 'next';
import { YearInReviewDashboard } from '@/components/year-in-review/YearInReviewDashboard';

export const metadata: Metadata = {
  title: 'Year in Review | Rowan',
  description: 'Comprehensive annual summary of your achievements, goals, and progress.',
};

export default function YearInReviewPage() {
  return (
    <div className=\"container mx-auto px-4 py-8 max-w-7xl\">
      <YearInReviewDashboard />
    </div>
  );
}