'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft,
  Users,
  Play,
  Settings,
  UserPlus,
  Shield,
  Eye,
  Globe,
  Mail,
  CheckCircle,
  XCircle,
  Crown,
  UserCheck,
  Building,
  Lock,
  Zap,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Share2,
  Heart,
} from 'lucide-react';

interface GuideSection {
  title: string;
  icon: any;
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
    color: 'from-teal-500 to-teal-600',
    articles: [
      {
        title: 'What are Spaces?',
        description: 'Understanding how spaces organize your family or team collaboration in Rowan',
        readTime: '3 min read',
        href: '#what-are-spaces',
      },
      {
        title: 'Creating Your First Space',
        description: 'Step-by-step guide to setting up a new collaborative workspace',
        readTime: '4 min read',
        href: '#creating-space',
      },
      {
        title: 'Space Roles & Permissions',
        description: 'Learn about Owner, Admin, and Member roles and what each can do',
        readTime: '5 min read',
        href: '#roles-permissions',
      },
      {
        title: 'Switching Between Spaces',
        description: 'How to navigate between multiple spaces you belong to',
        readTime: '2 min read',
        href: '#switching-spaces',
      },
    ],
  },
  {
    title: 'Invitations & Access',
    icon: UserPlus,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Inviting Members to Your Space',
        description: 'Send secure invitations via email with customizable roles and permissions',
        readTime: '4 min read',
        href: '#inviting-members',
      },
      {
        title: 'Accepting Space Invitations',
        description: 'How to join a space when you receive an invitation email',
        readTime: '3 min read',
        href: '#accepting-invitations',
      },
      {
        title: 'Managing Pending Invitations',
        description: 'Track, resend, or cancel invitations you\'ve sent to others',
        readTime: '3 min read',
        href: '#managing-invitations',
      },
      {
        title: 'Invitation Security & Expiration',
        description: 'Understanding invitation links, security tokens, and expiration dates',
        readTime: '4 min read',
        href: '#invitation-security',
      },
    ],
  },
  {
    title: 'Member Management',
    icon: Users,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Viewing Space Members',
        description: 'See all members, their roles, and online presence indicators',
        readTime: '3 min read',
        href: '#viewing-members',
      },
      {
        title: 'Member Roles & Responsibilities',
        description: 'Understanding Owner, Admin, and Member capabilities and limitations',
        readTime: '5 min read',
        href: '#member-roles',
      },
      {
        title: 'Promoting & Demoting Members',
        description: 'Change member roles between Admin and Member status',
        readTime: '3 min read',
        href: '#role-changes',
      },
      {
        title: 'Removing Members from Spaces',
        description: 'How to remove members and the safeguards in place',
        readTime: '4 min read',
        href: '#removing-members',
      },
    ],
  },
  {
    title: 'Presence & Collaboration',
    icon: Eye,
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'Understanding Presence Indicators',
        description: 'See who\'s online with simple green (online) and gray (offline) dots',
        readTime: '3 min read',
        href: '#presence-indicators',
      },
      {
        title: 'Member Activity Tracking',
        description: 'How presence is detected and when users appear online or offline',
        readTime: '4 min read',
        href: '#activity-tracking',
      },
      {
        title: 'Collaborative Features',
        description: 'Real-time updates, shared data, and working together efficiently',
        readTime: '5 min read',
        href: '#collaborative-features',
      },
      {
        title: 'Privacy & Presence Settings',
        description: 'Control your visibility and manage your online status',
        readTime: '3 min read',
        href: '#privacy-settings',
      },
    ],
  },
  {
    title: 'Space Settings & Administration',
    icon: Settings,
    color: 'from-orange-500 to-orange-600',
    articles: [
      {
        title: 'Space Settings Overview',
        description: 'Access and navigate space management settings in your profile',
        readTime: '3 min read',
        href: '#space-settings',
      },
      {
        title: 'Renaming Your Space',
        description: 'How to change your space name and best practices for naming',
        readTime: '2 min read',
        href: '#renaming-space',
      },
      {
        title: 'Leaving a Space',
        description: 'How to leave a space and what happens to your data',
        readTime: '4 min read',
        href: '#leaving-space',
      },
      {
        title: 'Deleting a Space (Owners Only)',
        description: 'Permanently delete a space and understand the consequences',
        readTime: '5 min read',
        href: '#deleting-space',
      },
    ],
  },
  {
    title: 'Best Practices & Tips',
    icon: Zap,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Family Collaboration Tips',
        description: 'Best practices for using spaces with family members',
        readTime: '6 min read',
        href: '#family-tips',
      },
      {
        title: 'Team Organization Strategies',
        description: 'How to organize small teams and optimize collaboration',
        readTime: '5 min read',
        href: '#team-strategies',
      },
      {
        title: 'Space Security Guidelines',
        description: 'Keep your space secure with proper member management',
        readTime: '4 min read',
        href: '#security-guidelines',
      },
      {
        title: 'Troubleshooting Common Issues',
        description: 'Solutions for common space management and invitation problems',
        readTime: '7 min read',
        href: '#troubleshooting',
      },
    ],
  },
];

export default function SpacesDocumentationPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-cyan-50/30 dark:from-gray-950 dark:via-teal-950/20 dark:to-cyan-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/documentation"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>

            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Space & Collaboration
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Master space management, member invitations, and team collaboration. Learn how to create and manage
                collaborative workspaces for your family or team.
              </p>
            </div>
          </div>

          {/* Feature Overview */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center mb-4">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Spaces</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create collaborative workspaces for different groups - family, projects, or teams
                </p>
              </div>

              <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Invitations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Securely invite members via email with role-based permissions and expiration dates
                </p>
              </div>

              <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Presence</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  See who's online with real-time presence indicators and activity tracking
                </p>
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
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        {section.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Section {sectionIndex + 1} of {guideSections.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.articles.map((article, index) => (
                      <Link
                        key={index}
                        href={article.href}
                        className="group p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 hover:border-teal-300 dark:hover:border-teal-600 rounded-2xl hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {article.title}
                          </h3>
                          <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-full whitespace-nowrap ml-3">
                            {article.readTime}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                          {article.description}
                        </p>
                        <div className="flex items-center text-sm font-semibold text-teal-600 dark:text-teal-400">
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

          {/* Quick Reference */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="p-8 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 backdrop-blur-sm border border-teal-200/60 dark:border-teal-800/60 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Quick Reference</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Space Roles
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">Owner:</span>
                      <span className="text-gray-600 dark:text-gray-400">Full control, can delete space</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Admin:</span>
                      <span className="text-gray-600 dark:text-gray-400">Manage members, send invitations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Member:</span>
                      <span className="text-gray-600 dark:text-gray-400">Collaborate, view all content</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-500" />
                    Presence Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">Online:</span>
                      <span className="text-gray-600 dark:text-gray-400">Active in the last 2 minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="font-medium">Offline:</span>
                      <span className="text-gray-600 dark:text-gray-400">Inactive or away</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-teal-200 dark:border-teal-800">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Perfect for Families
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Rowan's collaboration features are designed for families and small teams (up to 6 members).
                  Simple, battery-efficient, and focused on what matters most - staying connected and organized together.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}