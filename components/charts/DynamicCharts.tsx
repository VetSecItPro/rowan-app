/**
 * Dynamic Chart Components
 *
 * Lazy-loaded chart components to prevent recharts from bloating the main bundle.
 * This significantly reduces bundle size by loading charts only when needed.
 */

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// Chart Loading Component
const ChartLoader = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <div className="text-center">
      <Skeleton className="w-full h-64 mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</p>
    </div>
  </div>
);

// Dynamic Pie Chart Component
export const DynamicPieChart = dynamic(
  () => import('./charts/PieChartComponent').then((mod) => mod.PieChartComponent),
  {
    loading: ChartLoader,
    ssr: false, // Disable SSR for chart components
  }
);

// Dynamic Bar Chart Component
export const DynamicBarChart = dynamic(
  () => import('./charts/BarChartComponent').then((mod) => mod.BarChartComponent),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Dynamic Line Chart Component
export const DynamicLineChart = dynamic(
  () => import('./charts/LineChartComponent').then((mod) => mod.LineChartComponent),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Dynamic Area Chart Component
export const DynamicAreaChart = dynamic(
  () => import('./charts/AreaChartComponent').then((mod) => mod.AreaChartComponent),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

/**
 * Usage:
 *
 * Instead of:
 *   import { PieChart, Pie, Cell } from 'recharts';
 *
 * Use:
 *   import { DynamicPieChart } from '@/components/charts/DynamicCharts';
 *   <DynamicPieChart data={data} />
 */