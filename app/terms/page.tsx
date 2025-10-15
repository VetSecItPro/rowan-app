'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-800">
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

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms of Service</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Last updated: January 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Agreement to Terms</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              By accessing or using Rowan, you agree to be bound by these Terms of Service and our Privacy Policy. If you don't agree to these terms, please don't use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Description of Service</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rowan is a collaborative life management platform designed for couples and families. Our service includes:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Task and project management</li>
              <li>Shared calendar and scheduling</li>
              <li>Smart reminders and notifications</li>
              <li>Built-in messaging for your space</li>
              <li>Shopping lists and meal planning</li>
              <li>Household task management</li>
              <li>Goals and milestone tracking</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Account Registration</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Eligibility</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You must be at least 18 years old to create an account. By registering, you represent that you meet this requirement.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Account Security</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Maintaining the confidentiality of your password</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring your account information is accurate and current</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">One Account Per Person</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Each person may only create one account. You may not create accounts on behalf of others without permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Acceptable Use</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">You May</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Use Rowan for personal, family, and household management</li>
              <li>Invite family members or partners to your space</li>
              <li>Create, share, and organize content within your space</li>
              <li>Export your data at any time</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">You May Not</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Use Rowan for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload viruses, malware, or malicious code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Scrape, crawl, or harvest data from Rowan</li>
              <li>Use Rowan to harass, abuse, or harm others</li>
              <li>Impersonate others or provide false information</li>
              <li>Interfere with the proper functioning of the service</li>
              <li>Resell or redistribute Rowan without permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Spaces and Shared Content</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              When you create or join a space:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Content you create is shared with all space members</li>
              <li>Space owners can manage members and permissions</li>
              <li>You're responsible for content you share within your space</li>
              <li>Leaving a space doesn't delete content you created (it remains for other members)</li>
              <li>Space owners can delete the space and all associated content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Subscription and Payment</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Free Trial</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may offer a free trial period. You won't be charged until the trial ends unless you cancel before then.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Billing</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Subscriptions are billed in advance on a recurring basis</li>
              <li>You authorize us to charge your payment method automatically</li>
              <li>Prices are subject to change with 30 days' notice</li>
              <li>You're responsible for any taxes or fees</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Cancellation and Refunds</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>You can cancel your subscription at any time</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds for partial months or unused portions</li>
              <li>Access continues until the end of your paid period</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Content Ownership and Rights</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Your Content</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You retain all rights to content you create in Rowan. By using our service, you grant us a limited license to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Store and display your content within the service</li>
              <li>Make backups and copies necessary to provide the service</li>
              <li>Share your content with space members as you direct</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Rowan's Property</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rowan, including all software, designs, text, graphics, and other materials, is our property and protected by copyright, trademark, and other laws. You may not copy, modify, or redistribute our intellectual property.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Service Availability</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We strive to provide reliable service, but:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>We don't guarantee uninterrupted or error-free access</li>
              <li>We may modify, suspend, or discontinue features at any time</li>
              <li>Scheduled maintenance will be announced when possible</li>
              <li>We're not liable for any downtime or service interruptions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data and Privacy</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Your privacy is important to us. Please review our <Link href="/privacy" className="inline-block py-1 px-2 text-purple-600 dark:text-purple-400 hover:underline">Privacy Policy</Link> to understand how we collect, use, and protect your data.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Key points:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>We never sell your data</li>
              <li>You can export your data at any time</li>
              <li>You can request account deletion</li>
              <li>Data is encrypted and securely stored</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Termination</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">By You</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You may close your account at any time from your account settings or by contacting support.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">By Us</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Violate these Terms of Service</li>
              <li>Use the service in a harmful or abusive manner</li>
              <li>Fail to pay for subscription services</li>
              <li>Engage in fraudulent or illegal activity</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We'll provide notice when possible, but reserve the right to terminate immediately for serious violations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Disclaimers and Limitations</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Service "As Is"</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rowan is provided "as is" and "as available" without warranties of any kind, either express or implied. We don't guarantee that the service will be uninterrupted, secure, or error-free.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Limitation of Liability</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              To the fullest extent permitted by law, Rowan and its team shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Indirect, incidental, or consequential damages</li>
              <li>Loss of data, profits, or business opportunities</li>
              <li>Service interruptions or security breaches</li>
              <li>Actions of other users or third parties</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our total liability to you shall not exceed the amount you paid us in the past 12 months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Indemnification</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You agree to indemnify and hold harmless Rowan from any claims, damages, or expenses arising from:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>Your use of the service</li>
              <li>Your violation of these terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Content you create or share</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Dispute Resolution</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Informal Resolution</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you have a dispute, please contact us at <a href="mailto:support@rowan.app" className="text-purple-600 dark:text-purple-400 hover:underline">support@rowan.app</a> to try to resolve it informally first.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Arbitration</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Any disputes that can't be resolved informally will be settled through binding arbitration, except where prohibited by law. You waive the right to participate in class-action lawsuits.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Governing Law</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              These terms are governed by the laws of the United States and the state where Rowan is headquartered, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Changes to Terms</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may update these Terms of Service from time to time. We'll notify you of material changes via email or through the service. Your continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">General Provisions</h2>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Entire Agreement</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              These Terms, along with our Privacy Policy, constitute the entire agreement between you and Rowan.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Severability</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If any provision of these terms is found invalid, the remaining provisions will continue in full effect.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">No Waiver</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Our failure to enforce any provision doesn't constitute a waiver of that provision.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Assignment</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You may not assign these terms without our consent. We may assign our rights and obligations to any party.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact Us</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Questions about these Terms of Service? Contact us:
            </p>
            <ul className="list-none text-gray-700 dark:text-gray-300 space-y-2">
              <li>Email: <a href="mailto:legal@rowan.app" className="text-purple-600 dark:text-purple-400 hover:underline">legal@rowan.app</a></li>
              <li>Support: <a href="mailto:support@rowan.app" className="text-purple-600 dark:text-purple-400 hover:underline">support@rowan.app</a></li>
            </ul>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
