/* eslint-disable no-console */
/**
 * Rowan Design Audit Seed Script
 *
 * Creates a comprehensive design audit test user with data across ALL features.
 * This user is specifically for design audits and UI/UX testing to ensure every
 * page in the app has realistic data to showcase.
 *
 * User Credentials:
 * - Email: design-audit@rowan-test.app
 * - Password: DesignAudit2026!
 * - Name: Alex Rivera
 * - Tier: Pro Monthly (all features accessible)
 *
 * Run: node scripts/rowan-seed-design-user.mjs
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
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// User configuration
const DESIGN_USER = {
  email: 'design-audit@rowan-test.app',
  password: 'DesignAudit2026!',
  name: 'Alex Rivera',
  subscription: {
    tier: 'pro',
    status: 'active',
    period: 'monthly',
    stripe_customer_id: 'cus_design_audit_001',
    stripe_subscription_id: 'sub_design_audit_001'
  }
};

// Helper: Get date in YYYY-MM-DD format
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper: Get date N days from now
function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Helper: Get timestamp N days from now
function timestampFromNow(days, hours = 9) {
  const date = daysFromNow(days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

/**
 * Create or get the design audit user
 */
async function createDesignUser() {
  console.log('\n📝 Creating design audit user...');

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', DESIGN_USER.email)
    .single();

  if (existingUser) {
    console.log(`✅ User ${DESIGN_USER.email} already exists (ID: ${existingUser.id})`);
    return existingUser.id;
  }

  // Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DESIGN_USER.email,
    password: DESIGN_USER.password,
    email_confirm: true,
    user_metadata: {
      name: DESIGN_USER.name
    }
  });

  if (authError) {
    console.error(`❌ Error creating auth user: ${authError.message}`);
    throw authError;
  }

  const userId = authData.user.id;
  console.log(`✅ Created auth user (ID: ${userId})`);

  // Wait for database triggers to fire
  console.log('⏳ Waiting for triggers to create profile...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify profile exists, create if needed
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (!profile) {
    console.log('⚠️  Profile not created by trigger, creating manually...');
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: DESIGN_USER.email,
        name: DESIGN_USER.name
      });

    if (profileError) {
      console.error(`❌ Error creating profile: ${profileError.message}`);
    } else {
      console.log('✅ Profile created manually');
    }
  }

  // Update user profile with name
  const { error: updateError } = await supabase
    .from('users')
    .update({
      name: DESIGN_USER.name
    })
    .eq('id', userId);

  if (updateError) {
    console.error(`⚠️  Error updating user profile: ${updateError.message}`);
  } else {
    console.log(`✅ Updated user profile with name: ${DESIGN_USER.name}`);
  }

  return userId;
}

/**
 * Create or get space for user
 */
async function createSpace(userId) {
  console.log('\n🏠 Creating space...');

  // Check if space already exists
  const { data: existingSpace } = await supabase
    .from('spaces')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingSpace) {
    console.log(`✅ Space already exists (ID: ${existingSpace.id})`);
    return existingSpace.id;
  }

  const { data: space, error } = await supabase
    .from('spaces')
    .insert({
      name: `${DESIGN_USER.name}'s Household`,
      created_by: userId,
      user_id: userId,
      is_personal: false,
      auto_created: true,
      type: 'household',
      description: 'Design audit test household'
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Error creating space: ${error.message}`);
    throw error;
  }

  console.log(`✅ Created space (ID: ${space.id})`);

  // Add user as space member
  const { error: memberError } = await supabase
    .from('space_members')
    .insert({
      space_id: space.id,
      user_id: userId,
      role: 'owner'
    });

  if (memberError && !memberError.message.includes('duplicate')) {
    console.error(`⚠️  Error adding space member: ${memberError.message}`);
  } else {
    console.log('✅ Added user as space owner');
  }

  return space.id;
}

/**
 * Create subscription
 */
async function createSubscription(userId) {
  console.log('\n💳 Creating subscription...');

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();

  const subscriptionData = {
    user_id: userId,
    tier: DESIGN_USER.subscription.tier,
    status: DESIGN_USER.subscription.status,
    period: DESIGN_USER.subscription.period,
    stripe_customer_id: DESIGN_USER.subscription.stripe_customer_id,
    stripe_subscription_id: DESIGN_USER.subscription.stripe_subscription_id,
    subscription_started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    subscription_ends_at: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString()
  };

  if (existing) {
    const { error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId);

    if (error) {
      console.error(`❌ Error updating subscription: ${error.message}`);
    } else {
      console.log(`✅ Updated subscription: ${DESIGN_USER.subscription.tier} (${DESIGN_USER.subscription.period})`);
    }
  } else {
    const { error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (error) {
      console.error(`❌ Error creating subscription: ${error.message}`);
    } else {
      console.log(`✅ Created subscription: ${DESIGN_USER.subscription.tier} (${DESIGN_USER.subscription.period})`);
    }
  }
}

/**
 * Seed Tasks (10 items)
 */
async function seedTasks(userId, spaceId) {
  console.log('\n✅ Seeding tasks...');

  const tasks = [
    {
      space_id: spaceId,
      title: 'Buy groceries for the week',
      description: 'Milk, eggs, bread, vegetables, and fruit',
      category: 'shopping',
      priority: 'high',
      status: 'pending',
      due_date: formatDate(daysFromNow(2)),
      created_by: userId,
      assigned_to: userId
    },
    {
      space_id: spaceId,
      title: 'Schedule annual checkup',
      description: 'Call doctor to book appointment',
      category: 'health',
      priority: 'medium',
      status: 'pending',
      due_date: formatDate(daysFromNow(7)),
      created_by: userId,
      assigned_to: userId
    },
    {
      space_id: spaceId,
      title: 'Fix leaking kitchen faucet',
      description: 'Replace washer or call plumber',
      category: 'household',
      priority: 'urgent',
      status: 'in-progress',
      due_date: formatDate(daysFromNow(1)),
      created_by: userId,
      assigned_to: userId
    },
    {
      space_id: spaceId,
      title: 'Review monthly budget',
      description: 'Check expenses and adjust categories',
      category: 'personal',
      priority: 'high',
      status: 'pending',
      due_date: formatDate(daysFromNow(5)),
      created_by: userId,
      assigned_to: userId
    },
    {
      space_id: spaceId,
      title: 'Plan family vacation',
      description: 'Research destinations and book flights',
      category: 'family',
      priority: 'low',
      status: 'pending',
      due_date: formatDate(daysFromNow(30)),
      created_by: userId,
      assigned_to: userId
    },
    {
      space_id: spaceId,
      title: 'File tax documents',
      description: 'Organize receipts and forms',
      category: 'work',
      priority: 'urgent',
      status: 'in-progress',
      due_date: formatDate(daysFromNow(-2)), // Overdue
      created_by: userId,
      assigned_to: userId
    },
    {
      space_id: spaceId,
      title: 'Organize garage',
      description: 'Sort through boxes and donate unused items',
      category: 'household',
      priority: 'low',
      status: 'completed',
      due_date: formatDate(daysFromNow(-5)),
      created_by: userId,
      assigned_to: userId,
      completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      title: 'Renew car registration',
      description: 'Submit paperwork before expiration',
      category: 'personal',
      priority: 'medium',
      status: 'completed',
      due_date: formatDate(daysFromNow(-10)),
      created_by: userId,
      assigned_to: userId,
      completed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      title: 'Update emergency contacts',
      description: 'Review and update family emergency contact list',
      category: 'family',
      priority: 'medium',
      status: 'completed',
      due_date: formatDate(daysFromNow(-15)),
      created_by: userId,
      assigned_to: userId,
      completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      title: 'Weekly meal prep',
      description: 'Prepare lunches for the week',
      category: 'shopping',
      priority: 'medium',
      status: 'blocked',
      due_date: formatDate(daysFromNow(0)), // Today
      created_by: userId,
      assigned_to: userId,
      is_recurring: true,
      recurrence_pattern: 'weekly'
    }
  ];

  const { error } = await supabase.from('tasks').insert(tasks);

  if (error) {
    console.error(`❌ Error creating tasks: ${error.message}`);
  } else {
    console.log(`✅ Created ${tasks.length} tasks`);
  }
}

/**
 * Seed Chores (8 items)
 */
async function seedChores(userId, spaceId) {
  console.log('\n🧹 Seeding chores...');

  const chores = [
    {
      space_id: spaceId,
      title: 'Vacuum living room',
      description: 'Vacuum carpets and clean under furniture',
      frequency: 'weekly',
      assigned_to: userId,
      status: 'pending',
      due_date: timestampFromNow(3, 10),
      created_by: userId,
      point_value: 15,
      category: 'cleaning'
    },
    {
      space_id: spaceId,
      title: 'Take out trash',
      description: 'Empty all bins and take to curb',
      frequency: 'daily',
      assigned_to: userId,
      status: 'completed',
      due_date: timestampFromNow(0, 18),
      created_by: userId,
      point_value: 10,
      category: 'cleaning'
    },
    {
      space_id: spaceId,
      title: 'Water plants',
      description: 'Water indoor and outdoor plants',
      frequency: 'daily',
      assigned_to: userId,
      status: 'pending',
      due_date: timestampFromNow(0, 8),
      created_by: userId,
      point_value: 10,
      category: 'maintenance'
    },
    {
      space_id: spaceId,
      title: 'Mow lawn',
      description: 'Cut grass and edge sidewalks',
      frequency: 'weekly',
      assigned_to: userId,
      status: 'pending',
      due_date: timestampFromNow(2, 9),
      created_by: userId,
      point_value: 25,
      category: 'yard'
    },
    {
      space_id: spaceId,
      title: 'Clean bathrooms',
      description: 'Scrub toilets, sinks, and showers',
      frequency: 'weekly',
      assigned_to: userId,
      status: 'in-progress',
      due_date: timestampFromNow(1, 14),
      created_by: userId,
      point_value: 20,
      category: 'cleaning'
    },
    {
      space_id: spaceId,
      title: 'Change air filters',
      description: 'Replace HVAC air filters',
      frequency: 'monthly',
      assigned_to: userId,
      status: 'pending',
      due_date: timestampFromNow(15, 10),
      created_by: userId,
      point_value: 15,
      category: 'maintenance'
    },
    {
      space_id: spaceId,
      title: 'Deep clean kitchen',
      description: 'Clean appliances, cabinets, and floors',
      frequency: 'biweekly',
      assigned_to: userId,
      status: 'completed',
      due_date: timestampFromNow(-3, 10),
      created_by: userId,
      point_value: 30,
      category: 'cleaning'
    },
    {
      space_id: spaceId,
      title: 'Organize pantry',
      description: 'Check expiration dates and reorganize',
      frequency: 'monthly',
      assigned_to: userId,
      status: 'pending',
      due_date: timestampFromNow(20, 11),
      created_by: userId,
      point_value: 20,
      category: 'organizing'
    }
  ];

  const { error } = await supabase.from('chores').insert(chores);

  if (error) {
    console.error(`❌ Error creating chores: ${error.message}`);
  } else {
    console.log(`✅ Created ${chores.length} chores`);
  }
}

/**
 * Seed Calendar Events (12 items)
 */
async function seedEvents(userId, spaceId) {
  console.log('\n📅 Seeding calendar events...');

  const events = [
    {
      space_id: spaceId,
      title: 'Team Meeting',
      description: 'Weekly team sync',
      start_time: timestampFromNow(1, 10),
      end_time: timestampFromNow(1, 11),
      all_day: false,
      created_by: userId,
      color: 'blue',
      is_recurring: true,
      recurrence_pattern: 'weekly'
    },
    {
      space_id: spaceId,
      title: 'Doctor Appointment',
      description: 'Annual checkup with Dr. Smith',
      start_time: timestampFromNow(3, 14),
      end_time: timestampFromNow(3, 15),
      all_day: false,
      created_by: userId,
      color: 'purple'
    },
    {
      space_id: spaceId,
      title: 'Kids Soccer Practice',
      description: 'At Riverside Park',
      start_time: timestampFromNow(2, 16),
      end_time: timestampFromNow(2, 17.5),
      all_day: false,
      created_by: userId,
      color: 'green'
    },
    {
      space_id: spaceId,
      title: 'Date Night',
      description: 'Dinner reservation at 7 PM',
      start_time: timestampFromNow(5, 19),
      end_time: timestampFromNow(5, 22),
      all_day: false,
      created_by: userId,
      color: 'pink'
    },
    {
      space_id: spaceId,
      title: 'Family Road Trip',
      description: 'Weekend getaway to the mountains',
      start_time: formatDate(daysFromNow(10)),
      end_time: formatDate(daysFromNow(12)),
      all_day: true,
      created_by: userId,
      color: 'orange'
    },
    {
      space_id: spaceId,
      title: 'Birthday Party',
      description: "Jamie's 8th birthday celebration",
      start_time: timestampFromNow(14, 14),
      end_time: timestampFromNow(14, 17),
      all_day: false,
      created_by: userId,
      color: 'pink'
    },
    {
      space_id: spaceId,
      title: 'Gym Workout',
      description: 'Morning workout session',
      start_time: timestampFromNow(1, 6),
      end_time: timestampFromNow(1, 7),
      all_day: false,
      created_by: userId,
      color: 'green',
      is_recurring: true,
      recurrence_pattern: 'weekly'
    },
    {
      space_id: spaceId,
      title: 'Parent-Teacher Conference',
      description: 'Meet with Ms. Johnson',
      start_time: timestampFromNow(7, 15),
      end_time: timestampFromNow(7, 16),
      all_day: false,
      created_by: userId,
      color: 'blue'
    },
    {
      space_id: spaceId,
      title: 'Home Inspection',
      description: 'Annual home maintenance inspection',
      start_time: timestampFromNow(9, 10),
      end_time: timestampFromNow(9, 12),
      all_day: false,
      created_by: userId,
      color: 'orange'
    },
    {
      space_id: spaceId,
      title: 'Volunteer Day',
      description: 'Community cleanup event',
      start_time: formatDate(daysFromNow(6)),
      end_time: formatDate(daysFromNow(6)),
      all_day: true,
      created_by: userId,
      color: 'green'
    },
    {
      space_id: spaceId,
      title: 'Project Presentation',
      description: 'Q1 review meeting',
      start_time: timestampFromNow(-2, 13),
      end_time: timestampFromNow(-2, 15),
      all_day: false,
      created_by: userId,
      color: 'blue'
    },
    {
      space_id: spaceId,
      title: 'Book Club',
      description: 'Monthly book discussion',
      start_time: timestampFromNow(-5, 18),
      end_time: timestampFromNow(-5, 20),
      all_day: false,
      created_by: userId,
      color: 'purple'
    }
  ];

  const { error } = await supabase.from('events').insert(events);

  if (error) {
    console.error(`❌ Error creating events: ${error.message}`);
  } else {
    console.log(`✅ Created ${events.length} events`);
  }
}

/**
 * Seed Shopping Lists and Items
 */
async function seedShopping(userId, spaceId) {
  console.log('\n🛒 Seeding shopping lists...');

  // Create shopping lists
  const lists = [
    {
      space_id: spaceId,
      name: 'Weekly Groceries',
      description: 'Regular grocery shopping',
      created_by: userId
    },
    {
      space_id: spaceId,
      name: 'Home Improvement',
      description: 'Hardware store items',
      created_by: userId
    },
    {
      space_id: spaceId,
      name: 'Party Supplies',
      description: 'Birthday party shopping',
      created_by: userId
    }
  ];

  const { data: createdLists, error: listError } = await supabase
    .from('shopping_lists')
    .insert(lists)
    .select();

  if (listError) {
    console.error(`❌ Error creating shopping lists: ${listError.message}`);
    return;
  }

  console.log(`✅ Created ${createdLists.length} shopping lists`);

  // Create shopping items for each list
  const groceryItems = [
    { name: 'Milk (2%)', quantity: 2, category: 'dairy', is_purchased: true },
    { name: 'Eggs (dozen)', quantity: 1, category: 'dairy', is_purchased: false },
    { name: 'Whole wheat bread', quantity: 1, category: 'bakery', is_purchased: true },
    { name: 'Bananas', quantity: 6, category: 'produce', is_purchased: false },
    { name: 'Tomatoes', quantity: 4, category: 'produce', is_purchased: false },
    { name: 'Chicken breast', quantity: 2, category: 'meat', is_purchased: true },
    { name: 'Pasta', quantity: 2, category: 'pantry', is_purchased: false },
    { name: 'Olive oil', quantity: 1, category: 'pantry', is_purchased: false }
  ];

  const hardwareItems = [
    { name: 'Paint roller', quantity: 1, category: 'tools', is_purchased: false },
    { name: 'Lightbulbs (LED)', quantity: 4, category: 'electrical', is_purchased: false },
    { name: 'Screwdriver set', quantity: 1, category: 'tools', is_purchased: false },
    { name: 'Wood screws', quantity: 1, category: 'hardware', is_purchased: false },
    { name: 'Sandpaper', quantity: 3, category: 'supplies', is_purchased: false }
  ];

  const partyItems = [
    { name: 'Balloons (blue)', quantity: 20, category: 'decorations', is_purchased: true },
    { name: 'Paper plates', quantity: 30, category: 'tableware', is_purchased: true },
    { name: 'Napkins', quantity: 50, category: 'tableware', is_purchased: false },
    { name: 'Birthday candles', quantity: 1, category: 'decorations', is_purchased: false },
    { name: 'Party favors', quantity: 10, category: 'gifts', is_purchased: true },
    { name: 'Streamers', quantity: 3, category: 'decorations', is_purchased: false }
  ];

  const allItems = [
    ...groceryItems.map(item => ({ ...item, list_id: createdLists[0].id, added_by: userId })),
    ...hardwareItems.map(item => ({ ...item, list_id: createdLists[1].id, added_by: userId })),
    ...partyItems.map(item => ({ ...item, list_id: createdLists[2].id, added_by: userId }))
  ];

  const { error: itemError } = await supabase.from('shopping_items').insert(allItems);

  if (itemError) {
    console.error(`❌ Error creating shopping items: ${itemError.message}`);
  } else {
    console.log(`✅ Created ${allItems.length} shopping items`);
  }
}

/**
 * Seed Recipes (4 recipes)
 */
async function seedRecipes(userId, spaceId) {
  console.log('\n🍳 Seeding recipes...');

  const recipes = [
    {
      space_id: spaceId,
      name: 'Spaghetti Carbonara',
      description: 'Classic Italian pasta dish',
      ingredients: JSON.stringify([
        { name: 'Spaghetti', amount: '400g' },
        { name: 'Eggs', amount: '4' },
        { name: 'Pancetta', amount: '200g' },
        { name: 'Parmesan cheese', amount: '100g' },
        { name: 'Black pepper', amount: 'to taste' }
      ]),
      instructions: '1. Boil pasta until al dente. 2. Cook pancetta until crispy. 3. Mix eggs and cheese. 4. Combine hot pasta with pancetta. 5. Add egg mixture off heat, stirring quickly. 6. Season with pepper and serve.',
      prep_time: 10,
      cook_time: 15,
      servings: 4,
      category: 'dinner',
      created_by: userId
    },
    {
      space_id: spaceId,
      name: 'Greek Salad',
      description: 'Fresh Mediterranean salad',
      ingredients: JSON.stringify([
        { name: 'Cucumber', amount: '1 large' },
        { name: 'Tomatoes', amount: '3 medium' },
        { name: 'Red onion', amount: '1/2' },
        { name: 'Feta cheese', amount: '200g' },
        { name: 'Kalamata olives', amount: '1 cup' },
        { name: 'Olive oil', amount: '3 tbsp' },
        { name: 'Lemon juice', amount: '2 tbsp' }
      ]),
      instructions: '1. Chop cucumber, tomatoes, and onion. 2. Combine vegetables in bowl. 3. Add olives and crumbled feta. 4. Dress with olive oil and lemon juice. 5. Toss gently and serve.',
      prep_time: 15,
      cook_time: 0,
      servings: 4,
      category: 'lunch',
      created_by: userId
    },
    {
      space_id: spaceId,
      name: 'Blueberry Pancakes',
      description: 'Fluffy breakfast pancakes with fresh blueberries',
      ingredients: JSON.stringify([
        { name: 'Flour', amount: '2 cups' },
        { name: 'Milk', amount: '1.5 cups' },
        { name: 'Eggs', amount: '2' },
        { name: 'Baking powder', amount: '2 tsp' },
        { name: 'Sugar', amount: '2 tbsp' },
        { name: 'Fresh blueberries', amount: '1 cup' },
        { name: 'Butter', amount: '3 tbsp' }
      ]),
      instructions: '1. Mix dry ingredients. 2. Whisk eggs and milk. 3. Combine wet and dry ingredients. 4. Fold in blueberries. 5. Cook on griddle until golden. 6. Serve with maple syrup.',
      prep_time: 10,
      cook_time: 20,
      servings: 6,
      category: 'breakfast',
      created_by: userId
    },
    {
      space_id: spaceId,
      name: 'Chocolate Chip Cookies',
      description: 'Classic homemade cookies',
      ingredients: JSON.stringify([
        { name: 'Butter', amount: '1 cup' },
        { name: 'Sugar', amount: '3/4 cup' },
        { name: 'Brown sugar', amount: '3/4 cup' },
        { name: 'Eggs', amount: '2' },
        { name: 'Vanilla extract', amount: '2 tsp' },
        { name: 'Flour', amount: '2.25 cups' },
        { name: 'Chocolate chips', amount: '2 cups' }
      ]),
      instructions: '1. Cream butter and sugars. 2. Beat in eggs and vanilla. 3. Mix in flour. 4. Fold in chocolate chips. 5. Drop onto baking sheet. 6. Bake at 375°F for 10-12 minutes.',
      prep_time: 15,
      cook_time: 12,
      servings: 24,
      category: 'dessert',
      created_by: userId
    }
  ];

  const { data: createdRecipes, error } = await supabase
    .from('recipes')
    .insert(recipes)
    .select();

  if (error) {
    console.error(`❌ Error creating recipes: ${error.message}`);
    return null;
  } else {
    console.log(`✅ Created ${recipes.length} recipes`);
    return createdRecipes;
  }
}

/**
 * Seed Meal Plans (7 entries - one week)
 */
async function seedMealPlans(userId, spaceId, recipes) {
  console.log('\n🍽️  Seeding meal plans...');

  if (!recipes || recipes.length === 0) {
    console.log('⚠️  No recipes available, skipping meal plans');
    return;
  }

  const mealPlans = [
    {
      space_id: spaceId,
      recipe_id: recipes[2].id, // Blueberry Pancakes
      meal_date: formatDate(daysFromNow(1)),
      meal_type: 'breakfast',
      notes: 'Sunday breakfast special',
      created_by: userId
    },
    {
      space_id: spaceId,
      recipe_id: recipes[1].id, // Greek Salad
      meal_date: formatDate(daysFromNow(1)),
      meal_type: 'lunch',
      notes: 'Light and healthy',
      created_by: userId
    },
    {
      space_id: spaceId,
      recipe_id: recipes[0].id, // Spaghetti Carbonara
      meal_date: formatDate(daysFromNow(1)),
      meal_type: 'dinner',
      created_by: userId
    },
    {
      space_id: spaceId,
      recipe_id: recipes[1].id, // Greek Salad
      meal_date: formatDate(daysFromNow(2)),
      meal_type: 'lunch',
      created_by: userId
    },
    {
      space_id: spaceId,
      recipe_id: recipes[0].id, // Spaghetti Carbonara
      meal_date: formatDate(daysFromNow(3)),
      meal_type: 'dinner',
      notes: 'Leftover pasta from Sunday',
      created_by: userId
    },
    {
      space_id: spaceId,
      recipe_id: recipes[2].id, // Blueberry Pancakes
      meal_date: formatDate(daysFromNow(5)),
      meal_type: 'breakfast',
      created_by: userId
    },
    {
      space_id: spaceId,
      recipe_id: recipes[3].id, // Chocolate Chip Cookies
      meal_date: formatDate(daysFromNow(6)),
      meal_type: 'snack',
      notes: 'Weekend baking project',
      created_by: userId
    }
  ];

  const { error } = await supabase.from('meal_plans').insert(mealPlans);

  if (error) {
    console.error(`❌ Error creating meal plans: ${error.message}`);
  } else {
    console.log(`✅ Created ${mealPlans.length} meal plans`);
  }
}

/**
 * Seed Budget
 */
async function seedBudget(userId, spaceId) {
  console.log('\n💰 Seeding budget...');

  const budget = {
    space_id: spaceId,
    monthly_budget: 5000,
    created_by: userId
  };

  const { error } = await supabase.from('budgets').insert(budget);

  if (error) {
    console.error(`❌ Error creating budget: ${error.message}`);
  } else {
    console.log('✅ Created budget ($5000/month)');
  }
}

/**
 * Seed Expenses (10 expenses)
 */
async function seedExpenses(userId, spaceId) {
  console.log('\n💸 Seeding expenses...');

  const expenses = [
    {
      space_id: spaceId,
      title: 'Grocery Shopping',
      amount: 127.50,
      category: 'groceries',
      date: formatDate(daysFromNow(-2)),
      paid_by: userId,
      status: 'paid',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Electric Bill',
      amount: 185.00,
      category: 'utilities',
      date: formatDate(daysFromNow(15)),
      paid_by: userId,
      status: 'pending',
      is_recurring: true,
      recurring_frequency: 'monthly',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Netflix Subscription',
      amount: 15.99,
      category: 'entertainment',
      date: formatDate(daysFromNow(-5)),
      paid_by: userId,
      status: 'paid',
      is_recurring: true,
      recurring_frequency: 'monthly',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Gas Station',
      amount: 45.00,
      category: 'transport',
      date: formatDate(daysFromNow(-1)),
      paid_by: userId,
      status: 'paid',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Restaurant Dinner',
      amount: 89.50,
      category: 'dining',
      date: formatDate(daysFromNow(-7)),
      paid_by: userId,
      status: 'paid',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Gym Membership',
      amount: 49.99,
      category: 'health',
      date: formatDate(daysFromNow(5)),
      paid_by: userId,
      status: 'pending',
      is_recurring: true,
      recurring_frequency: 'monthly',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Hardware Store',
      amount: 67.25,
      category: 'household',
      date: formatDate(daysFromNow(-3)),
      paid_by: userId,
      status: 'paid',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Water Bill',
      amount: 52.00,
      category: 'utilities',
      date: formatDate(daysFromNow(-15)),
      paid_by: userId,
      status: 'overdue',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Movie Tickets',
      amount: 32.00,
      category: 'entertainment',
      date: formatDate(daysFromNow(-10)),
      paid_by: userId,
      status: 'paid',
      created_by: userId
    },
    {
      space_id: spaceId,
      title: 'Prescription Refill',
      amount: 25.00,
      category: 'health',
      date: formatDate(daysFromNow(-4)),
      paid_by: userId,
      status: 'paid',
      created_by: userId
    }
  ];

  const { error } = await supabase.from('expenses').insert(expenses);

  if (error) {
    console.error(`❌ Error creating expenses: ${error.message}`);
  } else {
    console.log(`✅ Created ${expenses.length} expenses`);
  }
}

/**
 * Seed Goals (5 goals) + Milestones
 */
async function seedGoals(userId, spaceId) {
  console.log('\n🎯 Seeding goals...');

  const goals = [
    {
      space_id: spaceId,
      title: 'Emergency Fund',
      description: 'Build 6-month emergency savings',
      category: 'financial',
      target_date: formatDate(daysFromNow(365)),
      status: 'in-progress',
      created_by: userId,
      progress_percentage: 45,
      current_amount: 9000,
      target_amount: 20000
    },
    {
      space_id: spaceId,
      title: 'Run a 5K',
      description: 'Complete a 5K race without stopping',
      category: 'fitness',
      target_date: formatDate(daysFromNow(90)),
      status: 'in-progress',
      created_by: userId,
      progress_percentage: 60
    },
    {
      space_id: spaceId,
      title: 'Learn Spanish',
      description: 'Achieve conversational fluency in Spanish',
      category: 'learning',
      target_date: formatDate(daysFromNow(180)),
      status: 'in-progress',
      created_by: userId,
      progress_percentage: 25
    },
    {
      space_id: spaceId,
      title: 'Renovate Kitchen',
      description: 'Complete kitchen remodel project',
      category: 'home',
      target_date: formatDate(daysFromNow(120)),
      status: 'in-progress',
      created_by: userId,
      progress_percentage: 15,
      current_amount: 3000,
      target_amount: 15000
    },
    {
      space_id: spaceId,
      title: 'Family Game Night',
      description: 'Weekly family game night for 3 months',
      category: 'family',
      target_date: formatDate(daysFromNow(-30)),
      status: 'completed',
      created_by: userId,
      progress_percentage: 100
    }
  ];

  const { data: createdGoals, error: goalError } = await supabase
    .from('goals')
    .insert(goals)
    .select();

  if (goalError) {
    console.error(`❌ Error creating goals: ${goalError.message}`);
    return;
  }

  console.log(`✅ Created ${goals.length} goals`);

  // Create milestones for each goal
  const milestones = [
    // Emergency Fund milestones
    {
      goal_id: createdGoals[0].id,
      title: 'Save first $5,000',
      description: 'Initial savings milestone',
      target_date: formatDate(daysFromNow(-60)),
      completed: true,
      completed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      goal_id: createdGoals[0].id,
      title: 'Reach $10,000',
      description: 'Halfway to goal',
      target_date: formatDate(daysFromNow(60)),
      completed: false
    },
    {
      goal_id: createdGoals[0].id,
      title: 'Complete $20,000',
      description: 'Full 6-month emergency fund',
      target_date: formatDate(daysFromNow(365)),
      completed: false
    },
    // 5K milestones
    {
      goal_id: createdGoals[1].id,
      title: 'Run 1 mile without stopping',
      description: 'First endurance milestone',
      target_date: formatDate(daysFromNow(-20)),
      completed: true,
      completed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      goal_id: createdGoals[1].id,
      title: 'Run 3 miles',
      description: 'Build up distance',
      target_date: formatDate(daysFromNow(30)),
      completed: false
    },
    {
      goal_id: createdGoals[1].id,
      title: 'Complete 5K race',
      description: 'Race day!',
      target_date: formatDate(daysFromNow(90)),
      completed: false
    },
    // Spanish learning milestones
    {
      goal_id: createdGoals[2].id,
      title: 'Complete beginner course',
      description: 'Finish Duolingo basics',
      target_date: formatDate(daysFromNow(60)),
      completed: false
    },
    {
      goal_id: createdGoals[2].id,
      title: 'Have first conversation',
      description: 'Practice with native speaker',
      target_date: formatDate(daysFromNow(120)),
      completed: false
    },
    // Kitchen renovation milestones
    {
      goal_id: createdGoals[3].id,
      title: 'Finalize design',
      description: 'Choose cabinets and countertops',
      target_date: formatDate(daysFromNow(20)),
      completed: false
    },
    {
      goal_id: createdGoals[3].id,
      title: 'Demo old kitchen',
      description: 'Remove old cabinets and fixtures',
      target_date: formatDate(daysFromNow(45)),
      completed: false
    },
    {
      goal_id: createdGoals[3].id,
      title: 'Install new kitchen',
      description: 'Complete installation',
      target_date: formatDate(daysFromNow(120)),
      completed: false
    },
    // Family game night milestones
    {
      goal_id: createdGoals[4].id,
      title: 'First game night',
      description: 'Launch weekly tradition',
      target_date: formatDate(daysFromNow(-90)),
      completed: true,
      completed_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      goal_id: createdGoals[4].id,
      title: '6 weeks completed',
      description: 'Halfway through challenge',
      target_date: formatDate(daysFromNow(-60)),
      completed: true,
      completed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      goal_id: createdGoals[4].id,
      title: '12 weeks completed',
      description: 'Goal achieved!',
      target_date: formatDate(daysFromNow(-30)),
      completed: true,
      completed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const { error: milestoneError } = await supabase.from('goal_milestones').insert(milestones);

  if (milestoneError) {
    console.error(`❌ Error creating milestones: ${milestoneError.message}`);
  } else {
    console.log(`✅ Created ${milestones.length} goal milestones`);
  }
}

/**
 * Seed Reminders (6 reminders)
 */
async function seedReminders(userId, spaceId) {
  console.log('\n⏰ Seeding reminders...');

  const reminders = [
    {
      space_id: spaceId,
      title: 'Pay credit card bill',
      description: 'Due date is the 15th',
      remind_at: timestampFromNow(13, 9),
      assigned_to: userId,
      created_by: userId,
      completed: false,
      category: 'bills',
      priority: 'high',
      status: 'active'
    },
    {
      space_id: spaceId,
      title: 'Take daily vitamins',
      description: 'Morning routine',
      remind_at: timestampFromNow(1, 8),
      is_recurring: true,
      recurrence_pattern: 'daily',
      assigned_to: userId,
      created_by: userId,
      completed: false,
      category: 'health',
      priority: 'medium',
      status: 'active'
    },
    {
      space_id: spaceId,
      title: 'Submit quarterly report',
      description: 'Q1 financial report',
      remind_at: timestampFromNow(7, 17),
      assigned_to: userId,
      created_by: userId,
      completed: false,
      category: 'work',
      priority: 'urgent',
      status: 'active'
    },
    {
      space_id: spaceId,
      title: 'Call mom for birthday',
      description: "Mom's birthday is next week",
      remind_at: timestampFromNow(6, 10),
      assigned_to: userId,
      created_by: userId,
      completed: false,
      category: 'personal',
      priority: 'high',
      status: 'active'
    },
    {
      space_id: spaceId,
      title: 'Check air filter',
      description: 'Monthly HVAC maintenance',
      remind_at: timestampFromNow(-5, 10),
      assigned_to: userId,
      created_by: userId,
      completed: true,
      category: 'household',
      priority: 'low',
      status: 'completed'
    },
    {
      space_id: spaceId,
      title: 'Water indoor plants',
      description: 'Weekly watering schedule',
      remind_at: timestampFromNow(2, 9),
      is_recurring: true,
      recurrence_pattern: 'weekly',
      assigned_to: userId,
      created_by: userId,
      completed: false,
      category: 'household',
      priority: 'medium',
      status: 'snoozed'
    }
  ];

  const { error } = await supabase.from('reminders').insert(reminders);

  if (error) {
    console.error(`❌ Error creating reminders: ${error.message}`);
  } else {
    console.log(`✅ Created ${reminders.length} reminders`);
  }
}

/**
 * Seed Conversations and Messages
 */
async function seedMessages(userId, spaceId) {
  console.log('\n💬 Seeding messages...');

  // Create a conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      space_id: spaceId,
      created_by: userId
    })
    .select()
    .single();

  if (convError) {
    console.error(`❌ Error creating conversation: ${convError.message}`);
    return;
  }

  console.log('✅ Created conversation');

  // Create messages
  const messages = [
    {
      space_id: spaceId,
      sender_id: userId,
      content: "Don't forget we have the parent-teacher conference tomorrow at 3 PM!",
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      sender_id: userId,
      content: 'I added the grocery list for this week. Can you pick up milk and eggs?',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      sender_id: userId,
      content: 'The plumber is coming on Friday to fix the kitchen faucet.',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      sender_id: userId,
      content: 'I updated the meal plan for next week. Let me know what you think!',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      space_id: spaceId,
      sender_id: userId,
      content: "Jamie's birthday party is in 2 weeks. We should start planning!",
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ];

  const { error: msgError } = await supabase.from('messages').insert(messages);

  if (msgError) {
    console.error(`❌ Error creating messages: ${msgError.message}`);
  } else {
    console.log(`✅ Created ${messages.length} messages`);
  }
}

/**
 * Seed Daily Check-ins (5 check-ins)
 */
async function seedCheckIns(userId, spaceId) {
  console.log('\n📊 Seeding daily check-ins...');

  const checkIns = [
    {
      user_id: userId,
      space_id: spaceId,
      date: formatDate(daysFromNow(-4)),
      mood: 'great',
      highlights: 'Completed kitchen organization project and had a wonderful family dinner',
      challenges: 'Struggled with time management in the morning',
      gratitude: 'Grateful for supportive family and good health'
    },
    {
      user_id: userId,
      space_id: spaceId,
      date: formatDate(daysFromNow(-3)),
      mood: 'good',
      highlights: 'Made progress on emergency fund savings goal',
      challenges: 'Unexpected car repair expense',
      gratitude: 'Thankful for having emergency savings to cover repairs'
    },
    {
      user_id: userId,
      space_id: spaceId,
      date: formatDate(daysFromNow(-2)),
      mood: 'okay',
      highlights: 'Completed workout routine and meal prep for the week',
      challenges: 'Felt tired and low energy throughout the day',
      gratitude: 'Appreciative of quiet evening at home'
    },
    {
      user_id: userId,
      space_id: spaceId,
      date: formatDate(daysFromNow(-1)),
      mood: 'good',
      highlights: 'Productive work day and quality time with kids',
      challenges: 'Juggling work deadlines with family commitments',
      gratitude: 'Blessed to have a job I enjoy and loving family'
    },
    {
      user_id: userId,
      space_id: spaceId,
      date: formatDate(daysFromNow(0)),
      mood: 'great',
      highlights: 'Beautiful morning run and completed important tasks',
      challenges: 'Need to stay on top of budget tracking',
      gratitude: 'Grateful for good weather and fresh start to the day'
    }
  ];

  const { error } = await supabase.from('daily_checkins').insert(checkIns);

  if (error) {
    console.error(`❌ Error creating check-ins: ${error.message}`);
  } else {
    console.log(`✅ Created ${checkIns.length} daily check-ins`);
  }
}

/**
 * Seed Activity Log (5 entries)
 */
async function seedActivityLog(userId, spaceId) {
  console.log('\n📋 Seeding activity log...');

  const activities = [
    {
      space_id: spaceId,
      user_id: userId,
      user_email: DESIGN_USER.email,
      action: 'created',
      resource_type: 'task',
      resource_id: null,
      metadata: JSON.stringify({
        task_title: 'Buy groceries for the week',
        category: 'shopping'
      })
    },
    {
      space_id: spaceId,
      user_id: userId,
      user_email: DESIGN_USER.email,
      action: 'updated',
      resource_type: 'goal',
      resource_id: null,
      metadata: JSON.stringify({
        goal_title: 'Emergency Fund',
        progress_change: '40% → 45%'
      })
    },
    {
      space_id: spaceId,
      user_id: userId,
      user_email: DESIGN_USER.email,
      action: 'completed',
      resource_type: 'task',
      resource_id: null,
      metadata: JSON.stringify({
        task_title: 'Organize garage',
        category: 'household'
      })
    },
    {
      space_id: spaceId,
      user_id: userId,
      user_email: DESIGN_USER.email,
      action: 'created',
      resource_type: 'event',
      resource_id: null,
      metadata: JSON.stringify({
        event_title: 'Team Meeting',
        start_time: timestampFromNow(1, 10)
      })
    },
    {
      space_id: spaceId,
      user_id: userId,
      user_email: DESIGN_USER.email,
      action: 'completed',
      resource_type: 'goal',
      resource_id: null,
      metadata: JSON.stringify({
        goal_title: 'Family Game Night',
        category: 'family'
      })
    }
  ];

  const { error } = await supabase.from('activity_log').insert(activities);

  if (error) {
    console.error(`❌ Error creating activity log entries: ${error.message}`);
  } else {
    console.log(`✅ Created ${activities.length} activity log entries`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(70));
  console.log('🎨 ROWAN DESIGN AUDIT SEED SCRIPT');
  console.log('='.repeat(70));
  console.log('\nCreating comprehensive test data for design audit user...\n');

  try {
    // Step 1: Create user
    const userId = await createDesignUser();

    // Step 2: Create space
    const spaceId = await createSpace(userId);

    // Step 3: Create subscription
    await createSubscription(userId);

    // Step 4: Seed all feature data
    await seedTasks(userId, spaceId);
    await seedChores(userId, spaceId);
    await seedEvents(userId, spaceId);
    await seedShopping(userId, spaceId);
    const recipes = await seedRecipes(userId, spaceId);
    await seedMealPlans(userId, spaceId, recipes);
    await seedBudget(userId, spaceId);
    await seedExpenses(userId, spaceId);
    await seedGoals(userId, spaceId);
    await seedReminders(userId, spaceId);
    await seedMessages(userId, spaceId);
    await seedCheckIns(userId, spaceId);
    await seedActivityLog(userId, spaceId);

    console.log('\n' + '='.repeat(70));
    console.log('✅ DESIGN AUDIT USER SEED COMPLETE!');
    console.log('='.repeat(70));

    console.log('\n📝 User Credentials:');
    console.log(`   Email:    ${DESIGN_USER.email}`);
    console.log(`   Password: ${DESIGN_USER.password}`);
    console.log(`   Name:     ${DESIGN_USER.name}`);
    console.log(`   Tier:     ${DESIGN_USER.subscription.tier} (${DESIGN_USER.subscription.period})`);

    console.log('\n📊 Data Summary:');
    console.log('   ✅ 10 Tasks (various statuses, priorities, categories)');
    console.log('   ✅ 8 Chores (daily, weekly, biweekly, monthly)');
    console.log('   ✅ 12 Calendar Events (past, present, future)');
    console.log('   ✅ 3 Shopping Lists + 19 Items');
    console.log('   ✅ 4 Recipes (breakfast, lunch, dinner, dessert)');
    console.log('   ✅ 7 Meal Plans (one week)');
    console.log('   ✅ 1 Budget ($5000/month)');
    console.log('   ✅ 10 Expenses (various categories)');
    console.log('   ✅ 5 Goals + 14 Milestones');
    console.log('   ✅ 6 Reminders (various categories, priorities)');
    console.log('   ✅ 1 Conversation + 5 Messages');
    console.log('   ✅ 5 Daily Check-ins');
    console.log('   ✅ 5 Activity Log Entries');

    console.log('\n🎨 Ready for Design Audit!');
    console.log('   All pages should now have realistic data for UI/UX testing.');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
