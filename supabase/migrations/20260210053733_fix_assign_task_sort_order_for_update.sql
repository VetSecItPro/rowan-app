-- Migration: fix_assign_task_sort_order_for_update
-- Applied via MCP on 2026-02-10
-- Fixes assign_task_sort_order trigger to remove FOR UPDATE lock
-- which caused deadlocks with concurrent task updates

CREATE OR REPLACE FUNCTION assign_task_sort_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  max_order INTEGER;
BEGIN
  IF NEW.sort_order = 0 OR NEW.sort_order IS NULL THEN
    -- Remove FOR UPDATE - can't use it with MAX()
    -- SECURITY DEFINER bypasses RLS so we don't need row locking
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO max_order
    FROM public.tasks
    WHERE space_id = NEW.space_id;

    NEW.sort_order = max_order;
  END IF;

  RETURN NEW;
END;
$$;
