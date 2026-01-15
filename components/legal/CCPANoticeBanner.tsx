'use client';

import { useState, useEffect } from 'react';
import { X, Shield, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface LocationData {
  city: string;
  state: string;
  country: string;
  isCaliforniaResident: boolean;
}

interface CCPANoticeBannerProps {
  onDismiss?: () => void;
  autoDetect?: boolean;
}

export function CCPANoticeBanner({ onDismiss, autoDetect = true }: CCPANoticeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(autoDetect);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('low');

  useEffect(() => {
    // Check if user has already dismissed the notice
    const dismissed = localStorage.getItem('ccpa-notice-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      setIsLoading(false);
      return;
    }

    if (autoDetect) {
      detectLocation();
    }
  }, [autoDetect]);

  const detectLocation = async () => {
    try {
      const response = await fetch('/api/geographic/detect');
      const result = await response.json();

      if (result.success && result.data) {
        setLocation(result.data.location);
        setConfidence(result.data.confidence);

        // Show banner if CCPA notice should be displayed
        if (result.data.showCCPANotice) {
          setIsVisible(true);
        }
      } else if (result.showCCPANotice) {
        // Show notice even if detection failed (conservative approach)
        setIsVisible(true);
      }
    } catch (error) {
      logger.error('Error detecting location:', error, { component: 'CCPANoticeBanner', action: 'component_action' });
      // Show notice on error for compliance
      setIsVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);

    // Remember dismissal for this session
    localStorage.setItem('ccpa-notice-dismissed', 'true');

    if (onDismiss) {
      onDismiss();
    }
  };

  const handleLearnMore = () => {
    window.open('/privacy-policy', '_blank');
  };

  const handleOptOut = () => {
    window.open('/do-not-sell', '_blank');
  };

  // Don't render if dismissed or not visible
  if (isDismissed || !isVisible || isLoading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          {/* Icon and Message */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">California Privacy Rights</span>
                {location?.isCaliforniaResident && (
                  <div className="flex items-center gap-1 text-blue-200">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">
                      {location.city}, {location.state}
                      {confidence === 'low' && (
                        <span title="Low confidence detection">
                          <AlertCircle className="w-3 h-3 inline ml-1" />
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-blue-100 leading-tight">
                {location?.isCaliforniaResident ? (
                  <>
                    As a California resident, you have rights under the CCPA including the right to opt-out of personal information sales.
                  </>
                ) : (
                  <>
                    You may have rights under the California Consumer Privacy Act (CCPA).
                    Learn about your privacy rights and how to exercise them.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleOptOut}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">Do Not Sell</span>
              <span className="sm:hidden">Opt-Out</span>
            </button>

            <button
              onClick={handleLearnMore}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-transparent hover:bg-white hover:bg-opacity-10 text-white rounded-lg text-sm font-medium transition-colors border border-white border-opacity-30"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Learn More</span>
              <span className="sm:hidden">Info</span>
            </button>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller screens or less prominent placement
export function CCPACompactNotice({ onDismiss }: { onDismiss?: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('ccpa-compact-notice-dismissed');
    if (!dismissed) {
      // Small delay before showing
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('ccpa-compact-notice-dismissed', 'true');
    if (onDismiss) onDismiss();
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-40">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white mb-1">
              California Privacy Rights
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              You have the right to opt-out of personal information sales under CCPA.
            </p>
            <div className="flex gap-2">
              <a
                href="/do-not-sell"
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
              >
                Manage Rights
              </a>
              <button
                onClick={handleDismiss}
                className="text-xs px-2 py-1 text-gray-500 text-gray-400 hover:text-gray-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Provider component to automatically manage CCPA notices across the app
export function CCPANoticeProvider({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [showCompact, setShowCompact] = useState(false);

  useEffect(() => {
    // Check if we should show any CCPA notices
    const bannerDismissed = localStorage.getItem('ccpa-notice-dismissed');
    const compactDismissed = localStorage.getItem('ccpa-compact-notice-dismissed');

    if (!bannerDismissed) {
      setShowBanner(true);
    } else if (!compactDismissed) {
      // Show compact notice if banner was dismissed but compact wasn't
      setShowCompact(true);
    }
  }, []);

  return (
    <>
      {children}
      {showBanner && (
        <CCPANoticeBanner
          onDismiss={() => {
            setShowBanner(false);
            // Show compact notice after banner is dismissed
            setTimeout(() => setShowCompact(true), 1000);
          }}
        />
      )}
      {showCompact && !showBanner && (
        <CCPACompactNotice onDismiss={() => setShowCompact(false)} />
      )}
    </>
  );
}