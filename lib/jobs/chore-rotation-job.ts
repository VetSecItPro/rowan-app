/**
 * Chore Rotation Job
 *
 * Runs daily to process chore rotations.
 */

import { choreRotationService } from '@/lib/services/chore-rotation-service';
import { logger } from '@/lib/logger';

export async function processChoreRotations() {
  try {
    await choreRotationService.processRotations();
    logger.info('✓ Processed chore rotations', { component: 'chore-rotation-job' });
    return { success: true };
  } catch (error) {
    logger.error('✗ Error processing chore rotations:', error, { component: 'chore-rotation-job', action: 'service_call' });
    return { success: false, error };
  }
}
