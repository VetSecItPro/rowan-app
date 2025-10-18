'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MilestonesBarChartProps {
  data: Array<{
    week: string;
    completed: number;
    total: number;
  }>;
}

export default function MilestonesBarChart({ data }: MilestonesBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Milestones Completion Trends
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No milestones data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Milestones Completion Trends
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="week"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          />
          <Legend />
          <Bar
            dataKey="completed"
            fill="#10B981"
            name="Completed"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="total"
            fill="#3B82F6"
            name="Total"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
