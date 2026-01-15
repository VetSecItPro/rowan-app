'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Shield, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useValidatedSearchParams, UnsubscribeParamsSchema } from '@/lib/hooks/useValidatedSearchParams';
import { logger } from '@/lib/logger';

interface UnsubscribeResult {
  success: boolean;
  type?: string;
  error?: string;
}

function UnsubscribeContent() {
  const { params, error: validationError } = useValidatedSearchParams(UnsubscribeParamsSchema);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    // Check for validation errors
    if (validationError) {
      setLoading(false);
      setResult({ success: false, error: 'Invalid unsubscribe link format' });
      return;
    }

    const tokenParam = params?.token;
    const typeParam = params?.type || 'email';

    setToken(tokenParam || null);
    setType(typeParam || null);

    if (tokenParam) {
      processUnsubscribe(tokenParam, typeParam);
    } else {
      setLoading(false);
      setResult({ success: false, error: 'No unsubscribe token provided' });
    }
  }, [params, validationError]);

  const processUnsubscribe = async (token: string, type: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/privacy/marketing-subscription?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}`);
      const data = await response.json();

      if (data.success) {
        setResult({ success: true, type: data.data.type });
      } else {
        setResult({ success: false, error: data.error || 'Failed to unsubscribe' });
      }
    } catch (error) {
      logger.error('Unsubscribe error:', error, { component: 'page', action: 'execution' });
      setResult({ success: false, error: 'An error occurred while processing your request' });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'email':
        return Mail;
      case 'sms':
        return MessageSquare;
      case 'all':
        return Shield;
      default:
        return Mail;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'email':
        return 'Email Marketing';
      case 'sms':
        return 'SMS Marketing';
      case 'all':
        return 'All Marketing';
      default:
        return 'Marketing Communications';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'email':
        return 'blue';
      case 'sms':
        return 'green';
      case 'all':
        return 'purple';
      default:
        return 'blue';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Processing Unsubscribe Request
            </h2>
            <p className="text-gray-300">
              Please wait while we update your preferences...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Icon = getTypeIcon();
  const typeLabel = getTypeLabel();
  const color = getTypeColor();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          {result?.success ? (
            // Success State
            <>
              <div className={`bg-gradient-to-r ${
                color === 'blue' ? 'from-blue-500 to-blue-600' :
                color === 'green' ? 'from-green-500 to-green-600' :
                'from-purple-500 to-purple-600'
              } p-6 text-center`}>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Successfully Unsubscribed
                </h1>
                <p className="text-white/90">
                  You've been removed from {typeLabel.toLowerCase()}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className={`flex items-center gap-3 p-4 ${
                  color === 'blue' ? 'bg-blue-900/20 border-blue-700' :
                  color === 'green' ? 'bg-green-900/20 border-green-700' :
                  'bg-purple-900/20 border-purple-700'
                } border rounded-lg`}>
                  <Icon className={`h-5 w-5 ${
                    color === 'blue' ? 'text-blue-400' :
                    color === 'green' ? 'text-green-400' :
                    'text-purple-400'
                  }`} />
                  <div>
                    <h3 className="font-medium text-white">
                      {typeLabel} Disabled
                    </h3>
                    <p className="text-sm text-gray-300">
                      You will no longer receive {type === 'all' ? 'any marketing communications' : `${type} marketing messages`}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-400 mt-0.5" />
                    <div className="text-sm">
                      <h4 className="font-medium text-amber-100 mb-1">
                        Important Notice
                      </h4>
                      <p className="text-amber-300">
                        You will still receive essential account notifications, security alerts,
                        and service updates as these are required for account security and functionality.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-400 mb-4">
                    Changed your mind? You can update your preferences anytime in your account settings.
                  </p>
                  <Link href="/settings">
                    <Button className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go to Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            // Error State
            <>
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Unsubscribe Failed
                </h1>
                <p className="text-white/90">
                  We couldn't process your unsubscribe request
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div>
                      <h3 className="font-medium text-white">
                        Error Details
                      </h3>
                      <p className="text-sm text-red-300">
                        {result?.error || 'An unexpected error occurred'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h4 className="font-medium text-blue-100 mb-2">
                    What you can do:
                  </h4>
                  <ul className="text-sm text-blue-300 space-y-1">
                    <li>• Check if the unsubscribe link has expired (valid for 30 days)</li>
                    <li>• Try using a more recent unsubscribe link from a newer email</li>
                    <li>• Log into your account to update preferences manually</li>
                    <li>• Contact our support team for assistance</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      Sign In to Account
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button className="w-full">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            © 2024 Rowan. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/privacy" className="text-sm text-blue-400 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-blue-400 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}