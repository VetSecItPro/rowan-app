import { createClient } from '@/lib/supabase/client';

// Financial Reports Service
// Comprehensive reporting system with PDF generation

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'budget' | 'expenses' | 'goals' | 'trends' | 'summary';
  report_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  config: ReportConfig;
  default_date_range: string;
  is_system: boolean;
  is_active: boolean;
  requires_goals: boolean;
  requires_budget: boolean;
  created_by?: string;
  space_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportConfig {
  charts: string[];
  metrics: string[];
  groupBy?: string;
  filterBy?: string;
  includeSubcategories?: boolean;
  includeRecurring?: boolean;
  includeGoals?: boolean;
  includeBudget?: boolean;
  includeAll?: boolean;
  includeForecast?: boolean;
}

export interface GeneratedReport {
  id: string;
  template_id: string;
  space_id: string;
  title: string;
  description?: string;
  report_type: string;
  date_range_start: string;
  date_range_end: string;
  data: ReportData;
  charts_config: any;
  summary_stats: ReportMetrics;
  pdf_url?: string;
  pdf_size?: number;
  file_path?: string;
  generated_at: string;
  generated_by: string;
  generation_time_ms?: number;
  status: 'generating' | 'generated' | 'failed' | 'archived';
  is_shared: boolean;
  share_token?: string;
  shared_until?: string;
  view_count: number;
  download_count: number;
  last_viewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  expenses: ExpenseData[];
  budgets: BudgetData[];
  goals: GoalData[];
  metrics: ReportMetrics;
  date_range: {
    start: string;
    end: string;
  };
  generated_at: string;
}

export interface ExpenseData {
  id: string;
  amount: number;
  category: string;
  subcategory?: string;
  vendor?: string;
  description?: string;
  date: string;
  is_recurring: boolean;
}

export interface BudgetData {
  category: string;
  budgeted_amount: number;
  period: string;
}

export interface GoalData {
  id: string;
  title: string;
  category?: string;
  status: string;
  progress: number;
  target_date?: string;
}

export interface ReportMetrics {
  total_expenses: number;
  expense_count: number;
  avg_expense: number;
  max_expense: number;
  categories_count: number;
  vendors_count: number;
  [key: string]: any;
}

export interface ReportSchedule {
  id: string;
  template_id: string;
  space_id: string;
  name: string;
  description?: string;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_config: any;
  email_recipients: string[];
  email_subject_template?: string;
  email_body_template?: string;
  include_pdf: boolean;
  is_active: boolean;
  next_run_at?: string;
  last_run_at?: string;
  last_success_at?: string;
  run_count: number;
  failure_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportFavorite {
  id: string;
  user_id: string;
  report_id?: string;
  template_id?: string;
  name?: string;
  notes?: string;
  created_at: string;
}

export interface CreateReportInput {
  template_id: string;
  space_id: string;
  title?: string;
  description?: string;
  date_range_start: string;
  date_range_end: string;
  custom_config?: Partial<ReportConfig>;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: ReportTemplate['category'];
  report_type: ReportTemplate['report_type'];
  config: ReportConfig;
  default_date_range?: string;
  space_id: string;
}

export interface CreateScheduleInput {
  template_id: string;
  space_id: string;
  name: string;
  description?: string;
  schedule_type: ReportSchedule['schedule_type'];
  schedule_config: any;
  email_recipients?: string[];
  email_subject_template?: string;
  email_body_template?: string;
  include_pdf?: boolean;
}

class FinancialReportsService {
  private supabase = createClient();

  // Report Templates Management
  async getReportTemplates(spaceId?: string, category?: string): Promise<ReportTemplate[]> {
    let query = this.supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (spaceId) {
      query = query.or(`space_id.eq.${spaceId},is_system.eq.true`);
    } else {
      query = query.eq('is_system', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | null> {
    const { data, error } = await this.supabase
      .from('report_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async createReportTemplate(
    userId: string,
    input: CreateTemplateInput
  ): Promise<ReportTemplate> {
    const { data, error } = await this.supabase
      .from('report_templates')
      .insert({
        ...input,
        is_system: false,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Report Generation
  async generateReport(userId: string, input: CreateReportInput): Promise<GeneratedReport> {
    const startTime = Date.now();

    try {
      // Get template
      const template = await this.getReportTemplate(input.template_id);
      if (!template) {
        throw new Error('Report template not found');
      }

      // Merge custom config with template config
      const finalConfig = {
        ...template.config,
        ...input.custom_config
      };

      // Generate report data
      const reportData = await this.getFinancialReportData(
        input.space_id,
        input.date_range_start,
        input.date_range_end,
        finalConfig
      );

      // Process charts configuration
      const chartsConfig = await this.generateChartsConfig(reportData, finalConfig);

      // Calculate summary statistics
      const summaryStats = this.calculateSummaryStats(reportData, finalConfig);

      // Create report record
      const { data, error } = await this.supabase
        .from('generated_reports')
        .insert({
          template_id: input.template_id,
          space_id: input.space_id,
          title: input.title || template.name,
          description: input.description || template.description,
          report_type: template.report_type,
          date_range_start: input.date_range_start,
          date_range_end: input.date_range_end,
          data: reportData,
          charts_config: chartsConfig,
          summary_stats: summaryStats,
          generated_by: userId,
          generation_time_ms: Date.now() - startTime,
          status: 'generated'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Create failed report record
      await this.supabase
        .from('generated_reports')
        .insert({
          template_id: input.template_id,
          space_id: input.space_id,
          title: input.title || 'Failed Report',
          description: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          report_type: 'custom',
          date_range_start: input.date_range_start,
          date_range_end: input.date_range_end,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          charts_config: {},
          summary_stats: {},
          generated_by: userId,
          generation_time_ms: Date.now() - startTime,
          status: 'failed'
        });

      throw error;
    }
  }

  // Get financial data for reports
  private async getFinancialReportData(
    spaceId: string,
    startDate: string,
    endDate: string,
    config: ReportConfig
  ): Promise<ReportData> {
    const { data, error } = await this.supabase
      .rpc('get_financial_report_data', {
        p_space_id: spaceId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_config: config
      });

    if (error) throw error;
    return data;
  }

  // Generate charts configuration based on data and config
  private async generateChartsConfig(data: ReportData, config: ReportConfig): Promise<any> {
    const charts: any = {};

    for (const chartType of config.charts) {
      switch (chartType) {
        case 'budget_vs_actual':
          charts.budget_vs_actual = this.generateBudgetVsActualChart(data);
          break;
        case 'category_breakdown':
          charts.category_breakdown = this.generateCategoryBreakdownChart(data);
          break;
        case 'expense_timeline':
          charts.expense_timeline = this.generateExpenseTimelineChart(data);
          break;
        case 'trend_line':
          charts.trend_line = this.generateTrendLineChart(data);
          break;
        case 'vendor_bar':
          charts.vendor_bar = this.generateVendorBarChart(data);
          break;
        case 'goal_progress':
          charts.goal_progress = this.generateGoalProgressChart(data);
          break;
        default:
          charts[chartType] = { type: chartType, data: [], config: {} };
      }
    }

    return charts;
  }

  // Chart generation methods
  private generateBudgetVsActualChart(data: ReportData) {
    const categoryMap = new Map<string, { budgeted: number; actual: number }>();

    // Process budget data
    data.budgets.forEach(budget => {
      if (!categoryMap.has(budget.category)) {
        categoryMap.set(budget.category, { budgeted: 0, actual: 0 });
      }
      categoryMap.get(budget.category)!.budgeted += budget.budgeted_amount;
    });

    // Process expense data
    data.expenses.forEach(expense => {
      if (!categoryMap.has(expense.category)) {
        categoryMap.set(expense.category, { budgeted: 0, actual: 0 });
      }
      categoryMap.get(expense.category)!.actual += expense.amount;
    });

    const chartData = Array.from(categoryMap.entries()).map(([category, amounts]) => ({
      category,
      budgeted: amounts.budgeted,
      actual: amounts.actual,
      variance: amounts.budgeted - amounts.actual,
      variance_percentage: amounts.budgeted > 0
        ? ((amounts.budgeted - amounts.actual) / amounts.budgeted) * 100
        : 0
    }));

    return {
      type: 'bar',
      data: chartData,
      config: {
        title: 'Budget vs Actual Spending',
        xAxis: 'category',
        yAxis: ['budgeted', 'actual'],
        colors: ['#3B82F6', '#EF4444']
      }
    };
  }

  private generateCategoryBreakdownChart(data: ReportData) {
    const categoryTotals = new Map<string, number>();

    data.expenses.forEach(expense => {
      categoryTotals.set(
        expense.category,
        (categoryTotals.get(expense.category) || 0) + expense.amount
      );
    });

    const chartData = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      type: 'pie',
      data: chartData,
      config: {
        title: 'Expenses by Category',
        labelKey: 'category',
        valueKey: 'amount'
      }
    };
  }

  private generateExpenseTimelineChart(data: ReportData) {
    const dailyTotals = new Map<string, number>();

    data.expenses.forEach(expense => {
      const date = expense.date;
      dailyTotals.set(date, (dailyTotals.get(date) || 0) + expense.amount);
    });

    const chartData = Array.from(dailyTotals.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      type: 'line',
      data: chartData,
      config: {
        title: 'Daily Expenses Timeline',
        xAxis: 'date',
        yAxis: 'amount'
      }
    };
  }

  private generateTrendLineChart(data: ReportData) {
    // Generate trend analysis (simplified for demo)
    const monthlyTotals = new Map<string, number>();

    data.expenses.forEach(expense => {
      const month = expense.date.substring(0, 7); // YYYY-MM
      monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + expense.amount);
    });

    const chartData = Array.from(monthlyTotals.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      type: 'line',
      data: chartData,
      config: {
        title: 'Monthly Spending Trend',
        xAxis: 'month',
        yAxis: 'amount'
      }
    };
  }

  private generateVendorBarChart(data: ReportData) {
    const vendorTotals = new Map<string, number>();

    data.expenses.forEach(expense => {
      if (expense.vendor) {
        vendorTotals.set(
          expense.vendor,
          (vendorTotals.get(expense.vendor) || 0) + expense.amount
        );
      }
    });

    const chartData = Array.from(vendorTotals.entries())
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 vendors

    return {
      type: 'bar',
      data: chartData,
      config: {
        title: 'Top Vendors by Spending',
        xAxis: 'vendor',
        yAxis: 'amount'
      }
    };
  }

  private generateGoalProgressChart(data: ReportData) {
    const chartData = data.goals.map(goal => ({
      title: goal.title,
      progress: goal.progress,
      status: goal.status
    }));

    return {
      type: 'progress_bar',
      data: chartData,
      config: {
        title: 'Goals Progress',
        labelKey: 'title',
        valueKey: 'progress'
      }
    };
  }

  // Calculate summary statistics
  private calculateSummaryStats(data: ReportData, config: ReportConfig): ReportMetrics {
    const stats: ReportMetrics = {
      ...data.metrics
    };

    // Add budget-specific metrics
    if (config.includeBudget) {
      const totalBudget = data.budgets.reduce((sum, b) => sum + b.budgeted_amount, 0);
      const totalSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);

      stats.total_budget = totalBudget;
      stats.total_spent = totalSpent;
      stats.budget_remaining = totalBudget - totalSpent;
      stats.budget_utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    }

    // Add goal-specific metrics
    if (config.includeGoals) {
      stats.total_goals = data.goals.length;
      stats.completed_goals = data.goals.filter(g => g.status === 'completed').length;
      stats.active_goals = data.goals.filter(g => g.status === 'active').length;
      stats.avg_goal_progress = data.goals.length > 0
        ? data.goals.reduce((sum, g) => sum + g.progress, 0) / data.goals.length
        : 0;
    }

    return stats;
  }

  // Report Management
  async getGeneratedReports(spaceId: string, limit = 50): Promise<GeneratedReport[]> {
    const { data, error } = await this.supabase
      .from('generated_reports')
      .select('*')
      .eq('space_id', spaceId)
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getGeneratedReport(id: string): Promise<GeneratedReport | null> {
    const { data, error } = await this.supabase
      .from('generated_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      // Increment view count
      await this.supabase
        .from('generated_reports')
        .update({
          view_count: data.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    return data;
  }

  async deleteGeneratedReport(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('generated_reports')
      .delete()
      .eq('id', id)
      .eq('generated_by', userId);

    if (error) throw error;
  }

  // Report Sharing
  async shareReport(reportId: string, expiresInHours = 168): Promise<string> { // Default 7 days
    const shareToken = await this.generateShareToken();
    const sharedUntil = new Date();
    sharedUntil.setHours(sharedUntil.getHours() + expiresInHours);

    const { error } = await this.supabase
      .from('generated_reports')
      .update({
        is_shared: true,
        share_token: shareToken,
        shared_until: sharedUntil.toISOString()
      })
      .eq('id', reportId);

    if (error) throw error;
    return shareToken;
  }

  async getSharedReport(shareToken: string): Promise<GeneratedReport | null> {
    const { data, error } = await this.supabase
      .from('generated_reports')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_shared', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      // Check if share has expired
      if (data.shared_until && new Date(data.shared_until) < new Date()) {
        return null;
      }

      // Increment view count
      await this.supabase
        .from('generated_reports')
        .update({
          view_count: data.view_count + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', data.id);
    }

    return data;
  }

  // Favorites Management
  async addToFavorites(
    userId: string,
    reportId?: string,
    templateId?: string,
    name?: string,
    notes?: string
  ): Promise<ReportFavorite> {
    const { data, error } = await this.supabase
      .from('report_favorites')
      .insert({
        user_id: userId,
        report_id: reportId,
        template_id: templateId,
        name,
        notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFavorites(userId: string): Promise<ReportFavorite[]> {
    const { data, error } = await this.supabase
      .from('report_favorites')
      .select(`
        *,
        generated_reports(*),
        report_templates(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async removeFromFavorites(userId: string, favoriteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('report_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Utility functions
  private async generateShareToken(): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('generate_report_share_token');

    if (error) throw error;
    return data;
  }

  // Date range helpers
  getDateRangePresets() {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);

    return {
      current_month: {
        start: currentMonth.toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      },
      last_month: {
        start: lastMonth.toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      },
      current_quarter: {
        start: currentQuarter.toISOString().split('T')[0],
        end: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0).toISOString().split('T')[0]
      },
      current_year: {
        start: currentYear.toISOString().split('T')[0],
        end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
      },
      last_30_days: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      },
      last_90_days: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    };
  }
}

export const financialReportsService = new FinancialReportsService();