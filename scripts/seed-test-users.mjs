/**
 * Script to create 5 test users with mock data for admin dashboard testing
 *
 * Creates users:
 * - testuser1@fake.com - Free tier
 * - testuser2@fake.com - Pro Monthly ($9.99/mo)
 * - testuser3@fake.com - Pro Yearly ($99.99/yr)
 * - testuser4@fake.com - Family Monthly ($14.99/mo)
 * - testuser5@fake.com - Trial (14-day)
 *
 * Run: node scripts/seed-test-users.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test user configurations
const testUsers = [
  {
    email: 'testuser1@fake.com',
    password: 'TestUser123!',
    name: 'Sarah Mitchell',
    subscription: { tier: 'free', status: 'active', period: 'monthly' }
  },
  {
    email: 'testuser2@fake.com',
    password: 'TestUser123!',
    name: 'Michael Chen',
    subscription: {
      tier: 'pro',
      status: 'active',
      period: 'monthly',
      stripe_customer_id: 'cus_test_michael_001',
      stripe_subscription_id: 'sub_test_michael_001'
    }
  },
  {
    email: 'testuser3@fake.com',
    password: 'TestUser123!',
    name: 'Emma Rodriguez',
    subscription: {
      tier: 'pro',
      status: 'active',
      period: 'yearly',
      stripe_customer_id: 'cus_test_emma_002',
      stripe_subscription_id: 'sub_test_emma_002'
    }
  },
  {
    email: 'testuser4@fake.com',
    password: 'TestUser123!',
    name: 'David Thompson',
    subscription: {
      tier: 'family',
      status: 'active',
      period: 'monthly',
      stripe_customer_id: 'cus_test_david_003',
      stripe_subscription_id: 'sub_test_david_003'
    }
  },
  {
    email: 'testuser5@fake.com',
    password: 'TestUser123!',
    name: 'Jessica Park',
    subscription: {
      tier: 'pro',
      status: 'trialing',
      period: 'monthly',
      trial_started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }
  }
];

// Mock task templates
const taskTemplates = [
  { title: 'Grocery shopping', category: 'shopping', priority: 'medium' },
  { title: 'Pay utility bills', category: 'household', priority: 'high' },
  { title: 'Schedule dentist appointment', category: 'health', priority: 'medium' },
  { title: 'Clean the garage', category: 'household', priority: 'low' },
  { title: 'Prepare weekly meal plan', category: 'meals', priority: 'medium' },
  { title: 'Review monthly budget', category: 'household', priority: 'high' },
  { title: 'Book family vacation', category: 'family', priority: 'low' },
  { title: 'Car maintenance check', category: 'household', priority: 'medium' },
  { title: 'Update home insurance', category: 'household', priority: 'high' },
  { title: 'Organize kids activities', category: 'family', priority: 'medium' }
];

// Mock event templates
const eventTemplates = [
  { title: 'Family dinner', all_day: false, duration_hours: 2 },
  { title: 'Kids soccer practice', all_day: false, duration_hours: 1.5 },
  { title: 'Parent-teacher conference', all_day: false, duration_hours: 1 },
  { title: 'Doctor appointment', all_day: false, duration_hours: 1 },
  { title: 'Birthday party', all_day: false, duration_hours: 3 },
  { title: 'Weekend getaway', all_day: true, duration_days: 2 },
  { title: 'Home renovation meeting', all_day: false, duration_hours: 2 },
  { title: 'Gym workout', all_day: false, duration_hours: 1 }
];

// Mock reminder templates
const reminderTemplates = [
  { title: 'Take medication', priority: 'high' },
  { title: 'Water plants', priority: 'low' },
  { title: 'Call mom', priority: 'medium' },
  { title: 'Submit expense report', priority: 'high' },
  { title: 'Review meeting notes', priority: 'medium' }
];

async function createTestUser(userData) {
  console.log(`\nCreating user: ${userData.email}`);

  // Check if user already exists
  const { data: existingUsers } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', userData.email)
    .single();

  if (existingUsers) {
    console.log(`  User ${userData.email} already exists, skipping creation...`);
    return existingUsers.id;
  }

  // Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      name: userData.name
    }
  });

  if (authError) {
    console.error(`  Error creating auth user: ${authError.message}`);
    return null;
  }

  const userId = authData.user.id;
  console.log(`  Created auth user with ID: ${userId}`);

  // Wait for trigger to create public.users
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update public.users with name
  const { error: updateError } = await supabase
    .from('users')
    .update({
      name: userData.name,
      is_beta_tester: true,
      beta_status: 'active'
    })
    .eq('id', userId);

  if (updateError) {
    console.error(`  Error updating user profile: ${updateError.message}`);
  } else {
    console.log(`  Updated user profile with name: ${userData.name}`);
  }

  return userId;
}

async function createSpace(userId, userName) {
  console.log(`  Creating space for user...`);

  // Check if space already exists
  const { data: existingSpace } = await supabase
    .from('spaces')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingSpace) {
    console.log(`  Space already exists: ${existingSpace.id}`);
    return existingSpace.id;
  }

  const { data: space, error } = await supabase
    .from('spaces')
    .insert({
      name: `${userName}'s Household`,
      created_by: userId,
      user_id: userId,
      is_personal: false,
      auto_created: true,
      type: 'household',
      description: `Family space for ${userName}`
    })
    .select()
    .single();

  if (error) {
    console.error(`  Error creating space: ${error.message}`);
    return null;
  }

  console.log(`  Created space: ${space.id}`);

  // Add user as space member
  const { error: memberError } = await supabase
    .from('space_members')
    .insert({
      space_id: space.id,
      user_id: userId,
      role: 'owner'
    });

  if (memberError && !memberError.message.includes('duplicate')) {
    console.error(`  Error adding space member: ${memberError.message}`);
  }

  return space.id;
}

async function createSubscription(userId, subscriptionData) {
  console.log(`  Creating subscription: ${subscriptionData.tier} (${subscriptionData.period})`);

  // Check if subscription already exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        period: subscriptionData.period,
        stripe_customer_id: subscriptionData.stripe_customer_id || null,
        stripe_subscription_id: subscriptionData.stripe_subscription_id || null,
        subscription_started_at: subscriptionData.tier !== 'free' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        subscription_ends_at: subscriptionData.tier !== 'free' ? new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString() : null,
        trial_started_at: subscriptionData.trial_started_at || null,
        trial_ends_at: subscriptionData.trial_ends_at || null
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`  Error updating subscription: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      tier: subscriptionData.tier,
      status: subscriptionData.status,
      period: subscriptionData.period,
      stripe_customer_id: subscriptionData.stripe_customer_id || null,
      stripe_subscription_id: subscriptionData.stripe_subscription_id || null,
      subscription_started_at: subscriptionData.tier !== 'free' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      subscription_ends_at: subscriptionData.tier !== 'free' ? new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString() : null,
      trial_started_at: subscriptionData.trial_started_at || null,
      trial_ends_at: subscriptionData.trial_ends_at || null
    });

  if (error) {
    console.error(`  Error creating subscription: ${error.message}`);
  } else {
    console.log(`  Subscription created successfully`);
  }
}

async function createMockTasks(userId, spaceId, count = 5) {
  console.log(`  Creating ${count} mock tasks...`);

  const tasks = [];
  const usedTemplates = new Set();

  for (let i = 0; i < count; i++) {
    let templateIndex;
    do {
      templateIndex = Math.floor(Math.random() * taskTemplates.length);
    } while (usedTemplates.has(templateIndex) && usedTemplates.size < taskTemplates.length);
    usedTemplates.add(templateIndex);

    const template = taskTemplates[templateIndex];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) - 3); // -3 to +11 days

    const statuses = ['pending', 'pending', 'pending', 'completed', 'in-progress'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    tasks.push({
      space_id: spaceId,
      title: template.title,
      category: template.category,
      priority: template.priority,
      status: status,
      due_date: dueDate.toISOString().split('T')[0],
      created_by: userId,
      assigned_to: userId,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    });
  }

  const { error } = await supabase.from('tasks').insert(tasks);

  if (error) {
    console.error(`  Error creating tasks: ${error.message}`);
  } else {
    console.log(`  Created ${count} tasks`);
  }
}

async function createMockEvents(userId, spaceId, count = 4) {
  console.log(`  Creating ${count} mock events...`);

  const events = [];
  const usedTemplates = new Set();

  for (let i = 0; i < count; i++) {
    let templateIndex;
    do {
      templateIndex = Math.floor(Math.random() * eventTemplates.length);
    } while (usedTemplates.has(templateIndex) && usedTemplates.size < eventTemplates.length);
    usedTemplates.add(templateIndex);

    const template = eventTemplates[templateIndex];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 21) - 7); // -7 to +14 days
    startDate.setHours(9 + Math.floor(Math.random() * 10), 0, 0, 0); // 9am to 7pm

    const endDate = new Date(startDate);
    if (template.all_day) {
      endDate.setDate(endDate.getDate() + (template.duration_days || 1));
    } else {
      endDate.setHours(endDate.getHours() + template.duration_hours);
    }

    events.push({
      space_id: spaceId,
      title: template.title,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      all_day: template.all_day,
      created_by: userId,
      color: ['blue', 'purple', 'green', 'orange', 'pink'][Math.floor(Math.random() * 5)]
    });
  }

  const { error } = await supabase.from('events').insert(events);

  if (error) {
    console.error(`  Error creating events: ${error.message}`);
  } else {
    console.log(`  Created ${count} events`);
  }
}

async function createMockReminders(userId, spaceId, count = 3) {
  console.log(`  Creating ${count} mock reminders...`);

  const reminders = [];
  const usedTemplates = new Set();

  for (let i = 0; i < count; i++) {
    let templateIndex;
    do {
      templateIndex = Math.floor(Math.random() * reminderTemplates.length);
    } while (usedTemplates.has(templateIndex) && usedTemplates.size < reminderTemplates.length);
    usedTemplates.add(templateIndex);

    const template = reminderTemplates[templateIndex];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7)); // 0 to 7 days

    reminders.push({
      space_id: spaceId,
      title: template.title,
      priority: template.priority,
      due_date: dueDate.toISOString(),
      status: Math.random() > 0.7 ? 'completed' : 'pending',
      created_by: userId,
      assigned_to: userId
    });
  }

  const { error } = await supabase.from('reminders').insert(reminders);

  if (error) {
    console.error(`  Error creating reminders: ${error.message}`);
  } else {
    console.log(`  Created ${count} reminders`);
  }
}

async function createMockChores(userId, spaceId, count = 3) {
  console.log(`  Creating ${count} mock chores...`);

  const choreTemplates = [
    { title: 'Vacuum living room', frequency: 'weekly' },
    { title: 'Do laundry', frequency: 'weekly' },
    { title: 'Take out trash', frequency: 'daily' },
    { title: 'Clean bathroom', frequency: 'weekly' },
    { title: 'Mow the lawn', frequency: 'biweekly' },
    { title: 'Wash dishes', frequency: 'daily' }
  ];

  const chores = [];
  const usedTemplates = new Set();

  for (let i = 0; i < count; i++) {
    let templateIndex;
    do {
      templateIndex = Math.floor(Math.random() * choreTemplates.length);
    } while (usedTemplates.has(templateIndex) && usedTemplates.size < choreTemplates.length);
    usedTemplates.add(templateIndex);

    const template = choreTemplates[templateIndex];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7));

    chores.push({
      space_id: spaceId,
      title: template.title,
      frequency: template.frequency,
      status: Math.random() > 0.6 ? 'completed' : 'pending',
      due_date: dueDate.toISOString(),
      created_by: userId,
      assigned_to: userId,
      point_value: 10 + Math.floor(Math.random() * 20)
    });
  }

  const { error } = await supabase.from('chores').insert(chores);

  if (error) {
    console.error(`  Error creating chores: ${error.message}`);
  } else {
    console.log(`  Created ${count} chores`);
  }
}

async function createMonetizationLogs(userId, tier, period) {
  // Create some mock monetization logs for paid users
  if (tier === 'free') return;

  console.log(`  Creating monetization logs...`);

  const logs = [];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  // Checkout initiated
  logs.push({
    timestamp: new Date(startDate.getTime() + 1000).toISOString(),
    level: 'info',
    event: 'checkout_initiated',
    user_id: userId,
    tier: tier,
    period: period,
    trigger_source: 'pricing_page'
  });

  // Checkout success
  logs.push({
    timestamp: new Date(startDate.getTime() + 60000).toISOString(),
    level: 'info',
    event: 'checkout_success',
    user_id: userId,
    tier: tier,
    period: period,
    amount: tier === 'pro' ? (period === 'monthly' ? 9.99 : 99.99) : (period === 'monthly' ? 14.99 : 149.99),
    currency: 'usd',
    stripe_session_id: `cs_test_${userId.substring(0, 8)}`
  });

  // Subscription created
  logs.push({
    timestamp: new Date(startDate.getTime() + 120000).toISOString(),
    level: 'info',
    event: 'subscription_created',
    user_id: userId,
    tier: tier,
    period: period,
    stripe_subscription_id: `sub_test_${userId.substring(0, 8)}`
  });

  // Payment success
  logs.push({
    timestamp: new Date(startDate.getTime() + 180000).toISOString(),
    level: 'info',
    event: 'payment_succeeded',
    user_id: userId,
    tier: tier,
    period: period,
    amount: tier === 'pro' ? (period === 'monthly' ? 9.99 : 99.99) : (period === 'monthly' ? 14.99 : 149.99),
    currency: 'usd'
  });

  const { error } = await supabase.from('monetization_logs').insert(logs);

  if (error) {
    console.error(`  Error creating monetization logs: ${error.message}`);
  } else {
    console.log(`  Created ${logs.length} monetization logs`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Starting test user seed script');
  console.log('='.repeat(60));

  for (const userData of testUsers) {
    const userId = await createTestUser(userData);

    if (userId) {
      const spaceId = await createSpace(userId, userData.name);

      if (spaceId) {
        await createSubscription(userId, userData.subscription);
        await createMockTasks(userId, spaceId, 5 + Math.floor(Math.random() * 5));
        await createMockEvents(userId, spaceId, 3 + Math.floor(Math.random() * 4));
        await createMockReminders(userId, spaceId, 2 + Math.floor(Math.random() * 3));
        await createMockChores(userId, spaceId, 2 + Math.floor(Math.random() * 3));
        await createMonetizationLogs(userId, userData.subscription.tier, userData.subscription.period);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test user seed complete!');
  console.log('='.repeat(60));

  // Summary
  console.log('\nCreated users:');
  testUsers.forEach(u => {
    console.log(`  - ${u.email} (${u.name}) - ${u.subscription.tier} ${u.subscription.period}`);
  });

  console.log('\nAll test users have password: TestUser123!');
  console.log('\nExpected MRR:');
  console.log('  - Pro Monthly: $9.99 x 1 = $9.99');
  console.log('  - Pro Yearly: $99.99/12 x 1 = $8.33');
  console.log('  - Family Monthly: $14.99 x 1 = $14.99');
  console.log('  - Total MRR: ~$33.31');
}

main().catch(console.error);
