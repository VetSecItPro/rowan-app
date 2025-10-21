# Calendar Modal Consolidation Strategy

## Executive Summary

**Goal**: Consolidate 7 calendar modals into 2 elegant, context-aware components while maintaining all functionality and improving user experience.

**Current State**: 7 separate modals with overlapping functionality
**Target State**: 2 unified modals with smart, dynamic interfaces

---

## Current Modal Analysis

### Existing Modals (7 Total)
1. **NewEventModal** - Event creation/editing (870 lines)
2. **EventDetailModal** - Event viewing with tabs (165 lines)
3. **EventProposalModal** - Collaborative scheduling (500 lines)
4. **QuickAddEvent** - Natural language creation (230 lines)
5. **TemplateLibrary** - Template selection (275 lines)
6. **ConfirmDialog** - Generic confirmation (100 lines)
7. **GuidedEventCreation** - Onboarding flow (100 lines)

**Total Code**: ~2,240 lines
**Bundle Impact**: High redundancy, multiple modal frameworks

---

## UI/UX Changes and Improvements

### 1. Calendar Page Interface Changes

#### Current Toggle System Enhancement
**Keep the existing toggle UI pattern** but make it smarter:

```typescript
// Current toggle buttons remain visually the same
<div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex gap-0.5">
  <button onClick={() => openUnifiedModal('quick-add')}>✨ Quick Add</button>
  <button onClick={() => openUnifiedModal('template-select')}>📋 Templates</button>
  <button onClick={() => openUnifiedModal('proposal-create')}>👥 Propose Event</button>
  <button onClick={() => openUnifiedModal('create')}>➕ New Event</button>
</div>
```

**Benefits of keeping current toggle**:
- ✅ No breaking UI changes
- ✅ Users already familiar with the pattern
- ✅ Each button opens unified modal in specific mode
- ✅ Visual consistency maintained

#### Enhanced Dynamic Action Button
The main action button becomes context-aware:

```typescript
// Smart button that adapts based on user's recent actions
const getSmartActionLabel = () => {
  if (user.recentlyUsedQuickAdd) return "Quick Add";
  if (user.hasUnfinishedEvent) return "Continue Event";
  if (user.frequentTemplateUser) return "From Template";
  return "New Event";
};
```

### 2. Search Bar Improvements

#### Remove Keyboard Shortcut Hint and Add Clear Button

**Current Implementation Issues**:
```typescript
// Current search with keyboard hint - REMOVE THIS
placeholder="Search Events (Press / to focus)"
```

**New Enhanced Search**:
```typescript
// components/calendar/EnhancedSearchBar.tsx
export function EnhancedSearchBar({ searchQuery, setSearchQuery, searchInputRef }) {
  const [isSearchActive, setIsSearchActive] = useState(false);

  return (
    <div className="relative">
      <div className="relative">
        {/* Search Icon - Only show when not typing */}
        {!searchQuery && (
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}

        {/* Enhanced Search Input */}
        <input
          ref={searchInputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          placeholder="Search events..." // Simplified, no keyboard hint
          value={searchQuery}
          onFocus={() => setIsSearchActive(true)}
          onBlur={() => setIsSearchActive(false)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 rounded-lg focus:outline-none transition-all duration-200 ${
            !searchQuery
              ? 'pl-12 border-gray-200 dark:border-gray-700'
              : 'pr-12 border-purple-500 dark:border-purple-500'
          } ${
            isSearchActive || searchQuery
              ? 'border-purple-500 dark:border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
              : 'border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-500'
          } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
        />

        {/* Clear Button - Show when typing */}
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Search Results Preview */}
      {searchQuery && isSearchActive && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {/* Quick search results preview */}
        </div>
      )}
    </div>
  );
}
```

---

## Simplified Weather Widget Enhancement

### Current Weather Implementation Analysis

**✅ Current system is excellent - keep it!**
- Uses **Open-Meteo API** (100% free, no API key required)
- **Smart caching**: 3 hours for weather, permanent geocoding cache
- **Intelligent fetching**: Only fetches for events within 5 days
- **Advanced features**: Weather alerts, outdoor event detection
- **Server-side routes**: Uses `/api/weather/` (no CORS issues)

### Enhancement Goal: Simple Persistent Weather Widget

**Target**: Single weather widget for user's location under mini-calendar

#### 1. Enhanced Geolocation Service (Browser GPS + IP Fallback)

```typescript
// lib/services/enhanced-geolocation-service.ts
export class EnhancedGeolocationService {
  async getCurrentLocation(): Promise<IPLocation> {
    // 1. Try browser GPS first (more accurate)
    try {
      const browserCoords = await this.getBrowserGPS();
      if (browserCoords) {
        // Reverse geocode to get city/state info using existing API
        const enrichedLocation = await this.enrichLocationData(browserCoords);
        if (enrichedLocation) {
          return enrichedLocation;
        }
      }
    } catch (error) {
      console.warn('Browser GPS failed, using IP geolocation');
    }

    // 2. Fallback to existing IP geolocation (already works great)
    return await geolocationService.getCurrentLocation();
  }

  private async getBrowserGPS(): Promise<{lat: number, lng: number} | null> {
    if (!navigator.geolocation) return null;

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  }

  private async enrichLocationData(coords: {lat: number, lng: number}): Promise<IPLocation | null> {
    try {
      // Use existing geocoding API route
      const response = await fetch(`/api/weather/geocode?lat=${coords.lat}&lon=${coords.lng}`);
      const data = await response.json();

      return {
        city: data.city,
        region: data.region,
        country: data.country,
        country_code: data.country_code,
        latitude: coords.lat,
        longitude: coords.lng,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        postal: data.postal || '',
        ip: '0.0.0.0'
      };
    } catch (error) {
      console.warn('Reverse geocoding failed');
      return null;
    }
  }
}

export const enhancedGeolocationService = new EnhancedGeolocationService();
```

#### 2. Persistent Weather Widget Component

```typescript
// components/calendar/PersistentWeatherWidget.tsx
export function PersistentWeatherWidget() {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [location, setLocation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserLocationWeather();
  }, []);

  const loadUserLocationWeather = async () => {
    try {
      setLoading(true);

      // Get user's current location (enhanced with browser GPS)
      const userLocation = await enhancedGeolocationService.getCurrentLocation();
      const locationString = geolocationService.getLocationString(userLocation);
      setLocation(locationString);

      // Get current weather for user's location using existing weather service
      const currentTime = new Date().toISOString();
      const currentWeather = await weatherService.getWeatherForEvent(locationString, currentTime);
      setWeather(currentWeather);

    } catch (error) {
      console.error('Failed to load weather:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent"></div>
          Loading weather...
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Weather unavailable
        </div>
      </div>
    );
  }

  // Convert Celsius to Fahrenheit for US users
  const tempF = Math.round((weather.temp * 9/5) + 32);
  const feelsLikeF = Math.round((weather.feelsLike * 9/5) + 32);

  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{weatherService.getWeatherEmoji(weather.condition)}</span>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {tempF}°F
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
              {weather.description}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {location.split(',')[0]} {/* Just city name */}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Feels {feelsLikeF}°F
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 3. Integration in Calendar Page with Enhanced Stats

```typescript
// app/(main)/calendar/page.tsx
export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Calculate stats from actual events data
  const statsData = useMemo(() => {
    const now = new Date();
    const startOfWeek = startOfWeek(now);
    const endOfWeek = endOfWeek(now);
    const startOfMonth = startOfMonth(now);
    const endOfMonth = endOfMonth(now);

    return {
      thisWeek: events.filter(event => {
        const eventDate = parseISO(event.start_time);
        return isWithinInterval(eventDate, { start: startOfWeek, end: endOfWeek });
      }).length,

      thisMonth: events.filter(event => {
        const eventDate = parseISO(event.start_time);
        return isWithinInterval(eventDate, { start: startOfMonth, end: endOfMonth });
      }).length,

      completed: events.filter(event =>
        event.status === 'completed' ||
        (event.end_time && parseISO(event.end_time) < now)
      ).length,

      totalEvents: events.length
    };
  }, [events]);

  return (
    <FeatureLayout>
      {/* Enhanced Stats Cards - Accurate data from events */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="This Week"
          value={statsData.thisWeek}
          icon="📅"
          color="blue"
        />
        <StatsCard
          title="This Month"
          value={statsData.thisMonth}
          icon="🗓️"
          color="purple"
        />
        <StatsCard
          title="Completed"
          value={statsData.completed}
          icon="✅"
          color="green"
        />
        <StatsCard
          title="Total Events"
          value={statsData.totalEvents}
          icon="📊"
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Sidebar - Only mini calendar and weather */}
        <div className="lg:col-span-1 space-y-4">

          {/* Mini Calendar */}
          <MiniCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onMonthChange={setCurrentMonth}
          />

          {/* 🌤️ NEW: Persistent Weather Widget - Right under mini calendar */}
          <PersistentWeatherWidget />

        </div>

        {/* Main Calendar Area */}
        <div className="lg:col-span-3">
          {/* All existing calendar content - events state flows from here */}
        </div>

      </div>
    </FeatureLayout>
  );
}
```

#### Enhanced StatsCard Component

```typescript
// components/calendar/StatsCard.tsx
interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'gray';
}

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}
```

#### 4. Visual Layout

```
┌─ Stats Cards (Top of Page) ─────────────────────────────────────────┐
│ 📊 Total Events │ 📅 This Week │ ⏰ Upcoming │ 🎯 Completed        │
└─────────────────────────────────────────────────────────────────────┘

┌─ Left Sidebar ─────────────┐ ┌─ Main Calendar Area ──────────────────┐
│ 📅 Mini Calendar           │ │                                       │
│    [October 2025]          │ │   [Calendar Grid/List/Agenda View]    │
│    S M T W T F S           │ │                                       │
│    1 2 3 4 5 6 7           │ │                                       │
│    8 9 10 11 12 13 14      │ │                                       │
│    ...                     │ │                                       │
│                            │ │                                       │
│ 🌤️ Weather Widget          │ │                                       │
│    ☀️ 72°F Clear           │ │                                       │
│    Dallas • Feels 75°F     │ │                                       │
│                            │ │                                       │
└────────────────────────────┘ └───────────────────────────────────────┘
```

#### 5. Benefits of This Approach

**✅ Keep Current Excellent Weather System**:
- **100% Free**: Open-Meteo API, no API key needed
- **Smart Caching**: 3-hour weather cache, permanent location cache
- **Server-side**: No CORS issues, better performance
- **Advanced Features**: Weather alerts, outdoor detection

**✅ Simple Enhancement**:
- **Browser GPS Priority**: More accurate than IP geolocation
- **Single Widget**: User's location only, not event-specific
- **Clean Integration**: Under mini-calendar in left sidebar
- **Fahrenheit Display**: For US users
- **24-hour Location Cache**: Minimize API calls

---

## Consolidation Target Architecture

### New Structure (2 Modals)

#### 1. **MasterEventModal** - The Universal Event Interface
- Handles ALL event-related functionality
- Context-aware tabs and progressive disclosure
- Smart mode switching without losing data
- Unified state management

#### 2. **ConfirmDialog** - Keep as Generic Utility
- Already well-designed and reusable
- Used throughout the application
- No consolidation needed

---

## MasterEventModal: The Complete Solution

### Core Concept: Context-Aware Adaptive Interface

The `MasterEventModal` will be a single component that adapts its interface based on:
- **Context** (creating, editing, viewing, collaborating)
- **User Intent** (quick add, full creation, template selection)
- **Event State** (draft, active, proposal, completed)
- **User Permissions** (creator, collaborator, viewer)

### Supported Modes

```typescript
type EventModalMode =
  | 'create'           // Standard event creation
  | 'edit'             // Edit existing event
  | 'details'          // View event details
  | 'quick-add'        // Natural language creation
  | 'template-select'  // Choose from templates
  | 'proposal-create'  // Create collaborative proposal
  | 'proposal-vote'    // Vote on existing proposal
  | 'guided'           // First-time user onboarding

type EventModalContext = {
  mode: EventModalMode;
  event?: CalendarEvent;
  proposal?: EventProposal;
  spaceId: string;
  userId: string;
  canEdit: boolean;
  canCollaborate: boolean;
}
```

---

## Step-by-Step Implementation Plan

### Phase 0: Foundation & UI Enhancements (Week 1)

**Goal**: Clean up UI, enhance stats, add weather widget, improve search

#### Step 0.1: Enhanced Stats Cards with Real Data (Day 1)
```typescript
// 1. Update CalendarPage to calculate stats from actual events
// app/(main)/calendar/page.tsx

const statsData = useMemo(() => {
  const now = new Date();
  const startOfWeek = startOfWeek(now);
  const endOfWeek = endOfWeek(now);
  const startOfMonth = startOfMonth(now);
  const endOfMonth = endOfMonth(now);

  return {
    thisWeek: events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isWithinInterval(eventDate, { start: startOfWeek, end: endOfWeek });
    }).length,
    thisMonth: events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isWithinInterval(eventDate, { start: startOfMonth, end: endOfMonth });
    }).length,
    completed: events.filter(event =>
      event.status === 'completed' || (event.end_time && parseISO(event.end_time) < now)
    ).length,
    totalEvents: events.length
  };
}, [events]);

// 2. Create/Update StatsCard component
// components/calendar/StatsCard.tsx - With proper colors and icons

// 3. Update stats labels: This Week, This Month, Completed, Total Events
```

#### Step 0.2: Remove UI Redundancy (Day 1)
```typescript
// app/(main)/calendar/page.tsx - Remove redundant elements

// ❌ REMOVE: Redundant month badge (lines ~720-722)
<span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
  {format(currentMonth, 'MMMM yyyy')}
</span>

// ❌ REMOVE: Redundant Today button (lines ~730-738)
{viewMode !== 'proposal' && viewMode !== 'list' && (
  <button onClick={handleJumpToToday} className="...">
    Today
  </button>
)}

// ✅ KEEP: Live badge (important status indicator)
{realtimeConnected && <LiveBadge />}
```

#### Step 0.3: Enhanced Search Bar (Day 2)
```typescript
// components/calendar/EnhancedSearchBar.tsx - Create new component

// ❌ REMOVE: Keyboard shortcut hint
placeholder="Search Events (Press / to focus)"

// ✅ ADD: Clean search with clear button
placeholder="Search events..."
// + Clear button (X) when typing
// + Enhanced focus states
// + Dynamic search icon/clear button
// + Search results preview (optional)
```

#### Step 0.4: Enhanced Geolocation Service (Day 2)
```typescript
// lib/services/enhanced-geolocation-service.ts - Create new service

export class EnhancedGeolocationService {
  async getCurrentLocation(): Promise<IPLocation> {
    // 1. Try browser GPS first (more accurate)
    // 2. Fallback to existing IP geolocation (already works)
    // 3. Use existing geocoding API for reverse lookup
  }
}

// Keep existing weather service - it's excellent!
// Just enhance the geolocation accuracy
```

#### Step 0.5: Persistent Weather Widget (Day 3)
```typescript
// components/calendar/PersistentWeatherWidget.tsx - Create new component

export function PersistentWeatherWidget() {
  // Use enhanced geolocation + existing weather service
  // Display user's location weather only
  // Fahrenheit for US users
  // Compact design under mini-calendar
}

// Integration in CalendarPage:
<div className="lg:col-span-1 space-y-4">
  <MiniCalendar {...props} />
  <PersistentWeatherWidget /> {/* NEW */}
</div>
```

#### Step 0.6: Test & Validate Foundation (Day 3)
```bash
# Test all Phase 0 changes locally
npm run dev

# Verify:
✅ Stats cards show accurate real-time data
✅ Redundant UI elements removed
✅ Enhanced search works with clear button
✅ Weather widget loads with user's location
✅ All existing functionality still works
✅ No console errors
✅ Responsive design maintained
```

### Phase 1: Modal Foundation Architecture (Week 2)

**Goal**: Build the base MasterEventModal framework while keeping existing modals working

#### Step 1.1: Create Base MasterEventModal Component (Day 1-2)

```typescript
// components/calendar/MasterEventModal.tsx
interface MasterEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: EventModalContext;
  onEventAction: (action: EventAction, data: any) => Promise<void>;
}

export function MasterEventModal({ isOpen, onClose, context, onEventAction }: MasterEventModalProps) {
  // Unified state management
  const [modalState, setModalState] = useState<ModalState>();

  // Dynamic tab configuration
  const tabs = useMemo(() => generateTabs(context), [context]);

  // Smart mode switching
  const switchMode = useCallback((newMode: EventModalMode, preserveData = true) => {
    // Seamlessly switch between modes while preserving user input
  }, []);

  return (
    <AdaptiveModalContainer context={context}>
      <ModalHeader context={context} onModeSwitch={switchMode} />
      <DynamicTabInterface tabs={tabs} context={context} />
      <ModalContent context={context} state={modalState} />
      <SmartActions context={context} onAction={onEventAction} />
    </AdaptiveModalContainer>
  );
}
```

#### Step 1.2: Create Context-Aware Tab System

```typescript
// lib/utils/modal-tab-generator.ts
export function generateTabs(context: EventModalContext): TabConfig[] {
  const baseTabs: TabConfig[] = [];

  switch (context.mode) {
    case 'create':
    case 'edit':
      return [
        { id: 'details', label: 'Event Details', icon: Calendar, component: EventDetailsTab },
        { id: 'templates', label: 'Templates', icon: BookTemplate, component: TemplateTab, condition: () => context.mode === 'create' },
        { id: 'quick-add', label: 'Quick Add', icon: Sparkles, component: QuickAddTab, condition: () => context.mode === 'create' },
        { id: 'collaboration', label: 'Propose Times', icon: Users, component: ProposalTab },
        { id: 'attachments', label: 'Attachments', icon: Paperclip, component: AttachmentsTab },
      ];

    case 'details':
      return [
        { id: 'overview', label: 'Overview', icon: Eye, component: OverviewTab },
        { id: 'comments', label: 'Comments', icon: MessageCircle, component: CommentsTab },
        { id: 'attachments', label: 'Attachments', icon: Paperclip, component: AttachmentsTab },
        { id: 'proposals', label: 'Proposals', icon: Users, component: ProposalVotingTab, condition: () => hasProposals(context.event) },
        { id: 'edit', label: 'Edit', icon: Edit, component: EventDetailsTab, condition: () => context.canEdit },
      ];

    case 'proposal-vote':
      return [
        { id: 'vote', label: 'Vote', icon: CheckCircle, component: VotingTab },
        { id: 'discussion', label: 'Discussion', icon: MessageCircle, component: ProposalCommentsTab },
        { id: 'details', label: 'Details', icon: Info, component: ProposalDetailsTab },
      ];

    // ... other modes
  }

  return baseTabs.filter(tab => !tab.condition || tab.condition());
}
```

#### Step 1.3: Create Smart Mode Switching System

```typescript
// lib/hooks/useModalModeSwitch.ts
export function useModalModeSwitch(initialContext: EventModalContext) {
  const [context, setContext] = useState(initialContext);
  const [preservedData, setPreservedData] = useState<Record<string, any>>({});

  const switchMode = useCallback((
    newMode: EventModalMode,
    options: { preserveData?: boolean; additionalContext?: Partial<EventModalContext> } = {}
  ) => {
    const { preserveData = true, additionalContext = {} } = options;

    // Preserve current form data if requested
    if (preserveData) {
      setPreservedData(current => ({
        ...current,
        [context.mode]: getCurrentFormData()
      }));
    }

    // Switch to new mode with preserved context
    setContext(prev => ({
      ...prev,
      mode: newMode,
      ...additionalContext
    }));
  }, [context]);

  const restoreData = useCallback((mode: EventModalMode) => {
    return preservedData[mode] || {};
  }, [preservedData]);

  return { context, switchMode, restoreData };
}
```

### Phase 2: Core Tab Components (Week 2)

#### Step 2.1: EventDetailsTab (Replaces NewEventModal)

```typescript
// components/calendar/tabs/EventDetailsTab.tsx
export function EventDetailsTab({ context, data, onChange }: TabProps) {
  // All the rich functionality from NewEventModal
  // - Form fields with validation
  // - Emoji picker
  // - File attachments
  // - Recurring patterns
  // - Shopping list integration
  // - Custom colors and categories

  return (
    <div className="space-y-6">
      <EventFormFields data={data} onChange={onChange} context={context} />
      <RecurrenceSettings data={data} onChange={onChange} />
      <AttachmentUploader data={data} onChange={onChange} />
      <ShoppingIntegration data={data} onChange={onChange} />
      <AdvancedSettings data={data} onChange={onChange} />
    </div>
  );
}
```

#### Step 2.2: QuickAddTab (Replaces QuickAddEvent)

```typescript
// components/calendar/tabs/QuickAddTab.tsx
export function QuickAddTab({ context, onDataParsed }: TabProps) {
  const [input, setInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);

  // Switch to full details automatically when AI parses successfully
  const handleSuccessfulParse = useCallback((parsed) => {
    onDataParsed(parsed);
    // Auto-switch to details tab with parsed data
    context.switchMode('create', { preserveData: false });
  }, []);

  return (
    <div className="space-y-4">
      <NaturalLanguageInput
        value={input}
        onChange={setInput}
        onParsed={handleSuccessfulParse}
      />
      <AIPreview parsed={parsedPreview} />
      <ExampleSuggestions onSelect={setInput} />
    </div>
  );
}
```

#### Step 2.3: TemplateTab (Replaces TemplateLibrary)

```typescript
// components/calendar/tabs/TemplateTab.tsx
export function TemplateTab({ context, onTemplateSelect }: TabProps) {
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleTemplateSelect = useCallback((template) => {
    onTemplateSelect(template);
    // Auto-switch to details tab with template data
    context.switchMode('create', {
      preserveData: false,
      additionalContext: { selectedTemplate: template }
    });
  }, []);

  return (
    <div className="space-y-4">
      <CategoryFilter value={selectedCategory} onChange={setSelectedCategory} />
      <TemplateGrid
        templates={templates}
        onSelect={handleTemplateSelect}
        category={selectedCategory}
      />
    </div>
  );
}
```

### Phase 3: Collaborative Features (Week 3)

#### Step 3.1: ProposalTab (Replaces EventProposalModal Create)

```typescript
// components/calendar/tabs/ProposalTab.tsx
export function ProposalTab({ context, data, onChange }: TabProps) {
  const [timeSlots, setTimeSlots] = useState([{ start_time: '', end_time: '' }]);

  return (
    <div className="space-y-6">
      <ProposalInfo />
      <TimeSlotManager slots={timeSlots} onChange={setTimeSlots} />
      <CollaborationSettings data={data} onChange={onChange} />
      <ProposalActions context={context} timeSlots={timeSlots} />
    </div>
  );
}
```

#### Step 3.2: VotingTab (Replaces EventProposalModal Vote)

```typescript
// components/calendar/tabs/VotingTab.tsx
export function VotingTab({ context }: TabProps) {
  const [votes, setVotes] = useState({});
  const [voteSummary, setVoteSummary] = useState(null);

  return (
    <div className="space-y-6">
      <VotingInstructions />
      <TimeSlotVoting
        proposal={context.proposal}
        votes={votes}
        onVote={setVotes}
        summary={voteSummary}
      />
      <VotingActions context={context} />
    </div>
  );
}
```

### Phase 4: Advanced Features (Week 4)

#### Step 4.1: Smart Context Detection

```typescript
// lib/utils/context-detector.ts
export function detectOptimalMode(intent: UserIntent): EventModalMode {
  // AI-powered intent detection
  if (intent.text?.match(/quick|fast|simple/i)) return 'quick-add';
  if (intent.hasTemplate) return 'template-select';
  if (intent.isCollaborative) return 'proposal-create';
  if (intent.hasEvent) return intent.canEdit ? 'edit' : 'details';

  return 'create'; // Default
}

export function suggestNextAction(currentMode: EventModalMode, formData: any): NextAction[] {
  const suggestions: NextAction[] = [];

  if (currentMode === 'quick-add' && formData.parsed) {
    suggestions.push({
      label: 'Add More Details',
      action: () => switchMode('create'),
      icon: Edit
    });
  }

  if (currentMode === 'create' && formData.title) {
    suggestions.push({
      label: 'Propose Multiple Times',
      action: () => switchMode('proposal-create'),
      icon: Users
    });
  }

  return suggestions;
}
```

#### Step 4.2: Progressive Disclosure System

```typescript
// components/calendar/ProgressiveDisclosure.tsx
export function ProgressiveDisclosure({ context, data }: DisclosureProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const sections = useMemo(() => [
    {
      id: 'basic',
      label: 'Basic Details',
      required: true,
      component: BasicFields
    },
    {
      id: 'timing',
      label: 'Date & Time',
      required: true,
      component: TimingFields
    },
    {
      id: 'advanced',
      label: 'Advanced Options',
      required: false,
      component: AdvancedFields,
      condition: () => data.title?.length > 0 // Show when user has started
    },
    {
      id: 'collaboration',
      label: 'Collaboration',
      required: false,
      component: CollaborationFields,
      condition: () => context.canCollaborate
    }
  ], [context, data]);

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <DisclosureSection
          key={section.id}
          section={section}
          isExpanded={section.required || expandedSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
        />
      ))}
    </div>
  );
}
```

### Phase 5: Integration & Optimization (Week 5)

#### Step 5.1: Update Calendar Page Integration

```typescript
// app/(main)/calendar/page.tsx - Updated modal usage
export default function CalendarPage() {
  const [masterModal, setMasterModal] = useState<{
    isOpen: boolean;
    context: EventModalContext;
  }>({
    isOpen: false,
    context: null
  });

  // Unified modal opening function
  const openEventModal = useCallback((mode: EventModalMode, options: any = {}) => {
    const context: EventModalContext = {
      mode,
      spaceId: currentSpace.id,
      userId: user.id,
      canEdit: true,
      canCollaborate: true,
      ...options
    };

    setMasterModal({ isOpen: true, context });
  }, [currentSpace, user]);

  // Replace all individual modal state with unified approach
  const handleNewEvent = () => openEventModal('create');
  const handleQuickAdd = () => openEventModal('quick-add');
  const handleTemplates = () => openEventModal('template-select');
  const handlePropose = () => openEventModal('proposal-create');
  const handleEditEvent = (event) => openEventModal('edit', { event });
  const handleViewEvent = (event) => openEventModal('details', { event });

  return (
    <FeatureLayout>
      {/* All existing calendar UI - VISUAL APPEARANCE UNCHANGED */}

      {/* Enhanced Search Bar */}
      <EnhancedSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
      />

      {/* Enhanced Weather Display */}
      <EnhancedWeatherBadge
        location={userLocation}
        compact={true}
        showForecast={false}
      />

      {/* Single unified modal */}
      <MasterEventModal
        isOpen={masterModal.isOpen}
        onClose={() => setMasterModal(prev => ({ ...prev, isOpen: false }))}
        context={masterModal.context}
        onEventAction={handleEventAction}
      />

      {/* Keep ConfirmDialog separate */}
      <ConfirmDialog {...confirmDialogProps} />
    </FeatureLayout>
  );
}
```

#### Step 5.2: Smart State Management

```typescript
// lib/hooks/useMasterModalState.ts
export function useMasterModalState(context: EventModalContext) {
  const [globalState, setGlobalState] = useState<ModalGlobalState>({
    formData: {},
    attachments: [],
    activeTab: 'details',
    isDirty: false,
    validationErrors: {},
    autoSaveEnabled: true
  });

  // Auto-save functionality
  useAutoSave(globalState.formData, {
    enabled: globalState.autoSaveEnabled,
    key: `event-draft-${context.spaceId}-${context.userId}`,
    debounceMs: 2000
  });

  // Cross-tab data sharing
  const syncData = useCallback((newData: Partial<any>) => {
    setGlobalState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...newData },
      isDirty: true
    }));
  }, []);

  // Validation across all tabs
  const validateAllTabs = useCallback(() => {
    const errors = {};
    // Run validation for all relevant tabs
    return errors;
  }, [globalState.formData]);

  return {
    state: globalState,
    syncData,
    validateAllTabs,
    resetState: () => setGlobalState(initialState),
    markClean: () => setGlobalState(prev => ({ ...prev, isDirty: false }))
  };
}
```

---

## Local Development vs Vercel Deployment

### **Localhost Development (npm run dev)**

#### ✅ **What Works Exactly the Same**:
- **React/Next.js functionality**: 100% identical
- **Component rendering**: Same output
- **API routes**: Identical behavior
- **Database connections**: Same Supabase integration
- **Authentication**: Same auth flows
- **Real-time features**: WebSocket connections work
- **File uploads**: Same functionality
- **Modal interactions**: Identical behavior

#### ⚠️ **Potential Differences**:

1. **Environment Variables**:
   ```bash
   # Localhost reads from .env.local
   NEXT_PUBLIC_OPENWEATHER_API_KEY=your_key

   # Vercel needs these set in dashboard
   # Settings > Environment Variables
   ```

2. **Performance**:
   - **Localhost**: Faster dev builds, slower production optimizations
   - **Vercel**: Optimized production builds, CDN, edge functions

3. **External API Calls**:
   - **Weather API**: Same endpoints, but rate limits might differ
   - **Geolocation**: Browser permissions same, but IP geolocation might return different location on localhost

4. **Hot Reloading**:
   - **Localhost**: Instant updates during development
   - **Vercel**: Requires deployment for changes

#### 🚀 **Best Practice for Development**:

```bash
# 1. Work locally first
npm run dev
# Test at http://localhost:3000

# 2. Test production build locally
npm run build
npm start
# Test production optimizations locally

# 3. When ready, deploy to Vercel
git add .
git commit -m "feature: modal consolidation phase 1"
git push
# Auto-deploys to Vercel
```

#### 🔍 **Testing Strategy**:

1. **Local Development** (`npm run dev`):
   - Rapid iteration and testing
   - Debug console errors
   - Test modal interactions
   - Verify weather API integration

2. **Local Production Build** (`npm run build && npm start`):
   - Test optimized build
   - Check for build warnings
   - Verify all features work in production mode

3. **Vercel Preview Deployment**:
   - Push to feature branch
   - Test in actual production environment
   - Share with team for feedback

4. **Vercel Production** (main branch):
   - Final deployment after testing

### **Answer: 95% Identical Results**

Localhost will show **nearly identical results** to Vercel deployment, with only minor differences in:
- Performance optimizations
- CDN asset delivery
- Edge function execution
- External API rate limiting

For modal consolidation development, **localhost is perfect** for initial development and testing! 🎯

---

## Complete Implementation Sequencing

### Phase 1 Continuation: Modal Foundation Architecture (Week 2)

#### Step 1.2: Context-Aware Tab System (Day 2-3)
```typescript
// lib/utils/modal-tab-generator.ts
export function generateTabs(context: EventModalContext): TabConfig[] {
  // Dynamic tab generation based on mode and permissions
  switch (context.mode) {
    case 'create':
    case 'edit':
      return [
        { id: 'details', label: 'Event Details', icon: Calendar, component: EventDetailsTab },
        { id: 'templates', label: 'Templates', icon: BookTemplate, component: TemplateTab, condition: () => context.mode === 'create' },
        { id: 'quick-add', label: 'Quick Add', icon: Sparkles, component: QuickAddTab, condition: () => context.mode === 'create' },
        { id: 'collaboration', label: 'Propose Times', icon: Users, component: ProposalTab },
        { id: 'attachments', label: 'Attachments', icon: Paperclip, component: AttachmentsTab },
      ];
    case 'details':
      return [
        { id: 'overview', label: 'Overview', icon: Eye, component: OverviewTab },
        { id: 'comments', label: 'Comments', icon: MessageCircle, component: CommentsTab },
        { id: 'attachments', label: 'Attachments', icon: Paperclip, component: AttachmentsTab },
        { id: 'proposals', label: 'Proposals', icon: Users, component: ProposalVotingTab, condition: () => hasProposals(context.event) },
        { id: 'edit', label: 'Edit', icon: Edit, component: EventDetailsTab, condition: () => context.canEdit },
      ];
    // ... other modes
  }
}

// lib/hooks/useModalModeSwitch.ts
export function useModalModeSwitch(initialContext: EventModalContext) {
  // Smart mode switching with data preservation
}
```

#### Step 1.3: Parallel Testing Setup (Day 3)
```bash
# Keep existing modals working while building new system
# Feature flag implementation for gradual rollout
# A/B testing setup for user validation
```

### Phase 2: Core Tab Components (Week 3)

**Goal**: Replace existing modal functionality with unified tab-based system

#### Step 2.1: EventDetailsTab - Replace NewEventModal (Day 1-2)
```typescript
// components/calendar/tabs/EventDetailsTab.tsx
// Migrate all NewEventModal functionality:
// - Complete form fields with validation
// - Emoji picker and file attachments
// - Recurring patterns and shopping integration
// - Custom colors and categories
// - All existing UI/UX preserved
```

#### Step 2.2: QuickAddTab - Replace QuickAddEvent (Day 2)
```typescript
// components/calendar/tabs/QuickAddTab.tsx
// - Natural language input processing
// - Real-time AI preview of parsed information
// - Auto-switch to details tab when successful
// - Example suggestions and help text
```

#### Step 2.3: TemplateTab - Replace TemplateLibrary (Day 3)
```typescript
// components/calendar/tabs/TemplateTab.tsx
// - Template selection and category filtering
// - Auto-switch to details tab with template data
// - System and custom template support
// - Usage tracking and popular templates
```

#### Step 2.4: Integration Testing (Day 3)
```bash
# Comprehensive testing of new tab system
# Verify feature parity with existing modals
# Test mode switching and data preservation
# Performance benchmarking
```

### Phase 3: Collaborative Features (Week 4)

**Goal**: Integrate proposal and voting functionality into unified system

#### Step 3.1: ProposalTab - Replace EventProposalModal Create (Day 1-2)
```typescript
// components/calendar/tabs/ProposalTab.tsx
// - Time slot management (up to 5 options)
// - Collaboration settings and permissions
// - Proposal creation workflow
// - Integration with existing proposal system
```

#### Step 3.2: VotingTab - Replace EventProposalModal Vote (Day 2-3)
```typescript
// components/calendar/tabs/VotingTab.tsx
// - Voting interface (Available, Preferred, Unavailable)
// - Real-time vote summary and updates
// - Proposal approval workflow for creators
// - Discussion and comments integration
```

#### Step 3.3: Enhanced Detail View Integration (Day 3)
```typescript
// Integrate proposal functionality into EventDetailModal
// Add proposal tabs to existing event details
// Unified event interaction experience
// Real-time collaboration features
```

### Phase 4: Advanced Features & Intelligence (Week 5)

**Goal**: Add smart features and optimize user experience

#### Step 4.1: Smart Context Detection (Day 1-2)
```typescript
// lib/utils/context-detector.ts
// - AI-powered intent detection from user actions
// - Smart suggestions for next actions
// - Context-aware tab recommendations
// - Usage pattern learning
```

#### Step 4.2: Progressive Disclosure System (Day 2-3)
```typescript
// components/calendar/ProgressiveDisclosure.tsx
// - Smart form complexity based on user progress
// - Conditional field display
// - Expert vs. beginner mode detection
// - Contextual help and guidance
```

#### Step 4.3: Performance Optimization (Day 3)
```typescript
// - Bundle code splitting and optimization
// - State management performance improvements
// - Caching strategies for better responsiveness
// - Memory usage optimization
```

### Phase 5: Full Integration & Migration (Week 6)

**Goal**: Complete integration and remove old system

#### Step 5.1: Calendar Page Integration (Day 1-2)
```typescript
// app/(main)/calendar/page.tsx
// - Replace all individual modal state with MasterEventModal
// - Update all event handlers and modal triggers
// - Seamless integration with existing UI
// - Maintain all current functionality
```

#### Step 5.2: Comprehensive Testing & Bug Fixes (Day 2-3)
```bash
# - End-to-end testing of entire system
# - User acceptance testing with real workflows
# - Performance monitoring and optimization
# - Cross-browser and mobile testing
# - Bug fixes and edge case handling
```

#### Step 5.3: Migration Completion & Cleanup (Day 3)
```typescript
// - Remove old modal components safely
// - Update all imports and references
// - Documentation updates
# - Code cleanup and final optimization
# - Production deployment preparation
```

---

## Implementation Timeline Summary

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **0: Foundation** | Week 1 | UI Enhancement | ✅ Enhanced stats, weather widget, clean UI |
| **1: Modal Foundation** | Week 2 | Architecture | ✅ Base MasterEventModal, tab system framework |
| **2: Core Functionality** | Week 3 | Feature Migration | ✅ Details, QuickAdd, Template tabs working |
| **3: Collaboration** | Week 4 | Proposal System | ✅ Proposal creation, voting, discussion tabs |
| **4: Intelligence** | Week 5 | Smart Features | ✅ Context detection, progressive disclosure |
| **5: Integration** | Week 6 | Final Migration | ✅ Complete consolidation, cleanup, deployment |

**Total Timeline**: 6 weeks for complete transformation

---

## Pre-Implementation Readiness Checklist

### Before Starting (Preparation)
- [ ] **Backup current system**: Create feature branch from main
- [ ] **Environment setup**: Verify npm run dev works locally
- [ ] **Dependencies review**: Check all required packages installed
- [ ] **Testing setup**: Ensure existing tests pass

### Week 1 - Foundation (Phase 0)
- [ ] **Day 1**: Enhanced stats cards with real-time data calculation
- [ ] **Day 1**: Remove redundant UI elements (month badge, today button)
- [ ] **Day 2**: Enhanced search bar with clear button functionality
- [ ] **Day 2**: Enhanced geolocation service (browser GPS + IP fallback)
- [ ] **Day 3**: Persistent weather widget under mini-calendar
- [ ] **Day 3**: Comprehensive testing of all foundation changes

### Week 2 - Modal Foundation (Phase 1)
- [ ] **Day 1-2**: Create base MasterEventModal component architecture
- [ ] **Day 2-3**: Build context-aware tab system and mode switching
- [ ] **Day 3**: Setup parallel testing (keep old modals functional)

### Week 3 - Core Migration (Phase 2)
- [ ] **Day 1-2**: EventDetailsTab with full NewEventModal functionality
- [ ] **Day 2**: QuickAddTab with natural language processing
- [ ] **Day 3**: TemplateTab with selection and auto-switching
- [ ] **Day 3**: Integration testing and feature parity verification

### Week 4 - Collaboration (Phase 3)
- [ ] **Day 1-2**: ProposalTab for creating collaborative events
- [ ] **Day 2-3**: VotingTab with real-time collaboration features
- [ ] **Day 3**: Enhanced detail view with proposal integration

### Week 5 - Intelligence (Phase 4)
- [ ] **Day 1-2**: Smart context detection and suggestions
- [ ] **Day 2-3**: Progressive disclosure based on user actions
- [ ] **Day 3**: Performance optimization and bundle analysis

### Week 6 - Integration (Phase 5)
- [ ] **Day 1-2**: Full calendar page integration with MasterEventModal
- [ ] **Day 2-3**: Comprehensive testing, bug fixes, optimization
- [ ] **Day 3**: Migration completion, cleanup, production deployment

---

## Success Validation Criteria

### Technical Metrics
- [ ] **Code Reduction**: 46% reduction in modal code (2,240 → 1,200 lines)
- [ ] **Component Consolidation**: 71% reduction (7 → 2 modal components)
- [ ] **Performance**: 30% bundle size reduction through shared components
- [ ] **Memory Usage**: Single modal instance vs multiple overlays

### User Experience Validation
- [ ] **Seamless Transitions**: No jarring switches between modal modes
- [ ] **Data Preservation**: User input never lost during mode changes
- [ ] **Contextual Intelligence**: Right tools appear at the right time
- [ ] **Progressive Complexity**: Simple → complex based on user needs

### Functional Requirements
- [ ] **Feature Parity**: All existing modal functionality preserved
- [ ] **Enhanced Search**: Clean interface with proper clear button
- [ ] **Accurate Stats**: Real-time data from actual events
- [ ] **Working Weather**: Persistent widget with user's location
- [ ] **Mobile Responsive**: All features work on mobile devices

This comprehensive plan ensures a systematic, safe migration to the consolidated modal system while enhancing the overall user experience and code maintainability.