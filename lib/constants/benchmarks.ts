/**
 * Industry benchmarks for consumer SaaS / family apps.
 * Used in admin dashboard to contextualize metrics.
 * Sources: ChartMogul, Mixpanel, Amplitude public benchmark reports.
 */

export const SAAS_BENCHMARKS = {
  /** Monthly churn rate (%) */
  churn: { good: 3, average: 5, poor: 8 },
  /** DAU/MAU stickiness ratio (%) */
  dauMau: { good: 20, average: 13, poor: 8 },
  /** Net Revenue Retention (%) — >100% means expansion revenue exceeds churn */
  nrr: { good: 110, average: 100, poor: 90 },
  /** LTV:CAC ratio — healthy SaaS is 3:1 or better */
  ltvCac: { good: 3, average: 2, poor: 1 },
  /** Activation rate (%) — % of signups who complete key onboarding steps */
  activationRate: { good: 40, average: 25, poor: 15 },
  /** MRR growth rate (%) — month-over-month */
  mrrGrowth: { good: 15, average: 8, poor: 3 },
} as const;

export type BenchmarkMetric = keyof typeof SAAS_BENCHMARKS;

/** Returns 'good' | 'average' | 'poor' based on where value falls relative to benchmarks */
export function getBenchmarkLevel(
  metric: BenchmarkMetric,
  value: number
): 'good' | 'average' | 'poor' {
  const bench = SAAS_BENCHMARKS[metric];
  // For metrics where higher is better (dauMau, nrr, ltvCac, activationRate, mrrGrowth)
  if (metric === 'churn') {
    // Lower is better for churn
    if (value <= bench.good) return 'good';
    if (value <= bench.average) return 'average';
    return 'poor';
  }
  // Higher is better
  if (value >= bench.good) return 'good';
  if (value >= bench.average) return 'average';
  return 'poor';
}

/** Returns Tailwind color class based on benchmark level */
export function getBenchmarkColor(level: 'good' | 'average' | 'poor'): string {
  switch (level) {
    case 'good': return 'text-green-400';
    case 'average': return 'text-yellow-400';
    case 'poor': return 'text-red-400';
  }
}

/** Returns Tailwind bg color class based on benchmark level */
export function getBenchmarkBgColor(level: 'good' | 'average' | 'poor'): string {
  switch (level) {
    case 'good': return 'bg-green-500/20';
    case 'average': return 'bg-yellow-500/20';
    case 'poor': return 'bg-red-500/20';
  }
}
