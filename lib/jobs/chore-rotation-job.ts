/**
 * Chore Rotation Job
 *
 * Runs daily to process chore rotations.
 */

import { choreRotationService } from '@/lib/services/chore-rotation-service';

export async function processChoreRotations() {
  try {
    await choreRotationService.processRotations();
    console.log('✓ Processed chore rotations');
    return { success: true };
  } catch (error) {
    console.error('✗ Error processing chore rotations:', error);
    return { success: false, error };
  }
}
