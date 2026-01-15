/**
 * Dynamic Goal Analytics Chart Components
 *
 * Lazy-loaded chart components to prevent recharts from bloating the main bundle.
 * These charts are only used on the goals analytics page.
 */

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// Chart Loading Component
const ChartLoader = () => (
  <div className="w-full h-64 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
    <div className="text-center w-full p-6">
      <Skeleton className="w-full h-48 mb-2" />
      <p className="text-sm text-gray-400">Loading chart...</p>
    </div>
  </div>
);

// Dynamic Trend Line Chart
export const DynamicTrendLineChart = dynamic(
  () => import('./TrendLineChart'),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Dynamic Milestones Bar Chart
export const DynamicMilestonesBarChart = dynamic(
  () => import('./MilestonesBarChart'),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Dynamic Category Success Chart
export const DynamicCategorySuccessChart = dynamic(
  () => import('./CategorySuccessChart'),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Dynamic Completion Rate Chart
export const DynamicCompletionRateChart = dynamic(
  () => import('./CompletionRateChart'),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Dynamic Progress Heatmap
export const DynamicProgressHeatmap = dynamic(
  () => import('./ProgressHeatmap'),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

/**
 * Usage:
 *
 * Instead of:
 *   import TrendLineChart from './TrendLineChart';
 *
 * Use:
 *   import { DynamicTrendLineChart } from './DynamicGoalsCharts';
 *   <DynamicTrendLineChart data={data} />
 */
