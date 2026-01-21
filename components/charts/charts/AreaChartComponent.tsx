/**
 * Area Chart Component - Dynamically Loaded
 *
 * This component contains recharts imports and will be loaded only when needed.
 * This prevents recharts from being included in the main bundle.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartData {
  [key: string]: number | string | null;
}

interface AreaChartComponentProps {
  data: AreaChartData[];
  xDataKey: string;
  areaDataKey: string;
  areaColor?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  fillOpacity?: number;
}

export function AreaChartComponent({
  data,
  xDataKey,
  areaDataKey,
  areaColor = '#8884d8',
  width = '100%',
  height = 250,
  className = '',
  showGrid = true,
  showLegend = true,
  fillOpacity = 0.3,
}: AreaChartComponentProps) {
  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xDataKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          <Area
            type="monotone"
            dataKey={areaDataKey}
            stroke={areaColor}
            fill={areaColor}
            fillOpacity={fillOpacity}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
