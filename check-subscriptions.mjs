import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const result = await supabase
  .from('subscriptions')
  .select('user_id, tier, status')
  .in('user_id', ['fd4cbd5a-47d0-4e32-a747-afbb5cc86fac', '9d6d09aa-22a4-4fc4-84c2-e18cc9e2f74f']);

console.log('Subscription data from database:');
console.log(JSON.stringify(result.data, null, 2));
