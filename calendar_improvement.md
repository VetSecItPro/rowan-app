# Calendar Feature: Comprehensive Improvement Plan

> **Last Updated:** 2025-10-13
>
> This document outlines a complete enhancement strategy for the Rowan Calendar feature, focusing on collaboration, intuitiveness, and sleekness.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Enhancement Categories](#enhancement-categories)
3. [Detailed Feature Recommendations](#detailed-feature-recommendations)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Complete Task List](#complete-task-list)

---

## Current State Analysis

### What We Have Now

#### Core Functionality
- **Event CRUD Operations**: Full create, read, update, delete with service layer separation
- **Dual View Modes**:
  - Monthly calendar grid with day-by-day event display
  - Filterable list view with status-based filtering
- **Event Properties**:
  - Title, description, start/end time, location
  - Category (Work, Personal, Family, Health, Social)
  - Status (Not Started, In Progress, Completed)
- **Recurring Events**: Basic support for repeated events
- **Search**: Full-text search across event title, description, and location
- **Stats Dashboard**: Today, this week, this month, total active events
- **Guided Onboarding**: First-time user flow with step-by-step event creation
- **Event Modal**: Rich creation experience with emoji picker and file attachment UI

#### Integrations
- **Shopping Lists**: Events can be linked to shopping lists (page.tsx:139-148)
- **Tasks**: Task-to-calendar sync capability (task-calendar-service.ts)
- **User Progress**: Onboarding tracking and guided flow management

#### Technical Architecture
- **Service Layer Pattern**: Clean separation via calendar-service.ts
- **API Routes**: Rate-limited with proper authorization (Upstash Redis)
- **Optimistic UI**: Instant status updates with background sync
- **Security**: RLS policies, space-based access control, input validation
- **Error Tracking**: Sentry integration for production monitoring

### Current File Structure
```
app/
├── (main)/calendar/page.tsx          # Main calendar page
├── api/calendar/route.ts             # GET/POST endpoints
└── api/calendar/[id]/route.ts        # GET/PATCH/DELETE by ID

components/
├── calendar/
│   ├── EventCard.tsx                 # Event display component
│   └── NewEventModal.tsx             # Event creation/edit modal
└── guided/
    └── GuidedEventCreation.tsx       # Onboarding flow

lib/
├── services/
│   ├── calendar-service.ts           # Core calendar operations
│   ├── task-calendar-service.ts      # Task integration
│   └── shopping-integration-service.ts # Shopping integration
└── types.ts                          # TypeScript interfaces
```

---

## Enhancement Categories

### 1. Real-Time Collaboration
Live presence, concurrent editing, comment threads, event proposals

### 2. Intelligent View Modes
Week/day/agenda/timeline views, smart navigation, customization

### 3. Advanced Scheduling
Conflict detection, smart suggestions, timezone support, travel time

### 4. Enhanced Creation Experience
Natural language parsing, quick add, templates, smart defaults

### 5. Powerful Recurring Events
Custom patterns, series management, exceptions

### 6. Seamless Cross-Feature Integration
Tasks, shopping, meals, reminders, messages, unified timeline

### 7. Visual Polish & Modern UX
Animations, glassmorphism, color customization, touch gestures

### 8. Smart Notifications
Location-based, weather-aware, traffic-based, proactive suggestions

### 9. Data Insights & Analytics
Personal analytics, relationship insights, predictive features

### 10. Export, Sync & Sharing
iCal, Google Calendar, external sharing, backup & history

---

## Detailed Feature Recommendations

## 1. Real-Time Collaboration Features

### Live Presence & Activity
**Problem Solved:** Users don't know when their partner is viewing/editing events, leading to conflicts and communication overhead.

**Features:**
- **Active Viewer Indicators**: Show colored avatars of who's currently viewing the calendar
- **Real-time Editing Status**: Display "Sarah is editing Anniversary Dinner..." indicators
- **Live Cursor Tracking**: See partner's cursor during simultaneous event dragging
- **Conflict Notifications**: Toast alerts when multiple users try to edit the same event

**Implementation Details:**
```typescript
// Supabase Realtime Presence
const channel = supabase.channel(`calendar:${spaceId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    // Update active viewers UI
  })
  .on('broadcast', { event: 'event_editing' }, (payload) => {
    // Show "User is editing..." indicator
  });
```

**Database Changes:**
- No new tables needed (uses Supabase Presence API)
- May need `event_locks` table for pessimistic locking if conflicts become common

**User Experience:**
- Avatar cluster in calendar header showing active viewers
- Subtle pulsing indicator on events being edited
- Graceful conflict resolution UI when edits collide

---

### Collaborative Event Planning
**Problem Solved:** Planning events together requires back-and-forth messaging instead of native collaboration.

**Features:**
- **Comment Threads**: Discuss event details directly on the event (like Google Docs)
- **@Mentions**: Tag your partner to notify them about specific points
- **Event Proposals**: Suggest multiple time slots, partner can approve/counter-propose
- **Decision Polls**: "Which restaurant?" with voting options built into the event

**Implementation Details:**
```sql
-- New Tables
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  mentions UUID[], -- Array of mentioned user IDs
  parent_comment_id UUID REFERENCES event_comments(id), -- For threading
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  proposed_by UUID REFERENCES auth.users(id),
  time_slots JSONB, -- Array of proposed date/time options
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'countered')),
  counter_proposal_id UUID REFERENCES event_proposals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_proposal_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES event_proposals(id) ON DELETE CASCADE,
  time_slot_index INTEGER,
  user_id UUID REFERENCES auth.users(id),
  vote TEXT CHECK (vote IN ('available', 'unavailable', 'preferred')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, time_slot_index, user_id)
);
```

**Service Layer:**
```typescript
// lib/services/event-comments-service.ts
export const eventCommentsService = {
  async addComment(eventId: string, content: string, mentions: string[]) {},
  async getComments(eventId: string) {},
  async updateComment(commentId: string, content: string) {},
  async deleteComment(commentId: string) {}
};

// lib/services/event-proposals-service.ts
export const eventProposalsService = {
  async createProposal(eventId: string, timeSlots: TimeSlot[]) {},
  async voteOnProposal(proposalId: string, slotIndex: number, vote: Vote) {},
  async approveProposal(proposalId: string, selectedSlotIndex: number) {},
  async counterPropose(proposalId: string, newTimeSlots: TimeSlot[]) {}
};
```

---

### Shared Event Notes
**Problem Solved:** Event details need to be updated by both partners but current description is static.

**Features:**
- **Real-time Collaborative Notes**: Like Google Docs, both can edit simultaneously
- **Markdown Support**: Rich formatting (headers, lists, bold, italic, links)
- **Checklist Items**: Both partners can check off items as they're completed
- **Attachment Persistence**: Unlike current UI-only implementation, actually save files to storage

**Implementation Details:**
```sql
CREATE TABLE event_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  content TEXT, -- Markdown content
  last_edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_note_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID REFERENCES event_notes(id) ON DELETE CASCADE,
  version INTEGER,
  content TEXT,
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Real-time Sync:**
```typescript
// Broadcast note changes to all viewers
const broadcastNoteChange = (eventId: string, content: string) => {
  channel.send({
    type: 'broadcast',
    event: 'note_update',
    payload: { eventId, content, timestamp: Date.now() }
  });
};

// Operational Transform for conflict resolution
const mergeChanges = (local: string, remote: string, base: string) => {
  // Use diff-match-patch or similar library
};
```

---

## 2. Intelligent View Modes & Navigation

### Additional View Options
**Problem Solved:** Monthly view doesn't show enough detail; list view lacks visual context.

**New Views:**

#### Week View
- 7-day horizontal timeline with hourly slots
- Multi-day events span across columns
- Color-coded by category
- Drag-and-drop to reschedule
- Current time indicator line

**Implementation:**
```typescript
// components/calendar/WeekView.tsx
export function WeekView({ events, currentDate }: WeekViewProps) {
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate)
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="grid grid-cols-8"> {/* 1 for hours + 7 days */}
      <div className="col-span-1">{/* Hour labels */}</div>
      {weekDays.map(day => (
        <div key={day.toString()} className="relative">
          {/* Events for this day */}
          {getEventsForDay(day, events).map(event => (
            <EventBlock event={event} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

#### Day View
- Single day with detailed hourly breakdown (6am - 11pm default, expandable)
- Show event duration visually with height
- Side-by-side events for overlapping times
- All-day events banner at top
- Weather forecast integration

#### Agenda View
- Chronological list of upcoming events
- Grouped by date with expandable sections
- Quick filters: Next 7 days, Next 30 days, Next 90 days
- Show relative time: "Tomorrow at 2pm", "In 3 days"
- Empty state: "Nothing scheduled for the next X days"

#### Timeline View
- Horizontal scroll through time (like Gantt chart)
- Visual event blocks with duration
- Zoom controls: Day, Week, Month, Quarter
- Drag events to reschedule
- See patterns and gaps at a glance

---

### Smart Navigation
**Problem Solved:** Users waste time clicking through months to reach future dates.

**Features:**
- **Jump to Date Picker**: Modal with mini calendar → click date → instant navigation
- **Today Button**: Always-visible, highlighted button to return to current date
- **Keyboard Shortcuts**:
  - `T`: Jump to today
  - `←/→`: Previous/next period
  - `D`: Switch to day view
  - `W`: Switch to week view
  - `M`: Switch to month view
  - `N`: New event
  - `/`: Focus search
  - `Esc`: Close modals
- **Mini Calendar Sidebar**: Always-visible monthly mini-cal for quick navigation
- **Breadcrumb Trail**: "October 2025 > Week 42 > Tuesday" showing current context

**Implementation:**
```typescript
// Hook for keyboard shortcuts
export function useCalendarShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement) return;

      switch(e.key.toLowerCase()) {
        case 't': handlers.jumpToToday(); break;
        case 'arrowleft': handlers.previousPeriod(); break;
        case 'arrowright': handlers.nextPeriod(); break;
        case 'd': handlers.switchToDay(); break;
        case 'w': handlers.switchToWeek(); break;
        case 'm': handlers.switchToMonth(); break;
        case 'n': handlers.newEvent(); break;
        case '/': e.preventDefault(); handlers.focusSearch(); break;
        case 'escape': handlers.closeModals(); break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
}
```

---

### View Customization
**Problem Solved:** Different users have different preferences and needs.

**Features:**
- **Toggle Completed Events**: Hide/show completed events in all views
- **Multi-Category Filter**: Select multiple categories simultaneously (Work + Family)
- **Weekend Visibility**: Show/hide weekends in week view
- **Density Modes**:
  - Compact: More events visible, less spacing
  - Normal: Balanced view
  - Spacious: Large event cards, better for touch
- **Persistent Preferences**: Save view settings per user

**Database:**
```sql
CREATE TABLE user_calendar_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  default_view TEXT DEFAULT 'month', -- month, week, day, agenda, timeline
  show_completed BOOLEAN DEFAULT false,
  show_weekends BOOLEAN DEFAULT true,
  density TEXT DEFAULT 'normal', -- compact, normal, spacious
  visible_categories TEXT[], -- ['work', 'personal', 'family']
  week_start_day INTEGER DEFAULT 0, -- 0 = Sunday
  time_format TEXT DEFAULT '12h', -- 12h or 24h
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Advanced Scheduling Intelligence

### Conflict Detection & Resolution
**Problem Solved:** Users accidentally double-book or schedule overlapping events.

**Features:**
- **Visual Warnings**: Red border/icon on overlapping events
- **Smart Suggestions**: "You have 3 events on Tuesday. Consider moving 'Grocery Shopping' to Wednesday?"
- **Travel Time Calculation**: Warn if insufficient time to travel between locations
  - "Doctor's office is 25 mins away but you have a meeting 15 mins after appointment"
  - Integrate with Google Maps API for real travel times
- **Buffer Time Recommendations**: Suggest 15-30 min gaps between events
  - "Add buffer time before important meetings"

**Implementation:**
```typescript
// lib/services/conflict-detection-service.ts
export const conflictDetectionService = {
  async detectConflicts(spaceId: string, date: Date): Promise<Conflict[]> {
    const events = await calendarService.getEvents(spaceId);
    const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), date));

    const conflicts: Conflict[] = [];

    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const overlap = checkOverlap(dayEvents[i], dayEvents[j]);
        if (overlap) {
          conflicts.push({
            events: [dayEvents[i], dayEvents[j]],
            type: 'overlap',
            severity: calculateSeverity(overlap)
          });
        }

        // Check travel time
        const travelIssue = await checkTravelTime(dayEvents[i], dayEvents[j]);
        if (travelIssue) {
          conflicts.push({
            events: [dayEvents[i], dayEvents[j]],
            type: 'insufficient_travel_time',
            severity: 'high',
            details: travelIssue
          });
        }
      }
    }

    return conflicts;
  },

  async calculateTravelTime(fromLocation: string, toLocation: string): Promise<number> {
    // Integrate with Google Maps Distance Matrix API
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?...`);
    const data = await response.json();
    return data.rows[0].elements[0].duration.value; // seconds
  }
};
```

---

### Smart Scheduling Assistant
**Problem Solved:** Finding time that works for both partners is tedious.

**Features:**

#### Find Time Algorithm
```typescript
interface FindTimeOptions {
  duration: number; // minutes
  dateRange: { start: Date; end: Date };
  preferredTimes?: TimeRange[]; // e.g., weekday evenings
  participants: string[]; // user IDs
  bufferBefore?: number; // minutes
  bufferAfter?: number;
}

async function findOptimalTimeSlots(options: FindTimeOptions): Promise<TimeSlot[]> {
  // 1. Get all events for all participants in date range
  const allEvents = await Promise.all(
    options.participants.map(userId =>
      calendarService.getEventsForUser(userId, options.dateRange)
    )
  );

  // 2. Merge into availability timeline
  const timeline = buildAvailabilityTimeline(allEvents, options.dateRange);

  // 3. Find gaps that fit duration + buffers
  const availableSlots = findGaps(timeline, options.duration);

  // 4. Score slots based on preferences
  const scoredSlots = scoreTimeSlots(availableSlots, {
    preferredTimes: options.preferredTimes,
    workLifeBalance: true, // Prefer personal time outside work hours
    evenDistribution: true // Avoid clustering events
  });

  // 5. Return top 5 suggestions
  return scoredSlots.slice(0, 5);
}
```

#### Recurring Availability Blocks
```sql
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  start_time TIME,
  end_time TIME,
  block_type TEXT, -- 'work', 'sleep', 'busy', 'available'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: "Sarah works Mon-Fri 9am-5pm"
INSERT INTO availability_blocks (user_id, day_of_week, start_time, end_time, block_type)
VALUES
  ('user-uuid', 1, '09:00', '17:00', 'work'),
  ('user-uuid', 2, '09:00', '17:00', 'work'),
  ('user-uuid', 3, '09:00', '17:00', 'work'),
  ('user-uuid', 4, '09:00', '17:00', 'work'),
  ('user-uuid', 5, '09:00', '17:00', 'work');
```

#### Duration Presets
```typescript
const DURATION_PRESETS = [
  { label: '15 min', value: 15, icon: '⚡' },
  { label: '30 min', value: 30, icon: '☕' },
  { label: '1 hour', value: 60, icon: '📅' },
  { label: '2 hours', value: 120, icon: '🎬' },
  { label: 'Half day', value: 240, icon: '🌅' },
  { label: 'Full day', value: 480, icon: '📆' }
];
```

---

### Time Zone Intelligence
**Problem Solved:** Partners in different timezones or traveling need timezone clarity.

**Features:**
- **Per-Event Timezone**: Each event stores its timezone
- **Display in User's Timezone**: Show events in viewer's local time
- **Dual Time Display**: "4pm PST / 7pm EST"
- **Travel Mode**: Temporarily switch entire calendar to destination timezone
- **International Planning**: Create events in any timezone

**Database:**
```sql
-- Add timezone column to events
ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- User timezone preferences
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE users ADD COLUMN travel_timezone TEXT; -- Temporary override
ALTER TABLE users ADD COLUMN travel_mode_until TIMESTAMPTZ; -- Auto-expire travel mode
```

**Implementation:**
```typescript
// lib/utils/timezone-utils.ts
import { formatInTimeZone } from 'date-fns-tz';

export function formatEventTime(event: CalendarEvent, userTimezone: string) {
  const eventTimezone = event.timezone || 'UTC';
  const eventTime = parseISO(event.start_time);

  if (eventTimezone === userTimezone) {
    return formatInTimeZone(eventTime, userTimezone, 'h:mm a');
  }

  // Show dual timezone
  const localTime = formatInTimeZone(eventTime, userTimezone, 'h:mm a zzz');
  const eventLocalTime = formatInTimeZone(eventTime, eventTimezone, 'h:mm a zzz');

  return `${localTime} (${eventLocalTime})`;
}
```

---

## 4. Enhanced Event Creation Experience

### Natural Language Parsing
**Problem Solved:** Creating events requires too many clicks; users think in natural language.

**Features:**
- Parse input like: "Dinner tomorrow at 7pm"
- Auto-extract:
  - Title: "Dinner"
  - Date: tomorrow's date
  - Time: 7:00 PM
  - Duration: auto-suggest 2 hours (based on category)
- Support complex patterns:
  - "Doctor appointment next Tuesday at 2pm for 1 hour"
  - "Anniversary dinner this Saturday at 6:30pm at The Steakhouse"
  - "Weekly team meeting every Monday at 10am"

**Implementation:**
```typescript
// lib/services/natural-language-parser.ts
import chrono from 'chrono-node'; // Date parsing library

export interface ParsedEvent {
  title: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  location?: string;
  category?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

export function parseEventText(input: string): ParsedEvent {
  const result: ParsedEvent = { title: input };

  // Extract dates/times using chrono
  const parsed = chrono.parse(input);
  if (parsed.length > 0) {
    result.startTime = parsed[0].start.date();
    if (parsed[0].end) {
      result.endTime = parsed[0].end.date();
    }

    // Remove date/time from title
    result.title = input.replace(parsed[0].text, '').trim();
  }

  // Extract location (simple pattern: "at Location")
  const locationMatch = input.match(/\s+at\s+([A-Z][a-z\s]+)/i);
  if (locationMatch) {
    result.location = locationMatch[1];
    result.title = result.title.replace(locationMatch[0], '').trim();
  }

  // Extract duration (simple pattern: "for X hours/minutes")
  const durationMatch = input.match(/for\s+(\d+)\s+(hour|minute)s?/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    result.duration = unit === 'hour' ? value * 60 : value;
  }

  // Detect recurring patterns
  const recurringKeywords = ['every', 'weekly', 'daily', 'monthly'];
  if (recurringKeywords.some(kw => input.toLowerCase().includes(kw))) {
    result.isRecurring = true;
    // More sophisticated parsing needed here
  }

  // Predict category from keywords
  result.category = predictCategory(result.title);

  return result;
}

function predictCategory(title: string): string {
  const keywords = {
    work: ['meeting', 'standup', 'review', 'presentation', 'call'],
    health: ['doctor', 'dentist', 'gym', 'workout', 'appointment'],
    family: ['dinner', 'family', 'kids', 'school', 'parents'],
    social: ['party', 'birthday', 'wedding', 'hangout', 'drinks']
  };

  const titleLower = title.toLowerCase();
  for (const [category, terms] of Object.entries(keywords)) {
    if (terms.some(term => titleLower.includes(term))) {
      return category;
    }
  }

  return 'personal';
}
```

---

### Quick Add Methods
**Problem Solved:** Full modal is overkill for simple events.

**Features:**

#### 1. Inline Quick Add
```typescript
// Click empty calendar cell → inline popup (no modal)
<div className="absolute inset-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 z-10">
  <input
    type="text"
    placeholder="Quick add: 'Dinner at 7pm'"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        const parsed = parseEventText(e.currentTarget.value);
        createEventQuick(parsed);
      }
    }}
    autoFocus
  />
</div>
```

#### 2. Drag-to-Create
```typescript
// Mouse down → drag across time/days → release → create event
let dragStart: Date | null = null;
let dragEnd: Date | null = null;

const handleMouseDown = (date: Date) => {
  dragStart = date;
};

const handleMouseMove = (date: Date) => {
  if (dragStart) {
    dragEnd = date;
    // Show preview rectangle
  }
};

const handleMouseUp = () => {
  if (dragStart && dragEnd) {
    openQuickEventPopup({
      startTime: dragStart,
      endTime: dragEnd
    });
  }
  dragStart = null;
  dragEnd = null;
};
```

#### 3. Duplicate Event
```typescript
// Right-click event → "Duplicate" → instant copy with adjusted date
async function duplicateEvent(eventId: string, newDate?: Date) {
  const original = await calendarService.getEventById(eventId);

  const duplicate = {
    ...original,
    id: undefined, // Let DB generate new ID
    title: `${original.title} (Copy)`,
    start_time: newDate
      ? newDate.toISOString()
      : addDays(parseISO(original.start_time), 7).toISOString(), // Default: +7 days
    end_time: original.end_time
      ? addDays(parseISO(original.end_time), 7).toISOString()
      : undefined
  };

  return calendarService.createEvent(duplicate);
}
```

---

### Event Templates Library
**Problem Solved:** Users create similar events repeatedly (Date Night, Doctor Appointment).

**Features:**
- Pre-built templates: Date Night, Doctor Visit, Gym Session, Team Meeting
- Custom templates: Save any event as a template
- Template variables: `{date}`, `{location}`, `{partner_name}`
- One-click create from template

**Database:**
```sql
CREATE TABLE event_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES spaces(id),
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  default_duration INTEGER, -- minutes
  category TEXT,
  is_public BOOLEAN DEFAULT false, -- Public templates available to all
  template_data JSONB, -- Stores default values
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example template data structure:
{
  "title": "Date Night with {partner_name}",
  "category": "family",
  "default_duration": 180,
  "default_location": "TBD",
  "checklist": [
    "Make reservation",
    "Plan outfit",
    "Arrange childcare"
  ]
}
```

**UI Component:**
```typescript
<div className="template-library">
  <h3>Quick Create from Template</h3>
  <div className="grid grid-cols-3 gap-4">
    {templates.map(template => (
      <button
        key={template.id}
        onClick={() => createFromTemplate(template)}
        className="template-card"
      >
        <span className="text-2xl">{template.icon}</span>
        <span className="font-medium">{template.name}</span>
        <span className="text-xs text-gray-500">Used {template.usage_count} times</span>
      </button>
    ))}
  </div>
</div>
```

---

### Smart Defaults & Predictions
**Problem Solved:** Reduce repetitive typing and decision-making.

**Features:**

#### 1. Location Auto-Suggest
```typescript
// Learn from history
async function getSuggestedLocations(title: string): Promise<string[]> {
  // Query past events with similar titles
  const { data } = await supabase
    .from('events')
    .select('location')
    .ilike('title', `%${title}%`)
    .not('location', 'is', null)
    .limit(5);

  // Return most common locations
  const locationCounts = data.reduce((acc, e) => {
    acc[e.location] = (acc[e.location] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([loc]) => loc)
    .slice(0, 3);
}
```

#### 2. Duration Prediction
```typescript
// ML-based duration prediction
interface DurationTraining {
  category: string;
  titleKeywords: string[];
  averageDuration: number;
}

const durationModel: DurationTraining[] = [
  { category: 'work', titleKeywords: ['meeting', 'standup'], averageDuration: 30 },
  { category: 'work', titleKeywords: ['review', 'presentation'], averageDuration: 60 },
  { category: 'health', titleKeywords: ['doctor', 'dentist'], averageDuration: 45 },
  { category: 'family', titleKeywords: ['dinner'], averageDuration: 120 },
  { category: 'social', titleKeywords: ['party', 'birthday'], averageDuration: 180 }
];

function predictDuration(title: string, category: string): number {
  const titleLower = title.toLowerCase();

  // Find matching training data
  const match = durationModel.find(m =>
    m.category === category &&
    m.titleKeywords.some(kw => titleLower.includes(kw))
  );

  return match?.averageDuration || 60; // Default 1 hour
}
```

#### 3. Category Auto-Detection
```typescript
// Already shown in natural language parsing section
// Uses keyword matching and can be enhanced with ML
```

---

## 5. Powerful Recurring Events System

### Advanced Recurrence Patterns
**Problem Solved:** Current recurring events only support basic patterns.

**Features:**

#### Custom Patterns
- "Every 2 weeks on Tuesday and Thursday"
- "Every 1st and 3rd Friday of the month"
- "Every weekday (Mon-Fri)"
- "Every 3 months on the 15th"

**Database:**
```sql
-- Enhanced recurrence_pattern JSONB structure
{
  "frequency": "weekly", // daily, weekly, monthly, yearly
  "interval": 2, // Every 2 weeks
  "days_of_week": [2, 4], // Tuesday=2, Thursday=4
  "days_of_month": [1, 15], // 1st and 15th
  "months": [1, 4, 7, 10], // Jan, Apr, Jul, Oct (quarterly)
  "week_of_month": [1, 3], // 1st and 3rd week
  "end_condition": {
    "type": "after", // "after" (X occurrences), "by" (end date), "never"
    "value": 10 // or "2025-12-31"
  },
  "exclude_dates": ["2025-11-25", "2025-12-25"] // Holidays to skip
}
```

**Implementation:**
```typescript
// lib/services/recurrence-service.ts
export class RecurrenceService {
  generateOccurrences(
    baseEvent: CalendarEvent,
    pattern: RecurrencePattern,
    rangeStart: Date,
    rangeEnd: Date
  ): CalendarEvent[] {
    const occurrences: CalendarEvent[] = [];
    let currentDate = parseISO(baseEvent.start_time);
    let count = 0;

    while (this.shouldContinue(currentDate, rangeEnd, pattern, count)) {
      if (this.matchesPattern(currentDate, pattern) &&
          !pattern.exclude_dates?.includes(format(currentDate, 'yyyy-MM-dd'))) {
        occurrences.push({
          ...baseEvent,
          id: `${baseEvent.id}-${count}`,
          start_time: currentDate.toISOString(),
          end_time: baseEvent.end_time
            ? addMinutes(currentDate, differenceInMinutes(
                parseISO(baseEvent.end_time),
                parseISO(baseEvent.start_time)
              )).toISOString()
            : undefined,
          occurrence_index: count
        });
        count++;
      }

      currentDate = this.getNextDate(currentDate, pattern);
    }

    return occurrences;
  }

  private matchesPattern(date: Date, pattern: RecurrencePattern): boolean {
    switch (pattern.frequency) {
      case 'weekly':
        return pattern.days_of_week?.includes(getDay(date)) ?? false;
      case 'monthly':
        if (pattern.days_of_month) {
          return pattern.days_of_month.includes(getDate(date));
        }
        if (pattern.week_of_month) {
          const weekOfMonth = Math.ceil(getDate(date) / 7);
          return pattern.week_of_month.includes(weekOfMonth) &&
                 pattern.days_of_week?.includes(getDay(date));
        }
        return false;
      case 'yearly':
        return pattern.months?.includes(getMonth(date) + 1) &&
               pattern.days_of_month?.includes(getDate(date));
      default:
        return true;
    }
  }
}
```

---

### Recurrence Management UI
**Problem Solved:** Editing recurring events is confusing.

**Features:**

#### Edit Modal Choice
```typescript
// When editing a recurring event instance
<Modal title="Edit Recurring Event">
  <p>"{event.title}" is part of a recurring series.</p>
  <RadioGroup>
    <Radio value="this">
      Only this event
      <span className="text-gray-500">Changes won't affect other events</span>
    </Radio>
    <Radio value="future">
      This and all future events
      <span className="text-gray-500">Creates a new series starting from this event</span>
    </Radio>
    <Radio value="all">
      All events in the series
      <span className="text-gray-500">Updates all {seriesCount} events</span>
    </Radio>
  </RadioGroup>
</Modal>
```

#### Visual Series Indicators
```typescript
// In calendar view
<div className="event-card recurring">
  <span className="recurring-badge">🔁</span>
  <span className="event-title">{event.title}</span>
  <span className="series-info">Event 5 of 12</span>

  <div className="series-navigation">
    <button onClick={() => goToPreviousOccurrence()}>←</button>
    <button onClick={() => goToNextOccurrence()}>→</button>
  </div>
</div>
```

#### Exception Tracking
```sql
CREATE TABLE recurring_event_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES events(id), -- The "parent" recurring event
  exception_date DATE NOT NULL,
  exception_type TEXT, -- 'deleted', 'modified', 'rescheduled'
  modified_event_id UUID REFERENCES events(id), -- If rescheduled
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Seamless Cross-Feature Integration

### Task Integration
**Problem Solved:** Events and tasks are separate; users need to convert/sync between them.

**Features:**

#### Bidirectional Conversion
```typescript
// Event → Task
async function convertEventToTask(eventId: string): Promise<Task> {
  const event = await calendarService.getEventById(eventId);

  const task = await taskService.createTask({
    space_id: event.space_id,
    title: event.title,
    description: event.description,
    due_date: event.start_time,
    category: event.category,
    priority: 'medium',
    status: 'pending'
  });

  // Link them
  await supabase.from('event_task_links').insert({
    event_id: eventId,
    task_id: task.id,
    sync_completion: true
  });

  return task;
}

// Task → Event
async function convertTaskToEvent(taskId: string): Promise<CalendarEvent> {
  const task = await taskService.getTaskById(taskId);

  const event = await calendarService.createEvent({
    space_id: task.space_id,
    title: task.title,
    description: task.description,
    start_time: task.due_date || addDays(new Date(), 1).toISOString(),
    category: task.category as any,
    is_recurring: false
  });

  await supabase.from('event_task_links').insert({
    event_id: event.id,
    task_id: taskId,
    sync_completion: true
  });

  return event;
}
```

#### Task Deadline Overlay
```typescript
// Show task deadlines on calendar
<CalendarGrid>
  {calendarDays.map(day => (
    <DayCell key={day.toString()} date={day}>
      {/* Regular events */}
      {getEventsForDate(day).map(event => <EventCard event={event} />)}

      {/* Task deadlines */}
      {getTasksForDate(day).map(task => (
        <div className="task-deadline-indicator">
          <CheckSquare className="w-3 h-3" />
          <span className="text-xs">{task.title}</span>
        </div>
      ))}
    </DayCell>
  ))}
</CalendarGrid>
```

---

### Shopping Integration
**Problem Solved:** Shopping trips need calendar events; grocery lists need event context.

**Features:**

#### One-Click Shopping Trip
```typescript
// From event modal
<button onClick={() => createShoppingListForEvent(event)}>
  <ShoppingCart className="w-4 h-4" />
  Create Shopping List
</button>

async function createShoppingListForEvent(event: CalendarEvent) {
  // Create shopping list
  const list = await shoppingService.createList({
    space_id: event.space_id,
    name: `Shopping for ${event.title}`,
    description: `Items needed for event on ${format(parseISO(event.start_time), 'MMM d')}`
  });

  // Link to event
  await shoppingIntegrationService.linkToCalendar(list.id, event.id);

  // Optionally: Add reminder "Shop before event"
  const reminderTime = subDays(parseISO(event.start_time), 1);
  await reminderService.createReminder({
    space_id: event.space_id,
    title: `Shop for ${event.title}`,
    remind_at: reminderTime.toISOString(),
    is_recurring: false
  });
}
```

#### Shopping List Status Badge
```typescript
// On event card
{linkedShoppingList && (
  <div className="shopping-status">
    <ShoppingCart className="w-4 h-4" />
    <span>{linkedShoppingList.title}</span>
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{
          width: `${(linkedShoppingList.purchased_count / linkedShoppingList.total_count) * 100}%`
        }}
      />
    </div>
    <span className="text-xs">
      {linkedShoppingList.purchased_count} / {linkedShoppingList.total_count} purchased
    </span>
  </div>
)}
```

---

### Meal Planning Integration
**Problem Solved:** Meal plans need calendar dates; dinner events need recipes.

**Features:**

#### Link Recipe to Event
```typescript
// In event modal
<div className="meal-planning-section">
  <label>Link Recipe (for dinner events)</label>
  <RecipeSelector
    value={selectedRecipe}
    onChange={(recipe) => {
      setSelectedRecipe(recipe);
      // Auto-generate shopping list from recipe ingredients
    }}
  />

  {selectedRecipe && (
    <button onClick={() => generateShoppingListFromRecipe(selectedRecipe)}>
      Generate Shopping List
    </button>
  )}
</div>
```

#### Auto Grocery List
```typescript
async function generateShoppingListFromRecipe(recipe: Recipe, eventId: string) {
  // Create shopping list
  const list = await shoppingService.createList({
    space_id: recipe.space_id,
    name: `Ingredients for ${recipe.name}`,
    description: `Auto-generated from recipe`
  });

  // Add each ingredient as shopping item
  for (const ingredient of recipe.ingredients) {
    await shoppingService.addItem({
      list_id: list.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      category: categorizeIngredient(ingredient.name)
    });
  }

  // Link to event
  await shoppingIntegrationService.linkToCalendar(list.id, eventId);
}
```

---

### Enhanced Reminders
**Problem Solved:** Single reminder per event isn't enough; need contextual reminders.

**Features:**

#### Multiple Reminders Per Event
```sql
CREATE TABLE event_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  remind_before_minutes INTEGER, -- e.g., 1440 (1 day), 60 (1 hour)
  reminder_type TEXT, -- 'email', 'push', 'sms', 'in_app'
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI:**
```typescript
<div className="reminders-section">
  <label>Reminders</label>
  {reminders.map((reminder, idx) => (
    <div key={idx} className="reminder-row">
      <select value={reminder.minutes}>
        <option value={15}>15 minutes before</option>
        <option value={60}>1 hour before</option>
        <option value={1440}>1 day before</option>
        <option value={10080}>1 week before</option>
      </select>
      <select value={reminder.type}>
        <option value="in_app">In-app notification</option>
        <option value="email">Email</option>
        <option value="push">Push notification</option>
      </select>
      <button onClick={() => removeReminder(idx)}>×</button>
    </div>
  ))}
  <button onClick={addReminder}>+ Add Reminder</button>
</div>
```

---

### Unified Timeline View
**Problem Solved:** Users need to see tasks, events, reminders, meals in one place.

**Features:**

#### Combined View
```typescript
interface TimelineItem {
  id: string;
  type: 'event' | 'task' | 'reminder' | 'meal' | 'chore';
  title: string;
  datetime: Date;
  color: string;
  status?: string;
  icon: React.ReactNode;
}

async function getUnifiedTimeline(
  spaceId: string,
  startDate: Date,
  endDate: Date
): Promise<TimelineItem[]> {
  const [events, tasks, reminders, meals, chores] = await Promise.all([
    calendarService.getEvents(spaceId),
    taskService.getTasks(spaceId),
    reminderService.getReminders(spaceId),
    mealService.getMealPlans(spaceId),
    choreService.getChores(spaceId)
  ]);

  const timeline: TimelineItem[] = [
    ...events.map(e => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      datetime: parseISO(e.start_time),
      color: 'purple',
      icon: <Calendar />
    })),
    ...tasks.filter(t => t.due_date).map(t => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      datetime: parseISO(t.due_date!),
      color: 'blue',
      status: t.status,
      icon: <CheckSquare />
    })),
    // ... similar for reminders, meals, chores
  ];

  return timeline
    .filter(item => isWithinInterval(item.datetime, { start: startDate, end: endDate }))
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}
```

**UI:**
```typescript
<div className="unified-timeline">
  <div className="timeline-filters">
    <Toggle label="Events" checked={showEvents} onChange={setShowEvents} color="purple" />
    <Toggle label="Tasks" checked={showTasks} onChange={setShowTasks} color="blue" />
    <Toggle label="Reminders" checked={showReminders} onChange={setShowReminders} color="pink" />
    <Toggle label="Meals" checked={showMeals} onChange={setShowMeals} color="orange" />
    <Toggle label="Chores" checked={showChores} onChange={setShowChores} color="amber" />
  </div>

  <div className="timeline-content">
    {timelineItems.map(item => (
      <TimelineCard key={`${item.type}-${item.id}`} item={item} />
    ))}
  </div>
</div>
```

---

## 7. Visual Polish & Modern UX

### Glassmorphism Effects
**Implementation:**
```css
/* Modal overlay with frosted glass effect */
.modal-overlay {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.modal-content {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 8px 32px 0 rgba(31, 38, 135, 0.37),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.5);
}

/* Dark mode variant */
.dark .modal-content {
  background: rgba(17, 24, 39, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

### Micro-Animations
**Implementation:**
```typescript
// Status change particle effect
import confetti from 'canvas-confetti';

const handleStatusComplete = (eventId: string) => {
  // Optimistic update
  updateEventStatus(eventId, 'completed');

  // Particle celebration
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#6ee7b7']
  });
};

// Drag shadow trail
<motion.div
  drag
  dragMomentum={false}
  whileDrag={{
    scale: 1.05,
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    zIndex: 100
  }}
  dragElastic={0.1}
  onDragEnd={handleDrop}
>
  <EventCard event={event} />
</motion.div>

// Hover preview
<motion.div
  whileHover={{
    scale: 1.03,
    transition: { duration: 0.2 }
  }}
  whileTap={{ scale: 0.98 }}
>
  <EventCard event={event} />
</motion.div>
```

---

### Custom Color Picker
**Implementation:**
```typescript
// Per-event color customization
<div className="color-picker">
  <label>Event Color</label>
  <div className="color-options">
    {/* Preset colors */}
    {PRESET_COLORS.map(color => (
      <button
        key={color}
        className="color-swatch"
        style={{ backgroundColor: color }}
        onClick={() => setEventColor(color)}
      />
    ))}

    {/* Custom color picker */}
    <Popover>
      <PopoverTrigger>
        <button className="color-swatch custom">
          <Palette className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <HexColorPicker color={customColor} onChange={setCustomColor} />
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </PopoverContent>
    </Popover>
  </div>
</div>

// Store in database
ALTER TABLE events ADD COLUMN custom_color TEXT;

// Apply to event card
<div
  className="event-card"
  style={{
    borderLeft: `4px solid ${event.custom_color || getCategoryColor(event.category)}`
  }}
>
```

---

### Theme Presets
**Implementation:**
```typescript
const THEME_PRESETS = {
  professional: {
    colors: {
      primary: '#1f2937',
      accent: '#3b82f6',
      background: '#f9fafb'
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif'
    }
  },
  cozy: {
    colors: {
      primary: '#92400e',
      accent: '#f59e0b',
      background: '#fef3c7'
    },
    fonts: {
      heading: 'Georgia, serif',
      body: 'Georgia, serif'
    }
  },
  vibrant: {
    colors: {
      primary: '#7c3aed',
      accent: '#ec4899',
      background: '#fdf4ff'
    },
    fonts: {
      heading: 'Poppins, sans-serif',
      body: 'Poppins, sans-serif'
    }
  }
};

// User selects theme
async function applyTheme(userId: string, themeName: string) {
  const theme = THEME_PRESETS[themeName];

  await supabase.from('user_preferences').upsert({
    user_id: userId,
    theme_preset: themeName,
    custom_theme: theme
  });

  // Apply CSS variables
  document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
  document.documentElement.style.setProperty('--color-accent', theme.colors.accent);
  document.documentElement.style.setProperty('--color-background', theme.colors.background);
}
```

---

### Mobile Touch Gestures
**Implementation:**
```typescript
// Swipe to edit/complete
import { useSwipeable } from 'react-swipeable';

const SwipeableEventCard = ({ event, onEdit, onComplete }) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => onEdit(event),
    onSwipedRight: () => onComplete(event),
    trackMouse: true
  });

  return (
    <div {...handlers} className="swipeable-card">
      <div className="swipe-action left">
        <Edit className="w-5 h-5" />
      </div>

      <EventCard event={event} />

      <div className="swipe-action right">
        <Check className="w-5 h-5" />
      </div>
    </div>
  );
};

// Long-press context menu
import { useLongPress } from 'use-long-press';

const LongPressEventCard = ({ event }) => {
  const bind = useLongPress(() => {
    showContextMenu({
      x: event.clientX,
      y: event.clientY,
      actions: [
        { label: 'Edit', onClick: () => onEdit(event) },
        { label: 'Duplicate', onClick: () => onDuplicate(event) },
        { label: 'Delete', onClick: () => onDelete(event) }
      ]
    });
  }, { threshold: 500 });

  return <div {...bind()}><EventCard event={event} /></div>;
};

// Pinch to zoom (calendar grid)
import { usePinch } from '@use-gesture/react';

const PinchableCalendar = () => {
  const [scale, setScale] = useState(1);

  const bind = usePinch(({ offset: [s] }) => {
    setScale(Math.min(Math.max(0.5, s), 2)); // Min 0.5x, max 2x
  });

  return (
    <div {...bind()} style={{ transform: `scale(${scale})` }}>
      <CalendarGrid />
    </div>
  );
};
```

---

## 8. Smart Notifications & Reminders

### Location-Based Reminders
**Implementation:**
```typescript
// Request user location permission
async function requestLocationPermission() {
  if ('geolocation' in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
  throw new Error('Geolocation not supported');
}

// Check if near event location
async function checkProximityReminders() {
  const position = await requestLocationPermission();
  const { latitude, longitude } = position.coords;

  // Get events with locations in next 24 hours
  const upcomingEvents = await calendarService.getEvents(spaceId);
  const eventsWithLocations = upcomingEvents.filter(e =>
    e.location &&
    isWithinInterval(parseISO(e.start_time), {
      start: new Date(),
      end: addHours(new Date(), 24)
    })
  );

  // Geocode event locations and calculate distances
  for (const event of eventsWithLocations) {
    const eventCoords = await geocodeLocation(event.location);
    const distance = calculateDistance(
      { lat: latitude, lng: longitude },
      eventCoords
    );

    // Trigger reminder if within 1 mile
    if (distance < 1.6) { // 1 mile = 1.6 km
      sendNotification({
        title: `You're near ${event.location}`,
        body: `Reminder: ${event.title} at ${format(parseISO(event.start_time), 'h:mm a')}`,
        tag: `proximity-${event.id}`
      });
    }
  }
}

// Run proximity check every 5 minutes when app is active
useEffect(() => {
  const interval = setInterval(checkProximityReminders, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

### Weather-Aware Notifications
**Implementation:**
```typescript
// Check weather for outdoor events
async function checkWeatherForEvents() {
  const upcomingEvents = await calendarService.getEvents(spaceId);
  const outdoorKeywords = ['park', 'outdoor', 'picnic', 'hike', 'beach', 'garden'];

  const outdoorEvents = upcomingEvents.filter(e =>
    outdoorKeywords.some(kw =>
      e.title.toLowerCase().includes(kw) ||
      e.location?.toLowerCase().includes(kw)
    ) &&
    isWithinInterval(parseISO(e.start_time), {
      start: new Date(),
      end: addDays(new Date(), 3)
    })
  );

  for (const event of outdoorEvents) {
    // Get weather forecast
    const weather = await fetchWeather(
      event.location || 'current location',
      parseISO(event.start_time)
    );

    // Warn if poor weather expected
    if (weather.condition === 'rain' || weather.condition === 'storm') {
      sendNotification({
        title: `Weather Alert for ${event.title}`,
        body: `${weather.condition} expected. Consider rescheduling or moving indoors.`,
        actions: [
          { action: 'reschedule', title: 'Reschedule Event' },
          { action: 'dismiss', title: 'Keep as is' }
        ]
      });
    }
  }
}

// Weather API integration
async function fetchWeather(location: string, datetime: Date) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${API_KEY}`
  );
  const data = await response.json();

  // Find forecast closest to event time
  const forecast = data.list.find(f =>
    isSameHour(new Date(f.dt * 1000), datetime)
  );

  return {
    condition: forecast.weather[0].main.toLowerCase(),
    temp: forecast.main.temp,
    description: forecast.weather[0].description
  };
}
```

---

### Traffic-Based Notifications
**Implementation:**
```typescript
// Calculate departure time with traffic
async function calculateDepartureTime(event: CalendarEvent) {
  if (!event.location) return null;

  const userLocation = await getCurrentLocation();

  // Get real-time traffic data
  const trafficData = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${userLocation.lat},${userLocation.lng}&` +
    `destination=${encodeURIComponent(event.location)}&` +
    `departure_time=now&` +
    `traffic_model=best_guess&` +
    `key=${GOOGLE_MAPS_API_KEY}`
  ).then(r => r.json());

  const durationInTraffic = trafficData.routes[0].legs[0].duration_in_traffic.value; // seconds
  const departureTime = subSeconds(parseISO(event.start_time), durationInTraffic);

  return {
    departureTime,
    travelDuration: Math.ceil(durationInTraffic / 60), // minutes
    normalDuration: trafficData.routes[0].legs[0].duration.value / 60
  };
}

// Send "time to leave" notification
async function scheduleTrafficReminder(event: CalendarEvent) {
  const { departureTime, travelDuration, normalDuration } = await calculateDepartureTime(event);

  // Add buffer time (10 minutes)
  const notificationTime = subMinutes(departureTime, 10);

  const trafficDelay = travelDuration - normalDuration;
  const message = trafficDelay > 5
    ? `Heavy traffic! Leave now to arrive on time. (${travelDuration} min drive)`
    : `Time to leave for ${event.title}. (${travelDuration} min drive)`;

  await scheduleNotification({
    time: notificationTime,
    title: event.title,
    body: message,
    tag: `traffic-${event.id}`
  });
}
```

---

### Proactive Suggestions
**Implementation:**
```typescript
// Analyze patterns and make suggestions
async function generateProactiveSuggestions(userId: string, spaceId: string) {
  const events = await calendarService.getEvents(spaceId);
  const suggestions: Suggestion[] = [];

  // 1. Date night reminder
  const familyEvents = events.filter(e => e.category === 'family');
  const lastDateNight = familyEvents
    .filter(e => e.title.toLowerCase().includes('date'))
    .sort((a, b) => parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime())[0];

  if (!lastDateNight || differenceInDays(new Date(), parseISO(lastDateNight.start_time)) > 14) {
    suggestions.push({
      type: 'date_night',
      title: 'Plan a Date Night',
      message: "You haven't scheduled a date night in over 2 weeks. How about this weekend?",
      actions: [
        { label: 'Schedule Date Night', handler: () => createDateNightEvent() }
      ]
    });
  }

  // 2. Anniversary reminder
  const anniversaries = events.filter(e =>
    e.title.toLowerCase().includes('anniversary')
  );
  for (const anniversary of anniversaries) {
    const daysUntil = differenceInDays(parseISO(anniversary.start_time), new Date());
    if (daysUntil === 30) {
      suggestions.push({
        type: 'anniversary_reminder',
        title: 'Anniversary Coming Up',
        message: `Your anniversary is in 30 days. Start planning something special!`,
        actions: [
          { label: 'Plan Anniversary', handler: () => openAnniversaryPlanner(anniversary) }
        ]
      });
    }
  }

  // 3. Free evening suggestion
  const nextWeek = eachDayOfInterval({
    start: addDays(new Date(), 1),
    end: addDays(new Date(), 7)
  });

  for (const day of nextWeek) {
    const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day));
    const eveningEvents = dayEvents.filter(e => {
      const hour = parseISO(e.start_time).getHours();
      return hour >= 17; // After 5pm
    });

    if (eveningEvents.length === 0) {
      suggestions.push({
        type: 'free_evening',
        title: 'Free Evening',
        message: `${format(day, 'EEEE')} evening is open. Want to add something?`,
        actions: [
          { label: 'Add Event', handler: () => createEvent(day) }
        ]
      });
      break; // Only suggest first free evening
    }
  }

  return suggestions;
}

// Show suggestions in UI
<div className="suggestions-panel">
  <h3>Suggestions</h3>
  {suggestions.map(suggestion => (
    <div key={suggestion.type} className="suggestion-card">
      <Lightbulb className="w-5 h-5 text-yellow-500" />
      <div>
        <h4>{suggestion.title}</h4>
        <p>{suggestion.message}</p>
        <div className="actions">
          {suggestion.actions.map(action => (
            <button key={action.label} onClick={action.handler}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## 9. Data Insights & Analytics

### Personal Analytics Dashboard
**Implementation:**
```typescript
// Calculate time spent by category
async function calculateCategoryTimeSpent(
  spaceId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryStats> {
  const events = await calendarService.getEvents(spaceId);

  const relevantEvents = events.filter(e =>
    e.status === 'completed' &&
    isWithinInterval(parseISO(e.start_time), { start: startDate, end: endDate })
  );

  const categoryTotals: Record<string, number> = {};

  for (const event of relevantEvents) {
    const duration = event.end_time
      ? differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
      : 60; // Default 1 hour if no end time

    categoryTotals[event.category] = (categoryTotals[event.category] || 0) + duration;
  }

  return categoryTotals;
}

// Visualize with charts
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

<div className="analytics-dashboard">
  <h2>Your Time (Last 30 Days)</h2>

  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={Object.entries(categoryStats).map(([category, minutes]) => ({
          name: category,
          value: minutes,
          hours: Math.round(minutes / 60)
        }))}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label={({ hours, name }) => `${name}: ${hours}h`}
      >
        {Object.keys(categoryStats).map((category, index) => (
          <Cell key={category} fill={CATEGORY_COLORS[category]} />
        ))}
      </Pie>
      <Legend />
    </PieChart>
  </ResponsiveContainer>

  {/* Work-life balance score */}
  <div className="balance-score">
    <h3>Work-Life Balance</h3>
    <div className="score-visual">
      <div
        className="work-bar"
        style={{ width: `${(categoryStats.work / totalMinutes) * 100}%` }}
      />
      <div
        className="personal-bar"
        style={{ width: `${((categoryStats.personal + categoryStats.family) / totalMinutes) * 100}%` }}
      />
    </div>
    <p className="score-description">
      {getBalanceDescription(categoryStats)}
    </p>
  </div>
</div>

function getBalanceDescription(stats: CategoryStats): string {
  const workPercent = (stats.work / Object.values(stats).reduce((a, b) => a + b, 0)) * 100;

  if (workPercent > 70) return "Work-heavy schedule. Consider more personal time.";
  if (workPercent < 30) return "Great work-life balance!";
  return "Balanced schedule between work and personal life.";
}
```

---

### Relationship Insights
**Implementation:**
```typescript
// Track shared quality time
async function calculateSharedTime(
  spaceId: string,
  startDate: Date,
  endDate: Date
): Promise<RelationshipInsights> {
  const events = await calendarService.getEvents(spaceId);
  const members = await getSpaceMembers(spaceId);

  const sharedEvents = events.filter(e =>
    e.category === 'family' &&
    isWithinInterval(parseISO(e.start_time), { start: startDate, end: endDate })
  );

  const totalSharedTime = sharedEvents.reduce((total, event) => {
    const duration = event.end_time
      ? differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
      : 120; // Default 2 hours
    return total + duration;
  }, 0);

  const avgPerWeek = totalSharedTime / differenceInWeeks(endDate, startDate);

  return {
    totalEvents: sharedEvents.length,
    totalHours: Math.round(totalSharedTime / 60),
    avgHoursPerWeek: Math.round(avgPerWeek / 60),
    mostCommonActivity: getMostCommonActivity(sharedEvents),
    streakDays: calculateActivityStreak(sharedEvents)
  };
}

// Milestone celebrations
async function checkMilestones(spaceId: string) {
  const events = await calendarService.getEvents(spaceId);
  const milestones: Milestone[] = [];

  // 100th event together
  if (events.length === 100) {
    milestones.push({
      type: '100_events',
      title: '100 Events Together! 🎉',
      message: "You've created 100 shared events. That's commitment!",
      celebration: true
    });
  }

  // 1 year anniversary of first event
  const firstEvent = events.sort((a, b) =>
    parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
  )[0];

  if (differenceInDays(new Date(), parseISO(firstEvent.created_at)) === 365) {
    milestones.push({
      type: 'one_year',
      title: 'One Year Using Calendar! 🎂',
      message: `Your first event was "${firstEvent.title}" a year ago today.`,
      celebration: true
    });
  }

  return milestones;
}

// Display insights
<div className="relationship-insights">
  <div className="insight-card">
    <Heart className="w-8 h-8 text-pink-500" />
    <div className="metric">{insights.totalHours}h</div>
    <div className="label">Quality Time This Month</div>
  </div>

  <div className="insight-card">
    <Calendar className="w-8 h-8 text-purple-500" />
    <div className="metric">{insights.totalEvents}</div>
    <div className="label">Shared Events</div>
  </div>

  <div className="insight-card">
    <TrendingUp className="w-8 h-8 text-green-500" />
    <div className="metric">{insights.streakDays} days</div>
    <div className="label">Activity Streak</div>
  </div>

  <div className="insight-full">
    <p>
      Your most common activity: <strong>{insights.mostCommonActivity}</strong>
    </p>
    <p className="text-sm text-gray-600 mt-2">
      You spend an average of {insights.avgHoursPerWeek} hours together per week.
    </p>
  </div>
</div>
```

---

### Predictive Features
**Implementation:**
```typescript
// Forecast busy weeks
async function forecastBusyPeriods(
  spaceId: string,
  weeksAhead: number = 4
): Promise<BusyForecast[]> {
  const events = await calendarService.getEvents(spaceId);
  const forecasts: BusyForecast[] = [];

  for (let i = 0; i < weeksAhead; i++) {
    const weekStart = addWeeks(startOfWeek(new Date()), i);
    const weekEnd = endOfWeek(weekStart);

    const weekEvents = events.filter(e =>
      isWithinInterval(parseISO(e.start_time), { start: weekStart, end: weekEnd })
    );

    const totalHours = weekEvents.reduce((total, e) => {
      const duration = e.end_time
        ? differenceInMinutes(parseISO(e.end_time), parseISO(e.start_time))
        : 60;
      return total + duration / 60;
    }, 0);

    forecasts.push({
      weekOf: weekStart,
      eventCount: weekEvents.length,
      totalHours,
      busyLevel: totalHours > 40 ? 'very-busy' : totalHours > 20 ? 'busy' : 'light',
      suggestion: totalHours > 40
        ? "Consider rescheduling non-essential events"
        : totalHours < 10
        ? "Light week - good time for big projects"
        : "Balanced schedule"
    });
  }

  return forecasts;
}

// Suggest optimal times for conversations
async function findQuietTime(spaceId: string): Promise<Date[]> {
  const events = await calendarService.getEvents(spaceId);
  const nextWeek = eachDayOfInterval({
    start: new Date(),
    end: addDays(new Date(), 7)
  });

  const quietSlots: Date[] = [];

  for (const day of nextWeek) {
    // Check evening slot (7-9pm)
    const eveningStart = setHours(day, 19);
    const eveningEnd = setHours(day, 21);

    const hasEveningEvents = events.some(e =>
      areIntervalsOverlapping(
        { start: parseISO(e.start_time), end: parseISO(e.end_time || e.start_time) },
        { start: eveningStart, end: eveningEnd }
      )
    );

    if (!hasEveningEvents) {
      quietSlots.push(eveningStart);
    }
  }

  return quietSlots.slice(0, 3); // Return top 3 suggestions
}
```

---

## 10. Export, Sync & Sharing

### iCal Export
**Implementation:**
```typescript
// Generate iCal file
import ical from 'ical-generator';

async function exportToICal(spaceId: string): Promise<string> {
  const events = await calendarService.getEvents(spaceId);

  const calendar = ical({ name: 'Rowan Calendar' });

  for (const event of events) {
    calendar.createEvent({
      start: parseISO(event.start_time),
      end: event.end_time ? parseISO(event.end_time) : addHours(parseISO(event.start_time), 1),
      summary: event.title,
      description: event.description,
      location: event.location,
      uid: event.id,
      categories: [{ name: event.category }],
      status: event.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE',
      repeating: event.is_recurring ? parseRecurrenceRule(event.recurrence_pattern) : undefined
    });
  }

  return calendar.toString();
}

// Download handler
const handleExport = async () => {
  const icalData = await exportToICal(currentSpace.id);
  const blob = new Blob([icalData], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `rowan-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  link.click();

  URL.revokeObjectURL(url);
};
```

---

### Google Calendar Sync
**Implementation:**
```typescript
// OAuth flow for Google Calendar
async function connectGoogleCalendar() {
  // Redirect to Google OAuth
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/calendar&` +
    `access_type=offline&` +
    `prompt=consent`;

  window.location.href = authUrl;
}

// After OAuth callback, exchange code for tokens
async function handleGoogleCallback(code: string) {
  const response = await fetch('/api/google-calendar/connect', {
    method: 'POST',
    body: JSON.stringify({ code })
  });

  const { access_token, refresh_token } = await response.json();

  // Store tokens securely
  await supabase.from('external_calendar_connections').insert({
    user_id: user.id,
    provider: 'google',
    access_token,
    refresh_token,
    connected_at: new Date().toISOString()
  });
}

// Two-way sync: Rowan → Google
async function syncToGoogleCalendar(event: CalendarEvent) {
  const connection = await getGoogleConnection(user.id);

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start_time,
          timeZone: event.timezone || 'UTC'
        },
        end: {
          dateTime: event.end_time || addHours(parseISO(event.start_time), 1).toISOString(),
          timeZone: event.timezone || 'UTC'
        }
      })
    }
  );

  const googleEvent = await response.json();

  // Store mapping
  await supabase.from('calendar_sync_map').insert({
    rowan_event_id: event.id,
    google_event_id: googleEvent.id,
    synced_at: new Date().toISOString()
  });
}

// Two-way sync: Google → Rowan (webhook)
app.post('/api/webhooks/google-calendar', async (req, res) => {
  const notification = req.body;

  // Get changed events
  const changes = await fetchGoogleChanges(notification.resourceId);

  for (const change of changes) {
    const mapping = await getSyncMapping(change.id);

    if (mapping) {
      // Update existing Rowan event
      await calendarService.updateEvent(mapping.rowan_event_id, {
        title: change.summary,
        description: change.description,
        start_time: change.start.dateTime,
        end_time: change.end.dateTime
      });
    } else {
      // Create new Rowan event
      await calendarService.createEvent({
        space_id: user.space_id,
        title: change.summary,
        description: change.description,
        start_time: change.start.dateTime,
        end_time: change.end.dateTime
      });
    }
  }

  res.sendStatus(200);
});
```

---

### Shareable Event Links
**Implementation:**
```typescript
// Generate public event link
async function createShareableLink(eventId: string): Promise<string> {
  const token = crypto.randomUUID();

  await supabase.from('event_share_links').insert({
    event_id: eventId,
    token,
    created_at: new Date().toISOString(),
    expires_at: addDays(new Date(), 30).toISOString() // Expire after 30 days
  });

  return `${process.env.NEXT_PUBLIC_APP_URL}/shared/event/${token}`;
}

// Public event view page
// app/shared/event/[token]/page.tsx
export default async function SharedEventPage({ params }: { params: { token: string } }) {
  const { data: shareLink } = await supabase
    .from('event_share_links')
    .select('*, event:events(*)')
    .eq('token', params.token)
    .single();

  if (!shareLink || new Date(shareLink.expires_at) < new Date()) {
    return <div>Link expired or invalid</div>;
  }

  const event = shareLink.event;

  return (
    <div className="shared-event-view">
      <h1>{event.title}</h1>
      <p>{format(parseISO(event.start_time), 'PPPp')}</p>
      {event.location && <p>📍 {event.location}</p>}
      {event.description && <p>{event.description}</p>}

      <button onClick={() => downloadICalEvent(event)}>
        Add to Calendar
      </button>
    </div>
  );
}

// Add to calendar button
function downloadICalEvent(event: CalendarEvent) {
  const icalEvent = ical({ name: 'Event' });
  icalEvent.createEvent({
    start: parseISO(event.start_time),
    end: event.end_time ? parseISO(event.end_time) : addHours(parseISO(event.start_time), 1),
    summary: event.title,
    description: event.description,
    location: event.location
  });

  const blob = new Blob([icalEvent.toString()], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '-')}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

### Backup & History
**Implementation:**
```sql
-- Event audit log
CREATE TABLE event_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed'
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB, -- Before/after values
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION log_event_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO event_audit_log (event_id, action, changed_by, changes)
    VALUES (OLD.id, 'deleted', auth.uid(), row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO event_audit_log (event_id, action, changed_by, changes)
    VALUES (NEW.id, 'updated', auth.uid(), jsonb_build_object(
      'before', row_to_json(OLD),
      'after', row_to_json(NEW)
    ));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO event_audit_log (event_id, action, changed_by, changes)
    VALUES (NEW.id, 'created', auth.uid(), row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER event_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION log_event_changes();

-- Soft delete (30-day retention)
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- Update delete function to soft delete
CREATE OR REPLACE FUNCTION soft_delete_event(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore deleted event
CREATE OR REPLACE FUNCTION restore_event(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permanent delete (after 30 days)
-- Run via cron job
CREATE OR REPLACE FUNCTION purge_old_deleted_events()
RETURNS void AS $$
BEGIN
  DELETE FROM events
  WHERE deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**UI:**
```typescript
// Event history view
<div className="event-history">
  <h3>Change History</h3>
  {history.map(entry => (
    <div key={entry.id} className="history-entry">
      <div className="history-header">
        <UserAvatar userId={entry.changed_by} />
        <span className="action">{entry.action}</span>
        <span className="timestamp">{formatDistance(parseISO(entry.created_at), new Date(), { addSuffix: true })}</span>
      </div>

      {entry.action === 'updated' && (
        <div className="changes">
          {Object.entries(entry.changes.before).map(([key, value]) => {
            const after = entry.changes.after[key];
            if (value !== after) {
              return (
                <div key={key} className="change-item">
                  <span className="field">{key}:</span>
                  <span className="old-value">{String(value)}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{String(after)}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  ))}
</div>

// Restore deleted events
<div className="deleted-events">
  <h3>Recently Deleted (30 days)</h3>
  {deletedEvents.map(event => (
    <div key={event.id} className="deleted-event">
      <span>{event.title}</span>
      <span className="deleted-date">
        Deleted {formatDistance(parseISO(event.deleted_at), new Date(), { addSuffix: true })}
      </span>
      <button onClick={() => restoreEvent(event.id)}>
        Restore
      </button>
    </div>
  ))}
</div>
```

---

## Technical Architecture

### Database Schema Changes

#### New Tables Required
```sql
-- Event attachments (actually save files)
CREATE TABLE event_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event comments
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  mentions UUID[],
  parent_comment_id UUID REFERENCES event_comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event proposals
CREATE TABLE event_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  proposed_by UUID REFERENCES auth.users(id),
  time_slots JSONB,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'countered')),
  counter_proposal_id UUID REFERENCES event_proposals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_proposal_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES event_proposals(id) ON DELETE CASCADE,
  time_slot_index INTEGER,
  user_id UUID REFERENCES auth.users(id),
  vote TEXT CHECK (vote IN ('available', 'unavailable', 'preferred')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, time_slot_index, user_id)
);

-- Collaborative notes
CREATE TABLE event_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  content TEXT,
  last_edited_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event templates
CREATE TABLE event_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES spaces(id),
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  default_duration INTEGER,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  template_data JSONB,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability blocks
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  block_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event reminders
CREATE TABLE event_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  remind_before_minutes INTEGER,
  reminder_type TEXT,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring event exceptions
CREATE TABLE recurring_event_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES events(id),
  exception_date DATE NOT NULL,
  exception_type TEXT,
  modified_event_id UUID REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External calendar connections
CREATE TABLE external_calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT, -- 'google', 'apple', 'outlook'
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ
);

-- Calendar sync mapping
CREATE TABLE calendar_sync_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rowan_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event share links
CREATE TABLE event_share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Event audit log
CREATE TABLE event_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User calendar preferences
CREATE TABLE user_calendar_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  default_view TEXT DEFAULT 'month',
  show_completed BOOLEAN DEFAULT false,
  show_weekends BOOLEAN DEFAULT true,
  density TEXT DEFAULT 'normal',
  visible_categories TEXT[],
  week_start_day INTEGER DEFAULT 0,
  time_format TEXT DEFAULT '12h',
  theme_preset TEXT,
  custom_theme JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Modify Existing Tables
```sql
-- Add fields to events table
ALTER TABLE events ADD COLUMN custom_color TEXT;
ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'UTC';
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
ALTER TABLE events ADD COLUMN template_id UUID REFERENCES event_templates(id);

-- Add fields to users table
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE users ADD COLUMN travel_timezone TEXT;
ALTER TABLE users ADD COLUMN travel_mode_until TIMESTAMPTZ;
```

---

### RLS Policies
```sql
-- Event attachments
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for events in their space"
  ON event_attachments FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments to events in their space"
  ON event_attachments FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Event comments
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on events in their space"
  ON event_comments FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to events in their space"
  ON event_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    event_id IN (
      SELECT e.id FROM events e
      JOIN space_members sm ON sm.space_id = e.space_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
```

---

### Service Layer Architecture
```
lib/services/
├── calendar-service.ts              # Core event CRUD
├── event-comments-service.ts        # Comment operations
├── event-proposals-service.ts       # Proposal workflow
├── event-attachments-service.ts     # File upload/download
├── event-templates-service.ts       # Template management
├── recurrence-service.ts            # Recurring event logic
├── conflict-detection-service.ts    # Overlap detection
├── natural-language-parser.ts       # Parse event text
├── external-calendar-sync-service.ts # Google/Apple/Outlook sync
├── calendar-analytics-service.ts    # Stats and insights
└── notification-service.ts          # Reminder scheduling
```

---

### Real-time Architecture
```typescript
// Centralized real-time hook
export function useCalendarRealtime(spaceId: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [presence, setPresence] = useState<PresenceState>({});

  useEffect(() => {
    const channel = supabase
      .channel(`calendar:${spaceId}`)
      // Event changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `space_id=eq.${spaceId}`
      }, (payload) => {
        handleEventChange(payload);
      })
      // Comment changes
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_comments'
      }, (payload) => {
        handleNewComment(payload);
      })
      // Presence tracking
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresence(state);
      })
      // Broadcast editing status
      .on('broadcast', { event: 'event_editing' }, (payload) => {
        handleEditingBroadcast(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId]);

  return { events, presence };
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Set up infrastructure for advanced features

**Tasks:**
1. Database migrations (attachments, comments, proposals, custom colors)
2. RLS policies for all new tables
3. Service layer updates (file upload, calendar service extensions)
4. Real-time setup (Supabase Realtime channels, presence tracking)
5. Drag-and-drop event rescheduling
6. Week view and Day view components

**Deliverables:**
- Working real-time event updates
- Drag-and-drop functional
- 2 new view modes live
- File attachments actually saved

---

### Phase 2: Collaboration (Weeks 5-8)
**Goal:** Make calendar truly collaborative

**Tasks:**
1. Comment threads on events
2. @mention functionality with notifications
3. Event proposal system (suggest times, vote, approve)
4. Collaborative notes with markdown
5. Live editing indicators
6. Conflict detection for concurrent edits

**Deliverables:**
- Full comment system
- Proposal workflow end-to-end
- Real-time collaboration features
- Conflict warnings

---

### Phase 3: Intelligence (Weeks 9-12)
**Goal:** Add smart features that delight users

**Tasks:**
1. Natural language event parsing
2. Smart scheduling assistant ("Find time" algorithm)
3. Conflict detection and resolution
4. Travel time calculations
5. Location-based reminders
6. Weather integration

**Deliverables:**
- "Dinner tomorrow at 7pm" → auto-creates event
- Find optimal meeting times
- Location/weather reminders
- Conflict warnings with suggestions

---

### Phase 4: Polish (Weeks 13-16)
**Goal:** Professional-grade UX

**Tasks:**
1. Advanced recurring events (custom patterns)
2. Glassmorphism effects and animations
3. Custom color picker per event
4. Theme presets
5. Keyboard shortcuts
6. Timeline view and Agenda view

**Deliverables:**
- Polished visual design
- Full keyboard navigation
- 2 more view modes
- Advanced recurrence UI

---

### Phase 5: Integration (Weeks 17-20)
**Goal:** Connect calendar with rest of app

**Tasks:**
1. Deep task integration (convert, sync, overlay)
2. Shopping list creation from events
3. Meal planning integration
4. Unified timeline view
5. Enhanced reminders (multiple per event)
6. Cross-feature drag-and-drop

**Deliverables:**
- Seamless feature integration
- Unified timeline showing all items
- Rich reminder system

---

### Phase 6: Analytics & Export (Weeks 21-24)
**Goal:** Insights and external connectivity

**Tasks:**
1. Analytics dashboard
2. Relationship insights
3. Predictive suggestions
4. iCal export
5. Google Calendar sync
6. Shareable event links

**Deliverables:**
- Full analytics suite
- External calendar sync working
- Export/import functionality
- Public event sharing

---

### Phase 7: Testing & Docs (Weeks 25-26)
**Goal:** Production readiness

**Tasks:**
1. Comprehensive unit tests
2. Integration tests for real-time
3. E2E tests for critical flows
4. Performance monitoring
5. Documentation
6. Accessibility audit

**Deliverables:**
- 80%+ test coverage
- Performance benchmarks
- Complete documentation
- WCAG 2.1 AA compliance

---

## Complete Task List

### Foundation Phase (40 tasks)

#### Database & Infrastructure (11 tasks)
1. Create database migration for event_attachments table
2. Create database migration for event_comments table
3. Create database migration for event_proposals table
4. Add custom_color and timezone fields to events table
5. Create RLS policies for event_attachments table
6. Create RLS policies for event_comments table
7. Create RLS policies for event_proposals table
8. Add file upload service to handle event attachments
9. Update calendar-service.ts to support attachment operations
10. Create event-comments-service.ts for comment CRUD operations
11. Create event-proposals-service.ts for proposal workflow

#### Real-time Collaboration (7 tasks)
12. Add Supabase Realtime channel subscription to calendar page
13. Implement real-time event updates in calendar view
14. Create presence tracking system for active calendar viewers
15. Add presence avatars UI component to calendar header
16. Implement live editing indicators on events
17. Add conflict detection logic when editing same event
18. Create toast notification system for concurrent edits

#### Drag & Drop (4 tasks)
19. Implement drag-and-drop event rescheduling in calendar grid
20. Add visual feedback for drag operations (shadow, ghost)
21. Implement drop zone validation for valid dates
22. Add undo functionality for drag-and-drop actions

#### New View Modes (6 tasks)
23. Create WeekView component with 7-day timeline
24. Create DayView component with hourly breakdown
25. Create AgendaView component with chronological list
26. Create TimelineView component with horizontal scroll
27. Add view mode toggle buttons for all view types
28. Implement view mode persistence in user preferences

---

### Collaboration Phase (15 tasks)

#### Comment System (4 tasks)
29. Create EventCommentThread component
30. Add comment input with mention suggestions
31. Implement @mention parsing and notification triggers
32. Add comment reply threading functionality

#### Event Proposals (4 tasks)
33. Create EventProposalModal component
34. Add time slot suggestions UI for proposals
35. Implement approve/reject/counter-propose actions
36. Add notification system for proposal responses

#### Collaborative Notes (3 tasks)
37. Create CollaborativeNotesEditor component with markdown
38. Implement real-time note synchronization
39. Add checklist functionality within notes

#### Attachments (4 tasks)
40. Create AttachmentGallery component for event files
41. Implement file upload with progress indicators
42. Add file preview and download functionality
43. Implement attachment security validation and scanning

---

### Intelligence Phase (18 tasks)

#### Conflict Detection (5 tasks)
44. Create conflict detection algorithm for overlapping events
45. Add visual warning indicators for event conflicts
46. Implement smart rescheduling suggestions
47. Add travel time calculation between events with locations
48. Create buffer time recommendation system

#### Smart Scheduling (5 tasks)
49. Implement FindTimeSlot algorithm for optimal scheduling
50. Create recurring availability blocks table and service
51. Add meeting duration preset buttons
52. Implement auto color-coding based on event patterns

#### Timezone Support (3 tasks)
53. Add timezone display and conversion logic
54. Create timezone picker for individual events
55. Implement travel mode with temporary timezone override

#### Natural Language (5 tasks)
56. Create NaturalLanguageParser for quick event creation
57. Add quick event input field with parsing preview
58. Implement click-to-create on empty calendar cells
59. Add inline quick event popup (no modal)
60. Create duplicate event functionality

---

### Polish Phase (32 tasks)

#### Event Templates (3 tasks)
61. Build event templates library system
62. Add event templates UI and selection modal
63. Implement smart location auto-suggest from history

#### Smart Defaults (4 tasks)
64. Create ML model for duration predictions by category
65. Add auto-complete for recurring event titles
66. Implement keyword-based category suggestions

#### Advanced Recurrence (11 tasks)
67. Create advanced recurrence pattern builder UI
68. Implement custom recurrence patterns (every 2 weeks, etc)
69. Add month-relative recurrence rules (last Friday, etc)
70. Implement date exclusions for recurring series
71. Add recurrence end conditions (after X, by date, never)
72. Create seasonal pattern support (summer weekends)
73. Implement edit single vs entire series modal
74. Add visual series relationship indicators
75. Create navigation between recurring occurrences
76. Implement bulk update for future occurrences
77. Add exception tracking for modified instances

#### Visual Effects (6 tasks)
78. Add glassmorphism effects to modal overlays
79. Create particle effects for status changes
80. Implement shadow trail animation for event dragging
81. Add hover preview with scale animation
82. Create custom color picker per event
83. Implement theme presets (Professional, Cozy, Vibrant)

#### Typography & Design (4 tasks)
84. Add gradient background support for special events
85. Implement variable font sizes by event importance
86. Improve text hierarchy in event cards
87. Add smart truncation with expand on hover

#### Mobile Gestures (4 tasks)
88. Implement pinch-to-zoom on mobile calendar
89. Add swipe gestures for edit and complete
90. Create long-press context menus
91. Implement bulk select mode for mass operations

---

### Integration Phase (20 tasks)

#### Task Integration (4 tasks)
92. Create event-to-task conversion functionality
93. Create task-to-event conversion functionality
94. Implement task deadline overlay on calendar
95. Add two-way sync between events and tasks

#### Shopping Integration (3 tasks)
96. Create one-click shopping list creation from events
97. Add shopping list completion status on event cards
98. Implement Shop Before reminders

#### Meal Planning (3 tasks)
99. Create meal plan calendar integration
100. Add recipe linking to dinner events
101. Implement auto grocery list from planned meals

#### Enhanced Reminders (3 tasks)
102. Create multiple reminder options per event
103. Add smart reminder timing with traffic consideration
104. Implement reminder snooze functionality

#### Messages Integration (3 tasks)
105. Create event discussion threads in messages
106. Add quick message from event UI
107. Implement auto-linking of event mentions in messages

#### Unified Timeline (3 tasks)
108. Create UnifiedTimeline component showing all features
109. Add multi-feature filter toggles
110. Implement drag-to-convert between feature types

---

### Analytics & Export Phase (30 tasks)

#### Navigation (10 tasks)
111. Create jump-to-date quick picker
112. Add prominent Today button
113. Implement keyboard shortcuts system
114. Create mini-calendar sidebar for navigation
115. Add breadcrumb trail for current view context
116. Implement multi-category filter selection
117. Add show/hide weekends toggle
118. Create compact vs spacious density modes
119. Implement user preference persistence for views
120. Create animated empty state illustrations

#### Smart Notifications (11 tasks)
121. Create location-based reminder system
122. Add weather API integration for event warnings
123. Implement traffic-based notifications
124. Create customizable notification preferences per event
125. Implement proactive date night suggestions
126. Add anniversary reminder system
127. Create free evening suggestion prompts
128. Implement weekly digest email generator
129. Create Do Not Disturb scheduling system
130. Add automatic status updates during events
131. Implement event-based phone silencing

#### Analytics (9 tasks)
132. Build analytics dashboard for time spent by category
133. Create most common event types visualization
134. Implement busiest days/times heatmap
135. Add work-life balance score calculation
136. Create trends over time charts
137. Implement shared events counter
138. Add quality time tracker
139. Create activity suggestion engine based on patterns
140. Implement milestone celebration triggers

---

### Export & Sync Phase (20 tasks)

#### Calendar Export (5 tasks)
141. Implement iCal export functionality
142. Add Google Calendar two-way sync
143. Create Apple Calendar integration
144. Implement Outlook compatibility
145. Add CSV export for backup

#### Sharing (4 tasks)
146. Create shareable event link generator
147. Add guest calendar links
148. Implement public read-only calendar view
149. Create social media sharing with privacy controls

#### Backup & History (4 tasks)
150. Implement automatic calendar versioning
151. Create event change history log
152. Add restore deleted events functionality
153. Implement audit trail for all calendar actions

#### Predictive Features (7 tasks)
154. Create busy week forecast algorithm
155. Add quiet time identification for conversations
156. Implement recurring conflict detector
157. Create schedule optimization recommendations
158. Add contextual tips system
159. Implement progressive feature disclosure
160. Add success celebrations with confetti

---

### Testing & Documentation Phase (15 tasks)

#### Testing (4 tasks)
161. Write comprehensive unit tests for calendar service
162. Create integration tests for real-time features
163. Add E2E tests for critical user flows
164. Implement performance monitoring for calendar operations

#### Documentation (3 tasks)
165. Create documentation for new calendar features
166. Add inline help tooltips throughout calendar UI
167. Create video tutorials for advanced features

#### Accessibility (1 task)
168. Implement accessibility improvements (ARIA labels, keyboard nav)

#### Additional Polish (7 tasks)
169. Create focus time blocks with break reminders
170. Implement create busy week forecast algorithm
171. Add quiet time identification for conversations
172. Implement recurring conflict detector
173. Create schedule optimization recommendations
174. Add contextual tips system
175. Implement progressive feature disclosure

---

## Summary

This comprehensive plan transforms your calendar from a basic event tracker into a **world-class collaborative scheduling platform**.

**Total Enhancements:** 175 detailed tasks across 10 categories

**Timeline:** 24-26 weeks for full implementation

**Focus Areas:**
1. **Collaboration** (25% of tasks): Real-time features, comments, proposals
2. **Intelligence** (20% of tasks): Smart scheduling, conflict detection, NLP
3. **Polish** (20% of tasks): Animations, themes, mobile gestures
4. **Integration** (15% of tasks): Tasks, shopping, meals, messages
5. **Analytics** (10% of tasks): Insights, predictions, relationship tracking
6. **Infrastructure** (10% of tasks): Database, services, real-time

**Recommended Starting Point:**
Phase 1 (Foundation) → Weeks 1-4
- Tasks 1-22
- Immediate impact: Real-time updates, drag-and-drop, new views

The beauty of this plan is that **each phase delivers value independently**. You can ship after any phase and have a significantly improved product.

---

**Ready to build the best calendar experience for couples? Let's start with Phase 1! 🚀**
