# Future Improvements & Premium Features

This document tracks planned enhancements and premium features for the Rowan app that will be implemented in future phases.

---

## 🛒 Shopping List & Meal Planning Integration

### Phase 2: Advanced Shopping List Features

**Feature Name:** Smart Meal Shopping Integration

**Description:**
Advanced shopping list features that enhance the meal planning workflow with intelligent ingredient management, bulk operations, and cost tracking.

**Planned Features:**

#### 1. Retroactive Shopping List Creation from Meal Cards
- **What:** Add "Add to Shopping List" button on existing meal cards
- **Why:** Allows users to create shopping lists for already-planned meals
- **Flow:**
  - Meal card displays button if no shopping list exists
  - Click button → Creates shopping list with recipe ingredients
  - Button changes to "View Shopping List" after creation
- **User Benefit:** Flexibility to add meals to shopping anytime after planning

#### 2. Bulk Calendar Shopping List Generation
- **What:** Create shopping lists from multiple meals in calendar view
- **Why:** Perfect for weekly meal prep and consolidated shopping trips
- **Flow:**
  - User selects date range in calendar (e.g., "This Week")
  - Click "Create Shopping List from Selection"
  - System aggregates all meals in date range
  - Creates single shopping list: `"Weekly Shopping - [Date Range]"`
  - Automatically combines duplicate ingredients with total quantities
- **Example:**
  - Monday: Pasta (needs garlic, tomatoes)
  - Wednesday: Stir Fry (needs garlic, broccoli)
  - Result: Single list with "Garlic (2 cloves)", "Tomatoes (1 can)", "Broccoli (1 head)"
- **User Benefit:** Reduces shopping trips, clear quantity visibility

#### 3. Ingredient Deduplication & Quantity Aggregation
- **What:** Smart combining of duplicate ingredients across multiple meals
- **Why:** Prevents buying duplicate items, shows total needed amounts
- **How:**
  - Detects same ingredient across multiple recipes
  - Sums quantities (e.g., "2 cups flour" + "1 cup flour" = "3 cups flour")
  - Handles different units (converts where possible)
  - Groups by category (produce, dairy, meat, etc.)
- **User Benefit:** More efficient shopping, accurate quantities

#### 4. Shopping List Cost Tracking (Premium)
- **What:** Track estimated costs and actual spending per shopping trip
- **Why:** Budget management for meal planning
- **Features:**
  - Add estimated price per ingredient
  - Calculate total estimated cost
  - Track actual cost after shopping
  - Compare estimated vs actual over time
  - Generate spending reports by category
- **User Benefit:** Better budget control, spending insights

#### 5. Recipe Ingredient Pantry Check (Premium)
- **What:** Track pantry inventory and check what you already have
- **Why:** Avoid buying items you already own
- **Features:**
  - Maintain pantry inventory with expiration dates
  - Mark ingredients as "In Pantry" when creating shopping list
  - Auto-remove pantry items from shopping list
  - Low stock alerts for staple ingredients
  - Expiration date warnings
- **User Benefit:** Reduce food waste, save money

#### 6. Shopping List Templates (Premium)
- **What:** Save recurring shopping lists as templates
- **Why:** Common shopping trips (weekly staples, party prep, etc.)
- **Examples:**
  - "Weekly Basics" (milk, eggs, bread, etc.)
  - "Dinner Party Essentials"
  - "Breakfast Week"
- **User Benefit:** Faster list creation for routine shopping

#### 7. Smart Recipe Suggestions Based on Shopping List
- **What:** Suggest additional recipes using ingredients already on list
- **Why:** Maximize ingredient usage, reduce waste
- **How:**
  - Analyzes current shopping list
  - Finds recipes that use ≥70% of listed ingredients
  - Suggests: "You're already buying chicken & rice - try this recipe too!"
- **User Benefit:** Better meal variety, less food waste

#### 8. Store Aisle Organization (Premium)
- **What:** Organize shopping list by store layout/aisles
- **Why:** More efficient in-store shopping experience
- **Features:**
  - Custom aisle configuration per store
  - Drag-and-drop aisle assignment
  - Auto-sort items by aisle order
  - Multiple store profiles
- **User Benefit:** Faster shopping trips, less backtracking

#### 9. Shared Shopping Mode
- **What:** Real-time collaboration on shopping trips
- **Why:** Partners can split up in store, check off together
- **Features:**
  - Real-time item check-off syncing
  - "Who's getting this?" assignment
  - In-store chat per item
  - Notification when partner completes section
- **User Benefit:** Faster collaborative shopping

#### 10. Shopping History & Repeat Lists
- **What:** Track shopping history and recreate past lists
- **Why:** Quickly recreate successful shopping trips
- **Features:**
  - Browse past shopping lists by date
  - "Shop Again" button to recreate list
  - Track frequency of purchased items
  - Suggest items you buy regularly
- **User Benefit:** Faster list creation, pattern recognition

---

## 📊 Implementation Priority

| Feature | Priority | Effort | Impact | Premium? |
|---------|----------|--------|--------|----------|
| Retroactive Shopping List Creation | High | Low | High | No |
| Bulk Calendar Shopping | Medium | Medium | High | No |
| Ingredient Deduplication | Medium | High | High | No |
| Cost Tracking | Low | Medium | Medium | Yes |
| Pantry Check | Low | High | High | Yes |
| Shopping Templates | Low | Low | Medium | Yes |
| Recipe Suggestions | Low | High | Medium | Yes |
| Store Aisle Organization | Low | Medium | Low | Yes |
| Shared Shopping Mode | Low | High | High | Yes |
| Shopping History | Low | Low | Medium | Yes |

---

## 🎯 Phase 2 Rollout Plan

**Q1 2026: Core Features**
- Retroactive shopping list creation from meal cards
- Bulk calendar shopping list generation
- Basic ingredient deduplication

**Q2 2026: Premium Launch**
- Cost tracking
- Pantry inventory management
- Shopping templates

**Q3 2026: Collaboration Features**
- Shared shopping mode
- Real-time syncing enhancements

**Q4 2026: Intelligence Features**
- Recipe suggestions based on shopping list
- Smart pantry alerts
- Store aisle optimization

---

## 💡 Additional Ideas (Brainstorm)

- **Voice Shopping List:** Add items via voice command
- **Barcode Scanner:** Scan items to add to pantry/shopping list
- **Price Comparison:** Compare prices across stores (API integration)
- **Nutrition Aggregation:** Total nutrition facts for planned meals
- **Meal Prep Timer:** Cooking time coordination for multiple recipes
- **Leftover Tracking:** Track what's left after cooking, suggest recipes
- **Seasonal Produce Alerts:** Notify when ingredients are in season
- **Grocery Delivery Integration:** Send list directly to Instacart/Amazon Fresh

---

## 📅 Calendar Advanced Features

### Phase 2: Intelligence & Enhanced Interactions

**Feature Name:** Smart Calendar & Advanced UX

**Description:**
Advanced calendar features that leverage AI for intelligent scheduling, provide intuitive drag-and-drop interactions, and enhance mobile experience with natural touch gestures.

**Planned Features:**

#### 1. Smart Scheduling AI (Premium)
- **What:** AI-powered time slot suggestions based on calendar patterns and preferences
- **Why:** Reduce scheduling friction, optimize time usage
- **Technical Implementation:**
  - **Stack:**
    - OpenAI GPT-4 API or Anthropic Claude API for intelligent suggestions
    - TensorFlow.js for client-side pattern analysis (optional)
    - PostgreSQL for storing user scheduling patterns
  - **Database Schema:**
    ```sql
    CREATE TABLE scheduling_patterns (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      pattern_type TEXT, -- 'preferred_time', 'duration', 'frequency'
      category TEXT, -- 'work', 'personal', etc.
      pattern_data JSONB, -- {avg_duration: 60, preferred_hours: [9,10,14]}
      confidence_score FLOAT,
      created_at TIMESTAMP
    );
    ```
  - **Algorithm Flow:**
    1. Analyze past 90 days of events
    2. Extract patterns:
       - Common meeting times by category
       - Typical event durations
       - Preferred days/times
       - Buffer time between events
    3. When creating new event:
       - Query available slots in next 2 weeks
       - Score each slot based on:
         - User's historical preferences (40%)
         - Conflicts/buffer time (30%)
         - Time of day energy patterns (20%)
         - Collaborator availability (10%)
    4. Return top 3 suggestions with reasoning
  - **API Integration:**
    ```typescript
    // lib/services/smart-scheduling-service.ts
    async getSuggestedSlots(eventData: {
      title: string;
      duration: number;
      category: string;
      attendees?: string[];
    }): Promise<SuggestedSlot[]> {
      // 1. Get user patterns
      const patterns = await getUserPatterns(userId);

      // 2. Get available slots
      const availableSlots = await findAvailableSlots(startDate, endDate);

      // 3. Score slots using AI
      const prompt = `Given these scheduling patterns: ${patterns}
        and event details: ${eventData},
        rank these time slots: ${availableSlots}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }]
      });

      return parseAISuggestions(response);
    }
    ```
  - **UI Components:**
    - `SmartScheduler.tsx` - Modal showing AI suggestions
    - Three cards with suggested times + reasoning
    - "Why this time?" tooltip explaining AI logic
- **User Benefit:** Save 5-10 minutes per event scheduling, optimal time placement
- **Estimated Cost:** $0.01-0.05 per suggestion (OpenAI API)

#### 2. Drag & Drop Events
- **What:** Visual event repositioning by dragging between days/times
- **Why:** Faster rescheduling, more intuitive calendar management
- **Technical Implementation:**
  - **Libraries:**
    - `@dnd-kit/core` - Modern drag-and-drop for React
    - `@dnd-kit/sortable` - For sortable lists
    - `@dnd-kit/utilities` - Helper functions
  - **Installation:**
    ```bash
    npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
    ```
  - **Core Logic:**
    ```typescript
    // components/calendar/DraggableEvent.tsx
    import { useDraggable } from '@dnd-kit/core';

    export function DraggableEvent({ event }) {
      const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: event.id,
        data: event
      });

      const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      } : undefined;

      return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
          {/* Event content */}
        </div>
      );
    }

    // components/calendar/DroppableDay.tsx
    import { useDroppable } from '@dnd-kit/core';

    export function DroppableDay({ date }) {
      const { setNodeRef, isOver } = useDroppable({
        id: date.toISOString(),
        data: { date }
      });

      return (
        <div ref={setNodeRef} className={isOver ? 'bg-purple-50' : ''}>
          {/* Day content */}
        </div>
      );
    }

    // Parent component
    import { DndContext, DragEndEvent } from '@dnd-kit/core';

    function CalendarWithDnd() {
      const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const eventData = active.data.current;
        const newDate = over.data.current.date;

        // Update event time
        await calendarService.updateEvent(eventData.id, {
          start_time: calculateNewTime(eventData, newDate)
        });
      };

      return (
        <DndContext onDragEnd={handleDragEnd}>
          {/* Calendar with draggable events and droppable days */}
        </DndContext>
      );
    }
    ```
  - **Features to Implement:**
    - Drag event cards between days in month view
    - Drag up/down in day/week view to change time
    - Visual feedback: ghost preview, drop zone highlight
    - Snap to 15-minute increments
    - Conflict detection: red highlight if overlapping
    - Undo button appears after drop
  - **Optimizations:**
    - Optimistic UI updates (update immediately, sync in background)
    - Debounced API calls on rapid drags
    - Pointer capture for smooth mobile drag
- **User Benefit:** 80% faster event rescheduling vs. edit modal
- **Complexity:** Medium-High (3-5 days implementation)

#### 3. Pinch to Zoom (Mobile Enhancement)
- **What:** Pinch gesture to zoom calendar views (month → week → day)
- **Why:** Natural mobile interaction for time scale changes
- **Technical Implementation:**
  - **Already Installed:** `@use-gesture/react` (installed for swipe)
  - **Hook Extension:**
    ```typescript
    // lib/hooks/useCalendarGestures.ts
    import { useGesture } from '@use-gesture/react';

    export function useCalendarGestures(ref, handlers) {
      const { onSwipeLeft, onSwipeRight, onPinch } = handlers;

      useGesture(
        {
          onDrag: ({ swipe: [swipeX] }) => {
            if (swipeX === -1) onSwipeLeft?.();
            if (swipeX === 1) onSwipeRight?.();
          },
          onPinch: ({ offset: [scale], first, last }) => {
            if (first || last) return;

            // Zoom in: scale > 1.2 → Switch to more detailed view
            if (scale > 1.2) {
              onPinch?.('zoom-in');
            }
            // Zoom out: scale < 0.8 → Switch to broader view
            else if (scale < 0.8) {
              onPinch?.('zoom-out');
            }
          }
        },
        {
          target: ref,
          drag: { axis: 'x', swipe: { distance: 50 } },
          pinch: { scaleBounds: { min: 0.5, max: 2 } }
        }
      );
    }
    ```
  - **Integration:**
    ```typescript
    // app/(main)/calendar/page.tsx
    useCalendarGestures(calendarContentRef, {
      onSwipeLeft: handleNextPeriod,
      onSwipeRight: handlePrevPeriod,
      onPinch: (direction) => {
        if (direction === 'zoom-in') {
          // Month → Week → Day
          if (viewMode === 'month') setViewMode('week');
          else if (viewMode === 'week') setViewMode('day');
        } else if (direction === 'zoom-out') {
          // Day → Week → Month
          if (viewMode === 'day') setViewMode('week');
          else if (viewMode === 'week') setViewMode('month');
        }
      }
    });
    ```
  - **Visual Feedback:**
    - Scale transform on pinch start
    - Smooth transition between views (300ms)
    - Haptic feedback on iOS (if supported)
- **User Benefit:** Intuitive mobile navigation, faster view switching
- **Complexity:** Low (1-2 days with existing gesture library)

#### 4. Long-Press Context Menus (Mobile Enhancement)
- **What:** Long-press on events/days to show quick action menu
- **Why:** Faster access to common actions without full modal
- **Technical Implementation:**
  - **Library:** `react-native-gesture-handler` (if React Native) or custom hook
  - **Custom Hook Implementation:**
    ```typescript
    // lib/hooks/useLongPress.ts
    export function useLongPress(
      onLongPress: () => void,
      onClick?: () => void,
      { threshold = 500 } = {}
    ) {
      const [longPressTriggered, setLongPressTriggered] = useState(false);
      const timeout = useRef<NodeJS.Timeout>();
      const target = useRef<EventTarget>();

      const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
        target.current = event.target;
        timeout.current = setTimeout(() => {
          onLongPress();
          setLongPressTriggered(true);
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(50);
        }, threshold);
      }, [onLongPress, threshold]);

      const clear = useCallback((event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
        timeout.current && clearTimeout(timeout.current);
        if (shouldTriggerClick && !longPressTriggered && onClick) {
          onClick();
        }
        setLongPressTriggered(false);
      }, [onClick, longPressTriggered]);

      return {
        onMouseDown: start,
        onTouchStart: start,
        onMouseUp: clear,
        onTouchEnd: clear,
        onMouseLeave: (e) => clear(e, false),
      };
    }
    ```
  - **Usage:**
    ```typescript
    // components/calendar/EventCard.tsx
    function EventCard({ event }) {
      const [menuOpen, setMenuOpen] = useState(false);
      const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

      const longPressProps = useLongPress(
        () => {
          setMenuPosition({ x: event.pageX, y: event.pageY });
          setMenuOpen(true);
        },
        () => handleViewDetails(event)
      );

      return (
        <>
          <div {...longPressProps}>
            {/* Event card content */}
          </div>

          {menuOpen && (
            <ContextMenu
              position={menuPosition}
              onClose={() => setMenuOpen(false)}
              actions={[
                { icon: Edit, label: 'Edit', onClick: () => handleEdit(event) },
                { icon: Copy, label: 'Duplicate', onClick: () => handleDuplicate(event) },
                { icon: Trash, label: 'Delete', onClick: () => handleDelete(event) },
                { icon: Share, label: 'Share', onClick: () => handleShare(event) }
              ]}
            />
          )}
        </>
      );
    }
    ```
  - **Context Menu Component:**
    ```typescript
    // components/calendar/ContextMenu.tsx
    function ContextMenu({ position, actions, onClose }) {
      const menuRef = useRef<HTMLDivElement>(null);

      // Close on outside click
      useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(e.target)) {
            onClose();
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

      return (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px]"
          style={{ top: position.y, left: position.x }}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); onClose(); }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <action.icon className="w-5 h-5" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      );
    }
    ```
  - **Actions to Include:**
    - On Event: Edit, Duplicate, Delete, Change Status, Share
    - On Empty Day: Create Event, Create All-Day Event, View Day Details
    - On Week Row: Create Event at Time, Block Time
- **User Benefit:** 50% faster for common actions, reduced taps
- **Complexity:** Medium (2-3 days)

#### 5. Calendar Sync with External Services (Premium)
- **What:** Two-way sync with Google Calendar, Outlook, Apple Calendar
- **Why:** Centralized calendar management, avoid double-booking
- **Technical Implementation:**
  - **APIs:**
    - Google Calendar API (OAuth 2.0)
    - Microsoft Graph API (for Outlook)
    - CalDAV (for Apple Calendar)
  - **Database Schema:**
    ```sql
    CREATE TABLE calendar_integrations (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      provider TEXT, -- 'google', 'outlook', 'apple'
      access_token TEXT ENCRYPTED,
      refresh_token TEXT ENCRYPTED,
      calendar_id TEXT, -- External calendar ID
      sync_direction TEXT, -- 'import', 'export', 'bidirectional'
      last_sync TIMESTAMP,
      sync_enabled BOOLEAN DEFAULT true
    );

    CREATE TABLE synced_events (
      id UUID PRIMARY KEY,
      rowan_event_id UUID REFERENCES events(id),
      external_event_id TEXT,
      integration_id UUID REFERENCES calendar_integrations(id),
      last_synced TIMESTAMP
    );
    ```
  - **Sync Service:**
    ```typescript
    // lib/services/calendar-sync-service.ts
    class CalendarSyncService {
      async syncGoogleCalendar(integrationId: string) {
        const integration = await getIntegration(integrationId);
        const googleEvents = await fetchGoogleEvents(integration);

        // Import: Google → Rowan
        for (const gEvent of googleEvents) {
          const existing = await findSyncedEvent(gEvent.id);
          if (existing) {
            // Update if modified
            if (gEvent.updated > existing.last_synced) {
              await updateRowanEvent(existing.rowan_event_id, gEvent);
            }
          } else {
            // Create new
            await createRowanEvent(gEvent, integrationId);
          }
        }

        // Export: Rowan → Google (if bidirectional)
        if (integration.sync_direction === 'bidirectional') {
          const rowanEvents = await getRowanEvents(integration.user_id);
          for (const rEvent of rowanEvents) {
            await syncToGoogle(rEvent, integration);
          }
        }
      }
    }
    ```
  - **Webhook Support:**
    - Google: Push notifications via Channel API
    - Outlook: Webhooks for change notifications
    - Background job: Sync every 15 minutes as fallback
- **User Benefit:** Single source of truth, no manual copying
- **Complexity:** High (5-7 days + OAuth setup)

#### 6. Recurring Event Exceptions & Editing
- **What:** Edit single instance or all future instances of recurring events
- **Why:** Handle schedule changes without breaking recurrence
- **Technical Implementation:**
  - **Database Schema:**
    ```sql
    CREATE TABLE recurring_event_exceptions (
      id UUID PRIMARY KEY,
      parent_event_id UUID REFERENCES events(id),
      exception_date DATE, -- Which instance was modified
      modified_event_id UUID REFERENCES events(id), -- The modified version
      is_deleted BOOLEAN DEFAULT false, -- Or instance was deleted
      created_at TIMESTAMP
    );
    ```
  - **UI Flow:**
    - User clicks edit on recurring event instance
    - Modal shows 3 options:
      1. "Edit this event" → Create exception
      2. "Edit this and future events" → Update recurrence pattern
      3. "Edit all events" → Update parent event
  - **Backend Logic:**
    ```typescript
    async editRecurringEvent(
      eventId: string,
      changes: Partial<CalendarEvent>,
      editMode: 'single' | 'future' | 'all'
    ) {
      const event = await getEvent(eventId);

      if (editMode === 'single') {
        // Create exception for this instance
        const exception = await createEvent({
          ...event,
          ...changes,
          is_recurring: false,
          recurrence_pattern: null
        });

        await createException(event.id, exception.id, instanceDate);
      }
      else if (editMode === 'future') {
        // End current recurrence at this date
        await updateEvent(event.id, {
          recurrence_end_date: instanceDate
        });

        // Create new recurring event starting from this date
        await createEvent({
          ...event,
          ...changes,
          start_time: instanceDate,
          recurrence_pattern: event.recurrence_pattern
        });
      }
      else if (editMode === 'all') {
        // Update parent event
        await updateEvent(event.id, changes);
      }
    }
    ```
- **User Benefit:** Flexible recurring event management
- **Complexity:** Medium (3-4 days)

#### 7. Time Blocking & Focus Mode
- **What:** Block time for deep work, mark calendar as "busy"
- **Why:** Protect focus time, prevent meeting overload
- **Features:**
  - Quick "Block 2 hours" button
  - Color-coded focus blocks (deep work, admin, break)
  - Auto-decline meeting proposals during focus time
  - Integration with Do Not Disturb mode
  - Analytics: Track focus time vs. meeting time ratio
- **UI:**
  - Dedicated "Focus Block" event type
  - Striped background pattern to distinguish from events
  - One-click extension: "Add another hour"
- **User Benefit:** Better work-life balance, protected deep work time
- **Complexity:** Low-Medium (2-3 days)

#### 8. Weather-Based Event Suggestions
- **What:** AI suggests indoor/outdoor events based on forecast
- **Why:** Better planning around weather conditions
- **Features:**
  - "Outdoor event on Saturday? Forecast shows rain - move to Sunday?"
  - Automatic outdoor event flagging 3 days before
  - Template suggestions: "Perfect weather for picnic this weekend!"
- **Technical Implementation:**
  - Extend existing weather service
  - Add event location analysis (indoor vs outdoor)
  - Cron job: Check forecast 3 days ahead, send notifications
- **User Benefit:** Reduce weather-related cancellations
- **Complexity:** Low (1-2 days, leverages existing weather service)

---

## 📊 Calendar Implementation Priority

| Feature | Priority | Effort | Impact | Premium? | Dependencies |
|---------|----------|--------|--------|----------|--------------|
| Drag & Drop Events | High | High | High | No | @dnd-kit |
| Long-Press Context Menus | High | Medium | High | No | Custom hook |
| Pinch to Zoom | Medium | Low | Medium | No | Existing @use-gesture |
| Recurring Event Exceptions | Medium | Medium | High | No | DB schema update |
| Time Blocking | Medium | Low | Medium | No | None |
| Smart Scheduling AI | Low | Very High | High | Yes | OpenAI/Claude API |
| External Calendar Sync | Low | Very High | Very High | Yes | OAuth setup |
| Weather Event Suggestions | Low | Low | Low | Yes | Existing weather service |

---

## 🎯 Calendar Phase 2 Rollout Plan

**Q1 2026: Enhanced Interactions**
- Drag & drop events (all views)
- Long-press context menus (mobile)
- Pinch to zoom (mobile)
- Time blocking quick actions

**Q2 2026: Recurring Events Advanced**
- Exception handling (edit single/future/all)
- Complex recurrence patterns (nth weekday of month)
- Recurrence preview calendar

**Q3 2026: Premium Intelligence**
- Smart Scheduling AI (GPT-4 powered)
- Weather-based event suggestions
- Analytics dashboard (focus time tracking)

**Q4 2026: Integration & Sync**
- Google Calendar sync
- Outlook Calendar sync
- Apple Calendar sync (CalDAV)
- Cross-platform conflict resolution

---

## 💡 Additional Calendar Ideas (Brainstorm)

- **Meeting Assistant:** Auto-generate meeting agendas from event titles
- **Travel Time Calculator:** Auto-add travel time between events with locations
- **Energy Tracking:** Log energy levels after events, AI suggests optimal scheduling
- **Habit Stacking:** Link events to habit tracking (e.g., "Gym → Always after work meeting")
- **Smart Reminders:** Context-aware reminders (location-based, weather-based)
- **Calendar Analytics:** Heatmap of busiest times, meeting load trends
- **Focus Score:** Gamification - points for protected focus time
- **Shared Calendars:** Family calendar, team calendar with different permissions
- **Calendar Export:** PDF/printable weekly planner, wallpaper calendar
- **Natural Language Event Creation:** "Dinner with Mom next Friday at 7pm"

---

## 🔔 Reminders Advanced Features

### Phase 2: Intelligence, Location & Workflow Automation

**Feature Name:** Smart Reminders with Location & Dependencies

**Description:**
Advanced reminder features that leverage location awareness, workflow automation, and AI to create intelligent, context-aware reminders that trigger at the right time and place.

**Current Status:** Phase 1 Complete (11/12 features)
- ✅ Templates, Categories, Priorities
- ✅ Advanced Recurrence Patterns
- ✅ @Mentions Integration
- ✅ Attachments & Context (Files, URLs, Links)
- ✅ Activity Timeline, Comments, Multi-select
- ⏳ Location-Based, Dependencies, AI (Phase 2)

**Planned Features:**

#### 1. Location-Based Reminders (Feature #8)
- **What:** Trigger reminders when entering/leaving specific locations
- **Why:** Context-aware notifications that fire at the right place
- **Technical Implementation:**
  - **APIs:**
    - Geolocation API (browser native)
    - Google Maps Geocoding API (address → coordinates)
    - Mapbox API (alternative, better pricing)
  - **Installation:**
    ```bash
    npm install @googlemaps/js-api-loader
    # OR
    npm install mapbox-gl @mapbox/mapbox-sdk
    ```
  - **Database Schema:**
    ```sql
    -- Add to reminders table
    ALTER TABLE reminders ADD COLUMN location_trigger JSONB;
    -- Structure: {
    --   enabled: boolean,
    --   type: 'arrive' | 'leave',
    --   address: string,
    --   latitude: number,
    --   longitude: number,
    --   radius_meters: number (default 100m),
    --   last_triggered: timestamp
    -- }

    -- Create location history table for privacy-conscious tracking
    CREATE TABLE location_triggers_history (
      id UUID PRIMARY KEY,
      reminder_id UUID REFERENCES reminders(id),
      triggered_at TIMESTAMP,
      location_lat FLOAT,
      location_lng FLOAT,
      trigger_type TEXT -- 'arrive' | 'leave'
    );

    -- Index for geospatial queries
    CREATE INDEX idx_reminders_location ON reminders
    USING gist ((location_trigger->'latitude'), (location_trigger->'longitude'));
    ```
  - **Core Service:**
    ```typescript
    // lib/services/location-reminders-service.ts
    import { createClient } from '@/lib/supabase/client';

    interface LocationTrigger {
      enabled: boolean;
      type: 'arrive' | 'leave';
      address: string;
      latitude: number;
      longitude: number;
      radius_meters: number;
      last_triggered?: string;
    }

    export const locationRemindersService = {
      /**
       * Geocode address to coordinates using Google Maps API
       */
      async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.results.length === 0) {
          throw new Error('Address not found');
        }

        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      },

      /**
       * Calculate distance between two coordinates (Haversine formula)
       */
      calculateDistance(
        lat1: number, lng1: number,
        lat2: number, lng2: number
      ): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lng2 - lng1) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
      },

      /**
       * Check if user's current location triggers any reminders
       */
      async checkLocationTriggers(
        userId: string,
        currentLat: number,
        currentLng: number
      ): Promise<string[]> {
        const supabase = createClient();

        // Get all active reminders with location triggers
        const { data: reminders } = await supabase
          .from('reminders')
          .select('id, title, location_trigger')
          .eq('status', 'active')
          .not('location_trigger', 'is', null);

        const triggeredReminderIds: string[] = [];

        for (const reminder of reminders || []) {
          const trigger = reminder.location_trigger as LocationTrigger;
          if (!trigger.enabled) continue;

          const distance = this.calculateDistance(
            currentLat, currentLng,
            trigger.latitude, trigger.longitude
          );

          // Check if within trigger radius
          if (distance <= trigger.radius_meters) {
            // Prevent re-triggering within 30 minutes
            const lastTriggered = trigger.last_triggered
              ? new Date(trigger.last_triggered)
              : null;
            const now = new Date();

            if (!lastTriggered || (now.getTime() - lastTriggered.getTime()) > 30 * 60 * 1000) {
              triggeredReminderIds.push(reminder.id);

              // Update last triggered time
              await supabase
                .from('reminders')
                .update({
                  location_trigger: {
                    ...trigger,
                    last_triggered: now.toISOString()
                  }
                })
                .eq('id', reminder.id);

              // Log trigger event
              await supabase
                .from('location_triggers_history')
                .insert({
                  reminder_id: reminder.id,
                  triggered_at: now.toISOString(),
                  location_lat: currentLat,
                  location_lng: currentLng,
                  trigger_type: trigger.type
                });
            }
          }
        }

        return triggeredReminderIds;
      },

      /**
       * Set location trigger on reminder
       */
      async setLocationTrigger(
        reminderId: string,
        trigger: LocationTrigger
      ): Promise<void> {
        const supabase = createClient();

        await supabase
          .from('reminders')
          .update({ location_trigger: trigger })
          .eq('id', reminderId);
      }
    };
    ```
  - **Background Location Tracking:**
    ```typescript
    // lib/hooks/useLocationTracking.ts
    import { useEffect, useRef } from 'react';
    import { locationRemindersService } from '@/lib/services/location-reminders-service';

    export function useLocationTracking(userId: string | undefined) {
      const watchIdRef = useRef<number | null>(null);

      useEffect(() => {
        if (!userId || !('geolocation' in navigator)) return;

        // Request permission
        const startTracking = async () => {
          try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });

            if (permission.state === 'granted' || permission.state === 'prompt') {
              watchIdRef.current = navigator.geolocation.watchPosition(
                async (position) => {
                  const { latitude, longitude } = position.coords;

                  // Check for triggered reminders
                  const triggered = await locationRemindersService.checkLocationTriggers(
                    userId,
                    latitude,
                    longitude
                  );

                  // Send notifications for triggered reminders
                  if (triggered.length > 0) {
                    for (const reminderId of triggered) {
                      // Use Web Notifications API
                      if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('Location Reminder', {
                          body: 'You have a reminder for this location',
                          icon: '/icon.png'
                        });
                      }
                    }
                  }
                },
                (error) => {
                  console.error('Location tracking error:', error);
                },
                {
                  enableHighAccuracy: false, // Battery saving
                  maximumAge: 300000, // 5 minutes
                  timeout: 10000
                }
              );
            }
          } catch (error) {
            console.error('Permission error:', error);
          }
        };

        startTracking();

        return () => {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
        };
      }, [userId]);
    }
    ```
  - **UI Components:**
    ```typescript
    // components/reminders/LocationTriggerPicker.tsx
    'use client';

    import { useState } from 'react';
    import { MapPin, Search } from 'lucide-react';
    import { locationRemindersService } from '@/lib/services/location-reminders-service';

    interface LocationTriggerPickerProps {
      value: LocationTrigger | null;
      onChange: (trigger: LocationTrigger) => void;
    }

    export function LocationTriggerPicker({ value, onChange }: LocationTriggerPickerProps) {
      const [address, setAddress] = useState(value?.address || '');
      const [loading, setLoading] = useState(false);

      const handleGeocode = async () => {
        if (!address.trim()) return;

        setLoading(true);
        try {
          const coords = await locationRemindersService.geocodeAddress(address);

          onChange({
            enabled: true,
            type: 'arrive',
            address: address.trim(),
            latitude: coords.lat,
            longitude: coords.lng,
            radius_meters: 100
          });
        } catch (error) {
          alert('Could not find location. Please try a different address.');
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <MapPin className="w-4 h-4 inline mr-1" />
            Location Trigger
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address (e.g., 123 Main St, City)"
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
            <button
              onClick={handleGeocode}
              disabled={loading}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {value && (
            <div className="space-y-2">
              <select
                value={value.type}
                onChange={(e) => onChange({ ...value, type: e.target.value as 'arrive' | 'leave' })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="arrive">When I arrive</option>
                <option value="leave">When I leave</option>
              </select>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Trigger radius: {value.radius_meters}m
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={value.radius_meters}
                  onChange={(e) => onChange({ ...value, radius_meters: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      );
    }
    ```
  - **Privacy Considerations:**
    - Location tracking opt-in only
    - Clear permission prompts
    - Location data stored locally, only coordinates sent to server
    - 30-minute cooldown to prevent spam
    - User can disable tracking anytime
    - History retention: 30 days max
- **User Benefit:** Never forget tasks when you're at the right place
- **Examples:**
  - "Remind me to buy milk when I'm near the grocery store"
  - "Remind me to water plants when I get home"
  - "Remind me to submit expense report when I leave the office"
- **Complexity:** High (5-7 days + API setup + privacy review)
- **Premium Feature:** Yes

#### 2. Dependencies & Workflows (Feature #9)
- **What:** Chain reminders together with conditional logic and workflows
- **Why:** Automate multi-step processes, prevent premature actions
- **Technical Implementation:**
  - **Database Schema:**
    ```sql
    -- Add dependency support to reminders table
    ALTER TABLE reminders ADD COLUMN depends_on UUID[] DEFAULT '{}';
    ALTER TABLE reminders ADD COLUMN blocks UUID[] DEFAULT '{}';
    ALTER TABLE reminders ADD COLUMN workflow_id UUID;

    -- Create workflows table
    CREATE TABLE reminder_workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_by UUID NOT NULL REFERENCES users(id),
      is_template BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create workflow steps table
    CREATE TABLE workflow_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES reminder_workflows(id) ON DELETE CASCADE,
      reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL,
      depends_on_step INTEGER, -- Previous step number
      auto_trigger BOOLEAN DEFAULT false, -- Auto-create when dependency completes
      delay_hours INTEGER DEFAULT 0, -- Delay after dependency completes
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Create workflow automation rules
    CREATE TABLE workflow_automation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES reminder_workflows(id),
      trigger_event TEXT NOT NULL, -- 'step_complete', 'step_snoozed', 'step_overdue'
      condition JSONB, -- { field: 'status', operator: 'equals', value: 'completed' }
      action TEXT NOT NULL, -- 'create_next_step', 'send_notification', 'update_status'
      action_params JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
    CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, step_order);
    ```
  - **Core Service:**
    ```typescript
    // lib/services/reminder-workflows-service.ts
    import { createClient } from '@/lib/supabase/client';
    import { remindersService } from './reminders-service';

    interface Workflow {
      id: string;
      space_id: string;
      name: string;
      description?: string;
      created_by: string;
      is_template: boolean;
      steps?: WorkflowStep[];
    }

    interface WorkflowStep {
      id: string;
      workflow_id: string;
      reminder_id?: string;
      step_order: number;
      depends_on_step?: number;
      auto_trigger: boolean;
      delay_hours: number;
      reminder_template?: Partial<CreateReminderInput>;
    }

    export const workflowsService = {
      /**
       * Create a new workflow
       */
      async createWorkflow(
        spaceId: string,
        name: string,
        description: string,
        createdBy: string
      ): Promise<Workflow> {
        const supabase = createClient();

        const { data, error } = await supabase
          .from('reminder_workflows')
          .insert({
            space_id: spaceId,
            name,
            description,
            created_by: createdBy
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },

      /**
       * Add step to workflow
       */
      async addWorkflowStep(
        workflowId: string,
        stepOrder: number,
        dependsOnStep: number | null,
        reminderTemplate: Partial<CreateReminderInput>,
        autoTrigger: boolean = false,
        delayHours: number = 0
      ): Promise<WorkflowStep> {
        const supabase = createClient();

        // Store reminder template in step
        const { data, error } = await supabase
          .from('workflow_steps')
          .insert({
            workflow_id: workflowId,
            step_order: stepOrder,
            depends_on_step: dependsOnStep,
            auto_trigger: autoTrigger,
            delay_hours: delayHours,
            reminder_template: reminderTemplate as any
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },

      /**
       * Check dependencies and trigger next steps
       */
      async checkAndTriggerNextSteps(
        reminderId: string,
        userId: string
      ): Promise<void> {
        const supabase = createClient();

        // Get the reminder and its workflow
        const { data: reminder } = await supabase
          .from('reminders')
          .select('workflow_id, status')
          .eq('id', reminderId)
          .single();

        if (!reminder?.workflow_id || reminder.status !== 'completed') return;

        // Get the current step
        const { data: currentStep } = await supabase
          .from('workflow_steps')
          .select('step_order')
          .eq('reminder_id', reminderId)
          .single();

        if (!currentStep) return;

        // Find next steps that depend on this one
        const { data: nextSteps } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('workflow_id', reminder.workflow_id)
          .eq('depends_on_step', currentStep.step_order)
          .eq('auto_trigger', true);

        // Create reminders for next steps
        for (const step of nextSteps || []) {
          const template = step.reminder_template as Partial<CreateReminderInput>;

          // Calculate reminder time with delay
          const reminderTime = new Date();
          reminderTime.setHours(reminderTime.getHours() + step.delay_hours);

          // Create the reminder
          const newReminder = await remindersService.createReminder({
            ...template,
            reminder_time: reminderTime.toISOString(),
            space_id: template.space_id!
          });

          // Link reminder to workflow step
          await supabase
            .from('workflow_steps')
            .update({ reminder_id: newReminder.id })
            .eq('id', step.id);
        }
      },

      /**
       * Get workflow with all steps
       */
      async getWorkflowWithSteps(workflowId: string): Promise<Workflow> {
        const supabase = createClient();

        const { data: workflow } = await supabase
          .from('reminder_workflows')
          .select(`
            *,
            steps:workflow_steps(
              *,
              reminder:reminders(*)
            )
          `)
          .eq('id', workflowId)
          .single();

        return workflow;
      },

      /**
       * Create workflow from template
       */
      async createFromTemplate(
        templateId: string,
        spaceId: string,
        userId: string
      ): Promise<Workflow> {
        const template = await this.getWorkflowWithSteps(templateId);

        // Create new workflow
        const newWorkflow = await this.createWorkflow(
          spaceId,
          template.name,
          template.description || '',
          userId
        );

        // Clone all steps
        for (const step of template.steps || []) {
          await this.addWorkflowStep(
            newWorkflow.id,
            step.step_order,
            step.depends_on_step,
            step.reminder_template || {},
            step.auto_trigger,
            step.delay_hours
          );
        }

        return newWorkflow;
      }
    };
    ```
  - **UI Components:**
    ```typescript
    // components/reminders/WorkflowBuilder.tsx
    'use client';

    import { useState } from 'react';
    import { Plus, GitBranch, Clock } from 'lucide-react';
    import { WorkflowStep } from '@/lib/services/reminder-workflows-service';

    export function WorkflowBuilder() {
      const [steps, setSteps] = useState<WorkflowStep[]>([]);

      const addStep = () => {
        setSteps([
          ...steps,
          {
            id: crypto.randomUUID(),
            step_order: steps.length + 1,
            auto_trigger: true,
            delay_hours: 0,
            reminder_template: {
              title: '',
              priority: 'medium'
            }
          }
        ]);
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Workflow Steps</h3>
            <button
              onClick={addStep}
              className="px-3 py-1.5 bg-pink-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Step
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index > 0 && (
                  <div className="absolute left-6 -top-3 w-0.5 h-3 bg-gray-300 dark:bg-gray-600" />
                )}

                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-700 dark:text-pink-300 font-bold flex-shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={step.reminder_template?.title || ''}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[index].reminder_template = {
                          ...updated[index].reminder_template,
                          title: e.target.value
                        };
                        setSteps(updated);
                      }}
                      placeholder="Step title..."
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={step.auto_trigger}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[index].auto_trigger = e.target.checked;
                            setSteps(updated);
                          }}
                          className="rounded border-gray-300"
                        />
                        <GitBranch className="w-4 h-4" />
                        Auto-trigger
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4" />
                        Delay:
                        <input
                          type="number"
                          value={step.delay_hours}
                          onChange={(e) => {
                            const updated = [...steps];
                            updated[index].delay_hours = parseInt(e.target.value) || 0;
                            setSteps(updated);
                          }}
                          className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                        />
                        hours
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    ```
  - **Workflow Templates:**
    - "Home Move Checklist" (utilities → address change → movers → unpacking)
    - "Project Launch" (planning → development → testing → deployment)
    - "Event Planning" (venue → catering → invites → setup)
    - "Onboarding Process" (paperwork → training → introductions → first project)
  - **Automation Rules:**
    - If step 1 complete → Auto-create step 2 after 24 hours
    - If step snoozed 3 times → Escalate to urgent
    - If step overdue → Notify workflow creator
    - If all steps complete → Mark workflow as done
- **User Benefit:** Streamline complex processes, ensure proper order
- **Complexity:** Very High (7-10 days)
- **Premium Feature:** Yes

#### 3. AI-Powered Smart Reminders (Feature #11)
- **What:** AI suggests optimal reminder times, generates descriptions, auto-categorizes
- **Why:** Reduce cognitive load, intelligent scheduling
- **Technical Implementation:**
  - **APIs:**
    - OpenAI GPT-4 or Anthropic Claude API
    - Local pattern analysis (PostgreSQL analytics)
  - **Database Schema:**
    ```sql
    -- Track user reminder patterns
    CREATE TABLE reminder_patterns (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      pattern_type TEXT, -- 'completion_time', 'category_frequency', 'priority_accuracy'
      pattern_data JSONB,
      confidence_score FLOAT,
      samples_count INTEGER,
      last_updated TIMESTAMPTZ DEFAULT NOW()
    );

    -- AI suggestions history
    CREATE TABLE ai_reminder_suggestions (
      id UUID PRIMARY KEY,
      reminder_id UUID REFERENCES reminders(id),
      suggestion_type TEXT, -- 'time', 'category', 'priority', 'description'
      suggested_value JSONB,
      accepted BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - **AI Service:**
    ```typescript
    // lib/services/ai-reminders-service.ts
    import OpenAI from 'openai';

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    export const aiRemindersService = {
      /**
       * Suggest optimal reminder time based on user patterns
       */
      async suggestReminderTime(
        userId: string,
        reminderTitle: string,
        category: string
      ): Promise<{ time: string; reason: string }[]> {
        // Get user patterns
        const patterns = await getUserPatterns(userId);

        const prompt = `Based on these user patterns: ${JSON.stringify(patterns)}

        Suggest 3 optimal times for this reminder:
        Title: ${reminderTitle}
        Category: ${category}

        Consider:
        - User's typical completion times for this category
        - Day of week patterns
        - Optimal notification times (not late night/early morning)

        Return JSON array: [{ time: "ISO timestamp", reason: "why this time works" }]`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content!).suggestions;
      },

      /**
       * Auto-categorize reminder based on title and description
       */
      async categorizeReminder(
        title: string,
        description?: string
      ): Promise<string> {
        const prompt = `Categorize this reminder into one of: bills, health, work, personal, household

        Title: ${title}
        Description: ${description || 'N/A'}

        Return only the category name.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20
        });

        return response.choices[0].message.content!.trim().toLowerCase();
      },

      /**
       * Generate smart description from brief title
       */
      async expandDescription(title: string): Promise<string> {
        const prompt = `Create a helpful, brief description for this reminder:
        Title: ${title}

        Write 1-2 sentences with actionable details. Be concise and helpful.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100
        });

        return response.choices[0].message.content!.trim();
      },

      /**
       * Analyze reminder patterns and suggest improvements
       */
      async analyzeReminderEffectiveness(userId: string): Promise<{
        insights: string[];
        recommendations: string[];
      }> {
        const supabase = createClient();

        // Get last 90 days of reminders
        const { data: reminders } = await supabase
          .from('reminders')
          .select('*')
          .eq('created_by', userId)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        const stats = {
          total: reminders?.length || 0,
          completed: reminders?.filter(r => r.status === 'completed').length || 0,
          snoozed: reminders?.filter(r => r.status === 'snoozed').length || 0,
          overdue: reminders?.filter(r => {
            return r.reminder_time && new Date(r.reminder_time) < new Date() && r.status === 'active';
          }).length || 0,
          by_category: {} as Record<string, number>
        };

        const prompt = `Analyze these reminder statistics and provide insights:
        ${JSON.stringify(stats)}

        Provide:
        1. 3 key insights about reminder usage patterns
        2. 3 actionable recommendations to improve reminder effectiveness

        Format as JSON: { insights: string[], recommendations: string[] }`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content!);
      }
    };
    ```
  - **UI Integration:**
    - "✨ Smart Suggest" button in reminder creation modal
    - Auto-categorization on blur of title field
    - AI description preview with "Use this" button
    - Analytics dashboard showing AI insights
- **Features:**
  - Smart time suggestions based on completion patterns
  - Auto-categorization from title/description
  - Description generation from brief titles
  - Priority prediction based on keywords
  - Effectiveness analytics and recommendations
  - Natural language parsing ("Remind me to call mom tomorrow at 3pm")
- **User Benefit:** Faster reminder creation, smarter scheduling, actionable insights
- **Complexity:** Very High (7-10 days + API costs)
- **Estimated Cost:** $0.02-0.10 per suggestion (OpenAI GPT-4)
- **Premium Feature:** Yes

#### 4. Recurring Reminder Exceptions
- **What:** Edit single instance of recurring reminder without breaking pattern
- **Why:** Handle schedule changes flexibly
- **Implementation:** Similar to calendar recurring exceptions (see Calendar section)
- **Complexity:** Medium (3-4 days)

#### 5. Reminder Analytics Dashboard (Premium)
- **What:** Insights into reminder patterns, completion rates, effectiveness
- **Features:**
  - Completion rate by category
  - Average time to completion
  - Most snoozed reminders (identify problematic tasks)
  - Peak reminder times heatmap
  - Trend analysis over time
  - AI-generated insights
- **Complexity:** Medium (3-5 days)
- **Premium Feature:** Yes

---

## 📊 Reminders Implementation Priority

| Feature | Priority | Effort | Impact | Premium? | Dependencies |
|---------|----------|--------|--------|----------|--------------|
| Location-Based Reminders | Medium | Very High | High | Yes | Google Maps API, Geolocation |
| Dependencies & Workflows | Low | Very High | Very High | Yes | Complex DB schema |
| AI Smart Suggestions | Low | Very High | High | Yes | OpenAI/Claude API |
| Recurring Exceptions | Medium | Medium | Medium | No | DB schema update |
| Analytics Dashboard | Low | Medium | Medium | Yes | Data aggregation |

---

## 🎯 Reminders Phase 2 Rollout Plan

**Q1 2026: Mobile & Location**
- Location-based reminders
- Geofencing setup and testing
- Privacy controls and permissions
- Mobile notification improvements

**Q2 2026: Workflows & Automation**
- Dependencies & workflow system
- Workflow templates
- Auto-triggering and delays
- Workflow analytics

**Q3 2026: AI Intelligence**
- Smart time suggestions (GPT-4)
- Auto-categorization
- Description generation
- Natural language parsing

**Q4 2026: Analytics & Optimization**
- Reminder effectiveness dashboard
- AI-powered insights
- Pattern recognition
- Optimization recommendations

---

## 💡 Additional Reminders Ideas (Brainstorm)

- **Voice Reminders:** Create reminders via voice command
- **Email to Reminder:** Forward emails to create reminders
- **Smart Home Integration:** Trigger reminders via Alexa/Google Home
- **Reminder Sharing:** Send reminders to other space members
- **Reminder Groups:** Bundle related reminders (e.g., "Moving checklist")
- **Follow-up Reminders:** Auto-create follow-up if not completed
- **Reminder Insights Widget:** Dashboard widget showing upcoming/overdue
- **Cross-Feature Smart Links:** "Create task from reminder" with one click
- **Reminder Heatmap:** Visual calendar showing reminder density
- **Habit Tracking Integration:** Convert recurring reminders to habits
- **Weather-Aware Reminders:** Suggest reschedule if outdoor reminder + rain
- **Commute-Aware Timing:** Adjust reminder times based on traffic/commute

---

*Last Updated: January 14, 2025*
*Status: Phase 1 Completed - Core reminders with @mentions and attachments implemented*
