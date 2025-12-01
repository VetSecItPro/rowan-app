import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateUserSessions() {
  console.log('Checking if user_sessions table exists...');

  try {
    // First, check if the table exists
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✓ user_sessions table already exists');
      return;
    }

    if (!error.message.includes('does not exist')) {
      console.error('Error checking table:', error);
      return;
    }

    console.log('Table does not exist. Creating it now...');

    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20251017000030_add_user_sessions_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        const { error: execError } = await supabase.rpc('exec', {
          sql: statement + ';'
        });

        if (execError) {
          console.warn('Statement execution note:', execError.message);
        }
      } catch (err) {
        console.warn('Statement execution note:', err.message);
      }
    }

    // Verify the table was created
    const { error: verifyError } = await supabase
      .from('user_sessions')
      .select('id')
      .limit(1);

    if (verifyError && verifyError.message.includes('does not exist')) {
      console.error('Failed to create table. Please create it manually using the Supabase SQL editor.');
      console.log('\nMigration file location:');
      console.log('supabase/migrations/20251017000030_add_user_sessions_table.sql');
      process.exit(1);
    }

    console.log('✓ user_sessions table created successfully');

  } catch (error) {
    console.error('Migration error:', error.message);
    console.log('\nPlease manually run the migration using the Supabase SQL editor:');
    console.log('supabase/migrations/20251017000030_add_user_sessions_table.sql');
    process.exit(1);
  }
}

migrateUserSessions();
