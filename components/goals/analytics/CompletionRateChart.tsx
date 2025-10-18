'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface CompletionRateChartProps {
  completed: number;
  active: number;
  paused: number;
  cancelled: number;
}

export default function CompletionRateChart({
  completed,
  active,
  paused,
  cancelled,
}: CompletionRateChartProps) {
  const data = [
    { name: 'Completed', value: completed, color: '#10B981' },
    { name: 'In Progress', value: active, color: '#3B82F6' },
    { name: 'Paused', value: paused, color: '#F59E0B' },
    { name: 'Cancelled', value: cancelled, color: '#EF4444' },
  ].filter(item => item.value > 0);

  const total = completed + active + paused + cancelled;

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Goal Status Distribution
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No goals data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Goal Status Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
