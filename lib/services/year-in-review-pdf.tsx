// PERF: Server-only consumer (app/api/year-in-review/route.ts POST handler).
// Imported via @react-pdf/renderer; never bundled into client code.
// Mirrors the safety pattern in pdf-generation-service.tsx (FIX-PERF-001).

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { YearInReviewData } from './year-in-review-service';

/**
 * PDF template for Year-in-Review export.
 *
 * Pages:
 *  1. Cover + headline overview stats
 *  2. Monthly breakdown table
 *  3. Achievements + personal records
 *  4. Goals + Expenses summary
 *  5. Productivity & insights
 */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  cover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    fontSize: 14,
    color: '#10b981',
    letterSpacing: 4,
    marginBottom: 16,
  },
  yearTitle: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    marginTop: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 6,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    width: '47%',
    padding: 14,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#065f46',
  },
  statLabel: {
    fontSize: 11,
    color: '#047857',
    marginTop: 4,
  },
  table: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  cell: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
    paddingHorizontal: 6,
  },
  cellBold: {
    flex: 1,
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  bullet: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 5,
  },
  insightLine: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
  },
});

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface YearInReviewPDFProps {
  data: YearInReviewData;
  generatedAt: string;
}

export function YearInReviewPDF({ data, generatedAt }: YearInReviewPDFProps) {
  return (
    <Document>
      {/* Page 1 — Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.brand}>ROWAN</Text>
          <Text style={styles.yearTitle}>{data.year}</Text>
          <Text style={styles.subtitle}>Your year in review</Text>
        </View>
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.overview.tasksCompleted.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Tasks completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.overview.goalsAchieved.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Goals achieved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.overview.activeDays}</Text>
            <Text style={styles.statLabel}>Active days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.overview.badgesEarned}</Text>
            <Text style={styles.statLabel}>Badges earned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatCurrency(data.overview.totalExpenses)}</Text>
            <Text style={styles.statLabel}>Total expenses tracked</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {(data.overview.goalCompletionRate * 100).toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Goal completion rate</Text>
          </View>
        </View>
        <Text style={styles.footer}>Generated {generatedAt} • Rowan</Text>
      </Page>

      {/* Page 2 — Monthly Breakdown */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Month by Month</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cellBold}>Month</Text>
            <Text style={styles.cellBold}>Tasks</Text>
            <Text style={styles.cellBold}>Goals</Text>
            <Text style={styles.cellBold}>Expenses</Text>
            <Text style={styles.cellBold}>Active days</Text>
          </View>
          {data.monthlyBreakdown.map((m) => (
            <View key={m.month} style={styles.row}>
              <Text style={styles.cell}>{m.monthName}</Text>
              <Text style={styles.cell}>{m.tasksCompleted}</Text>
              <Text style={styles.cell}>{m.goalsAchieved}</Text>
              <Text style={styles.cell}>{formatCurrency(m.expensesAmount)}</Text>
              <Text style={styles.cell}>{m.activeDays}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>Generated {generatedAt} • Rowan</Text>
      </Page>

      {/* Page 3 — Achievements */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        {data.achievements.badgesEarned.length > 0 ? (
          data.achievements.badgesEarned.slice(0, 12).map((b) => (
            <Text key={b.id} style={styles.bullet}>
              • {b.title} — {b.description}
            </Text>
          ))
        ) : (
          <Text style={styles.bullet}>No badges earned this year — there&apos;s always next year!</Text>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Personal Records</Text>
        {data.achievements.personalRecords.length > 0 ? (
          data.achievements.personalRecords.map((r, idx) => (
            <Text key={idx} style={styles.bullet}>
              • {r.title}: {r.value} {r.unit} — {r.description}
            </Text>
          ))
        ) : (
          <Text style={styles.bullet}>No records this year.</Text>
        )}
        <Text style={styles.footer}>Generated {generatedAt} • Rowan</Text>
      </Page>

      {/* Page 4 — Goals + Expenses Summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <Text style={styles.insightLine}>
          {data.goals.completedGoals} of {data.goals.totalGoals} goals completed
          ({(data.goals.completionRate * 100).toFixed(0)}% completion rate).
        </Text>
        {data.goals.topGoalCategories.length > 0 && (
          <>
            <Text style={[styles.insightLine, { marginTop: 8, fontWeight: 'bold' }]}>
              Top categories:
            </Text>
            {data.goals.topGoalCategories.slice(0, 5).map((c) => (
              <Text key={c.category} style={styles.bullet}>
                • {c.category}: {c.count} ({c.percentage.toFixed(0)}%)
              </Text>
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Expenses</Text>
        <Text style={styles.insightLine}>
          {formatCurrency(data.expenses.totalAmount)} across {data.expenses.totalTransactions} transactions
          (avg {formatCurrency(data.expenses.averagePerMonth)}/month).
        </Text>
        {data.expenses.topCategories.length > 0 && (
          <>
            <Text style={[styles.insightLine, { marginTop: 8, fontWeight: 'bold' }]}>
              Top spending:
            </Text>
            {data.expenses.topCategories.slice(0, 5).map((c) => (
              <Text key={c.category} style={styles.bullet}>
                • {c.category}: {formatCurrency(c.totalValue || 0)} ({c.percentage.toFixed(0)}%)
              </Text>
            ))}
          </>
        )}
        <Text style={styles.footer}>Generated {generatedAt} • Rowan</Text>
      </Page>

      {/* Page 5 — Insights */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>What Stood Out</Text>
        <Text style={styles.insightLine}>
          Most productive month: <Text style={{ fontWeight: 'bold' }}>{data.insights.mostProductiveMonth}</Text>
        </Text>
        <Text style={styles.insightLine}>
          Longest streak: <Text style={{ fontWeight: 'bold' }}>{data.insights.longestStreak} days</Text>
        </Text>
        <Text style={styles.insightLine}>
          Favorite task category: <Text style={{ fontWeight: 'bold' }}>{data.insights.favoriteTaskCategory}</Text>
        </Text>
        <Text style={styles.insightLine}>
          Top spending category: <Text style={{ fontWeight: 'bold' }}>{data.insights.topSpendingCategory}</Text>
        </Text>

        {data.insights.strengths.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Strengths</Text>
            {data.insights.strengths.map((s, idx) => (
              <Text key={idx} style={styles.bullet}>• {s}</Text>
            ))}
          </>
        )}

        {data.insights.improvementAreas.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Room to Grow</Text>
            {data.insights.improvementAreas.map((s, idx) => (
              <Text key={idx} style={styles.bullet}>• {s}</Text>
            ))}
          </>
        )}
        <Text style={styles.footer}>Generated {generatedAt} • Rowan</Text>
      </Page>
    </Document>
  );
}

/** Renders the YearInReviewPDF to a Blob suitable for download. */
export async function generateYearInReviewPdf(data: YearInReviewData): Promise<Blob> {
  const generatedAt = new Date().toISOString().split('T')[0];
  return await pdf(<YearInReviewPDF data={data} generatedAt={generatedAt} />).toBlob();
}
