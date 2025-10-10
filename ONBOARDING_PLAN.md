# Rowan Onboarding & UX Refinement Plan

> **Timeline:** 2 weeks before subscription implementation
> **Goal:** Create exceptional first-time user experience with mobile optimization and guided flows

---

## Table of Contents

1. [Partnership Setup Wizard](#partnership-setup-wizard)
2. [Guided First-Time Creation Flows](#guided-first-time-creation-flows)
3. [Mobile Optimization Strategy](#mobile-optimization-strategy)
4. [Accessibility Improvements](#accessibility-improvements)
5. [Implementation Timeline](#implementation-timeline)
6. [Database Schema](#database-schema)
7. [Component Structure](#component-structure)

---

## Partnership Setup Wizard

### Purpose
Rowan is built for couples/families to share their life together. The partnership is the core unit where all data is scoped and shared.

### What It Does
1. Asks "Who are you managing life with?"
2. Enter partner's email
3. Sends invitation link
4. Creates partnership record when they accept
5. Both accounts now share: tasks, calendar, shopping lists, etc.

### Skip Option
- Users can skip and use solo mode (no sharing)
- Can invite partner later from Settings

---

## Guided First-Time Creation Flows

### Overall Strategy
- Interactive guided modals for first-time users
- 3-4 step wizard for each feature
- Contextual tips and encouragement
- Success screens with next actions
- Track completion in `user_progress` table

---

### 1. First Task Creation

**Modal Title:** "Create Your First Task"

**Step 1: Introduction**
```
Welcome to Tasks! 👋

Tasks help you and your partner track what needs to get done.
Perfect for:
• Household chores
• Errands to run
• Things to remember
• Shared to-dos

Let's create your first task together.

[Next →]
```

**Step 2: Basic Info**
```
What needs to be done?

Title: [___________________________]
       (e.g., "Buy groceries", "Call dentist")

Description (optional):
[________________________________]
[________________________________]

[← Back]  [Next →]
```

**Step 3: Details**
```
Task details

Who should do this?
( ) Me
( ) My partner
( ) Either of us

When is it due?
[ ] No due date
[📅 Pick a date]

Priority:
(•) Low  ( ) Medium  ( ) High

[← Back]  [Create Task ✓]
```

**Step 4: Success Screen**
```
✓ Great! Your first task is created!

"Buy groceries" is now in your task list.

What would you like to do next?

[Create Another Task]  [View All Tasks]
```

---

### 2. First Calendar Event

**Modal Title:** "Add Your First Event"

**Step 1: Introduction**
```
Welcome to Calendar! 📅

Keep track of:
• Appointments
• Date nights
• Family gatherings
• Important deadlines

Let's add your first event.

[Next →]
```

**Step 2: Event Basics**
```
What's the event?

Event name: [___________________________]
            (e.g., "Dinner at Mom's", "Doctor appt")

Location (optional):
[___________________________]

Description (optional):
[________________________________]

[← Back]  [Next →]
```

**Step 3: Time & Attendees**
```
When is it?

Date: [📅 Select date]

Time: [🕐 Start time] to [🕐 End time]

[ ] All day event

Who's attending?
☑ Me
☐ My partner

[← Back]  [Create Event ✓]
```

**Step 4: Success**
```
✓ Event added to your calendar!

"Dinner at Mom's" is scheduled for Saturday.

We'll send you a reminder before it starts.

[Add Another Event]  [View Calendar]
```

---

### 3. First Reminder

**Modal Title:** "Set Your First Reminder"

**Step 1: Introduction**
```
Welcome to Reminders! 🔔

Never forget important things:
• Medication times
• Bill due dates
• Recurring tasks
• Important calls

Let's set your first reminder.

[Next →]
```

**Step 2: Reminder Details**
```
What should we remind you about?

Reminder: [___________________________]
          (e.g., "Take vitamins", "Pay rent")

When?
( ) One-time
( ) Recurring

Date: [📅 Select date]
Time: [🕐 Select time]

[← Back]  [Next →]
```

**Step 3: Repeat Settings (if recurring)**
```
How often should this repeat?

( ) Daily
( ) Weekly (on _______)
( ) Monthly (on day ___)
( ) Custom

Notify:
☑ Me
☐ My partner

[← Back]  [Create Reminder ✓]
```

**Step 4: Success**
```
✓ Reminder is all set!

We'll remind you about "Take vitamins"
every day at 9:00 AM.

[Set Another Reminder]  [View All Reminders]
```

---

### 4. First Message

**Modal Title:** "Send Your First Message"

**Step 1: Introduction**
```
Welcome to Messages! 💬

Stay connected with your partner:
• Quick notes
• Share thoughts
• Leave sweet messages
• Real-time chat

Send your first message!

[Next →]
```

**Step 2: Compose**
```
Write your message

To: [Partner's name]

[________________________________]
[________________________________]
[________________________________]
[________________________________]

💡 Tip: Messages are private between you two

[← Back]  [Send Message →]
```

**Step 3: Success**
```
✓ Message sent!

Your partner will see it when they open Rowan.

[Send Another]  [View Conversation]
```

---

### 5. First Shopping List Item

**Modal Title:** "Add Your First Shopping Item"

**Step 1: Introduction**
```
Welcome to Shopping! 🛒

Never forget what to buy:
• Groceries
• Household items
• Things you need
• Shared shopping lists

Add your first item.

[Next →]
```

**Step 2: Add Item**
```
What do you need to buy?

Item: [___________________________]
      (e.g., "Milk", "Paper towels")

Quantity: [2] [unit ▾]

Category:
( ) Groceries
( ) Household
( ) Personal
( ) Other

Priority:
( ) Low  (•) Medium  ( ) High

[← Back]  [Add Item ✓]
```

**Step 3: Success**
```
✓ Item added to shopping list!

"Milk" is on your list.

💡 Tip: Check off items as you shop.
Your partner can see the list too!

[Add Another Item]  [View Shopping List]
```

---

### 6. First Meal Plan

**Modal Title:** "Plan Your First Meal"

**Step 1: Introduction**
```
Welcome to Meals! 🍽️

Plan what's for dinner:
• Weekly meal planning
• Recipe ideas
• Cooking assignments
• Dietary preferences

Let's plan your first meal.

[Next →]
```

**Step 2: Meal Details**
```
What's for dinner?

Meal name: [___________________________]
           (e.g., "Spaghetti & meatballs")

When?
Date: [📅 Select date]
Meal type: [Dinner ▾]

Recipe/Notes (optional):
[________________________________]

Who's cooking?
( ) Me
( ) My partner
( ) Ordering out

[← Back]  [Add Meal ✓]
```

**Step 3: Success**
```
✓ Meal planned!

"Spaghetti & meatballs" is planned for Thursday.

💡 Plan your whole week to make grocery
shopping easier!

[Plan Another Meal]  [View Meal Plan]
```

---

### 7. First Household Item/Chore

**Modal Title:** "Add Your First Household Task"

**Step 1: Introduction**
```
Welcome to Household! 🏠

Manage your home together:
• Chores & cleaning
• Home maintenance
• Projects
• Shared responsibilities

Create your first household task.

[Next →]
```

**Step 2: Task Setup**
```
What needs to be done?

Task: [___________________________]
      (e.g., "Clean kitchen", "Mow lawn")

Type:
( ) Chore
( ) Maintenance
( ) Project

Frequency:
( ) One-time
( ) Weekly
( ) Monthly

Assigned to:
( ) Me
( ) My partner
( ) Unassigned

[← Back]  [Create Task ✓]
```

**Step 3: Success**
```
✓ Household task created!

"Clean kitchen" is on your list.

💡 Set recurring tasks to automate
your chore schedule!

[Add Another]  [View Household]
```

---

### 8. First Goal

**Modal Title:** "Set Your First Goal"

**Step 1: Introduction**
```
Welcome to Goals! 🎯

Track what you want to achieve:
• Personal growth
• Relationship goals
• Financial targets
• Shared dreams

Set your first goal together.

[Next →]
```

**Step 2: Goal Details**
```
What's your goal?

Goal: [___________________________]
      (e.g., "Save $5,000", "Run a 5K")

Category:
( ) Financial
( ) Health & Fitness
( ) Relationship
( ) Personal
( ) Other

Target date: [📅 Optional]

[← Back]  [Next →]
```

**Step 3: Milestones (Optional)**
```
Add milestones to track progress

Milestone 1: [___________________________]

Milestone 2: [___________________________]

Milestone 3: [___________________________]

[ Skip this step ]

[← Back]  [Create Goal ✓]
```

**Step 4: Success**
```
✓ Goal created!

"Save $5,000" is now being tracked.

💡 Update your progress regularly to
stay motivated!

[Add Another Goal]  [View Goals]
```

---

## Mobile Optimization Strategy

### Bottom-Up Approach
Fix the foundation first, then work up to complex pages.

### Mobile Testing Breakpoints
- **375px** - iPhone SE
- **390px** - iPhone 13
- **768px** - iPad
- **1024px** - Desktop

### Touch Target Standards
- **Minimum:** 44x44px for all interactive elements
- **Buttons:** Full width on mobile where appropriate
- **Forms:** Stack labels above inputs on mobile

### Responsive Patterns

```typescript
// Touch targets
className="min-h-[44px] min-w-[44px]"

// Progressive padding
className="px-4 md:px-6 lg:px-8"

// Responsive text
className="text-sm md:text-base"

// Full width mobile buttons
className="w-full md:w-auto"

// Grid layouts
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### Priority Files for Mobile Audit

**Day 1: Shared Components**
1. `components/shared/Modal.tsx` - Fix mobile width, padding
2. `components/shared/Button.tsx` - Ensure min-height 44px
3. `components/dashboard/*` - Card responsive layouts

**Day 2-3: Feature Pages**
- Test each of 8 feature pages at all breakpoints
- Fix grid layouts → Single column on mobile
- Reduce font sizes and spacing on mobile
- Ensure no horizontal scroll

**Day 4: Dashboard**
- Stack cards vertically on mobile
- Reduce card padding on small screens
- Test scroll performance with 8+ cards

**Day 5: Testing & Polish**
- Test on actual device or Chrome DevTools
- Fix overflow issues
- Verify all CTAs are reachable

---

## Accessibility Improvements

### WCAG 2.1 Level AA Compliance

### Keyboard Navigation
```typescript
// Escape key handler for modals
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [onClose]);

// Focus trap in modals
const firstFocusableElement = modalRef.current?.querySelector('button, input, textarea');
firstFocusableElement?.focus();
```

### ARIA Labels
```typescript
// Icon-only buttons
<button aria-label="Delete task">
  <Trash className="w-5 h-5" />
</button>

// Form inputs
<label htmlFor="task-title">Title</label>
<input id="task-title" aria-required="true" />

// Status indicators
<div role="status" aria-live="polite">
  Task created successfully
</div>
```

### Focus Visible States
```typescript
// Tailwind config
theme: {
  extend: {
    ringColor: {
      DEFAULT: '#7c3aed', // Purple-600
    }
  }
}

// All interactive elements
className="focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
```

### Accessibility Checklist
- [ ] All images have alt text
- [ ] All buttons have aria-labels or visible text
- [ ] Forms have labels linked to inputs
- [ ] Skip to main content link
- [ ] Focus visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Enter, Space, Esc)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Screen reader tested (macOS VoiceOver or NVDA)

---

## Implementation Timeline

### Week 1: Mobile + Accessibility Foundation
**Days 1-2:** Mobile - Shared components + Dashboard
**Days 3-4:** Mobile - All 8 feature pages
**Day 5:** Accessibility - Keyboard navigation + ARIA labels

### Week 2: Accessibility + Onboarding
**Days 1-2:** Accessibility - Focus states, contrast, testing
**Days 3-5:** Onboarding - Welcome, partnership setup, guided flows

---

## Database Schema

### User Progress Tracking
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  partnership_id UUID REFERENCES partnerships(id),

  -- Track completion of guided flows
  first_task_created BOOLEAN DEFAULT FALSE,
  first_event_created BOOLEAN DEFAULT FALSE,
  first_reminder_created BOOLEAN DEFAULT FALSE,
  first_message_sent BOOLEAN DEFAULT FALSE,
  first_shopping_item_added BOOLEAN DEFAULT FALSE,
  first_meal_planned BOOLEAN DEFAULT FALSE,
  first_household_task_created BOOLEAN DEFAULT FALSE,
  first_goal_set BOOLEAN DEFAULT FALSE,

  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT FALSE,
  partnership_setup_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
ON user_progress FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
ON user_progress FOR INSERT
WITH CHECK (user_id = auth.uid());
```

---

## Component Structure

```
components/
├── guided/
│   ├── GuidedTaskCreation.tsx
│   ├── GuidedEventCreation.tsx
│   ├── GuidedReminderCreation.tsx
│   ├── GuidedMessageCreation.tsx
│   ├── GuidedShoppingCreation.tsx
│   ├── GuidedMealCreation.tsx
│   ├── GuidedHouseholdCreation.tsx
│   ├── GuidedGoalCreation.tsx
│   └── StepIndicator.tsx
├── onboarding/
│   ├── WelcomeScreen.tsx
│   ├── PartnershipSetup.tsx
│   └── ProgressIndicator.tsx
└── shared/
    └── (existing components with mobile/a11y improvements)
```

### Trigger Logic
```typescript
// When user visits a feature page for the first time
const { data: userProgress } = await supabase
  .from('user_progress')
  .select('*')
  .eq('user_id', userId)
  .single();

if (!userProgress?.first_task_created && tasks.length === 0) {
  // Show guided "Create Your First Task" modal
  setShowGuidedTaskModal(true);
}

// After successfully creating first item
await supabase
  .from('user_progress')
  .update({ first_task_created: true })
  .eq('user_id', userId);
```

---

## User Flow

### Onboarding Journey
1. **Sign up** → Welcome screen
2. **Welcome** → Partnership setup (invite partner or skip)
3. **Dashboard** → Empty state with feature cards
4. **Click "Tasks"** → Guided task creation appears
5. **Complete first task** → Success + encouragement
6. **Click "Calendar"** → Guided event creation appears
7. **Repeat** for each feature as they explore

### After First Item Created
- Regular creation button appears
- Empty states say "Create another..." instead of "Create your first..."
- Users can always use normal creation flow
- Guided flow never appears again for that feature

---

## Quick Wins (Do These First)

1. **Fix dashboard grid on mobile** (1 hour)
2. **Add "Create your first..." prompts to empty states** (2 hours)
3. **Ensure all buttons are min 44px** (1 hour)
4. **Add aria-labels to icon-only buttons** (2 hours)

---

## Key Metrics to Track Post-Launch

### Mobile
- Bounce rate on mobile vs desktop
- Session duration on mobile
- Feature usage on mobile

### Accessibility
- Keyboard-only user success rate
- Screen reader compatibility reports
- WCAG compliance score

### Onboarding
- Completion rate per step
- Drop-off points
- Time to first meaningful action
- Users who skip vs complete guided flows

---

**Version:** 1.0.0
**Created:** October 9, 2025
**Status:** Implementation in progress
