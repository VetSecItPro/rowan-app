/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';

import {
  type LucideIcon,
  ArrowLeft,
  Users,
  Play,
  Settings,
  UserPlus,
  Shield,
  Eye,
  Mail,
  CheckCircle,
  XCircle,
  Crown,
  UserCheck,
  Building,
  Lock,
  Zap,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Share2,
  Heart,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-teal-950/30 to-cyan-950/20">
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
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Space & Collaboration
              </h1>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Master space management, member invitations, and team collaboration. Learn how to create and manage
                collaborative workspaces for your family or team.
              </p>
            </div>
          </div>

          {/* Feature Overview */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center mb-4">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Spaces</h3>
                <p className="text-sm text-gray-400">
                  Create collaborative workspaces for different groups - family, projects, or teams
                </p>
              </div>

              <div className="p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Invitations</h3>
                <p className="text-sm text-gray-400">
                  Securely invite members via email with role-based permissions and expiration dates
                </p>
              </div>

              <div className="p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Presence</h3>
                <p className="text-sm text-gray-400">
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
                        className="group p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 hover:border-teal-600 rounded-2xl hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors">
                            {article.title}
                          </h3>
                          <span className="text-xs font-medium text-teal-400 bg-teal-900/30 px-2 py-1 rounded-full whitespace-nowrap ml-3">
                            {article.readTime}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mb-4">
                          {article.description}
                        </p>
                        <div className="flex items-center text-sm font-semibold text-teal-400">
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
            <div className="p-8 bg-gradient-to-r from-teal-900/30 to-cyan-900/30 backdrop-blur-sm border border-teal-800/60 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Quick Reference</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Space Roles
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">Owner:</span>
                      <span className="text-gray-400">Full control, can delete space</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Admin:</span>
                      <span className="text-gray-400">Manage members, send invitations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Member:</span>
                      <span className="text-gray-400">Collaborate, view all content</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-500" />
                    Presence Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">Online:</span>
                      <span className="text-gray-400">Active in the last 2 minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="font-medium">Offline:</span>
                      <span className="text-gray-400">Inactive or away</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-teal-800">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Perfect for Families
                </h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Rowan's collaboration features are designed for families and small teams (up to 6 members).
                  Simple, battery-efficient, and focused on what matters most - staying connected and organized together.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ARTICLE CONTENT SECTIONS */}
          {/* ============================================================ */}
          <div className="mt-20 max-w-4xl mx-auto space-y-16">

            {/* ============================================================ */}
            {/* GETTING STARTED SECTION */}
            {/* ============================================================ */}

            {/* What are Spaces? */}
            <section id="what-are-spaces" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">What are Spaces?</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Spaces are the foundation of collaboration in Rowan. Think of a space as a shared workspace where family members or team members can work together on tasks, calendars, shopping lists, meals, and more. Everything you create in Rowan belongs to a space, making it easy to share and collaborate.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why Spaces Matter</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Data isolation:</strong> Each space keeps its data separate from other spaces</li>
                  <li><strong>Collaboration:</strong> Share tasks, calendars, and lists with space members automatically</li>
                  <li><strong>Privacy:</strong> Only members of a space can see and access its content</li>
                  <li><strong>Flexibility:</strong> Create multiple spaces for different groups (family, roommates, work team)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Default Personal Space</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When you first sign up for Rowan, a personal space is automatically created for you. This is your private workspace where you can manage personal tasks and items. You can invite others to join your personal space, or create new spaces for different purposes.
                </p>

                <div className="p-4 bg-teal-900/30 border border-teal-800 rounded-lg mt-6">
                  <p className="text-teal-200 text-sm">
                    <strong>Tip:</strong> Rowan is optimized for families and small teams with up to 6 members per space. This keeps the experience simple and battery-efficient on mobile devices.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Creating Your First Space */}
            <section id="creating-space" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Creating Your First Space</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Creating a new space is simple and takes just a few seconds. You might want to create separate spaces for different groups - one for your household, another for a project team, or a third for planning a trip with friends.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Create a Space</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Click on the space selector in the header (shows your current space name)</li>
                  <li>Select "Create New Space" from the dropdown menu</li>
                  <li>Enter a name for your space (e.g., "Johnson Family", "Weekend Project")</li>
                  <li>Click "Create" to finalize</li>
                  <li>You'll automatically become the Owner of the new space</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Naming Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use descriptive names that identify the group or purpose</li>
                  <li>Keep names short but meaningful (e.g., "Family", "Work Team", "Book Club")</li>
                  <li>You can always rename your space later from Space Settings</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">After Creating Your Space</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Once your space is created, you can immediately start adding content. The next step is usually to invite other members to join your space. As the Owner, you have full control over who can join and what roles they have.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Space Roles & Permissions */}
            <section id="roles-permissions" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Space Roles & Permissions</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan uses a simple three-tier role system to manage what each member can do within a space. Understanding these roles helps you set up your space with the right level of control for each member.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Owner
                </h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  The Owner is the creator and ultimate administrator of the space. There can only be one Owner per space.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Full access to all features and content</li>
                  <li>Can invite members and assign any role</li>
                  <li>Can promote members to Admin or demote them</li>
                  <li>Can remove any member from the space</li>
                  <li>Can rename or delete the entire space</li>
                  <li>Cannot be removed by anyone else</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Admin
                </h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  Admins help manage the space and can perform most administrative tasks.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Full access to all features and content</li>
                  <li>Can invite new members (as Admin or Member)</li>
                  <li>Can manage pending invitations</li>
                  <li>Can remove Members from the space</li>
                  <li>Cannot remove the Owner or other Admins</li>
                  <li>Cannot delete the space</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-500" />
                  Member
                </h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  Members are regular collaborators who can access and contribute to the space.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Full access to all features and content</li>
                  <li>Can create, edit, and delete their own items</li>
                  <li>Can view and interact with shared content</li>
                  <li>Cannot invite new members</li>
                  <li>Cannot manage other members</li>
                  <li>Can leave the space at any time</li>
                </ul>

                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Note:</strong> All roles have equal access to features like tasks, calendar, shopping lists, and meals. The role differences are only about space administration and member management.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Switching Between Spaces */}
            <section id="switching-spaces" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Switching Between Spaces</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you belong to multiple spaces, switching between them is quick and easy. Each space maintains its own data, so switching spaces changes all the content you see throughout Rowan.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Switch Spaces</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Look for the space selector in the header (displays your current space name)</li>
                  <li>Click on the space name to open the dropdown</li>
                  <li>Select the space you want to switch to</li>
                  <li>The page will update to show content from the selected space</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Changes When You Switch</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All tasks, calendar events, and reminders change to the new space</li>
                  <li>Shopping lists and meal plans reflect the new space</li>
                  <li>Messages show conversations from the new space</li>
                  <li>Member list shows people in the new space</li>
                  <li>Your personal settings (notifications, theme) stay the same</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Space Persistence</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan remembers which space you were last using. When you return to the app, you'll automatically be in the same space you left. This makes it convenient to focus on one space at a time without repeatedly switching.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* INVITATIONS & ACCESS SECTION */}
            {/* ============================================================ */}

            {/* Inviting Members to Your Space */}
            <section id="inviting-members" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Inviting Members to Your Space</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Inviting members is the primary way to grow your space. Only Owners and Admins can send invitations. The invitation system uses secure, time-limited links to ensure only intended recipients can join.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Invite Someone</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Space Settings</li>
                  <li>Click the "Invite Member" button</li>
                  <li>Enter the person's email address</li>
                  <li>Select their role (Admin or Member)</li>
                  <li>Click "Send Invitation"</li>
                  <li>The invitee will receive an email with a secure link</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Choosing the Right Role</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Admin:</strong> Choose for trusted family members or partners who should help manage the space</li>
                  <li><strong>Member:</strong> Choose for children, extended family, or collaborators who just need access</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Invitation Limits</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Each space can have up to 6 members total. This keeps spaces focused and ensures optimal performance, especially on mobile devices. If you need more members, consider creating separate spaces for different sub-groups.
                </p>

                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Tip:</strong> Make sure the email address is correct before sending. Invitations go to the exact email entered, and the recipient must have or create a Rowan account with that email to accept.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Accepting Space Invitations */}
            <section id="accepting-invitations" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Accepting Space Invitations</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  When someone invites you to their space, you'll receive an email with a special invitation link. This link is unique to you and expires after a set period for security.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Accept an Invitation</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Check your email for an invitation from Rowan</li>
                  <li>Click the "Accept Invitation" button in the email</li>
                  <li>If you're not logged in, you'll be prompted to sign in or create an account</li>
                  <li>The invitation will be processed and you'll be added to the space</li>
                  <li>You'll be redirected to the space dashboard</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Important Requirements</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>You must use the same email address the invitation was sent to</li>
                  <li>If you don't have a Rowan account, create one with that email</li>
                  <li>The invitation link can only be used once</li>
                  <li>Links expire after the set expiration period (typically 7 days)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">After Accepting</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Once you've accepted, you'll have immediate access to all the space's content based on your assigned role. You can switch between this new space and any other spaces you belong to using the space selector.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Managing Pending Invitations */}
            <section id="managing-invitations" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Managing Pending Invitations</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  As an Owner or Admin, you can view and manage all pending invitations for your space. This helps you track who has been invited, resend invitations if needed, or cancel invitations that are no longer relevant.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Viewing Pending Invitations</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Space Settings</li>
                  <li>Look for the "Pending Invitations" section</li>
                  <li>You'll see a list of all invitations that haven't been accepted yet</li>
                  <li>Each invitation shows the email, assigned role, and expiration date</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Resending an Invitation</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  If someone hasn't received their invitation or it got lost, you can resend it:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Find the invitation in the pending list</li>
                  <li>Click the "Resend" button</li>
                  <li>A new email will be sent with a fresh invitation link</li>
                  <li>The old link becomes invalid</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Canceling an Invitation</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you no longer want someone to join, you can cancel their invitation:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Find the invitation in the pending list</li>
                  <li>Click the "Cancel" or delete button</li>
                  <li>The invitation link will be invalidated immediately</li>
                  <li>The person will not be able to join using that link</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Invitation Security & Expiration */}
            <section id="invitation-security" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Invitation Security & Expiration</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan takes invitation security seriously. Every invitation is protected with cryptographic tokens and time limits to prevent unauthorized access to your spaces.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Security Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Unique tokens:</strong> Each invitation has a cryptographically secure, unique token</li>
                  <li><strong>Email verification:</strong> Invitations can only be accepted by the exact email invited</li>
                  <li><strong>Single use:</strong> Once accepted, the invitation link cannot be reused</li>
                  <li><strong>Automatic expiration:</strong> Unused invitations expire after a set period</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Expiration Policy</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Invitations typically expire after 7 days. This prevents old invitation links from being used unexpectedly. If an invitation expires before being accepted:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>The person cannot use the expired link</li>
                  <li>They will see an "invitation expired" message</li>
                  <li>You can send a new invitation if still needed</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Best Security Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Only invite people you know and trust</li>
                  <li>Verify the email address is correct before sending</li>
                  <li>Cancel invitations for people who no longer need access</li>
                  <li>Regularly review your space members and remove inactive ones</li>
                </ul>

                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Warning:</strong> Never share invitation links publicly or in group chats. Each link is meant for a specific person and could grant unauthorized access if misused.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* MEMBER MANAGEMENT SECTION */}
            {/* ============================================================ */}

            {/* Viewing Space Members */}
            <section id="viewing-members" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Viewing Space Members</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The member list shows everyone who belongs to your current space. You can see their names, roles, and online status at a glance, making it easy to know who's available and what permissions they have.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Where to View Members</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Header:</strong> Quick member avatars with presence indicators</li>
                  <li><strong>Space Settings:</strong> Full member list with management options</li>
                  <li><strong>Dashboard widgets:</strong> Family/team activity and presence</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Member Information Displayed</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Avatar:</strong> Profile picture or initials</li>
                  <li><strong>Name:</strong> Display name they've set in their profile</li>
                  <li><strong>Role badge:</strong> Owner (crown), Admin (shield), or Member (checkmark)</li>
                  <li><strong>Presence indicator:</strong> Green dot (online) or gray dot (offline)</li>
                  <li><strong>Email:</strong> Their email address (visible to Owners and Admins)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Member Count</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  The total member count is always visible in the space selector. This helps you quickly see how many people are in your current space and how close you are to the 6-member limit.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Member Roles & Responsibilities */}
            <section id="member-roles" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Member Roles & Responsibilities</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Understanding what each role can and cannot do helps you assign the right permissions to each member. Here's a detailed breakdown of responsibilities for each role.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Owner Responsibilities</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  The Owner is the ultimate authority in the space. Typically, this is the person who created the space.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Setting the overall direction and purpose of the space</li>
                  <li>Making decisions about space policies (naming, access, etc.)</li>
                  <li>Promoting trusted members to Admin when needed</li>
                  <li>Being the final arbiter in disputes or access decisions</li>
                  <li>Deciding whether to delete the space if no longer needed</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Admin Responsibilities</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  Admins are trusted helpers who share administrative duties with the Owner.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Inviting new members when the space needs to grow</li>
                  <li>Monitoring pending invitations and following up</li>
                  <li>Helping members with questions about the space</li>
                  <li>Removing members who are no longer part of the group</li>
                  <li>Acting as backup when the Owner is unavailable</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Member Responsibilities</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  Members are the core collaborators who use the space day-to-day.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Actively participating in shared tasks and activities</li>
                  <li>Keeping their profile and preferences up to date</li>
                  <li>Respecting shared content and other members</li>
                  <li>Communicating through the space's messaging features</li>
                  <li>Notifying Admins or Owner if they need role changes</li>
                </ul>

                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Family Tip:</strong> In a family space, parents are often Owner and Admin, while children are Members. This gives parents control over who joins while allowing everyone to collaborate equally on tasks and schedules.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Promoting & Demoting Members */}
            <section id="role-changes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Promoting & Demoting Members</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  As your space evolves, you may need to adjust member roles. Owners can promote Members to Admin or demote Admins to Member. This flexibility helps you manage your space as circumstances change.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Promoting a Member to Admin</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Space Settings</li>
                  <li>Find the member in the member list</li>
                  <li>Click on their role or the "Edit" option</li>
                  <li>Select "Admin" from the role options</li>
                  <li>Confirm the change</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Demoting an Admin to Member</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Only the Owner can demote Admins</li>
                  <li>Go to Settings → Space Settings</li>
                  <li>Find the Admin in the member list</li>
                  <li>Click on their role or the "Edit" option</li>
                  <li>Select "Member" from the role options</li>
                  <li>Confirm the change</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Change Roles</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Promote:</strong> When someone takes on more responsibility or you need backup administrators</li>
                  <li><strong>Demote:</strong> When someone no longer needs administrative access or has misused their privileges</li>
                </ul>

                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Note:</strong> Role changes take effect immediately. The member will see their new permissions right away, and any admin-only actions they were performing will be affected.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Removing Members from Spaces */}
            <section id="removing-members" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Removing Members from Spaces</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Sometimes you need to remove a member from your space. This might be because they're no longer part of your household, they've left a project, or for other reasons. Rowan provides safeguards to prevent accidental removals.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Who Can Remove Whom</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Owner:</strong> Can remove any Admin or Member</li>
                  <li><strong>Admin:</strong> Can remove Members only (not other Admins or the Owner)</li>
                  <li><strong>Member:</strong> Cannot remove anyone (can only leave voluntarily)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Remove a Member</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Space Settings</li>
                  <li>Find the member you want to remove</li>
                  <li>Click the "Remove" or trash icon next to their name</li>
                  <li>Confirm the removal in the dialog that appears</li>
                  <li>The member is immediately removed from the space</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Happens After Removal</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>The person loses access to the space immediately</li>
                  <li>They cannot see any space content anymore</li>
                  <li>Content they created remains in the space</li>
                  <li>They are not notified by the system (communicate manually if appropriate)</li>
                  <li>They can be re-invited later if circumstances change</li>
                </ul>

                <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mt-6">
                  <p className="text-red-200 text-sm">
                    <strong>Important:</strong> Member removal cannot be undone automatically. If you remove someone by mistake, you'll need to send them a new invitation to rejoin.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* PRESENCE & COLLABORATION SECTION */}
            {/* ============================================================ */}

            {/* Understanding Presence Indicators */}
            <section id="presence-indicators" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Presence Indicators</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Presence indicators show you which space members are currently active in Rowan. This simple feature helps you know when someone is available for collaboration or might respond to messages quickly.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Status Indicators</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <div>
                      <span className="font-medium text-white">Online (Green)</span>
                      <p className="text-sm text-gray-400">Active in the last 2 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                    <div>
                      <span className="font-medium text-white">Offline (Gray)</span>
                      <p className="text-sm text-gray-400">Not currently active or away</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Where You'll See Presence</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Header avatars:</strong> Small dots next to member pictures</li>
                  <li><strong>Member list:</strong> Status indicators next to each name</li>
                  <li><strong>Dashboard:</strong> Family activity widgets showing who's online</li>
                  <li><strong>Messages:</strong> See if conversation partners are available</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Practical Uses</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Know when to send time-sensitive messages</li>
                  <li>Coordinate real-time on shared tasks</li>
                  <li>Check if family members have seen recent updates</li>
                  <li>Feel connected even when apart</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Member Activity Tracking */}
            <section id="activity-tracking" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Member Activity Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan uses a lightweight, battery-efficient system to track member activity. Understanding how this works helps you interpret presence indicators correctly.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Activity is Detected</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Activity is recorded when you interact with Rowan (click, scroll, type)</li>
                  <li>A periodic heartbeat confirms you're still active</li>
                  <li>After 2 minutes of no activity, you appear offline</li>
                  <li>Opening Rowan immediately shows you as online</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Battery Efficiency</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan's presence system is designed to minimize battery impact on mobile devices:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>No constant background polling</li>
                  <li>Efficient WebSocket connections when active</li>
                  <li>Automatic disconnection when backgrounded</li>
                  <li>Quick reconnection when app is reopened</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Activity Privacy</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Presence only shows if you're online or offline - it doesn't reveal what you're doing in Rowan or track your specific actions. Space members see the same simple green/gray indicator.
                </p>

                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>Tip:</strong> If you need uninterrupted focus time, simply close or background the Rowan app. You'll automatically appear offline after 2 minutes.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Collaborative Features */}
            <section id="collaborative-features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Collaborative Features</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Everything in Rowan is designed for collaboration. When you're in a space with others, all features work together seamlessly to keep everyone on the same page.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Real-Time Updates</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Changes appear instantly for all space members</li>
                  <li>No need to refresh or reload the page</li>
                  <li>Task completions, calendar updates, and messages sync automatically</li>
                  <li>See when others are viewing or editing the same content</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Shared Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Tasks:</strong> Assign tasks to members, track completion together</li>
                  <li><strong>Calendar:</strong> Shared events visible to all, individual views available</li>
                  <li><strong>Shopping lists:</strong> Add items collaboratively, check off while shopping</li>
                  <li><strong>Meal planning:</strong> Plan meals together, vote on recipes</li>
                  <li><strong>Messages:</strong> Real-time chat for quick coordination</li>
                  <li><strong>Goals:</strong> Track family goals and milestones together</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Working Together Efficiently</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Assign tasks to specific members for accountability</li>
                  <li>Use mentions in messages to get someone's attention</li>
                  <li>Check presence to know the best time to collaborate</li>
                  <li>Review activity history to catch up on changes</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Privacy & Presence Settings */}
            <section id="privacy-settings" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Privacy & Presence Settings</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  While Rowan is designed for open collaboration within your space, we understand that sometimes you need privacy. Here's how your data and presence are protected.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Privacy by Design</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Only space members can see space content - no public access</li>
                  <li>Your presence is only visible to members of your current space</li>
                  <li>Personal settings and account details remain private</li>
                  <li>No advertising or data sharing with third parties</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Controlling Your Visibility</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  While there's no explicit "invisible mode," you can control your presence naturally:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Close Rowan to appear offline after 2 minutes</li>
                  <li>Switch to a different space if you want focused time</li>
                  <li>Your presence doesn't reveal which features you're using</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Data Protection</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All data is encrypted in transit and at rest</li>
                  <li>Row-level security ensures you only see your space's data</li>
                  <li>Regular security audits protect your information</li>
                  <li>You can export or delete your data at any time</li>
                </ul>

                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>Note:</strong> Rowan is built for trusted groups like families. If you need strict privacy from other members, consider creating a separate personal space for private items.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* SPACE SETTINGS & ADMINISTRATION SECTION */}
            {/* ============================================================ */}

            {/* Space Settings Overview */}
            <section id="space-settings" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Space Settings Overview</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Space Settings is your central hub for managing everything about your space - members, invitations, space details, and more. Access it through your profile settings.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Access Space Settings</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Click on your profile avatar in the header</li>
                  <li>Select "Settings" from the dropdown menu</li>
                  <li>Navigate to "Space Settings" or "Manage Space"</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What You Can Manage</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Space Details:</strong> View and edit space name</li>
                  <li><strong>Members:</strong> See all members, roles, and presence</li>
                  <li><strong>Invitations:</strong> Send new invitations and manage pending ones</li>
                  <li><strong>Role Management:</strong> Promote or demote members (Owner only)</li>
                  <li><strong>Danger Zone:</strong> Leave or delete the space</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Settings by Role</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Owner:</strong> Full access to all settings</li>
                  <li><strong>Admin:</strong> Can manage members and invitations</li>
                  <li><strong>Member:</strong> Can view members and leave the space</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Renaming Your Space */}
            <section id="renaming-space" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Renaming Your Space</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Space names help identify which space you're working in. You can change your space name at any time - it's visible to all members and appears in the space selector.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Rename</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Space Settings</li>
                  <li>Find the "Space Name" or "Rename Space" option</li>
                  <li>Enter the new name</li>
                  <li>Click "Save" or "Update"</li>
                  <li>The new name appears everywhere immediately</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Naming Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use names that clearly identify the group (e.g., "Smith Family")</li>
                  <li>Keep names short for better display in the selector</li>
                  <li>Avoid special characters that might cause display issues</li>
                  <li>Consider including the purpose if you have multiple spaces</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Who Can Rename</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Only the Owner can rename a space. This prevents confusion from frequent name changes and keeps the space identity stable.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Leaving a Space */}
            <section id="leaving-space" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Leaving a Space</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you no longer want to be part of a space, you can leave at any time. This is a voluntary action available to Admins and Members (Owners must transfer ownership first or delete the space).
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Leave a Space</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Make sure you're in the space you want to leave</li>
                  <li>Go to Settings → Space Settings</li>
                  <li>Scroll to the "Danger Zone" section</li>
                  <li>Click "Leave Space"</li>
                  <li>Confirm your decision in the dialog</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Happens When You Leave</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>You immediately lose access to the space and its content</li>
                  <li>Content you created remains in the space</li>
                  <li>You're automatically switched to another space you belong to</li>
                  <li>Other members are not notified (communicate manually)</li>
                  <li>You can be re-invited if you want to return later</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Owner Restrictions</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Owners cannot leave their space directly. If you're the Owner and want to leave:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Transfer ownership to another member (feature coming soon)</li>
                  <li>Or delete the space entirely if no longer needed</li>
                </ul>

                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Warning:</strong> Leaving a space cannot be undone by you. You'll need a new invitation from an Owner or Admin to rejoin.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Deleting a Space (Owners Only) */}
            <section id="deleting-space" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Deleting a Space (Owners Only)</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Deleting a space is a permanent, irreversible action that removes all space content and membership. Only the Owner can delete a space, and multiple safeguards are in place to prevent accidental deletion.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Before You Delete</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Consider these alternatives before deleting:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Remove inactive members instead of deleting the whole space</li>
                  <li>Rename the space if it just needs a fresh start</li>
                  <li>Export any important data you want to keep</li>
                  <li>Communicate with members before taking action</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Steps to Delete a Space</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Ensure you're in the space you want to delete</li>
                  <li>Go to Settings → Space Settings</li>
                  <li>Scroll to the "Danger Zone" section</li>
                  <li>Click "Delete Space"</li>
                  <li>Type the space name to confirm you understand</li>
                  <li>Click "Permanently Delete" to finalize</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Gets Deleted</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All tasks, events, and reminders</li>
                  <li>All shopping lists and meal plans</li>
                  <li>All messages and conversations</li>
                  <li>All goals and milestones</li>
                  <li>All member relationships to the space</li>
                  <li>All pending invitations</li>
                </ul>

                <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mt-6">
                  <p className="text-red-200 text-sm">
                    <strong>CRITICAL:</strong> Space deletion is permanent and cannot be recovered. All data is permanently erased. Make absolutely sure before proceeding.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* BEST PRACTICES & TIPS SECTION */}
            {/* ============================================================ */}

            {/* Family Collaboration Tips */}
            <section id="family-tips" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Family Collaboration Tips</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan is designed with families in mind. Here are best practices for getting the most out of collaborative features with your household.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Setting Up Your Family Space</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Name your space something meaningful (e.g., "The Johnson Family")</li>
                  <li>Make both parents/guardians Admins for shared management</li>
                  <li>Add children as Members - they can fully participate without admin access</li>
                  <li>Consider age-appropriate task assignments from the start</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Daily Routines</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use recurring tasks for daily chores and responsibilities</li>
                  <li>Check the calendar each morning for the day's events</li>
                  <li>Use the shopping list throughout the week as needs arise</li>
                  <li>Plan meals together on weekends for the upcoming week</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Communication Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use messages for quick coordination instead of text chains</li>
                  <li>Check presence indicators before expecting immediate responses</li>
                  <li>Assign tasks clearly with due dates and descriptions</li>
                  <li>Celebrate completed goals together using the goals feature</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Involving Children</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Give children ownership of certain tasks (feeding pets, homework)</li>
                  <li>Let them add items to shopping lists</li>
                  <li>Include them in meal planning discussions</li>
                  <li>Use visual feedback (completions, streaks) as motivation</li>
                </ul>

                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Pro Tip:</strong> Have a weekly "family sync" where everyone reviews the calendar, updates tasks, and plans together. This builds good habits and keeps everyone aligned.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Team Organization Strategies */}
            <section id="team-strategies" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Team Organization Strategies</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  While Rowan is optimized for families, it also works well for small teams, roommates, or project groups. Here's how to organize your team effectively.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Team Structure</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Project lead or coordinator should be the Owner</li>
                  <li>Key contributors can be Admins for flexibility</li>
                  <li>Regular participants should be Members</li>
                  <li>Keep teams small (6 members max) for focused collaboration</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">For Roommates</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Create a single shared space for the household</li>
                  <li>Use task rotation for chores (dishes, trash, cleaning)</li>
                  <li>Track shared expenses and bill splitting</li>
                  <li>Coordinate schedules to avoid conflicts</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">For Project Groups</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Create a dedicated space for each major project</li>
                  <li>Use goals to track project milestones</li>
                  <li>Assign tasks with clear deadlines and owners</li>
                  <li>Use messages for project-related communication</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Multiple Spaces Strategy</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you have different groups, create separate spaces:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Personal space for individual tasks</li>
                  <li>Family space for household matters</li>
                  <li>Project space for specific collaborations</li>
                  <li>Switch between them as needed throughout the day</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Space Security Guidelines */}
            <section id="security-guidelines" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Space Security Guidelines</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Keeping your space secure protects your family or team's private information. Follow these guidelines to maintain a safe collaborative environment.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Invitation Security</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Only invite people you know and trust</li>
                  <li>Double-check email addresses before sending invitations</li>
                  <li>Cancel unused invitations after they're no longer needed</li>
                  <li>Never share invitation links in public forums or group chats</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Member Management</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Review member list periodically - remove people who shouldn't have access</li>
                  <li>Be thoughtful about Admin promotions - only trust people who need the access</li>
                  <li>Remove members promptly when relationships change (roommate moves out, etc.)</li>
                  <li>Monitor for unfamiliar members you don't recognize</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Account Security</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use strong, unique passwords for your Rowan account</li>
                  <li>Don't share your login credentials with others</li>
                  <li>Log out when using shared devices</li>
                  <li>Keep your email account secure (it's used for password recovery)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Data Awareness</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Remember that all space members can see all space content</li>
                  <li>Don't store sensitive information (passwords, SSNs) in Rowan</li>
                  <li>Be mindful of what you share in messages</li>
                  <li>Use your personal space for private items</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Troubleshooting Common Issues */}
            <section id="troubleshooting" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Troubleshooting Common Issues</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Running into problems with spaces or collaboration? Here are solutions to the most common issues users encounter.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Invitation Not Received</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  If someone didn't receive their invitation email:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Check their spam/junk folder</li>
                  <li>Verify the email address was entered correctly</li>
                  <li>Wait a few minutes - sometimes emails are delayed</li>
                  <li>Resend the invitation from Space Settings</li>
                  <li>Try a different email address if the problem persists</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Invitation Link Not Working</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  If clicking the invitation link shows an error:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>The invitation may have expired - ask for a new one</li>
                  <li>The invitation may have been canceled - check with the sender</li>
                  <li>Make sure you're using the same email the invitation was sent to</li>
                  <li>Try copying and pasting the link instead of clicking</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Can't See Other Members' Content</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  If you can't see tasks, events, or messages from others:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Make sure you're in the correct space (check the space selector)</li>
                  <li>Refresh the page to load the latest data</li>
                  <li>Check your internet connection</li>
                  <li>The content may be in a different space - try switching</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Presence Showing Incorrectly</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  If presence indicators seem wrong:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
                  <li>Status updates within 2 minutes - slight delays are normal</li>
                  <li>The person may have switched to a different space</li>
                  <li>Their browser tab may be in the background (shows offline)</li>
                  <li>Refresh your page to get the latest presence data</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Can't Leave or Delete Space</h3>
                <p className="text-gray-400 leading-relaxed mb-2">
                  If the leave or delete options aren't working:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Owners can't leave - they must delete or transfer ownership</li>
                  <li>For deletion, you must type the space name exactly to confirm</li>
                  <li>Make sure you have the right permissions for the action</li>
                  <li>If buttons are disabled, check for any error messages</li>
                </ul>

                <div className="p-4 bg-teal-900/30 border border-teal-800 rounded-lg mt-6">
                  <p className="text-teal-200 text-sm">
                    <strong>Still stuck?</strong> Contact support through the Settings page or email us at support@rowanapp.com. Include details about what you're trying to do and any error messages you see.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-teal-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

          </div>

        </div>
      </div>
  );
}
