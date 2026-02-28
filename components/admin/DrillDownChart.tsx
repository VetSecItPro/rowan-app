'use client';

import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

export interface DrillDownDataPoint {
  date: string;
  value: number;
  [key: string]: string | number;
}

interface DrillDownChartProps {
  data: DrillDownDataPoint[];
  previousData?: DrillDownDataPoint[];
  metric: string;
  color?: string;
  previousColor?: string;
  formatter?: (value: number) => string;
  /** Render as bar chart instead of area chart (useful for categorical data) */
  chartType?: 'area' | 'bar';
  /** Data key for bar chart values (defaults to 'value') */
  valueKey?: string;
  /** Data key for bar chart labels (defaults to 'date') */
  nameKey?: string;
  /** Optional color array for individual bars */
  barColors?: string[];
}

const CHART_COLORS = {
  current: '#8b5cf6',
  previous: '#6b7280',
  grid: '#374151',
  text: '#9ca3af',
};

/** Renders an interactive chart that supports drill-down into detailed data segments. */
export const DrillDownChart = memo(function DrillDownChart({
  data,
  previousData,
  metric,
  color = CHART_COLORS.current,
  previousColor = CHART_COLORS.previous,
  formatter,
  chartType = 'area',
  valueKey = 'value',
  nameKey = 'date',
  barColors,
}: DrillDownChartProps) {
  const chartData = useMemo(() => {
    if (chartType === 'bar') {
      return data.map((point) => ({ ...point }));
    }
    return data.map((point, i) => ({
      date: point.date,
      current: point.value,
      previous: previousData?.[i]?.value ?? undefined,
    }));
  }, [data, previousData, chartType, valueKey]);

  const formatValue = formatter ?? ((v: number) => v.toLocaleString());

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /** For bar charts, truncate long labels */
  const formatBarLabel = (label: string) => {
    if (label.length > 12) return label.slice(0, 12) + '…';
    return label;
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        No data available for this metric
      </div>
    );
  }

  // Bar chart rendering for categorical data
  if (chartType === 'bar') {
    return (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey={nameKey}
              tickFormatter={formatBarLabel}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
              axisLine={{ stroke: CHART_COLORS.grid }}
              tickLine={false}
              interval={0}
              angle={data.length > 6 ? -35 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 60 : 30}
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
              formatter={(value) => [formatValue(Number(value ?? 0)), metric]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={barColors?.[index % (barColors?.length ?? 1)] ?? color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Area chart rendering (default — time-series data)
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
