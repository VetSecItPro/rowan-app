'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, FileText, Shield, Cookie } from 'lucide-react';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { CookieConsentBanner } from '@/components/cookies/CookieConsentBanner';

type TabId = 'terms' | 'privacy' | 'cookies';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'terms', label: 'Terms of Service', icon: <FileText className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy Policy', icon: <Shield className="w-4 h-4" /> },
  { id: 'cookies', label: 'Cookie Policy', icon: <Cookie className="w-4 h-4" /> },
];

export default function LegalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'terms' || tabParam === 'privacy' || tabParam === 'cookies'
      ? tabParam
      : 'terms';

  const handleTabChange = (tabId: TabId) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
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
            <div className="flex items-center gap-4">
              <HamburgerMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-black to-gray-800/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold text-white mb-6">Legal</h1>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="prose prose-invert max-w-none">
            {activeTab === 'terms' && <TermsContent />}
            {activeTab === 'privacy' && <PrivacyContent />}
            {activeTab === 'cookies' && <CookiesContent />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-gray-400 mb-8">Last updated: January 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Agreement to Terms</h2>
        <p className="text-gray-300 mb-4">
          By accessing or using Rowan, you agree to be bound by these Terms of Service and our Privacy Policy. If you don&apos;t agree to these terms, please don&apos;t use our service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Description of Service</h2>
        <p className="text-gray-300 mb-4">
          Rowan is a collaborative life management platform designed for couples and families. Our service includes:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Task and project management</li>
          <li>Shared calendar and scheduling</li>
          <li>Smart reminders and notifications</li>
          <li>Built-in messaging for your space</li>
          <li>Shopping lists and meal planning</li>
          <li>Household task management</li>
          <li>Goals and milestone tracking</li>
        </ul>
      </section>

      <section className="mb-8 p-6 bg-amber-900/20 rounded-lg border border-amber-800">
        <h2 className="text-2xl font-semibold text-white mb-4">Beta Program Terms</h2>
        <p className="text-gray-300 mb-4">
          <strong>Rowan is currently in beta.</strong> By participating in our beta program, you acknowledge and agree to the following:
        </p>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Beta Status Disclaimer</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>The service is provided in a pre-release state and may contain bugs, errors, or incomplete features</li>
          <li>Features may be added, modified, or removed without notice</li>
          <li>The service may experience unexpected downtime or performance issues</li>
          <li>Data formats or structures may change, potentially requiring migration</li>
          <li>We make no guarantees regarding uptime, data retention, or feature availability during beta</li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Feedback and Improvements</h3>
        <p className="text-gray-300 mb-4">
          As a beta user, you may provide feedback, suggestions, or bug reports. By doing so:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>You grant us a non-exclusive, perpetual, royalty-free license to use, modify, and incorporate your feedback into the service</li>
          <li>You will not be entitled to any compensation for feedback or suggestions</li>
          <li>We are not obligated to implement any feedback or suggestions</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Subscription and Payment</h2>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Free Trial</h3>
        <p className="text-gray-300 mb-4">
          We may offer a free trial period. You won&apos;t be charged until the trial ends unless you cancel before then.
        </p>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Billing</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Subscriptions are billed in advance on a recurring basis</li>
          <li>You authorize us to charge your payment method automatically</li>
          <li>Prices are subject to change with 30 days&apos; notice</li>
          <li>You&apos;re responsible for any taxes or fees</li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Cancellation Policy</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>You can cancel your subscription at any time</li>
          <li>Cancellation takes effect at the end of the current billing period</li>
          <li>All sales are final — no refunds will be issued</li>
          <li>Access continues until the end of your paid period</li>
          <li>A free trial is provided so you can evaluate the service before purchasing</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Disclaimers and Limitations</h2>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Service &quot;As Is&quot;</h3>
        <p className="text-gray-300 mb-4">
          Rowan is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We don&apos;t guarantee that the service will be uninterrupted, secure, or error-free.
        </p>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Limitation of Liability</h3>
        <p className="text-gray-300 mb-4">
          To the fullest extent permitted by law, Rowan and its team shall not be liable for:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Indirect, incidental, or consequential damages</li>
          <li>Loss of data, profits, or business opportunities</li>
          <li>Service interruptions or security breaches</li>
          <li>Actions of other users or third parties</li>
        </ul>
        <p className="text-gray-300 mb-4">
          Our total liability to you shall not exceed the amount you paid us in the past 12 months.
        </p>
      </section>

    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-gray-400 mb-8">Last updated: January 2026</p>

      <section className="mb-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Data Controller</h2>
        <p className="text-gray-300 mb-4">
          For the purposes of GDPR and other applicable data protection laws, the data controller is:
        </p>
        <div className="text-gray-300 space-y-1">
          <p><strong>Rowan App</strong></p>
          <p>Operated by VetSecItPro</p>
          <p>United States</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Our Commitment to Your Privacy</h2>
        <p className="text-gray-300 mb-4">
          At Rowan, we understand that your personal information and family data are deeply private. We&apos;re committed to protecting your privacy and being transparent about how we collect, use, and safeguard your information.
        </p>
        <p className="text-gray-300 mb-4">
          <strong>We follow a data minimization approach:</strong> We only collect data that is necessary to provide our service. We don&apos;t collect data for advertising, profiling, or sale to third parties.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Account Information</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Name and email address</li>
          <li>Profile picture (optional)</li>
          <li>Password (encrypted and never stored in plain text)</li>
          <li>Space/family name and member information</li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">Content You Create</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>Tasks, projects, and to-do items</li>
          <li>Calendar events and appointments</li>
          <li>Messages sent within your space</li>
          <li>Shopping lists and meal plans</li>
          <li>Household tasks and goals</li>
          <li>Notes and reminders</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Data Sharing</h2>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">We DO NOT Sell Your Data</h3>
        <p className="text-gray-300 mb-4">
          Your personal information and family data will never be sold to third parties. Period.
        </p>

        <h3 className="text-xl font-semibold text-white mb-3 mt-6">When We Share Information</h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li><strong>Within Your Space:</strong> Information you create is shared with other members of your family/couple space</li>
          <li><strong>Service Providers:</strong> Trusted partners who help deliver our service (Polar, Supabase, Vercel)</li>
          <li><strong>Legal Requirements:</strong> We may disclose information if required by law</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Your Privacy Rights</h2>
        <p className="text-gray-300 mb-4">
          Depending on your location, you have rights including:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li><strong>Right of Access:</strong> Request a copy of your data</li>
          <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
          <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
          <li><strong>Right to Object:</strong> Object to certain processing of your data</li>
        </ul>
        <p className="text-gray-300">
          To exercise your rights, visit Settings &gt; Privacy in the app.
        </p>
      </section>
    </>
  );
}

function CookiesContent() {
  return (
    <>
      <p className="text-gray-400 mb-8">
        Learn about how we use cookies to enhance your experience.
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">What are cookies?</h2>
        <p className="text-gray-300 mb-4">
          Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and improving our services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Types of cookies we use</h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-white mb-2">Essential Cookies</h3>
            <p className="text-gray-300 text-sm">
              Required for the website to function properly. These cannot be disabled. They include authentication session cookies and security tokens.
            </p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-white mb-2">Functional Cookies</h3>
            <p className="text-gray-300 text-sm">
              Remember your preferences and enhance your experience, such as theme preferences and language settings.
            </p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-white mb-2">Analytics Cookies</h3>
            <p className="text-gray-300 text-sm">
              Help us understand how you use our website to improve our services. These are optional and require your consent.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Manage your preferences</h2>
        <p className="text-gray-300 mb-4">
          You can control your cookie preferences at any time using the banner below, or through your browser settings.
        </p>
        <div className="mt-4">
          <CookieConsentBanner />
        </div>
      </section>

    </>
  );
}
