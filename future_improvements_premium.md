# Future Improvements & Premium Features

This document tracks planned enhancements and premium features for the Rowan app that will be implemented in future phases.

---

## 🚨 Current Feature Gaps (Budget & Projects)

This section documents the most critical missing features in the Budget & Projects system that users are currently experiencing. Each gap is linked to its planned solution in the implementation roadmap.

### High Priority Missing Features

#### 1. ❌ No Receipt Scanning or Automation
- **Current Gap:** Users must manually enter all expense data, including amounts, categories, and descriptions
- **User Impact:**
  - Time-consuming data entry for every expense
  - High risk of data entry errors and forgotten expenses
  - No digital record of physical receipts
  - Missing merchant/location/tax information from receipts
- **Planned Solution:** **Phase 2 - AI-Powered Receipt Scanning (#1 in budget-improvement.md)**
  - OCR integration with Google Vision API, AWS Textract, or Tesseract
  - Mobile camera integration for instant receipt capture
  - ML-powered auto-categorization of expenses
  - Supabase Storage for receipt image archival
  - Advanced search by merchant, date, or amount
- **Implementation Timeline:** Months 3-4 (Phase 2)
- **Business Value:** Reduces expense entry time by ~80%, increases accuracy, enables receipt audit trail

#### 2. ❌ Limited Spending Insights
- **Current Gap:** Basic budget tracking exists, but no analytics, trends, or pattern recognition
- **User Impact:**
  - No visibility into spending patterns over time
  - Can't identify where money is actually going
  - No comparison of actual vs budgeted spending
  - Missing alerts when approaching budget limits
  - No predictive insights or recommendations
- **Planned Solution:** **Phase 1 - Spending Insights (#7 in budget-improvement.md)**
  - Analytics engine processing expense history
  - Data visualization with Chart.js/Recharts
  - Monthly/quarterly/yearly trend analysis
  - Spending vs budget variance reports
  - Category breakdown with percentages
- **Implementation Timeline:** Months 2-3 (Phase 1)
- **Business Value:** Helps users understand spending behavior, identify savings opportunities, make informed financial decisions

#### 3. ❌ No Recurring Expense Detection
- **Current Gap:** Subscriptions and recurring bills must be manually tracked and entered each month
- **User Impact:**
  - Easy to forget recurring payments
  - No visibility into total subscription costs
  - Can't detect duplicate or forgotten subscriptions
  - Missing calendar view of upcoming recurring expenses
  - Manual work to identify patterns in spending
- **Planned Solution:** **Phase 2 - Recurring Expense Intelligence (#3 in budget-improvement.md)**
  - Pattern recognition algorithm detecting recurring transactions
  - Automatic frequency detection (daily/weekly/monthly/annual)
  - Duplicate subscription alert system
  - Calendar view showing all recurring bills with due dates
  - One-click conversion to scheduled auto-entry expenses
- **Implementation Timeline:** Months 4-5 (Phase 2)
- **Business Value:** Reduces forgotten bills, identifies wasteful subscriptions, automates repetitive data entry

#### 4. ❌ Missing Goal Tracking
- **Current Gap:** No way to set financial goals or track progress toward savings targets
- **User Impact:**
  - No motivation or accountability for saving money
  - Can't visualize progress toward financial milestones
  - Missing shared couple goals (vacation fund, house down payment, etc.)
  - No projected completion dates based on current saving rate
  - Can't celebrate financial achievements with partner
- **Planned Solution:** **Phase 3 - Shared Financial Goals (#5 in budget-improvement.md)**
  - Goals database schema with target amounts and deadlines
  - Visual progress tracking with milestone markers
  - Contribution ledger tracking individual deposits
  - Projected completion date calculator
  - Milestone celebration notifications and badges
- **Implementation Timeline:** Months 5-6 (Phase 3)
- **Business Value:** Increases savings motivation, improves couple financial alignment, gamifies financial responsibility

#### 5. ❌ No Multi-Account Support
- **Current Gap:** Only supports manual entry, no integration with bank accounts, credit cards, or investment accounts
- **User Impact:**
  - No automatic transaction syncing from banks
  - Can't see full financial picture (checking, savings, credit cards, loans)
  - Missing net worth calculation across all accounts
  - No debt payoff tracking or projections
  - Complete financial picture requires external spreadsheets
- **Planned Solution:** **Phase 5 - Multi-Account Intelligence (#10 in budget-improvement.md)**
  - Plaid or Yodlee API integration for bank connections
  - Account aggregation engine syncing transactions
  - Net worth dashboard showing total assets and liabilities
  - Debt payoff tracker with interest calculations
  - Investment account balance tracking
- **Implementation Timeline:** Months 8-10 (Phase 5)
- **Business Value:** Provides complete financial visibility, eliminates manual entry, enables true financial planning
- **Note:** Requires PCI DSS compliance, bank-level encryption, audit logging

#### 6. ❌ Limited Collaboration Features
- **Current Gap:** Budget system is shared but lacks collaboration tools for couple communication
- **User Impact:**
  - Can't discuss or comment on specific expenses
  - No @mention system to ask partner about transactions
  - Missing activity log showing who added/edited what
  - No emoji reactions or quick acknowledgment of expenses
  - Difficult to resolve expense disputes or ask clarifying questions
- **Planned Solution:** **Phase 3 - Collaboration Features (#8 Expense Splitting, #13 Collaboration Comments in budget-improvement.md)**
  - Comments table with polymorphic support for any entity
  - @mention system with real-time notifications
  - Activity log and audit trail for all changes
  - Emoji reaction system for quick feedback
  - Expense ownership tracking (shared/yours/mine)
  - Intelligent split calculation with fairness based on income
  - Settlement ledger for "who owes whom" tracking
- **Implementation Timeline:** Months 6-7 (Phase 3)
- **Business Value:** Reduces financial conflicts, improves transparency, enables couple financial communication

---

### How These Gaps Are Being Addressed

All of the above gaps are documented with detailed implementation plans in `budget-improvement.md`. The roadmap is organized into 5 phases:

- **Phase 1 (Months 1-3):** Foundation - Smart alerts, bill management, templates, basic insights
- **Phase 2 (Months 3-5):** Automation - Receipt scanning, recurring expense AI, custom categories
- **Phase 3 (Months 5-7):** Collaboration - Shared goals, expense splitting, comments/mentions
- **Phase 4 (Months 7-9):** Advanced - Project tracking, financial reports, variance analysis
- **Phase 5 (Months 8-12):** Intelligence - Multi-account sync, AI savings suggestions

Each phase includes infrastructure work (cloud services, notifications, analytics) and security enhancements (PCI compliance, encryption, audit logs) to support the planned features.

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

## 🔐 Authentication & OAuth Integration

### Phase 2: Social Login & Enhanced Security

**Feature Name:** OAuth Providers & Email Verification

**Description:**
Streamline user onboarding with social login options (Google, Apple, GitHub) while enhancing security through enforced email verification and granular role-based permissions.

**Planned Features:**

#### 1. OAuth Social Login (Google, Apple, GitHub)
- **What:** One-click sign-up/login with social accounts
- **Why:** Reduce friction, improve conversion rates, eliminate password management
- **Technical Implementation:**
  - **Libraries:**
    - Supabase Auth (built-in OAuth support)
    - No additional dependencies needed
  - **Supabase Configuration:**
    ```typescript
    // supabase/config/auth.ts
    export const authConfig = {
      providers: ['google', 'apple', 'github'],
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    };
    ```
  - **Database Schema:**
    ```sql
    -- Supabase handles this automatically, but track provider info
    ALTER TABLE auth.users ADD COLUMN provider TEXT;
    ALTER TABLE auth.users ADD COLUMN provider_id TEXT;

    -- Track OAuth connections per user
    CREATE TABLE oauth_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, -- 'google', 'apple', 'github'
      provider_user_id TEXT NOT NULL,
      access_token TEXT ENCRYPTED,
      refresh_token TEXT ENCRYPTED,
      scope TEXT[],
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_refreshed TIMESTAMPTZ,
      UNIQUE(user_id, provider)
    );
    ```
  - **Google OAuth Setup:**
    ```typescript
    // app/(auth)/login/page.tsx
    import { createClient } from '@/lib/supabase/client';

    export default function LoginPage() {
      const supabase = createClient();

      const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            scopes: 'email profile'
          }
        });

        if (error) console.error('Google login error:', error);
      };

      return (
        <button onClick={handleGoogleLogin} className="oauth-button">
          <GoogleIcon /> Continue with Google
        </button>
      );
    }
    ```
  - **Apple OAuth Setup:**
    ```typescript
    const handleAppleLogin = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
    };
    ```
  - **GitHub OAuth Setup:**
    ```typescript
    const handleGitHubLogin = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'read:user user:email'
        }
      });
    };
    ```
  - **OAuth Callback Handler:**
    ```typescript
    // app/auth/callback/route.ts
    import { createClient } from '@/lib/supabase/server';
    import { NextResponse } from 'next/server';

    export async function GET(request: Request) {
      const requestUrl = new URL(request.url);
      const code = requestUrl.searchParams.get('code');

      if (code) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
          // Create user profile if first login
          const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            await supabase.from('users').insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata.full_name || data.user.user_metadata.name,
              avatar_url: data.user.user_metadata.avatar_url || data.user.user_metadata.picture,
              provider: data.user.app_metadata.provider
            });
          }
        }
      }

      return NextResponse.redirect(requestUrl.origin);
    }
    ```
  - **Environment Variables:**
    ```bash
    # .env.local
    # Google OAuth
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    # Apple OAuth
    NEXT_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id
    APPLE_CLIENT_SECRET=your_apple_client_secret

    # GitHub OAuth
    NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret
    ```
  - **Supabase Dashboard Setup:**
    1. Navigate to Authentication → Providers
    2. Enable Google, Apple, GitHub
    3. Add client IDs and secrets
    4. Configure redirect URLs
- **User Benefit:** Faster sign-up (3 seconds vs 3 minutes), no password to remember
- **Conversion Impact:** 60-80% higher sign-up completion rates
- **Complexity:** Low-Medium (2-3 days including testing)
- **Free Feature:** Yes (critical for user acquisition)

#### 2. Email Verification Enforcement
- **What:** Require email verification before full account access
- **Why:** Prevent spam accounts, ensure valid contact info, improve security
- **Technical Implementation:**
  - **Supabase Configuration:**
    ```typescript
    // supabase/config.toml
    [auth.email]
    enable_signup = true
    double_confirm_changes = true
    enable_confirmations = true
    ```
  - **Database Triggers:**
    ```sql
    -- Create function to check email verification
    CREATE OR REPLACE FUNCTION check_email_verified()
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = auth.uid());
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Add RLS policy requiring verified email
    CREATE POLICY "require_verified_email" ON spaces
    FOR ALL
    USING (check_email_verified());
    ```
  - **Middleware Protection:**
    ```typescript
    // middleware.ts
    export async function middleware(req: NextRequest) {
      const supabase = createServerClient(/* ... */);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Check if email is verified
        const emailVerified = session.user.email_confirmed_at !== null;

        if (!emailVerified && !req.nextUrl.pathname.startsWith('/verify-email')) {
          return NextResponse.redirect(new URL('/verify-email', req.url));
        }
      }

      return response;
    }
    ```
  - **Verification UI:**
    ```typescript
    // app/verify-email/page.tsx
    'use client';

    export default function VerifyEmailPage() {
      const [resending, setResending] = useState(false);
      const supabase = createClient();

      const handleResendVerification = async () => {
        setResending(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email) {
          await supabase.auth.resend({
            type: 'signup',
            email: user.email
          });

          alert('Verification email sent! Check your inbox.');
        }
        setResending(false);
      };

      return (
        <div className="verification-page">
          <h1>Verify Your Email</h1>
          <p>We sent a verification link to your email address.</p>
          <button onClick={handleResendVerification} disabled={resending}>
            Resend Verification Email
          </button>
        </div>
      );
    }
    ```
  - **Custom Email Templates:**
    - Update Supabase email templates in dashboard
    - Add branding, clear CTAs, helpful copy
- **User Benefit:** Secure account, prevent unauthorized access
- **Security Impact:** 95% reduction in spam/bot accounts
- **Complexity:** Low (1-2 days)
- **Free Feature:** Yes (essential security)

#### 3. Granular Role-Based Permission UI Enforcement
- **What:** Enforce admin/member/viewer roles with UI restrictions
- **Why:** Proper access control, prevent unauthorized actions, clear user expectations
- **Current State:** Roles exist in DB, not enforced in UI
- **Technical Implementation:**
  - **Permission Hook:**
    ```typescript
    // lib/hooks/usePermissions.ts
    import { useAuth } from '@/lib/contexts/auth-context';

    export function usePermissions() {
      const { currentSpace, user } = useAuth();

      const userRole = currentSpace?.members?.find(
        m => m.user_id === user?.id
      )?.role || 'viewer';

      return {
        isAdmin: userRole === 'admin',
        canEdit: ['admin', 'member'].includes(userRole),
        canView: true,
        canDelete: userRole === 'admin',
        canInvite: userRole === 'admin',
        canManageSettings: userRole === 'admin',
        role: userRole
      };
    }
    ```
  - **Permission Component:**
    ```typescript
    // components/shared/PermissionGate.tsx
    import { usePermissions } from '@/lib/hooks/usePermissions';

    interface PermissionGateProps {
      children: React.ReactNode;
      requires: 'admin' | 'member' | 'viewer';
      fallback?: React.ReactNode;
    }

    export function PermissionGate({ children, requires, fallback }: PermissionGateProps) {
      const { role } = usePermissions();

      const roleHierarchy = { admin: 3, member: 2, viewer: 1 };
      const hasPermission = roleHierarchy[role] >= roleHierarchy[requires];

      if (!hasPermission) {
        return fallback || null;
      }

      return <>{children}</>;
    }
    ```
  - **Usage in Components:**
    ```typescript
    // components/tasks/TaskCard.tsx
    import { PermissionGate } from '@/components/shared/PermissionGate';

    export function TaskCard({ task }) {
      return (
        <div className="task-card">
          <h3>{task.title}</h3>

          <PermissionGate requires="member">
            <button onClick={() => handleEdit(task)}>Edit</button>
          </PermissionGate>

          <PermissionGate requires="admin">
            <button onClick={() => handleDelete(task)}>Delete</button>
          </PermissionGate>
        </div>
      );
    }
    ```
  - **Role-Specific UI:**
    ```typescript
    // app/(main)/settings/members/page.tsx
    export default function MembersPage() {
      const permissions = usePermissions();

      return (
        <div>
          <h1>Team Members</h1>

          {permissions.isAdmin ? (
            <button className="invite-button">
              Invite Member
            </button>
          ) : (
            <p className="text-gray-500">Only admins can invite members</p>
          )}

          {members.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              canRemove={permissions.isAdmin && member.user_id !== user.id}
              canChangeRole={permissions.isAdmin}
            />
          ))}
        </div>
      );
    }
    ```
  - **Permission Tooltips:**
    ```typescript
    import { Tooltip } from '@/components/shared/Tooltip';

    <Tooltip content="Only admins can delete tasks">
      <button disabled={!permissions.canDelete} className="btn-danger">
        Delete
      </button>
    </Tooltip>
    ```
  - **Role Indicators:**
    - Show role badge on user avatars
    - Display role in member lists
    - Add role legend to settings
- **Permissions Matrix:**
  ```
  Action              | Admin | Member | Viewer
  --------------------|-------|--------|-------
  View data           |   ✅  |   ✅   |   ✅
  Create/Edit         |   ✅  |   ✅   |   ❌
  Delete              |   ✅  |   ❌   |   ❌
  Invite members      |   ✅  |   ❌   |   ❌
  Change settings     |   ✅  |   ❌   |   ❌
  Remove members      |   ✅  |   ❌   |   ❌
  Delete space        |   ✅  |   ❌   |   ❌
  ```
- **User Benefit:** Clear responsibilities, prevent accidental changes, professional collaboration
- **Complexity:** Medium (3-4 days to add to all features)
- **Free Feature:** Yes (core functionality)

---

## 🌍 Localization & Privacy Controls

### Phase 2: Global Reach & GDPR Compliance

**Feature Name:** Multi-Language Support & Advanced Privacy

**Description:**
Expand market reach with internationalization while providing enterprise-grade privacy controls for GDPR compliance and user trust.

**Planned Features:**

#### 1. Language/Localization (i18n)
- **What:** Support multiple languages with automatic detection
- **Why:** Reach international users, improve accessibility, increase market size
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install next-intl
    npm install @formatjs/intl-localematcher
    ```
  - **Supported Languages (Phase 1):**
    - English (en-US)
    - Spanish (es-ES)
    - French (fr-FR)
    - German (de-DE)
    - Portuguese (pt-BR)
    - Japanese (ja-JP)
  - **Project Structure:**
    ```
    app/
      [locale]/
        (main)/
          dashboard/
          tasks/
          ...
    messages/
      en.json
      es.json
      fr.json
      de.json
      pt.json
      ja.json
    ```
  - **Configuration:**
    ```typescript
    // next.config.js
    const withNextIntl = require('next-intl/plugin')('./i18n.ts');

    module.exports = withNextIntl({
      // ... other config
    });

    // i18n.ts
    import { getRequestConfig } from 'next-intl/server';

    export default getRequestConfig(async ({ locale }) => ({
      messages: (await import(`./messages/${locale}.json`)).default
    }));
    ```
  - **Language Files:**
    ```json
    // messages/en.json
    {
      "common": {
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit"
      },
      "dashboard": {
        "title": "Dashboard",
        "welcome": "Welcome back, {name}!",
        "stats": {
          "tasks": "{count, plural, =0 {No tasks} =1 {1 task} other {# tasks}}"
        }
      },
      "tasks": {
        "create": "Create Task",
        "filters": {
          "all": "All",
          "active": "Active",
          "completed": "Completed"
        }
      }
    }

    // messages/es.json
    {
      "common": {
        "save": "Guardar",
        "cancel": "Cancelar",
        "delete": "Eliminar",
        "edit": "Editar"
      },
      "dashboard": {
        "title": "Panel de Control",
        "welcome": "¡Bienvenido de nuevo, {name}!",
        "stats": {
          "tasks": "{count, plural, =0 {Sin tareas} =1 {1 tarea} other {# tareas}}"
        }
      }
    }
    ```
  - **Usage in Components:**
    ```typescript
    // app/[locale]/(main)/dashboard/page.tsx
    import { useTranslations } from 'next-intl';

    export default function DashboardPage() {
      const t = useTranslations('dashboard');

      return (
        <div>
          <h1>{t('title')}</h1>
          <p>{t('welcome', { name: user.name })}</p>
          <p>{t('stats.tasks', { count: taskCount })}</p>
        </div>
      );
    }
    ```
  - **Language Switcher:**
    ```typescript
    // components/shared/LanguageSwitcher.tsx
    'use client';

    import { useRouter, usePathname } from 'next/navigation';
    import { Globe } from 'lucide-react';

    const languages = [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'pt', name: 'Português', flag: '🇧🇷' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
    ];

    export function LanguageSwitcher() {
      const router = useRouter();
      const pathname = usePathname();

      const handleLanguageChange = (newLocale: string) => {
        // Remove current locale from pathname
        const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '');
        router.push(`/${newLocale}${pathWithoutLocale}`);
      };

      return (
        <select onChange={(e) => handleLanguageChange(e.target.value)}>
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      );
    }
    ```
  - **Date/Time Localization:**
    ```typescript
    import { format } from 'date-fns';
    import { es, fr, de, ptBR, ja } from 'date-fns/locale';

    const locales = { en: undefined, es, fr, de, pt: ptBR, ja };

    format(new Date(), 'PPP', { locale: locales[currentLocale] });
    ```
  - **Currency Localization:**
    ```typescript
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD' // Make configurable
    }).format(amount);
    ```
  - **Database Support:**
    ```sql
    ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en';
    ALTER TABLE users ADD COLUMN preferred_timezone TEXT DEFAULT 'UTC';
    ALTER TABLE users ADD COLUMN preferred_currency TEXT DEFAULT 'USD';
    ```
- **User Benefit:** App in native language, better UX, increased engagement
- **Market Impact:** 300% larger addressable market
- **Complexity:** High (5-7 days for setup + translation)
- **Free Feature:** Yes (competitive necessity)

#### 2. Advanced Privacy Controls
- **What:** GDPR-compliant data controls, export, deletion
- **Why:** Legal compliance, user trust, data sovereignty
- **Technical Implementation:**
  - **Privacy Dashboard:**
    ```typescript
    // app/(main)/settings/privacy/page.tsx
    'use client';

    export default function PrivacyPage() {
      return (
        <div className="privacy-settings">
          <h1>Privacy & Data</h1>

          {/* Data Visibility */}
          <section>
            <h2>Profile Visibility</h2>
            <label>
              <input type="checkbox" checked={profilePublic} onChange={/*...*/} />
              Show my profile to other space members
            </label>
            <label>
              <input type="checkbox" checked={activityPublic} onChange={/*...*/} />
              Show my activity in shared spaces
            </label>
          </section>

          {/* Data Collection */}
          <section>
            <h2>Data Collection</h2>
            <label>
              <input type="checkbox" checked={analyticsEnabled} onChange={/*...*/} />
              Enable usage analytics (helps improve Rowan)
            </label>
            <label>
              <input type="checkbox" checked={locationEnabled} onChange={/*...*/} />
              Enable location tracking for location-based reminders
            </label>
          </section>

          {/* Data Export */}
          <section>
            <h2>Your Data</h2>
            <button onClick={handleExportData} className="btn-secondary">
              Download My Data (GDPR)
            </button>
            <p className="text-sm text-gray-500">
              Export all your data in JSON format
            </p>
          </section>

          {/* Account Deletion */}
          <section className="border-t pt-6">
            <h2 className="text-red-600">Danger Zone</h2>
            <button onClick={handleDeleteAccount} className="btn-danger">
              Delete My Account
            </button>
            <p className="text-sm text-gray-500">
              Permanently delete all your data. This cannot be undone.
            </p>
          </section>
        </div>
      );
    }
    ```
  - **Data Export API:**
    ```typescript
    // app/api/privacy/export/route.ts
    import { createClient } from '@/lib/supabase/server';

    export async function POST(req: Request) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Gather all user data
      const [
        profile,
        tasks,
        reminders,
        events,
        messages,
        expenses
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('tasks').select('*').eq('created_by', user.id),
        supabase.from('reminders').select('*').eq('created_by', user.id),
        supabase.from('events').select('*').eq('created_by', user.id),
        supabase.from('messages').select('*').eq('sender_id', user.id),
        supabase.from('expenses').select('*').eq('paid_by', user.id)
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        user: profile.data,
        tasks: tasks.data,
        reminders: reminders.data,
        events: events.data,
        messages: messages.data,
        expenses: expenses.data
      };

      // Log export for compliance
      await supabase.from('privacy_logs').insert({
        user_id: user.id,
        action: 'data_export',
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="rowan-data-export-${user.id}.json"`
        }
      });
    }
    ```
  - **Account Deletion:**
    ```sql
    -- Soft delete with retention period
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMPTZ;

    -- Cron job to permanently delete after 30 days
    CREATE FUNCTION cleanup_deleted_accounts() RETURNS void AS $$
    BEGIN
      DELETE FROM users
      WHERE deleted_at < NOW() - INTERVAL '30 days';
    END;
    $$ LANGUAGE plpgsql;
    ```
  - **Privacy Audit Log:**
    ```sql
    CREATE TABLE privacy_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      action TEXT NOT NULL, -- 'data_export', 'account_deletion', 'privacy_settings_changed'
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - **Cookie Consent:**
    ```typescript
    // components/shared/CookieConsent.tsx
    'use client';

    export function CookieConsent() {
      const [accepted, setAccepted] = useState(false);

      useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        setAccepted(consent === 'true');
      }, []);

      if (accepted) return null;

      return (
        <div className="cookie-banner">
          <p>We use cookies to improve your experience.</p>
          <button onClick={() => {
            localStorage.setItem('cookie-consent', 'true');
            setAccepted(true);
          }}>
            Accept
          </button>
          <button onClick={() => window.location.href = '/privacy'}>
            Learn More
          </button>
        </div>
      );
    }
    ```
- **Compliance Features:**
  - Right to access (data export)
  - Right to deletion (account deletion)
  - Right to rectification (edit profile)
  - Right to portability (JSON export)
  - Data retention policies
  - Privacy policy page
  - Terms of service
  - Cookie consent
- **User Benefit:** Control over personal data, trust, peace of mind
- **Legal Impact:** EU GDPR compliant, California CCPA compliant
- **Complexity:** Medium-High (5-7 days)
- **Free Feature:** Yes (legal requirement)

---

## 🔔 Enhanced Notifications

### Phase 2: Multi-Channel Alerts & Smart Digests

**Feature Name:** SMS, Digests & Notification Sounds

**Description:**
Expand notification reach beyond email with SMS alerts, automated daily digests, and customizable notification sounds for better engagement.

**Planned Features:**

#### 1. SMS Notifications via Twilio
- **What:** Send reminders, alerts, and updates via text message
- **Why:** Higher open rates (98% vs 20% email), instant delivery, critical alerts
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install twilio
    ```
  - **Database Schema:**
    ```sql
    ALTER TABLE users ADD COLUMN phone_number TEXT;
    ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN sms_enabled BOOLEAN DEFAULT false;

    CREATE TABLE sms_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      phone_number TEXT NOT NULL,
      message_body TEXT NOT NULL,
      status TEXT, -- 'queued', 'sent', 'delivered', 'failed'
      twilio_sid TEXT,
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      error_message TEXT
    );
    ```
  - **Twilio Service:**
    ```typescript
    // lib/services/sms-service.ts
    import twilio from 'twilio';

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    export const smsService = {
      /**
       * Send SMS notification
       */
      async sendSMS(
        phoneNumber: string,
        message: string,
        userId?: string
      ): Promise<{ success: boolean; sid?: string }> {
        try {
          const result = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });

          // Log in database
          if (userId) {
            await supabase.from('sms_logs').insert({
              user_id: userId,
              phone_number: phoneNumber,
              message_body: message,
              status: 'sent',
              twilio_sid: result.sid
            });
          }

          return { success: true, sid: result.sid };
        } catch (error) {
          console.error('SMS send error:', error);
          return { success: false };
        }
      },

      /**
       * Send verification code
       */
      async sendVerificationCode(phoneNumber: string): Promise<string> {
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await this.sendSMS(
          phoneNumber,
          `Your Rowan verification code is: ${code}. Valid for 10 minutes.`
        );

        // Store code with expiration
        await supabase.from('verification_codes').insert({
          phone_number: phoneNumber,
          code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });

        return code;
      },

      /**
       * Send reminder alert
       */
      async sendReminderAlert(
        userId: string,
        reminder: { title: string; due_time: string }
      ): Promise<void> {
        const { data: user } = await supabase
          .from('users')
          .select('phone_number, sms_enabled')
          .eq('id', userId)
          .single();

        if (!user?.sms_enabled || !user.phone_number) return;

        const message = `🔔 Reminder: ${reminder.title}\nDue: ${format(new Date(reminder.due_time), 'PPp')}`;

        await this.sendSMS(user.phone_number, message, userId);
      }
    };
    ```
  - **Phone Verification UI:**
    ```typescript
    // app/(main)/settings/phone/page.tsx
    'use client';

    export default function PhoneVerificationPage() {
      const [phone, setPhone] = useState('');
      const [code, setCode] = useState('');
      const [step, setStep] = useState<'enter' | 'verify'>('enter');

      const handleSendCode = async () => {
        const response = await fetch('/api/sms/verify', {
          method: 'POST',
          body: JSON.stringify({ phone })
        });

        if (response.ok) {
          setStep('verify');
        }
      };

      const handleVerifyCode = async () => {
        const response = await fetch('/api/sms/confirm', {
          method: 'POST',
          body: JSON.stringify({ phone, code })
        });

        if (response.ok) {
          alert('Phone verified!');
        }
      };

      return (
        <div>
          {step === 'enter' ? (
            <>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
              <button onClick={handleSendCode}>Send Verification Code</button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
              <button onClick={handleVerifyCode}>Verify</button>
            </>
          )}
        </div>
      );
    }
    ```
  - **Notification Preferences:**
    ```typescript
    // Enable SMS for specific notification types
    interface NotificationPreferences {
      reminders_overdue: boolean;
      reminders_upcoming: boolean;
      tasks_assigned: boolean;
      events_starting_soon: boolean;
      bills_due: boolean;
    }
    ```
  - **Cost Management:**
    - SMS pricing: ~$0.0075 per message
    - Set daily limits per user (e.g., max 5 SMS/day)
    - Premium tier: Unlimited SMS
    - Free tier: 10 SMS/month
- **User Benefit:** Never miss critical reminders, instant alerts
- **Engagement Impact:** 3x higher response rate vs email
- **Complexity:** Medium (3-4 days)
- **Premium Feature:** Partially (10/month free, unlimited premium)
- **Estimated Cost:** $0.01 per SMS

#### 2. Daily Digest Email Generation
- **What:** Automated summary email of daily tasks, reminders, events
- **Why:** Single daily touchpoint, reduce notification fatigue, morning planning
- **Technical Implementation:**
  - **Cron Job:**
    ```typescript
    // app/api/cron/daily-digest/route.ts
    import { createClient } from '@/lib/supabase/server';
    import { sendEmail } from '@/lib/services/email-service';

    export async function GET(req: Request) {
      // Verify cron secret
      if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const supabase = createClient();

      // Get users who want daily digest
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name, notification_preferences')
        .eq('notification_preferences->email_digest_frequency', 'daily');

      for (const user of users || []) {
        const digest = await generateDailyDigest(user.id);

        if (digest.hasContent) {
          await sendEmail({
            to: user.email,
            subject: `Your Daily Digest - ${format(new Date(), 'MMMM d, yyyy')}`,
            template: 'daily-digest',
            data: {
              user_name: user.full_name,
              ...digest
            }
          });
        }
      }

      return new Response('Digests sent', { status: 200 });
    }

    async function generateDailyDigest(userId: string) {
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);

      // Gather today's data
      const [reminders, tasks, events] = await Promise.all([
        supabase
          .from('reminders')
          .select('*')
          .eq('assigned_to', userId)
          .eq('status', 'active')
          .gte('reminder_time', today.toISOString())
          .lt('reminder_time', tomorrow.toISOString()),

        supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', userId)
          .eq('status', 'in_progress')
          .gte('due_date', today.toISOString())
          .lt('due_date', tomorrow.toISOString()),

        supabase
          .from('events')
          .select('*')
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
      ]);

      return {
        hasContent: (reminders.data?.length || 0) + (tasks.data?.length || 0) + (events.data?.length || 0) > 0,
        reminders: reminders.data || [],
        tasks: tasks.data || [],
        events: events.data || [],
        stats: {
          overdue_tasks: await getOverdueCount(userId),
          upcoming_events: await getUpcomingCount(userId)
        }
      };
    }
    ```
  - **Email Template:**
    ```html
    <!-- emails/templates/daily-digest.html -->
    <div class="digest-email">
      <h1>Good morning, {{user_name}}! ☀️</h1>
      <p>Here's what's on your plate today:</p>

      <!-- Reminders -->
      {{#if reminders.length}}
      <section>
        <h2>🔔 Reminders ({{reminders.length}})</h2>
        {{#each reminders}}
        <div class="item">
          <strong>{{this.title}}</strong>
          <span class="time">{{formatTime this.reminder_time}}</span>
        </div>
        {{/each}}
      </section>
      {{/if}}

      <!-- Tasks -->
      {{#if tasks.length}}
      <section>
        <h2>✓ Tasks ({{tasks.length}})</h2>
        {{#each tasks}}
        <div class="item">
          <strong>{{this.title}}</strong>
          <span class="priority {{this.priority}}">{{this.priority}}</span>
        </div>
        {{/each}}
      </section>
      {{/if}}

      <!-- Events -->
      {{#if events.length}}
      <section>
        <h2>📅 Events ({{events.length}})</h2>
        {{#each events}}
        <div class="item">
          <strong>{{this.title}}</strong>
          <span class="time">{{formatTime this.start_time}}</span>
        </div>
        {{/each}}
      </section>
      {{/if}}

      <a href="{{app_url}}/dashboard" class="cta-button">View Dashboard</a>
    </div>
    ```
  - **Vercel Cron Configuration:**
    ```json
    // vercel.json
    {
      "crons": [{
        "path": "/api/cron/daily-digest",
        "schedule": "0 7 * * *"  // 7 AM daily
      }]
    }
    ```
  - **User Preferences:**
    ```typescript
    // Settings UI
    <select value={digestTime} onChange={handleDigestTimeChange}>
      <option value="disabled">Disabled</option>
      <option value="6">6:00 AM</option>
      <option value="7">7:00 AM</option>
      <option value="8">8:00 AM</option>
      <option value="9">9:00 AM</option>
    </select>
    ```
- **User Benefit:** Morning routine, clear daily overview, less email clutter
- **Engagement Impact:** 40% increase in daily active users
- **Complexity:** Medium (3-4 days)
- **Free Feature:** Yes

#### 3. Notification Sounds
- **What:** Custom sound alerts for in-app notifications
- **Why:** Audio feedback, catch attention, accessibility
- **Technical Implementation:**
  - **Sound Files:**
    ```
    public/sounds/
      notification-default.mp3
      notification-urgent.mp3
      notification-reminder.mp3
      notification-message.mp3
      notification-success.mp3
    ```
  - **Audio Service:**
    ```typescript
    // lib/services/audio-service.ts
    export const audioService = {
      sounds: {
        default: new Audio('/sounds/notification-default.mp3'),
        urgent: new Audio('/sounds/notification-urgent.mp3'),
        reminder: new Audio('/sounds/notification-reminder.mp3'),
        message: new Audio('/sounds/notification-message.mp3'),
        success: new Audio('/sounds/notification-success.mp3')
      },

      play(soundType: keyof typeof this.sounds) {
        const sound = this.sounds[soundType];
        sound.currentTime = 0;
        sound.play().catch(console.error);
      },

      playWithVolume(soundType: keyof typeof this.sounds, volume: number) {
        const sound = this.sounds[soundType];
        sound.volume = Math.min(1, Math.max(0, volume));
        this.play(soundType);
      }
    };
    ```
  - **Integration:**
    ```typescript
    // components/reminders/NotificationCenter.tsx
    import { audioService } from '@/lib/services/audio-service';

    useEffect(() => {
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          // Play sound based on notification type
          const notif = payload.new;
          const soundType = notif.priority === 'urgent' ? 'urgent' : 'default';

          if (soundsEnabled) {
            audioService.play(soundType);
          }

          // Show toast
          showNotification(notif);
        })
        .subscribe();
    }, [user.id, soundsEnabled]);
    ```
  - **Settings UI:**
    ```typescript
    // app/(main)/settings/notifications/page.tsx
    <section>
      <h3>Notification Sounds</h3>
      <label>
        <input
          type="checkbox"
          checked={soundsEnabled}
          onChange={(e) => setSoundsEnabled(e.target.checked)}
        />
        Enable notification sounds
      </label>

      <label>
        Volume: {volume}%
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
        />
      </label>

      <div className="sound-preview">
        {Object.keys(audioService.sounds).map(sound => (
          <button
            key={sound}
            onClick={() => audioService.playWithVolume(sound, volume / 100)}
          >
            Preview {sound}
          </button>
        ))}
      </div>
    </section>
    ```
  - **Browser Permissions:**
    ```typescript
    // Request audio permission on user interaction
    const enableSounds = async () => {
      try {
        // Browsers require user interaction before playing audio
        await audioService.play('default');
        localStorage.setItem('sounds-enabled', 'true');
      } catch (error) {
        alert('Please allow audio in your browser settings');
      }
    };
    ```
- **Sound Options:**
  - Default: Soft chime
  - Urgent: Attention-grabbing beep
  - Reminder: Gentle bell
  - Message: Chat notification
  - Success: Positive confirmation
- **User Benefit:** Audio cues, better accessibility, multitasking
- **Complexity:** Low (1-2 days)
- **Free Feature:** Yes

---

## 💰 Financial Management Premium Features

### Phase 2: Smart Expense Tracking & Banking Integration

**Feature Name:** Receipt OCR, Payments & Bank Sync

**Description:**
Transform budget tracking with automated receipt scanning, payment processing, and bank account synchronization for comprehensive financial management.

**Planned Features:**

#### 1. Receipt Scanning with OCR
- **What:** Scan receipts with camera, extract data automatically
- **Why:** Eliminate manual entry, accurate tracking, digital record keeping
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install tesseract.js  # Client-side OCR
    # OR use cloud service:
    # AWS Textract, Google Cloud Vision, Azure Computer Vision
    ```
  - **Database Schema:**
    ```sql
    CREATE TABLE receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      image_url TEXT NOT NULL,
      ocr_data JSONB, -- Extracted text and structured data
      merchant_name TEXT,
      total_amount DECIMAL(10,2),
      transaction_date DATE,
      items JSONB[], -- Array of line items
      confidence_score FLOAT,
      manually_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - **OCR Service (Cloud):**
    ```typescript
    // lib/services/receipt-ocr-service.ts
    import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';

    const client = new TextractClient({ region: 'us-east-1' });

    export const receiptOCRService = {
      /**
       * Analyze receipt image with AWS Textract
       */
      async scanReceipt(imageBuffer: Buffer): Promise<{
        merchant: string;
        total: number;
        date: string;
        items: Array<{ description: string; amount: number }>;
        confidence: number;
      }> {
        const command = new AnalyzeExpenseCommand({
          Document: {
            Bytes: imageBuffer
          }
        });

        const response = await client.send(command);

        // Parse Textract response
        const expenses = response.ExpenseDocuments?.[0];
        const summaryFields = expenses?.SummaryFields || [];

        const merchant = summaryFields.find(f => f.Type?.Text === 'VENDOR_NAME')?.ValueDetection?.Text || '';
        const total = parseFloat(summaryFields.find(f => f.Type?.Text === 'TOTAL')?.ValueDetection?.Text || '0');
        const date = summaryFields.find(f => f.Type?.Text === 'INVOICE_RECEIPT_DATE')?.ValueDetection?.Text || '';

        const items = expenses?.LineItemGroups?.[0]?.LineItems?.map(item => ({
          description: item.LineItemExpenseFields?.find(f => f.Type?.Text === 'ITEM')?.ValueDetection?.Text || '',
          amount: parseFloat(item.LineItemExpenseFields?.find(f => f.Type?.Text === 'PRICE')?.ValueDetection?.Text || '0')
        })) || [];

        const confidence = summaryFields.reduce((sum, f) => sum + (f.ValueDetection?.Confidence || 0), 0) / summaryFields.length;

        return { merchant, total, date, items, confidence };
      },

      /**
       * Client-side OCR fallback (Tesseract.js)
       */
      async scanReceiptClient(imageFile: File): Promise<string> {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker();

        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        const { data: { text } } = await worker.recognize(imageFile);
        await worker.terminate();

        return text;
      }
    };
    ```
  - **Upload & Scan API:**
    ```typescript
    // app/api/receipts/scan/route.ts
    import { receiptOCRService } from '@/lib/services/receipt-ocr-service';

    export async function POST(req: Request) {
      const formData = await req.formData();
      const file = formData.get('receipt') as File;

      if (!file) {
        return new Response('No file provided', { status: 400 });
      }

      // Upload to storage
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `receipts/${crypto.randomUUID()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, buffer, {
          contentType: file.type
        });

      if (uploadError) {
        return new Response('Upload failed', { status: 500 });
      }

      // Scan with OCR
      const ocrData = await receiptOCRService.scanReceipt(buffer);

      // Save receipt record
      const { data: receipt } = await supabase
        .from('receipts')
        .insert({
          user_id: session.user.id,
          image_url: uploadData.path,
          ocr_data: ocrData,
          merchant_name: ocrData.merchant,
          total_amount: ocrData.total,
          transaction_date: ocrData.date,
          items: ocrData.items,
          confidence_score: ocrData.confidence
        })
        .select()
        .single();

      return Response.json(receipt);
    }
    ```
  - **React Component:**
    ```typescript
    // components/expenses/ReceiptScanner.tsx
    'use client';

    import { useState, useRef } from 'react';
    import { Camera, Upload } from 'lucide-react';

    export function ReceiptScanner({ onScanComplete }: { onScanComplete: (data: any) => void }) {
      const [scanning, setScanning] = useState(false);
      const [preview, setPreview] = useState<string | null>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);

      const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload and scan
        setScanning(true);
        const formData = new FormData();
        formData.append('receipt', file);

        try {
          const response = await fetch('/api/receipts/scan', {
            method: 'POST',
            body: formData
          });

          const receipt = await response.json();
          onScanComplete(receipt);
        } catch (error) {
          alert('Scan failed. Please try again.');
        } finally {
          setScanning(false);
        }
      };

      return (
        <div className="receipt-scanner">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview ? (
            <div className="preview">
              <img src={preview} alt="Receipt preview" />
              {scanning && (
                <div className="scanning-overlay">
                  <p>Scanning receipt...</p>
                  <div className="spinner" />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="scan-button"
            >
              <Camera className="w-6 h-6" />
              Scan Receipt
            </button>
          )}
        </div>
      );
    }
    ```
  - **Review & Edit UI:**
    ```typescript
    // After OCR, show confirmation modal
    <Modal open={showReview}>
      <h2>Review Scanned Receipt</h2>
      <img src={receiptImage} alt="Receipt" className="w-full" />

      <div className="ocr-results">
        <label>
          Merchant
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </label>

        <label>
          Amount
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>

        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <p className="text-sm text-gray-500">
          Confidence: {(confidence * 100).toFixed(0)}%
        </p>
      </div>

      <div className="actions">
        <button onClick={handleConfirm}>Looks Good</button>
        <button onClick={handleEdit}>Edit Details</button>
      </div>
    </Modal>
    ```
- **User Benefit:** Save 5 minutes per receipt, accurate records, tax preparation
- **Accuracy:** 85-95% with cloud OCR, 60-75% with client-side
- **Complexity:** High (5-7 days)
- **Premium Feature:** Yes (5 scans/month free, unlimited premium)
- **Estimated Cost:** $0.015 per receipt (AWS Textract)

#### 2. Payment Integration (Stripe/PayPal)
- **What:** Process payments, split bills, settle expenses
- **Why:** Simplify reimbursement, track who owes what, cashless settlement
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install @stripe/stripe-js stripe
    npm install @paypal/checkout-server-sdk
    ```
  - **Database Schema:**
    ```sql
    CREATE TABLE payment_methods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      provider TEXT NOT NULL, -- 'stripe', 'paypal'
      provider_customer_id TEXT,
      type TEXT, -- 'card', 'bank_account', 'paypal'
      last4 TEXT,
      brand TEXT, -- 'visa', 'mastercard'
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID REFERENCES spaces(id),
      from_user_id UUID REFERENCES users(id),
      to_user_id UUID REFERENCES users(id),
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      description TEXT,
      expense_id UUID REFERENCES expenses(id),
      payment_method_id UUID REFERENCES payment_methods(id),
      provider TEXT, -- 'stripe', 'paypal'
      provider_transaction_id TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
    ```
  - **Stripe Setup:**
    ```typescript
    // lib/services/stripe-service.ts
    import Stripe from 'stripe';

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });

    export const stripeService = {
      /**
       * Create payment intent for expense settlement
       */
      async createPaymentIntent(
        fromUserId: string,
        toUserId: string,
        amount: number,
        description: string
      ): Promise<{ clientSecret: string; transactionId: string }> {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            from_user_id: fromUserId,
            to_user_id: toUserId,
            description
          }
        });

        // Record transaction
        const { data: transaction } = await supabase
          .from('transactions')
          .insert({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            amount,
            description,
            provider: 'stripe',
            provider_transaction_id: paymentIntent.id,
            status: 'pending'
          })
          .select()
          .single();

        return {
          clientSecret: paymentIntent.client_secret!,
          transactionId: transaction.id
        };
      },

      /**
       * Handle webhook events
       */
      async handleWebhook(event: Stripe.Event): Promise<void> {
        switch (event.type) {
          case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            // Update transaction status
            await supabase
              .from('transactions')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('provider_transaction_id', paymentIntent.id);

            // Send notification
            await notificationService.sendNotification({
              user_id: paymentIntent.metadata.to_user_id,
              type: 'payment_received',
              title: 'Payment Received',
              message: `You received $${(paymentIntent.amount / 100).toFixed(2)}`
            });
            break;

          case 'payment_intent.payment_failed':
            // Handle failed payment
            break;
        }
      }
    };
    ```
  - **Payment UI:**
    ```typescript
    // components/expenses/PaymentModal.tsx
    'use client';

    import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
    import { loadStripe } from '@stripe/stripe-js';

    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

    export function PaymentModal({ expense, onClose }: { expense: Expense; onClose: () => void }) {
      const [clientSecret, setClientSecret] = useState('');

      useEffect(() => {
        // Create payment intent
        fetch('/api/payments/create-intent', {
          method: 'POST',
          body: JSON.stringify({
            expense_id: expense.id,
            amount: expense.amount
          })
        })
          .then(res => res.json())
          .then(data => setClientSecret(data.clientSecret));
      }, [expense]);

      if (!clientSecret) return <div>Loading...</div>;

      return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm expenseId={expense.id} amount={expense.amount} onClose={onClose} />
        </Elements>
      );
    }

    function CheckoutForm({ expenseId, amount, onClose }) {
      const stripe = useStripe();
      const elements = useElements();
      const [processing, setProcessing] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);

        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/expenses/${expenseId}/payment-success`
          }
        });

        if (error) {
          alert(error.message);
        }

        setProcessing(false);
      };

      return (
        <form onSubmit={handleSubmit} className="payment-form">
          <h2>Pay ${amount.toFixed(2)}</h2>
          <PaymentElement />
          <button type="submit" disabled={!stripe || processing}>
            {processing ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
      );
    }
    ```
  - **Split Bill UI:**
    ```typescript
    // Show who owes what
    <div className="bill-split">
      <h3>Split Evenly: ${(expense.amount / members.length).toFixed(2)} each</h3>

      {members.map(member => (
        <div key={member.id} className="member-payment">
          <span>{member.name}</span>
          {member.id === currentUser.id ? (
            <button onClick={() => handlePay(member.id, expense.amount / members.length)}>
              Pay My Share
            </button>
          ) : (
            <span className={member.paid ? 'text-green-600' : 'text-gray-400'}>
              {member.paid ? '✓ Paid' : 'Pending'}
            </span>
          )}
        </div>
      ))}
    </div>
    ```
- **User Benefit:** Instant reimbursement, clear settlement, no cash needed
- **Complexity:** Very High (7-10 days + Stripe integration)
- **Premium Feature:** Yes
- **Transaction Fees:** 2.9% + $0.30 (Stripe standard)

#### 3. Bank Sync via Plaid
- **What:** Auto-import transactions from bank accounts and credit cards
- **Why:** Eliminate manual entry, complete financial picture, real-time balances
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install react-plaid-link plaid
    ```
  - **Database Schema:**
    ```sql
    CREATE TABLE bank_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      plaid_item_id TEXT NOT NULL,
      plaid_access_token TEXT ENCRYPTED,
      institution_id TEXT,
      institution_name TEXT,
      last_synced TIMESTAMPTZ,
      sync_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE bank_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_connection_id UUID REFERENCES bank_connections(id),
      plaid_transaction_id TEXT UNIQUE,
      account_id TEXT,
      amount DECIMAL(10,2),
      merchant_name TEXT,
      category TEXT[],
      transaction_date DATE,
      pending BOOLEAN,
      matched_expense_id UUID REFERENCES expenses(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - **Plaid Service:**
    ```typescript
    // lib/services/plaid-service.ts
    import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV!],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
          'PLAID-SECRET': process.env.PLAID_SECRET!
        }
      }
    });

    const plaidClient = new PlaidApi(configuration);

    export const plaidService = {
      /**
       * Create link token for Plaid Link
       */
      async createLinkToken(userId: string): Promise<string> {
        const response = await plaidClient.linkTokenCreate({
          user: { client_user_id: userId },
          client_name: 'Rowan',
          products: ['transactions'],
          country_codes: ['US'],
          language: 'en'
        });

        return response.data.link_token;
      },

      /**
       * Exchange public token for access token
       */
      async exchangePublicToken(publicToken: string, userId: string): Promise<void> {
        const response = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // Get institution info
        const itemResponse = await plaidClient.itemGet({
          access_token: accessToken
        });

        const institutionId = itemResponse.data.item.institution_id!;

        const institutionResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US']
        });

        // Save connection
        await supabase.from('bank_connections').insert({
          user_id: userId,
          plaid_item_id: itemId,
          plaid_access_token: accessToken,
          institution_id: institutionId,
          institution_name: institutionResponse.data.institution.name
        });

        // Initial sync
        await this.syncTransactions(accessToken);
      },

      /**
       * Sync transactions
       */
      async syncTransactions(accessToken: string): Promise<void> {
        const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const endDate = format(new Date(), 'yyyy-MM-dd');

        const response = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate
        });

        // Save transactions
        for (const transaction of response.data.transactions) {
          await supabase.from('bank_transactions').upsert({
            plaid_transaction_id: transaction.transaction_id,
            amount: transaction.amount,
            merchant_name: transaction.merchant_name || transaction.name,
            category: transaction.category,
            transaction_date: transaction.date,
            pending: transaction.pending
          }, {
            onConflict: 'plaid_transaction_id'
          });
        }
      }
    };
    ```
  - **React Component:**
    ```typescript
    // components/expenses/BankConnectButton.tsx
    'use client';

    import { usePlaidLink } from 'react-plaid-link';

    export function BankConnectButton() {
      const [linkToken, setLinkToken] = useState('');

      useEffect(() => {
        fetch('/api/plaid/create-link-token')
          .then(res => res.json())
          .then(data => setLinkToken(data.link_token));
      }, []);

      const { open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess: async (public_token) => {
          // Exchange token
          await fetch('/api/plaid/exchange-token', {
            method: 'POST',
            body: JSON.stringify({ public_token })
          });

          alert('Bank connected successfully!');
        }
      });

      return (
        <button onClick={() => open()} disabled={!ready}>
          Connect Bank Account
        </button>
      );
    }
    ```
  - **Auto-Match Transactions:**
    ```typescript
    // Match imported transactions to manual expenses
    async function autoMatchTransactions() {
      const unmatched = await getUnmatchedBankTransactions();
      const expenses = await getRecentExpenses();

      for (const transaction of unmatched) {
        // Find matching expense (same amount, similar date, merchant)
        const match = expenses.find(expense =>
          Math.abs(expense.amount - transaction.amount) < 0.01 &&
          isSameDay(expense.date, transaction.transaction_date) &&
          similarity(expense.description, transaction.merchant_name) > 0.7
        );

        if (match) {
          // Link them
          await linkTransactionToExpense(transaction.id, match.id);
        }
      }
    }
    ```
- **User Benefit:** Automatic expense tracking, complete financial view, zero manual entry
- **Accuracy:** 100% (direct from bank)
- **Complexity:** Very High (7-10 days + Plaid integration)
- **Premium Feature:** Yes
- **Cost:** Plaid pricing: $0.10-0.60 per user/month

#### 4. CSV/Excel Export UI
- **What:** Export budget data to spreadsheet formats
- **Why:** Tax preparation, analysis, backup, sharing with accountant
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install xlsx
    ```
  - **Export Service:**
    ```typescript
    // lib/services/export-service.ts
    import * as XLSX from 'xlsx';

    export const exportService = {
      /**
       * Export expenses to Excel
       */
      exportToExcel(expenses: Expense[], filename: string): void {
        const worksheet = XLSX.utils.json_to_sheet(
          expenses.map(expense => ({
            Date: format(new Date(expense.date), 'yyyy-MM-dd'),
            Description: expense.description,
            Category: expense.category,
            Amount: expense.amount,
            'Paid By': expense.paid_by_name,
            Status: expense.status,
            Notes: expense.notes
          }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

        XLSX.writeFile(workbook, `${filename}.xlsx`);
      },

      /**
       * Export to CSV
       */
      exportToCSV(expenses: Expense[], filename: string): void {
        const csv = [
          ['Date', 'Description', 'Category', 'Amount', 'Paid By', 'Status', 'Notes'].join(','),
          ...expenses.map(expense => [
            format(new Date(expense.date), 'yyyy-MM-dd'),
            `"${expense.description}"`,
            expense.category,
            expense.amount,
            expense.paid_by_name,
            expense.status,
            `"${expense.notes || ''}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
      }
    };
    ```
  - **Export UI:**
    ```typescript
    // app/(main)/budget/page.tsx
    import { exportService } from '@/lib/services/export-service';

    <button onClick={() => {
      exportService.exportToExcel(
        filteredExpenses,
        `expenses-${format(new Date(), 'yyyy-MM-dd')}`
      );
    }}>
      <Download className="w-4 h-4 mr-2" />
      Export to Excel
    </button>

    <button onClick={() => {
      exportService.exportToCSV(
        filteredExpenses,
        `expenses-${format(new Date(), 'yyyy-MM-dd')}`
      );
    }}>
      Export to CSV
    </button>
    ```
- **User Benefit:** Tax preparation, data portability, accountant sharing
- **Complexity:** Low (1 day)
- **Free Feature:** Yes (with row limits for free tier)

#### 5. Bill Reminders
- **What:** Recurring reminders for utility bills, subscriptions, rent
- **Why:** Never miss payments, avoid late fees, credit score protection
- **Technical Implementation:**
  - **Database Schema:**
    ```sql
    CREATE TABLE recurring_bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID REFERENCES spaces(id),
      user_id UUID REFERENCES users(id),
      name TEXT NOT NULL, -- 'Electric Bill', 'Netflix', 'Rent'
      category TEXT, -- 'utilities', 'subscription', 'housing'
      amount DECIMAL(10,2),
      due_day INTEGER, -- Day of month (1-31)
      frequency TEXT DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annually'
      auto_create_reminder BOOLEAN DEFAULT true,
      notify_days_before INTEGER DEFAULT 3,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - **Cron Job:**
    ```typescript
    // app/api/cron/bill-reminders/route.ts
    export async function GET(req: Request) {
      // Run daily, check for upcoming bills
      const today = new Date();
      const threeDaysFromNow = addDays(today, 3);

      const { data: bills } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('auto_create_reminder', true);

      for (const bill of bills || []) {
        const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);

        if (isSameDay(dueDate, threeDaysFromNow)) {
          // Create reminder
          await remindersService.createReminder({
            space_id: bill.space_id,
            title: `Pay ${bill.name}`,
            description: `Bill due on ${format(dueDate, 'MMMM d')}. Amount: $${bill.amount}`,
            category: 'bills',
            priority: 'high',
            reminder_time: dueDate.toISOString(),
            assigned_to: bill.user_id
          });
        }
      }

      return new Response('Bill reminders created', { status: 200 });
    }
    ```
  - **UI Component:**
    ```typescript
    // components/budget/RecurringBillsManager.tsx
    export function RecurringBillsManager() {
      const [bills, setBills] = useState<RecurringBill[]>([]);

      return (
        <div className="recurring-bills">
          <h2>Recurring Bills</h2>

          {bills.map(bill => (
            <div key={bill.id} className="bill-card">
              <h3>{bill.name}</h3>
              <p className="amount">${bill.amount}/month</p>
              <p className="due-date">Due: {bill.due_day}th of each month</p>
              <label>
                <input
                  type="checkbox"
                  checked={bill.auto_create_reminder}
                  onChange={(e) => updateBill(bill.id, { auto_create_reminder: e.target.checked })}
                />
                Auto-create reminders
              </label>
            </div>
          ))}

          <button onClick={() => setShowAddModal(true)}>
            Add Recurring Bill
          </button>
        </div>
      );
    }
    ```
- **User Benefit:** Never miss bill due dates, avoid late fees ($20-35 each!)
- **Complexity:** Low-Medium (2-3 days)
- **Free Feature:** Yes

---

## 🛒 Smart Shopping Premium Features

### Phase 2: Barcode Scanning & Price Intelligence

**Feature Name:** Barcode Scanner, Product DB & Price Tracking

**Description:**
Transform shopping with instant barcode scanning, comprehensive product database integration, and intelligent price tracking across stores.

**Planned Features:**

#### 1. Barcode Scanning
- **What:** Scan product barcodes to instantly add items to shopping list
- **Why:** Lightning-fast entry, accurate product info, zero typing
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install @zxing/browser  # Barcode scanning
    # OR
    npm install quagga  # Alternative barcode scanner
    ```
  - **Barcode Scanner Component:**
    ```typescript
    // components/shopping/BarcodeScanner.tsx
    'use client';

    import { useEffect, useRef, useState } from 'react';
    import { BrowserMultiFormatReader } from '@zxing/browser';

    export function BarcodeScanner({ onScan, onClose }: {
      onScan: (barcode: string) => void;
      onClose: () => void;
    }) {
      const videoRef = useRef<HTMLVideoElement>(null);
      const [scanning, setScanning] = useState(true);

      useEffect(() => {
        const codeReader = new BrowserMultiFormatReader();

        codeReader.decodeFromVideoDevice(
          undefined, // Use default camera
          videoRef.current!,
          (result, error) => {
            if (result) {
              onScan(result.getText());
              setScanning(false);

              // Haptic feedback
              if ('vibrate' in navigator) {
                navigator.vibrate(200);
              }
            }
          }
        );

        return () => {
          codeReader.reset();
        };
      }, [onScan]);

      return (
        <div className="barcode-scanner">
          <div className="scanner-overlay">
            <div className="scanner-frame" />
            <p className="scanner-hint">
              {scanning ? 'Align barcode within frame' : 'Scanned!'}
            </p>
          </div>

          <video
            ref={videoRef}
            className="scanner-video"
            autoPlay
            playsInline
          />

          <button onClick={onClose} className="scanner-close">
            Cancel
          </button>
        </div>
      );
    }
    ```
  - **Product Lookup:**
    ```typescript
    // lib/services/barcode-lookup-service.ts
    export const barcodeLookupService = {
      /**
       * Look up product by barcode
       */
      async lookupProduct(barcode: string): Promise<{
        name: string;
        brand: string;
        category: string;
        image_url?: string;
      } | null> {
        // Try Open Food Facts API (free, open database)
        try {
          const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
          );

          const data = await response.json();

          if (data.status === 1 && data.product) {
            return {
              name: data.product.product_name,
              brand: data.product.brands,
              category: data.product.categories,
              image_url: data.product.image_url
            };
          }
        } catch (error) {
          console.error('Barcode lookup error:', error);
        }

        return null;
      }
    };
    ```
  - **Usage Flow:**
    ```typescript
    // app/(main)/shopping/page.tsx
    const [showScanner, setShowScanner] = useState(false);

    const handleBarcodeScanned = async (barcode: string) => {
      setShowScanner(false);

      // Look up product
      const product = await barcodeLookupService.lookupProduct(barcode);

      if (product) {
        // Add to shopping list
        await shoppingService.addItem({
          list_id: currentList.id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          image_url: product.image_url
        });

        toast.success(`Added: ${product.name}`);
      } else {
        // Manual entry fallback
        setManualEntryBarcode(barcode);
        setShowManualEntryModal(true);
      }
    };

    <button onClick={() => setShowScanner(true)}>
      <Scan className="w-5 h-5" />
      Scan Barcode
    </button>

    {showScanner && (
      <BarcodeScanner
        onScan={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />
    )}
    ```
- **User Benefit:** Add items in 2 seconds vs 30 seconds typing
- **Accuracy:** 95%+ barcode recognition
- **Complexity:** Medium (3-4 days)
- **Premium Feature:** Partially (10 scans/month free, unlimited premium)

#### 2. Product Database Integration
- **What:** Access to comprehensive product catalog with nutrition, pricing, alternatives
- **Why:** Rich product info, smart suggestions, better shopping decisions
- **Technical Implementation:**
  - **APIs:**
    - Open Food Facts (free, 2M+ products)
    - Nutritionix API (nutrition data)
    - Kroger API (pricing for Kroger stores)
    - Walmart API (pricing for Walmart)
  - **Database Schema:**
    ```sql
    CREATE TABLE products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      subcategory TEXT,
      image_url TEXT,
      nutrition JSONB,
      ingredients TEXT[],
      allergens TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_updated TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_products_barcode ON products(barcode);
    CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));
    ```
  - **Product Search:**
    ```typescript
    // lib/services/product-search-service.ts
    export const productSearchService = {
      /**
       * Search products by name
       */
      async searchProducts(query: string, limit: number = 20): Promise<Product[]> {
        // Search Open Food Facts
        const response = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${limit}`
        );

        const data = await response.json();

        return data.products.map(p => ({
          barcode: p.code,
          name: p.product_name,
          brand: p.brands,
          category: p.categories_tags?.[0],
          image_url: p.image_url,
          nutrition: {
            calories: p.nutriments?.['energy-kcal_100g'],
            protein: p.nutriments?.proteins_100g,
            carbs: p.nutriments?.carbohydrates_100g,
            fat: p.nutriments?.fat_100g
          }
        }));
      },

      /**
       * Get product alternatives (similar products)
       */
      async getAlternatives(productId: string, preferences?: {
        healthier?: boolean;
        cheaper?: boolean;
        vegan?: boolean;
      }): Promise<Product[]> {
        // Implementation with filtering logic
      }
    };
    ```
  - **Product Detail Modal:**
    ```typescript
    // components/shopping/ProductDetailModal.tsx
    export function ProductDetailModal({ product }: { product: Product }) {
      return (
        <Modal>
          <div className="product-detail">
            <img src={product.image_url} alt={product.name} />

            <h2>{product.name}</h2>
            <p className="brand">{product.brand}</p>

            <section className="nutrition">
              <h3>Nutrition (per 100g)</h3>
              <div className="nutrition-grid">
                <div>Calories: {product.nutrition.calories} kcal</div>
                <div>Protein: {product.nutrition.protein}g</div>
                <div>Carbs: {product.nutrition.carbs}g</div>
                <div>Fat: {product.nutrition.fat}g</div>
              </div>
            </section>

            <section className="alternatives">
              <h3>Similar Products</h3>
              {alternatives.map(alt => (
                <ProductCard key={alt.id} product={alt} />
              ))}
            </section>

            <button onClick={() => addToList(product)}>
              Add to Shopping List
            </button>
          </div>
        </Modal>
      );
    }
    ```
- **User Benefit:** Informed choices, discover alternatives, nutrition awareness
- **Complexity:** Medium-High (4-5 days)
- **Premium Feature:** Partially (basic info free, nutrition/alternatives premium)

#### 3. Price Tracking & Alerts
- **What:** Track prices across stores, get alerts when items go on sale
- **Why:** Save money, buy at optimal time, budget optimization
- **Technical Implementation:**
  - **Database Schema:**
    ```sql
    CREATE TABLE price_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id),
      store_name TEXT,
      price DECIMAL(10,2),
      on_sale BOOLEAN DEFAULT false,
      sale_price DECIMAL(10,2),
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE price_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      product_id UUID REFERENCES products(id),
      target_price DECIMAL(10,2),
      store_name TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```
  - **Price Tracking Service:**
    ```typescript
    // lib/services/price-tracking-service.ts
    export const priceTrackingService = {
      /**
       * Get current prices across stores
       */
      async getPricesForProduct(productId: string): Promise<Array<{
        store: string;
        price: number;
        on_sale: boolean;
      }>> {
        // API calls to Kroger, Walmart, etc.
        // For MVP: Manual price entry by users

        const { data } = await supabase
          .from('price_history')
          .select('*')
          .eq('product_id', productId)
          .order('recorded_at', { ascending: false })
          .limit(10);

        return data || [];
      },

      /**
       * Check for price alerts
       */
      async checkPriceAlerts(): Promise<void> {
        const { data: alerts } = await supabase
          .from('price_alerts')
          .select('*, product:products(*)')
          .eq('active', true);

        for (const alert of alerts || []) {
          const currentPrice = await this.getCurrentPrice(
            alert.product_id,
            alert.store_name
          );

          if (currentPrice && currentPrice <= alert.target_price) {
            // Send notification
            await notificationService.sendNotification({
              user_id: alert.user_id,
              type: 'price_alert',
              title: `Price Alert: ${alert.product.name}`,
              message: `Now $${currentPrice} at ${alert.store_name} (Target: $${alert.target_price})`
            });

            // Deactivate alert
            await supabase
              .from('price_alerts')
              .update({ active: false })
              .eq('id', alert.id);
          }
        }
      }
    };
    ```
  - **Price History Chart:**
    ```typescript
    // components/shopping/PriceHistoryChart.tsx
    import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

    export function PriceHistoryChart({ productId }: { productId: string }) {
      const [priceHistory, setPriceHistory] = useState([]);

      useEffect(() => {
        priceTrackingService.getPricesForProduct(productId)
          .then(setPriceHistory);
      }, [productId]);

      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={priceHistory}>
            <XAxis dataKey="recorded_at" tickFormatter={(date) => format(new Date(date), 'MMM d')} />
            <YAxis tickFormatter={(price) => `$${price}`} />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    ```
  - **Set Alert UI:**
    ```typescript
    <button onClick={() => {
      priceTrackingService.createPriceAlert({
        user_id: user.id,
        product_id: product.id,
        target_price: 4.99,
        store_name: 'Kroger'
      });
    }}>
      Alert me when price drops below $4.99
    </button>
    ```
- **User Benefit:** Save 15-30% on groceries, never overpay
- **Complexity:** High (5-7 days + API integrations)
- **Premium Feature:** Yes

#### 4. Aisle Organization
- **What:** Organize shopping list by store layout/aisles
- **Why:** Faster shopping, less backtracking, efficient trips
- **Technical Implementation:**
  - **Database Schema:**
    ```sql
    CREATE TABLE store_layouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID REFERENCES spaces(id),
      store_name TEXT NOT NULL,
      aisles JSONB, -- [{ number: 1, name: 'Produce', categories: ['fruits', 'vegetables'] }]
      created_by UUID REFERENCES users(id),
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE shopping_list_items ADD COLUMN aisle_number INTEGER;
    ALTER TABLE shopping_list_items ADD COLUMN aisle_name TEXT;
    ```
  - **Aisle Mapper UI:**
    ```typescript
    // components/shopping/AisleMapper.tsx
    export function AisleMapper({ storeId }: { storeId: string }) {
      const [aisles, setAisles] = useState([
        { number: 1, name: 'Produce', categories: ['fruits', 'vegetables'] },
        { number: 2, name: 'Dairy', categories: ['milk', 'cheese', 'yogurt'] },
        { number: 3, name: 'Meat', categories: ['beef', 'chicken', 'pork'] }
        // ... etc
      ]);

      return (
        <div className="aisle-mapper">
          <h2>Configure Store Layout</h2>

          {aisles.map((aisle, index) => (
            <div key={index} className="aisle-row">
              <input
                type="number"
                value={aisle.number}
                onChange={(e) => updateAisle(index, 'number', parseInt(e.target.value))}
                placeholder="Aisle #"
              />
              <input
                value={aisle.name}
                onChange={(e) => updateAisle(index, 'name', e.target.value)}
                placeholder="Aisle name"
              />
              <TagInput
                tags={aisle.categories}
                onChange={(cats) => updateAisle(index, 'categories', cats)}
                placeholder="Categories..."
              />
            </div>
          ))}

          <button onClick={addAisle}>Add Aisle</button>
          <button onClick={saveLayout}>Save Layout</button>
        </div>
      );
    }
    ```
  - **Auto-Sort by Aisle:**
    ```typescript
    // Sort shopping list items by aisle order
    const sortedItems = useMemo(() => {
      return [...items].sort((a, b) => {
        if (!a.aisle_number || !b.aisle_number) return 0;
        return a.aisle_number - b.aisle_number;
      });
    }, [items]);

    // Group by aisle
    const itemsByAisle = useMemo(() => {
      return sortedItems.reduce((acc, item) => {
        const aisle = item.aisle_name || 'Unassigned';
        if (!acc[aisle]) acc[aisle] = [];
        acc[aisle].push(item);
        return acc;
      }, {} as Record<string, ShoppingListItem[]>);
    }, [sortedItems]);

    // Render grouped
    {Object.entries(itemsByAisle).map(([aisle, items]) => (
      <div key={aisle} className="aisle-group">
        <h3 className="aisle-header">
          {aisle === 'Unassigned' ? '📍 Unassigned' : `Aisle ${items[0].aisle_number}: ${aisle}`}
        </h3>
        {items.map(item => (
          <ShoppingListItemCard key={item.id} item={item} />
        ))}
      </div>
    ))}
    ```
- **User Benefit:** 20-30% faster shopping trips, less frustration
- **Complexity:** Medium (3-4 days)
- **Premium Feature:** Yes

---

## 📅 Calendar Advanced Features - ADDITIONS

### Drag-and-Drop & External Sync

**Note:** These features are additions to the existing calendar advanced features already documented in this file (lines 177-756).

#### 1. Drag-and-Drop Rescheduling UI
- **What:** Drag events to new days/times visually
- **Why:** Faster rescheduling than modal, intuitive interaction
- **Status:** Already documented in detail (lines 258-344)
- **Complexity:** Medium-High (3-5 days)
- **Premium Feature:** No

#### 2. Google Calendar Two-Way Sync
- **What:** Sync events bidirectionally with Google Calendar
- **Why:** Unified calendar, no double-booking, single source of truth
- **Status:** Already documented in detail (lines 537-604)
- **Complexity:** Very High (5-7 days + OAuth)
- **Premium Feature:** Yes

#### 3. iCal Import/Export (.ics files)
- **What:** Export calendar as .ics file, import from other calendars
- **Why:** Calendar portability, backup, sharing with non-users
- **Technical Implementation:**
  - **Libraries:**
    ```bash
    npm install ics
    ```
  - **Export Service:**
    ```typescript
    // lib/services/ical-export-service.ts
    import { createEvents } from 'ics';

    export const icalExportService = {
      /**
       * Export events to .ics file
       */
      async exportToICS(events: CalendarEvent[]): Promise<Blob> {
        const icsEvents = events.map(event => ({
          start: this.parseDateTime(event.start_time),
          end: this.parseDateTime(event.end_time),
          title: event.title,
          description: event.description,
          location: event.location,
          status: event.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
          organizer: { name: event.created_by_name, email: event.created_by_email },
          alarms: event.reminder_minutes ? [{
            action: 'audio',
            trigger: { minutes: event.reminder_minutes, before: true }
          }] : undefined
        }));

        const { error, value } = createEvents(icsEvents);

        if (error) {
          throw new Error('Failed to create iCal file');
        }

        return new Blob([value!], { type: 'text/calendar' });
      },

      parseDateTime(isoString: string): [number, number, number, number, number] {
        const date = new Date(isoString);
        return [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
          date.getHours(),
          date.getMinutes()
        ];
      },

      /**
       * Download .ics file
       */
      downloadICS(events: CalendarEvent[], filename: string = 'calendar'): void {
        this.exportToICS(events).then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.ics`;
          link.click();
          URL.revokeObjectURL(url);
        });
      }
    };
    ```
  - **Import Service:**
    ```typescript
    // lib/services/ical-import-service.ts
    import ical from 'ical';

    export const icalImportService = {
      /**
       * Parse .ics file and extract events
       */
      async parseICS(file: File): Promise<Partial<CalendarEvent>[]> {
        const text = await file.text();
        const parsed = ical.parseICS(text);

        const events: Partial<CalendarEvent>[] = [];

        for (const [, event] of Object.entries(parsed)) {
          if (event.type === 'VEVENT') {
            events.push({
              title: event.summary,
              description: event.description,
              location: event.location,
              start_time: event.start.toISOString(),
              end_time: event.end.toISOString(),
              all_day: !event.start.dateOnly,
              status: event.status === 'CONFIRMED' ? 'confirmed' : 'tentative'
            });
          }
        }

        return events;
      },

      /**
       * Import events into Rowan
       */
      async importEvents(file: File, spaceId: string, userId: string): Promise<number> {
        const events = await this.parseICS(file);

        let imported = 0;
        for (const event of events) {
          try {
            await calendarService.createEvent({
              ...event,
              space_id: spaceId,
              created_by: userId,
              status: event.status || 'confirmed'
            } as CreateEventInput);
            imported++;
          } catch (error) {
            console.error('Failed to import event:', error);
          }
        }

        return imported;
      }
    };
    ```
  - **UI Components:**
    ```typescript
    // components/calendar/ExportButton.tsx
    export function ExportButton({ events }: { events: CalendarEvent[] }) {
      return (
        <button
          onClick={() => icalExportService.downloadICS(events, `rowan-calendar-${format(new Date(), 'yyyy-MM-dd')}`)}
          className="btn-secondary"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to iCal
        </button>
      );
    }

    // components/calendar/ImportButton.tsx
    export function ImportButton({ spaceId, userId }: { spaceId: string; userId: string }) {
      const fileInputRef = useRef<HTMLInputElement>(null);
      const [importing, setImporting] = useState(false);

      const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
          const count = await icalImportService.importEvents(file, spaceId, userId);
          alert(`Successfully imported ${count} events!`);
        } catch (error) {
          alert('Import failed. Please check the file format.');
        } finally {
          setImporting(false);
        }
      };

      return (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import iCal'}
          </button>
        </>
      );
    }
    ```
- **User Benefit:** Calendar backup, share with anyone, import existing calendars
- **Complexity:** Medium (3-4 days)
- **Premium Feature:** Partially (export free, import premium)

---

## 🎯 Goals Progress Photos

### Phase 2: Visual Progress Tracking

**Feature Name:** Before/After Photo Documentation

**Description:**
Enable visual goal tracking with progress photos for fitness, home improvement, and other visual goals.

**Technical Implementation:**

#### 1. Progress Photos
- **What:** Upload photos to track visual progress over time
- **Why:** Motivation, accountability, celebrate wins, before/after comparison
- **Database Schema:**
  ```sql
  CREATE TABLE goal_progress_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    photo_url TEXT NOT NULL,
    caption TEXT,
    milestone_id UUID REFERENCES goal_milestones(id),
    taken_at TIMESTAMPTZ NOT NULL,
    is_before_photo BOOLEAN DEFAULT false,
    is_after_photo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_goal_photos_goal_id ON goal_progress_photos(goal_id);
  CREATE INDEX idx_goal_photos_date ON goal_progress_photos(taken_at);
  ```
- **Storage Bucket:**
  ```sql
  -- Supabase Storage
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('goal-photos', 'goal-photos', true);

  -- RLS Policy
  CREATE POLICY "Users can upload their own goal photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'goal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
  ```
- **Upload Service:**
  ```typescript
  // lib/services/goal-photos-service.ts
  export const goalPhotosService = {
    /**
     * Upload progress photo
     */
    async uploadPhoto(
      goalId: string,
      file: File,
      caption?: string,
      isBeforePhoto: boolean = false
    ): Promise<GoalProgressPhoto> {
      const fileExt = file.name.split('.').pop();
      const fileName = `${goalId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('goal-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('goal-photos')
        .getPublicUrl(fileName);

      // Save photo record
      const { data: photo } = await supabase
        .from('goal_progress_photos')
        .insert({
          goal_id: goalId,
          user_id: session.user.id,
          photo_url: publicUrl,
          caption,
          taken_at: new Date().toISOString(),
          is_before_photo: isBeforePhoto
        })
        .select()
        .single();

      return photo;
    },

    /**
     * Get all photos for a goal
     */
    async getGoalPhotos(goalId: string): Promise<GoalProgressPhoto[]> {
      const { data } = await supabase
        .from('goal_progress_photos')
        .select('*')
        .eq('goal_id', goalId)
        .order('taken_at', { ascending: true });

      return data || [];
    },

    /**
     * Get before/after comparison
     */
    async getBeforeAfter(goalId: string): Promise<{
      before: GoalProgressPhoto | null;
      after: GoalProgressPhoto | null;
    }> {
      const [beforePhoto, afterPhoto] = await Promise.all([
        supabase
          .from('goal_progress_photos')
          .select('*')
          .eq('goal_id', goalId)
          .eq('is_before_photo', true)
          .order('taken_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('goal_progress_photos')
          .select('*')
          .eq('goal_id', goalId)
          .eq('is_after_photo', true)
          .order('taken_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      return {
        before: beforePhoto.data,
        after: afterPhoto.data
      };
    }
  };
  ```
- **UI Components:**
  ```typescript
  // components/goals/ProgressPhotoUploader.tsx
  export function ProgressPhotoUploader({ goalId }: { goalId: string }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        await goalPhotosService.uploadPhoto(goalId, file);
        toast.success('Photo uploaded!');
      } catch (error) {
        toast.error('Upload failed');
      } finally {
        setUploading(false);
      }
    };

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="photo-upload-button"
        >
          <Camera className="w-5 h-5" />
          {uploading ? 'Uploading...' : 'Add Progress Photo'}
        </button>
      </>
    );
  }

  // components/goals/ProgressPhotoTimeline.tsx
  export function ProgressPhotoTimeline({ goalId }: { goalId: string }) {
    const [photos, setPhotos] = useState<GoalProgressPhoto[]>([]);

    useEffect(() => {
      goalPhotosService.getGoalPhotos(goalId).then(setPhotos);
    }, [goalId]);

    return (
      <div className="photo-timeline">
        <h3>Progress Timeline</h3>
        <div className="timeline-grid">
          {photos.map((photo, index) => (
            <div key={photo.id} className="photo-card">
              <img src={photo.photo_url} alt={`Progress ${index + 1}`} />
              <div className="photo-meta">
                <span className="photo-date">
                  {format(new Date(photo.taken_at), 'MMM d, yyyy')}
                </span>
                {photo.caption && <p className="photo-caption">{photo.caption}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // components/goals/BeforeAfterComparison.tsx
  export function BeforeAfterComparison({ goalId }: { goalId: string }) {
    const [comparison, setComparison] = useState<{ before: GoalProgressPhoto | null; after: GoalProgressPhoto | null }>({ before: null, after: null });

    useEffect(() => {
      goalPhotosService.getBeforeAfter(goalId).then(setComparison);
    }, [goalId]);

    if (!comparison.before && !comparison.after) {
      return null;
    }

    return (
      <div className="before-after">
        <h3>Before & After</h3>
        <div className="comparison-grid">
          <div className="before-photo">
            {comparison.before ? (
              <>
                <img src={comparison.before.photo_url} alt="Before" />
                <span className="badge">Before</span>
              </>
            ) : (
              <div className="placeholder">
                <Camera className="w-12 h-12" />
                <p>Add a before photo</p>
              </div>
            )}
          </div>

          <div className="after-photo">
            {comparison.after ? (
              <>
                <img src={comparison.after.photo_url} alt="After" />
                <span className="badge">After</span>
              </>
            ) : (
              <div className="placeholder">
                <Camera className="w-12 h-12" />
                <p>Add an after photo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  ```
- **User Benefit:** Visual motivation, celebrate progress, share achievements
- **Engagement Impact:** 2x higher goal completion with photo tracking
- **Complexity:** Medium (3-4 days)
- **Premium Feature:** Partially (3 photos/goal free, unlimited premium)

---

*Last Updated: January 15, 2025*
*Status: Phase 1 Completed - Core reminders with @mentions and attachments implemented*
