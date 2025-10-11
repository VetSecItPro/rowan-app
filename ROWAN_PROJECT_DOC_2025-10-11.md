# Rowan Web App - Complete Project Documentation
**Date:** October 11, 2025 (Updated: Latest Session)
**Status:** Active Development
**Version:** 1.1.0

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [AI/ML](#aiml)
  - [Development Tools](#development-tools)
- [Environment Setup](#environment-setup)
  - [Required Environment Variables](#required-environment-variables)
  - [Installation Steps](#installation-steps)
- [Database Schema](#database-schema)
  - [Core Tables](#core-tables)
  - [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
- [Features Implemented](#features-implemented)
- [API Integrations](#api-integrations)
- [File Structure](#file-structure)
- [Common Commands](#common-commands)
  - [Development Commands](#development-commands)
  - [Git Commands](#git-commands)
  - [Troubleshooting Commands](#troubleshooting-commands)
  - [Database Commands (Supabase CLI)](#database-commands-supabase-cli)
- [Development Workflow](#development-workflow)
  - [1. Starting Work on a New Feature](#1-starting-work-on-a-new-feature)
  - [2. Making Changes](#2-making-changes)
  - [3. Service Layer Pattern (MANDATORY)](#3-service-layer-pattern-mandatory)
  - [4. Real-time Subscription Pattern](#4-real-time-subscription-pattern)
  - [5. Component Organization](#5-component-organization)
  - [6. Styling Standards](#6-styling-standards)
  - [7. Testing Checklist](#7-testing-checklist)
- [Current State](#current-state)
  - [Recent Accomplishments (Last Session)](#recent-accomplishments-last-session)
  - [Git Status (as of last session)](#git-status-as-of-last-session)
  - [Latest Commits](#latest-commits)
- [Known Issues](#known-issues)
  - [Critical Issues](#critical-issues)
  - [Non-Critical Issues](#non-critical-issues)
- [Next Steps](#next-steps)
  - [Immediate Priorities](#immediate-priorities)
  - [Short-term Goals](#short-term-goals)
  - [Long-term Goals](#long-term-goals)
- [Working with Claude Code (Next Session)](#working-with-claude-code-next-session)
  - [Starting a New Session](#starting-a-new-session)
  - [Effective Prompts for Claude](#effective-prompts-for-claude)
  - [Common Tasks to Ask For](#common-tasks-to-ask-for)
- [Important Notes](#important-notes)
  - [Security Reminders](#security-reminders)
  - [Development Reminders](#development-reminders)
- [Support and Resources](#support-and-resources)
  - [Documentation Links](#documentation-links)
  - [Project-Specific Documentation](#project-specific-documentation)
- [Conclusion](#conclusion)

---

## Project Overview

**Rowan** is a collaborative life management application designed for couples and families. It provides a comprehensive suite of tools to manage daily life together, including task management, shared calendars, reminders, messaging, shopping lists, meal planning, household management, and goal tracking.

**Core Philosophy:**
- Security-first development (RLS policies, input validation, rate limiting)
- Real-time collaboration
- Partnership-based data isolation
- Mobile-responsive design with dark mode support
- Type-safe development with TypeScript strict mode

**Project Location:**
```
./
```

**Git Repository:**
- Branch: `main`
- Recent commits focused on: UI/UX enhancements, TypeScript fixes, milestone tracking, meal planning features

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x (strict mode enabled)
- **Styling:** Tailwind CSS 3.x
- **Theme Management:** next-themes
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod validation
- **UI Components:** Custom components with Tailwind
- **Date Handling:** date-fns
- **State Management:** React hooks + Context API

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (email/password, magic links)
- **Real-time:** Supabase Realtime (WebSocket subscriptions)
- **Storage:** Supabase Storage (for future file uploads)
- **API Routes:** Next.js API Routes
- **Rate Limiting:** Upstash Redis
- **Email:** Resend

### AI/ML
- **Recipe Parsing:** Google Gemini 1.5 Flash API
  - Used for extracting recipe data from text and images
  - Parses ingredients, instructions, prep/cook times
  - Image recognition for recipe cards

### Development Tools
- **Package Manager:** npm
- **Linting:** ESLint
- **Type Checking:** TypeScript compiler
- **Git:** Version control

---

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration (Public - safe for client)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key]

# Application URL (Public)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Service Role (Private - server only, NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]

# Resend Email Service (Private)
RESEND_API_KEY=re_[your-resend-key]

# Upstash Redis for Rate Limiting (Private)
UPSTASH_REDIS_REST_URL=https://[your-redis].upstash.io
UPSTASH_REDIS_REST_TOKEN=[your-redis-token]

# Google Gemini AI (Private)
GOOGLE_GEMINI_API_KEY=[your-gemini-api-key]

# Environment
NODE_ENV=development
```

### Installation Steps

1. **Clone and Install Dependencies:**
```bash
cd "./"
npm install
```

2. **Set Up Environment Variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your actual keys
```

3. **Run Development Server:**
```bash
npm run dev
# Server runs on http://localhost:3000
```

4. **Run Type Checking:**
```bash
npm run type-check
```

5. **Run Linter:**
```bash
npm run lint
```

6. **Build for Production:**
```bash
npm run build
```

---

## Database Schema

### Core Tables

#### 1. `users` (Managed by Supabase Auth)
- Standard Supabase auth.users table
- Extended with user profiles

#### 2. `partnerships`
- `id` (uuid, primary key)
- `name` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- **Purpose:** Represents a couple or family unit

#### 3. `partnership_members`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `user_id` (uuid, foreign key)
- `role` (text: 'owner' | 'member')
- `joined_at` (timestamp)
- **Purpose:** Links users to partnerships

#### 4. `tasks`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `title` (text)
- `description` (text, optional)
- `status` (text: 'pending' | 'in_progress' | 'completed')
- `priority` (text: 'low' | 'medium' | 'high')
- `assigned_to` (uuid, foreign key to users, optional)
- `due_date` (timestamp, optional)
- `created_by` (uuid, foreign key to users)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 5. `calendar_events`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `title` (text)
- `description` (text, optional)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `location` (text, optional)
- `event_type` (text: 'personal' | 'shared')
- `created_by` (uuid, foreign key)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 6. `reminders`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `title` (text)
- `description` (text, optional)
- `reminder_time` (timestamp)
- `recurring` (text: 'none' | 'daily' | 'weekly' | 'monthly')
- `is_completed` (boolean)
- `created_by` (uuid, foreign key)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 7. `messages`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `sender_id` (uuid, foreign key)
- `content` (text)
- `is_read` (boolean)
- `created_at` (timestamp)

#### 8. `shopping_lists`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `name` (text)
- `created_by` (uuid, foreign key)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 9. `shopping_items`
- `id` (uuid, primary key)
- `list_id` (uuid, foreign key to shopping_lists)
- `name` (text)
- `quantity` (text, optional)
- `category` (text, optional)
- `is_purchased` (boolean)
- `created_at` (timestamp)

#### 10. `recipes`
- `id` (uuid, primary key)
- `space_id` (uuid, foreign key to partnerships)
- `name` (text)
- `description` (text, optional)
- `ingredients` (jsonb array - can be strings or objects: {name, amount, unit})
- `instructions` (text, optional)
- `prep_time` (integer, minutes)
- `cook_time` (integer, minutes)
- `servings` (integer)
- `difficulty` (text: 'easy' | 'medium' | 'hard')
- `cuisine_type` (text)
- `source_url` (text, optional)
- `image_url` (text, optional)
- `tags` (text array)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 11. `meals`
- `id` (uuid, primary key)
- `space_id` (uuid, foreign key to partnerships)
- `recipe_id` (uuid, foreign key to recipes, optional)
- `name` (text, optional - for quick meals without recipes)
- `meal_type` (text: 'breakfast' | 'lunch' | 'dinner' | 'snack')
- `scheduled_date` (date)
- `notes` (text, optional)
- `created_by` (uuid, foreign key)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 12. `household_spaces`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `name` (text)
- `type` (text: 'room' | 'area' | 'storage')
- `description` (text, optional)
- `created_at` (timestamp)

#### 13. `household_items`
- `id` (uuid, primary key)
- `space_id` (uuid, foreign key)
- `name` (text)
- `category` (text)
- `quantity` (integer)
- `notes` (text, optional)
- `created_at` (timestamp)

#### 14. `goals`
- `id` (uuid, primary key)
- `partnership_id` (uuid, foreign key)
- `title` (text)
- `description` (text, optional)
- `category` (text: 'financial' | 'health' | 'relationship' | 'personal' | 'home' | 'career')
- `target_date` (date, optional)
- `status` (text: 'not_started' | 'in_progress' | 'completed' | 'on_hold')
- `progress` (integer, 0-100)
- `created_by` (uuid, foreign key)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 15. `milestones` (NEW - Added Oct 2025)
- `id` (uuid, primary key)
- `goal_id` (uuid, foreign key to goals)
- `title` (text)
- `description` (text, optional)
- `target_date` (date, optional)
- `is_completed` (boolean)
- `completed_at` (timestamp, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Row Level Security (RLS) Policies

**ALL tables have RLS enabled with the following policy pattern:**

```sql
-- Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "Users can view partnership data"
ON [table_name] FOR SELECT
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT Policy
CREATE POLICY "Users can create partnership data"
ON [table_name] FOR INSERT
WITH CHECK (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE Policy
CREATE POLICY "Users can update partnership data"
ON [table_name] FOR UPDATE
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);

-- DELETE Policy
CREATE POLICY "Users can delete partnership data"
ON [table_name] FOR DELETE
USING (
  partnership_id IN (
    SELECT partnership_id FROM partnership_members
    WHERE user_id = auth.uid()
  )
);
```

**Note:** Replace `partnership_id` with `space_id` for meal-related tables, as they use `space_id` instead.

---

## Features Implemented

### 1. Authentication System ✅
- **Location:** `app/(auth)/` directory
- **Features:**
  - Email/password login
  - User registration with partnership creation
  - Password reset flow
  - Session management with Supabase Auth
  - Protected routes with middleware
- **Files:**
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/signup/page.tsx`
  - `app/(auth)/reset-password/page.tsx`
  - `contexts/AuthContext.tsx`

### 2. Dashboard ✅
- **Location:** `app/(main)/dashboard/page.tsx`
- **Features:**
  - Overview stats for all features
  - Quick access cards to all modules
  - Real-time updates
  - Partnership-scoped data
  - Stats cards showing:
    - Active/pending tasks
    - Upcoming events
    - Active reminders
    - Unread messages
    - Shopping items
    - Planned meals
    - Household spaces/items
    - Goal progress
- **Service:** `lib/services/dashboard-service.ts`

### 3. Task Management ✅
- **Location:** `app/(main)/tasks/page.tsx`
- **Features:**
  - Create, edit, delete tasks
  - Task status tracking (pending, in_progress, completed)
  - Priority levels (low, medium, high)
  - Assignment to partnership members
  - Due dates with calendar picker
  - Real-time updates via Supabase subscriptions
  - Filter by status and priority
  - Empty states and loading states
- **Components:**
  - `components/tasks/TaskCard.tsx`
  - `components/tasks/NewTaskModal.tsx`
- **Service:** `lib/services/tasks-service.ts`

### 4. Calendar ✅
- **Location:** `app/(main)/calendar/page.tsx`
- **Features:**
  - Month/week/day view toggle
  - Create events with date/time pickers
  - Event types: personal vs shared
  - Location tracking
  - Real-time event updates
  - Calendar grid view
  - Stats: total, upcoming, personal, shared events
- **Components:**
  - `components/calendar/CalendarView.tsx`
  - `components/calendar/EventCard.tsx`
  - `components/calendar/NewEventModal.tsx`
- **Service:** `lib/services/calendar-service.ts`

### 5. Reminders ✅
- **Location:** `app/(main)/reminders/page.tsx`
- **Features:**
  - Create reminders with specific times
  - Recurring reminders (daily, weekly, monthly)
  - Mark as completed
  - Sort by date
  - Real-time updates
  - Active/completed filtering
- **Components:**
  - `components/reminders/ReminderCard.tsx`
  - `components/reminders/NewReminderModal.tsx`
- **Service:** `lib/services/reminders-service.ts`

### 6. Messaging ✅
- **Location:** `app/(main)/messages/page.tsx`
- **Features:**
  - Real-time chat between partnership members
  - Message read status
  - Auto-scroll to latest message
  - Timestamp display
  - Unread message count
  - Message grouping by sender
- **Components:**
  - `components/messages/MessageBubble.tsx`
  - `components/messages/MessageInput.tsx`
- **Service:** `lib/services/messages-service.ts`

### 7. Shopping Lists ✅
- **Location:** `app/(main)/shopping/page.tsx`
- **Features:**
  - Multiple shopping lists
  - Add/remove items
  - Mark items as purchased
  - Item categories
  - Quantity tracking
  - Real-time list updates
  - List sharing across partnership
- **Components:**
  - `components/shopping/ShoppingList.tsx`
  - `components/shopping/ShoppingItem.tsx`
  - `components/shopping/NewListModal.tsx`
- **Service:** `lib/services/shopping-service.ts`

### 8. Meal Planning ✅
- **Location:** `app/(main)/meals/page.tsx`
- **Features:**
  - Weekly meal calendar view
  - Recipe management (create, edit, delete)
  - Schedule meals by date and type (breakfast, lunch, dinner, snack)
  - AI-powered recipe parsing with Google Gemini:
    - Import from text (copy/paste recipes)
    - Import from images (recipe cards, cookbook photos)
    - Automatic extraction of ingredients, instructions, times
  - Recipe details:
    - Ingredients with amounts and units
    - Instructions
    - Prep and cook times
    - Servings
    - Difficulty level
    - Cuisine type
    - Tags
    - Source URL
  - Meal view toggle: week/list
  - Stats: meals this week, next week, saved recipes
- **Components:**
  - `components/meals/MealCalendar.tsx`
  - `components/meals/RecipeCard.tsx`
  - `components/meals/NewRecipeModal.tsx` (with AI import)
  - `components/meals/MealCard.tsx`
- **Service:** `lib/services/meals-service.ts`
- **API Route:** `app/api/recipes/parse/route.ts` (Gemini integration)

### 9. Household Management ✅
- **Location:** `app/(main)/household/page.tsx`
- **Features:**
  - Organize by spaces (rooms, areas, storage)
  - Track items in each space
  - Item categories and quantities
  - Notes for items
  - Stats: total spaces, total items
  - Real-time updates
- **Components:**
  - `components/household/SpaceCard.tsx`
  - `components/household/ItemCard.tsx`
  - `components/household/NewSpaceModal.tsx`
- **Service:** `lib/services/household-service.ts`

### 10. Goal Tracking ✅
- **Location:** `app/(main)/goals/page.tsx`
- **Features:**
  - Create goals with categories (financial, health, relationship, etc.)
  - Progress tracking (0-100%)
  - Status management (not_started, in_progress, completed, on_hold)
  - Target dates
  - Milestone tracking (NEW):
    - Add milestones to goals
    - Track milestone completion
    - Target dates for milestones
    - Visual milestone progress
  - Goal categories with color coding
  - Stats: active goals, completed goals, overall progress
- **Components:**
  - `components/goals/GoalCard.tsx`
  - `components/goals/NewGoalModal.tsx`
  - `components/goals/MilestoneCard.tsx` (NEW)
  - `components/goals/NewMilestoneModal.tsx` (NEW)
- **Service:** `lib/services/goals-service.ts`
- **Migration:** `supabase/migrations/20251006000000_add_milestone_tracking.sql`

### 11. Settings ✅
- **Location:** `app/(main)/settings/page.tsx`
- **Features:**
  - User profile management
  - Partnership information
  - Theme toggle (light/dark mode)
  - Account settings
  - Notification preferences (placeholder)
- **Components:**
  - `components/settings/ProfileSection.tsx`
  - `components/settings/PartnershipSection.tsx`
  - `components/theme/ThemeToggle.tsx`

### 12. Legal Pages ✅
- **Location:** `app/(legal)/` directory
- **Pages:**
  - Privacy Policy: `app/(legal)/privacy/page.tsx`
  - Terms of Service: `app/(legal)/terms/page.tsx`
  - Cookie Policy: `app/(legal)/cookies/page.tsx`
- **Features:**
  - Comprehensive legal documentation
  - Responsive design
  - Dark mode support

---

## API Integrations

### 1. Supabase
- **Purpose:** Database, Authentication, Real-time subscriptions
- **Configuration:** `lib/supabase/client.ts` and `lib/supabase/server.ts`
- **Usage:**
  - Client-side: `createClient()` from `@/lib/supabase/client`
  - Server-side: `createClient()` from `@/lib/supabase/server`
  - Never use service_role key on client side

### 2. Google Gemini (AI)
- **Purpose:** Recipe parsing from text and images
- **Model:** gemini-1.5-flash (cost-effective)
- **API Route:** `app/api/recipes/parse/route.ts`
- **Configuration:**
  ```typescript
  import { GoogleGenerativeAI } from '@google/generative-ai';
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
  ```
- **Features:**
  - Text-based recipe extraction
  - Image recognition for recipes
  - Structured JSON output
  - Ingredient parsing with amounts/units
  - Automatic difficulty and cuisine type detection

### 3. Upstash Redis
- **Purpose:** Rate limiting for API routes
- **Configuration:** `lib/ratelimit.ts`
- **Usage:**
  ```typescript
  import { ratelimit } from '@/lib/ratelimit';
  const { success } = await ratelimit.limit(ip);
  ```
- **Settings:** 10 requests per 10 seconds (sliding window)

### 4. Resend
- **Purpose:** Transactional emails (password resets, invitations)
- **Configuration:** Environment variable `RESEND_API_KEY`
- **Usage:** Send emails via Resend API
- **Status:** Configured but not fully implemented

---

## File Structure

```
rowan-app/
├── app/
│   ├── (auth)/                    # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── (main)/                    # Main application pages
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── reminders/
│   │   ├── messages/
│   │   ├── shopping/
│   │   ├── meals/
│   │   ├── household/
│   │   ├── goals/
│   │   └── settings/
│   ├── (legal)/                   # Legal pages
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── cookies/
│   ├── api/                       # API routes
│   │   └── recipes/
│   │       └── parse/
│   │           └── route.ts       # Gemini AI integration
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home/landing page
│
├── components/
│   ├── auth/                      # Auth components
│   ├── dashboard/                 # Dashboard components
│   ├── tasks/                     # Task components
│   ├── calendar/                  # Calendar components
│   ├── reminders/                 # Reminder components
│   ├── messages/                  # Message components
│   ├── shopping/                  # Shopping components
│   ├── meals/                     # Meal planning components
│   ├── household/                 # Household components
│   ├── goals/                     # Goal tracking components
│   ├── settings/                  # Settings components
│   ├── theme/                     # Theme components
│   └── shared/                    # Shared/reusable components
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── LoadingSpinner.tsx
│       └── Sidebar.tsx
│
├── contexts/
│   └── AuthContext.tsx            # Authentication context
│
├── lib/
│   ├── services/                  # Service layer (database operations)
│   │   ├── dashboard-service.ts
│   │   ├── tasks-service.ts
│   │   ├── calendar-service.ts
│   │   ├── reminders-service.ts
│   │   ├── messages-service.ts
│   │   ├── shopping-service.ts
│   │   ├── meals-service.ts
│   │   ├── household-service.ts
│   │   └── goals-service.ts
│   ├── supabase/
│   │   ├── client.ts              # Client-side Supabase
│   │   └── server.ts              # Server-side Supabase
│   ├── ratelimit.ts               # Upstash rate limiting
│   ├── types.ts                   # TypeScript types
│   └── utils.ts                   # Utility functions
│
├── supabase/
│   └── migrations/                # Database migrations
│       └── 20251006000000_add_milestone_tracking.sql
│
├── public/                        # Static assets
│
├── .env.local                     # Environment variables (DO NOT COMMIT)
├── .env.example                   # Example environment variables
├── .gitignore
├── CLAUDE.md                      # Development standards (CRITICAL - READ THIS!)
├── ROWAN_PROJECT_DOC_2025-10-11.md  # This file
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Common Commands

### Development Commands

```bash
# Navigate to project directory
cd "./"

# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Start on specific port
PORT=5000 npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### Git Commands

```bash
# Check status
git status

# Stage all changes
git add .

# Commit with conventional commit message
git commit -m "feat(meals): add AI recipe parsing with Gemini"

# Push to remote
git push origin main

# View commit history
git log --oneline -10

# View branch
git branch
```

### Troubleshooting Commands

```bash
# Kill all Node processes
killall -9 node

# Kill processes on specific port
lsof -ti:3000 | xargs kill -9

# Clear Next.js cache
rm -rf .next

# Clear node modules cache
rm -rf node_modules/.cache

# Full clean reinstall (nuclear option)
rm -rf node_modules .next
npm install
npm run dev
```

### Database Commands (Supabase CLI)

```bash
# Run migrations (if using local Supabase)
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > lib/types/database.ts

# View logs
supabase logs
```

---

## Development Workflow

### 1. Starting Work on a New Feature

```bash
# Create feature branch (optional, currently working on main)
git checkout -b feature/new-feature-name

# Start dev server
npm run dev

# Open in browser
open http://localhost:3000
```

### 2. Making Changes

1. **Read CLAUDE.md first!** - Contains all development standards
2. Create service layer if needed (`lib/services/`)
3. Create components (`components/feature-name/`)
4. Create page (`app/(main)/feature-name/page.tsx`)
5. Add RLS policies in Supabase dashboard
6. Test real-time functionality
7. Test dark mode
8. Test mobile responsiveness

### 3. Service Layer Pattern (MANDATORY)

**ALL database operations MUST go through `lib/services/`**

Example service structure:
```typescript
// lib/services/example-service.ts
import { createClient } from '@/lib/supabase/server';

export const exampleService = {
  async getItems(partnershipId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('partnership_id', partnershipId);

    if (error) throw error;
    return data;
  },

  async createItem(input: CreateItemInput) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('items')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
```

### 4. Real-time Subscription Pattern

```typescript
useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel('items_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'items',
      filter: `partnership_id=eq.${partnershipId}`
    }, (payload) => {
      // Handle real-time update
      handleRealtimeUpdate(payload);
    })
    .subscribe();

  // MANDATORY: Cleanup subscription
  return () => {
    supabase.removeChannel(channel);
  };
}, [partnershipId]);
```

### 5. Component Organization

- **Server Components:** Default in Next.js 15 App Router
- **Client Components:** Add `'use client'` directive
- **Shared Components:** Reusable UI in `components/shared/`
- **Feature Components:** Feature-specific in `components/feature-name/`

### 6. Styling Standards

```typescript
// Feature color mapping (use these consistently)
const FEATURE_COLORS = {
  tasks: 'blue',
  calendar: 'purple',
  reminders: 'pink',
  messages: 'green',
  shopping: 'emerald',
  meals: 'orange',
  household: 'amber',
  goals: 'indigo',
};

// Always include dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

// Icon sizing
<Icon className="w-7 h-7" />  // Feature icons
<Icon className="w-5 h-5" />  // Control icons
<Icon className="w-4 h-4" />  // Small inline icons
```

### 7. Testing Checklist

Before committing:
- [ ] TypeScript compiles: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Feature works in light mode
- [ ] Feature works in dark mode
- [ ] Mobile responsive
- [ ] Real-time updates working
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Error handling in place
- [ ] RLS policies tested

---

## Current State

### Recent Accomplishments (This Session - October 11, 2025)

1. **CRITICAL: Security Vulnerability Fixed** 🔒 ✅
   - **Issue:** Unauthenticated users could access dashboard and protected routes
   - **Root Cause:** Three routes were completely unprotected by middleware:
     - `/projects` - No authentication required
     - `/recipes` - No authentication required
     - `/invitations` - No authentication required
   - **Fix Applied:**
     - Added missing routes to middleware protection list
     - Updated middleware matcher configuration
     - Added authentication loading guard to dashboard
     - Dashboard now shows loading spinner before redirect
   - **Impact:** Major security breach prevented. All protected routes now properly secured.
   - **Commit:** 721f1a6

2. **Reminders Feature Fixes** ✅
   - **Fixed:** Reminders dashboard tile color mismatch (orange → pink)
     - Changed from orange-600 to pink-600 to match feature page
     - Updated icon gradient and hover effects
     - Commit: 6287db4
   - **Fixed:** "New Reminder" button not functional
     - Modal wasn't rendering when user had no space assigned
     - Added fallback message for users without spaces
     - Improved UX with clear feedback
     - Commit: b6ef832

3. **Build & Configuration Fixes** ✅
   - Fixed orphaned household page breaking builds
   - Resolved standalone output config issue
   - Standalone mode now only enabled on Vercel (not local builds)
   - Removed duplicate marketing pages
   - Commits: c17a3c4, 5f1b76f

4. **Supabase Client Optimization** ✅
   - Implemented singleton pattern for Supabase client
   - Prevents multiple GoTrueClient instances warning
   - Fixes React errors (#425, #418, #423) in production
   - Improved performance and memory usage
   - Commit: 97f5575

5. **Goals Feature Enhancements** ✅
   - Reverted terminology from "Steps" back to "Milestones"
   - Fixed layout shifting issues
   - Enabled filter buttons
   - Improved flexible layout matching tasks page
   - Commits: d5a02a9, 3087d04, 423f5f6

### Recent Accomplishments (Previous Session)

1. **Milestone Tracking System** ✅
   - Added milestones table to database
   - Created MilestoneCard and NewMilestoneModal components
   - Integrated with goals page
   - Migration file created

2. **Meal Planning Enhancements** ✅
   - AI recipe parsing with Google Gemini API
   - Text and image-based recipe import
   - Improved NewRecipeModal with toggle between Manual/AI
   - Toggle styling updates to match meal planning page

3. **UI/UX Improvements** ✅
   - Consistent toggle styling across components
   - Fixed layout shifting issues
   - Enhanced dark mode support
   - Improved gradient backgrounds

4. **TypeScript Fixes** ✅
   - Resolved build errors in calendar service
   - Fixed type inconsistencies in messages service
   - Updated dashboard stats interfaces

### Git Status (Current - After This Session)
```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```
**Status:** ✅ All changes committed and pushed to remote

### Latest Commits (This Session)
```
721f1a6 SECURITY: fix authentication bypass vulnerability
b6ef832 fix(reminders): make new reminder button functional without space
6287db4 style(dashboard): fix reminders tile color to match feature page
c17a3c4 fix(build): remove orphaned household page and fix standalone config
97f5575 fix(supabase): implement singleton pattern to prevent multiple GoTrueClient instances
5f1b76f chore(features): remove orphaned household marketing page
d5a02a9 refactor(goals): revert terminology from 'Steps' back to 'Milestones'
dd2e192 fix(config): resolve 404 errors by making standalone output production-only
3087d04 fix(goals): fix layout shift and enable filter buttons
423f5f6 fix(goals): replicate exact flexible layout from tasks page
```

---

## Known Issues

### Critical Issues

1. **Supabase User Deletion Constraint** ⚠️
   - **Issue:** Cannot delete users from `users` table in Supabase dashboard
   - **Error:** "Database error: foreign key constraint violation"
   - **Root Cause:** `user_progress` table references `auth.users(id)` without `ON DELETE CASCADE`
     ```sql
     user_id UUID REFERENCES auth.users(id) NOT NULL
     -- Missing: ON DELETE CASCADE
     ```
   - **Impact:** Unable to delete test users or clean up user data
   - **Solution Options:**
     1. **Delete from Auth Dashboard** (Recommended): Delete users from Authentication → Users in Supabase dashboard
     2. **Manual SQL Cleanup**:
        ```sql
        BEGIN;
        DELETE FROM user_progress WHERE user_id = 'USER_ID_HERE';
        DELETE FROM space_members WHERE user_id = 'USER_ID_HERE';
        DELETE FROM daily_checkins WHERE user_id = 'USER_ID_HERE';
        DELETE FROM users WHERE id = 'USER_ID_HERE';
        DELETE FROM auth.users WHERE id = 'USER_ID_HERE';
        COMMIT;
        ```
     3. **Permanent Fix** (Migration needed):
        ```sql
        ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;
        ALTER TABLE user_progress ADD CONSTRAINT user_progress_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        ```
   - **Status:** IDENTIFIED (requires migration or manual cleanup)
   - **Location:** `supabase/migrations/20251010000001_create_user_progress.sql` line 4

### Resolved Issues (This Session) ✅

1. **Authentication Bypass Vulnerability** ✅ **FIXED**
   - **Issue:** Unauthenticated users could access dashboard and all protected routes
   - **Status:** RESOLVED with middleware updates and authentication guards
   - **Commit:** 721f1a6

2. **Reminders Button Not Functional** ✅ **FIXED**
   - **Issue:** "New Reminder" button appeared but didn't open modal
   - **Status:** RESOLVED with conditional modal rendering
   - **Commit:** b6ef832

3. **Reminders Color Mismatch** ✅ **FIXED**
   - **Issue:** Dashboard tile showed orange instead of pink
   - **Status:** RESOLVED with color updates
   - **Commit:** 6287db4

4. **Multiple GoTrueClient Instances** ✅ **FIXED**
   - **Issue:** React errors in production console
   - **Status:** RESOLVED with singleton pattern
   - **Commit:** 97f5575

5. **Orphaned Build Files** ✅ **FIXED**
   - **Issue:** Build failing due to orphaned household pages
   - **Status:** RESOLVED by removing orphaned files
   - **Commits:** c17a3c4, 5f1b76f

### Resolved Issues (Previous Sessions) ✅

1. **Next.js Build Corruption** ✅ **FIXED**
   - **Issue:** "Cannot find module './next-server.js'" error
   - **Status:** RESOLVED with clean reinstall and proper process management

2. **Multiple Background Processes** ✅ **IMPROVED**
   - **Issue:** 60+ background bash processes running dev servers
   - **Status:** IMPROVED with better cleanup practices

3. **NewRecipeModal Layout Shifting** ✅ **FIXED**
   - **Issue:** Modal height changes when toggling between Manual/AI tabs
   - **Status:** FIXED with `h-[600px]` fixed height
   - **Commit:** 7e9ffc7

4. **Toggle Styling Inconsistency** ✅ **FIXED**
   - **Issue:** Toggle buttons didn't match meal planning page style
   - **Status:** FIXED with border and shadow enhancements
   - **Commit:** 7e9ffc7

---

## Next Steps

### Immediate Priorities

1. **Fix User Deletion Constraint** 🟡
   - Create migration to add `ON DELETE CASCADE` to user_progress table
   - Test user deletion flow in development
   - Verify cascade deletes work correctly
   - Document cleanup procedures for production

2. **Security Audit** 🟢
   - Review all middleware protected routes
   - Verify RLS policies on all tables
   - Test authentication flows
   - Check for any remaining unauthorized access points

3. **Test Recent Fixes on Production** 🟢
   - Verify authentication protection on Vercel
   - Test reminder button functionality
   - Confirm color consistency across features
   - Check for any console errors

### Short-term Goals

1. **Notifications System**
   - Browser notifications for reminders
   - Email notifications via Resend
   - Notification preferences in settings

2. **File Uploads**
   - User profile pictures
   - Recipe images via Supabase Storage
   - Household item photos

3. **Enhanced Messaging**
   - File attachments
   - Image sharing
   - Emoji reactions
   - Message editing/deletion

4. **Shopping List Improvements**
   - Generate list from meal plan ingredients
   - Share lists via link
   - Barcode scanning (mobile)

5. **Calendar Enhancements**
   - Google Calendar integration
   - Recurring events
   - Event invitations
   - Calendar export (iCal)

### Long-term Goals

1. **Mobile App**
   - React Native app
   - Push notifications
   - Offline support

2. **AI Integrations**
   - Meal plan suggestions based on preferences
   - Shopping list optimization
   - Task prioritization recommendations
   - Goal milestone suggestions

3. **Analytics Dashboard**
   - Productivity insights
   - Goal completion trends
   - Partnership activity metrics

4. **Third-party Integrations**
   - Google Calendar sync
   - Todoist integration
   - Amazon shopping list sync
   - Smart home device integration

---

## Working with Claude Code (Next Session)

### Starting a New Session

When starting a new Claude Code session with this project:

1. **First, have Claude read this document:**
   ```
   Read ROWAN_PROJECT_DOC_2025-10-11.md to understand the project state
   ```

2. **Then, have Claude read the development standards:**
   ```
   Read CLAUDE.md for all development standards and patterns
   ```

3. **Check git status:**
   ```
   Run git status to see current changes
   ```

4. **Start dev server:**
   ```
   Kill all node processes and start a clean dev server
   ```

### Effective Prompts for Claude

**Creating a new feature:**
```
Create a new [feature name] feature following the patterns in CLAUDE.md.
Include:
- Service layer at lib/services/[feature]-service.ts
- Components at components/[feature]/
- Page at app/(main)/[feature]/page.tsx
- Real-time subscriptions with cleanup
- Loading and empty states
- Dark mode support
- RLS policies for the database
```

**Fixing issues:**
```
I'm seeing [error message]. Please:
1. Investigate the cause
2. Explain what's wrong
3. Provide a fix following our coding standards
4. Test that it works
```

**Adding to existing features:**
```
Add [new functionality] to the [existing feature] following our existing patterns.
Use the same styling, component structure, and service layer approach.
```

### Common Tasks to Ask For

- "Review the code for security vulnerabilities"
- "Add TypeScript types for [feature]"
- "Implement real-time updates for [feature]"
- "Add dark mode support to [component]"
- "Create a service layer for [feature]"
- "Fix linting errors"
- "Commit current changes with a conventional commit message"
- "Create a pull request for [feature]"

---

## Important Notes

### Security Reminders

1. **Never commit `.env.local`** - Contains sensitive API keys
2. **Always use RLS policies** - Protect partnership data
3. **Validate all inputs** - Use Zod schemas
4. **Rate limit API routes** - Use Upstash Redis
5. **Partnership isolation** - Always filter by partnership_id/space_id
6. **No service_role key on client** - Only in server API routes

### Development Reminders

1. **Read CLAUDE.md first** - Contains all standards
2. **Use service layer** - No direct Supabase in components
3. **Type safety** - No `any` types allowed
4. **Clean up subscriptions** - Return cleanup function in useEffect
5. **Test dark mode** - Always test both themes
6. **Mobile responsive** - Test on small screens
7. **Error handling** - Try/catch all async operations
8. **Loading states** - Always show loading indicators
9. **Empty states** - Handle empty data gracefully

---

## Support and Resources

### Documentation Links

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs
- **Zod:** https://zod.dev
- **Google Gemini:** https://ai.google.dev/docs
- **Upstash Redis:** https://docs.upstash.com
- **Resend:** https://resend.com/docs

### Project-Specific Documentation

- **CLAUDE.md** - Development standards (MUST READ)
- **README.md** - Basic project setup
- **This file** - Complete project state

---

## Conclusion

This document represents the complete state of the Rowan Web App as of October 11, 2025. It includes all implemented features, current issues, and everything needed to continue development in a new session.

**Key Takeaway:** Before doing anything in a new session, read this document AND CLAUDE.md to understand the project structure, patterns, and standards. This will ensure consistency and maintain code quality.

**Current Priority:** Create migration to fix user deletion constraint, then continue with security audit and testing recent fixes on production.

---

**Document Version:** 1.1.0
**Created:** October 11, 2025
**Last Updated:** October 11, 2025 (After Session)
**Author:** AI (Claude Code) with user direction
**Next Review:** After completing user deletion fix and security audit
