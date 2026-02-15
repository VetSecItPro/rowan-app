'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { CheckCircle, Clock, Mail, Heart } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';

const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

export default function GoodbyePage() {
  const { signOut } = useAuth();

  useEffect(() => {
    // Sign out the user when they reach this page
    const handleSignOut = async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      signOut();
    };

    handleSignOut();
  }, [signOut]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-gray-900/95 rounded-3xl shadow-2xl border border-gray-700/50 p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Main Message */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4">
            Account Deletion Initiated
          </h1>

          <p className="text-lg text-gray-300 mb-8">
            Your Rowan account has been marked for deletion. Thank you for using our service.
          </p>

          {/* Grace Period Info */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-blue-100">30-Day Grace Period</h2>
            </div>
            <p className="text-blue-200 mb-4">
              Your account will be permanently deleted on <strong>{deletionDate}</strong>.
            </p>
            <p className="text-sm text-blue-300">
              You can cancel this deletion anytime within 30 days by logging back in.
            </p>
          </div>

          {/* What Happens Next */}
          <div className="text-left space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">What happens next:</h3>

            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <Mail className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Email Notifications</p>
                  <p className="text-sm text-gray-400">You&apos;ll receive reminder emails before permanent deletion.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">5-Day Warning</p>
                  <p className="text-sm text-gray-400">You&apos;ll get a final warning 5 days before permanent deletion.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">Permanent Deletion</p>
                  <p className="text-sm text-gray-400">After 30 days, all your data will be permanently removed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-lg font-semibold text-white">Thank You</span>
            </div>
            <p className="text-gray-300">
              We appreciate the time you spent with Rowan. If you change your mind, simply log back in within 30 days to reactivate your account.
            </p>
          </div>

          {/* Legal Compliance */}
          <div className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-700">
            This deletion process complies with GDPR Article 17 (Right to Erasure) and our Privacy Policy.
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
