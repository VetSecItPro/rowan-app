/**
 * Pie Chart Component - Dynamically Loaded
 *
 * This component contains recharts imports and will be loaded only when needed.
 * This prevents recharts from being included in the main bundle.
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface PieChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined; // Add index signature for recharts compatibility
}

interface PieChartComponentProps {
  data: PieChartData[];
  colors?: string[];
  width?: number | string;
  height?: number | string;
  className?: string;
}

const defaultColors = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
  '#0088fe',
];

export function PieChartComponent({
  data,
  colors = defaultColors,
  width = '100%',
  height = 250,
  className = ''
}: PieChartComponentProps) {
  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name || ''} ${(((percent ?? 0) * 100)).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value, 'Value']}
            labelFormatter={(name) => `Category: ${name}`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
