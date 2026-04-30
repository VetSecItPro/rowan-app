import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export const revalidate = 86400; // ISR: regenerate every 24 hours

export const metadata: Metadata = {
  title: 'Accessibility | Rowan',
  description:
    'Rowan is committed to digital accessibility. Read our accessibility statement, conformance target, known limitations, and how to report accessibility issues.',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-black">
      <PublicHeader />

      <div className="bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-white mb-4">Accessibility Statement</h1>
          <p className="text-gray-400 mb-8">Last updated: April 29, 2026</p>

          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <p className="text-gray-300 mb-4">
                Rowan is committed to digital accessibility for everyone. We believe family and household management
                tools should work for the widest range of users possible, including people with disabilities. We are
                continuously improving the user experience for all users and applying accessibility standards as we
                build.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Conformance Target</h2>
              <p className="text-gray-300 mb-4">
                We aim to conform to the{' '}
                <a
                  href="https://www.w3.org/TR/WCAG21/"
                  className="text-emerald-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
                </a>
                . These guidelines explain how to make web content more accessible to people with a wide range of
                disabilities, including limitations of vision, hearing, mobility, and cognitive ability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Known Limitations</h2>
              <p className="text-gray-300 mb-4">
                We are transparent about where we have not yet fully met our target. Current known limitations include:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>
                  <strong>Color contrast:</strong> not yet runtime-audited across every page; we periodically scan
                  during design reviews but do not have continuous automated coverage.
                </li>
                <li>
                  <strong>Reduced motion:</strong> some animations and transitions do not yet honor the{' '}
                  <code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-sm">prefers-reduced-motion</code>{' '}
                  user preference. We are migrating animations to respect this setting.
                </li>
                <li>
                  <strong>Mobile app accessibility:</strong> our native iOS and Android builds (via Capacitor) have not
                  yet been independently certified for accessibility conformance.
                </li>
                <li>
                  <strong>Screen reader coverage:</strong> primary flows are usable with VoiceOver and TalkBack, but
                  some custom interactive components (drag-and-drop reordering, color pickers) may have gaps.
                </li>
              </ul>
              <p className="text-gray-300">
                Closing these gaps is on our active roadmap. We track accessibility issues alongside other quality work
                and do not consider them lower priority.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Assistive Technology Compatibility</h2>
              <p className="text-gray-300 mb-4">
                Rowan is designed to work with the following assistive technologies in modern browsers (latest versions
                of Chrome, Safari, Firefox, and Edge):
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>VoiceOver (macOS and iOS)</li>
                <li>TalkBack (Android)</li>
                <li>NVDA and JAWS (Windows)</li>
                <li>Browser zoom up to 200%</li>
                <li>Keyboard-only navigation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Feedback and Contact</h2>
              <p className="text-gray-300 mb-4">
                We welcome your feedback on the accessibility of Rowan. If you encounter an accessibility barrier, or
                have suggestions for improvement, please contact us:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>
                  Email:{' '}
                  <a href="mailto:accessibility@rowan.app" className="text-emerald-400 hover:underline">
                    accessibility@rowan.app
                  </a>
                </li>
              </ul>
              <p className="text-gray-300">
                We aim to respond to accessibility feedback within 5 business days. When reporting an issue, please
                include the page URL, the assistive technology and browser you are using, and a description of the
                problem so we can reproduce and fix it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Ongoing Effort</h2>
              <p className="text-gray-300 mb-4">
                Accessibility is treated as an ongoing process, not a one-time audit. We review this statement at least
                annually and update it whenever we ship significant accessibility improvements or identify new gaps.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
