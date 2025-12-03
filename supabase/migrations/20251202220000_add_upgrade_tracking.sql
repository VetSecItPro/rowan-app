-- Create table to track upgrade page visits for conversion analytics
CREATE TABLE IF NOT EXISTS upgrade_page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_upgrade_visits_email ON upgrade_page_visits(email);
CREATE INDEX IF NOT EXISTS idx_upgrade_visits_date ON upgrade_page_visits(visited_at DESC);

-- Grant access
GRANT SELECT, INSERT ON upgrade_page_visits TO authenticated;
GRANT SELECT ON upgrade_page_visits TO anon;

-- Function to track upgrade page visit
CREATE OR REPLACE FUNCTION track_upgrade_page_visit(
  user_email TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO upgrade_page_visits (email)
  VALUES (user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for conversion analytics
CREATE OR REPLACE VIEW upgrade_conversion_stats AS
SELECT
  DATE(upv.visited_at) as visit_date,
  COUNT(DISTINCT upv.email) as unique_visitors,
  COUNT(*) as total_visits,
  COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN upv.email END) as conversions,
  ROUND(
    (COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN upv.email END)::NUMERIC /
     NULLIF(COUNT(DISTINCT upv.email), 0)) * 100,
    2
  ) as conversion_rate_percentage
FROM upgrade_page_visits upv
LEFT JOIN auth.users u ON u.email = upv.email AND u.created_at > upv.visited_at
GROUP BY DATE(upv.visited_at)
ORDER BY visit_date DESC;

-- Grant access to view
GRANT SELECT ON upgrade_conversion_stats TO authenticated;

COMMENT ON TABLE upgrade_page_visits IS 'Tracks visits to /upgrade page for conversion analytics';
COMMENT ON VIEW upgrade_conversion_stats IS 'Daily conversion statistics from upgrade page visits to account creation';
