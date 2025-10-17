-- Enhanced voice notes system with transcription and metadata support

-- Create voice_transcriptions table for storing transcription results
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_check_in_id UUID REFERENCES goal_check_ins(id) ON DELETE CASCADE,

  -- Transcription data
  transcription TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.0, -- 0.00 to 1.00
  language VARCHAR(10) DEFAULT 'en-US',
  duration INTEGER DEFAULT 0, -- in seconds
  word_count INTEGER DEFAULT 0,
  keywords JSONB DEFAULT '[]'::jsonb,

  -- Analysis results
  sentiment VARCHAR(20) DEFAULT 'neutral',
  emotions JSONB DEFAULT '[]'::jsonb,
  topics JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  summary TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voice_note_templates table for storing reusable templates
CREATE TABLE IF NOT EXISTS voice_note_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Template details
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  prompt TEXT NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add enhanced voice note metadata to goal_check_ins
ALTER TABLE goal_check_ins
ADD COLUMN IF NOT EXISTS voice_note_category VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS voice_note_template_id UUID REFERENCES voice_note_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS voice_note_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_user_id ON voice_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_goal_check_in_id ON voice_transcriptions(goal_check_in_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_created_at ON voice_transcriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_keywords ON voice_transcriptions USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_transcription ON voice_transcriptions USING gin(to_tsvector('english', transcription));

CREATE INDEX IF NOT EXISTS idx_voice_note_templates_space_id ON voice_note_templates(space_id);
CREATE INDEX IF NOT EXISTS idx_voice_note_templates_category ON voice_note_templates(category);
CREATE INDEX IF NOT EXISTS idx_voice_note_templates_is_active ON voice_note_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_goal_check_ins_voice_category ON goal_check_ins(voice_note_category);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_voice_template ON goal_check_ins(voice_note_template_id);

-- Enable RLS
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_note_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_transcriptions

-- Users can view their own transcriptions
CREATE POLICY "Users can view their own transcriptions"
  ON voice_transcriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create transcriptions for their own check-ins
CREATE POLICY "Users can create transcriptions for their check-ins"
  ON voice_transcriptions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      goal_check_in_id IS NULL
      OR
      goal_check_in_id IN (
        SELECT ci.id FROM goal_check_ins ci
        WHERE ci.user_id = auth.uid()
      )
    )
  );

-- Users can update their own transcriptions
CREATE POLICY "Users can update their own transcriptions"
  ON voice_transcriptions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own transcriptions
CREATE POLICY "Users can delete their own transcriptions"
  ON voice_transcriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for voice_note_templates

-- Users can view templates in their spaces or default templates
CREATE POLICY "Users can view accessible templates"
  ON voice_note_templates
  FOR SELECT
  USING (
    is_default = TRUE
    OR
    (space_id IS NOT NULL AND space_id IN (
      SELECT sm.space_id FROM space_members sm
      WHERE sm.user_id = auth.uid()
    ))
  );

-- Users can create templates in spaces they belong to
CREATE POLICY "Users can create templates in their spaces"
  ON voice_note_templates
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      space_id IS NULL
      OR
      space_id IN (
        SELECT sm.space_id FROM space_members sm
        WHERE sm.user_id = auth.uid()
      )
    )
  );

-- Users can update templates they created
CREATE POLICY "Users can update their own templates"
  ON voice_note_templates
  FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete templates they created (unless they're default templates)
CREATE POLICY "Users can delete their own templates"
  ON voice_note_templates
  FOR DELETE
  USING (created_by = auth.uid() AND is_default = FALSE);

-- Function to update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE voice_note_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create transcription when voice note is added
CREATE OR REPLACE FUNCTION create_voice_transcription_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create transcription entry if voice note URL exists
  IF NEW.voice_note_url IS NOT NULL AND NEW.voice_note_url != '' THEN
    -- Insert placeholder transcription entry that can be updated later
    INSERT INTO voice_transcriptions (
      user_id,
      goal_check_in_id,
      transcription,
      confidence,
      duration
    ) VALUES (
      NEW.user_id,
      NEW.id,
      '', -- Will be updated when transcription is complete
      0.0,
      COALESCE(NEW.voice_note_duration, 0)
    );

    -- Increment template usage if template was used
    IF NEW.voice_note_template_id IS NOT NULL THEN
      PERFORM increment_template_usage(NEW.voice_note_template_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic transcription entry creation
DROP TRIGGER IF EXISTS trigger_create_voice_transcription_entry ON goal_check_ins;
CREATE TRIGGER trigger_create_voice_transcription_entry
  AFTER INSERT ON goal_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION create_voice_transcription_entry();

-- Function to search transcriptions with full-text search
CREATE OR REPLACE FUNCTION search_voice_transcriptions(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  transcription TEXT,
  confidence DECIMAL,
  language VARCHAR,
  duration INTEGER,
  keywords JSONB,
  goal_check_in_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vt.id,
    vt.transcription,
    vt.confidence,
    vt.language,
    vt.duration,
    vt.keywords,
    vt.goal_check_in_id,
    vt.created_at,
    ts_rank(to_tsvector('english', vt.transcription), plainto_tsquery('english', p_query)) as rank
  FROM voice_transcriptions vt
  WHERE vt.user_id = p_user_id
    AND to_tsvector('english', vt.transcription) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, vt.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default voice note templates
INSERT INTO voice_note_templates (name, category, prompt, questions, is_default, created_by) VALUES
('Progress Update', 'progress', 'Share what progress you''ve made since your last check-in',
 '["What specific actions did you take?", "What results did you achieve?", "How do you feel about your progress?"]'::jsonb,
 TRUE, (SELECT id FROM users LIMIT 1)),

('Challenges & Blockers', 'challenges', 'Reflect on any challenges or obstacles you''ve encountered',
 '["What challenges are you facing?", "What''s preventing you from moving forward?", "What support or resources do you need?"]'::jsonb,
 TRUE, (SELECT id FROM users LIMIT 1)),

('Personal Reflection', 'reflections', 'Take a moment to reflect on your goal journey',
 '["How has this goal impacted you personally?", "What have you learned about yourself?", "What would you do differently?"]'::jsonb,
 TRUE, (SELECT id FROM users LIMIT 1)),

('Next Steps Planning', 'goals', 'Plan your next steps and set intentions',
 '["What will you focus on next?", "What are your priorities for the coming period?", "How will you measure success?"]'::jsonb,
 TRUE, (SELECT id FROM users LIMIT 1)),

('Quick Check-In', 'general', 'A quick voice update on how things are going',
 '["How are you feeling about your goal today?", "What''s one thing you accomplished?", "What''s one thing you want to improve?"]'::jsonb,
 TRUE, (SELECT id FROM users LIMIT 1));

-- Grant permissions
GRANT ALL ON voice_transcriptions TO authenticated;
GRANT ALL ON voice_transcriptions TO service_role;
GRANT ALL ON voice_note_templates TO authenticated;
GRANT ALL ON voice_note_templates TO service_role;

-- Grant execution permissions for functions
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_voice_transcriptions(UUID, TEXT, INTEGER) TO authenticated;