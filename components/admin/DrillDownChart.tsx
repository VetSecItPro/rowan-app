'use client';

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface DrillDownDataPoint {
  date: string;
  value: number;
}

interface DrillDownChartProps {
  data: DrillDownDataPoint[];
  previousData?: DrillDownDataPoint[];
  metric: string;
  color?: string;
  previousColor?: string;
  formatter?: (value: number) => string;
}

const CHART_COLORS = {
  current: '#8b5cf6',
  previous: '#6b7280',
  grid: '#374151',
  text: '#9ca3af',
};

export const DrillDownChart = memo(function DrillDownChart({
  data,
  previousData,
  metric,
  color = CHART_COLORS.current,
  previousColor = CHART_COLORS.previous,
  formatter,
}: DrillDownChartProps) {
  const chartData = useMemo(() => {
    return data.map((point, i) => ({
      date: point.date,
      current: point.value,
      previous: previousData?.[i]?.value ?? undefined,
    }));
  }, [data, previousData]);

  const formatValue = formatter ?? ((v: number) => v.toLocaleString());

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No data available for this metric
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={previousColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={previousColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatValue(v)}
            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
            }}
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value, name) => [
              formatValue(Number(value ?? 0)),
              name === 'current' ? `Current ${metric}` : `Previous ${metric}`,
            ]}
          />
          {previousData && previousData.length > 0 && (
            <>
              <Legend
                wrapperStyle={{ fontSize: '12px', color: CHART_COLORS.text }}
                formatter={(value: string) =>
                  value === 'current' ? 'Current period' : 'Previous period'
                }
              />
              <Area
                type="monotone"
                dataKey="previous"
                stroke={previousColor}
                strokeDasharray="5 5"
                fill="url(#previousGradient)"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="current"
            stroke={color}
            fill="url(#currentGradient)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
