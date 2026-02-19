-- Fix get_task_stats RPC to count both hyphenated and underscored status formats
-- The DB constraint allows both 'in-progress' and 'in_progress', so the RPC must count both
CREATE OR REPLACE FUNCTION get_task_stats(p_space_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'inProgress', COUNT(*) FILTER (WHERE status IN ('in-progress', 'in_progress')),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
    'onHold', COUNT(*) FILTER (WHERE status IN ('on-hold', 'on_hold')),
    'byPriority', json_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')
    )
  )
  FROM public.tasks WHERE space_id = p_space_id
$$;
