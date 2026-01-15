'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  Award,
  Calendar,
  BarChart3,
  Target,
} from 'lucide-react';
import {
  spendingPatternService,
  type SpendingPattern,
  type SpendingInsight,
  type SpendingForecast,
  type DayOfWeekPattern,
  type MonthlyTrend,
} from '@/lib/services/spending-pattern-service';

interface SpendingInsightsDashboardProps {
  spaceId: string;
}

export default function SpendingInsightsDashboard({ spaceId }: SpendingInsightsDashboardProps) {
  const [patterns, setPatterns] = useState<SpendingPattern[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [forecast, setForecast] = useState<SpendingForecast[]>([]);
  const [dayPatterns, setDayPatterns] = useState<DayOfWeekPattern[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [anomalies, setAnomalies] = useState<SpendingInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [spaceId]);

  const loadInsights = async () => {
    try {
      setLoading(true);

      const [
        patternsData,
        insightsData,
        forecastData,
        dayPatternsData,
        trendsData,
        anomaliesData,
      ] = await Promise.all([
        spendingPatternService.analyzeSpendingPatterns(spaceId, 6),
        spendingPatternService.generateSpendingInsights(spaceId),
        spendingPatternService.forecastNextMonthSpending(spaceId),
        spendingPatternService.analyzeDayOfWeekPatterns(spaceId, 3),
        spendingPatternService.getMonthlyTrends(spaceId, 6),
        spendingPatternService.detectSpendingAnomalies(spaceId),
      ]);

      setPatterns(patternsData);
      setInsights(insightsData);
      setForecast(forecastData);
      setDayPatterns(dayPatternsData);
      setTrends(trendsData);
      setAnomalies(anomaliesData);
    } catch (error) {
      logger.error('Error loading spending insights:', error, { component: 'SpendingInsightsDashboard', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'achievement':
        return <Award className="w-5 h-5" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getInsightColor = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-red-900/20 border-red-800 text-red-300';
      case 'achievement':
        return 'bg-green-900/20 border-green-800 text-green-300';
      case 'tip':
        return 'bg-blue-900/20 border-blue-800 text-blue-300';
    }
  };

  const getTrendIcon = (trend: SpendingPattern['trend']) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Target className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        Analyzing spending patterns...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="bg-gradient-to-br from-indigo-50 from-indigo-900/20 to-purple-900/20 border-2 border-indigo-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-indigo-400" />
          Key Insights & Recommendations
        </h2>

        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.slice(0, 5).map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{insight.category}</h4>
                    <p className="text-sm">{insight.message}</p>
                    {insight.impact > 0 && (
                      <p className="text-xs mt-2 font-medium">
                        Impact: ${insight.impact.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      insight.severity === 'high'
                        ? 'bg-red-100 bg-red-900/30 text-red-300'
                        : insight.severity === 'medium'
                        ? 'bg-yellow-100 bg-yellow-900/30 text-yellow-300'
                        : 'bg-blue-100 bg-blue-900/30 text-blue-300'
                    }`}
                  >
                    {insight.severity}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-4">
              No insights available yet. Keep tracking expenses to see personalized recommendations!
            </p>
          )}
        </div>
      </div>

      {/* Spending Patterns */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Spending Patterns (Last 6 Months)
        </h3>

        <div className="space-y-3">
          {patterns.map((pattern) => (
            <div
              key={pattern.category}
              className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white">{pattern.category}</h4>
                <div className="flex items-center gap-2">
                  {getTrendIcon(pattern.trend)}
                  <span className="text-sm font-medium text-gray-400">
                    {pattern.trend_percentage > 0 ? '+' : ''}
                    {pattern.trend_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Avg/Month</p>
                  <p className="font-semibold text-white">
                    ${pattern.average_monthly.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Trend</p>
                  <p
                    className={`font-semibold capitalize ${
                      pattern.trend === 'increasing'
                        ? 'text-red-400'
                        : pattern.trend === 'decreasing'
                        ? 'text-green-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {pattern.trend}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Predictability</p>
                  <p className="font-semibold text-white">
                    {pattern.predictability.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Seasonality</p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      pattern.seasonality === 'high'
                        ? 'bg-orange-100 bg-orange-900/30 text-orange-300'
                        : pattern.seasonality === 'medium'
                        ? 'bg-yellow-100 bg-yellow-900/30 text-yellow-300'
                        : 'bg-green-100 bg-green-900/30 text-green-300'
                    }`}
                  >
                    {pattern.seasonality}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Next Month Forecast
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {forecast.slice(0, 6).map((pred) => (
            <div
              key={pred.category}
              className="p-4 bg-gradient-to-br from-gray-50 from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700"
            >
              <h4 className="font-semibold text-white mb-2">
                {pred.category}
              </h4>
              <p className="text-2xl font-bold text-indigo-400 mb-1">
                ${pred.next_month_prediction.toLocaleString()}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Confidence: {pred.confidence.toFixed(0)}%</span>
                <span>
                  vs avg: $
                  {Math.abs(pred.next_month_prediction - pred.historical_average).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <p className="text-sm text-blue-200 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span>
              Total forecast for next month: $
              {forecast
                .reduce((sum, f) => sum + f.next_month_prediction, 0)
                .toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {/* Day of Week Patterns */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Spending by Day of Week
        </h3>

        <div className="space-y-2">
          {dayPatterns.map((day) => {
            const maxSpending = Math.max(...dayPatterns.map((d) => d.average_spending));
            const widthPercentage = maxSpending > 0 ? (day.average_spending / maxSpending) * 100 : 0;

            return (
              <div key={day.day}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-300">{day.day}</span>
                  <span className="text-gray-400">
                    ${day.average_spending.toLocaleString()} avg
                  </span>
                </div>
                <div className="h-8 bg-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-end px-3 transition-all duration-500"
                    style={{ width: `${widthPercentage}%` }}
                  >
                    {day.transaction_count > 0 && (
                      <span className="text-xs text-white font-medium">
                        {day.transaction_count} transactions
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-red-900/20 border-2 border-red-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Unusual Spending Detected
          </h3>

          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div
                key={index}
                className="p-4 bg-gray-800 rounded-lg border border-red-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {anomaly.category}
                    </h4>
                    <p className="text-sm text-gray-400">{anomaly.message}</p>
                    <p className="text-xs text-red-400 mt-2 font-medium">
                      ${anomaly.impact.toLocaleString()} difference from usual
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
