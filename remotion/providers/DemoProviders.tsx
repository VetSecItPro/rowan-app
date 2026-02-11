import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/lib/contexts/auth-context';
import { SpacesContext } from '@/lib/contexts/spaces-context';
import { SubscriptionContext } from '@/lib/contexts/subscription-context';
import type { SubscriptionContextValue } from '@/lib/contexts/subscription-context';
import { DeviceContext } from '@/lib/contexts/DeviceContext';
import type { DeviceContextValue } from '@/lib/contexts/DeviceContext';
import type { FeatureLimits } from '@/lib/types';
import { demoUser, demoSpace, demoLimits } from './demo-data';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const noopAsync = async () => {};

const authValue = {
  user: demoUser,
  session: null,
  loading: false,
  error: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: noopAsync,
  refreshProfile: noopAsync,
  spaces: [demoSpace],
  currentSpace: demoSpace,
  switchSpace: () => {},
  refreshSpaces: noopAsync,
};

const spacesValue = {
  spaces: [demoSpace],
  currentSpace: demoSpace,
  loading: false,
  error: null,
  hasZeroSpaces: false,
  switchSpace: () => {},
  refreshSpaces: noopAsync,
  createSpace: async () => ({ success: true, spaceId: 'new-space' }),
  deleteSpace: async () => ({ success: true }),
};

const subscriptionValue: SubscriptionContextValue = {
  tier: 'family',
  effectiveTier: 'family',
  isLoading: false,
  limits: demoLimits,
  canAccess: (_feature: keyof FeatureLimits) => true,
  refresh: noopAsync,
  showUpgradeModal: () => {},
};

const deviceValue: DeviceContextValue = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  deviceType: 'desktop',
  isLandscape: true,
  isPortrait: false,
  isCompactLandscape: false,
  isVerticallyConstrained: false,
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
  hasCoarsePointer: false,
  windowWidth: 1920,
  windowHeight: 1080,
};

interface DemoProvidersProps {
  children: React.ReactNode;
}

export const DemoProviders: React.FC<DemoProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <SpacesContext.Provider value={spacesValue}>
          <SubscriptionContext.Provider value={subscriptionValue}>
            <DeviceContext.Provider value={deviceValue}>
              {children}
            </DeviceContext.Provider>
          </SubscriptionContext.Provider>
        </SpacesContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};
