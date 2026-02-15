import Link from 'next/link';

import {
  ArrowLeft,
  CreditCard,
  Play,
  Gift,
  DollarSign,
  RefreshCw,
  HelpCircle,
  Crown,
  Users,
  Check,
  X,
  Sparkles,
  Clock,
  Shield,
  Settings,
  AlertTriangle,
  TrendingUp,
  Zap,
  Heart,
  Star,
} from 'lucide-react';


interface GuideSection {
  title: string;
  icon: React.ElementType;
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
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Understanding Rowan Plans',
        description: 'Compare Free, Pro, and Family plans to find the right fit for your household',
        readTime: '4 min read',
        href: '#understanding-plans',
      },
      {
        title: 'Starting Your Free Trial',
        description: 'How to activate your 14-day free trial with no credit card required',
        readTime: '3 min read',
        href: '#free-trial',
      },
      {
        title: 'Choosing a Plan',
        description: 'Factors to consider when selecting between Pro and Family subscriptions',
        readTime: '5 min read',
        href: '#choosing-plan',
      },
      {
        title: 'Monthly vs Annual Billing',
        description: 'Compare billing options and learn how to save with annual subscriptions',
        readTime: '3 min read',
        href: '#billing-periods',
      },
    ],
  },
  {
    title: 'Free Trial',
    icon: Gift,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'What\'s Included in the Trial',
        description: 'Full access to all Pro features for 14 days - no restrictions',
        readTime: '3 min read',
        href: '#trial-features',
      },
      {
        title: 'No Credit Card Required',
        description: 'Why we don\'t ask for payment info upfront and how it benefits you',
        readTime: '2 min read',
        href: '#no-credit-card',
      },
      {
        title: 'Trial Countdown & Notifications',
        description: 'How we\'ll remind you before your trial ends so you never lose access',
        readTime: '3 min read',
        href: '#trial-countdown',
      },
      {
        title: 'What Happens When Trial Ends',
        description: 'Your data stays safe - you just lose access to Pro features until you subscribe',
        readTime: '4 min read',
        href: '#trial-ends',
      },
    ],
  },
  {
    title: 'Billing & Payments',
    icon: DollarSign,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'How Billing Works',
        description: 'Understand automatic renewals, billing dates, and payment processing',
        readTime: '4 min read',
        href: '#billing-works',
      },
      {
        title: 'Accepted Payment Methods',
        description: 'Credit cards, debit cards, and other payment options via Polar',
        readTime: '2 min read',
        href: '#payment-methods',
      },
      {
        title: 'Viewing Your Invoices',
        description: 'Access your billing history and download invoices from the billing portal',
        readTime: '3 min read',
        href: '#invoices',
      },
      {
        title: 'Updating Payment Information',
        description: 'How to change your credit card or update billing details',
        readTime: '3 min read',
        href: '#update-payment',
      },
    ],
  },
  {
    title: 'Managing Your Subscription',
    icon: Settings,
    color: 'from-orange-500 to-orange-600',
    articles: [
      {
        title: 'Accessing the Billing Portal',
        description: 'Use Polar\'s secure portal to manage all subscription settings',
        readTime: '2 min read',
        href: '#billing-portal',
      },
      {
        title: 'Upgrading Your Plan',
        description: 'Move from Free to Pro, or Pro to Family at any time',
        readTime: '4 min read',
        href: '#upgrading',
      },
      {
        title: 'Downgrading Your Plan',
        description: 'What happens to your data and features when you downgrade',
        readTime: '4 min read',
        href: '#downgrading',
      },
      {
        title: 'Canceling Your Subscription',
        description: 'How to cancel and what to expect - you keep access until the period ends',
        readTime: '4 min read',
        href: '#canceling',
      },
    ],
  },
  {
    title: 'Plan Comparison',
    icon: TrendingUp,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Free Plan Features',
        description: 'Core features available to all users at no cost',
        readTime: '3 min read',
        href: '#free-features',
      },
      {
        title: 'Pro Plan Features',
        description: 'Advanced features for individuals and couples - $18/month',
        readTime: '5 min read',
        href: '#pro-features',
      },
      {
        title: 'Family Plan Features',
        description: 'Everything in Pro plus family features for up to 6 members - $29/month',
        readTime: '5 min read',
        href: '#family-features',
      },
      {
        title: 'Feature Gating Explained',
        description: 'How we show you what\'s available and prompt upgrades',
        readTime: '3 min read',
        href: '#feature-gating',
      },
    ],
  },
  {
    title: 'FAQ & Troubleshooting',
    icon: HelpCircle,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Common Billing Questions',
        description: 'Answers to frequently asked questions about charges and billing',
        readTime: '6 min read',
        href: '#billing-faq',
      },
      {
        title: 'Payment Failed - What To Do',
        description: 'Steps to resolve payment issues and avoid service interruption',
        readTime: '4 min read',
        href: '#payment-failed',
      },
      {
        title: 'Cancellation Policy',
        description: 'How cancellation works and what to expect',
        readTime: '3 min read',
        href: '#cancellation-policy',
      },
      {
        title: 'Contact Support',
        description: 'How to reach our team for billing and subscription help',
        readTime: '2 min read',
        href: '#contact-support',
      },
    ],
  },
];

export default function SubscriptionsDocumentationPage() {
  return (
    <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/documentation"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>

            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CreditCard className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Subscriptions & Billing
              </h1>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Everything you need to know about Rowan plans, free trials, billing, and managing your subscription.
                Get the most out of Rowan with the right plan for your family.
              </p>
            </div>
          </div>

          {/* Plan Overview Cards */}
          <div className="mb-12 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Plan */}
              <div className="p-6 bg-gray-800/80 border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Free</h3>
                <p className="text-2xl font-bold text-white mb-2">$0<span className="text-sm font-normal text-gray-500">/month</span></p>
                <p className="text-sm text-gray-400">
                  Basic features to get started with household organization
                </p>
              </div>

              {/* Pro Plan */}
              <div className="p-6 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-2 border-emerald-700 rounded-2xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-bold bg-emerald-500 text-white rounded-full">POPULAR</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
                <p className="text-2xl font-bold text-white mb-2">$18<span className="text-sm font-normal text-gray-500">/month</span></p>
                <p className="text-sm text-gray-400">
                  Advanced features for individuals and couples
                </p>
              </div>

              {/* Family Plan */}
              <div className="p-6 bg-gray-800/80 border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Family</h3>
                <p className="text-2xl font-bold text-white mb-2">$29<span className="text-sm font-normal text-gray-500">/month</span></p>
                <p className="text-sm text-gray-400">
                  Everything in Pro + family features for up to 6 members
                </p>
              </div>
            </div>
          </div>

          {/* Trial Banner */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">14-Day Free Trial</h3>
                  <p className="text-white/90">
                    Try all Pro features free for 14 days. No credit card required - just sign up and start organizing!
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">No CC Required</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section, sectionIndex) => {
              const SectionIcon = section.icon;

              return (
                <div key={section.title} className="max-w-6xl mx-auto">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${section.color} flex items-center justify-center shadow-lg`}>
                      <SectionIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        {section.title}
                      </h2>
                      <p className="text-gray-400 mt-1">
                        Section {sectionIndex + 1} of {guideSections.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.articles.map((article, index) => (
                      <Link
                        key={index}
                        href={article.href}
                        className="group p-6 bg-gray-800/80 border border-gray-700/60 hover:border-emerald-600 rounded-2xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {article.title}
                          </h3>
                          <span className="text-xs font-medium text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full whitespace-nowrap ml-3">
                            {article.readTime}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mb-4">
                          {article.description}
                        </p>
                        <div className="flex items-center text-sm font-semibold text-emerald-400">
                          Read guide
                          <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="p-8 bg-gray-800/80 border border-gray-700/60 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Feature Comparison</h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-4 font-semibold text-white">Feature</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-500">Free</th>
                      <th className="text-center py-4 px-4 font-semibold text-emerald-400">Pro</th>
                      <th className="text-center py-4 px-4 font-semibold text-purple-400">Family</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Tasks & Reminders</td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Shopping Lists</td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Calendar & Events</td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Meal Planning</td>
                      <td className="py-3 px-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Goals & Milestones</td>
                      <td className="py-3 px-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Expense Tracking</td>
                      <td className="py-3 px-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">AI Receipt Scanning</td>
                      <td className="py-3 px-4 text-center"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-300">Space Members</td>
                      <td className="py-3 px-4 text-center text-gray-500">2</td>
                      <td className="py-3 px-4 text-center text-emerald-400">2</td>
                      <td className="py-3 px-4 text-center text-purple-400 font-semibold">6</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Reference */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="p-8 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-800/60 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Quick Reference</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    Trial Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">14 days of full Pro access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">No credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">Cancel anytime - access continues until end of billing period</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">Data preserved after trial ends</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Payment Security
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">Powered by Polar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">PCI-DSS compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">256-bit SSL encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-gray-400">We never store card details</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-emerald-800">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Annual Savings
                </h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Save ~17% with annual billing! Pro is just $180/year (vs $216 monthly) and
                  Family is $290/year (vs $348 monthly). That&apos;s 2 months free! Annual plans are charged once per year and
                  include all the same features.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ARTICLE CONTENT SECTIONS */}
          {/* ============================================================ */}
          <div className="mt-16 space-y-16 max-w-4xl mx-auto">

            {/* ============================================================ */}
            {/* GETTING STARTED */}
            {/* ============================================================ */}

            {/* Understanding Rowan Plans */}
            <section id="understanding-plans" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Rowan Plans</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan offers three subscription tiers designed to meet different household needs. Whether you&apos;re just starting out, managing a busy couple&apos;s life, or coordinating an entire family, there&apos;s a plan for you.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">The Three Plans</h3>
                <ul className="list-disc list-inside space-y-3 text-gray-400">
                  <li><strong>Free ($0/month):</strong> Essential features for basic household organization. Tasks, shopping lists, calendar, and messaging for up to 2 people.</li>
                  <li><strong>Pro ($18/month):</strong> Our most popular plan. Everything in Free plus meal planning, goals, expense tracking, AI receipt scanning, and advanced analytics.</li>
                  <li><strong>Family ($29/month):</strong> Everything in Pro plus support for up to 6 household members, family-specific features, and additional storage.</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Who Is Each Plan For?</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  <strong>Free</strong> is perfect for individuals or couples who need basic organization. <strong>Pro</strong> is ideal for couples or roommates who want advanced features like meal planning and budget tracking. <strong>Family</strong> is designed for households with children or extended family members living together.
                </p>
                <div className="p-4 bg-emerald-900/30 border border-emerald-800 rounded-lg mt-6">
                  <p className="text-emerald-200 text-sm">
                    <strong>Try Before You Buy:</strong> Start with a 14-day free trial of Pro to experience all the advanced features before committing.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Starting Your Free Trial */}
            <section id="free-trial" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Starting Your Free Trial</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Every new Rowan user gets a 14-day free trial of Pro features. No credit card required - just sign up and start organizing your household immediately.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Start Your Trial</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Create a Rowan account with your email</li>
                  <li>Verify your email address</li>
                  <li>Your 14-day trial starts automatically</li>
                  <li>Explore all Pro features at no cost</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What You Get</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  During your trial, you have full access to every Pro feature: meal planning, goals and milestones, expense tracking, AI receipt scanning, and more. There are no restrictions - it&apos;s the complete Pro experience.
                </p>
                <div className="p-4 bg-emerald-900/30 border border-emerald-800 rounded-lg mt-6">
                  <p className="text-emerald-200 text-sm">
                    <strong>No Surprise Charges:</strong> Since we don&apos;t collect payment info upfront, you&apos;ll never be charged unexpectedly. You choose if and when to subscribe.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Choosing a Plan */}
            <section id="choosing-plan" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Choosing a Plan</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Selecting the right plan depends on your household size, which features matter most to you, and your budget. Here&apos;s how to decide.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Questions to Consider</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>How many people will use Rowan?</strong> 2 or fewer = Free/Pro works. 3-6 = Family recommended.</li>
                  <li><strong>Do you need meal planning?</strong> Only available in Pro and Family.</li>
                  <li><strong>Do you track expenses?</strong> Expense tracking and receipt scanning are Pro features.</li>
                  <li><strong>Do you set goals together?</strong> Goals &amp; Milestones is a Pro feature.</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Pro vs Family Decision</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  The main difference between Pro and Family is the number of space members (2 vs 6) and family-oriented features. If you&apos;re a couple without kids, Pro is usually sufficient. If you have children or extended family sharing the household, Family provides the extra member slots and features designed for larger groups.
                </p>
                <div className="p-4 bg-emerald-900/30 border border-emerald-800 rounded-lg mt-6">
                  <p className="text-emerald-200 text-sm">
                    <strong>Easy Upgrades:</strong> You can upgrade at any time. Start with Pro and move to Family later if your household grows.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Monthly vs Annual Billing */}
            <section id="billing-periods" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Monthly vs Annual Billing</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan offers both monthly and annual billing options. Annual billing provides significant savings for committed users.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Price Comparison</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Pro Monthly:</strong> $18/month ($216/year total)</li>
                  <li><strong>Pro Annual:</strong> $180/year ($15/month equivalent) - Save ~17% (2 months free)</li>
                  <li><strong>Family Monthly:</strong> $29/month ($348/year total)</li>
                  <li><strong>Family Annual:</strong> $290/year ($24.17/month equivalent) - Save ~17% (2 months free)</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Choose Each</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  <strong>Monthly</strong> is best if you want flexibility or are just trying out a paid plan. <strong>Annual</strong> is best if you&apos;ve used Rowan and know you&apos;ll continue - the savings add up to almost 2 free months per year.
                </p>
                <div className="p-4 bg-emerald-900/30 border border-emerald-800 rounded-lg mt-6">
                  <p className="text-emerald-200 text-sm">
                    <strong>Switch Anytime:</strong> You can switch from monthly to annual (or vice versa) through the billing portal. Prorated credits are applied automatically.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* FREE TRIAL */}
            {/* ============================================================ */}

            {/* What&apos;s Included in the Trial */}
            <section id="trial-features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">What&apos;s Included in the Trial</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your 14-day free trial gives you unrestricted access to every Pro feature. This isn&apos;t a limited demo - it&apos;s the full Pro experience so you can make an informed decision.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Full Feature Access</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All Free features (tasks, calendar, shopping, messages)</li>
                  <li>Meal planning and recipe library</li>
                  <li>Goals and milestones tracking</li>
                  <li>Expense tracking and budgeting</li>
                  <li>AI-powered receipt scanning</li>
                  <li>Priority customer support</li>
                  <li>Advanced analytics and reports</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">No Restrictions</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  There are no usage limits, no watermarks, no &quot;trial mode&quot; banners cluttering your experience. Use Rowan exactly as you would with a paid subscription.
                </p>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Maximize Your Trial:</strong> Try to use each Pro feature at least once during your trial to see if it fits your lifestyle.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* No Credit Card Required */}
            <section id="no-credit-card" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">No Credit Card Required</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Unlike many services, Rowan doesn&apos;t require a credit card to start your free trial. We believe you should experience the product before making any financial commitment.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why We Do This</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Zero risk:</strong> You can&apos;t be accidentally charged if we don&apos;t have your card</li>
                  <li><strong>Honest evaluation:</strong> Try features without pressure to remember to cancel</li>
                  <li><strong>User trust:</strong> We want you to subscribe because you love Rowan, not because you forgot to cancel</li>
                  <li><strong>Simpler signup:</strong> Get started in seconds without hunting for your wallet</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When You&apos;ll Need Payment Info</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  You&apos;ll only enter payment information if and when you decide to subscribe. After your trial, you can either subscribe to continue with Pro features or stay on the Free plan indefinitely.
                </p>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>No Gotchas:</strong> When your trial ends, you simply lose access to Pro features. Your data stays safe, and you keep Free features forever.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Trial Countdown & Notifications */}
            <section id="trial-countdown" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Trial Countdown &amp; Notifications</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  We make sure you always know how much trial time remains so you can make an informed decision before it ends.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How We Keep You Informed</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Dashboard indicator:</strong> See days remaining at a glance in your account</li>
                  <li><strong>Email reminders:</strong> We&apos;ll email you 3 days and 1 day before trial ends</li>
                  <li><strong>In-app notifications:</strong> Gentle reminders as the end approaches</li>
                  <li><strong>No nagging:</strong> Reminders are helpful, not annoying or pushy</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What the Reminders Include</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Each reminder tells you exactly what will happen: your data stays safe, you keep Free features, and you can subscribe anytime to regain Pro features. We also highlight what you&apos;ll miss most based on your usage.
                </p>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Your Timeline:</strong> Check Settings → Subscription to see your exact trial end date and a summary of your Pro feature usage.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* What Happens When Trial Ends */}
            <section id="trial-ends" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">What Happens When Trial Ends</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  When your 14-day trial ends, you won&apos;t lose your account or your data. You simply transition to the Free plan unless you choose to subscribe.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What You Keep</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Your account and profile</li>
                  <li>All data you created (tasks, events, shopping lists, etc.)</li>
                  <li>Access to all Free features</li>
                  <li>Your Space and invitations</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Changes</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Pro-only features become locked (meal planning, goals, expenses, etc.)</li>
                  <li>Data created in Pro features remains but is read-only until you subscribe</li>
                  <li>You&apos;ll see upgrade prompts when trying to access locked features</li>
                </ul>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Subscribe Anytime:</strong> Even months later, you can subscribe and immediately regain access to all Pro features and your existing data.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* BILLING & PAYMENTS */}
            {/* ============================================================ */}

            {/* How Billing Works */}
            <section id="billing-works" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">How Billing Works</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan uses Polar, a leading payment processor, to handle all billing securely. Understanding how billing works helps you manage your subscription confidently.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Billing Cycle</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Start date:</strong> Billing begins on the day you subscribe</li>
                  <li><strong>Renewal:</strong> Subscriptions renew automatically (monthly or annually)</li>
                  <li><strong>Billing date:</strong> You&apos;re charged on the same day each period</li>
                  <li><strong>Proration:</strong> Upgrades are prorated; you only pay the difference</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Automatic Renewal</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your subscription renews automatically to ensure uninterrupted access. You&apos;ll receive an email receipt after each successful charge. You can cancel anytime through the billing portal.
                </p>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Renewal Reminder:</strong> We send a reminder email a few days before annual renewals so you have time to cancel if needed.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Accepted Payment Methods */}
            <section id="payment-methods" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Accepted Payment Methods</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  We accept a wide range of payment methods through Polar to make subscribing convenient no matter how you prefer to pay.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Supported Cards</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Visa</li>
                  <li>Mastercard</li>
                  <li>American Express</li>
                  <li>Discover</li>
                  <li>Most debit cards with Visa/Mastercard networks</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Digital Wallets</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Depending on your device and browser, you may also be able to pay with Apple Pay or Google Pay for a faster checkout experience.
                </p>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Secure Processing:</strong> Rowan never sees your full card number. All payment data is handled securely by Polar with 256-bit SSL encryption.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Viewing Your Invoices */}
            <section id="invoices" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Viewing Your Invoices</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Access your complete billing history and download invoices for your records or expense reporting.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Access Invoices</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Subscription</li>
                  <li>Click &quot;Manage Billing&quot; to open the Polar portal</li>
                  <li>Select &quot;Billing History&quot; or &quot;Invoices&quot;</li>
                  <li>Click any invoice to view or download as PDF</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Invoice Contents</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Each invoice includes: date, amount charged, payment method (last 4 digits), plan name, and billing period. Invoices are suitable for expense reimbursement or tax records.
                </p>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Email Receipts:</strong> You also receive an email receipt after each successful charge, which you can save for your records.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Updating Payment Information */}
            <section id="update-payment" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Updating Payment Information</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Card expired or want to use a different payment method? Update your payment information anytime through the billing portal.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Update</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Subscription</li>
                  <li>Click &quot;Manage Billing&quot;</li>
                  <li>Select &quot;Payment Methods&quot;</li>
                  <li>Add a new card or remove an existing one</li>
                  <li>Set your default payment method</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Update</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Before your card expires to avoid payment failures</li>
                  <li>When switching banks or credit card companies</li>
                  <li>After receiving a new card number for security reasons</li>
                </ul>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Expiring Card Warning:</strong> If your card is about to expire, we&apos;ll send you a reminder to update it before your next billing date.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* MANAGING YOUR SUBSCRIPTION */}
            {/* ============================================================ */}

            {/* Accessing the Billing Portal */}
            <section id="billing-portal" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Accessing the Billing Portal</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Polar billing portal is your central hub for managing everything related to your Rowan subscription.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Access</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings in Rowan</li>
                  <li>Click on the &quot;Subscription&quot; tab</li>
                  <li>Click &quot;Manage Billing&quot; button</li>
                  <li>You&apos;ll be securely redirected to Polar&apos;s portal</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What You Can Do</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>View and update payment methods</li>
                  <li>Download invoices and billing history</li>
                  <li>Change your subscription plan</li>
                  <li>Switch between monthly and annual billing</li>
                  <li>Cancel your subscription</li>
                  <li>Update billing email address</li>
                </ul>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Secure Portal:</strong> The billing portal is hosted by Polar, not Rowan. Your payment details are never stored on our servers.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Upgrading Your Plan */}
            <section id="upgrading" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Upgrading Your Plan</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Need more features or member slots? Upgrading is easy and takes effect immediately.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Upgrade Paths</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Free → Pro:</strong> Gain all premium features (meal planning, goals, expenses, etc.)</li>
                  <li><strong>Free → Family:</strong> Skip Pro and go directly to Family features</li>
                  <li><strong>Pro → Family:</strong> Add more member slots (6 vs 2) and family features</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Proration Works</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When you upgrade mid-cycle, you only pay the difference. For example, if you&apos;re halfway through a Pro month and upgrade to Family, you pay half the Family price for the remaining time. Your next full billing cycle adjusts to the new plan.
                </p>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Instant Access:</strong> New features become available the moment your upgrade processes - no waiting required.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Downgrading Your Plan */}
            <section id="downgrading" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Downgrading Your Plan</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you need fewer features, you can downgrade your plan. Here&apos;s what to expect and how to prepare.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Downgrade Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Family → Pro:</strong> Lose family features and extra member slots (6 → 2)</li>
                  <li><strong>Pro → Free:</strong> Lose all premium features but keep basic functionality</li>
                  <li><strong>Family → Free:</strong> Return to basic features only</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Happens to Your Data</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your data is never deleted when you downgrade. Meal plans, goals, expenses - everything remains in your account. You just won&apos;t be able to add new items to premium features or access certain views until you upgrade again.
                </p>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Timing:</strong> Downgrades take effect at the end of your current billing period. You keep premium access until then.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Canceling Your Subscription */}
            <section id="canceling" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Canceling Your Subscription</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  We&apos;re sad to see you go, but canceling is straightforward and you won&apos;t lose access immediately.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Cancel</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Subscription</li>
                  <li>Click &quot;Manage Billing&quot;</li>
                  <li>Select &quot;Cancel Subscription&quot;</li>
                  <li>Confirm your decision</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Happens Next</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>You keep premium access until the end of your current billing period</li>
                  <li>No additional charges will be made</li>
                  <li>After the period ends, you move to the Free plan</li>
                  <li>All your data remains - you can resubscribe anytime</li>
                </ul>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Pause Instead?</strong> If you&apos;re facing temporary budget constraints, contact support. We may be able to offer a pause or temporary discount.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* PLAN COMPARISON */}
            {/* ============================================================ */}

            {/* Free Plan Features */}
            <section id="free-features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Free Plan Features</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Free plan provides essential household organization tools at no cost. It&apos;s perfect for trying Rowan or for simple needs.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Included Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Tasks &amp; Reminders:</strong> Create and manage tasks with due dates and reminders</li>
                  <li><strong>Calendar:</strong> View and manage events on a shared calendar</li>
                  <li><strong>Shopping Lists:</strong> Create shopping lists and check off items</li>
                  <li><strong>Messages:</strong> Send messages to household members</li>
                  <li><strong>Up to 2 Members:</strong> Share your Space with one other person</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Limitations</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Free users don&apos;t have access to meal planning, goals, expense tracking, or AI features. These are reserved for Pro and Family subscribers.
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Free Forever:</strong> The Free plan is not a limited trial. You can use it indefinitely at no cost.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Pro Plan Features */}
            <section id="pro-features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Pro Plan Features</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Pro is our most popular plan, unlocking advanced features for individuals and couples who want comprehensive household management.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Everything in Free, Plus:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Meal Planning:</strong> Plan weekly meals, discover recipes, generate shopping lists</li>
                  <li><strong>Goals &amp; Milestones:</strong> Set and track shared goals with progress tracking</li>
                  <li><strong>Expense Tracking:</strong> Log expenses, create budgets, view spending analytics</li>
                  <li><strong>AI Receipt Scanning:</strong> Photograph receipts and auto-extract expense details</li>
                  <li><strong>Advanced Analytics:</strong> Deeper insights into tasks, budgets, and household patterns</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Pricing</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  $18/month or $180/year (save ~17% with annual — 2 months free). Both options include all Pro features with no restrictions.
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Best Value:</strong> Pro is ideal for couples who want the full Rowan experience without needing extra member slots.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Family Plan Features */}
            <section id="family-features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Family Plan Features</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Family plan is designed for larger households. Get everything in Pro plus additional member capacity and family-oriented features.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Everything in Pro, Plus:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Up to 6 Members:</strong> Invite children, extended family, or roommates</li>
                  <li><strong>Chore Rotation:</strong> Automatically rotate chore assignments among family members</li>
                  <li><strong>Rewards System:</strong> Gamify chores with points and rewards for children</li>
                  <li><strong>Family Calendar Views:</strong> See everyone&apos;s schedule at a glance</li>
                  <li><strong>Member Permissions:</strong> Control what children can see and do</li>
                  <li><strong>Increased Storage:</strong> More space for photos and attachments</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Pricing</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  $29/month or $290/year (save ~17% with annual — 2 months free). That&apos;s less than $5/month per member for a family of 6!
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Family Value:</strong> The more members in your household, the better value Family becomes per person.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Feature Gating Explained */}
            <section id="feature-gating" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Feature Gating Explained</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan uses feature gating to show you what&apos;s available at each subscription tier. Here&apos;s how it works and why we do it.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Feature Gating Works</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Premium features are visible but locked for Free users</li>
                  <li>Clicking a locked feature shows an upgrade prompt</li>
                  <li>You can see exactly what you&apos;d get by upgrading</li>
                  <li>No hidden features - transparency in what each plan offers</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why We Show Locked Features</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rather than hiding premium features entirely, we believe in showing you what&apos;s possible. This helps you understand the full potential of Rowan and make informed decisions about whether to upgrade.
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Not Pushy:</strong> We don&apos;t spam you with upgrade prompts. You&apos;ll only see them when you try to access a premium feature.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* FAQ & TROUBLESHOOTING */}
            {/* ============================================================ */}

            {/* Common Billing Questions */}
            <section id="billing-faq" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Common Billing Questions</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Here are answers to the most frequently asked billing questions.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Q: When will I be charged?</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  A: You&apos;re charged immediately when you first subscribe, then on the same day each billing cycle (monthly or annually).
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Q: What is your refund policy?</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  A: All sales are final. We offer a 14-day free trial with no credit card required so you can fully evaluate Rowan before subscribing. If you cancel, your plan stays active until the end of your billing period.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Q: What happens if my payment fails?</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  A: We&apos;ll retry the payment a few times and notify you. You have a grace period to update your payment info before losing premium access.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Q: Can I change my billing date?</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  A: Not directly, but you can cancel and resubscribe on a different date if needed.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Payment Failed - What To Do */}
            <section id="payment-failed" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Payment Failed - What To Do</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If your payment fails, don&apos;t panic. Here&apos;s how to resolve it and maintain your subscription.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Common Causes</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Expired credit card</li>
                  <li>Insufficient funds</li>
                  <li>Card blocked for online purchases</li>
                  <li>Bank flagged the transaction</li>
                  <li>Incorrect card details</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Resolve</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Check your email for details about the failure</li>
                  <li>Go to Settings → Subscription → Manage Billing</li>
                  <li>Update your payment method or add a new card</li>
                  <li>Wait for the next automatic retry, or contact support to retry immediately</li>
                </ol>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>Grace Period:</strong> You typically have a few days to fix payment issues before losing premium access.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Cancellation Policy */}
            <section id="cancellation-policy" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Cancellation Policy</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  We offer a 14-day free trial so you can fully evaluate Rowan before subscribing. All sales are final once you purchase a subscription.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Cancellation Works</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>You can cancel your subscription at any time from Settings</li>
                  <li>Your plan remains active until the end of your current billing period</li>
                  <li>After the billing period ends, you&apos;ll be moved to the free tier</li>
                  <li>Your data is preserved and accessible within free tier limits</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">No Refunds</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All sales are final — no refunds will be issued</li>
                  <li>The free trial exists so you can try everything before committing</li>
                  <li>No credit card is required during the trial</li>
                </ul>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>Tip:</strong> Take full advantage of your 14-day free trial to explore all features before subscribing.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Contact Support */}
            <section id="contact-support" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Contact Support</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Have a billing question we haven&apos;t answered? Our support team is here to help.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Reach Us</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Email:</strong> contact@steelmotionllc.com</li>
                  <li><strong>In-App:</strong> Settings → Support → Contact Us</li>
                  <li><strong>Response Time:</strong> Usually within 24 hours (Pro/Family get priority)</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Include</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When contacting support about billing, include: your account email, the nature of your question, and any relevant dates or amounts. This helps us resolve your issue faster.
                </p>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>We&apos;re Human:</strong> Real people answer every support request. We genuinely want to help you have the best experience with Rowan.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

          </div>

        </div>
      </div>
  );
}
