import Link from 'next/link';
import {
  type LucideIcon,
  ArrowLeft,
  MessageSquare,
  Play,
  Send,
  MessageCircle,
  Heart,
  Image as ImageIcon,
  Mic,
  Paperclip,
  AtSign,
  Search,
  Reply,
  Pin,
  Users,
  Zap,
  Clock,
  Lightbulb,
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
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'What is Messages?',
        description: 'Your instant communication hub for staying connected with your partner and family',
        readTime: '3 min read',
        href: '#overview',
      },
      {
        title: 'Creating Your First Conversation',
        description: 'Quick guide to starting a new conversation and organizing your chats',
        readTime: '2 min read',
        href: '#conversations',
      },
      {
        title: 'Understanding Conversation Types',
        description: 'Learn about General, Private, and Group conversations',
        readTime: '3 min read',
        href: '#conversation-types',
      },
      {
        title: 'Quick Start Guide',
        description: 'Get up and running with messaging in under 5 minutes',
        readTime: '5 min read',
        href: '#quick-start',
      },
    ],
  },
  {
    title: 'Core Messaging Features',
    icon: Send,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Sending & Receiving Messages',
        description: 'Master the basics of sending text messages and staying in touch',
        readTime: '4 min read',
        href: '#sending',
      },
      {
        title: 'Real-Time Sync',
        description: 'Messages appear instantly for everyone - no refresh needed!',
        readTime: '2 min read',
        href: '#realtime',
      },
      {
        title: 'Message Editing & Deletion',
        description: 'Fix typos or remove messages you didn\'t mean to send',
        readTime: '3 min read',
        href: '#editing',
      },
      {
        title: 'Emoji Reactions',
        description: 'React to messages with 30+ family-friendly emojis for quick responses',
        readTime: '2 min read',
        href: '#reactions',
      },
      {
        title: 'Typing Indicators',
        description: 'See when someone is composing a response in real-time',
        readTime: '2 min read',
        href: '#typing',
      },
      {
        title: 'Read Receipts',
        description: 'Know when your messages have been seen',
        readTime: '2 min read',
        href: '#read-receipts',
      },
    ],
  },
  {
    title: 'Rich Content & Media',
    icon: ImageIcon,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'File Attachments',
        description: 'Share photos, documents, PDFs, and more in your conversations',
        readTime: '4 min read',
        href: '#attachments',
      },
      {
        title: 'Voice Messages',
        description: 'Record and send voice messages when typing isn\'t convenient',
        readTime: '3 min read',
        href: '#voice',
      },
      {
        title: 'Rich Text Formatting',
        description: 'Bold, italic, strikethrough, and more formatting options',
        readTime: '3 min read',
        href: '#formatting',
      },
      {
        title: 'Emoji Picker',
        description: 'Choose from 30 universal emojis organized by theme',
        readTime: '2 min read',
        href: '#emoji-picker',
      },
      {
        title: 'Image Preview & Lightbox',
        description: 'View images in full-screen mode with smooth transitions',
        readTime: '2 min read',
        href: '#image-preview',
      },
    ],
  },
  {
    title: 'Organization & Management',
    icon: Users,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Multiple Conversations',
        description: 'Organize chats into separate threads for different topics or groups',
        readTime: '4 min read',
        href: '#multiple-conversations',
      },
      {
        title: 'Pinned Messages',
        description: 'Keep important messages at the top for easy access',
        readTime: '3 min read',
        href: '#pinned',
      },
      {
        title: 'Message Search',
        description: 'Find specific messages quickly by searching conversation history',
        readTime: '3 min read',
        href: '#search',
      },
      {
        title: 'Date Organization',
        description: 'Messages are automatically grouped by date with "Today" and "Yesterday" labels',
        readTime: '2 min read',
        href: '#date-organization',
      },
      {
        title: 'Conversation Sidebar',
        description: 'Navigate between conversations with the collapsible sidebar',
        readTime: '3 min read',
        href: '#sidebar',
      },
    ],
  },
  {
    title: 'Advanced Features',
    icon: Zap,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Message Threads & Replies',
        description: 'Reply to specific messages to keep conversations organized',
        readTime: '4 min read',
        href: '#threads',
      },
      {
        title: 'Mentions & @Tagging',
        description: 'Tag specific users with @ to get their attention in group chats',
        readTime: '3 min read',
        href: '#mentions',
      },
      {
        title: 'Forward Messages',
        description: 'Share messages from one conversation to another instantly',
        readTime: '3 min read',
        href: '#forward',
      },
      {
        title: 'Swipe Actions (Mobile)',
        description: 'Swipe left to reply or delete messages on mobile devices',
        readTime: '2 min read',
        href: '#swipe',
      },
      {
        title: 'Message History',
        description: 'Access complete conversation history with timestamps',
        readTime: '2 min read',
        href: '#history',
      },
    ],
  },
  {
    title: 'Collaboration & Notifications',
    icon: Heart,
    color: 'from-rose-500 to-rose-600',
    articles: [
      {
        title: 'Conversation Participants',
        description: 'Add multiple family members to group conversations',
        readTime: '4 min read',
        href: '#participants',
      },
      {
        title: 'Message Notifications',
        description: 'Real-time notification bell shows unread message count',
        readTime: '3 min read',
        href: '#notifications',
      },
      {
        title: 'Guided Onboarding',
        description: 'First-time users get a friendly walkthrough of messaging features',
        readTime: '2 min read',
        href: '#onboarding',
      },
      {
        title: 'Conversation Stats',
        description: 'Track messages sent today, this week, and total conversation activity',
        readTime: '2 min read',
        href: '#stats',
      },
    ],
  },
];

export default function MessagesDocumentationPage() {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-green-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Messages Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete documentation for all 20 messaging features
              </p>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-green-100 mb-2">
                  Stay Connected with Powerful Messaging
                </h3>
                <p className="text-green-200 mb-2">
                  Rowan&apos;s messaging system is designed to keep couples and families in sync with everything they need:
                </p>
                <ul className="text-sm text-green-300 space-y-1 ml-4">
                  <li>• <strong>Real-time sync</strong> - Messages appear instantly for everyone</li>
                  <li>• <strong>Voice messages</strong> - Record audio when typing isn&apos;t convenient</li>
                  <li>• <strong>File sharing</strong> - Send photos, documents, and files up to 50MB</li>
                  <li>• <strong>Emoji reactions</strong> - Quick responses with 30+ family-friendly emojis</li>
                  <li>• <strong>Message threads</strong> - Reply to specific messages to stay organized</li>
                  <li>• <strong>Pinned messages</strong> - Keep important info at the top</li>
                  <li>• <strong>Mentions & @tagging</strong> - Get someone&apos;s attention in group chats</li>
                  <li>• <strong>Search history</strong> - Find any message in seconds</li>
                  <li>• <strong>Typing indicators</strong> - See when others are composing</li>
                  <li>• <strong>Multiple conversations</strong> - Organize topics in separate threads</li>
                  <li>• Plus 10 more features...</li>
                </ul>
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
                        <span className="text-xs text-green-400 font-medium">
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

        {/* Detailed Content Sections with IDs for anchors */}
        <div className="mt-12 space-y-12">
          {/* Getting Started */}
          <section id="overview" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-green-600" />
              What is Messages?
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-4">
                Think of Messages as your family&apos;s private chat hub - it&apos;s where quick check-ins, important updates, and daily conversations happen.
                Whether you&apos;re coordinating dinner plans, sharing photos, or just saying &quot;I love you,&quot; Messages keeps everyone connected in real-time.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                <strong>Why use Messages instead of texting?</strong> Unlike SMS or other messaging apps, Rowan Messages is designed specifically
                for families. Everything is integrated - send a shopping list, share calendar events, or forward reminders without switching apps.
                Plus, your conversations are organized, searchable, and always in sync across all devices.
              </p>
              <div className="bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
                <p className="text-green-200 font-medium mb-2">💡 Pro Tip:</p>
                <p className="text-green-300 text-sm">
                  Create separate conversations for different topics (like &quot;Meal Planning&quot; or &quot;House Projects&quot;) to keep discussions organized and easy to find later!
                </p>
              </div>
            </div>
          </section>

          <section id="conversations" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              Creating Your First Conversation
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Ready to start chatting? Here&apos;s how to create a conversation:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li className="pl-2">
                  <strong className="text-white">1. Click the &quot;+ New Conversation&quot; button</strong> - You&apos;ll find this at the top of the Messages page or in the conversation sidebar.
                </li>
                <li className="pl-2">
                  <strong className="text-white">2. Give it a name</strong> - Choose something descriptive like &quot;Family Chat,&quot; &quot;Weekend Plans,&quot; or &quot;Home Renovation.&quot;
                </li>
                <li className="pl-2">
                  <strong className="text-white">3. Add participants</strong> - Select family members you want to include. You can always add more people later!
                </li>
                <li className="pl-2">
                  <strong className="text-white">4. Start messaging!</strong> - That&apos;s it! Your conversation is ready to use.
                </li>
              </ol>
              <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg mt-6">
                <p className="text-blue-200 font-medium mb-2">🎯 Quick Tip:</p>
                <p className="text-blue-300 text-sm">
                  Your first conversation is automatically created as &quot;General&quot; - perfect for everyday family chat. Create additional conversations as needed for specific topics or projects.
                </p>
              </div>
            </div>
          </section>

          <section id="sending" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Send className="w-8 h-8 text-green-600" />
              Sending & Receiving Messages
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Sending messages is as easy as typing and hitting Enter. But there&apos;s more to discover:
              </p>
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Type Your Message</h4>
                  <p className="text-gray-300 text-sm">
                    Click in the message box at the bottom and start typing. You&apos;ll see a typing indicator appear for other participants, so they know you&apos;re composing a response.
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Send Options</h4>
                  <ul className="text-sm text-gray-300 space-y-1 ml-4">
                    <li>• Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Enter</kbd> to send (or click the Send button)</li>
                    <li>• Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Shift + Enter</kbd> for a new line</li>
                    <li>• Use the emoji button 😊 to add reactions quickly</li>
                  </ul>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Receiving Messages</h4>
                  <p className="text-gray-300 text-sm">
                    New messages appear instantly at the bottom of the conversation - no refresh needed! You&apos;ll see a notification badge on the Messages icon when you have unread messages in other conversations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="reactions" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Heart className="w-8 h-8 text-green-600" />
              Emoji Reactions
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Sometimes an emoji says it better than words! React to any message with our curated collection of 30 family-friendly emojis.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">How to React:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Hover over any message (or long-press on mobile)</li>
                    <li className="pl-2">2. Click the emoji reaction button that appears</li>
                    <li className="pl-2">3. Choose from organized emoji categories: Smiles, Gestures, Celebrations, Nature, and more</li>
                    <li className="pl-2">4. Your reaction appears below the message instantly!</li>
                  </ol>
                </div>
                <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded-r-lg">
                  <p className="text-purple-200 font-medium mb-2">✨ Fun Fact:</p>
                  <p className="text-purple-300 text-sm">
                    Multiple people can react with the same emoji - you&apos;ll see a count next to each reaction showing how many people agreed!
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="attachments" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Paperclip className="w-8 h-8 text-green-600" />
              File Attachments
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Share more than just text! Send photos, documents, PDFs, and any file type up to 50MB per attachment.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">Supported File Types:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-900/20 p-3 rounded-lg text-center">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                      <p className="text-xs text-gray-300">Images<br/>(JPG, PNG, GIF)</p>
                    </div>
                    <div className="bg-red-900/20 p-3 rounded-lg text-center">
                      <Paperclip className="w-6 h-6 mx-auto mb-1 text-red-600" />
                      <p className="text-xs text-gray-300">Documents<br/>(PDF, DOC, TXT)</p>
                    </div>
                    <div className="bg-green-900/20 p-3 rounded-lg text-center">
                      <Mic className="w-6 h-6 mx-auto mb-1 text-green-600" />
                      <p className="text-xs text-gray-300">Audio<br/>(MP3, WAV, M4A)</p>
                    </div>
                    <div className="bg-purple-900/20 p-3 rounded-lg text-center">
                      <Paperclip className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                      <p className="text-xs text-gray-300">Others<br/>(ZIP, CSV, etc.)</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">How to Attach Files:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Click the 📎 paperclip icon in the message compose area</li>
                    <li className="pl-2">2. Select a file from your device</li>
                    <li className="pl-2">3. Preview your attachment before sending</li>
                    <li className="pl-2">4. Add a message (optional) and send!</li>
                  </ol>
                </div>
                <div className="bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
                  <p className="text-amber-200 font-medium mb-2">⚠️ File Size Limit:</p>
                  <p className="text-amber-300 text-sm">
                    Maximum file size is 50MB per attachment. For larger files, consider using a cloud storage service and sharing the link instead.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="voice" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Mic className="w-8 h-8 text-green-600" />
              Voice Messages
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Sometimes speaking is faster than typing! Record voice messages when you&apos;re driving, cooking, or just want to add a personal touch.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">Recording Voice Messages:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Click the 🎤 microphone icon next to the message box</li>
                    <li className="pl-2">2. Allow microphone access when prompted (first time only)</li>
                    <li className="pl-2">3. Speak your message - you&apos;ll see a timer and waveform animation</li>
                    <li className="pl-2">4. Click &quot;Send&quot; to share or &quot;Cancel&quot; to discard</li>
                  </ol>
                </div>
                <div className="bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <p className="text-green-200 font-medium mb-2">🎯 Use Cases:</p>
                  <ul className="text-green-300 text-sm space-y-1 ml-4">
                    <li>• Quick updates while multitasking</li>
                    <li>• Adding emotion or tone to important messages</li>
                    <li>• Sending bedtime messages to kids</li>
                    <li>• Explaining complex topics more easily than typing</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="threads" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Reply className="w-8 h-8 text-green-600" />
              Message Threads & Replies
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Keep conversations organized by replying to specific messages. Threads make it easy to follow multiple topics in one conversation without confusion.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">How to Reply to a Message:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Hover over the message you want to reply to</li>
                    <li className="pl-2">2. Click the &quot;Reply&quot; button that appears</li>
                    <li className="pl-2">3. Type your response in the thread view</li>
                    <li className="pl-2">4. Your reply is connected to the original message!</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">Viewing Thread Replies:</h4>
                  <p className="text-gray-300">
                    Messages with replies show a small &quot;X replies&quot; indicator. Click it to expand the thread and see all responses in context.
                  </p>
                </div>
                <div className="bg-indigo-900/20 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                  <p className="text-indigo-200 font-medium mb-2">💡 Best Practice:</p>
                  <p className="text-indigo-300 text-sm">
                    Use threads when responding to an older message in an active conversation. This keeps discussions clear and prevents confusion about what you&apos;re referencing!
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="pinned" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Pin className="w-8 h-8 text-green-600" />
              Pinned Messages
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Important information shouldn&apos;t get lost in the conversation! Pin messages to keep them at the top for easy reference.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">What to Pin:</h4>
                  <ul className="space-y-2 text-gray-300 ml-4">
                    <li>• Important dates and deadlines</li>
                    <li>• Addresses or directions</li>
                    <li>• Shopping lists or meal plans</li>
                    <li>• Frequently referenced information</li>
                    <li>• House rules or family agreements</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">How to Pin:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Find the message you want to pin</li>
                    <li className="pl-2">2. Click the &quot;...&quot; menu on the message</li>
                    <li className="pl-2">3. Select &quot;Pin Message&quot;</li>
                    <li className="pl-2">4. The message appears in the pinned section at the top!</li>
                  </ol>
                </div>
                <div className="bg-pink-900/20 border-l-4 border-pink-500 p-4 rounded-r-lg">
                  <p className="text-pink-200 font-medium mb-2">📌 Pro Tip:</p>
                  <p className="text-pink-300 text-sm">
                    You can pin multiple messages, but we recommend keeping it to 3-5 most important items so they stay easy to scan. Unpin messages when they&apos;re no longer relevant!
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="mentions" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <AtSign className="w-8 h-8 text-green-600" />
              Mentions & @Tagging
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Get someone&apos;s attention in a group conversation by mentioning them! Type @ followed by their name to tag them directly.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">How Mentions Work:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Type <code className="bg-gray-700 px-2 py-1 rounded">@</code> in your message</li>
                    <li className="pl-2">2. Start typing a name - you&apos;ll see autocomplete suggestions</li>
                    <li className="pl-2">3. Select the person you want to mention</li>
                    <li className="pl-2">4. They&apos;ll get a notification and their name is highlighted in the message!</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3">When to Use Mentions:</h4>
                  <ul className="space-y-2 text-gray-300 ml-4">
                    <li>• Asking a specific person a question in a group chat</li>
                    <li>• Assigning a task or responsibility</li>
                    <li>• Making sure someone sees an important update</li>
                    <li>• Responding to someone specific in a busy conversation</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="search" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Search className="w-8 h-8 text-green-600" />
              Message Search
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Find any message in seconds! Search through your entire conversation history to locate specific information, dates, or discussions.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">How to Search:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="pl-2">1. Click the 🔍 search icon at the top of the Messages page</li>
                    <li className="pl-2">2. Type your search term (names, keywords, dates)</li>
                    <li className="pl-2">3. Results appear instantly as you type</li>
                    <li className="pl-2">4. Click any result to jump to that message in the conversation</li>
                  </ol>
                </div>
                <div className="bg-teal-900/20 border-l-4 border-teal-500 p-4 rounded-r-lg">
                  <p className="text-teal-200 font-medium mb-2">🔍 Search Tips:</p>
                  <ul className="text-teal-300 text-sm space-y-1 ml-4">
                    <li>• Search works across ALL conversations</li>
                    <li>• Use quotes for exact phrases: &quot;dinner tonight&quot;</li>
                    <li>• Search by sender name to find messages from specific people</li>
                    <li>• Clear your search to return to normal view</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="realtime" className="scroll-mt-8 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-600" />
              Real-Time Sync
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Experience the magic of instant communication! Messages appear in real-time for all participants - no refresh button needed.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-3">What&apos;s Real-Time?</h4>
                  <ul className="space-y-2 text-gray-300 ml-4">
                    <li>• <strong>New messages</strong> appear instantly for everyone</li>
                    <li>• <strong>Typing indicators</strong> show when someone is composing</li>
                    <li>• <strong>Reactions</strong> and edits sync immediately</li>
                    <li>• <strong>Read receipts</strong> update in real-time</li>
                    <li>• <strong>Deletions</strong> are reflected across all devices</li>
                  </ul>
                </div>
                <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <p className="text-blue-200 font-medium mb-2">⚡ How It Works:</p>
                  <p className="text-blue-300 text-sm">
                    Rowan uses WebSocket technology to maintain a persistent connection between your device and the server. Changes are pushed instantly rather than polling for updates, making conversations feel natural and responsive!
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Quick Start Section */}
        <div className="mt-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Messaging?</h2>
          <p className="mb-6 text-green-100">
            Jump into Messages and start connecting with your family right away!
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/messages"
              className="px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors inline-flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Open Messages
            </Link>
            <Link
              href="/settings/documentation"
              className="px-6 py-3 bg-green-400 text-white rounded-lg font-semibold hover:bg-green-300 transition-colors inline-flex items-center gap-2"
            >
              Explore More Features
            </Link>
          </div>
        </div>

        {/* Feature Count Badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-full border border-gray-700">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="text-white font-semibold">
              20 Powerful Features
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">
              1,323 lines of code
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">
              Real-time sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
