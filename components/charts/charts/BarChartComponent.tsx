/**
 * Bar Chart Component - Dynamically Loaded
 *
 * This component contains recharts imports and will be loaded only when needed.
 * This prevents recharts from being included in the main bundle.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartData {
  [key: string]: number | string | null;
}

interface BarChartComponentProps {
  data: BarChartData[];
  xDataKey: string;
  yDataKey: string;
  barColor?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

/** Renders a Recharts bar chart with configurable data series and styling. */
export function BarChartComponent({
  data,
  xDataKey,
  yDataKey,
  barColor = '#8884d8',
  width = '100%',
  height = 250,
  className = '',
  showGrid = true,
  showLegend = true,
}: BarChartComponentProps) {
  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xDataKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          <Bar dataKey={yDataKey} fill={barColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
