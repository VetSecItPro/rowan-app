/**
 * Chore Rotation Job
 *
 * Runs daily to process chore rotations.
 */

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function processChoreRotations() {
  try {
    const { error } = await supabaseAdmin.rpc('process_chore_rotations');
    if (error) throw error;
    logger.info('✓ Processed chore rotations', { component: 'chore-rotation-job' });
    return { success: true };
  } catch (error) {
    logger.error('✗ Error processing chore rotations:', error, { component: 'chore-rotation-job', action: 'service_call' });
    return { success: false, error };
  }
}
