-- ==========================================
-- SHOPPING LIST COMPREHENSIVE ENHANCEMENTS
-- Date: October 12, 2025
-- ==========================================

-- ==========================================
-- 1. SHOPPING_ITEMS ENHANCEMENTS
-- ==========================================

-- Add category and sort order for organization
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'uncategorized',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add assignment functionality
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add price tracking
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_price DECIMAL(10,2);

-- Add recipe source tracking (already exists but ensure it's there)
ALTER TABLE shopping_items
ADD COLUMN IF NOT EXISTS recipe_source_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category);
CREATE INDEX IF NOT EXISTS idx_shopping_items_assigned_to ON shopping_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id_sort ON shopping_items(list_id, sort_order);

-- ==========================================
-- 2. SHOPPING_LISTS ENHANCEMENTS
-- ==========================================

-- Add store information
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);

-- Add budget tracking
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS estimated_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);

-- Add last modified tracking
ALTER TABLE shopping_lists
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shopping_lists_store ON shopping_lists(store_name);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_modified ON shopping_lists(last_modified_at);

-- ==========================================
-- 3. SHOPPING TEMPLATES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS shopping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_shopping_templates_space ON shopping_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_shopping_templates_created_by ON shopping_templates(created_by);

-- RLS policies for templates
ALTER TABLE shopping_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their space"
  ON shopping_templates FOR SELECT
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create templates in their space"
  ON shopping_templates FOR INSERT
  WITH CHECK (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update templates in their space"
  ON shopping_templates FOR UPDATE
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete templates in their space"
  ON shopping_templates FOR DELETE
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

-- ==========================================
-- 4. STORE LAYOUTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS store_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  aisle_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, store_name)
);

-- Indexes for store layouts
CREATE INDEX IF NOT EXISTS idx_store_layouts_space ON store_layouts(space_id);
CREATE INDEX IF NOT EXISTS idx_store_layouts_store_name ON store_layouts(store_name);

-- RLS policies for store layouts
ALTER TABLE store_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view layouts in their space"
  ON store_layouts FOR SELECT
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage layouts in their space"
  ON store_layouts FOR ALL
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

-- ==========================================
-- 5. SHOPPING-CALENDAR INTEGRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS shopping_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reminder_time INTEGER, -- minutes before event
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_calendar_list ON shopping_calendar_events(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_calendar_event ON shopping_calendar_events(event_id);

-- RLS policies
ALTER TABLE shopping_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage calendar links in their space"
  ON shopping_calendar_events FOR ALL
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- ==========================================
-- 6. SHOPPING-TASKS INTEGRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS shopping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sync_completion BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_tasks_list ON shopping_tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_tasks_task ON shopping_tasks(task_id);

-- RLS policies
ALTER TABLE shopping_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage task links in their space"
  ON shopping_tasks FOR ALL
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
  );

-- ==========================================
-- 7. SHOPPING-REMINDERS INTEGRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS shopping_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shopping_items(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) DEFAULT 'time', -- 'time', 'location'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shopping_reminders_check CHECK (list_id IS NOT NULL OR item_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_reminders_list ON shopping_reminders(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_reminders_item ON shopping_reminders(item_id);
CREATE INDEX IF NOT EXISTS idx_shopping_reminders_reminder ON shopping_reminders(reminder_id);

-- RLS policies
ALTER TABLE shopping_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reminder links in their space"
  ON shopping_reminders FOR ALL
  USING (
    COALESCE(
      list_id IN (
        SELECT id FROM shopping_lists WHERE space_id IN (
          SELECT space_id FROM space_members WHERE user_id = auth.uid()
        )
      ),
      item_id IN (
        SELECT id FROM shopping_items WHERE list_id IN (
          SELECT id FROM shopping_lists WHERE space_id IN (
            SELECT space_id FROM space_members WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- ==========================================
-- 8. ITEM HISTORY TABLE (for smart suggestions)
-- ==========================================

CREATE TABLE IF NOT EXISTS shopping_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  frequency INTEGER DEFAULT 1,
  last_purchased TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_item_history_space ON shopping_item_history(space_id);
CREATE INDEX IF NOT EXISTS idx_item_history_name ON shopping_item_history(item_name);
CREATE INDEX IF NOT EXISTS idx_item_history_frequency ON shopping_item_history(frequency DESC);

-- RLS policies
ALTER TABLE shopping_item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history in their space"
  ON shopping_item_history FOR SELECT
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage history in their space"
  ON shopping_item_history FOR ALL
  USING (space_id IN (
    SELECT space_id FROM space_members WHERE user_id = auth.uid()
  ));

-- ==========================================
-- 9. TRIGGERS AND FUNCTIONS
-- ==========================================

-- Update last_modified tracking
CREATE OR REPLACE FUNCTION update_shopping_list_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  -- Set last_modified_by if not explicitly set
  IF NEW.last_modified_by IS NULL THEN
    NEW.last_modified_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shopping_list_modified ON shopping_lists;
CREATE TRIGGER shopping_list_modified
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_list_modified();

-- Update template timestamps
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_updated ON shopping_templates;
CREATE TRIGGER template_updated
  BEFORE UPDATE ON shopping_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- Track item history on completion
CREATE OR REPLACE FUNCTION track_shopping_item_history()
RETURNS TRIGGER AS $$
DECLARE
  v_space_id UUID;
BEGIN
  -- Only track when item is checked
  IF NEW.checked = true AND (OLD.checked IS NULL OR OLD.checked = false) THEN
    -- Get space_id from list
    SELECT space_id INTO v_space_id
    FROM shopping_lists
    WHERE id = NEW.list_id;

    -- Insert or update history
    INSERT INTO shopping_item_history (space_id, item_name, category, frequency, last_purchased)
    VALUES (v_space_id, NEW.name, NEW.category, 1, NOW())
    ON CONFLICT (space_id, item_name)
    DO UPDATE SET
      frequency = shopping_item_history.frequency + 1,
      last_purchased = NOW(),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- First need to add unique constraint for upsert to work
ALTER TABLE shopping_item_history
DROP CONSTRAINT IF EXISTS shopping_item_history_space_name_unique;

ALTER TABLE shopping_item_history
ADD CONSTRAINT shopping_item_history_space_name_unique UNIQUE (space_id, item_name);

DROP TRIGGER IF EXISTS track_item_history ON shopping_items;
CREATE TRIGGER track_item_history
  AFTER UPDATE ON shopping_items
  FOR EACH ROW
  EXECUTE FUNCTION track_shopping_item_history();

-- ==========================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN shopping_items.category IS 'Item category for organization (produce, dairy, meat, etc.)';
COMMENT ON COLUMN shopping_items.sort_order IS 'Custom sort order within category';
COMMENT ON COLUMN shopping_items.assigned_to IS 'User assigned to get this item';
COMMENT ON COLUMN shopping_items.estimated_price IS 'Estimated price of item';
COMMENT ON COLUMN shopping_items.actual_price IS 'Actual price paid for item';

COMMENT ON COLUMN shopping_lists.store_name IS 'Store where shopping will be done';
COMMENT ON COLUMN shopping_lists.estimated_total IS 'Estimated total cost of list';
COMMENT ON COLUMN shopping_lists.actual_total IS 'Actual total cost of list';
COMMENT ON COLUMN shopping_lists.budget IS 'Budget limit for this shopping list';
COMMENT ON COLUMN shopping_lists.last_modified_by IS 'User who last modified the list';
COMMENT ON COLUMN shopping_lists.last_modified_at IS 'Timestamp of last modification';

COMMENT ON TABLE shopping_templates IS 'Reusable shopping list templates';
COMMENT ON TABLE store_layouts IS 'Custom aisle ordering per store';
COMMENT ON TABLE shopping_calendar_events IS 'Links shopping lists to calendar events';
COMMENT ON TABLE shopping_tasks IS 'Links shopping lists to tasks';
COMMENT ON TABLE shopping_reminders IS 'Links shopping lists/items to reminders';
COMMENT ON TABLE shopping_item_history IS 'Purchase history for smart suggestions';
