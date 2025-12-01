# 🚀 Rowan App - Complete Technical Stack Documentation

> **Comprehensive overview of all technologies, services, APIs, and components used in the Rowan application**

---

## 📋 Table of Contents

1. [Core Framework & Runtime](#core-framework--runtime)
2. [Database & Backend](#database--backend)
3. [External APIs & Services](#external-apis--services)
4. [UI & Styling](#ui--styling)
5. [Audio & Media](#audio--media)
6. [Authentication & Security](#authentication--security)
7. [Real-time & Notifications](#real-time--notifications)
8. [Development Tools](#development-tools)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Internal Services Architecture](#internal-services-architecture)
11. [Database Schema](#database-schema)
12. [API Endpoints](#api-endpoints)

---

## 🎯 Core Framework & Runtime

### **Next.js 14** - React Framework
- **Version**: `^14.2.18`
- **Purpose**: App Router-based React framework for SSR, SSG, and API routes
- **Key Features Used**:
  - App Router (file-based routing)
  - Server Components
  - Client Components
  - Middleware for authentication
  - API Routes for backend functionality
  - Image optimization
  - Automatic code splitting

### **React 18** - UI Library
- **Version**: `^18.3.1`
- **Purpose**: Component-based UI library
- **Key Features Used**:
  - Hooks (useState, useEffect, useContext, useCallback, useMemo)
  - Server Components integration
  - Concurrent rendering
  - React.memo for performance optimization

### **TypeScript 5** - Type Safety
- **Version**: `^5`
- **Purpose**: Static type checking and enhanced developer experience
- **Configuration**: Strict mode enabled with comprehensive type checking

---

## 🗄️ Database & Backend

### **Supabase** - Backend-as-a-Service
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Built-in auth with JWT tokens
- **Real-time**: WebSocket subscriptions for live data
- **Storage**: File storage for avatars, receipts, and attachments
- **Edge Functions**: Serverless functions (if needed)

**Key Database Tables** (120+ migrations applied):
- **Users & Spaces**: `users`, `spaces`, `space_members`, `invitations`
- **Tasks Management**: `tasks`, `task_templates`, `task_dependencies`, `task_assignments`
- **Calendar & Events**: `events`, `event_proposals`, `calendar_integrations`
- **Goals System**: `goals`, `goal_check_ins`, `recurring_goal_templates`, `habit_entries`, `habit_streaks`
- **Financial**: `expenses`, `budgets`, `bills`, `goal_contributions`, `receipts`
- **Communication**: `messages`, `conversations`, `comments`, `reactions`
- **Notifications**: `notifications`, `reminders`, `push_subscriptions`
- **Voice & Media**: `voice_transcriptions`, `voice_note_templates`, `activity_feed`
- **Shopping & Meals**: `shopping_lists`, `shopping_items`, `meals`, `recipes`
- **Compliance**: `deleted_accounts`, `audit_logs`, `user_sessions`

**Database Functions Created**:
- Habit streak calculations
- Activity feed automation
- Goal milestone tracking
- Notification scheduling
- Data export functions

---

## 🌐 External APIs & Services

### **AI & Machine Learning**
#### **Google Gemini AI**
- **Purpose**: AI-powered content generation, goal insights, voice transcription analysis
- **API Key**: `GOOGLE_GEMINI_API_KEY`
- **Features**: Natural language processing, content suggestions, habit analysis

### **Communication & Email**
#### **Resend** - Email Service
- **Purpose**: Transactional emails, notifications, invitations
- **API Key**: `RESEND_API_KEY`
- **Features**: Email templates, delivery tracking, GDPR compliance

### **Caching & Performance**
#### **Upstash Redis**
- **Purpose**: Rate limiting, caching, session management
- **Config**: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- **Features**:
  - API rate limiting with `@upstash/ratelimit`
  - Cache management with `@upstash/redis`
  - Fast data retrieval for notifications

### **Push Notifications**
#### **Web Push Protocol (VAPID)**
- **Purpose**: Browser push notifications for reminders and updates
- **Config**:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_EMAIL`
- **Library**: `web-push` for server-side notification sending

### **Food & Recipe APIs**
#### **Edamam API**
- **Purpose**: Recipe search, nutritional information
- **Config**: `EDAMAM_APP_ID` + `EDAMAM_APP_KEY` (server-side only)

#### **Spoonacular API**
- **Purpose**: Advanced recipe features, meal planning
- **API Key**: `SPOONACULAR_API_KEY`

#### **RapidAPI (Tasty)**
- **Purpose**: Additional recipe database
- **API Key**: `RAPIDAPI_KEY`

#### **API Ninjas**
- **Purpose**: Recipe search and food data
- **API Key**: `API_NINJAS_KEY`

### **Error Monitoring**
#### **Sentry**
- **Purpose**: Error tracking, performance monitoring, alerts
- **Config**:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
- **Features**: Client, server, and edge function monitoring

### **Media & GIFs**
#### **Giphy API**
- **Purpose**: GIF search and integration in messages
- **Library**: `@giphy/js-fetch-api` + `@giphy/react-components`

---

## 🎨 UI & Styling

### **Tailwind CSS 4**
- **Purpose**: Utility-first CSS framework for rapid UI development
- **Configuration**: Custom design system with dark mode support
- **Features**: Responsive design, custom components, animations

### **Tailwind Extensions**
- **PostCSS**: `@tailwindcss/postcss` for CSS processing
- **Dark Mode**: Built-in dark mode support with `next-themes`

### **Icons & Graphics**
#### **Lucide React**
- **Purpose**: Comprehensive icon library
- **Features**: Consistent icon design, customizable, lightweight

---

## 🎵 Audio & Media

### **WaveSurfer.js**
- **Version**: `^7.11.0`
- **Purpose**: Audio waveform visualization for voice notes
- **Features**:
  - Interactive waveform display
  - Playback controls
  - Speed adjustment
  - Progress tracking

### **React Media Recorder**
- **Version**: `^1.7.2`
- **Purpose**: Browser-based audio recording
- **Features**:
  - Voice note recording
  - Audio format handling (WebM, MP3)
  - Microphone access management

---

## 🔐 Authentication & Security

### **Supabase Auth**
- **Features**:
  - Email/password authentication
  - Social login options
  - JWT token management
  - Multi-factor authentication (MFA)
  - Row Level Security (RLS) policies

### **Data Validation**
#### **Zod**
- **Version**: `^4.1.11`
- **Purpose**: Runtime type validation and schema validation
- **Usage**: API request validation, form validation, data sanitization

### **Content Security**
#### **DOMPurify**
- **Version**: `^3.3.0`
- **Purpose**: HTML sanitization to prevent XSS attacks
- **Usage**: User-generated content sanitization

### **Rate Limiting**
- **Implementation**: Upstash Redis-based rate limiting
- **Applied to**: All API endpoints for DDoS protection

---

## 🔄 Real-time & Notifications

### **Supabase Real-time**
- **Purpose**: Live data synchronization
- **Features**:
  - Task updates
  - Message delivery
  - Goal progress tracking
  - Shopping list changes

### **Push Notification System**
- **Web Push API**: Browser notifications
- **Service Worker**: Background notification handling
- **Notification Queue**: Database-backed notification scheduling

---

## 🛠️ Development Tools

### **Code Quality**
- **ESLint**: Code linting with Next.js configuration
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

### **Build Tools**
- **PostCSS**: CSS processing
- **SWC**: Fast compilation (built into Next.js)

### **Validation Scripts**
- **Database Validation**: `npm run validate-db`
- **Development Setup**: `npm run setup-dev`

---

## 🚀 Deployment & Infrastructure

### **Vercel** - Hosting Platform
- **Frontend**: Next.js application hosting
- **API Routes**: Serverless function deployment
- **Features**:
  - Automatic deployments from GitHub
  - Preview deployments for PRs
  - Edge network distribution
  - Environment variable management

### **GitHub** - Version Control
- **Repository**: Source code management
- **Actions**: CI/CD pipeline (if configured)
- **Features**:
  - Branch protection
  - Pull request workflows
  - Issue tracking

### **Docker** - Development Environment
- **Purpose**: Local development consistency
- **Supabase CLI**: Database migration management
- **Features**:
  - Container-based development
  - Consistent environment setup

---

## 🏗️ Internal Services Architecture

Our application follows a **Service Layer Architecture** with 70+ internal services:

### **Core Business Logic Services**

#### **Task Management Services**
- `tasks-service.ts` - Core task CRUD operations
- `task-templates-service.ts` - Reusable task templates
- `task-recurrence-service.ts` - Recurring task logic
- `task-dependencies-service.ts` - Task relationship management
- `task-assignments-service.ts` - User assignment logic
- `task-time-tracking-service.ts` - Time tracking functionality
- `task-comments-service.ts` - Task discussion threads
- `task-attachments-service.ts` - File attachment handling

#### **Calendar & Event Services**
- `calendar-service.ts` - Event management
- `smart-scheduling-service.ts` - AI-powered scheduling
- `conflict-detection-service.ts` - Scheduling conflict resolution
- `event-proposals-service.ts` - Collaborative event planning
- `natural-language-parser.ts` - "Lunch tomorrow at 2pm" → structured event

#### **Goals & Habits Services**
- `goals-service.ts` - Goal tracking and management
- `recurring-goals-service.ts` - Habit tracking with streak calculation
- `voice-transcription-service.ts` - AI-powered voice note analysis
- `goal-contributions-service.ts` - Financial goal tracking

#### **Financial Services**
- `budgets-service.ts` - Budget management
- `bills-service.ts` - Bill tracking and reminders
- `expense-splitting-service.ts` - Shared expense calculations
- `spending-insights-service.ts` - Financial analytics
- `receipts-service.ts` - Receipt management and OCR

#### **Communication Services**
- `messages-service.ts` - Real-time messaging
- `mentions-service.ts` - @user mention functionality
- `reactions-service.ts` - Emoji reactions system
- `notification-service.ts` - Multi-channel notifications

#### **Shopping & Meal Services**
- `shopping-service.ts` - Shopping list management
- `meals-service.ts` - Meal planning
- `external-recipes-service.ts` - Recipe API integration
- `ingredient-parser.ts` - Natural language ingredient parsing

#### **Compliance & Security Services**
- `account-deletion-service.ts` - GDPR-compliant account deletion
- `ccpa-service.ts` - California privacy law compliance
- `audit-log-service.ts` - Comprehensive activity logging
- `data-export-service.ts` - User data portability

### **Service Layer Benefits**
- **Consistent Data Access**: All database operations centralized
- **Reusability**: Services used across multiple components
- **Testing**: Isolated business logic testing
- **Type Safety**: Full TypeScript integration
- **Error Handling**: Standardized error responses

---

## 📊 Database Schema

### **Core Tables Summary**

#### **User Management**
```sql
users                 -- User profiles and settings
spaces                -- Shared workspaces (families/teams)
space_members         -- User-space relationships
invitations          -- Pending space invitations
```

#### **Task Management**
```sql
tasks                 -- Core task entity
task_templates       -- Reusable task templates
task_dependencies    -- Task prerequisite relationships
task_assignments     -- User task assignments
task_comments        -- Discussion threads
task_attachments     -- File attachments
```

#### **Goals & Habits System**
```sql
goals                    -- Goal tracking
goal_check_ins          -- Progress check-ins with voice notes
recurring_goal_templates -- Habit templates
habit_entries           -- Daily habit completions
habit_streaks           -- Streak calculations
voice_transcriptions    -- AI-powered voice analysis
voice_note_templates    -- Guided check-in prompts
activity_feed           -- Social activity stream
```

#### **Financial Management**
```sql
expenses              -- Expense tracking
budgets              -- Budget management
bills                -- Recurring bill tracking
goal_contributions   -- Financial goal deposits
receipts             -- Receipt storage and OCR
expense_splits       -- Shared expense calculations
```

#### **Communication**
```sql
messages             -- Real-time messaging
conversations        -- Message threads
reactions           -- Emoji reactions
mentions            -- @user mentions
notifications       -- Multi-channel notifications
reminders           -- Scheduled reminders
```

#### **Calendar & Events**
```sql
events               -- Calendar events
event_proposals      -- Collaborative planning
event_comments       -- Event discussions
calendar_integrations -- External calendar sync
```

#### **Shopping & Meals**
```sql
shopping_lists       -- Shopping list management
shopping_items       -- Individual list items
meals               -- Meal planning
recipes             -- Recipe storage
meal_plans          -- Weekly meal planning
```

### **Advanced Database Features**

#### **Row Level Security (RLS)**
- Every table protected with user/space-based access control
- Prevents cross-space data access
- Automatic data isolation

#### **Database Functions**
```sql
-- Habit tracking
update_habit_streak()           -- Calculate consecutive completion streaks
get_todays_habits()            -- Fetch user's daily habits

-- Activity automation
create_activity_feed_entry()   -- Auto-log user activities
get_activity_feed()           -- Retrieve activity stream

-- Goal analytics
get_goal_check_in_stats()     -- Goal progress analytics
calculate_goal_completion_date() -- Projected completion dates

-- Notification system
schedule_notification()        -- Queue notifications
process_notification_queue()   -- Background processing
```

#### **Triggers & Automation**
- **Habit Streaks**: Auto-calculate on completion
- **Activity Feed**: Auto-create entries for user actions
- **Milestone Detection**: Trigger celebrations
- **Bill Reminders**: Auto-schedule recurring bills

---

## 🌐 API Endpoints

### **RESTful API Structure**

#### **Core Resource APIs**
```typescript
// Task Management
GET/POST    /api/tasks
GET/PUT/DELETE /api/tasks/[id]

// Goals & Habits
GET/POST    /api/goals
GET/PUT/DELETE /api/goals/[id]

// Financial
GET/POST    /api/expenses
GET/PUT/DELETE /api/expenses/[id]
GET/POST    /api/budgets

// Communication
GET/POST    /api/messages
GET/PUT/DELETE /api/messages/[id]

// Calendar
GET/POST    /api/calendar
GET/PUT/DELETE /api/calendar/[id]

// Shopping
GET/POST    /api/shopping
GET/PUT/DELETE /api/shopping/[id]
```

#### **Specialized APIs**

#### **Authentication & User Management**
```typescript
POST /api/auth/signup                    -- User registration
POST /api/auth/cleanup-orphaned-user     -- Cleanup utility
POST /api/auth/mfa/enroll               -- Multi-factor setup
POST /api/auth/mfa/verify               -- MFA verification
POST /api/auth/mfa/unenroll             -- Disable MFA
```

#### **Notifications & Push**
```typescript
POST /api/notifications/subscribe       -- Push notification setup
PUT  /api/notifications/preferences     -- Notification settings
POST /api/notifications/send-push       -- Manual push sending
```

#### **Data Export & Compliance**
```typescript
GET  /api/user/export-data              -- JSON data export
GET  /api/user/export-data-csv          -- CSV export
GET  /api/user/export-data-pdf          -- PDF export
POST /api/user/privacy-settings         -- Privacy controls
POST /api/ccpa/opt-out                  -- California privacy opt-out
```

#### **Cron Jobs & Background Processing**
```typescript
POST /api/cron/task-jobs                -- Scheduled task processing
POST /api/cron/reminder-notifications   -- Reminder dispatch
POST /api/cron/goal-checkin-notifications -- Goal reminder system
POST /api/cron/process-notifications    -- Notification queue processing
POST /api/cron/cleanup-deleted-accounts -- Account cleanup (GDPR)
```

#### **File Processing**
```typescript
POST /api/upload/avatar                 -- Avatar image upload
POST /api/upload/recipe                 -- Recipe image upload
POST /api/ocr/scan-receipt             -- Receipt OCR processing
```

#### **External Integrations**
```typescript
// Recipe APIs
GET /api/recipes/external/search        -- Multi-provider recipe search
GET /api/recipes/external/spoonacular/search
GET /api/recipes/external/tasty/search
GET /api/recipes/external/apininjas/search
GET /api/recipes/external/random        -- Random recipe suggestions
POST /api/recipes/parse                 -- Parse recipe from URL

// Utility APIs
POST /api/geographic/detect             -- User location detection
POST /api/shopping/generate-from-meals  -- Auto-generate shopping lists
```

#### **Bulk Operations**
```typescript
POST /api/bulk/delete-expenses          -- Batch expense deletion
POST /api/bulk/export-by-date          -- Date-range exports
POST /api/bulk/archive-old-data        -- Data archival
```

---

## 🔧 Additional Libraries & Utilities

### **Date & Time Management**
- **date-fns**: Modern date utility library
- **date-fns-tz**: Timezone handling
- **chrono-node**: Natural language date parsing ("next Friday")

### **UI Enhancement Libraries**
- **@dnd-kit**: Drag and drop functionality for task reordering
- **@use-gesture**: Touch gesture handling
- **react-window**: Virtual scrolling for large lists
- **sonner**: Toast notification system
- **use-debounce**: Input debouncing for search

### **Rich Text Editing**
- **@tiptap/react**: Rich text editor
- **@tiptap/extension-mention**: @user mentions
- **@tiptap/extension-link**: Link handling
- **react-markdown**: Markdown rendering

### **Data Processing**
- **jspdf**: PDF generation for exports
- **jspdf-autotable**: Table formatting in PDFs

---

## 📈 Performance & Optimization

### **Caching Strategy**
- **Redis**: API rate limiting and session caching
- **React.memo**: Component memoization
- **useMemo/useCallback**: Hook-level optimization
- **React Server Components**: Reduced client-side JavaScript

### **Code Splitting**
- **Dynamic Imports**: Route-based code splitting
- **Next.js Automatic**: Component-level splitting

### **Database Optimization**
- **Indexes**: Performance indexes on frequently queried columns
- **Connection Pooling**: Supabase connection management
- **RLS Optimization**: Efficient security policies

---

## 🔒 Security Implementation

### **Data Protection**
- **Row Level Security**: Database-level access control
- **Input Validation**: Zod schema validation on all inputs
- **XSS Prevention**: DOMPurify sanitization
- **CSRF Protection**: Next.js built-in protection

### **Privacy Compliance**
- **GDPR**: Complete data export and deletion
- **CCPA**: California privacy law compliance
- **Data Minimization**: Automatic old data archival
- **Audit Logging**: Comprehensive activity tracking

### **Rate Limiting**
- **API Protection**: Upstash Redis-based rate limiting
- **DDoS Mitigation**: Request throttling
- **User Protection**: Prevent abuse

---

## 🎯 Key Features Enabled by Tech Stack

### **Advanced Voice Notes**
- **WaveSurfer.js**: Waveform visualization
- **React Media Recorder**: Browser recording
- **Google Gemini**: AI transcription and analysis
- **Supabase Storage**: Audio file storage

### **Habit Tracking with Streaks**
- **PostgreSQL Functions**: Complex streak calculations
- **Real-time Updates**: Live streak updates
- **Database Triggers**: Automatic calculations

### **Smart Notifications**
- **Web Push**: Browser notifications
- **Supabase Real-time**: Live data updates
- **Cron Jobs**: Scheduled reminders
- **Email Integration**: Resend API

### **Collaborative Features**
- **Real-time Messaging**: Supabase subscriptions
- **Shared Spaces**: Multi-user workspaces
- **Live Updates**: Concurrent editing support

### **Financial Intelligence**
- **Expense Splitting**: Complex calculation algorithms
- **Goal Tracking**: Progress visualization
- **Receipt OCR**: Automated expense entry
- **Budget Analytics**: Spending insights

---

## 🚀 Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     GitHub      │───▶│     Vercel      │───▶│   Production    │
│  Source Control │    │   Build & Host  │    │   Application   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase DB   │───▶│   Upstash Redis │───▶│  External APIs  │
│ PostgreSQL + Auth│    │  Cache & Limits │    │ Gemini, Resend  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

This comprehensive tech stack enables Rowan to be a powerful, scalable, and feature-rich family productivity application with advanced AI capabilities, real-time collaboration, and enterprise-grade security.