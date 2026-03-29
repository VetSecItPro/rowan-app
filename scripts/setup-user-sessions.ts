/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * WARNING: This script uses the `exec_sql` RPC function which allows arbitrary SQL
 * execution. The `exec_sql` function MUST NOT exist in production databases.
 * It should only be created temporarily in development/staging for migrations.
 */

// Safety guard: never run in production
if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: This script must not run in production (uses exec_sql RPC).');
  process.exit(1);
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUserSessions() {
  console.log('Checking if user_sessions table exists...');

  // Try to query the table
  const { data, error } = await supabase
    .from('user_sessions')
    .select('id')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('Table does not exist. Creating it now...');

      // Read the migration file and execute it
      const fs = require('fs');
      const path = require('path');
      const migrationSQL = fs.readFileSync(
        path.join(__dirname, '../supabase/migrations/20251017000030_add_user_sessions_table.sql'),
        'utf8'
      );

      // Execute the SQL
      const { error: createError } = await supabase.rpc('exec_sql', { sql: migrationSQL });

      if (createError) {
        console.error('Error creating table:', createError);
        process.exit(1);
      }

      console.log('✓ user_sessions table created successfully');
    } else {
      console.error('Error checking table:', error);
      process.exit(1);
    }
  } else {
    console.log('✓ user_sessions table already exists');
  }
}

setupUserSessions();
