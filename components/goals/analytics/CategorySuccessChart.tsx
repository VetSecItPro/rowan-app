'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CategorySuccessChartProps {
  data: Record<string, { completed: number; total: number; rate: number }>;
}

export default function CategorySuccessChart({ data }: CategorySuccessChartProps) {
  const chartData = Object.entries(data).map(([category, stats]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    rate: Math.round(stats.rate),
    completed: stats.completed,
    total: stats.total,
  })).sort((a, b) => b.rate - a.rate);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Success Rate by Category
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No category data available
        </div>
      </div>
    );
  }

  const getColor = (rate: number) => {
    if (rate >= 75) return '#10B981'; // Green
    if (rate >= 50) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Success Rate by Category
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            label={{ value: 'Success Rate (%)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            type="category"
            dataKey="category"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value, _name, props) => [
              `${value ?? 0}% (${props.payload.completed}/${props.payload.total})`,
              'Success Rate',
            ]}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
