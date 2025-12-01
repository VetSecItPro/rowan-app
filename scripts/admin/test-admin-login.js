#!/usr/bin/env node

/**
 * Test Admin Login Script
 * Tests the admin login API endpoint to verify authentication works
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const ADMIN_EMAIL = 'ops@steelmotionllc.com';
const ADMIN_PASSWORD = 'RowanOps2025!';

console.log('🔐 Testing Admin Login API...\n');

async function testAdminLogin() {
  try {
    const response = await fetch('http://localhost:3001/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    const responseText = await response.text();
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Body: ${responseText}`);

    if (response.ok) {
      console.log('\n✅ Admin login test successful!');
      const data = JSON.parse(responseText);
      if (data.sessionToken) {
        console.log('🎟️  Session token received');

        // Test authenticated access to dashboard stats
        console.log('\n🔍 Testing authenticated dashboard access...');
        const statsResponse = await fetch('http://localhost:3001/api/admin/dashboard/stats', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.sessionToken}`,
          },
        });

        console.log(`📊 Dashboard Stats Status: ${statsResponse.status}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.text();
          console.log('✅ Dashboard access successful!');
          console.log('📈 Stats data received');
        } else {
          console.log('⚠️  Dashboard access failed');
        }
      }
    } else {
      console.log('❌ Admin login failed');
      if (responseText.includes('infinite recursion')) {
        console.log('🔧 RLS policies still need to be fixed manually');
        console.log('💡 Please run the SQL fix provided earlier');
      }
    }

  } catch (error) {
    console.error('❌ Error testing admin login:', error.message);
  }
}

// Run the test
testAdminLogin().catch(console.error);