# 🔔 Notification System Comprehensive Improvement Plan

**Date**: October 17, 2025
**Status**: 🚧 In Progress
**Goal**: Build a production-ready, anti-fatigue notification system

---

## 📋 Current Infrastructure Status

### ✅ **Ready (Already Configured)**
- **Email Service**: Resend API (`re_PfFAbc7a_M7uMzx8DxLWnt5h99q4MZ5kF`)
- **Push Notifications**: VAPID keys configured for `rowanapp.com`
- **Database**: Supabase with user authentication
- **Queue/Cache**: Upstash Redis for reliable delivery
- **Domain**: Custom domain `rowanapp.com` with SSL

### 🔧 **Needs Implementation**
- Email templates and sending logic
- Push notification service worker
- Digest/batching system
- Preference management backend
- Quiet hours enforcement

---

## 🎯 Phase 1: Database Schema & Preferences Backend

### **1.1 Create Notification Preferences Table**
```sql
-- Database migration needed
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email Notifications
  email_task_assignments BOOLEAN DEFAULT true,
  email_event_reminders BOOLEAN DEFAULT true,
  email_new_messages BOOLEAN DEFAULT true,
  email_shopping_lists BOOLEAN DEFAULT true,
  email_meal_reminders BOOLEAN DEFAULT true,
  email_general_reminders BOOLEAN DEFAULT true,

  -- Push Notifications
  push_enabled BOOLEAN DEFAULT false,
  push_task_updates BOOLEAN DEFAULT true,
  push_reminders BOOLEAN DEFAULT true,
  push_messages BOOLEAN DEFAULT true,
  push_shopping_updates BOOLEAN DEFAULT true,
  push_event_alerts BOOLEAN DEFAULT true,

  -- Digest Settings
  digest_frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly'
  digest_time TIME DEFAULT '08:00:00',

  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  timezone TEXT DEFAULT 'UTC',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### **1.2 Create Notification Queue Table**
```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL, -- 'email', 'push'
  category TEXT NOT NULL, -- 'task', 'reminder', 'message', etc.
  priority TEXT DEFAULT 'normal', -- 'urgent', 'normal', 'low'

  subject TEXT,
  content JSONB NOT NULL,

  -- Delivery settings
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  digest_eligible BOOLEAN DEFAULT true,

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'batched'
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notification_queue_user_status ON notification_queue(user_id, status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_category ON notification_queue(category);
```

### **1.3 Update Settings Page Backend**
- [ ] Create API endpoint: `PUT /api/notifications/preferences`
- [ ] Wire up toggle switches to save preferences
- [ ] Add quiet hours time pickers
- [ ] Add digest frequency selector

---

## 🎯 Phase 2: Email System Implementation

### **2.1 Email Templates (React Email)**
- [ ] **Install React Email**: `npm install react-email @react-email/components`
- [ ] Create template components:
  - [ ] `TaskAssignmentEmail.tsx`
  - [ ] `EventReminderEmail.tsx`
  - [ ] `NewMessageEmail.tsx`
  - [ ] `ShoppingListEmail.tsx`
  - [ ] `MealReminderEmail.tsx`
  - [ ] `GeneralReminderEmail.tsx`
  - [ ] `DailyDigestEmail.tsx` (Multiple notifications batched)

### **2.2 Email Service Implementation**
- [ ] Create `lib/services/email-service.ts`
- [ ] Implement functions:
  - [ ] `sendTaskAssignment()`
  - [ ] `sendEventReminder()`
  - [ ] `sendMessageNotification()`
  - [ ] `sendShoppingListUpdate()`
  - [ ] `sendMealReminder()`
  - [ ] `sendGeneralReminder()`
  - [ ] `sendDailyDigest()`

### **2.3 Email Queue Processing**
- [ ] Create `lib/services/email-queue-service.ts`
- [ ] Implement queue processing logic
- [ ] Add retry mechanism for failed emails
- [ ] Add unsubscribe link generation

---

## 🎯 Phase 3: Push Notification System

### **3.1 Service Worker Setup**
- [ ] Create `public/sw.js` service worker
- [ ] Implement push event listener
- [ ] Add notification click handling
- [ ] Test offline notification reception

### **3.2 Push Subscription Management**
- [ ] Create `lib/services/push-service.ts`
- [ ] Implement browser permission request
- [ ] Store push subscriptions in database
- [ ] Handle subscription updates/removal

### **3.3 Push Notification Sending**
- [ ] Create server-side push sender
- [ ] Implement VAPID authentication
- [ ] Add push notification templates
- [ ] Test cross-browser compatibility

---

## 🎯 Phase 4: Smart Digest System (Anti-Fatigue)

### **4.1 Digest Logic Implementation**
- [ ] Create `lib/services/digest-service.ts`
- [ ] Implement notification batching algorithm:
  - [ ] Group by category and priority
  - [ ] Respect user digest frequency preference
  - [ ] Smart timing (respect timezone and quiet hours)

### **4.2 Digest Templates**
- [ ] Daily digest email template
- [ ] Weekly digest email template
- [ ] Push notification digest
- [ ] Urgent notification bypass logic

### **4.3 Cron Job for Digest Delivery**
- [ ] Create `app/api/cron/send-digests/route.ts`
- [ ] Implement timezone-aware scheduling
- [ ] Add digest generation and sending
- [ ] Configure Vercel cron (or external service)

---

## 🎯 Phase 5: Integration with Existing Features

### **5.1 Tasks & Chores Integration**
- [ ] Hook into task assignment events
- [ ] Add deadline reminder notifications
- [ ] Implement completion notifications

### **5.2 Calendar & Events Integration**
- [ ] Event reminder notifications (15min, 1hr, 1day before)
- [ ] Meeting invitation notifications
- [ ] Schedule change notifications

### **5.3 Messages Integration**
- [ ] New message notifications
- [ ] @mention notifications
- [ ] Read receipt notifications

### **5.4 Shopping Lists Integration**
- [ ] List shared notifications
- [ ] Item added notifications
- [ ] Shopping trip reminders

### **5.5 Meal Planning Integration**
- [ ] Meal prep reminders
- [ ] Shopping list generation notifications
- [ ] Recipe suggestion notifications

### **5.6 Goals & Planning Integration**
- [ ] Milestone achievement notifications
- [ ] Progress update reminders
- [ ] Goal deadline notifications

---

## 🎯 Phase 6: Advanced Features

### **6.1 Quiet Hours & Smart Timing**
- [ ] Implement timezone detection
- [ ] Respect quiet hours for all notification types
- [ ] Smart delivery timing (work hours for tasks, evening for meals)
- [ ] Weekend/holiday awareness

### **6.2 Notification Analytics**
- [ ] Track delivery rates
- [ ] Monitor user engagement
- [ ] A/B test different digest frequencies
- [ ] Optimize send times based on user behavior

### **6.3 Advanced Preferences**
- [ ] Per-space notification settings
- [ ] Keyword filtering
- [ ] VIP contacts (always notify)
- [ ] Smart notification snoozing

---

## 🎯 Phase 7: Testing & Quality Assurance

### **7.1 Comprehensive Testing**
- [ ] Unit tests for all notification services
- [ ] Integration tests for email/push delivery
- [ ] Test digest batching logic
- [ ] Test quiet hours enforcement
- [ ] Cross-browser push notification testing

### **7.2 Performance Testing**
- [ ] Load test notification queue processing
- [ ] Test Redis queue performance
- [ ] Monitor email delivery rates
- [ ] Optimize database queries

### **7.3 User Acceptance Testing**
- [ ] Test all notification types
- [ ] Verify preference changes work
- [ ] Test digest delivery timing
- [ ] Validate unsubscribe functionality

---

## 📊 Success Metrics

### **Functional Requirements**
- [ ] ✅ All 12 notification types working (6 email + 6 push)
- [ ] ✅ Preferences save and affect delivery
- [ ] ✅ Digest system reduces notification fatigue
- [ ] ✅ Quiet hours respected 100% of the time
- [ ] ✅ 99%+ email delivery rate
- [ ] ✅ Cross-browser push notifications work

### **User Experience Requirements**
- [ ] ✅ Notification preferences UI is intuitive
- [ ] ✅ Unsubscribe process is simple
- [ ] ✅ Users can easily adjust digest frequency
- [ ] ✅ No spam or notification fatigue complaints
- [ ] ✅ Notifications are timely and relevant

---

## 🚀 Implementation Order

### **Week 1**: Foundation
1. Database schema creation
2. Preferences backend API
3. Basic email service setup

### **Week 2**: Email System
1. Email templates creation
2. Email sending implementation
3. Queue processing system

### **Week 3**: Push Notifications
1. Service worker setup
2. Push subscription management
3. Push notification sending

### **Week 4**: Digest System
1. Digest logic implementation
2. Smart batching algorithm
3. Cron job setup

### **Week 5**: Integration
1. Hook into all existing features
2. Test notification triggers
3. Quiet hours implementation

### **Week 6**: Testing & Polish
1. Comprehensive testing
2. Performance optimization
3. Documentation updates

---

## 📝 Notes

- **Anti-Fatigue Strategy**: Default to daily digest, allow realtime for urgent
- **Privacy**: All notification data encrypted, GDPR compliant
- **Reliability**: Redis queue ensures no notifications lost
- **Scalability**: Built to handle thousands of users
- **Maintainability**: Well-documented, typed, tested code

---

**Next Action**: Start with Phase 1 - Database Schema & Preferences Backend