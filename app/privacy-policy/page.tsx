'use client';

import { Shield, Eye, Download, Trash2, MapPin, Users, Lock } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-400">
            Effective Date: {new Date().toLocaleDateString()}
          </p>
          <p className="text-lg text-gray-500 mt-2">
            Compliant with GDPR, CCPA, and other privacy regulations
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="p-8 space-y-12">

            {/* Overview */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
              <p className="text-gray-300 mb-4">
                Rowan ("we," "our," or "us") is committed to protecting your privacy and ensuring transparency
                about how we collect, use, and share your personal information. This Privacy Policy explains
                our practices and your rights under various privacy laws, including the General Data Protection
                Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
              </p>
              <p className="text-gray-300">
                This policy applies to all users of our life organization platform and services.
              </p>
            </section>

            {/* CCPA Rights for California Residents */}
            <section className="border-l-4 border-blue-500 pl-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-white">California Consumer Privacy Act (CCPA) Rights</h2>
              </div>

              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-100 mb-3">
                  California Residents Have Special Rights
                </h3>
                <p className="text-blue-200">
                  If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA).
                  These rights are in addition to any other privacy rights you may have.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Right to Know</h4>
                      <p className="text-sm text-gray-400">
                        Request information about the personal information we collect, use, disclose, and sell about you.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Download className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Right to Data Portability</h4>
                      <p className="text-sm text-gray-400">
                        Request a copy of your personal information in a portable format.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Right to Delete</h4>
                      <p className="text-sm text-gray-600 dark-gray-400">
                        Request deletion of your personal information, subject to certain exceptions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Right to Opt-Out of Sale</h4>
                      <p className="text-sm text-gray-400">
                        Opt-out of the sale of your personal information to third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <h4 className="font-semibold text-yellow-100 mb-2">Do Not Sell My Personal Information</h4>
                <p className="text-sm text-yellow-200 mb-3">
                  You have the right to opt-out of the sale of your personal information. We provide an easy way to exercise this right.
                </p>
                <a href="/settings/privacy" className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors">
                  <Shield className="w-4 h-4" />
                  Manage CCPA Settings
                </a>
              </div>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Information We Collect</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Personal Information Categories (CCPA)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-700 rounded-lg overflow-hidden">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white">Category</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white">Examples</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white">Collected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        <tr>
                          <td className="px-4 py-3 text-sm text-white font-medium">Identifiers</td>
                          <td className="px-4 py-3 text-sm text-gray-400">Name, email, user ID</td>
                          <td className="px-4 py-3 text-sm text-green-400">Yes</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm text-white font-medium">Commercial Information</td>
                          <td className="px-4 py-3 text-sm text-gray-400">Purchase history, expenses</td>
                          <td className="px-4 py-3 text-sm text-green-400">Yes</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm text-white font-medium">Internet Activity</td>
                          <td className="px-4 py-3 text-sm text-gray-400">App usage, features used</td>
                          <td className="px-4 py-3 text-sm text-green-400">Yes</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm text-white font-medium">Geolocation</td>
                          <td className="px-4 py-3 text-sm text-gray-400">IP address, general location</td>
                          <td className="px-4 py-3 text-sm text-green-400">Yes</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm text-white font-medium">Inferences</td>
                          <td className="px-4 py-3 text-sm text-gray-400">Preferences, behavior patterns</td>
                          <td className="px-4 py-3 text-sm text-green-400">Yes</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm text-white font-medium">Biometric Information</td>
                          <td className="px-4 py-3 text-sm text-gray-400">Fingerprints, face scans</td>
                          <td className="px-4 py-3 text-sm text-red-400">No</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">How We Use Your Information</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Service Provision</h3>
                  <p className="text-sm text-gray-400">
                    To provide and maintain our life organization services, including expenses, tasks, calendar, and messaging features.
                  </p>
                </div>

                <div className="p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Communication</h3>
                  <p className="text-sm text-gray-400">
                    To send service updates, security alerts, and respond to your inquiries and support requests.
                  </p>
                </div>

                <div className="p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Improvement</h3>
                  <p className="text-sm text-gray-400">
                    To analyze usage patterns and improve our services, features, and user experience.
                  </p>
                </div>

                <div className="p-4 border border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">Legal Compliance</h3>
                  <p className="text-sm text-gray-400">
                    To comply with applicable laws, regulations, and legal processes.
                  </p>
                </div>
              </div>
            </section>

            {/* Sharing and Disclosure */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Information Sharing and Disclosure</h2>

              <div className="bg-gray-700 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">CCPA Disclosure Requirements</h3>
                <p className="text-gray-300 mb-4">
                  In the preceding 12 months, we have disclosed the following categories of personal information for business purposes:
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Identifiers (with service providers for authentication and support)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Internet activity (with analytics providers for service improvement)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Commercial information (with payment processors for billing)
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <h4 className="font-semibold text-green-100 mb-2">We Do Not Sell Personal Information</h4>
                <p className="text-sm text-green-200">
                  Rowan does not sell personal information to third parties for monetary or other valuable consideration.
                  We may share information with service providers for legitimate business purposes only.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Data Retention</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Active Accounts</h3>
                    <p className="text-gray-400">
                      We retain your personal information for as long as your account is active or as needed to provide services.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Account Deletion</h3>
                    <p className="text-gray-400">
                      When you delete your account, we provide a 30-day grace period before permanent deletion.
                      After this period, all personal data is permanently removed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Legal Requirements</h3>
                    <p className="text-gray-400">
                      Some information may be retained longer if required by law or for legitimate business purposes
                      (e.g., audit logs for security and compliance).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Exercising Your Rights */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Exercising Your Privacy Rights</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-6 border border-gray-700 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-4">For All Users</h3>
                  <div className="space-y-3">
                    <a href="/settings/privacy" className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors">
                      <Download className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-100">Export Your Data</div>
                        <div className="text-sm text-blue-300">Download all your information</div>
                      </div>
                    </a>

                    <a href="/settings/account" className="flex items-center gap-3 p-3 bg-red-900/20 rounded-lg hover:bg-red-900/30 transition-colors">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-100">Delete Your Account</div>
                        <div className="text-sm text-red-300">Permanently remove your data</div>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="p-6 border border-gray-700 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-4">California Residents</h3>
                  <div className="space-y-3">
                    <a href="/settings/privacy" className="flex items-center gap-3 p-3 bg-yellow-900/20 rounded-lg hover:bg-yellow-900/30 transition-colors">
                      <Shield className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-100">CCPA Settings</div>
                        <div className="text-sm text-yellow-300">Manage opt-out preferences</div>
                      </div>
                    </a>

                    <div className="p-3 bg-gray-700 rounded-lg">
                      <div className="font-medium text-white">Request Information</div>
                      <div className="text-sm text-gray-400">Email: privacy@rowan-app.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="border-t border-gray-700 pt-8">
              <h2 className="text-2xl font-bold text-white mb-6">Contact Us</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-white mb-3">General Privacy Questions</h3>
                  <div className="space-y-2 text-gray-400">
                    <p>Email: privacy@rowan-app.com</p>
                    <p>Response time: Within 30 days</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3">CCPA Requests (California Residents)</h3>
                  <div className="space-y-2 text-gray-400">
                    <p>Email: ccpa@rowan-app.com</p>
                    <p>Phone: 1-800-ROWAN-CA</p>
                    <p>Response time: Within 45 days</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">
                  Last updated: {new Date().toLocaleDateString()}. We may update this Privacy Policy from time to time.
                  We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}