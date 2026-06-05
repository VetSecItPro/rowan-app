'use client';

/**
 * Monthly-spending progress bar with explicit over-budget visualization (PR14).
 * Extracted verbatim (behavior-preserving) from the former /projects budgets
 * tab so the /budget Overview shows the same family-friendly "how much over are
 * we" signal. When spending exceeds 100%, the bar splits into a budget portion
 * and a striped overage portion with a legend, instead of just clamping at full.
 */
export function BudgetProgressBar({
  monthlyBudget,
  spentThisMonth,
}: {
  monthlyBudget: number;
  spentThisMonth: number;
}) {
  const percentUsed = monthlyBudget > 0 ? (spentThisMonth / monthlyBudget) * 100 : 0;
  const isOver = percentUsed > 100;
  const overagePercent = isOver ? percentUsed - 100 : 0;
  // When over, split the bar: budget portion + overage portion = 100% of width.
  const budgetPortionWidth = isOver ? (100 / percentUsed) * 100 : percentUsed;
  const overagePortionWidth = isOver ? (overagePercent / percentUsed) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Spent this month</span>
        <span className={`font-medium ${isOver ? 'text-red-400' : 'text-white'}`}>
          {percentUsed.toFixed(1)}%
          {isOver && ` (+${overagePercent.toFixed(1)}% over)`}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden relative flex">
        {/* Budget portion (up to 100%) */}
        <div
          className={`h-full transition-all duration-300 ${
            isOver
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 rounded-l-full'
              : percentUsed >= 90
                ? 'bg-gradient-to-r from-red-500 to-red-600 rounded-full'
                : percentUsed >= 70
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full'
                  : 'bg-gradient-to-r from-green-500 to-green-600 rounded-full'
          }`}
          style={{ width: `${budgetPortionWidth}%` }}
        />
        {/* Overage portion (above 100%) - striped red */}
        {isOver && (
          <div className="h-full rounded-r-full animate-pulse relative overflow-hidden" style={{ width: `${overagePortionWidth}%` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)',
              }}
            />
          </div>
        )}
        {/* 100% marker line when over budget */}
        {isOver && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-900 z-10" style={{ left: `${budgetPortionWidth}%` }} />
        )}
      </div>
      {/* Legend when over budget */}
      {isOver && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
              <span className="text-gray-400">Budget (100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)',
                }}
              />
              <span className="text-red-400">Over (+{overagePercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
