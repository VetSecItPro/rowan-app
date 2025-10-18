-- Financial Reports System
-- Comprehensive reporting with PDF generation capabilities

-- Report Templates (predefined report types)
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template metadata
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'budget', 'expenses', 'goals', 'trends', 'summary'
    report_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'custom'

    -- Template configuration
    config JSONB NOT NULL DEFAULT '{}', -- Chart types, filters, groupings, etc.
    default_date_range TEXT DEFAULT 'current_month', -- 'current_month', 'last_month', 'current_quarter', etc.

    -- Template properties
    is_system BOOLEAN DEFAULT true, -- System vs user-created templates
    is_active BOOLEAN DEFAULT true,
    requires_goals BOOLEAN DEFAULT false,
    requires_budget BOOLEAN DEFAULT false,

    -- Access control
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Generated Reports (actual report instances)
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Report metadata
    title TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,

    -- Generated content
    data JSONB NOT NULL DEFAULT '{}', -- Processed financial data
    charts_config JSONB DEFAULT '{}', -- Chart configurations and data
    summary_stats JSONB DEFAULT '{}', -- Key metrics and totals

    -- PDF and file storage
    pdf_url TEXT, -- URL to generated PDF file
    pdf_size INTEGER, -- File size in bytes
    file_path TEXT, -- Storage path

    -- Generation metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_time_ms INTEGER, -- How long generation took

    -- Status and sharing
    status TEXT DEFAULT 'generated', -- 'generating', 'generated', 'failed', 'archived'
    is_shared BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE, -- For secure sharing
    shared_until TIMESTAMP WITH TIME ZONE,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Report Schedules (automated report generation)
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Schedule configuration
    name TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    schedule_config JSONB DEFAULT '{}', -- Cron-like config, specific days, etc.

    -- Email settings
    email_recipients TEXT[], -- Array of email addresses
    email_subject_template TEXT,
    email_body_template TEXT,
    include_pdf BOOLEAN DEFAULT true,

    -- Schedule status
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,

    -- User preferences
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Report Favorites (user bookmarks)
CREATE TABLE IF NOT EXISTS report_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,

    -- Favorite metadata
    name TEXT, -- Custom name for the favorite
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    UNIQUE(user_id, report_id),
    UNIQUE(user_id, template_id),
    CONSTRAINT favorite_target CHECK (
        (report_id IS NOT NULL AND template_id IS NULL) OR
        (report_id IS NULL AND template_id IS NOT NULL)
    )
);

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "Users can view system and space templates" ON report_templates
    FOR SELECT USING (
        is_system = true OR
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create templates for their spaces" ON report_templates
    FOR INSERT WITH CHECK (
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update their own templates" ON report_templates
    FOR UPDATE USING (
        created_by = auth.uid() AND
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own templates" ON report_templates
    FOR DELETE USING (
        created_by = auth.uid() AND
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    );

-- RLS Policies for generated_reports
CREATE POLICY "Users can view reports from their spaces" ON generated_reports
    FOR SELECT USING (
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()) OR
        (is_shared = true AND share_token IS NOT NULL)
    );

CREATE POLICY "Users can create reports for their spaces" ON generated_reports
    FOR INSERT WITH CHECK (
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid()) AND
        generated_by = auth.uid()
    );

CREATE POLICY "Users can update their own reports" ON generated_reports
    FOR UPDATE USING (
        generated_by = auth.uid() AND
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own reports" ON generated_reports
    FOR DELETE USING (
        generated_by = auth.uid() AND
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    );

-- RLS Policies for report_schedules
CREATE POLICY "Users can manage schedules for their spaces" ON report_schedules
    FOR ALL USING (
        space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
    );

-- RLS Policies for report_favorites
CREATE POLICY "Users can manage their own favorites" ON report_favorites
    FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_templates_space_id ON report_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_generated_reports_space_id ON generated_reports(space_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template_id ON generated_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_date_range ON generated_reports(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_generated_reports_share_token ON generated_reports(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_schedules_space_id ON report_schedules(space_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

-- Insert default system templates
INSERT INTO report_templates (name, description, category, report_type, config, is_system, space_id) VALUES
-- Budget Reports
('Monthly Budget Overview', 'Comprehensive monthly budget vs actual spending analysis', 'budget', 'monthly', '{"charts": ["budget_vs_actual", "category_breakdown"], "metrics": ["total_budget", "total_spent", "remaining", "variance"], "groupBy": "category"}', true, null),
('Quarterly Budget Analysis', 'Quarterly budget performance with trend analysis', 'budget', 'quarterly', '{"charts": ["trend_line", "category_comparison"], "metrics": ["quarterly_totals", "avg_monthly", "growth_rate"], "groupBy": "month"}', true, null),
('Budget Category Deep Dive', 'Detailed analysis of spending by category', 'budget', 'custom', '{"charts": ["category_pie", "subcategory_bar"], "metrics": ["category_totals", "category_percentages"], "groupBy": "category", "includeSubcategories": true}', true, null),

-- Expense Reports
('Monthly Expense Summary', 'Complete monthly expense breakdown and analysis', 'expenses', 'monthly', '{"charts": ["expense_timeline", "top_vendors"], "metrics": ["total_expenses", "avg_daily", "highest_expense"], "groupBy": "date"}', true, null),
('Vendor Spending Report', 'Analysis of spending patterns by vendor', 'expenses', 'custom', '{"charts": ["vendor_bar", "vendor_trends"], "metrics": ["top_vendors", "vendor_totals"], "groupBy": "vendor", "includeRecurring": true}', true, null),
('Recurring Expenses Analysis', 'Analysis of all recurring expenses and subscriptions', 'expenses', 'custom', '{"charts": ["recurring_timeline", "category_breakdown"], "metrics": ["total_recurring", "monthly_impact"], "filterBy": "recurring", "groupBy": "category"}', true, null),

-- Goal Reports
('Goals Financial Impact', 'Financial progress and impact of goals', 'goals', 'custom', '{"charts": ["goal_progress", "financial_allocation"], "metrics": ["goals_budget", "spent_on_goals", "goals_roi"], "requiresGoals": true}', true, null),
('Monthly Goals Progress', 'Monthly progress report for financial goals', 'goals', 'monthly', '{"charts": ["progress_bar", "milestone_timeline"], "metrics": ["completed_goals", "progress_percentage"], "requiresGoals": true}', true, null),

-- Trend Reports
('Spending Trends Analysis', 'Long-term spending patterns and trends', 'trends', 'yearly', '{"charts": ["trend_line", "seasonal_analysis"], "metrics": ["yoy_growth", "seasonal_patterns"], "groupBy": "month", "includeForecast": true}', true, null),
('Category Trends Report', 'Spending trends by category over time', 'trends', 'quarterly', '{"charts": ["category_trends", "growth_rates"], "metrics": ["category_growth", "emerging_categories"], "groupBy": "category"}', true, null),

-- Summary Reports
('Financial Dashboard', 'Executive summary of all financial metrics', 'summary', 'monthly', '{"charts": ["kpi_cards", "summary_charts"], "metrics": ["net_worth", "cash_flow", "savings_rate"], "includeAll": true}', true, null),
('Year-End Financial Summary', 'Comprehensive annual financial review', 'summary', 'yearly', '{"charts": ["annual_summary", "year_comparison"], "metrics": ["annual_totals", "yoy_comparison"], "includeGoals": true, "includeBudget": true}', true, null);

-- Function to get financial data for reports
CREATE OR REPLACE FUNCTION get_financial_report_data(
    p_space_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_config JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    expense_data JSONB;
    budget_data JSONB;
    goal_data JSONB;
    metrics JSONB;
BEGIN
    -- Get expense data
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'amount', amount,
            'category', category,
            'subcategory', subcategory,
            'vendor', vendor,
            'description', description,
            'date', date,
            'is_recurring', is_recurring
        )
    ), '[]'::jsonb) INTO expense_data
    FROM expenses
    WHERE space_id = p_space_id
    AND date BETWEEN p_start_date AND p_end_date;

    -- Get budget data
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'category', category,
            'budgeted_amount', amount,
            'period', period
        )
    ), '[]'::jsonb) INTO budget_data
    FROM budgets
    WHERE space_id = p_space_id
    AND is_active = true;

    -- Get goal data (if config includes goals)
    IF (p_config->>'includeGoals')::boolean = true THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', id,
                'title', title,
                'category', category,
                'status', status,
                'progress', progress,
                'target_date', target_date
            )
        ), '[]'::jsonb) INTO goal_data
        FROM goals
        WHERE space_id = p_space_id
        AND created_at BETWEEN p_start_date::timestamp AND p_end_date::timestamp;
    END IF;

    -- Calculate key metrics
    SELECT jsonb_build_object(
        'total_expenses', COALESCE(SUM(amount), 0),
        'expense_count', COUNT(*),
        'avg_expense', COALESCE(AVG(amount), 0),
        'max_expense', COALESCE(MAX(amount), 0),
        'categories_count', COUNT(DISTINCT category),
        'vendors_count', COUNT(DISTINCT vendor)
    ) INTO metrics
    FROM expenses
    WHERE space_id = p_space_id
    AND date BETWEEN p_start_date AND p_end_date;

    -- Build result
    result := jsonb_build_object(
        'expenses', expense_data,
        'budgets', budget_data,
        'goals', COALESCE(goal_data, '[]'::jsonb),
        'metrics', metrics,
        'date_range', jsonb_build_object(
            'start', p_start_date,
            'end', p_end_date
        ),
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_report_share_token() RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old reports
CREATE OR REPLACE FUNCTION cleanup_old_reports() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete reports older than 1 year that aren't favorites
    DELETE FROM generated_reports
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND id NOT IN (SELECT report_id FROM report_favorites WHERE report_id IS NOT NULL);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;