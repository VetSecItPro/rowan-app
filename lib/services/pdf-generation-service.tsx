'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { GeneratedReport, ReportData } from './financial-reports-service';
import { format } from 'date-fns';

// PDF Generation Service for Financial Reports
// Creates professional PDF reports with charts and tables

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 10,
    color: '#64748B',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  column: {
    flexDirection: 'column',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  metricCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chartPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  chartText: {
    fontSize: 12,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  currency: {
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
  },
  negative: {
    color: '#DC2626',
  },
  positive: {
    color: '#059669',
  },
  summary: {
    backgroundColor: '#EBF8FF',
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 10,
    color: '#1E40AF',
    lineHeight: 1.4,
  },
});

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Format percentage
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Summary Section Component
const SummarySection: React.FC<{ report: GeneratedReport }> = ({ report }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Executive Summary</Text>
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Financial Overview</Text>
      <Text style={styles.summaryText}>
        This report covers the period from {format(new Date(report.date_range_start), 'MMM dd, yyyy')}
        to {format(new Date(report.date_range_end), 'MMM dd, yyyy')}.
        {report.summary_stats.total_expenses &&
          ` Total expenses: ${formatCurrency(report.summary_stats.total_expenses)}.`}
        {report.summary_stats.total_budget &&
          ` Budget allocation: ${formatCurrency(report.summary_stats.total_budget)}.`}
        {report.summary_stats.budget_utilization &&
          ` Budget utilization: ${formatPercentage(report.summary_stats.budget_utilization)}.`}
      </Text>
    </View>
  </View>
);

// Key Metrics Section Component
const KeyMetricsSection: React.FC<{ metrics: any }> = ({ metrics }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Key Metrics</Text>
    <View style={styles.twoColumn}>
      <View style={styles.halfWidth}>
        {metrics.total_expenses && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Expenses</Text>
            <Text style={[styles.metricValue, styles.currency]}>
              {formatCurrency(metrics.total_expenses)}
            </Text>
          </View>
        )}
        {metrics.expense_count && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Number of Transactions</Text>
            <Text style={styles.metricValue}>{metrics.expense_count}</Text>
          </View>
        )}
        {metrics.categories_count && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Categories Used</Text>
            <Text style={styles.metricValue}>{metrics.categories_count}</Text>
          </View>
        )}
      </View>
      <View style={styles.halfWidth}>
        {metrics.avg_expense && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Average Transaction</Text>
            <Text style={[styles.metricValue, styles.currency]}>
              {formatCurrency(metrics.avg_expense)}
            </Text>
          </View>
        )}
        {metrics.max_expense && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Largest Transaction</Text>
            <Text style={[styles.metricValue, styles.currency]}>
              {formatCurrency(metrics.max_expense)}
            </Text>
          </View>
        )}
        {metrics.budget_remaining !== undefined && (
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Budget Remaining</Text>
            <Text style={[
              styles.metricValue,
              styles.currency,
              metrics.budget_remaining >= 0 ? styles.positive : styles.negative
            ]}>
              {formatCurrency(metrics.budget_remaining)}
            </Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

// Expenses Table Component
const ExpensesTableSection: React.FC<{ data: ReportData }> = ({ data }) => {
  // Get top 20 expenses by amount
  const topExpenses = [...data.expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Top Expenses</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Date</Text>
          <Text style={styles.tableCellHeader}>Description</Text>
          <Text style={styles.tableCellHeader}>Category</Text>
          <Text style={styles.tableCellHeader}>Vendor</Text>
          <Text style={styles.tableCellHeader}>Amount</Text>
        </View>
        {topExpenses.map((expense, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>
              {format(new Date(expense.date), 'MM/dd')}
            </Text>
            <Text style={styles.tableCell}>
              {expense.description || 'N/A'}
            </Text>
            <Text style={styles.tableCell}>{expense.category}</Text>
            <Text style={styles.tableCell}>{expense.vendor || 'N/A'}</Text>
            <Text style={[styles.tableCell, styles.currency]}>
              {formatCurrency(expense.amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Category Breakdown Section
const CategoryBreakdownSection: React.FC<{ data: ReportData }> = ({ data }) => {
  // Calculate category totals
  const categoryTotals = data.expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalAmount = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Spending by Category</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Category</Text>
          <Text style={styles.tableCellHeader}>Amount</Text>
          <Text style={styles.tableCellHeader}>Percentage</Text>
          <Text style={styles.tableCellHeader}>Transactions</Text>
        </View>
        {sortedCategories.map(([category, amount], index) => {
          const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
          const transactionCount = data.expenses.filter(e => e.category === category).length;

          return (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{category}</Text>
              <Text style={[styles.tableCell, styles.currency]}>
                {formatCurrency(amount)}
              </Text>
              <Text style={styles.tableCell}>{formatPercentage(percentage)}</Text>
              <Text style={styles.tableCell}>{transactionCount}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Budget vs Actual Section (if budget data available)
const BudgetAnalysisSection: React.FC<{ data: ReportData; metrics: any }> = ({ data, metrics }) => {
  if (!data.budgets || data.budgets.length === 0) return null;

  const categorySpending = data.expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const budgetAnalysis = data.budgets.map(budget => {
    const spent = categorySpending[budget.category] || 0;
    const variance = budget.budgeted_amount - spent;
    const utilizationRate = budget.budgeted_amount > 0 ? (spent / budget.budgeted_amount) * 100 : 0;

    return {
      category: budget.category,
      budgeted: budget.budgeted_amount,
      spent,
      variance,
      utilizationRate
    };
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Budget vs Actual Analysis</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Category</Text>
          <Text style={styles.tableCellHeader}>Budgeted</Text>
          <Text style={styles.tableCellHeader}>Spent</Text>
          <Text style={styles.tableCellHeader}>Variance</Text>
          <Text style={styles.tableCellHeader}>Utilization</Text>
        </View>
        {budgetAnalysis.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>{item.category}</Text>
            <Text style={[styles.tableCell, styles.currency]}>
              {formatCurrency(item.budgeted)}
            </Text>
            <Text style={[styles.tableCell, styles.currency]}>
              {formatCurrency(item.spent)}
            </Text>
            <Text style={[
              styles.tableCell,
              styles.currency,
              item.variance >= 0 ? styles.positive : styles.negative
            ]}>
              {formatCurrency(item.variance)}
            </Text>
            <Text style={[
              styles.tableCell,
              item.utilizationRate > 100 ? styles.negative : styles.positive
            ]}>
              {formatPercentage(item.utilizationRate)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Goals Progress Section (if goals data available)
const GoalsProgressSection: React.FC<{ data: ReportData }> = ({ data }) => {
  if (!data.goals || data.goals.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Goals Progress</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableCellHeader}>Goal</Text>
          <Text style={styles.tableCellHeader}>Category</Text>
          <Text style={styles.tableCellHeader}>Status</Text>
          <Text style={styles.tableCellHeader}>Progress</Text>
        </View>
        {data.goals.map((goal, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>{goal.title}</Text>
            <Text style={styles.tableCell}>{goal.category || 'N/A'}</Text>
            <Text style={[
              styles.tableCell,
              goal.status === 'completed' ? styles.positive : undefined
            ]}>
              {goal.status}
            </Text>
            <Text style={styles.tableCell}>{formatPercentage(goal.progress)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Main PDF Document Component
const FinancialReportPDF: React.FC<{ report: GeneratedReport }> = ({ report }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.subtitle}>{report.description}</Text>
        <Text style={styles.dateRange}>
          Report Period: {format(new Date(report.date_range_start), 'MMMM dd, yyyy')} - {format(new Date(report.date_range_end), 'MMMM dd, yyyy')}
        </Text>
        <Text style={styles.dateRange}>
          Generated: {format(new Date(report.generated_at), 'MMMM dd, yyyy \'at\' h:mm a')}
        </Text>
      </View>

      {/* Summary Section */}
      <SummarySection report={report} />

      {/* Key Metrics */}
      <KeyMetricsSection metrics={report.summary_stats} />

      {/* Budget Analysis (if available) */}
      <BudgetAnalysisSection data={report.data} metrics={report.summary_stats} />

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by Rowan Financial Reports | Page 1
      </Text>
    </Page>

    {/* Second Page - Detailed Data */}
    <Page size="A4" style={styles.page}>
      {/* Category Breakdown */}
      <CategoryBreakdownSection data={report.data} />

      {/* Top Expenses */}
      <ExpensesTableSection data={report.data} />

      {/* Goals Progress (if available) */}
      <GoalsProgressSection data={report.data} />

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by Rowan Financial Reports | Page 2
      </Text>
    </Page>
  </Document>
);

// PDF Generation Service Class
class PDFGenerationService {
  // Generate PDF blob from report
  async generatePDFBlob(report: GeneratedReport): Promise<Blob> {
    const doc = <FinancialReportPDF report={report} />;
    const pdfBlob = await pdf(doc).toBlob();
    return pdfBlob;
  }

  // Generate and download PDF
  async generateAndDownloadPDF(report: GeneratedReport): Promise<void> {
    const pdfBlob = await this.generatePDFBlob(report);

    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${report.date_range_start}_to_${report.date_range_end}.pdf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
  }

  // Generate PDF for preview (returns data URL)
  async generatePDFPreview(report: GeneratedReport): Promise<string> {
    const doc = <FinancialReportPDF report={report} />;
    const pdfBlob = await pdf(doc).toBlob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  }

  // Calculate estimated PDF size
  estimatePDFSize(report: GeneratedReport): number {
    // Simple estimation based on data size
    const baseSize = 50000; // 50KB base
    const expenseSize = report.data.expenses.length * 100; // ~100 bytes per expense
    const goalSize = (report.data.goals?.length || 0) * 50; // ~50 bytes per goal
    const budgetSize = report.data.budgets.length * 50; // ~50 bytes per budget

    return baseSize + expenseSize + goalSize + budgetSize;
  }

  // Validate report data for PDF generation
  validateReportData(report: GeneratedReport): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!report.title) {
      errors.push('Report title is required');
    }

    if (!report.data) {
      errors.push('Report data is missing');
    } else {
      if (!report.data.expenses || !Array.isArray(report.data.expenses)) {
        errors.push('Expenses data is invalid');
      }

      if (!report.data.metrics) {
        errors.push('Report metrics are missing');
      }
    }

    if (!report.date_range_start || !report.date_range_end) {
      errors.push('Date range is incomplete');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get supported PDF formats/options
  getSupportedFormats() {
    return {
      sizes: ['A4', 'Letter', 'Legal'],
      orientations: ['portrait', 'landscape'],
      formats: ['PDF'],
      maxPages: 10
    };
  }
}

export const pdfGenerationService = new PDFGenerationService();
export { FinancialReportPDF };