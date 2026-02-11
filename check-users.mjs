import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check auth users
const { data: authData } = await supabase.auth.admin.listUsers();
const testUsers = authData.users.filter(u => u.email?.includes('rowan-test.app'));

console.log('Test users in auth.users:');
testUsers.forEach(u => console.log(`  ${u.email}: ${u.id}`));

// Check subscriptions
const userIds = testUsers.map(u => u.id);
const { data: subs } = await supabase
  .from('subscriptions')
  .select('*')
  .in('user_id', userIds);

console.log('\nSubscriptions:');
console.log(JSON.stringify(subs, null, 2));
