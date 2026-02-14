import Link from 'next/link';

import {
  type LucideIcon,
  ArrowLeft,
  Calendar,
  Play,
  Plus,
  Clock,
  Users,
  MessageSquare,
  Lightbulb,
  Eye,
  Repeat,
  FileText,
  Zap,
  Target,
  Share2,
  Sparkles,
  Moon,
  Sun,
  Search,
  Filter,
  CheckCircle,
  Star,
  ThumbsUp,
  LayoutGrid,
  List,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Palette,
  Image,
  Paperclip,
  Smile,
  Info,
  Smartphone,
  Command,
  Hand,
  Heart,
  ShoppingBag,
  Edit,
} from 'lucide-react';

interface GuideSection {
  title: string;
  icon: LucideIcon;
  color: string;
  articles: {
    title: string;
    description: string;
    readTime: string;
    href: string;
  }[];
}

const guideSections: GuideSection[] = [
  {
    title: 'Getting Started',
    icon: Play,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Introduction to Calendar',
        description: 'Learn how Rowan Calendar helps you manage events, schedules, and collaborative planning',
        readTime: '4 min read',
        href: '#intro',
      },
      {
        title: 'Creating Your First Event',
        description: 'Quick guide to creating events with titles, dates, locations, and custom colors',
        readTime: '5 min read',
        href: '#first-event',
      },
      {
        title: 'Understanding View Modes',
        description: 'Master 6 calendar views: Day, Week, Month, Agenda, Timeline, and Proposal',
        readTime: '4 min read',
        href: '#view-modes',
      },
      {
        title: 'Event Status & Categories',
        description: 'Organize events with categories (Work, Personal, Family, Health, Social)',
        readTime: '3 min read',
        href: '#status-categories',
      },
      {
        title: 'Quick Navigation & Shortcuts',
        description: 'Master keyboard shortcuts for lightning-fast calendar navigation',
        readTime: '3 min read',
        href: '#shortcuts',
      },
    ],
  },
  {
    title: 'View Modes & Navigation',
    icon: Eye,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Day View - Detailed Schedule',
        description: 'See a single day in detail with hourly breakdown and all event information',
        readTime: '3 min read',
        href: '#day-view',
      },
      {
        title: 'Week View - Monday to Sunday',
        description: '7-column grid showing entire week starting Monday with events per day',
        readTime: '4 min read',
        href: '#week-view',
      },
      {
        title: 'Month View - Traditional Calendar',
        description: 'Classic monthly calendar with color-coded events and today highlighting',
        readTime: '3 min read',
        href: '#month-view',
      },
      {
        title: 'Agenda View - Chronological List',
        description: 'Upcoming events grouped by date in chronological order',
        readTime: '3 min read',
        href: '#agenda-view',
      },
      {
        title: 'Timeline View - Horizontal Scroll',
        description: 'Horizontal scrollable timeline showing entire month at a glance',
        readTime: '3 min read',
        href: '#timeline-view',
      },
    ],
  },
  {
    title: 'Creating & Managing Events',
    icon: Plus,
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Event Creation Basics',
        description: 'Add events with title, description, start/end times, and location',
        readTime: '5 min read',
        href: '#create-events',
      },
      {
        title: 'Custom Colors & Categories',
        description: 'Use predefined colors or custom hex colors, plus category badges',
        readTime: '4 min read',
        href: '#colors-categories',
      },
      {
        title: 'Recurring Events',
        description: 'Set up daily, weekly, or monthly recurring events with custom patterns',
        readTime: '6 min read',
        href: '#recurring',
      },
      {
        title: 'Editing & Updating Events',
        description: 'Modify event details, times, or delete events with confirmation',
        readTime: '3 min read',
        href: '#edit-events',
      },
      {
        title: 'Event Attachments',
        description: 'Add images, documents, and files to events for reference',
        readTime: '4 min read',
        href: '#attachments',
      },
      {
        title: 'Emojis & Personalization',
        description: 'Add emojis to event titles for visual identification and fun',
        readTime: '2 min read',
        href: '#emojis',
      },
    ],
  },
  {
    title: 'Quick Creation & Templates',
    icon: Zap,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Quick Add with Natural Language',
        description: 'Type naturally like "dinner with Sarah tomorrow at 7pm" and events are created automatically',
        readTime: '4 min read',
        href: '#quick-add',
      },
      {
        title: 'Event Templates',
        description: 'Use 10 pre-built templates (Date Night, Doctor, Team Meeting) or create custom ones',
        readTime: '5 min read',
        href: '#templates',
      },
      {
        title: 'Enhanced Day View - Hourly Breakdown',
        description: 'See your day hour-by-hour from 6am-11pm with time-based event positioning',
        readTime: '4 min read',
        href: '#enhanced-day',
      },
      {
        title: 'Enhanced Week View - Hourly Grid',
        description: 'Week view with hourly slots showing exactly when events occur throughout the week',
        readTime: '5 min read',
        href: '#enhanced-week',
      },
      {
        title: 'Visual Overlap Indicators',
        description: 'Overlapping events shown with purple shades for easy visual identification',
        readTime: '3 min read',
        href: '#visual-overlap',
      },
    ],
  },
  {
    title: 'Collaborative Scheduling',
    icon: Sparkles,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Proposal View - Collaborative Planning',
        description: 'View and vote on proposed event times from space members',
        readTime: '5 min read',
        href: '#proposal-view',
      },
      {
        title: 'Creating Event Proposals',
        description: 'Propose multiple time slots for events and gather votes from everyone',
        readTime: '5 min read',
        href: '#create-proposal',
      },
      {
        title: 'Voting on Proposals',
        description: 'Mark times as Preferred, Available, or Unavailable to find best times',
        readTime: '4 min read',
        href: '#voting',
      },
      {
        title: 'Approving & Rejecting Proposals',
        description: 'Proposers can approve top-voted slots to create events automatically',
        readTime: '3 min read',
        href: '#approve-proposals',
      },
      {
        title: 'Counter-Proposals',
        description: 'Suggest alternative times when original proposals don\'t work',
        readTime: '4 min read',
        href: '#counter-proposals',
      },
      {
        title: 'Smart Scheduling Assistant',
        description: 'AI-powered time slot suggestions based on availability and preferences',
        readTime: '6 min read',
        href: '#smart-scheduling',
      },
    ],
  },
  {
    title: 'Advanced Features',
    icon: Target,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Event Detail Modal',
        description: 'View full event information including description, attachments, and linked items',
        readTime: '4 min read',
        href: '#event-details',
      },
      {
        title: 'Event Comments & Threading',
        description: 'Add comments, reply to others, mention users, and collaborate on events',
        readTime: '5 min read',
        href: '#comments-threading',
      },
      {
        title: 'Weather Integration',
        description: 'See weather forecasts for events with automatic warnings for outdoor activities',
        readTime: '4 min read',
        href: '#weather',
      },
      {
        title: 'Conflict Detection',
        description: 'Automatic detection of overlapping events with visual indicators and warnings',
        readTime: '4 min read',
        href: '#conflict-detection',
      },
      {
        title: 'Shopping List Integration',
        description: 'Link shopping lists to events for parties, dinners, and gatherings',
        readTime: '4 min read',
        href: '#shopping-integration',
      },
      {
        title: 'Search & Filtering',
        description: 'Search events by title, description, or location with instant results',
        readTime: '3 min read',
        href: '#search-filter',
      },
      {
        title: 'Status Management',
        description: 'Track event status: Not Started, In Progress, Completed',
        readTime: '3 min read',
        href: '#status-management',
      },
      {
        title: 'Timezone Support',
        description: 'Set custom timezones for events and see times in your local timezone',
        readTime: '3 min read',
        href: '#timezone',
      },
      {
        title: 'Date & Time Validation',
        description: 'Automatic validation prevents end times before start times',
        readTime: '2 min read',
        href: '#validation',
      },
      {
        title: 'Real-Time Sync',
        description: 'See updates instantly when space members create or modify events',
        readTime: '3 min read',
        href: '#real-time',
      },
      {
        title: 'View Mode Persistence',
        description: 'Calendar remembers your preferred view mode per space automatically',
        readTime: '2 min read',
        href: '#view-persistence',
      },
    ],
  },
  {
    title: 'Unified Calendar View',
    icon: LayoutGrid,
    color: 'from-violet-500 to-violet-600',
    articles: [
      {
        title: 'Introduction to Unified View',
        description: 'See events, tasks, meals, and reminders all in one calendar view',
        readTime: '4 min read',
        href: '#unified-intro',
      },
      {
        title: 'Item Types & Color Coding',
        description: 'Understand the color-coded system: Purple events, Blue tasks, Orange meals, Pink reminders',
        readTime: '3 min read',
        href: '#unified-colors',
      },
      {
        title: 'Filtering Item Types',
        description: 'Toggle visibility of different item types to focus on what matters',
        readTime: '3 min read',
        href: '#unified-filters',
      },
      {
        title: 'Item Cards & Details',
        description: 'View item details including time, status, priority, and custom colors',
        readTime: '4 min read',
        href: '#unified-cards',
      },
      {
        title: 'Unified Calendar Legend',
        description: 'Quick reference for understanding item type colors and icons',
        readTime: '2 min read',
        href: '#unified-legend',
      },
    ],
  },
  {
    title: 'Mobile & Accessibility',
    icon: Users,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Mobile-Responsive Design',
        description: 'Full calendar functionality on phones and tablets with touch gestures',
        readTime: '3 min read',
        href: '#mobile',
      },
      {
        title: 'Dark Mode Support',
        description: 'Automatic dark mode with proper contrast for night viewing',
        readTime: '2 min read',
        href: '#dark-mode',
      },
      {
        title: 'Keyboard Navigation',
        description: 'Complete keyboard shortcut system for power users',
        readTime: '4 min read',
        href: '#keyboard-nav',
      },
      {
        title: 'Touch Gestures',
        description: 'Swipe between months, tap to create events, long-press for details',
        readTime: '3 min read',
        href: '#touch-gestures',
      },
      {
        title: 'Accessibility Features',
        description: 'Screen reader support, high contrast, and semantic HTML',
        readTime: '3 min read',
        href: '#accessibility',
      },
    ],
  },
  {
    title: 'External Calendar Integrations',
    icon: Share2,
    color: 'from-cyan-500 to-cyan-600',
    articles: [
      {
        title: 'Connecting Google Calendar',
        description: 'Step-by-step guide to connect your Google Calendar with Rowan for two-way sync',
        readTime: '5 min read',
        href: '#google-calendar-integration',
      },
      {
        title: 'Connecting Apple Calendar',
        description: 'How to set up Apple Calendar (iCloud) integration using app-specific passwords',
        readTime: '6 min read',
        href: '#apple-calendar-integration',
      },
      {
        title: 'Connecting Microsoft Outlook',
        description: 'Connect Outlook.com, Hotmail, or Microsoft 365 calendars with OAuth',
        readTime: '5 min read',
        href: '#outlook-calendar-integration',
      },
      {
        title: 'Connecting Cozi Family Calendar',
        description: 'Import your Cozi family calendar events into Rowan',
        readTime: '4 min read',
        href: '#cozi-calendar-integration',
      },
      {
        title: 'Importing ICS Calendar Feeds',
        description: 'Import events from any ICS/iCalendar URL (one-way sync)',
        readTime: '4 min read',
        href: '#ics-feed-import',
      },
      {
        title: 'Managing Calendar Connections',
        description: 'How to sync, disconnect, and troubleshoot your calendar integrations',
        readTime: '4 min read',
        href: '#managing-integrations',
      },
    ],
  },
  {
    title: 'Tips & Best Practices',
    icon: Lightbulb,
    color: 'from-rose-500 to-rose-600',
    articles: [
      {
        title: 'Organizing with Categories',
        description: 'Best practices for using Work, Personal, Family, Health, and Social categories',
        readTime: '4 min read',
        href: '#category-tips',
      },
      {
        title: 'Color Coding Strategy',
        description: 'Create a consistent color system for different event types',
        readTime: '3 min read',
        href: '#color-strategy',
      },
      {
        title: 'Collaborative Planning Workflow',
        description: 'How to effectively use proposals for family and household planning',
        readTime: '5 min read',
        href: '#collab-workflow',
      },
      {
        title: 'Recurring Event Mastery',
        description: 'Advanced patterns for weekly meetings, monthly bills, and custom schedules',
        readTime: '5 min read',
        href: '#recurring-mastery',
      },
      {
        title: 'Calendar Integration Tips',
        description: 'Connect with shopping lists, tasks, and reminders for unified planning',
        readTime: '4 min read',
        href: '#integration-tips',
      },
      {
        title: 'Family Calendar Setup',
        description: 'Setting up shared family calendars with kids\' activities and appointments',
        readTime: '6 min read',
        href: '#family-setup',
      },
    ],
  },
];

export default function CalendarDocumentationPage() {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-purple-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Calendar Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete guide to managing events, schedules, and collaborative planning
              </p>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-purple-100 mb-2">
                  Welcome to Calendar Management
                </h3>
                <p className="text-purple-200 mb-3">
                  Rowan Calendar helps you organize events and schedules with powerful collaborative features:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-purple-300">
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>6 View Modes</strong> - Day, Week, Month, Agenda, Timeline, Proposal</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Quick Add</strong> - Natural language parsing (&quot;dinner tomorrow at 7pm&quot;)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Event Templates</strong> - 10 pre-built templates for common events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Vote on Times</strong> - Preferred, Available, or Unavailable</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Comments & Threading</strong> - Collaborate with @mentions and replies</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sun className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Weather Forecasts</strong> - Auto warnings for outdoor events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Conflict Detection</strong> - Visual indicators for overlaps</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Paperclip className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>File Attachments</strong> - Add images and documents to events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Palette className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Custom Colors</strong> - 8 presets plus custom hex colors</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Repeat className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Recurring Events</strong> - Daily, weekly, monthly patterns</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Image className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Attachments</strong> - Add images and documents to events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Real-Time Sync</strong> - Instant updates for all space members</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Keyboard Shortcuts</strong> - Lightning-fast navigation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <LayoutGrid className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Unified View</strong> - See events, tasks, meals & reminders together</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guide Sections */}
        <div className="space-y-8">
          {guideSections.map((section, index) => (
            <div key={index} className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
              <div className={`bg-gradient-to-r ${section.color} p-6`}>
                <div className="flex items-center gap-3">
                  <section.icon className="w-8 h-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.articles.map((article, articleIndex) => (
                    <a
                      key={articleIndex}
                      href={article.href}
                      className="block p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors border border-gray-700"
                    >
                      <h3 className="font-semibold text-white mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                        <span className="text-xs text-purple-400 font-medium">
                          Read more →
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Content Sections */}
        <div className="mt-12 bg-gray-800 rounded-2xl shadow-lg p-8 space-y-12 border border-gray-700">
          {/* GETTING STARTED */}
          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Play className="w-8 h-8 text-purple-500" />
              Introduction to Calendar
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Rowan&apos;s Calendar is your unified scheduling hub for managing personal events, family activities, and collaborative planning. With 6 powerful view modes and smart proposal features, you can organize everything from doctor appointments to family gatherings with ease.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features at a Glance</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>6 View Modes:</strong> Switch between Day, Week, Month, Agenda, Timeline, and Proposal views to see your schedule the way you want</li>
                <li><strong>Smart Proposals:</strong> Propose event times and let space members vote on what works best for everyone</li>
                <li><strong>Custom Colors & Categories:</strong> Choose from 8 preset colors or use custom hex colors, plus 5 category badges (Work, Personal, Family, Health, Social)</li>
                <li><strong>Recurring Events:</strong> Set up daily, weekly, or monthly patterns with custom day selection</li>
                <li><strong>Attachments & Emojis:</strong> Add images, documents, and emojis to make events informative and fun</li>
                <li><strong>Real-Time Collaboration:</strong> Everyone sees updates instantly when events are created or modified</li>
                <li><strong>Keyboard Shortcuts:</strong> Lightning-fast navigation with T (today), ←/→ (navigate), D/W/M/A (views), N (new event)</li>
                <li><strong>Smart Validation:</strong> Automatic checks prevent end times before start times</li>
                <li><strong>Shopping Integration:</strong> Link shopping lists to events for seamless party and meal planning</li>
                <li><strong>Mobile-Responsive:</strong> Full functionality on all devices with touch gestures and dark mode</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-event" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Your First Event</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Creating events in Rowan is quick and intuitive. Here&apos;s your step-by-step guide:
              </p>

              <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
                <h4 className="text-lg font-semibold text-purple-100 mb-3">Step-by-Step: Create an Event</h4>
                <ol className="space-y-3 text-gray-300">
                  <li><strong>1. Click &quot;New Event&quot; button</strong> in the top right corner (or press N key)</li>
                  <li><strong>2. Enter event title</strong> - Click the smile icon to add emojis (🎉 ☕ 🏠 etc.)</li>
                  <li><strong>3. Add description</strong> (optional) - Include details, notes, or instructions</li>
                  <li><strong>4. Set start date & time</strong> - Required field, click to open date/time picker</li>
                  <li><strong>5. Set end date & time</strong> (optional) - Leave blank for all-day events</li>
                  <li><strong>6. Add location</strong> (optional) - Address, room name, or virtual meeting link</li>
                  <li><strong>7. Choose category</strong> - Work 💼, Personal 👤, Family 👨‍👩‍👧‍👦, Health 💪, or Social 🎉</li>
                  <li><strong>8. Pick custom color</strong> (optional) - 8 presets or enter hex code (#9333ea)</li>
                  <li><strong>9. Enable recurring</strong> (optional) - Set daily, weekly, or monthly pattern</li>
                  <li><strong>10. Attach files</strong> (optional) - Add images or documents</li>
                  <li><strong>11. Click &quot;Create Event&quot;</strong> - Your event appears immediately in all views!</li>
                </ol>
              </div>

              <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100">
                    <strong>Pro Tip:</strong> Use emojis in titles for quick visual identification! Try &quot;🏥 Doctor Appointment&quot; or &quot;🍕 Pizza Night with Family&quot;
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="view-modes" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Understanding View Modes</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Rowan offers 6 powerful view modes, each optimized for different use cases. Switch between them using the toggle buttons or keyboard shortcuts:
              </p>

              <div className="grid gap-6 mb-6">
                {/* Day View */}
                <div className="p-6 bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-xl border border-blue-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Day View (Press D)</h3>
                      <p className="text-gray-300 mb-3">See a single day in complete detail with all events listed chronologically. Perfect for daily planning and reviewing today&apos;s schedule.</p>
                      <p className="text-sm text-blue-300"><strong>Best for:</strong> Daily planning, hourly schedules, detailed event review</p>
                    </div>
                  </div>
                </div>

                {/* Week View */}
                <div className="p-6 bg-gradient-to-r from-green-900/20 to-green-800/20 rounded-xl border border-green-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                      <CalendarRange className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Week View (Press W)</h3>
                      <p className="text-gray-300 mb-3">7-column grid showing Monday through Sunday. See the entire week at a glance with events displayed in each day column. Navigate week-by-week with arrow buttons.</p>
                      <p className="text-sm text-green-300"><strong>Best for:</strong> Weekly planning, balancing workload, family schedule coordination</p>
                    </div>
                  </div>
                </div>

                {/* Month View */}
                <div className="p-6 bg-gradient-to-r from-purple-900/20 to-purple-800/20 rounded-xl border border-purple-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Month View (Press M)</h3>
                      <p className="text-gray-300 mb-3">Traditional calendar grid showing entire month. Color-coded event dots show what&apos;s happening each day. Today is highlighted with purple accent.</p>
                      <p className="text-sm text-purple-300"><strong>Best for:</strong> Long-term planning, spotting patterns, overview of busy periods</p>
                    </div>
                  </div>
                </div>

                {/* Agenda View */}
                <div className="p-6 bg-gradient-to-r from-amber-900/20 to-amber-800/20 rounded-xl border border-amber-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Agenda View (Press A)</h3>
                      <p className="text-gray-300 mb-3">Upcoming events grouped by date in chronological order. Shows &quot;Today&quot;, &quot;Tomorrow&quot;, or specific dates. Focus on what&apos;s coming next without calendar grid clutter.</p>
                      <p className="text-sm text-amber-300"><strong>Best for:</strong> Checking what&apos;s next, preparing for upcoming events, quick glance</p>
                    </div>
                  </div>
                </div>

                {/* Timeline View */}
                <div className="p-6 bg-gradient-to-r from-indigo-900/20 to-indigo-800/20 rounded-xl border border-indigo-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                      <LayoutGrid className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Timeline View</h3>
                      <p className="text-gray-300 mb-3">Horizontal scrollable timeline showing entire month. Each day is a compact column. Scroll horizontally to see all days. Weekends highlighted in gray.</p>
                      <p className="text-sm text-indigo-300"><strong>Best for:</strong> Finding gaps in schedule, visual density, project planning</p>
                    </div>
                  </div>
                </div>

                {/* Proposal View */}
                <div className="p-6 bg-gradient-to-r from-pink-900/20 to-pink-800/20 rounded-xl border border-pink-700">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-pink-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Proposal View (Press P)</h3>
                      <p className="text-gray-300 mb-3">See all event proposals with voting status. Vote on time slots (Preferred ⭐, Available 👍, Unavailable 👎). Approve proposals to create events automatically.</p>
                      <p className="text-sm text-pink-300"><strong>Best for:</strong> Collaborative scheduling, finding times that work for everyone, family planning</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-100">
                    <strong>Household Tip:</strong> Use Month View for family planning, Agenda View for personal daily prep, and Proposal View for coordinating group activities like date nights or family outings!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* DETAILED VIEW MODE, EVENT MANAGEMENT, PROPOSALS, MOBILE & TIPS SECTIONS */}
{/* DETAILED VIEW MODE SECTIONS - Insert after line 730 */}

<section id="day-view" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <CalendarDays className="w-8 h-8 text-blue-500" />
    Day View - Hourly Timeline
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Day View displays a single day with an hourly timeline from 6 AM to 11 PM. Perfect for detailed daily planning with visual time blocks, weather forecasts, and current time indication.
    </p>

    <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
      <h4 className="text-lg font-semibold text-blue-100 mb-4">Key Features</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>📍 Current Time Indicator:</strong> Red line shows current time with live clock (today only)</li>
        <li><strong>⏰ Hourly Grid:</strong> 18-hour timeline (6am-11pm) with 80px per hour for precise positioning</li>
        <li><strong>🌦️ Weather Badge:</strong> Displays forecast for first event with location</li>
        <li><strong>📊 Event Overlap:</strong> Overlapping events display side-by-side in purple shades</li>
        <li><strong>✅ Status Checkboxes:</strong> Click to cycle: Not Started → In Progress → Completed</li>
      </ul>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong> Press <kbd>D</kbd> for Day View and <kbd>T</kbd> to jump to today. Hover over events to see edit/view actions!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="week-view" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <CalendarRange className="w-8 h-8 text-green-500" />
    Week View - 7-Day Grid
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Week View shows Monday through Sunday in a 7-column grid with hourly timelines. See your entire week at a glance with drag-and-drop support and weather forecasts.
    </p>

    <div className="bg-green-900/20 rounded-xl p-6 border border-green-800 mb-6">
      <h4 className="text-lg font-semibold text-green-100 mb-4">Week View Features</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>📅 7-Day Grid:</strong> Monday-Sunday columns with hourly rows (6am-11pm)</li>
        <li><strong>🎯 Today Highlight:</strong> Current day column highlighted in purple</li>
        <li><strong>🌦️ Weekly Weather:</strong> Shows weather for first event with location across the week</li>
        <li><strong>📊 Event Count:</strong> Each day header shows total events for that day</li>
        <li><strong>🔄 Drag & Drop:</strong> Drag events between days to reschedule (future feature)</li>
      </ul>
    </div>

    <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-100">
          <strong>Household Tip:</strong> Use Week View to balance workload across the week. If Monday looks packed, move flexible events to quieter days!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="month-view" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Calendar className="w-8 h-8 text-purple-500" />
    Month View - Calendar Grid
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Month View displays a traditional calendar grid showing the entire month. Color-coded events, today highlighting, and weather forecasts help you plan long-term and spot busy periods.
    </p>

    <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
      <h4 className="text-lg font-semibold text-purple-100 mb-4">Month View Organization</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>📆 Full Month Grid:</strong> 7x5 or 7x6 grid showing all days including previous/next month overflow</li>
        <li><strong>🎨 Color-Coded Events:</strong> Each event shows category color (Work=blue, Family=pink, etc.)</li>
        <li><strong>💜 Today Highlight:</strong> Current day has purple ring border</li>
        <li><strong>🌦️ Monthly Weather:</strong> Shows weather for first event with location in current month</li>
        <li><strong>📋 Event Limit:</strong> Shows first 2 events per day + count if more exist</li>
      </ul>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong> Use <kbd>←</kbd> and <kbd>→</kbd> arrows to navigate months quickly. Press <kbd>M</kbd> to switch to Month View anytime!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="agenda-view" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <List className="w-8 h-8 text-amber-500" />
    Agenda View - Upcoming Events
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Agenda View lists upcoming events chronologically, grouped by date. Focus on what&apos;s coming next without calendar grid clutter. Perfect for morning prep and weekly planning.
    </p>

    <div className="bg-amber-900/20 rounded-xl p-6 border border-amber-800 mb-6">
      <h4 className="text-lg font-semibold text-amber-100 mb-4">Agenda View Benefits</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>📋 Chronological List:</strong> Events listed in time order, grouped by date</li>
        <li><strong>🗓️ Date Headers:</strong> &quot;Today&quot;, &quot;Tomorrow&quot;, or specific dates for easy scanning</li>
        <li><strong>🌦️ Inline Weather:</strong> Weather forecasts displayed directly with events</li>
        <li><strong>✅ Status Management:</strong> Click checkboxes to update event status</li>
        <li><strong>📍 Full Details:</strong> See time, location, category, and status at a glance</li>
      </ul>
    </div>

    <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-100">
          <strong>Household Tip:</strong> Check Agenda View each morning to prep for the day. It&apos;s like your personal assistant showing what&apos;s ahead!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="timeline-view" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <LayoutGrid className="w-8 h-8 text-indigo-500" />
    Timeline View - Horizontal Month
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Timeline View shows the entire month as a horizontal scrollable timeline. Each day is a compact vertical column. Excellent for finding schedule gaps and visual density planning.
    </p>

    <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-800 mb-6">
      <h4 className="text-lg font-semibold text-indigo-100 mb-4">Timeline Advantages</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>↔️ Horizontal Scroll:</strong> Scroll left/right to see all month days in a row</li>
        <li><strong>📊 Compact Columns:</strong> Each day is a vertical column showing all events</li>
        <li><strong>🎨 Weekend Highlighting:</strong> Weekends (Sat/Sun) highlighted in gray</li>
        <li><strong>🎯 Today Indicator:</strong> Current day column stands out with purple accent</li>
        <li><strong>📈 Density View:</strong> Quickly spot busy vs. free days</li>
      </ul>
    </div>

    <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-100">
          <strong>Pro Tip:</strong> Timeline View excels at finding free days for scheduling big events or projects. Empty columns = opportunity!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

{/* EVENT MANAGEMENT SECTIONS */}

<section id="create-events" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Plus className="w-8 h-8 text-purple-500" />
    Creating New Events
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Create events with the New Event modal, accessed via the toolbar or keyboard shortcut. Fill in details like title, date, time, location, and description to build comprehensive event records.
    </p>

    <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
      <h4 className="text-lg font-semibold text-purple-100 mb-4">Event Creation Steps</h4>
      <ol className="space-y-3 text-gray-300">
        <li><strong>1. Open Modal:</strong> Press <kbd>N</kbd> or click &quot;New Event&quot; button</li>
        <li><strong>2. Enter Title:</strong> Required field - what&apos;s the event?</li>
        <li><strong>3. Set Date & Time:</strong> Pick date, start time, and optional end time</li>
        <li><strong>4. Add Location:</strong> Optional but enables weather forecasts</li>
        <li><strong>5. Choose Category:</strong> Work, Personal, Family, Health, or Social</li>
        <li><strong>6. Add Description:</strong> Optional details, notes, or instructions</li>
        <li><strong>7. Save:</strong> Click Create Event or press <kbd>Enter</kbd></li>
      </ol>
    </div>

    <div className="grid gap-4 mb-6">
      <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
        <h4 className="font-semibold text-white mb-2">⏰ Time Fields</h4>
        <p className="text-sm text-gray-300">Start time is required. End time is optional - if omitted, defaults to 1 hour duration for timeline views.</p>
      </div>
      
      <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
        <h4 className="font-semibold text-white mb-2">📍 Location Benefits</h4>
        <p className="text-sm text-gray-300">Adding location enables automatic weather forecasts (3-hour cache, 5-day window). Enter city names or specific addresses.</p>
      </div>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong> For recurring events, create the first occurrence manually, then use the recurring pattern feature to auto-generate the series!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="colors-categories" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Palette className="w-8 h-8 text-pink-500" />
    Event Colors & Categories
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Every event belongs to one of five categories, each with distinctive colors and icons. Categories provide visual organization and help you quickly identify event types across all views.
    </p>

    <div className="grid gap-4 mb-6">
      <div className="p-4 bg-blue-900/30 border-l-4 border-blue-500 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">💼</span>
          <h4 className="font-bold text-blue-300 text-lg">Work</h4>
        </div>
        <p className="text-sm text-gray-300">Meetings, calls, deadlines, projects. Blue color scheme.</p>
      </div>

      <div className="p-4 bg-purple-900/30 border-l-4 border-purple-500 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">👤</span>
          <h4 className="font-bold text-purple-300 text-lg">Personal</h4>
        </div>
        <p className="text-sm text-gray-300">Appointments, hobbies, self-care, errands. Purple color scheme.</p>
      </div>

      <div className="p-4 bg-pink-900/30 border-l-4 border-pink-500 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">👨‍👩‍👧‍👦</span>
          <h4 className="font-bold text-pink-300 text-lg">Family</h4>
        </div>
        <p className="text-sm text-gray-300">Family time, kids activities, holidays, celebrations. Pink color scheme.</p>
      </div>

      <div className="p-4 bg-green-900/30 border-l-4 border-green-500 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">💪</span>
          <h4 className="font-bold text-green-300 text-lg">Health</h4>
        </div>
        <p className="text-sm text-gray-300">Doctor appointments, gym, therapy, wellness. Green color scheme.</p>
      </div>

      <div className="p-4 bg-orange-900/30 border-l-4 border-orange-500 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎉</span>
          <h4 className="font-bold text-orange-300 text-lg">Social</h4>
        </div>
        <p className="text-sm text-gray-300">Dinners, parties, gatherings, date nights. Orange color scheme.</p>
      </div>
    </div>

    <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-100">
          <strong>Household Tip:</strong> Consistent category usage makes visual scanning effortless. At a glance, you&apos;ll know if your week is work-heavy or family-balanced!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="recurring" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Repeat className="w-8 h-8 text-blue-500" />
    Recurring Events
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Recurring events repeat automatically on a schedule you define. Perfect for weekly meetings, daily workouts, monthly bills, or any repeating commitment.
    </p>

    <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
      <h4 className="text-lg font-semibold text-blue-100 mb-4">Recurring Patterns</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>📅 Daily:</strong> Repeats every day (e.g., morning exercise, daily standup)</li>
        <li><strong>📆 Weekly:</strong> Repeats specific days each week (e.g., Monday meetings, Friday date night)</li>
        <li><strong>📊 Monthly:</strong> Repeats on same day each month (e.g., rent payment, monthly review)</li>
        <li><strong>⏰ Custom Intervals:</strong> Every N days/weeks/months</li>
        <li><strong>🎯 End Date:</strong> Optional end date or repeat forever</li>
      </ul>
    </div>

    <div className="grid gap-4 mb-6">
      <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
        <h4 className="font-semibold text-white mb-2">✏️ Editing Series vs. Single</h4>
        <p className="text-sm text-gray-300">When editing recurring events, choose &quot;Edit this event&quot; to change one occurrence or &quot;Edit series&quot; to update all future occurrences.</p>
      </div>
      
      <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
        <h4 className="font-semibold text-white mb-2">🗑️ Deletion Options</h4>
        <p className="text-sm text-gray-300">Delete &quot;This event only&quot; to skip one occurrence or &quot;All events in series&quot; to cancel the recurring pattern entirely.</p>
      </div>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong> Use Quick Add to create recurring events naturally: &quot;gym every Tuesday at 6pm&quot; auto-creates a weekly recurring pattern!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="edit-events" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Edit className="w-8 h-8 text-indigo-500" />
    Editing Events
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Edit events anytime to update details, reschedule, or delete. Changes sync instantly across all devices with real-time updates.
    </p>

    <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-800 mb-6">
      <h4 className="text-lg font-semibold text-indigo-100 mb-4">How to Edit</h4>
      <ol className="space-y-3 text-gray-300">
        <li><strong>1. Open Event:</strong> Click event card or press <kbd>Eye icon</kbd></li>
        <li><strong>2. Click Edit:</strong> Click the <kbd>Edit</kbd> button (pencil icon)</li>
        <li><strong>3. Modify Fields:</strong> Update title, date, time, location, category, or description</li>
        <li><strong>4. Save Changes:</strong> Click &quot;Update Event&quot; or press <kbd>Enter</kbd></li>
      </ol>
    </div>

    <div className="grid gap-4 mb-6">
      <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
        <h4 className="font-semibold text-white mb-2">🗑️ Deleting Events</h4>
        <p className="text-sm text-gray-300">Click &quot;Delete Event&quot; in the edit modal. Confirmation required for irreversible deletion. Deletes attachments and comments too.</p>
      </div>
      
      <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
        <h4 className="font-semibold text-white mb-2">🔄 Real-time Sync</h4>
        <p className="text-sm text-gray-300">All changes sync instantly to your partner&apos;s view with the &quot;Live&quot; indicator showing active connection.</p>
      </div>
    </div>

    <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-100">
          <strong>Pro Tip:</strong> Hover over events in Day/Week views to see quick edit and view action buttons without opening the full modal!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="attachments" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Paperclip className="w-8 h-8 text-emerald-500" />
    Event Attachments
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Attach files, images, and documents to events for easy reference. Perfect for tickets, confirmations, recipes, maps, or any supporting materials.
    </p>

    <div className="bg-emerald-900/20 rounded-xl p-6 border border-emerald-800 mb-6">
      <h4 className="text-lg font-semibold text-emerald-100 mb-4">Using Attachments</h4>
      <ol className="space-y-3 text-gray-300">
        <li><strong>1. Open Event Details:</strong> Click event to open detail modal</li>
        <li><strong>2. Go to Attachments Tab:</strong> Click &quot;Attachments&quot; tab</li>
        <li><strong>3. Upload Files:</strong> Drag & drop or click to browse files</li>
        <li><strong>4. View Gallery:</strong> Thumbnails for images, icons for documents</li>
        <li><strong>5. Download/Delete:</strong> Click attachments to download or delete</li>
      </ol>
    </div>

    <div className="grid gap-4 mb-6">
      <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
        <h4 className="font-semibold text-white mb-2">📎 Supported Files</h4>
        <p className="text-sm text-gray-300">Images (PNG, JPG, GIF), Documents (PDF), Text files, and more. Max 10MB per file.</p>
      </div>
      
      <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
        <h4 className="font-semibold text-white mb-2">🖼️ Image Gallery</h4>
        <p className="text-sm text-gray-300">Images display as thumbnails in a gallery view. Click to open full-size lightbox with zoom.</p>
      </div>
    </div>

    <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-100">
          <strong>Household Tip:</strong> Attach concert tickets, restaurant reservations, or travel confirmations so you have everything in one place on event day!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

<section id="emojis" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Smile className="w-8 h-8 text-yellow-500" />
    Emoji Support
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Add emojis to event titles and descriptions to make your calendar more expressive and visually appealing. Emojis help you quickly identify events at a glance.
    </p>

    <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-800 mb-6">
      <h4 className="text-lg font-semibold text-yellow-100 mb-4">Adding Emojis</h4>
      <ul className="space-y-3 text-gray-300">
        <li><strong>⌨️ Keyboard Shortcuts:</strong> Mac: <kbd>Cmd</kbd>+<kbd>Ctrl</kbd>+<kbd>Space</kbd>, Windows: <kbd>Win</kbd>+<kbd>.</kbd></li>
        <li><strong>📝 Inline Typing:</strong> Type emojis directly in title or description fields</li>
        <li><strong>📋 Copy/Paste:</strong> Copy emojis from websites or emoji libraries</li>
        <li><strong>🎨 Quick Add Parsing:</strong> Quick Add preserves emojis from natural language input</li>
      </ul>
    </div>

    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 mb-6">
      <h4 className="text-lg font-semibold text-white mb-4">Popular Emoji Ideas</h4>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-purple-400 font-semibold mb-1">Meals & Food</div>
          <div className="text-gray-400">🍕 Pizza Night • 🍜 Ramen Dinner • ☕ Coffee Date • 🥗 Meal Prep</div>
        </div>
        <div>
          <div className="text-blue-400 font-semibold mb-1">Activities</div>
          <div className="text-gray-400">🎬 Movie Night • 🏋️ Gym Session • 🎮 Game Time • 📚 Book Club</div>
        </div>
        <div>
          <div className="text-green-400 font-semibold mb-1">Celebrations</div>
          <div className="text-gray-400">🎂 Birthday Party • 🎉 Anniversary • 🎊 Celebration • 💝 Valentine&apos;s</div>
        </div>
        <div>
          <div className="text-pink-400 font-semibold mb-1">Health & Wellness</div>
          <div className="text-gray-400">💊 Doctor Appt • 🧘 Yoga Class • 🏃 Morning Run • 💆 Spa Day</div>
        </div>
      </div>
    </div>

    <div className="bg-pink-900/20 rounded-xl p-4 border border-pink-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-pink-100">
          <strong>Pro Tip:</strong> Consistent emoji usage creates visual patterns. Use 🍕 for all dinners out, 🏋️ for workouts - your calendar becomes a colorful story!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="event-details" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Eye className="w-8 h-8 text-purple-500" />
    Event Detail Modal
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      View full event details in a modal with tabs for Comments and Attachments. See all event information including weather forecast, time, location, category, and description in one place.
    </p>

    <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
      <h4 className="text-lg font-semibold text-purple-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Open event detail modal by clicking the Eye icon on any event or clicking the event card. Modal includes header with gradient background matching category color.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Event detail modal has fixed height - header stays visible while content scrolls. Perfect for long comment threads!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="shopping-integration" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <ShoppingBag className="w-8 h-8 text-emerald-500" />
    Shopping List Integration
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Link calendar events to shopping lists for seamless meal planning. Events tagged as meals can auto-generate shopping lists with all ingredients needed.
    </p>

    <div className="bg-emerald-900/20 rounded-xl p-6 border border-emerald-800 mb-6">
      <h4 className="text-lg font-semibold text-emerald-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Create meal events and link them to shopping lists from the event modal. Shopping integration automatically adds meal ingredients to your active shopping list.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Plan weekly meals in calendar, then generate one master shopping list for the entire week. Saves time and reduces food waste!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="search-filter" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Search className="w-8 h-8 text-gray-500" />
    Search & Filtering
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Search events by title, location, or description using the search bar. Press / to focus search instantly. Filter by status (Not Started, In Progress, Completed) in List view.
    </p>

    <div className="bg-gray-900/20 rounded-xl p-6 border border-gray-800 mb-6">
      <h4 className="text-lg font-semibold text-gray-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Search bar appears at top of calendar. Type to filter events in real-time. Clear search with Esc key. Status filters only work in List view mode.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Search is perfect for finding that doctor appointment you scheduled months ago. Just type &apos;doctor&apos; and find it instantly!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="status-management" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <CheckCircle className="w-8 h-8 text-green-500" />
    Status Management
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Track event progress with three statuses: Not Started (red checkbox), In Progress (amber with dot), Completed (green with checkmark). Click checkbox to cycle through statuses.
    </p>

    <div className="bg-green-900/20 rounded-xl p-6 border border-green-800 mb-6">
      <h4 className="text-lg font-semibold text-green-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Status checkboxes appear on all event cards. Click to toggle: Not Started → In Progress → Completed → Not Started. Completed events hide from calendar views (except List view).
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Use status to track party planning: Not Started=idea, In Progress=planning, Completed=party done!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="validation" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Target className="w-8 h-8 text-blue-500" />
    Smart Validation
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Calendar validates your input to prevent errors. Detects time conflicts, validates required fields (title, start time), and shows helpful error messages in user-friendly language.
    </p>

    <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
      <h4 className="text-lg font-semibold text-blue-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Validation happens automatically as you create/edit events. Red error messages appear below problematic fields. Fix errors before saving event.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Conflict detection warns you about overlapping events but doesn&apos;t block creation - sometimes double-booking is intentional!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="real-time" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Zap className="w-8 h-8 text-yellow-500" />
    Real-time Sync
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      All calendar changes sync instantly across devices. The Live indicator (green dot with &apos;Live&apos; badge) shows active real-time connection. No manual refresh needed.
    </p>

    <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-800 mb-6">
      <h4 className="text-lg font-semibold text-yellow-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Real-time sync powered by Supabase. When your partner creates/edits/deletes an event, you see it immediately. Connection status shown in header.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Real-time sync means instant coordination. Your partner adds a doctor appointment? You see it immediately on your phone!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="proposal-view" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Users className="w-8 h-8 text-pink-500" />
    Proposal View Overview
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Collaborative scheduling made easy. Create event proposals with multiple time options, vote on preferences, and approve winning time slot to auto-create event.
    </p>

    <div className="bg-pink-900/20 rounded-xl p-6 border border-pink-800 mb-6">
      <h4 className="text-lg font-semibold text-pink-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Switch to Proposal view (Press P) to see all event proposals. Each proposal shows title, description, time slot options, and voting status from all participants.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Perfect for date nights! Propose 3 restaurant times, both vote, winner gets auto-scheduled. No more back-and-forth texting!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="create-proposal" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Plus className="w-8 h-8 text-purple-500" />
    Creating Proposals
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Propose events with 2-5 time slot options. Add title, description, and multiple date/time choices. Participants vote on their preferences to find best time.
    </p>

    <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
      <h4 className="text-lg font-semibold text-purple-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Click &apos;Propose Event&apos; from toolbar. Enter event details and add multiple time slot options. Participants automatically notified to vote on proposal.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Add 3-5 time options for best results. Too few options = no flexibility. Too many = decision fatigue!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="voting" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Star className="w-8 h-8 text-amber-500" />
    Voting on Proposals
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Vote on time slots with three levels: Preferred ⭐ (best choice), Available 👍 (works), Unavailable 👎 (can&apos;t make it). See everyone&apos;s votes in real-time.
    </p>

    <div className="bg-amber-900/20 rounded-xl p-6 border border-amber-800 mb-6">
      <h4 className="text-lg font-semibold text-amber-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Open proposal and click time slots to cycle through votes. Your vote shows in your color. Partner&apos;s votes visible too. Proposal updates instantly.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Be honest with votes! &apos;Available&apos; when you mean &apos;Unavailable&apos; leads to conflicts. Better to find a time that truly works!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="approve-proposals" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <CheckCircle className="w-8 h-8 text-green-500" />
    Approving Proposals
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Review all votes, choose winning time slot, and approve to auto-create calendar event. Proposal disappears, event appears on calendar.
    </p>

    <div className="bg-green-900/20 rounded-xl p-6 border border-green-800 mb-6">
      <h4 className="text-lg font-semibold text-green-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Click &apos;Approve&apos; on proposal, select time slot with most Preferred votes, confirm. Event auto-creates with all details from proposal.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Check weather forecast before approving outdoor event proposals! Rainy day might swing your choice to a different time slot.
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="counter-proposals" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <MessageSquare className="w-8 h-8 text-blue-500" />
    Counter Proposals
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Can&apos;t make any proposed times? Add comments suggesting alternatives. Discussion thread helps find times that work for everyone.
    </p>

    <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
      <h4 className="text-lg font-semibold text-blue-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Use comments section in proposal to suggest different times. Add &apos;@partner&apos; to notify them. Proposer can add suggested times as new slots.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Counter-proposals keep communication transparent. No side-channel texting needed - everything documented in proposal!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="smart-scheduling" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Sparkles className="w-8 h-8 text-indigo-500" />
    Smart Scheduling
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      AI analyzes everyone&apos;s availability and calendar patterns to suggest optimal meeting times. Considers work hours, typical free times, and existing commitments.
    </p>

    <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-800 mb-6">
      <h4 className="text-lg font-semibold text-indigo-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Smart scheduling (future feature) will auto-suggest time slots based on calendar analysis. Machine learning finds patterns in your schedule.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Smart scheduling learns from approved proposals. The more you use proposals, the smarter suggestions become!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="mobile" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Smartphone className="w-8 h-8 text-purple-500" />
    Mobile Experience
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Rowan Calendar is fully responsive and mobile-optimized. Touch-friendly buttons, swipe navigation, and adaptive layouts work perfectly on phones and tablets.
    </p>

    <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
      <h4 className="text-lg font-semibold text-purple-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        All calendar views work on mobile. Buttons sized for touch, text readable without zooming. Drawer menus for navigation. Landscape mode supported.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Use mobile calendar for on-the-go updates. Stuck in traffic? Update event status from your phone. Instant sync to partner!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="dark-mode" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Moon className="w-8 h-8 text-indigo-500" />
    Dark Mode
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Dark mode reduces eye strain and saves battery on OLED screens. System preference detection auto-enables dark mode at sunset.
    </p>

    <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-800 mb-6">
      <h4 className="text-lg font-semibold text-indigo-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Dark mode toggle in settings. Auto-detects system preference (iOS/Android/macOS). All UI elements optimized for dark backgrounds.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Dark mode perfect for bedtime calendar checks. Bright white screens at night disrupt sleep - dark mode is easier on eyes!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="keyboard-nav" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Command className="w-8 h-8 text-blue-500" />
    Keyboard Navigation
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Master keyboard shortcuts for lightning-fast navigation. Every action accessible via keyboard - mouse optional.
    </p>

    <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
      <h4 className="text-lg font-semibold text-blue-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        N=New Event, Q=Quick Add, D/W/M/A/T/P=View modes, /=Search, Esc=Close, ←→=Navigate months, Enter=Save.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Power users love keyboard nav. Once you memorize shortcuts, calendar becomes 10x faster to use!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="touch-gestures" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Hand className="w-8 h-8 text-pink-500" />
    Touch Gestures
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Swipe left/right to navigate weeks/months. Pinch to zoom calendar. Long-press event for quick actions menu. Touch-optimized for natural mobile interaction.
    </p>

    <div className="bg-pink-900/20 rounded-xl p-6 border border-pink-800 mb-6">
      <h4 className="text-lg font-semibold text-pink-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Swipe gestures work in Month/Week/Timeline views. Long-press any event for context menu. Pinch zoom in/out (future feature).
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Swipe navigation feels natural on tablets. Use tablet as family calendar dashboard on kitchen counter!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="accessibility" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Eye className="w-8 h-8 text-green-500" />
    Accessibility
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      WCAG 2.1 AA compliant. Screen reader support (ARIA labels), keyboard-only navigation, high contrast mode, focus indicators, and semantic HTML.
    </p>

    <div className="bg-green-900/20 rounded-xl p-6 border border-green-800 mb-6">
      <h4 className="text-lg font-semibold text-green-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        All interactive elements have ARIA labels. Tab through UI with keyboard. Focus rings show current element. Color not sole indicator of information.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Accessibility benefits everyone! High contrast mode helps in bright sunlight. Keyboard navigation speeds up power users!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="category-tips" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Lightbulb className="w-8 h-8 text-amber-500" />
    Category Organization Tips
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Consistent category usage creates visual patterns. Decide category rules with partner: Work=job only or includes side projects? Health=gym or all self-care?
    </p>

    <div className="bg-amber-900/20 rounded-xl p-6 border border-amber-800 mb-6">
      <h4 className="text-lg font-semibold text-amber-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Discuss category definitions: What counts as Family vs Social? Are couple events Family or Social? Consistency makes calendar scanning effortless.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Weekly category review shows balance. Too much Work, not enough Family? Adjust next week&apos;s schedule proactively!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="color-strategy" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Palette className="w-8 h-8 text-purple-500" />
    Color Coding Strategy
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Use category colors to create visual story of your week. Blue-heavy Monday? Work day. Pink-heavy Saturday? Family time. Color distribution shows life balance.
    </p>

    <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-800 mb-6">
      <h4 className="text-lg font-semibold text-purple-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Month view color scanning: Is entire week one color? Time to diversify! Variety of colors = balanced life. Consistent colors = focused period.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Take screenshot of Month view each month. Watch color patterns evolve. Notice trends: more Health lately? Less Social? Adjust!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="collab-workflow" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Users className="w-8 h-8 text-blue-500" />
    Collaboration Workflow
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Best practices for shared calendars: Check calendar before committing to plans. Add events immediately. Use proposals for group decisions. Comment for context.
    </p>

    <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
      <h4 className="text-lg font-semibold text-blue-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Morning routine: Check Today in Agenda view. Evening routine: Add tomorrow&apos;s events. Weekly: Review proposals, approve or comment.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  &apos;Calendar first&apos; rule: Nothing is scheduled until it&apos;s in calendar. Prevents double-booking and miscommunication!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="recurring-mastery" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Repeat className="w-8 h-8 text-green-500" />
    Recurring Events Mastery
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Advanced recurring patterns: Skip single occurrence by deleting just that instance. Change time for one occurrence with &apos;Edit this event&apos;.
    </p>

    <div className="bg-green-900/20 rounded-xl p-6 border border-green-800 mb-6">
      <h4 className="text-lg font-semibold text-green-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Weekly patterns for regular commitments. Monthly for bills/meetings. Daily for habits. End dates for temporary patterns (summer gym pass).
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Pro Tip:</strong>  Recurring events save tons of time! Instead of creating &apos;Gym&apos; 52 times, create once with &apos;Weekly on Tuesday&apos; pattern.
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="integration-tips" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Zap className="w-8 h-8 text-indigo-500" />
    Integration Best Practices
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Connect calendar with Shopping Lists and Meal Planning. Tag dinner events with meal plans. Link events to lists. Use status tracking for party prep.
    </p>

    <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-800 mb-6">
      <h4 className="text-lg font-semibold text-indigo-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Create meal event → Link recipe → Generate shopping list → Shop with list → Mark event complete. Full workflow integration.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Friday night dinners? Create recurring dinner event, link to recipe rotation, auto-generate weekly shopping lists!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>
<section id="family-setup" className="scroll-mt-24">
  <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
    <Heart className="w-8 h-8 text-pink-500" />
    Family Calendar Setup
  </h2>
  <div className="prose prose-invert max-w-none">
    <p className="text-gray-300 leading-relaxed mb-6">
      Organize family life: Create events for kids activities, doctor appointments, school events, family outings. Use Family category. Add locations for directions.
    </p>

    <div className="bg-pink-900/20 rounded-xl p-6 border border-pink-800 mb-6">
      <h4 className="text-lg font-semibold text-pink-100 mb-4">Key Features</h4>
      <p className="text-gray-300">
        Color code by category: Blue=work, Pink=family. Use emojis: 🏫 School, ⚽ Soccer, 🏥 Doctor. Set up recurring for weekly activities.
      </p>
    </div>

    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-100">
          <strong>Household Tip:</strong>  Shared family calendar = everyone on same page. No more &apos;I forgot about soccer practice!&apos; moments. Life-changing for busy families!
        </div>
      </div>
    </div>
  </div>
  <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
    ↑ Back to top
  </a>
</section>

          {/* UNIFIED CALENDAR VIEW SECTION */}
          <section id="unified-intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-violet-500" />
              Introduction to Unified Calendar View
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                The Unified Calendar View combines all your scheduled items - events, tasks, meals, and reminders - into a single, comprehensive calendar view. Instead of switching between different sections of Rowan, you can now see everything that&apos;s happening in your life at a glance.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What&apos;s Included</h3>
              <div className="grid gap-4 mb-6">
                <div className="flex items-start gap-3 p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <span className="text-2xl">📅</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Calendar Events</h4>
                    <p className="text-sm text-gray-300">Regular calendar events with times, locations, and descriptions. Shown in purple.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <span className="text-2xl">✓</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Tasks with Due Dates</h4>
                    <p className="text-sm text-gray-300">Tasks that have a due date appear on that date. Shown in blue with status indicators.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-orange-900/20 rounded-lg border border-orange-800">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Scheduled Meals</h4>
                    <p className="text-sm text-gray-300">Meals planned for specific dates. Shown in orange with meal type (breakfast, lunch, dinner, snack).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Reminders</h4>
                    <p className="text-sm text-gray-300">Reminders with scheduled times appear at their reminder time. Shown in pink.</p>
                  </div>
                </div>
              </div>
              <div className="bg-violet-900/20 rounded-xl p-4 border border-violet-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-violet-100">
                    <strong>Pro Tip:</strong> The unified view automatically fetches items for the current month plus 2 months ahead, so you can plan ahead without needing to refresh.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="unified-colors" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Palette className="w-8 h-8 text-violet-500" />
              Item Types & Color Coding
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Each item type has its own distinctive color to help you quickly identify what&apos;s on your calendar:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-purple-900/30 border-2 border-purple-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📅</span>
                    <h4 className="font-bold text-purple-100">Events - Purple</h4>
                  </div>
                  <p className="text-sm text-purple-200">Calendar events, appointments, meetings, activities</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-900/30 border-2 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">✓</span>
                    <h4 className="font-bold text-blue-100">Tasks - Blue</h4>
                  </div>
                  <p className="text-sm text-blue-200">To-do items with due dates, action items, assignments</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-900/30 border-2 border-orange-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🍽️</span>
                    <h4 className="font-bold text-orange-100">Meals - Orange</h4>
                  </div>
                  <p className="text-sm text-orange-200">Breakfast, lunch, dinner, snacks planned for specific dates</p>
                </div>
                <div className="p-4 rounded-lg bg-pink-900/30 border-2 border-pink-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔔</span>
                    <h4 className="font-bold text-pink-100">Reminders - Pink</h4>
                  </div>
                  <p className="text-sm text-pink-200">Time-based reminders, notifications, alerts</p>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Meal Time Mapping</h3>
              <p className="text-gray-300 mb-4">
                Meals are automatically placed at appropriate times on the calendar:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Breakfast:</strong> 8:00 AM</li>
                <li><strong>Lunch:</strong> 12:00 PM (noon)</li>
                <li><strong>Dinner:</strong> 6:00 PM</li>
                <li><strong>Snack:</strong> 3:00 PM</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="unified-filters" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Filter className="w-8 h-8 text-violet-500" />
              Filtering Item Types
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Use the filter buttons at the top of the calendar to toggle visibility of different item types. This helps you focus on what matters most at any given time.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Filter Controls</h3>
              <ul className="space-y-3 text-gray-300 mb-6">
                <li><strong>Individual Toggles:</strong> Click on Events, Tasks, Meals, or Reminders buttons to show/hide that type</li>
                <li><strong>Show All:</strong> Click &quot;Show All&quot; to display all item types at once</li>
                <li><strong>Hide All:</strong> Click &quot;Hide All&quot; to hide all item types (button toggles between Show/Hide based on state)</li>
                <li><strong>Item Counts:</strong> Each filter button shows the count of items in the current view</li>
              </ul>
              <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
                <h4 className="text-lg font-semibold text-blue-100 mb-3">Filter Button States</h4>
                <div className="space-y-2 text-sm text-blue-200">
                  <p><strong>Active (colored):</strong> Item type is visible on calendar</p>
                  <p><strong>Inactive (gray):</strong> Item type is hidden from calendar</p>
                  <p><strong>Hover tooltips:</strong> Instant tooltips show &quot;Show [type]s&quot; or &quot;Hide [type]s&quot;</p>
                </div>
              </div>
              <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-100">
                    <strong>Use Case:</strong> Focus on meal planning by hiding events and tasks. Or review just your tasks for the week by filtering out meals and reminders.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="unified-cards" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Info className="w-8 h-8 text-violet-500" />
              Item Cards & Details
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Each item on the unified calendar is displayed as a card with relevant information. Cards adapt to the view mode - compact in month/week views, detailed in day/agenda views.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Card Information</h3>
              <ul className="space-y-2 text-gray-300 mb-6">
                <li><strong>Icon:</strong> Type indicator (📅 event, ✓ task, 🍽️ meal, 🔔 reminder)</li>
                <li><strong>Title:</strong> Item name or description</li>
                <li><strong>Time:</strong> Start time, end time, or &quot;All day&quot; for full-day items</li>
                <li><strong>Priority:</strong> &quot;Urgent&quot; or &quot;High&quot; badges for high-priority items</li>
                <li><strong>Status:</strong> Task status (pending, in-progress, blocked, completed)</li>
                <li><strong>Category:</strong> Meal type or item category</li>
                <li><strong>Location:</strong> Event location if available</li>
                <li><strong>Recurring:</strong> ↻ symbol for recurring items</li>
              </ul>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Compact vs Full View</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Compact View (Month/Week)</h4>
                  <p className="text-sm text-gray-300">Shows icon, title, and priority indicator. Hover for full title tooltip.</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Full View (Day/Agenda)</h4>
                  <p className="text-sm text-gray-300">Shows all details including description preview, time range, location, status, and category badges.</p>
                </div>
              </div>
              <div className="bg-green-900/20 rounded-xl p-4 border border-green-800">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-100">
                    <strong>Completed items:</strong> Tasks and reminders marked as completed appear with strikethrough text and reduced opacity for easy identification.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="unified-legend" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Star className="w-8 h-8 text-violet-500" />
              Unified Calendar Legend
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                A compact legend is available next to the filter buttons to quickly reference what each color represents. Hover over the stacked dots to see the full legend.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Legend Components</h3>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 mb-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-gray-300">Events</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-300">Tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm text-gray-300">Meals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    <span className="text-sm text-gray-300">Reminders</span>
                  </div>
                </div>
              </div>
              <div className="bg-violet-900/20 rounded-xl p-4 border border-violet-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-violet-100">
                    <strong>Quick Reference:</strong> The compact legend shows stacked colored dots. Hover over them to see the full legend popover with icons and labels.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Continue with more sections... */}
          <section id="status-categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Event Status & Categories</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Rowan provides two powerful ways to organize your events: status tracking and categories. Use them together for maximum organization.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Event Status</h3>
              <p className="text-gray-300 mb-4">
                Every event has a status that helps you track progress:
              </p>

              <div className="grid gap-4 mb-6">
                <div className="flex items-start gap-3 p-4 bg-red-900/20 rounded-lg border border-red-800">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Not Started (Default)</h4>
                    <p className="text-sm text-gray-300">Event is created but hasn&apos;t begun yet. Shows on calendar with standard styling.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">In Progress</h4>
                    <p className="text-sm text-gray-300">Event is happening now or preparation has started. Useful for multi-day events or preparation tracking.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Completed</h4>
                    <p className="text-sm text-gray-300">Event is finished. Completed events are hidden from calendar views but visible in List View for reference.</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Event Categories</h3>
              <p className="text-gray-300 mb-4">
                Choose from 5 categories, each with unique colors and emoji icons:
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <div className="text-3xl mb-2">💼</div>
                  <h4 className="font-semibold text-blue-100 mb-1">Work</h4>
                  <p className="text-sm text-blue-200">Meetings, deadlines, business travel, conferences, work-related appointments</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <div className="text-3xl mb-2">👤</div>
                  <h4 className="font-semibold text-purple-100 mb-1">Personal</h4>
                  <p className="text-sm text-purple-200">Hobbies, personal appointments, self-care, errands, personal development</p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
                  <h4 className="font-semibold text-pink-100 mb-1">Family</h4>
                  <p className="text-sm text-pink-200">Family gatherings, kids&apos; activities, date nights, family outings, celebrations</p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <div className="text-3xl mb-2">💪</div>
                  <h4 className="font-semibold text-green-100 mb-1">Health</h4>
                  <p className="text-sm text-green-200">Doctor appointments, gym sessions, therapy, wellness activities, health check-ups</p>
                </div>

                <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-800 sm:col-span-2">
                  <div className="text-3xl mb-2">🎉</div>
                  <h4 className="font-semibold text-orange-100 mb-1">Social</h4>
                  <p className="text-sm text-orange-200">Parties, dinners, social gatherings, birthdays, celebrations, friend meetups</p>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="shortcuts" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Quick Navigation & Shortcuts</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Master these keyboard shortcuts for lightning-fast calendar navigation. All shortcuts work when you&apos;re not typing in an input field:
              </p>

              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-gradient-to-r from-purple-900/20 to-purple-800/20 rounded-xl border border-purple-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Navigation Shortcuts</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">T</kbd>
                      <span className="text-sm text-gray-300">Jump to Today</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">←</kbd>
                      <span className="text-sm text-gray-300">Previous period (week/month)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">→</kbd>
                      <span className="text-sm text-gray-300">Next period (week/month)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">Esc</kbd>
                      <span className="text-sm text-gray-300">Close open modals</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-900/20 to-blue-800/20 rounded-xl border border-blue-700">
                  <h3 className="text-lg font-semibold text-white mb-4">View Mode Shortcuts</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">D</kbd>
                      <span className="text-sm text-gray-300">Switch to Day View</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">W</kbd>
                      <span className="text-sm text-gray-300">Switch to Week View</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">M</kbd>
                      <span className="text-sm text-gray-300">Switch to Month View</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">A</kbd>
                      <span className="text-sm text-gray-300">Switch to Agenda View</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">L</kbd>
                      <span className="text-sm text-gray-300">Switch to List View</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">P</kbd>
                      <span className="text-sm text-gray-300">Switch to Proposal View</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-900/20 to-green-800/20 rounded-xl border border-green-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Action Shortcuts</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">N</kbd>
                      <span className="text-sm text-gray-300">Create New Event</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 bg-gray-700 text-white rounded font-mono text-sm">/</kbd>
                      <span className="text-sm text-gray-300">Focus Search</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800">
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-100">
                    <strong>Power User Tip:</strong> Memorize T, N, and the arrow keys for the fastest calendar experience. Press T to jump to today, N to create an event, and arrow keys to navigate through time!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* QUICK CREATION & TEMPLATES */}
          <section id="quick-add" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-pink-500" />
              Quick Add with Natural Language
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Quick Add lets you create events by typing naturally, just like you&apos;d tell a friend. Powered by intelligent natural language parsing, it understands dates, times, locations, and event types automatically.
              </p>

              <div className="bg-pink-900/20 rounded-xl p-6 border border-pink-800 mb-6">
                <h4 className="text-lg font-semibold text-pink-100 mb-4">How to Use Quick Add</h4>
                <ol className="space-y-3 text-gray-300">
                  <li><strong>1. Select &quot;Quick Add&quot; from the toolbar</strong> - Click the Quick Add toggle, then click the action button (or press Q)</li>
                  <li><strong>2. Type naturally</strong> - Examples: &quot;dinner with Sarah tomorrow at 7pm&quot;, &quot;doctor appointment next Monday at 2pm&quot;, &quot;team meeting Friday at 10am&quot;</li>
                  <li><strong>3. See the preview</strong> - Quick Add shows what it understood before creating</li>
                  <li><strong>4. Create or adjust</strong> - Click Create if it looks good, or manually adjust if needed</li>
                </ol>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What Quick Add Understands</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">📅 Dates & Times</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• &quot;tomorrow&quot;, &quot;next Monday&quot;, &quot;in 3 days&quot;, &quot;June 15th&quot;</li>
                    <li>• &quot;at 7pm&quot;, &quot;at 2:30pm&quot;, &quot;from 9am to 11am&quot;</li>
                    <li>• &quot;next week Tuesday&quot;, &quot;this Friday&quot;</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">📍 Locations</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• &quot;at Olive Garden&quot;, &quot;at the park&quot;, &quot;at home&quot;</li>
                    <li>• Location is automatically extracted from &quot;at [place]&quot; or &quot;@ [place]&quot;</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-white mb-2">🏷️ Event Types</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• &quot;meeting&quot;, &quot;call&quot;, &quot;appointment&quot; → Work category</li>
                    <li>• &quot;dinner&quot;, &quot;lunch&quot;, &quot;birthday&quot;, &quot;party&quot; → Social category</li>
                    <li>• &quot;doctor&quot;, &quot;gym&quot;, &quot;therapy&quot; → Health category</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-white mb-2">🔁 Recurring Events</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• &quot;every Monday&quot;, &quot;every day&quot;, &quot;weekly meeting&quot;</li>
                    <li>• Automatically sets up recurring patterns</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Example Phrases</h3>
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-pink-400 font-mono mb-1">&quot;dinner with Sarah tomorrow at 7pm&quot;</div>
                    <div className="text-gray-400 text-xs">→ Dinner event, tomorrow 7:00 PM, Social category</div>
                  </div>
                  <div>
                    <div className="text-pink-400 font-mono mb-1">&quot;team meeting Friday at 2pm&quot;</div>
                    <div className="text-gray-400 text-xs">→ Team Meeting, this Friday 2:00 PM, Work category</div>
                  </div>
                  <div>
                    <div className="text-pink-400 font-mono mb-1">&quot;doctor appointment next Monday at 10am&quot;</div>
                    <div className="text-gray-400 text-xs">→ Doctor Appointment, next Monday 10:00 AM, Health category</div>
                  </div>
                  <div>
                    <div className="text-pink-400 font-mono mb-1">&quot;gym every Tuesday at 6pm&quot;</div>
                    <div className="text-gray-400 text-xs">→ Gym event, recurring weekly Tuesdays 6:00 PM, Health category</div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800 mt-6">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-100">
                    <strong>Pro Tip:</strong> The more natural you type, the better! &quot;coffee with mom tomorrow morning at 9&quot; works just as well as formal phrasing. Quick Add is designed to understand how you normally speak.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-pink-500" />
              Event Templates
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Event Templates let you create common events in one click. Rowan comes with 10 pre-built templates for popular event types, and you can create custom templates for events you schedule regularly.
              </p>

              <div className="bg-pink-900/20 rounded-xl p-6 border border-pink-800 mb-6">
                <h4 className="text-lg font-semibold text-pink-100 mb-4">How to Use Templates</h4>
                <ol className="space-y-3 text-gray-300">
                  <li><strong>1. Select &quot;Templates&quot; from the toolbar</strong> - Click the Templates toggle, then click the action button</li>
                  <li><strong>2. Browse available templates</strong> - See system templates (pre-built) and your custom templates</li>
                  <li><strong>3. Click a template</strong> - Event is created instantly with pre-filled details</li>
                  <li><strong>4. Edit the event</strong> - Automatically opens in edit mode so you can adjust the time and details</li>
                </ol>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Pre-Built System Templates</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <div className="text-2xl mb-2">💑</div>
                  <h4 className="font-semibold text-white mb-1">Date Night</h4>
                  <p className="text-sm text-gray-300">Romantic evening out with your partner (3 hours, Family category)</p>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <div className="text-2xl mb-2">🏥</div>
                  <h4 className="font-semibold text-white mb-1">Doctor Appointment</h4>
                  <p className="text-sm text-gray-300">Medical checkup or doctor visit (1 hour, Health category)</p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <div className="text-2xl mb-2">💪</div>
                  <h4 className="font-semibold text-white mb-1">Gym Session</h4>
                  <p className="text-sm text-gray-300">Workout or exercise session (1.5 hours, Health category)</p>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <div className="text-2xl mb-2">👥</div>
                  <h4 className="font-semibold text-white mb-1">Team Meeting</h4>
                  <p className="text-sm text-gray-300">Work meeting with team members (1 hour, Work category)</p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <div className="text-2xl mb-2">📞</div>
                  <h4 className="font-semibold text-white mb-1">Phone Call</h4>
                  <p className="text-sm text-gray-300">Scheduled call or video meeting (30 minutes, Work category)</p>
                </div>

                <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-800">
                  <div className="text-2xl mb-2">🍽️</div>
                  <h4 className="font-semibold text-white mb-1">Family Dinner</h4>
                  <p className="text-sm text-gray-300">Dinner with family members (2 hours, Family category)</p>
                </div>

                <div className="p-4 bg-rose-900/20 rounded-lg border border-rose-800">
                  <div className="text-2xl mb-2">🎬</div>
                  <h4 className="font-semibold text-white mb-1">Movie Night</h4>
                  <p className="text-sm text-gray-300">Watching a movie together (2.5 hours, Social category)</p>
                </div>

                <div className="p-4 bg-teal-900/20 rounded-lg border border-teal-800">
                  <div className="text-2xl mb-2">🛒</div>
                  <h4 className="font-semibold text-white mb-1">Grocery Shopping</h4>
                  <p className="text-sm text-gray-300">Weekly grocery shopping trip (1.5 hours, Personal category)</p>
                </div>

                <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-800">
                  <div className="text-2xl mb-2">🎉</div>
                  <h4 className="font-semibold text-white mb-1">Birthday Party</h4>
                  <p className="text-sm text-gray-300">Birthday celebration (3 hours, Social category)</p>
                </div>

                <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-800">
                  <div className="text-2xl mb-2">☕</div>
                  <h4 className="font-semibold text-white mb-1">Coffee Chat</h4>
                  <p className="text-sm text-gray-300">Casual coffee meetup (1 hour, Social category)</p>
                </div>
              </div>

              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800 mt-6">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-100">
                    <strong>Household Tip:</strong> Templates track usage count! The more you use a template, the higher it appears in the list. Your most common events will always be easy to find.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="enhanced-day" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-pink-500" />
              Enhanced Day View - Hourly Breakdown
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                The Enhanced Day View shows your entire day from 6am to 11pm in an hourly grid. Events appear exactly where they occur in the timeline, making it easy to see your schedule at a glance and spot gaps or busy periods.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">⏰ Hourly Time Grid</h4>
                  <p className="text-sm text-gray-300">18-hour view from 6am-11pm with hour labels on the left. Grid lines mark each hour for precise time visualization.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">📍 Precise Event Positioning</h4>
                  <p className="text-sm text-gray-300">Events appear exactly at their scheduled time. A 2:30pm event appears at 2:30, not just &quot;afternoon&quot;.</p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-white mb-2">📏 Visual Duration</h4>
                  <p className="text-sm text-gray-300">Event height matches duration. A 2-hour meeting is twice as tall as a 1-hour meeting, making time commitment immediately visible.</p>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-white mb-2">🔴 Current Time Indicator</h4>
                  <p className="text-sm text-gray-300">Red line shows exactly what time it is right now (updates every minute). Only visible for today&apos;s date.</p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <h4 className="font-semibold text-white mb-2">↔️ Side-by-Side Overlaps</h4>
                  <p className="text-sm text-gray-300">When events overlap, they appear side-by-side in purple shades so you can see both at once.</p>
                </div>
              </div>

              <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-100">
                    <strong>Pro Tip:</strong> Use Enhanced Day View when you have a packed schedule. The hourly breakdown helps you see exactly where you have free time and how much time you have between events. Perfect for planning your day or fitting in one more task!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="enhanced-week" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <CalendarRange className="w-8 h-8 text-pink-500" />
              Enhanced Week View - Hourly Grid
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                The Enhanced Week View combines the weekly overview with hourly time slots. See all 7 days (Monday-Sunday) with events positioned exactly when they occur throughout each day. Perfect for weekly planning and workload balancing.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">📅 7-Day Grid with Hours</h4>
                  <p className="text-sm text-gray-300">Monday through Sunday columns, each with the same 6am-11pm hourly grid. See your entire week&apos;s schedule at once.</p>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">📊 Workload Visualization</h4>
                  <p className="text-sm text-gray-300">Quickly spot busy days vs. light days. See which days are packed and which have more breathing room.</p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-white mb-2">🎯 Today Highlighting</h4>
                  <p className="text-sm text-gray-300">Today&apos;s column has a purple tint and shows the current time indicator, making it easy to spot where you are in the week.</p>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-white mb-2">📝 Event Count Headers</h4>
                  <p className="text-sm text-gray-300">Each day&apos;s header shows the date and how many events are scheduled. &quot;3 events&quot;, &quot;No events&quot;, etc.</p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <h4 className="font-semibold text-white mb-2">🖱️ Compact Event Cards</h4>
                  <p className="text-sm text-gray-300">Events show time, title, category, and location (if tall enough). Hover for action buttons to view details or edit.</p>
                </div>
              </div>

              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-100">
                    <strong>Household Tip:</strong> Use Enhanced Week View for family schedule coordination. Quickly see who has activities when, spot scheduling conflicts, and find times when everyone is free for family activities or meals together!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="visual-overlap" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Palette className="w-8 h-8 text-pink-500" />
              Visual Overlap Indicators
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                When events overlap in time, Rowan displays them side-by-side with distinct purple shades. This helps you quickly identify overlapping commitments without blocking you from creating them—because sometimes overlaps are intentional!
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How It Works</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">🟣 Purple Shade #1</h4>
                  <p className="text-sm text-gray-300">First overlapping event gets a light purple background (bg-purple-100)</p>
                </div>

                <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-800">
                  <h4 className="font-semibold text-white mb-2">🟣 Indigo Shade #2</h4>
                  <p className="text-sm text-gray-300">Second overlapping event gets an indigo background (bg-indigo-100)</p>
                </div>

                <div className="p-4 bg-violet-900/20 rounded-lg border border-violet-800">
                  <h4 className="font-semibold text-white mb-2">🟣 Violet Shade #3</h4>
                  <p className="text-sm text-gray-300">Third overlapping event gets a violet background (bg-violet-100)</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Overlaps Are Allowed</h3>
              <p className="text-gray-300 mb-4">
                Rowan doesn&apos;t block overlapping events because there are many valid reasons to schedule them:
              </p>
              <ul className="space-y-2 text-gray-300 mb-6">
                <li><strong>• Optional events:</strong> &quot;I might go to the gym OR meet Sarah for coffee&quot;</li>
                <li><strong>• Backup plans:</strong> Schedule multiple options and cancel one later</li>
                <li><strong>• Different people:</strong> Partner&apos;s doctor appointment overlaps with your gym session (you&apos;re in different places)</li>
                <li><strong>• Flexible timing:</strong> &quot;Dinner sometime between 6-8pm&quot; with another event at 7pm</li>
                <li><strong>• Ambitious scheduling:</strong> See what you WANT to accomplish, even if it&apos;s tight</li>
              </ul>

              <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100">
                    <strong>Power User Tip:</strong> The purple shades make overlaps visually obvious without being alarming. If you see purple, take a second look—but you&apos;re always in control. Rowan trusts you to manage your own time!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="comments-threading" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              Event Comments & Threading
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Collaborate on events with threaded comments, @mentions, and replies. Perfect for coordinating details, asking questions, or discussing changes with space members.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">💬 Threaded Comments</h4>
                  <p className="text-sm text-gray-300">Reply to any comment to create conversation threads. Keep discussions organized and easy to follow.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">@ Mentions</h4>
                  <p className="text-sm text-gray-300">Type @ to mention space members. They&apos;ll get notified and can respond quickly to your questions.</p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-white mb-2">✏️ Edit & Delete</h4>
                  <p className="text-sm text-gray-300">Edit your comments anytime or delete them if needed. Edited comments are marked with an indicator.</p>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-white mb-2">🔔 Real-Time Updates</h4>
                  <p className="text-sm text-gray-300">See new comments instantly when other space members add them. No refresh needed!</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How to Use</h3>
              <ol className="space-y-3 text-gray-300 mb-6">
                <li><strong>1. Open event details:</strong> Click any event to open the detail modal</li>
                <li><strong>2. Navigate to Comments tab:</strong> Click the Comments tab at the top</li>
                <li><strong>3. Write your comment:</strong> Type in the text box at the bottom</li>
                <li><strong>4. Mention someone:</strong> Type @ and select a space member</li>
                <li><strong>5. Reply to comments:</strong> Click Reply on any comment to create a thread</li>
                <li><strong>6. Edit or delete:</strong> Use the edit/delete buttons on your own comments</li>
              </ol>

              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-100">
                    <strong>Household Tip:</strong> Use comments for event coordination! &quot;Can someone pick up the cake?&quot; &quot;@John can you bring the decorations?&quot; &quot;Should we move this to 6pm instead?&quot; Perfect for family gatherings and parties!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="weather" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Sun className="w-8 h-8 text-orange-500" />
              Weather Integration
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                See weather forecasts for events with locations. Get automatic warnings for outdoor activities when poor weather is expected, so you can plan accordingly or reschedule.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-800">
                  <h4 className="font-semibold text-white mb-2">🌤️ 5-Day Forecasts</h4>
                  <p className="text-sm text-gray-300">See temperature, conditions, humidity, and wind speed for events with locations. Powered by OpenWeatherMap.</p>
                </div>

                <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
                  <h4 className="font-semibold text-white mb-2">⚠️ Smart Warnings</h4>
                  <p className="text-sm text-gray-300">Automatic alerts for outdoor events when storms, rain, snow, extreme heat/cold, or high winds are forecasted.</p>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">🎯 Outdoor Detection</h4>
                  <p className="text-sm text-gray-300">Auto-detects outdoor events by location (park, beach, hike, picnic, etc.) and shows weather warnings.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">💡 Recommendations</h4>
                  <p className="text-sm text-gray-300">Get helpful suggestions: &quot;Bring umbrellas&quot;, &quot;Consider rescheduling&quot;, &quot;Stay hydrated&quot;, &quot;Dress warmly&quot;.</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Where Weather Displays</h3>
              <ul className="space-y-2 text-gray-300 mb-6">
                <li><strong>• Event Detail Modal:</strong> Full weather card with forecast details and alerts</li>
                <li><strong>• Agenda View:</strong> Compact weather badges (emoji + temp) inline with events</li>
                <li><strong>• Weather automatically loads:</strong> When an event has a location set</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Setup Required</h3>
              <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-800 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-100">
                    <strong>API Key Required:</strong> Sign up for a free OpenWeatherMap API key at openweathermap.org/api (1000 calls/day free). Add NEXT_PUBLIC_OPENWEATHER_API_KEY to your .env.local file.
                  </div>
                </div>
              </div>

              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-100">
                    <strong>Household Tip:</strong> Perfect for outdoor family events! Birthday parties at the park, weekend hikes, beach trips, or backyard BBQs. Get storm warnings 24-48 hours ahead so you can move indoors or reschedule!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="conflict-detection" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Target className="w-8 h-8 text-red-500" />
              Conflict Detection
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Rowan automatically detects overlapping events, travel time conflicts, and back-to-back scheduling issues. Get warnings with severity levels and smart suggestions for resolution.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Types of Conflicts</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
                  <h4 className="font-semibold text-white mb-2">🔴 Time Overlaps (High Severity)</h4>
                  <p className="text-sm text-gray-300">Two events scheduled at the exact same time. Can&apos;t physically be in two places at once!</p>
                </div>

                <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-800">
                  <h4 className="font-semibold text-white mb-2">🟠 Travel Time Issues (Medium Severity)</h4>
                  <p className="text-sm text-gray-300">Not enough time to travel between locations. &quot;Doctor at 2pm, Meeting at 2:30pm across town&quot; = warning.</p>
                </div>

                <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-800">
                  <h4 className="font-semibold text-white mb-2">🟡 Back-to-Back Events (Low Severity)</h4>
                  <p className="text-sm text-gray-300">Events scheduled with no buffer time. You might want 15-30 minutes between for breaks or transitions.</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Visual Indicators</h3>
              <ul className="space-y-2 text-gray-300 mb-6">
                <li><strong>• Purple shading:</strong> Overlapping events shown side-by-side with distinct purple shades</li>
                <li><strong>• Warning badges:</strong> Red/orange/yellow icons on events with conflicts</li>
                <li><strong>• Conflict list:</strong> Click to see full details of all conflicts for an event</li>
              </ul>

              <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100">
                    <strong>Power User Tip:</strong> Rowan warns about conflicts but doesn&apos;t block them. Sometimes overlaps are intentional (optional events, backup plans, different people in household). You stay in control!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="timezone" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-500" />
              Timezone Support
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Set custom timezones for events and Rowan handles the conversion. Perfect for remote work, coordinating with family in different time zones, or travel planning.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How It Works</h3>
              <ol className="space-y-3 text-gray-300 mb-6">
                <li><strong>1. Set event timezone:</strong> When creating/editing an event, set the timezone (defaults to UTC)</li>
                <li><strong>2. View in your timezone:</strong> Events display in your local timezone automatically</li>
                <li><strong>3. Database stores UTC:</strong> All times stored in UTC for accuracy</li>
                <li><strong>4. Conversion handled:</strong> Rowan converts times when displaying events</li>
              </ol>

              <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-100">
                    <strong>Use Case:</strong> Grandparents in different timezone? Set their timezone on family video call events. You&apos;ll see &quot;3pm&quot; while they see &quot;6pm&quot; - everyone views in their local time!
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="view-persistence" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Eye className="w-8 h-8 text-teal-500" />
              View Mode Persistence
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Rowan remembers your preferred calendar view for each space. Switch to Agenda view once, and it stays in Agenda view every time you return!
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How It Works</h3>
              <div className="grid gap-4 mb-6">
                <div className="p-4 bg-teal-900/20 rounded-lg border border-teal-800">
                  <h4 className="font-semibold text-white mb-2">💾 Automatic Saving</h4>
                  <p className="text-sm text-gray-300">Every time you switch views (Day/Week/Month/Agenda/Timeline/Proposal), Rowan saves your preference in localStorage.</p>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">🏠 Per-Space Memory</h4>
                  <p className="text-sm text-gray-300">Each space remembers its own view. &quot;Family&quot; space can be Agenda while &quot;Work&quot; space stays in Week view.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">🔄 Instant Restore</h4>
                  <p className="text-sm text-gray-300">When you navigate to Calendar, your last-used view loads automatically. No need to switch every time!</p>
                </div>
              </div>

              <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-100">
                    <strong>Quality of Life:</strong> Small feature, huge impact! Set your preferred view once and forget about it. Rowan adapts to YOUR workflow, not the other way around.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Google Calendar Integration */}
          <section id="google-calendar-integration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Connecting Google Calendar
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Connect your Google Calendar to Rowan to see all your events in one place and create events that sync back to Google.
              </p>

              <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
                <h4 className="text-lg font-semibold text-blue-100 mb-4">Step-by-Step Connection</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Navigate to Settings</h5>
                      <p className="text-sm text-gray-300">Go to <strong>Settings → Integrations</strong> tab to find all available calendar connections.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Click Connect Google Calendar</h5>
                      <p className="text-sm text-gray-300">In the Calendar Integrations section, click the <strong>&quot;Connect&quot;</strong> button next to Google Calendar.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Sign in to Google</h5>
                      <p className="text-sm text-gray-300">A popup will open asking you to sign in to your Google account. Select the account with the calendar you want to connect.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Grant Permissions</h5>
                      <p className="text-sm text-gray-300">Allow Rowan to view and manage your calendar events. This enables two-way sync between Rowan and Google Calendar.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">✓</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Connected!</h5>
                      <p className="text-sm text-gray-300">Your Google Calendar is now connected. Events will sync automatically every 15 minutes, or click the green <strong>Sync</strong> button on the Calendar page to sync immediately.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-800">
                  <h4 className="font-semibold text-white mb-2">Two-Way Sync</h4>
                  <p className="text-sm text-gray-300">Events created in Rowan appear in Google Calendar and vice versa. Changes sync automatically.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">Real-Time Updates</h4>
                  <p className="text-sm text-gray-300">Google uses webhooks to push changes instantly. No waiting for the next sync cycle.</p>
                </div>
              </div>

              <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-100">
                    <strong>Note:</strong> You can connect multiple Google accounts if needed. Each connection syncs independently to your current space.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Apple Calendar Integration */}
          <section id="apple-calendar-integration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Connecting Apple Calendar
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Connect your Apple Calendar (iCloud) to Rowan using an app-specific password. This allows secure access to your calendar without sharing your main Apple ID password.
              </p>

              <div className="bg-red-900/20 rounded-xl p-4 border border-red-800 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-100">
                    <strong>Requires Two-Factor Authentication:</strong> You must have two-factor authentication enabled on your Apple ID to create app-specific passwords. This is a security requirement from Apple.
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">Part 1: Generate an App-Specific Password</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Visit Apple ID Website</h5>
                      <p className="text-sm text-gray-300">Go to <strong>appleid.apple.com</strong> and sign in with your Apple ID.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Go to Security Section</h5>
                      <p className="text-sm text-gray-300">Navigate to <strong>Sign-In and Security → App-Specific Passwords</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Generate New Password</h5>
                      <p className="text-sm text-gray-300">Click the <strong>+</strong> button to create a new app-specific password. Name it <strong>&quot;Rowan&quot;</strong> for easy identification.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Copy the Password</h5>
                      <p className="text-sm text-gray-300">Apple will show you a password in the format <code className="bg-gray-700 px-1 rounded">xxxx-xxxx-xxxx-xxxx</code>. Copy this - you won&apos;t see it again!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800 mb-6">
                <h4 className="text-lg font-semibold text-blue-100 mb-4">Part 2: Connect to Rowan</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">5</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Open Rowan Settings</h5>
                      <p className="text-sm text-gray-300">In Rowan, go to <strong>Settings → Integrations</strong> tab.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">6</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Click Connect Apple Calendar</h5>
                      <p className="text-sm text-gray-300">Find Apple Calendar in the list and click <strong>&quot;Connect&quot;</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold">7</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Enter Your Credentials</h5>
                      <p className="text-sm text-gray-300">Enter your Apple ID email and paste the app-specific password you generated.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">✓</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Connected!</h5>
                      <p className="text-sm text-gray-300">Your Apple Calendar is now connected. Events sync automatically every 15 minutes via polling.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-800">
                  <h4 className="font-semibold text-white mb-2">Secure Storage</h4>
                  <p className="text-sm text-gray-300">Your credentials are stored securely in an encrypted vault - never in plain text.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">CalDAV Protocol</h4>
                  <p className="text-sm text-gray-300">Uses the standard CalDAV protocol, the same method used by Apple&apos;s own apps.</p>
                </div>
              </div>

              <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-100">
                    <strong>Tip:</strong> If you ever need to revoke access, simply delete the &quot;Rowan&quot; app-specific password from your Apple ID account. The calendar will disconnect automatically.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Microsoft Outlook Integration */}
          <section id="outlook-calendar-integration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Connecting Microsoft Outlook
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Connect your Outlook.com, Hotmail, Live, or Microsoft 365 calendar to Rowan for two-way sync using secure OAuth authentication.
              </p>

              <div className="bg-sky-900/20 rounded-xl p-6 border border-sky-800 mb-6">
                <h4 className="text-lg font-semibold text-sky-100 mb-4">Step-by-Step Connection</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Navigate to Settings</h5>
                      <p className="text-sm text-gray-300">Go to <strong>Settings → Integrations</strong> tab to find all available calendar connections.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Click Connect Microsoft Outlook</h5>
                      <p className="text-sm text-gray-300">In the Calendar Integrations section, click the <strong>&quot;Connect&quot;</strong> button next to Microsoft Outlook.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Enter Your Email</h5>
                      <p className="text-sm text-gray-300">Enter your Microsoft account email. This can be an Outlook.com, Hotmail, Live, or Microsoft 365 address.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Sign in to Microsoft</h5>
                      <p className="text-sm text-gray-300">You&apos;ll be redirected to Microsoft to sign in and authorize Rowan to access your calendar.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 text-white font-bold">5</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Grant Permissions</h5>
                      <p className="text-sm text-gray-300">Allow Rowan to view and manage your calendar events. This enables two-way sync between Rowan and Outlook.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">✓</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Connected!</h5>
                      <p className="text-sm text-gray-300">Your Outlook Calendar is now connected. Events will sync automatically every 15 minutes.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-800">
                  <h4 className="font-semibold text-white mb-2">Two-Way Sync</h4>
                  <p className="text-sm text-gray-300">Events created in Rowan appear in Outlook and vice versa. Changes sync automatically.</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">Microsoft Graph API</h4>
                  <p className="text-sm text-gray-300">Uses the official Microsoft Graph API for reliable, secure calendar access.</p>
                </div>
              </div>

              <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-100">
                    <strong>Supported accounts:</strong> Outlook.com, Hotmail, Live, and Microsoft 365 (work/school) accounts are all supported.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Cozi Calendar Integration */}
          <section id="cozi-calendar-integration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Connecting Cozi Family Calendar
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Cozi is a popular family calendar app. You can import your Cozi calendar events into Rowan to see everything in one place.
              </p>

              <div className="bg-orange-900/20 rounded-xl p-4 border border-orange-800 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-100">
                    <strong>One-Way Import:</strong> Cozi events are imported into Rowan. Changes you make in Rowan won&apos;t sync back to Cozi.
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">How to Connect Cozi</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Sign in to Cozi</h5>
                      <p className="text-sm text-gray-300">Go to <a href="https://my.cozi.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline hover:no-underline">my.cozi.com</a> and sign in to your account.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Open Shared Calendars Settings</h5>
                      <p className="text-sm text-gray-300">Go to <strong>Settings → Shared Cozi Calendars</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Enable Sharing</h5>
                      <p className="text-sm text-gray-300">Toggle the calendar from &quot;Unshared&quot; to &quot;Shared&quot; for the family member calendar you want to import. You can share individual family members or &quot;All family members&quot;.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Copy the Calendar URL</h5>
                      <p className="text-sm text-gray-300">Click <strong>&quot;VIEW OR SEND COZI URL&quot;</strong> then click <strong>&quot;COPY COZI URL&quot;</strong> to copy the calendar address.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold">5</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Connect in Rowan</h5>
                      <p className="text-sm text-gray-300">In Rowan, go to <strong>Settings → Integrations</strong>, click <strong>&quot;Connect&quot;</strong> next to Cozi, and paste the URL.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">✓</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Connected!</h5>
                      <p className="text-sm text-gray-300">Your Cozi events will be imported immediately and sync automatically every 15 minutes.</p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Multiple Family Members</h3>
              <p className="text-gray-300 mb-4">
                You can connect multiple Cozi calendars if you want separate calendars for different family members:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
                <li><strong>All Family Members</strong> - One combined calendar with everyone&apos;s events</li>
                <li><strong>Individual calendars</strong> - Separate URLs for each family member (Mom, Dad, Kids, etc.)</li>
              </ul>

              <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-100">
                    <strong>Tip:</strong> When connecting, you can optionally enter a family member name (e.g., &quot;Mom&quot; or &quot;Kids&quot;) to help identify the calendar in Rowan.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* ICS Feed Import */}
          <section id="ics-feed-import" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              Importing ICS Calendars
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Import events from ICS/iCalendar sources - either by subscribing to a feed URL (for automatic updates) or by uploading a .ics file (for one-time imports).
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-white mb-2">Subscribe to URL</h4>
                  <p className="text-sm text-gray-300">Connect to a live calendar feed that updates automatically every 15 minutes.</p>
                </div>

                <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-800">
                  <h4 className="font-semibold text-white mb-2">Upload File</h4>
                  <p className="text-sm text-gray-300">One-time import from a .ics file. Great for email invites or exported calendars.</p>
                </div>
              </div>

              <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-800 mb-6">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-100">
                    <strong>One-Way Import:</strong> ICS sources are read-only. Events are imported into Rowan, but changes you make in Rowan won&apos;t sync back to the original calendar.
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">Method 1: Subscribe to a Feed URL</h3>
              <p className="text-gray-300 mb-4">
                Use this method when you have a calendar that provides a subscription URL. The calendar will stay in sync automatically.
              </p>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">How to Subscribe to an ICS Feed</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Get the ICS Feed URL</h5>
                      <p className="text-sm text-gray-300">Find the ICS/iCalendar URL from your calendar provider. Look for &quot;Subscribe&quot;, &quot;Export&quot;, or &quot;ICS Feed&quot; options.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Navigate to Settings</h5>
                      <p className="text-sm text-gray-300">Go to <strong>Settings → Integrations</strong> and click <strong>&quot;Connect&quot;</strong> next to ICS Feed.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Select &quot;Subscribe to URL&quot;</h5>
                      <p className="text-sm text-gray-300">Make sure the &quot;Subscribe to URL&quot; tab is selected in the modal.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Enter Feed Details</h5>
                      <p className="text-sm text-gray-300">Give your calendar a name (e.g., &quot;Kids Soccer Schedule&quot;) and paste the ICS URL.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">✓</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Subscribed!</h5>
                      <p className="text-sm text-gray-300">Events are imported immediately. The feed refreshes automatically every 15 minutes for updates.</p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">Method 2: Upload an ICS File</h3>
              <p className="text-gray-300 mb-4">
                Use this method for one-time imports from .ics files, such as email calendar invites or exported calendars.
              </p>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">How to Upload an ICS File</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Get Your .ics File</h5>
                      <p className="text-sm text-gray-300">Save the .ics file from an email invite, or export it from another calendar app.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Navigate to Settings</h5>
                      <p className="text-sm text-gray-300">Go to <strong>Settings → Integrations</strong> and click <strong>&quot;Connect&quot;</strong> next to ICS Feed.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Select &quot;Upload File&quot;</h5>
                      <p className="text-sm text-gray-300">Click the &quot;Upload File&quot; tab in the modal.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Upload the File</h5>
                      <p className="text-sm text-gray-300">Enter a calendar name, then drag and drop your .ics file or click to browse. Maximum file size is 1MB.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold">✓</div>
                    <div>
                      <h5 className="font-semibold text-white mb-1">Imported!</h5>
                      <p className="text-sm text-gray-300">All events from the file are imported into Rowan. Upload additional files to add more events.</p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Common ICS Feed Sources</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">Google Calendar</h4>
                  <p className="text-sm text-gray-300">Settings → Integrate calendar → Secret address in iCal format</p>
                </div>

                <div className="p-4 bg-sky-900/20 rounded-lg border border-sky-800">
                  <h4 className="font-semibold text-white mb-2">Outlook Calendar</h4>
                  <p className="text-sm text-gray-300">Settings → Shared calendars → Publish a calendar</p>
                </div>

                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-800">
                  <h4 className="font-semibold text-white mb-2">Sports Schedules</h4>
                  <p className="text-sm text-gray-300">Most sports leagues provide ICS feeds for team schedules</p>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-white mb-2">School Calendars</h4>
                  <p className="text-sm text-gray-300">Many schools publish event calendars as ICS feeds</p>
                </div>
              </div>

              <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-indigo-100">
                    <strong>Tip:</strong> ICS URLs often start with <code className="bg-indigo-700 px-1 rounded">https://</code> or <code className="bg-indigo-700 px-1 rounded">webcal://</code>. Both formats work - webcal:// links are automatically converted.
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Managing Integrations */}
          <section id="managing-integrations" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              Managing Calendar Connections
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">
                Once connected, you can manage your calendar integrations from the Calendar page or Settings.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Manual Syncing</h3>
              <div className="bg-green-900/20 rounded-xl p-6 border border-green-800 mb-6">
                <p className="text-gray-300 mb-4">
                  Click the green <strong>Sync</strong> button in the Calendar page header to manually sync all connected calendars immediately.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-800 rounded-lg border border-green-700">
                    <h5 className="font-medium text-white mb-1">Single Calendar</h5>
                    <p className="text-sm text-gray-400">Tooltip shows &quot;Sync with Google Calendar&quot; or &quot;Sync with Apple Calendar&quot;</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg border border-green-700">
                    <h5 className="font-medium text-white mb-1">Multiple Calendars</h5>
                    <p className="text-sm text-gray-400">Tooltip shows &quot;Sync with 2 Calendars&quot; and lists all providers (Google, Apple)</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Automatic Sync Schedule</h3>
              <div className="grid gap-4 mb-6">
                <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <Clock className="w-6 h-6 text-blue-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Google Calendar - 15 minutes</h4>
                    <p className="text-sm text-gray-300">Primary sync via webhooks (instant). Polling backup every 15 minutes for reliability.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <Clock className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Apple Calendar - 15 minutes</h4>
                    <p className="text-sm text-gray-300">Polling-based sync via CalDAV. Apple doesn&apos;t support webhooks for third-party apps.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-sky-900/20 rounded-lg border border-sky-800">
                  <Clock className="w-6 h-6 text-sky-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Microsoft Outlook - 15 minutes</h4>
                    <p className="text-sm text-gray-300">Uses Microsoft Graph API with delta sync for efficient updates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-orange-900/20 rounded-lg border border-orange-800">
                  <Clock className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">Cozi Calendar - 15 minutes</h4>
                    <p className="text-sm text-gray-300">Imports events from Cozi&apos;s ICS feed. One-way sync only.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <Clock className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">ICS Feeds - 15 minutes</h4>
                    <p className="text-sm text-gray-300">Fetches and parses ICS data. Uses ETag caching for efficiency.</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Disconnecting a Calendar</h3>
              <p className="text-gray-300 mb-4">
                To disconnect a calendar integration:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-6">
                <li>Go to <strong>Settings → Integrations</strong></li>
                <li>Find the calendar you want to disconnect</li>
                <li>Click the <strong>&quot;Disconnect&quot;</strong> button</li>
                <li>Confirm the disconnection</li>
              </ol>
              <p className="text-gray-300 mb-6">
                Events that were synced will remain in Rowan but will no longer update from the external calendar.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Troubleshooting</h3>
              <div className="space-y-4">
                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-amber-100 mb-2">Events not syncing?</h4>
                  <ul className="text-sm text-amber-200 list-disc list-inside space-y-1">
                    <li>Try clicking the manual Sync button</li>
                    <li>Check that the calendar is still connected in Settings → Integrations</li>
                    <li>For Google: Try disconnecting and reconnecting</li>
                    <li>For Apple: Verify your app-specific password is still valid</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <h4 className="font-semibold text-amber-100 mb-2">Connection showing &quot;Error&quot; status?</h4>
                  <ul className="text-sm text-amber-200 list-disc list-inside space-y-1">
                    <li>The connection will automatically retry on the next sync cycle</li>
                    <li>If the error persists, disconnect and reconnect the calendar</li>
                    <li>For Apple: You may need to generate a new app-specific password</li>
                  </ul>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <div className="text-center">
              <Link
                href="/settings/documentation"
                className="inline-flex items-center gap-2 py-2 px-3 text-purple-400 hover:text-purple-300 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Documentation Home
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
  );
}
