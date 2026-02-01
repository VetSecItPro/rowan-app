import type { Metadata } from 'next';

export const revalidate = 86400; // ISR: regenerate every 24 hours

export const metadata: Metadata = {
  title: 'Cookie Policy | Rowan',
  description: 'Rowan Cookie Policy. Learn about the cookies we use and how to manage your preferences.',
};

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CookieConsentBanner } from '@/components/cookies/CookieConsentBanner';

export default function CookiesPage() {
  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Cookies' }
      ]}
    >
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              Cookie Policy
            </h1>
            <p className="text-lg text-gray-400">
              Learn about how we use cookies to enhance your experience.
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                What are cookies?
              </h2>
              <p className="text-gray-400">
                Cookies are small text files that are stored on your device when you visit our website.
                They help us provide you with a better experience by remembering your preferences and
                improving our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Types of cookies we use
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-white">Essential Cookies</h3>
                  <p className="text-gray-400 text-sm">
                    Required for the website to function properly. These cannot be disabled.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-white">Functional Cookies</h3>
                  <p className="text-gray-400 text-sm">
                    Remember your preferences and enhance your experience.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-white">Analytics Cookies</h3>
                  <p className="text-gray-400 text-sm">
                    Help us understand how you use our website to improve our services.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Manage your preferences
              </h2>
              <p className="text-gray-400 mb-4">
                You can control your cookie preferences at any time using the banner below.
              </p>
              <CookieConsentBanner />
            </section>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}