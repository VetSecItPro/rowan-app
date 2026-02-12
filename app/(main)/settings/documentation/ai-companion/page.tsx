import Link from 'next/link';
import {
  type LucideIcon,
  ArrowLeft,
  Bot,
  MessageSquare,
  Sparkles,
  Shield,
  Gauge,
  HelpCircle,
  Mic,
  Calendar,
  ShoppingCart,
  Lightbulb,
  Lock,
  Trash2,
  Download,
  Clock,
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
    icon: Sparkles,
    color: 'from-blue-500 to-purple-600',
    articles: [
      {
        title: 'What is Rowan AI?',
        description: 'Your personal household assistant that knows your family\'s schedule, tasks, and preferences.',
        readTime: '2 min read',
        href: '#what-is-rowan-ai',
      },
      {
        title: 'Your First Conversation',
        description: 'Start a conversation with Rowan and see how it can help manage your household.',
        readTime: '3 min read',
        href: '#first-conversation',
      },
    ],
  },
  {
    title: 'What You Can Ask',
    icon: MessageSquare,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Tasks & Chores',
        description: '"Add \'clean kitchen\' to my tasks" or "What chores are due this week?"',
        readTime: '3 min read',
        href: '#tasks-chores',
      },
      {
        title: 'Calendar & Events',
        description: '"When is our next family dinner?" or "Schedule a dentist appointment for Friday at 2pm."',
        readTime: '3 min read',
        href: '#calendar-events',
      },
      {
        title: 'Shopping & Meals',
        description: '"Add milk and eggs to the grocery list" or "What\'s for dinner tonight?"',
        readTime: '3 min read',
        href: '#shopping-meals',
      },
      {
        title: 'Household Information',
        description: '"Who has tasks due today?" or "What\'s our budget looking like this month?"',
        readTime: '2 min read',
        href: '#household-info',
      },
    ],
  },
  {
    title: 'Features by Plan',
    icon: Gauge,
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Free Plan',
        description: 'Basic AI chat with daily limits. Great for trying out Rowan AI.',
        readTime: '2 min read',
        href: '#free-plan',
      },
      {
        title: 'Pro Plan',
        description: 'Extended limits, suggestions, and morning briefings to start your day.',
        readTime: '2 min read',
        href: '#pro-plan',
      },
      {
        title: 'Family Plan',
        description: 'Maximum limits, voice input, and all AI features for the whole household.',
        readTime: '2 min read',
        href: '#family-plan',
      },
    ],
  },
  {
    title: 'Privacy & Data',
    icon: Shield,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'What Data Rowan Sees',
        description: 'Rowan only accesses your household data — task names, events, shopping lists. Never passwords or financial accounts.',
        readTime: '3 min read',
        href: '#data-access',
      },
      {
        title: 'How AI Processing Works',
        description: 'Rowan AI is powered by Google Gemini. Your first names and household data are sent to Google to generate personalized responses. No data is used for model training.',
        readTime: '2 min read',
        href: '#ai-processing',
      },
      {
        title: 'Data Retention & Deletion',
        description: 'Conversations are automatically deleted after 90 days. You can export or delete all AI data anytime.',
        readTime: '2 min read',
        href: '#data-retention',
      },
    ],
  },
];

// Example prompts for the "Try These" section
const EXAMPLE_PROMPTS = [
  { icon: Calendar, text: "What events do I have this week?", color: 'text-purple-400' },
  { icon: ShoppingCart, text: "Add bread and butter to my shopping list", color: 'text-emerald-400' },
  { icon: Lightbulb, text: "What tasks are overdue?", color: 'text-blue-400' },
  { icon: Clock, text: "Remind me to call the vet tomorrow at 10am", color: 'text-pink-400' },
  { icon: Mic, text: "What's our meal plan for today?", color: 'text-orange-400' },
];

export default function AICompanionDocPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <Link
            href="/settings?tab=documentation"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Rowan AI Companion
              </h1>
              <p className="text-white/70 mt-1">
                Your personal household assistant
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Try These — example prompts */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            Try Saying...
          </h2>
          <div className="grid gap-3">
            {EXAMPLE_PROMPTS.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <div
                  key={prompt.text}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700/30"
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${prompt.color}`} />
                  <span className="text-sm text-gray-300">&ldquo;{prompt.text}&rdquo;</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guide Sections */}
        {guideSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                  <SectionIcon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              </div>

              <div className="space-y-3">
                {section.articles.map((article) => (
                  <a
                    key={article.title}
                    href={article.href}
                    className="block px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-800/70 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                          {article.description}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                        {article.readTime}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}

        {/* Privacy Quick Reference */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            Privacy at a Glance
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Household Data Only</p>
                <p className="text-xs text-gray-400 mt-0.5">Tasks, events, lists — never passwords or financials</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Bot className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Powered by Google Gemini</p>
                <p className="text-xs text-gray-400 mt-0.5">First names and household data are sent to Google for AI responses</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Clock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">90-Day Retention</p>
                <p className="text-xs text-gray-400 mt-0.5">Conversations are automatically deleted after 90 days</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Download className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Export Anytime</p>
                <p className="text-xs text-gray-400 mt-0.5">Download all your AI data as JSON from Settings</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Trash2 className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Delete All Data</p>
                <p className="text-xs text-gray-400 mt-0.5">Wipe all conversations and usage data in one click</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
