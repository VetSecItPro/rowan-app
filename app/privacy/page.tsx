'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo and Brand - Clickable */}
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/rowan-logo.png"
                alt="Rowan Logo"
                width={32}
                height={32}
                className="w-8 h-8 transition-transform group-hover:scale-110"
              />
              <span className="text-2xl font-semibold gradient-text">Rowan</span>
            </Link>

            {/* Menu, Theme Toggle & Auth Buttons */}
            <div className="flex items-center gap-4">
              <HamburgerMenu />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-white via-purple-50/30 to-purple-100/50 dark:from-black dark:via-purple-950/20 dark:to-purple-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Last updated: January 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Our Commitment to Your Privacy</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              At Rowan, we understand that your personal information and family data are deeply private. We're committed to protecting your privacy and being transparent about how we collect, use, and safeguard your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Account Information</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Name and email address</li>
              <li>Profile picture (optional)</li>
              <li>Password (encrypted and never stored in plain text)</li>
              <li>Space/family name and member information</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Content You Create</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Tasks, projects, and to-do items</li>
              <li>Calendar events and appointments</li>
              <li>Messages sent within your space</li>
              <li>Shopping lists and meal plans</li>
              <li>Household tasks and goals</li>
              <li>Notes and reminders</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Usage Data</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Device type and operating system</li>
              <li>Browser type and version</li>
              <li>IP address and general location (city/country level)</li>
              <li>Pages visited and features used</li>
              <li>Time and date of access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li><strong>Provide the Service:</strong> To deliver Rowan's features and functionality to you and your family</li>
              <li><strong>Improve Experience:</strong> To understand how you use Rowan and make improvements</li>
              <li><strong>Communication:</strong> To send important updates, security alerts, and feature announcements</li>
              <li><strong>Support:</strong> To respond to your questions and provide customer support</li>
              <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Sharing and Third Parties</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">We DO NOT Sell Your Data</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Your personal information and family data will never be sold to third parties. Period.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">When We Share Information</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li><strong>Within Your Space:</strong> Information you create is shared with other members of your family/couple space</li>
              <li><strong>Service Providers:</strong> We use trusted third-party services for hosting, analytics, and infrastructure (all under strict data protection agreements)</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, your data would be transferred under the same privacy commitments</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Security</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>End-to-end encryption for sensitive data</li>
              <li>Secure HTTPS connections for all data transmission</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Encrypted database storage</li>
              <li>Regular automated backups</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Your Privacy Rights</h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Objection:</strong> Object to certain data processing activities</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              To exercise these rights, contact us at <a href="mailto:privacy@rowan.app" className="text-purple-600 dark:text-purple-400 hover:underline">privacy@rowan.app</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Retention</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Immediately remove access to your data</li>
              <li>Permanently delete your data within 30 days</li>
              <li>Retain certain information only as required by law or for legitimate business purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Cookies and Tracking</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Understand how you use Rowan</li>
              <li>Improve performance and user experience</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You can control cookies through your browser settings, though some features may not work properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Children's Privacy</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rowan is designed for adults managing household and family activities. We do not knowingly collect information from children under 13. If you're a parent and believe your child has provided us with information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">International Users</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rowan is hosted in the United States. If you're accessing from outside the US, your information may be transferred to and processed in the US. We comply with applicable data protection laws, including GDPR for EU users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Changes to This Policy</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We'll notify you of significant changes via email or through the app. Your continued use of Rowan after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact Us</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices:
            </p>
            <ul className="list-none text-gray-700 dark:text-gray-300 space-y-2">
              <li>Email: <a href="mailto:privacy@rowan.app" className="text-purple-600 dark:text-purple-400 hover:underline">privacy@rowan.app</a></li>
              <li>Support: <a href="mailto:support@rowan.app" className="text-purple-600 dark:text-purple-400 hover:underline">support@rowan.app</a></li>
            </ul>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
