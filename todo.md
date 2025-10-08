# Rowan App - Future Enhancements & TODO

## 💎 Monetization & Premium Features (Priority: HIGH)

### Multiple Spaces Premium Feature 🎯
**Status:** Feature implemented, needs pricing tier gating

**Recommendation:** Gate multiple spaces as a premium feature
- ✅ **Free Tier:** 1 shared space with unlimited members
- 💰 **Premium Tier ($4.99-9.99/month):** Unlimited spaces

**Implementation Tasks:**
- [ ] Add `max_spaces` field to user/subscription model
- [ ] Create subscription tiers table (free, premium, enterprise)
- [ ] Add limit check in CreateSpaceModal before allowing creation
- [ ] Build upgrade prompt modal with pricing details
- [ ] Add "Upgrade to Premium" CTA when limit reached
- [ ] Implement payment integration (Stripe)
- [ ] Create subscription management page
- [ ] Add billing portal integration
- [ ] Display current plan on Settings page
- [ ] Add plan comparison page

**Rationale:**
- 80% of users (couples, single families) only need 1 space
- Proven monetization model (Slack, Notion, Trello)
- Feature already built - just gate it
- Clear value proposition for power users
- No wasted development effort

---

## 🔐 Authentication & Security (Priority: HIGH)

- [ ] Implement Supabase Auth (replace mock auth context)
- [ ] Add Row Level Security (RLS) policies to all database tables
- [ ] Create user registration flow
- [ ] Create login flow
- [ ] Implement password reset
- [ ] Add email verification
- [ ] Create space invitation system
- [ ] Implement role-based permissions (admin, member, viewer)
- [ ] Add session management
- [ ] Implement OAuth (Google, Apple, GitHub)

## 📍 Reminders Enhancements

- [ ] **Google Maps API integration** for location-based reminders
- [ ] Geolocation tracking for proximity alerts
- [ ] Push notifications for reminder alerts
- [ ] Recurring reminders
- [ ] Voice input for quick reminder creation
- [ ] Attachment support (images, files)
- [ ] Share reminders with space members
- [ ] Reminder templates

## 📅 Calendar Enhancements

- [ ] **Implement recurrence rules** (daily, weekly, monthly, custom)
- [ ] Build actual calendar grid view (month/week/day views)
- [ ] Google Calendar integration (sync both ways)
- [ ] iCal import/export
- [ ] Event attendees and RSVP tracking
- [ ] Video conferencing integration (Zoom, Google Meet)
- [ ] Calendar sharing and permissions
- [ ] Time zone support
- [ ] Event reminders (push notifications, email)
- [ ] Drag-and-drop event rescheduling

## 💬 Messages Enhancements

- [ ] **Real-time messaging** (Supabase Realtime or WebSockets)
- [ ] File attachments (images, documents, videos)
- [ ] Voice messages
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Message reactions (emoji)
- [ ] Message search
- [ ] Message threading/replies
- [ ] User mentions (@username)
- [ ] Message editing and deletion
- [ ] Push notifications for new messages
- [ ] Unread message badges

## 🛒 Shopping Enhancements

- [ ] **Barcode scanning** for quick item addition
- [ ] Product database integration
- [ ] Price tracking and alerts
- [ ] Store location integration
- [ ] Aisle/category organization
- [ ] Recipe-to-shopping-list conversion
- [ ] Share lists with family members
- [ ] Item suggestions based on history
- [ ] Budget tracking per list
- [ ] Receipt scanning and storage

## 🍽️ Meals Enhancements

- [ ] **Recipe API integration** (Spoonacular, Edamam)
- [ ] Nutrition information display
- [ ] Dietary restrictions and preferences
- [ ] Meal plan calendar view
- [ ] Grocery list generation from meal plan
- [ ] Recipe scaling (portions)
- [ ] Recipe photos and step-by-step instructions
- [ ] Cooking timer integration
- [ ] Meal prep tracking
- [ ] Favorite recipes
- [ ] Recipe sharing within space

## 🏠 Household Enhancements

### Chores
- [ ] Push notifications for chore assignments
- [ ] Recurring chores automation
- [ ] Chore rotation/scheduling
- [ ] Points/rewards system for completed chores
- [ ] Chore templates
- [ ] Photo proof of completion

### Budget
- [ ] **Receipt scanning** (OCR)
- [ ] Payment integration (Stripe, PayPal)
- [ ] Bank account sync (Plaid)
- [ ] Budget vs. actual tracking
- [ ] Expense categories and tags
- [ ] Monthly/yearly reports
- [ ] Export to CSV/Excel
- [ ] Split expenses between members
- [ ] Bill reminders

## 🎯 Goals Enhancements

- [ ] **Progress visualization** (charts, graphs)
- [ ] Habit tracking with streaks
- [ ] Gamification (badges, achievements)
- [ ] Goal templates
- [ ] Sub-goals and dependencies
- [ ] Deadline reminders
- [ ] Share goals with accountability partners
- [ ] Progress photos
- [ ] Journal entries
- [ ] Weekly/monthly reviews

## 🔔 Notifications System

- [ ] Push notification infrastructure
- [ ] Email notifications
- [ ] SMS notifications (Twilio)
- [ ] Notification preferences per feature
- [ ] Daily digest emails
- [ ] In-app notification center
- [ ] Notification sounds and badges

## 📱 Mobile & Cross-Platform

- [ ] Progressive Web App (PWA) setup
- [ ] Offline support and data sync
- [ ] React Native mobile app
- [ ] iOS app (App Store)
- [ ] Android app (Google Play)
- [ ] Desktop app (Electron)
- [ ] Browser extensions

## 🎨 UI/UX Enhancements

- [ ] Onboarding flow for new users
- [ ] Interactive tutorial/walkthrough
- [ ] Dark mode persistence (save preference)
- [ ] Custom themes
- [ ] Accessibility improvements (ARIA, keyboard navigation)
- [ ] Responsive design refinements
- [ ] Loading states and skeletons
- [ ] Error boundary components
- [ ] Toast notifications
- [ ] Confirmation modals
- [ ] Keyboard shortcuts

## 🔍 Search & Discovery

- [ ] Global search across all features
- [ ] Full-text search (Supabase FTS)
- [ ] Search filters and sorting
- [ ] Recent searches
- [ ] Search suggestions
- [ ] Tag system across features

## 📊 Analytics & Reporting

- [ ] Usage analytics dashboard
- [ ] Export data (PDF, CSV, JSON)
- [ ] Custom reports
- [ ] Data visualization
- [ ] Activity feed
- [ ] Insights and trends

## 🛠️ Settings & Configuration

- [ ] Implement Settings page
- [ ] User profile editing
- [ ] Avatar upload
- [ ] Space settings
- [ ] Notification preferences
- [ ] Privacy settings
- [ ] Language/localization
- [ ] Time zone settings
- [ ] Theme customization

## 📁 File Management

- [ ] File upload system (Supabase Storage)
- [ ] Image optimization
- [ ] File size limits
- [ ] Supported file types
- [ ] File preview
- [ ] File sharing and permissions

## 🚀 Performance & Optimization

- [ ] Image lazy loading
- [ ] Code splitting optimization
- [ ] API response caching
- [ ] Database query optimization
- [ ] Infinite scroll/pagination
- [ ] Service worker for caching
- [ ] CDN setup for static assets
- [ ] Bundle size optimization

## 🧪 Testing & Quality

- [ ] Unit tests (Jest, React Testing Library)
- [ ] Integration tests
- [ ] E2E tests (Playwright, Cypress)
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Cross-browser testing
- [ ] Load testing

## 🔒 Privacy & Compliance

- [ ] GDPR compliance
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie consent
- [ ] Data export (user data download)
- [ ] Account deletion
- [ ] Data retention policies

## 🌐 Deployment & DevOps

- [ ] CI/CD pipeline setup
- [ ] Automated testing in CI
- [ ] Staging environment
- [ ] Production deployment to Vercel
- [ ] Environment variables management
- [ ] Error tracking (Sentry)
- [ ] Logging system
- [ ] Database backups
- [ ] Monitoring and alerts

## 📝 Documentation

- [ ] API documentation
- [ ] User guide
- [ ] Developer documentation
- [ ] Component library/Storybook
- [ ] Contributing guidelines
- [ ] Changelog

---

## Legend
- 🔥 **High Priority** - Core functionality needed soon
- ⚡ **Quick Win** - Easy to implement, high value
- 🔮 **Future** - Nice to have, low priority
- 🐛 **Bug** - Needs fixing
- 💡 **Idea** - Needs more thought/planning
