import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function generateTestCode() {
    const testCode = 'TEST-CODE-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabaseAdmin
        .from('beta_invite_codes')
        .insert([
            {
                code: testCode,
                is_active: true,
                source: 'testing',
                notes: 'Temporary code for E2E testing'
            }
        ])
        .select();

    if (error) {
        console.error('Error generating test code:', error);
        process.exit(1);
    }

    console.log('Successfully generated test beta code:', testCode);
    console.log('Code details:', data[0]);
}

generateTestCode();
