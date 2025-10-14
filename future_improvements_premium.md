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

*Last Updated: January 14, 2025*
*Status: Phase 1 Completed - All core calendar features implemented*
