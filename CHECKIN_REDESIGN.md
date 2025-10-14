# Daily Check-In Feature Redesign

## Overview
Complete redesign of the daily check-in feature to be more compact, valuable, and engaging while reducing dashboard space usage by 85%.

---

## Problem Statement

**Current Issues:**
- Takes up ~48% of dashboard (800px height)
- Minimal value for space consumed
- Basic mood tracking without depth
- Large history section with limited context
- Not engaging enough for daily use

**User Feedback:**
> "It takes up too much space, almost half the page, for minimal stuff."

---

## Solution: Hybrid Smart Check-In

**Core Concept:** Adaptive interface that starts minimal and expands intelligently based on user input and mood patterns.

**Space Reduction:**
- Current: ~800px (48% of dashboard)
- New Default: ~120px (7% of dashboard)
- New Expanded: ~250px (15% of dashboard)
- **Space Saved: 65-85%**

---

## Design Philosophy

### 1. **Minimal by Default**
- Single-row mood selector
- Partner's mood visibility (side-by-side)
- Compact streak counter
- Clean, unobtrusive design

### 2. **Intelligent Expansion**
- Positive mood → Optional gratitude prompt
- Negative mood → Supportive "Want to talk?" option
- Neutral → Quick note option
- Adapts based on user patterns

### 3. **Partner Connection**
- See partner's mood at a glance
- Send reactions/validations (❤️, 🤗, 💪)
- Quick support messages
- Real-time emotional awareness

### 4. **Meaningful Insights**
- Weekly mood trends
- Pattern detection (e.g., "Mondays are tough")
- Streak milestones with celebrations
- Monthly emotional health reports

---

## Implementation Phases

### Phase 1: Core Smart Check-In (Week 1)
**Goal:** Minimal, functional check-in with smart expansion

**Features:**
- [ ] Compact mood selector (5 emojis, single row)
- [ ] Conditional expansion based on mood
  - Great/Good → Optional gratitude note
  - Meh/Rough → Supportive prompt
- [ ] Partner mood visibility (side-by-side circles)
- [ ] Minimal streak counter badge
- [ ] Real-time sync

**Database Changes:**
- Add `highlights` field (TEXT, optional)
- Add `challenges` field (TEXT, optional)
- Add `gratitude` field (TEXT, optional)
- Keep existing `mood` and `note` fields

**Files to Modify:**
- `app/(main)/dashboard/page.tsx` - Complete UI redesign
- `lib/services/checkins-service.ts` - Update to support new fields
- `supabase/migrations/` - New migration for additional fields

---

### Phase 2: Validation System (Week 2)
**Goal:** Partner reaction and support features

**Features:**
- [ ] Tap partner's mood to send reaction
- [ ] Quick support messages
- [ ] Reaction history
- [ ] Push notifications for reactions
- [ ] Validation streak tracking

**Database Changes:**
- Create `checkin_reactions` table
  - `id` (uuid)
  - `checkin_id` (uuid, FK to daily_checkins)
  - `from_user_id` (uuid)
  - `reaction_type` (enum: heart, hug, strength, custom)
  - `message` (text, optional)
  - `created_at` (timestamp)

**New Files:**
- `lib/services/reactions-service.ts`
- `components/checkins/ReactionButton.tsx`
- `components/checkins/ReactionNotification.tsx`

---

### Phase 3: Smart Features (Week 3)
**Goal:** Insights and pattern detection

**Features:**
- [ ] Weekly mood insights
- [ ] Pattern detection algorithm
- [ ] Streak milestone celebrations
- [ ] Monthly emotional health report
- [ ] Mood trend charts (optional)

**New Files:**
- `lib/analytics/mood-insights.ts`
- `components/checkins/WeeklyInsights.tsx`
- `components/checkins/MoodChart.tsx`

---

### Phase 4: Polish (Week 4)
**Goal:** Beautiful animations and refinements

**Features:**
- [ ] Mood orb animations with glow effects
- [ ] Smooth expand/collapse transitions
- [ ] Customizable themes
- [ ] Export mood history (CSV/PDF)
- [ ] Integration with Rowan features

**Enhancements:**
- Advanced Tailwind animations
- Framer Motion for complex transitions
- Chart.js or Recharts for visualizations

---

## User Experience Flow

### First-Time User
1. Sees minimal mood selector
2. Selects mood
3. Smart prompt appears based on mood
4. Optional: Add context (1-line note)
5. Sees streak counter (Day 1!)
6. Partner's mood appears when they check in

### Returning User (Positive Mood)
1. Selects "😊 Great"
2. Prompt: "What are you grateful for today?"
3. Optional: Type quick gratitude
4. See partner's mood + send ❤️ reaction
5. View 7-day streak badge

### Returning User (Negative Mood)
1. Selects "😫 Rough"
2. Prompt: "Want to talk about it?" + "I'm here for you" button
3. Optional: Share what's challenging
4. Partner gets notification to check in
5. Can send/receive supportive reactions

---

## Technical Architecture

### Database Schema

#### `daily_checkins` (Extended)
```sql
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  space_id UUID NOT NULL REFERENCES spaces(id),
  date DATE NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'meh', 'rough')),
  note TEXT,
  highlights TEXT,      -- NEW: Quick wins/positives
  challenges TEXT,      -- NEW: What was difficult
  gratitude TEXT,       -- NEW: Gratitude prompt
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, space_id, date)
);
```

#### `checkin_reactions` (New Table)
```sql
CREATE TABLE checkin_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'hug', 'strength', 'custom')),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(checkin_id, from_user_id)
);
```

### Component Structure
```
components/checkins/
├── MoodSelector.tsx           - 5-emoji selector
├── SmartPrompt.tsx            - Conditional prompts based on mood
├── PartnerMoodDisplay.tsx     - Side-by-side mood circles
├── ReactionButton.tsx         - Send reactions to partner
├── StreakBadge.tsx           - Compact streak counter
├── WeeklyInsights.tsx        - Mood trend summary
└── CheckInCard.tsx           - Main compact card component
```

---

## Design Specifications

### Visual Design

#### Compact Mode (Default)
```
┌─────────────────────────────────────────┐
│ How are you feeling? 🔥 3 day streak!  │
│                                         │
│  😊   🙂   😐   😔   😫                │
│                                         │
│  You: 😊    Partner: 🙂  [Send ❤️]    │
└─────────────────────────────────────────┘
Height: ~120px
```

#### Expanded Mode (After Selection)
```
┌─────────────────────────────────────────┐
│ Feeling Great! 🔥 3 day streak!        │
│                                         │
│  😊   🙂   😐   😔   😫                │
│                                         │
│ ✨ What are you grateful for today?    │
│ [Optional text input...]                │
│                                         │
│  You: 😊    Partner: 🙂  [Send ❤️]    │
└─────────────────────────────────────────┘
Height: ~250px
```

### Color Palette
- Great: Green gradient (#10b981 → #059669)
- Good: Blue gradient (#3b82f6 → #2563eb)
- Okay: Yellow gradient (#f59e0b → #d97706)
- Meh: Orange gradient (#f97316 → #ea580c)
- Rough: Red gradient (#ef4444 → #dc2626)

### Animations
- Mood selection: Scale + glow effect
- Expansion: Smooth height transition (300ms ease)
- Partner mood update: Gentle pulse
- Reaction sent: Confetti burst
- Streak milestone: Celebration animation

---

## Success Metrics

### Engagement
- Daily check-in rate > 80%
- Partner reaction rate > 60%
- Average session time: 30-90 seconds
- 7-day streak retention > 70%

### UX Improvements
- Space usage reduced by 85%
- User satisfaction score > 4.5/5
- "Valuable" rating > 80%
- Daily active users +40%

### Technical
- Page load time < 200ms
- Real-time sync < 500ms
- Zero data loss
- 99.9% uptime

---

## Rollback Plan

### Quick Rollback (If Critical Issues)
1. Revert to commit: `2fea007`
2. Keep database changes (backward compatible)
3. Disable new features via feature flag

### Partial Rollback
- Keep Phase 1, disable Phases 2-4
- Keep database schema, revert UI only
- A/B test old vs new with 50/50 split

### Migration Path
All database changes are additive (no deletions), ensuring:
- Old code can still read new schema
- No data loss during rollback
- Seamless migration back if needed

---

## Future Enhancements (Post-Phase 4)

1. **Voice Check-Ins**: Quick voice note option
2. **Photo Attachments**: Share moment of the day
3. **Daily Questions**: Rotate expert-crafted prompts
4. **Couple Challenges**: 7-day gratitude challenge, etc.
5. **Integration**: Link mood to tasks, calendar, goals
6. **AI Insights**: Pattern detection using ML
7. **Therapist Export**: Share mood history with professionals

---

## Research & Inspiration

### Apps Analyzed
- **Paired**: Daily questions, answer-locking mechanism
- **MoodMe**: Validation features, mood tracking
- **Between**: Couple communication, private sharing
- **Reflectly**: Beautiful UI, intelligent prompts

### Key Learnings
- Minimal UI drives higher engagement
- Partner visibility increases accountability
- Conditional prompts feel personalized
- Streaks and milestones boost retention
- Quick reactions strengthen connection

---

## Timeline

| Phase | Duration | Deliverables | Status |
|-------|----------|--------------|--------|
| Phase 1 | Week 1 | Core smart check-in | ✅ Complete |
| Phase 2 | Week 2 | Validation system | ✅ Complete (migration pending) |
| Phase 3 | Week 3 | Smart insights | 🟡 Service layer complete, UI pending |
| Phase 4 | Week 4 | Polish & animations | ⚪ Pending |

---

## Team Notes

### Development
- Use existing `checkInsService` as foundation
- Maintain backward compatibility
- Test real-time sync thoroughly
- Optimize for mobile-first

### Design
- Follow Rowan design system
- Use existing color gradients
- Maintain dark mode support
- Ensure accessibility (ARIA labels)

### Testing
- Unit tests for mood logic
- Integration tests for reactions
- E2E tests for full flow
- Performance testing (load times)

---

## Changelog

### v2.0.0 - Phase 1 (Current)
- Complete UI redesign (85% space reduction)
- Smart conditional prompts
- Partner mood visibility
- Real-time sync improvements

### v1.0.0 - Original
- Basic mood tracking
- Note field
- Check-in history
- Streak counter
- Stats display

---

## Contact & Feedback

**Project Lead**: Claude
**Developer**: Claude Code
**Last Updated**: October 14, 2025
**Status**: 75% Complete - Phase 1-2 done, Phase 3 in progress

---

## Implementation Status (October 14, 2025)

### ✅ Completed
- **Phase 1**: All features implemented and deployed
  - Compact mood selector with 5 emojis
  - Smart conditional prompts (gratitude, highlights, challenges)
  - Partner mood visibility side-by-side
  - Streak counter with real-time tracking
  - Database schema extended (highlights, challenges, gratitude fields)

- **Phase 2**: Code complete, migration pending
  - `checkin_reactions` table created with RLS policies
  - Reactions service with full CRUD operations
  - Reaction UI integrated (❤️ 🤗 💪 buttons)
  - Real-time reaction sync implemented
  - **Blocker**: Database migration pending (Supabase connection timeout)

- **Phase 3**: Service layer complete
  - Mood insights analytics service created
  - Weekly summary generation with mood distribution
  - Pattern detection (Monday blues, Friday highs, trends)
  - Monthly emotional health reports
  - Confidence-based insight scoring

### 🟡 In Progress
- **Phase 3**: UI components needed
  - WeeklyInsights component (display trends in Journal view)
  - MoodChart component (optional visualization)
  - Integration into dashboard

### ⚪ Pending
- **Phase 4**: Polish and animations
  - Advanced Tailwind animations
  - Framer Motion transitions
  - Customizable themes
  - Export functionality

### 🚧 Blockers
- Database migrations cannot be applied due to Supabase connection timeouts
- Once connectivity is restored, run: `npx supabase db push`
- Affected features: Reaction buttons (will show but not persist until migration runs)

### 📝 Next Steps
1. Restore Supabase connectivity and run migrations
2. Build WeeklyInsights UI component
3. Add mood chart visualization (optional)
4. Implement Phase 4 polish features
5. End-to-end testing
6. Delete this plan file when 100% complete
