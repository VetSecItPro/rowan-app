/**
 * Cleanup script for the design audit seed user.
 * Deletes all related rows then the auth user.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAIL = 'design-audit@rowan-test.app';

async function main() {
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', EMAIL)
    .single();
  if (!profile) {
    console.log('User not found');
    return;
  }
  const userId = profile.id;
  console.log('Cleaning up user:', userId);

  const { data: spaces } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId);
  const spaceIds = (spaces || []).map((s) => s.space_id);
  console.log('Spaces:', spaceIds);

  // Delete in reverse FK order
  const userScopedTables = [
    'activity_logs',
    'check_ins',
    'expenses',
    'reminders',
    'shopping_items',
    'shopping_lists',
    'meal_plans',
    'recipes',
    'goals',
    'milestones',
    'budgets',
    'events',
    'chores',
    'tasks',
    'ai_messages',
    'ai_conversations',
    'space_members',
    'subscriptions',
    'notification_preferences',
    'user_notification_preferences',
  ];

  for (const table of userScopedTables) {
    const { error: e1 } = await supabase.from(table).delete().eq('user_id', userId);
    const { error: e2 } = await supabase.from(table).delete().eq('created_by', userId);
    if (e1 && !e1.message.includes('user_id')) console.log(`  ${table} (user_id):`, e1.message);
    if (e2 && !e2.message.includes('created_by')) console.log(`  ${table} (created_by):`, e2.message);
  }

  // Delete space-scoped data
  for (const spaceId of spaceIds) {
    for (const table of userScopedTables) {
      const { error } = await supabase.from(table).delete().eq('space_id', spaceId);
      if (error && !error.message.includes('space_id')) console.log(`  ${table} (space_id):`, error.message);
    }
  }

  // Delete the spaces themselves
  if (spaceIds.length > 0) {
    const { error } = await supabase.from('spaces').delete().in('id', spaceIds);
    if (error) console.log('  spaces:', error.message);
  }

  // Delete the public.users row
  await supabase.from('users').delete().eq('id', userId);

  // Finally delete the auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('Auth delete failed:', authError.message);
    process.exit(1);
  }
  console.log('Cleanup complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
