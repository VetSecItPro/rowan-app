/**
 * Line Chart Component - Dynamically Loaded
 *
 * This component contains recharts imports and will be loaded only when needed.
 * This prevents recharts from being included in the main bundle.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineChartData {
  [key: string]: number | string | null;
}

interface LineChartComponentProps {
  data: LineChartData[];
  xDataKey: string;
  lineDataKey: string;
  lineColor?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  strokeWidth?: number;
}

/** Renders a Recharts line chart with configurable data series and styling. */
export function LineChartComponent({
  data,
  xDataKey,
  lineDataKey,
  lineColor = '#8884d8',
  width = '100%',
  height = 250,
  className = '',
  showGrid = true,
  showLegend = true,
  strokeWidth = 2,
}: LineChartComponentProps) {
  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xDataKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey={lineDataKey}
            stroke={lineColor}
            strokeWidth={strokeWidth}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
