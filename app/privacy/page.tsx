'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
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

            {/* Menu */}
            <div className="flex items-center gap-4">
              <HamburgerMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-b from-black via-purple-900/30 to-purple-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: January 2026</p>

          <div className="prose prose-invert max-w-none">
            {/* Data Controller Section - GDPR Required */}
            <section className="mb-8 p-6 bg-purple-900/20 rounded-lg border border-purple-800">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Controller</h2>
              <p className="text-gray-300 mb-4">
                For the purposes of GDPR and other applicable data protection laws, the data controller is:
              </p>
              <div className="text-gray-300 space-y-1">
                <p><strong>Rowan App</strong></p>
                <p>Operated by VetSecItPro</p>
                <p>United States</p>
                <p>Email: <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a></p>
              </div>
              <p className="text-gray-300 mt-4">
                <strong>Data Protection Contact:</strong> For any privacy-related inquiries or to exercise your data protection rights,
                please contact us at <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a>.
                We aim to respond to all requests within 30 days.
              </p>
              <p className="text-gray-400 mt-4 text-sm">
                Note: As a small-scale data processor that does not engage in large-scale systematic monitoring or process
                special category data at scale, we are not required to appoint a formal Data Protection Officer (DPO) under
                GDPR Article 37. However, our privacy contact handles all data protection matters with the same diligence.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Our Commitment to Your Privacy</h2>
              <p className="text-gray-300 mb-4">
                At Rowan, we understand that your personal information and family data are deeply private. We're committed to protecting your privacy and being transparent about how we collect, use, and safeguard your information.
              </p>
              <p className="text-gray-300 mb-4">
                <strong>We follow a data minimization approach:</strong> We only collect data that is necessary to provide our service.
                We don't collect data for advertising, profiling, or sale to third parties.
              </p>
            </section>

            {/* Legal Basis Section - GDPR Required */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Legal Basis for Processing (GDPR)</h2>
              <p className="text-gray-300 mb-4">
                Under GDPR and similar data protection laws, we must have a valid legal basis to process your personal data.
                We rely on the following legal bases:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Contract Performance (Article 6(1)(b) GDPR)</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Processing necessary to provide you with our service:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                    <li>Account creation and authentication (email, password)</li>
                    <li>Storing your tasks, calendar events, reminders, and other content</li>
                    <li>Enabling collaboration within your family/couple space</li>
                    <li>Processing subscription payments</li>
                    <li>Providing customer support</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Legitimate Interests (Article 6(1)(f) GDPR)</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Processing necessary for our legitimate business interests, balanced against your rights:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                    <li>Analytics to improve service quality and user experience</li>
                    <li>Security monitoring and fraud prevention</li>
                    <li>Debugging and error tracking</li>
                    <li>Service performance optimization</li>
                  </ul>
                  <p className="text-gray-400 text-xs mt-2">
                    You have the right to object to processing based on legitimate interests. Contact us at privacy@rowan.app.
                  </p>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Consent (Article 6(1)(a) GDPR)</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Processing based on your explicit consent:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                    <li>Marketing emails and promotional communications (opt-in only)</li>
                    <li>Non-essential cookies and analytics (via cookie consent)</li>
                    <li>Optional AI-powered features that process your content</li>
                  </ul>
                  <p className="text-gray-400 text-xs mt-2">
                    <strong>You can withdraw consent at any time</strong> through your account settings or by contacting us.
                    Withdrawal does not affect the lawfulness of processing before withdrawal.
                  </p>
                </div>

                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Legal Obligation (Article 6(1)(c) GDPR)</h4>
                  <p className="text-gray-300 text-sm">
                    Processing required to comply with legal obligations, such as tax records for paid subscriptions,
                    responding to valid legal requests, and maintaining security logs as required by law.
                  </p>
                </div>
              </div>
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

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Usage Data</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Device type and operating system</li>
                <li>Browser type and version</li>
                <li>IP address and general location (city/country level only)</li>
                <li>Pages visited and features used</li>
                <li>Time and date of access</li>
              </ul>
            </section>

            {/* AI Processing Disclosure - NEW */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">AI and Automated Processing</h2>
              <p className="text-gray-300 mb-4">
                Rowan uses artificial intelligence to enhance certain features. We believe in transparency about how AI processes your data:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">Recipe Import (Google Gemini AI)</h4>
                  <p className="text-gray-300 text-sm">
                    When you import a recipe from a URL, the webpage content is sent to Google's Gemini AI service to extract
                    recipe information (ingredients, instructions, cooking times). This processing is:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1">
                    <li>Only triggered when you explicitly request a recipe import</li>
                    <li>Limited to the specific URL content you provide</li>
                    <li>Not stored by Google for training purposes (per our API agreement)</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-white mb-2">Receipt Scanning (Google Gemini AI)</h4>
                  <p className="text-gray-300 text-sm">
                    When you scan a receipt, the image is sent to Google's Gemini AI service to extract expense information
                    (merchant, amount, date, items). This processing is:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1">
                    <li>Only triggered when you explicitly upload a receipt</li>
                    <li>Limited to the specific image you provide</li>
                    <li>Processed in real-time and not retained by Google</li>
                  </ul>
                </div>
              </div>

              <p className="text-gray-300 mt-4">
                <strong>Your Choice:</strong> AI features are optional. You can always manually enter recipes and expenses
                without using AI processing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Provide the Service:</strong> To deliver Rowan's features and functionality to you and your family</li>
                <li><strong>Improve Experience:</strong> To understand how you use Rowan and make improvements</li>
                <li><strong>Communication:</strong> To send important updates, security alerts, and feature announcements</li>
                <li><strong>Support:</strong> To respond to your questions and provide customer support</li>
                <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security incidents</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
              </ul>
            </section>

            {/* Third-Party Processors - GDPR Required */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Third-Party Service Providers (Data Processors)</h2>
              <p className="text-gray-300 mb-4">
                We use trusted third-party service providers to help deliver our service. These providers process data on our
                behalf under strict contractual obligations (Data Processing Agreements) that require them to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>Only process data according to our instructions</li>
                <li>Implement appropriate security measures</li>
                <li>Not use data for their own purposes</li>
                <li>Delete data when the relationship ends</li>
              </ul>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-white">Provider</th>
                      <th className="px-4 py-2 text-left text-white">Purpose</th>
                      <th className="px-4 py-2 text-left text-white">Location</th>
                      <th className="px-4 py-2 text-left text-white">Data Processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Supabase</td>
                      <td className="px-4 py-2 text-gray-300">Database & Authentication</td>
                      <td className="px-4 py-2 text-gray-300">United States</td>
                      <td className="px-4 py-2 text-gray-300">All user data, content, auth tokens</td>
                    </tr>
                    <tr className="bg-gray-800">
                      <td className="px-4 py-2 text-gray-300">Vercel</td>
                      <td className="px-4 py-2 text-gray-300">Web Hosting & CDN</td>
                      <td className="px-4 py-2 text-gray-300">Global (US primary)</td>
                      <td className="px-4 py-2 text-gray-300">Request logs, IP addresses</td>
                    </tr>
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Stripe</td>
                      <td className="px-4 py-2 text-gray-300">Payment Processing</td>
                      <td className="px-4 py-2 text-gray-300">United States</td>
                      <td className="px-4 py-2 text-gray-300">Payment info, billing address</td>
                    </tr>
                    <tr className="bg-gray-800">
                      <td className="px-4 py-2 text-gray-300">Resend</td>
                      <td className="px-4 py-2 text-gray-300">Transactional Emails</td>
                      <td className="px-4 py-2 text-gray-300">United States</td>
                      <td className="px-4 py-2 text-gray-300">Email address, name</td>
                    </tr>
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Google (Gemini AI)</td>
                      <td className="px-4 py-2 text-gray-300">AI Features (Recipe/Receipt)</td>
                      <td className="px-4 py-2 text-gray-300">United States</td>
                      <td className="px-4 py-2 text-gray-300">Content sent for AI processing only</td>
                    </tr>
                    <tr className="bg-gray-800">
                      <td className="px-4 py-2 text-gray-300">Upstash</td>
                      <td className="px-4 py-2 text-gray-300">Rate Limiting & Caching</td>
                      <td className="px-4 py-2 text-gray-300">United States</td>
                      <td className="px-4 py-2 text-gray-300">IP addresses, request counts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* International Transfers - GDPR Required */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">International Data Transfers</h2>
              <p className="text-gray-300 mb-4">
                Rowan is operated from the United States. If you are accessing our service from the European Economic Area (EEA),
                United Kingdom, or other regions with data protection laws, please note that your data will be transferred to
                and processed in the United States.
              </p>
              <p className="text-gray-300 mb-4">
                For transfers of personal data from the EEA/UK to the US, we rely on:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>EU-US Data Privacy Framework:</strong> Our key service providers (Stripe, Google, Vercel) are certified under the EU-US Data Privacy Framework</li>
                <li><strong>Standard Contractual Clauses (SCCs):</strong> Where the Data Privacy Framework doesn't apply, we ensure our processors have SCCs in place</li>
                <li><strong>Supplementary Measures:</strong> We implement additional technical and organizational measures including encryption in transit and at rest</li>
              </ul>
              <p className="text-gray-300">
                You can request a copy of the relevant transfer mechanisms by contacting us at{' '}
                <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a>.
              </p>
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
                <li><strong>Service Providers:</strong> As described in the Third-Party Service Providers section above</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government request</li>
                <li><strong>Safety:</strong> To protect the rights, property, or safety of Rowan, our users, or others</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data would be transferred under the same privacy commitments</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
              <p className="text-gray-300 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Encryption in transit (TLS/HTTPS) for all data transmission</li>
                <li>Encryption at rest for database storage</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Row-level security (RLS) policies for data isolation</li>
                <li>Regular automated backups with encryption</li>
                <li>Rate limiting to prevent abuse</li>
              </ul>
              <p className="text-gray-300">
                For more details about our security practices, visit our{' '}
                <Link href="/security" className="text-purple-400 hover:underline">Security page</Link>.
              </p>
            </section>

            {/* Data Retention - Specific Periods */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
              <p className="text-gray-300 mb-4">
                We retain your data only as long as necessary for the purposes described in this policy:
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-white">Data Type</th>
                      <th className="px-4 py-2 text-left text-white">Retention Period</th>
                      <th className="px-4 py-2 text-left text-white">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Account & Profile Data</td>
                      <td className="px-4 py-2 text-gray-300">Until account deletion + 30 days</td>
                      <td className="px-4 py-2 text-gray-300">Service provision, recovery period</td>
                    </tr>
                    <tr className="bg-gray-800">
                      <td className="px-4 py-2 text-gray-300">User Content (tasks, events, etc.)</td>
                      <td className="px-4 py-2 text-gray-300">Until account deletion + 30 days</td>
                      <td className="px-4 py-2 text-gray-300">Service provision, recovery period</td>
                    </tr>
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Payment Records</td>
                      <td className="px-4 py-2 text-gray-300">7 years after transaction</td>
                      <td className="px-4 py-2 text-gray-300">Tax and legal compliance</td>
                    </tr>
                    <tr className="bg-gray-800">
                      <td className="px-4 py-2 text-gray-300">Security/Audit Logs</td>
                      <td className="px-4 py-2 text-gray-300">90 days</td>
                      <td className="px-4 py-2 text-gray-300">Security monitoring, incident response</td>
                    </tr>
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Analytics Data</td>
                      <td className="px-4 py-2 text-gray-300">30 days (aggregated indefinitely)</td>
                      <td className="px-4 py-2 text-gray-300">Service improvement</td>
                    </tr>
                    <tr className="bg-gray-800">
                      <td className="px-4 py-2 text-gray-300">Support Communications</td>
                      <td className="px-4 py-2 text-gray-300">2 years after resolution</td>
                      <td className="px-4 py-2 text-gray-300">Quality assurance, dispute resolution</td>
                    </tr>
                    <tr className="bg-gray-900">
                      <td className="px-4 py-2 text-gray-300">Marketing Consent Records</td>
                      <td className="px-4 py-2 text-gray-300">Until withdrawal + 3 years</td>
                      <td className="px-4 py-2 text-gray-300">Compliance proof</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-gray-300 mt-4">
                When you delete your account:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Immediate: Access to your data is removed</li>
                <li>Within 30 days: Personal data is permanently deleted from active systems</li>
                <li>Within 90 days: Data is removed from backups</li>
                <li>Exception: Data required for legal compliance is retained as specified above</li>
              </ul>
            </section>

            {/* Your Rights Section - Enhanced */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Your Privacy Rights</h2>
              <p className="text-gray-300 mb-4">
                Depending on your location, you may have the following rights regarding your personal data:
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right of Access</h4>
                  <p className="text-gray-300 text-sm">Request a copy of the personal data we hold about you</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Rectification</h4>
                  <p className="text-gray-300 text-sm">Request correction of inaccurate or incomplete data</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Erasure ("Right to be Forgotten")</h4>
                  <p className="text-gray-300 text-sm">Request deletion of your personal data</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Data Portability</h4>
                  <p className="text-gray-300 text-sm">Receive your data in a structured, machine-readable format (JSON, CSV)</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Object</h4>
                  <p className="text-gray-300 text-sm">Object to processing based on legitimate interests or for direct marketing</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Restrict Processing</h4>
                  <p className="text-gray-300 text-sm">Request that we limit how we use your data</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Withdraw Consent</h4>
                  <p className="text-gray-300 text-sm">
                    Where processing is based on consent, you can withdraw it at any time through your account settings
                    or by contacting us. This does not affect the lawfulness of processing before withdrawal.
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-white">Right to Lodge a Complaint</h4>
                  <p className="text-gray-300 text-sm">
                    You have the right to lodge a complaint with a supervisory authority. For EU residents, you can find
                    your local authority at{' '}
                    <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      edpb.europa.eu
                    </a>.
                  </p>
                </div>
              </div>

              <p className="text-gray-300 mt-4">
                <strong>How to Exercise Your Rights:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Email us at <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a></li>
                <li>Use the data export feature in Settings {'>'} Privacy</li>
                <li>Use the account deletion feature in Settings {'>'} Privacy</li>
              </ul>
              <p className="text-gray-300 mt-2">
                We will respond to your request within 30 days. We may ask for verification of your identity before processing requests.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Cookies and Tracking</h2>
              <p className="text-gray-300 mb-4">
                We use cookies and similar technologies. You can manage your preferences through our cookie consent banner.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Essential Cookies (Required)</h3>
              <p className="text-gray-300 mb-4">
                These cookies are necessary for the website to function and cannot be disabled:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>Authentication session cookies</li>
                <li>Security tokens (CSRF protection)</li>
                <li>Cookie consent preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Analytics Cookies (Optional)</h3>
              <p className="text-gray-300 mb-4">
                With your consent, we use analytics to understand how you use Rowan:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>Page views and feature usage</li>
                <li>Performance monitoring</li>
                <li>Error tracking</li>
              </ul>
              <p className="text-gray-300">
                You can control cookies through our consent banner or your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Children's Privacy</h2>
              <p className="text-gray-300 mb-4">
                Rowan is designed for adults (18+) managing household and family activities. We do not knowingly collect
                information from children under 13 (or 16 in the EEA). If you are a parent and believe your child has
                provided us with information, please contact us immediately at{' '}
                <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">California Privacy Rights (CCPA)</h2>
              <p className="text-gray-300 mb-4">
                If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Right to Know:</strong> What personal information we collect and how we use it</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                <li><strong>Right to Opt-Out:</strong> We do not sell personal information, so this right does not apply</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
              </ul>
              <p className="text-gray-300">
                To exercise your CCPA rights, contact us at{' '}
                <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="text-gray-300 mb-4">
                We may update this Privacy Policy from time to time. We'll notify you of significant changes via:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 mb-4">
                <li>Email notification to your registered address</li>
                <li>Prominent notice within the application</li>
                <li>Updated "Last modified" date at the top of this page</li>
              </ul>
              <p className="text-gray-300">
                Your continued use of Rowan after changes constitutes acceptance of the updated policy.
                We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="text-gray-300 mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices:
              </p>
              <ul className="list-none text-gray-300 space-y-2">
                <li><strong>Privacy Inquiries:</strong> <a href="mailto:privacy@rowan.app" className="text-purple-400 hover:underline">privacy@rowan.app</a></li>
                <li><strong>General Support:</strong> <a href="mailto:support@rowan.app" className="text-purple-400 hover:underline">support@rowan.app</a></li>
                <li><strong>Security Issues:</strong> <a href="mailto:security@rowan.app" className="text-purple-400 hover:underline">security@rowan.app</a></li>
              </ul>
              <p className="text-gray-300 mt-4">
                We aim to respond to all privacy-related inquiries within 30 days.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
