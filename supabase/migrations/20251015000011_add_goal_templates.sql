-- Create goal_templates table for pre-built goal templates
CREATE TABLE IF NOT EXISTS goal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('financial', 'health', 'home', 'relationship', 'career', 'personal', 'education', 'family')),
  icon TEXT, -- Emoji or icon identifier
  target_days INTEGER, -- Suggested number of days to complete
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create milestone_templates table for template milestones
CREATE TABLE IF NOT EXISTS milestone_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES goal_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'money', 'count', 'date')),
  target_value INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_public ON goal_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_milestone_templates_template_id ON milestone_templates(template_id);

-- Enable RLS on goal_templates
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view public templates
CREATE POLICY "Public templates are viewable by all"
  ON goal_templates
  FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

-- RLS Policy: Authenticated users can create private templates
CREATE POLICY "Users can create their own templates"
  ON goal_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- RLS Policy: Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON goal_templates
  FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policy: Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON goal_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Enable RLS on milestone_templates
ALTER TABLE milestone_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view milestone templates if they can view the parent template
CREATE POLICY "Milestone templates follow parent template access"
  ON milestone_templates
  FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM goal_templates WHERE is_public = true OR created_by = auth.uid()
    )
  );

-- RLS Policy: Users can manage milestone templates for their own templates
CREATE POLICY "Users can manage milestones for their templates"
  ON milestone_templates
  FOR ALL
  USING (
    template_id IN (
      SELECT id FROM goal_templates WHERE created_by = auth.uid()
    )
  );

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Find which template was used (if any) and increment its usage count
  -- This will be called when a goal is created with a template_id
  IF NEW.template_id IS NOT NULL THEN
    UPDATE goal_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add template_id column to goals table to track which template was used
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES goal_templates(id) ON DELETE SET NULL;

-- Trigger to increment usage when goal is created from template
DROP TRIGGER IF EXISTS trigger_increment_template_usage ON goals;
CREATE TRIGGER trigger_increment_template_usage
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- Seed data: Financial Templates
INSERT INTO goal_templates (title, description, category, icon, target_days) VALUES
('Build Emergency Fund', 'Save 3-6 months of living expenses for unexpected situations', 'financial', '💰', 180),
('Pay Off Debt', 'Eliminate credit card or loan debt systematically', 'financial', '💳', 365),
('Save for Home Down Payment', 'Accumulate funds for a house or apartment down payment', 'financial', '🏠', 730),
('Retirement Savings Boost', 'Increase retirement account contributions and grow nest egg', 'financial', '🏦', 365),
('Investment Portfolio', 'Build a diversified investment portfolio', 'financial', '📈', 365);

-- Seed data: Health Templates
INSERT INTO goal_templates (title, description, category, icon, target_days) VALUES
('Weight Loss Journey', 'Lose weight through healthy eating and regular exercise', 'health', '⚖️', 180),
('Fitness Challenge', 'Complete a fitness program or training routine', 'health', '💪', 90),
('Healthy Eating Habits', 'Develop consistent nutritious eating patterns', 'health', '🥗', 90),
('Run a Marathon', 'Train for and complete a marathon race', 'health', '🏃', 180),
('Quit Smoking', 'Successfully quit smoking and stay smoke-free', 'health', '🚭', 90);

-- Seed data: Home Templates
INSERT INTO goal_templates (title, description, category, icon, target_days) VALUES
('Home Renovation Project', 'Complete a major home improvement or renovation', 'home', '🏡', 180),
('Organize Every Room', 'Declutter and organize entire living space', 'home', '📦', 60),
('Garden Development', 'Create and maintain a thriving garden', 'home', '🌱', 120),
('Energy Efficiency Upgrade', 'Improve home energy efficiency and reduce utility costs', 'home', '⚡', 90);

-- Seed data: Relationship Templates
INSERT INTO goal_templates (title, description, category, icon, target_days) VALUES
('Weekly Date Nights', 'Establish regular quality time with partner', 'relationship', '💑', 90),
('Improve Communication', 'Enhance communication skills and emotional connection', 'relationship', '💬', 90),
('Plan Dream Vacation', 'Research, plan and book a memorable trip together', 'relationship', '✈️', 120),
('Strengthen Family Bonds', 'Increase quality time and connection with family', 'relationship', '👨‍👩‍👧‍👦', 180);

-- Seed data: Career Templates
INSERT INTO goal_templates (title, description, category, icon, target_days) VALUES
('Career Advancement', 'Work toward promotion or next career level', 'career', '📊', 365),
('Learn New Skill', 'Master a new professional or technical skill', 'career', '🎓', 180),
('Start Side Business', 'Launch and grow a side business or freelance practice', 'career', '💼', 365),
('Network Building', 'Expand professional network and connections', 'career', '🤝', 180),
('Complete Certification', 'Earn a professional certification or credential', 'career', '📜', 180);

-- Seed milestone templates for Emergency Fund
INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Save First $1000', 'Build initial starter emergency fund', 'money', 1000, 1
FROM goal_templates WHERE title = 'Build Emergency Fund';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Reach 1 Month Expenses', 'Save one month of living expenses', 'money', 3000, 2
FROM goal_templates WHERE title = 'Build Emergency Fund';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Reach 3 Months Expenses', 'Save three months of living expenses', 'money', 9000, 3
FROM goal_templates WHERE title = 'Build Emergency Fund';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Reach 6 Months Expenses', 'Complete emergency fund goal', 'money', 18000, 4
FROM goal_templates WHERE title = 'Build Emergency Fund';

-- Seed milestone templates for Weight Loss
INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Lose First 5 Pounds', 'Initial weight loss progress', 'count', 5, 1
FROM goal_templates WHERE title = 'Weight Loss Journey';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Lose 10 Pounds', 'Reach 10 pound weight loss', 'count', 10, 2
FROM goal_templates WHERE title = 'Weight Loss Journey';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Lose 20 Pounds', 'Major weight loss milestone', 'count', 20, 3
FROM goal_templates WHERE title = 'Weight Loss Journey';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Reach Target Weight', 'Achieve final weight goal', 'count', 30, 4
FROM goal_templates WHERE title = 'Weight Loss Journey';

-- Seed milestone templates for Home Renovation
INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Planning Complete', 'Finalize design and budget plans', 'percentage', 25, 1
FROM goal_templates WHERE title = 'Home Renovation Project';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Materials Purchased', 'Buy all necessary materials and supplies', 'percentage', 50, 2
FROM goal_templates WHERE title = 'Home Renovation Project';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Construction 75% Done', 'Complete majority of construction work', 'percentage', 75, 3
FROM goal_templates WHERE title = 'Home Renovation Project';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Project Completed', 'Finish all renovation work and cleanup', 'percentage', 100, 4
FROM goal_templates WHERE title = 'Home Renovation Project';

-- Seed milestone templates for Career Advancement
INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Skills Assessment', 'Identify required skills and gaps', 'percentage', 25, 1
FROM goal_templates WHERE title = 'Career Advancement';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Complete Training', 'Finish necessary courses or training', 'percentage', 50, 2
FROM goal_templates WHERE title = 'Career Advancement';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Performance Review', 'Receive positive performance feedback', 'percentage', 75, 3
FROM goal_templates WHERE title = 'Career Advancement';

INSERT INTO milestone_templates (template_id, title, description, type, target_value, order_index)
SELECT id, 'Promotion Achieved', 'Secure promotion or advancement', 'percentage', 100, 4
FROM goal_templates WHERE title = 'Career Advancement';

-- Grant permissions
GRANT ALL ON goal_templates TO authenticated;
GRANT ALL ON goal_templates TO service_role;
GRANT ALL ON milestone_templates TO authenticated;
GRANT ALL ON milestone_templates TO service_role;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_goal_templates_updated_at ON goal_templates;
CREATE TRIGGER update_goal_templates_updated_at
  BEFORE UPDATE ON goal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
