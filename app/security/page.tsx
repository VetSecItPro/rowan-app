/* eslint-disable react/no-unescaped-entities */

import type { Metadata } from 'next';

export const revalidate = 86400; // ISR: regenerate every 24 hours

export const metadata: Metadata = {
  title: 'Security | Rowan',
  description: 'How Rowan keeps your family data safe. End-to-end encryption, SOC 2 compliance, and enterprise-grade security.',
};

import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export default function SecurityPage() {
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

          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Security</h1>
          </div>
          <p className="text-gray-400 mb-8">Your family's data deserves the highest level of protection</p>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Our Security Commitment</h2>
            <p className="text-gray-300 mb-4">
              At Rowan, security isn't an afterthought—it's built into every aspect of our platform. We understand that you're trusting us with your family's most personal information, and we take that responsibility seriously.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-purple-400" />
              Data Encryption
            </h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Encryption in Transit</h3>
            <p className="text-gray-300 mb-4">
              All data transmitted between your device and our servers is protected using:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>TLS 1.3:</strong> The latest and most secure transport layer security protocol</li>
              <li><strong>HTTPS Everywhere:</strong> Every connection to Rowan is encrypted, with no exceptions</li>
              <li><strong>Perfect Forward Secrecy:</strong> Even if encryption keys are compromised, past communications remain secure</li>
              <li><strong>Certificate Pinning:</strong> Prevents man-in-the-middle attacks</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Encryption at Rest</h3>
            <p className="text-gray-300 mb-4">
              Your data is encrypted when stored on our servers:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>AES-256 Encryption:</strong> Military-grade encryption for all stored data</li>
              <li><strong>Database Encryption:</strong> Multiple layers of encryption at the database level</li>
              <li><strong>Encrypted Backups:</strong> All backups are fully encrypted</li>
              <li><strong>Secure Key Management:</strong> Encryption keys are stored separately from data and rotated regularly</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Password Protection</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>bcrypt Hashing:</strong> Passwords are hashed using industry-standard bcrypt with salt</li>
              <li><strong>Never Stored in Plain Text:</strong> We can't see your password and never will</li>
              <li><strong>Secure Password Reset:</strong> Time-limited, single-use tokens for password recovery</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-400" />
              Infrastructure Security
            </h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Hosting and Cloud Security</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Tier-1 Cloud Provider:</strong> Hosted on enterprise-grade infrastructure with 99.9% uptime SLA</li>
              <li><strong>Isolated Environments:</strong> Production, staging, and development environments are completely separate</li>
              <li><strong>Distributed Architecture:</strong> Redundant systems across multiple availability zones</li>
              <li><strong>DDoS Protection:</strong> Advanced protection against distributed denial-of-service attacks</li>
              <li><strong>Web Application Firewall:</strong> Filters malicious traffic before it reaches our application</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Network Security</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Private Networks:</strong> Database and internal services not accessible from the internet</li>
              <li><strong>IP Whitelisting:</strong> Restricted access to administrative functions</li>
              <li><strong>Intrusion Detection:</strong> 24/7 monitoring for suspicious activity</li>
              <li><strong>Security Groups:</strong> Strict firewall rules limiting service communication</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Data Backups</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Automated Backups:</strong> Daily encrypted backups of all data</li>
              <li><strong>Geographic Redundancy:</strong> Backups stored in multiple regions</li>
              <li><strong>Point-in-Time Recovery:</strong> Ability to restore data to any point in the last 30 days</li>
              <li><strong>Tested Recovery:</strong> Regular disaster recovery drills</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-purple-400" />
              Access Controls
            </h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">User Authentication</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Multi-Factor Authentication (MFA):</strong> Available for all accounts (coming soon: required for all users)</li>
              <li><strong>Session Management:</strong> Secure session tokens with automatic expiration</li>
              <li><strong>Login Monitoring:</strong> Alerts for suspicious login attempts or new device access</li>
              <li><strong>Forced Logout:</strong> Ability to remotely sign out of all sessions</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Employee Access</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Principle of Least Privilege:</strong> Employees only have access to data necessary for their role</li>
              <li><strong>Zero Standing Privileges:</strong> No permanent admin access; all elevated access is temporary and logged</li>
              <li><strong>Background Checks:</strong> All employees undergo security screening</li>
              <li><strong>Security Training:</strong> Regular security awareness training for all team members</li>
              <li><strong>Access Logging:</strong> Every access to production systems is logged and audited</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Space Permissions</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Role-Based Access:</strong> Space owners control who can view and edit content</li>
              <li><strong>Invitation Only:</strong> New members can only join via secure invitation</li>
              <li><strong>Granular Permissions:</strong> Control access to specific features and data</li>
              <li><strong>Audit Logs:</strong> Track who accessed or modified content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-purple-400" />
              Monitoring and Response
            </h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Security Monitoring</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>24/7 Monitoring:</strong> Continuous automated monitoring of all systems</li>
              <li><strong>Anomaly Detection:</strong> AI-powered detection of unusual behavior</li>
              <li><strong>Real-Time Alerts:</strong> Immediate notification of potential security incidents</li>
              <li><strong>Log Analysis:</strong> Comprehensive logging and analysis of all system activity</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Incident Response</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Response Team:</strong> Dedicated security incident response team</li>
              <li><strong>Response Plan:</strong> Documented procedures for handling security incidents</li>
              <li><strong>User Notification:</strong> Prompt notification of any breach affecting your data</li>
              <li><strong>Post-Incident Review:</strong> Analysis and improvements after every incident</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Vulnerability Management</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Regular Scanning:</strong> Automated vulnerability scanning of all systems</li>
              <li><strong>Penetration Testing:</strong> Annual third-party security audits</li>
              <li><strong>Bug Bounty Program:</strong> Rewards for responsible disclosure of security issues</li>
              <li><strong>Rapid Patching:</strong> Critical security patches applied within 24 hours</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-purple-400" />
              Compliance and Certifications
            </h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Standards and Regulations</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>GDPR Compliant:</strong> Full compliance with EU General Data Protection Regulation</li>
              <li><strong>CCPA Compliant:</strong> Adherence to California Consumer Privacy Act requirements</li>
              <li><strong>SOC 2 Type II:</strong> (In progress) Independent audit of security controls</li>
              <li><strong>OWASP Top 10:</strong> Protection against the most critical web application security risks</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Development Practices</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Secure SDLC:</strong> Security integrated into every phase of development</li>
              <li><strong>Code Reviews:</strong> All code reviewed by multiple developers before deployment</li>
              <li><strong>Automated Testing:</strong> Security tests run on every code change</li>
              <li><strong>Dependency Scanning:</strong> Continuous monitoring for vulnerable third-party packages</li>
              <li><strong>Static Analysis:</strong> Automated code analysis to catch security issues early</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Your Role in Security</h2>
            <p className="text-gray-300 mb-4">
              While we implement robust security measures, you play a crucial role in keeping your account secure:
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Best Practices</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li><strong>Strong Passwords:</strong> Use unique, complex passwords (12+ characters with mixed case, numbers, and symbols)</li>
              <li><strong>Enable MFA:</strong> Add an extra layer of security with multi-factor authentication</li>
              <li><strong>Verify Invitations:</strong> Only accept space invitations from people you trust</li>
              <li><strong>Secure Devices:</strong> Keep your devices and browsers updated</li>
              <li><strong>Review Activity:</strong> Regularly check your account activity for anything suspicious</li>
              <li><strong>Sign Out:</strong> Log out when using shared or public devices</li>
              <li><strong>Report Issues:</strong> Contact us immediately if you notice suspicious activity</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">What to Avoid</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li>Don't share your password with anyone (including family members)</li>
              <li>Don't reuse passwords from other services</li>
              <li>Don't click suspicious links in emails claiming to be from Rowan</li>
              <li>Don't access Rowan from untrusted public Wi-Fi without VPN</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Transparency and Communication</h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Security Updates</h3>
            <p className="text-gray-300 mb-4">
              We believe in transparency about our security practices:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li>Regular security blog posts and updates</li>
              <li>Immediate notification of any security incidents affecting user data</li>
              <li>Annual security and transparency reports</li>
              <li>Open communication about security improvements</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Third-Party Services</h3>
            <p className="text-gray-300 mb-4">
              We carefully vet all third-party services we use:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li>Cloud hosting providers with SOC 2 compliance</li>
              <li>Email delivery services with strong security practices</li>
              <li>Analytics tools that respect user privacy</li>
              <li>All vendors sign data processing agreements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Report a Security Issue</h2>
            <p className="text-gray-300 mb-4">
              We appreciate responsible disclosure of security vulnerabilities. If you discover a security issue:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
              <li>Email us at <a href="mailto:contact@steelmotionllc.com" className="text-purple-400 hover:underline">contact@steelmotionllc.com</a></li>
              <li>Include detailed information about the vulnerability</li>
              <li>Give us reasonable time to address the issue before public disclosure</li>
              <li>Eligible reports may receive recognition and rewards</li>
            </ul>

            <div className="mt-6 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
              <p className="text-gray-300">
                <strong>Note:</strong> For non-security support issues, please contact <a href="mailto:contact@steelmotionllc.com" className="text-purple-400 hover:underline">contact@steelmotionllc.com</a>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Questions?</h2>
            <p className="text-gray-300 mb-4">
              Have questions about our security practices? Contact us at{' '}
              <a href="mailto:contact@steelmotionllc.com" className="text-purple-400 hover:underline">
                contact@steelmotionllc.com
              </a>
            </p>
          </section>

          <section className="mb-8" id="acknowledgments">
            <h2 className="text-2xl font-semibold text-white mb-4">Security Acknowledgments</h2>
            <p className="text-gray-300 mb-4">
              We appreciate the security researchers and community members who help keep Rowan safe by responsibly reporting vulnerabilities.
            </p>
            <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <p className="text-gray-400 text-center italic">
                No security researchers have been acknowledged yet. Be the first to help secure Rowan!
              </p>
            </div>
            <p className="text-gray-300 mt-4 text-sm">
              To be included in this hall of fame, please responsibly disclose security vulnerabilities to <a href="mailto:contact@steelmotionllc.com" className="text-purple-400 hover:underline">contact@steelmotionllc.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Security Resources</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>
                <a href="/.well-known/security.txt" className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  security.txt
                </a> - RFC 9116 compliant security contact information
              </li>
              <li>
                <a href="https://github.com/VetSecItPro/rowan-app/security/advisories" className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  GitHub Security Advisories
                </a> - Report vulnerabilities through GitHub
              </li>
              <li>
                <Link href="/privacy" className="text-purple-400 hover:underline">
                  Privacy Policy
                </Link> - How we handle your data
              </li>
              <li>
                <Link href="/terms" className="text-purple-400 hover:underline">
                  Terms of Service
                </Link> - Our terms and conditions
              </li>
            </ul>
          </section>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
