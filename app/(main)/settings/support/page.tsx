import { ArrowLeft, MessageSquare, BookOpen, Github, HelpCircle, Bug, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="min-h-screen">
        <div className="max-w-5xl mx-auto p-4 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Support & Help</h1>
                <p className="text-gray-400 mt-1">Get help and connect with us</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link
              href="/settings/documentation"
              className="group p-6 bg-gray-800/80 border-2 border-gray-700/50 hover:border-purple-500 hover:shadow-purple-500/50 rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                Documentation
              </h3>
              <p className="text-sm text-gray-400">
                Browse comprehensive guides and tutorials for all Rowan features
              </p>
            </Link>

            <a
              href="https://github.com/VetSecItPro/rowan-app"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-gray-800/80 border-2 border-gray-700/50 hover:border-purple-500 hover:shadow-purple-500/50 rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 flex items-center justify-center mb-4">
                <Github className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                GitHub Repository
              </h3>
              <p className="text-sm text-gray-400">
                View source code, report issues, and contribute to the project
              </p>
            </a>
          </div>

          {/* Contact Options */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Get in Touch</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a
                href="https://github.com/VetSecItPro/rowan-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 bg-gray-800/80 border border-gray-700/50 rounded-xl hover:shadow-lg transition-shadow"
              >
                <Bug className="w-8 h-8 text-red-500 mb-3" />
                <h3 className="font-semibold text-white mb-2">Report a Bug</h3>
                <p className="text-sm text-gray-400">
                  Found an issue? Let us know on GitHub
                </p>
              </a>

              <a
                href="https://github.com/VetSecItPro/rowan-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 bg-gray-800/80 border border-gray-700/50 rounded-xl hover:shadow-lg transition-shadow"
              >
                <Lightbulb className="w-8 h-8 text-yellow-500 mb-3" />
                <h3 className="font-semibold text-white mb-2">Feature Request</h3>
                <p className="text-sm text-gray-400">
                  Have an idea? Share your suggestions
                </p>
              </a>

              <a
                href="https://github.com/VetSecItPro/rowan-app/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 bg-gray-800/80 border border-gray-700/50 rounded-xl hover:shadow-lg transition-shadow"
              >
                <MessageSquare className="w-8 h-8 text-blue-500 mb-3" />
                <h3 className="font-semibold text-white mb-2">Community</h3>
                <p className="text-sm text-gray-400">
                  Join discussions and get help from the community
                </p>
              </a>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="p-6 bg-purple-900/50 border border-purple-800/50 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-1">How do I invite my partner?</h4>
                <p className="text-sm text-gray-400">
                  Go to Settings → Space Settings and use the invite feature to send an invitation email.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">Can I use Rowan offline?</h4>
                <p className="text-sm text-gray-400">
                  Yes! Rowan is a Progressive Web App (PWA) and supports offline functionality. Install it on your device for the best experience.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">Is my data secure?</h4>
                <p className="text-sm text-gray-400">
                  Absolutely. Rowan uses industry-standard encryption and security practices. Your data is protected with Row Level Security and never shared.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">Need more help?</h4>
                <p className="text-sm text-gray-400">
                  Check out our <Link href="/settings/documentation" className="text-purple-400 hover:underline">comprehensive documentation</Link> or reach out on <a href="https://github.com/VetSecItPro/rowan-app" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">GitHub</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
