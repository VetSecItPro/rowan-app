// Household Components
// NOTE (2026-06-07 dead-code cleanup): ChoreCard / ExpenseCard / NewChoreModal /
// NewExpenseModal were dead duplicates of the live components/projects/* versions
// and were removed. Only the late-penalty UI remains here. That UI is NOT yet
// wired to any route (no live entry point) even though its backend is live
// (app/api/penalties/* + lib/services/rewards/late-penalty-service.ts) - kept
// pending a wire-up-or-retire decision. See .cleancode-reports/cleancode-deadcode-20260607.md.

// Late Penalty System
export { LatePenaltySettings } from './LatePenaltySettings';
export { PenaltyHistory } from './PenaltyHistory';
