# Sign-up & Authentication Implementation Guide

## Overview
This document provides a comprehensive guide for implementing passwordless authentication (magic links), Google OAuth, and an interactive onboarding tour for the Rowan application.

## Current State Analysis

### Existing Authentication System
- **Email/Password Authentication**: Fully functional with Zod validation
- **Password Requirements**: 8+ characters, uppercase, lowercase, numbers
- **Security Features**: Rate limiting, RLS policies, CSRF protection
- **User Management**: Profile creation, space management, timezone detection
- **Missing Features**: Magic links, OAuth providers, interactive onboarding

### Current Auth Flow
1. User visits `/login` or `/signup`
2. Email/password form submission
3. Supabase authentication
4. Redirect to dashboard with space loading
5. No email verification currently required

## Implementation Requirements

### 1. Authentication Methods Priority
1. **Primary**: Magic Links (unified signup/login)
2. **Secondary**: Google OAuth with profile import
3. **Fallback**: Email/Password (existing system)

### 2. Magic Link Specifications
- **Unified Flow**: Single email input handles both signup and login
- **Auto-Account Creation**: New emails automatically create accounts
- **Email Verification**: Required for all new accounts
- **Security**: 15-minute expiration, one-time use tokens
- **Rate Limiting**: Maximum 3 requests per email per hour

### 3. Google OAuth Requirements
- **Profile Import**: Name and email only (no additional permissions)
- **Post-Signup Flow**: Redirect to space creation page (skippable)
- **Existing Users**: Direct login to dashboard
- **Security**: Validate OAuth state, prevent CSRF

### 4. Email Verification
- **Mandatory**: All new accounts must verify email before access
- **Implementation**: Supabase built-in email confirmation
- **UI**: Dedicated verification pending page
- **Resend**: Allow users to request new verification emails

## Technical Implementation Plan

### Supabase Configuration

#### Auth Settings
```javascript
// Enable in Supabase Dashboard > Authentication > Settings
{
  "enable_email_confirmations": true,
  "enable_phone_confirmations": false,
  "enable_signup": true,
  "minimum_password_length": 8,
  "password_requirements": {
    "lowercase": true,
    "uppercase": true,
    "numbers": true,
    "symbols": false
  }
}
```

#### Magic Link Setup
```javascript
// Supabase Dashboard > Authentication > Templates
// Magic Link Email Template
{
  "subject": "Sign in to Rowan",
  "body": `
    <h2>Welcome to Rowan!</h2>
    <p>Click the link below to sign in to your account:</p>
    <a href="{{ .ConfirmationURL }}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      Sign In to Rowan
    </a>
    <p>This link expires in 15 minutes.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `
}
```

#### Google OAuth Setup
```javascript
// Supabase Dashboard > Authentication > Providers > Google
{
  "client_id": "your-google-client-id",
  "client_secret": "your-google-client-secret",
  "redirect_url": "https://your-project.supabase.co/auth/v1/callback",
  "scopes": "email profile"
}
```

### Environment Variables
```bash
# Add to .env.local
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# Existing variables
NEXT_PUBLIC_SUPABASE_URL=https://SUPABASE_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### API Routes Implementation

#### Magic Link Endpoint
```typescript
// /api/auth/magic-link/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const MagicLinkSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { email } = MagicLinkSchema.parse(body);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
        shouldCreateUser: true,
      },
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Check your email for the login link'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to send magic link' },
      { status: 400 }
    );
  }
}
```

#### Google OAuth Callback
```typescript
// /api/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this is a new user
      const isNewUser = data.user.created_at === data.user.last_sign_in_at;

      if (isNewUser) {
        // Redirect to space creation for new Google users
        return NextResponse.redirect(`${requestUrl.origin}/onboarding/create-space`);
      }
    }
  }

  // Redirect to dashboard for existing users or errors
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```

### New Pages Required

#### Space Creation Onboarding
```typescript
// /app/onboarding/create-space/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSpace } from '@/lib/services/spaces-service';

export default function CreateSpacePage() {
  const [spaceName, setSpaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateSpace = async () => {
    setLoading(true);
    try {
      await createSpace({ name: spaceName, color: 'blue' });
      router.push('/dashboard?tour=true'); // Launch tour after space creation
    } catch (error) {
      console.error('Failed to create space:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard?tour=true'); // Launch tour even if skipped
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Your First Space
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Spaces help you organize your tasks, events, and collaborate with others.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Space name (e.g., 'Family', 'Work', 'Personal')"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          />

          <button
            onClick={handleCreateSpace}
            disabled={!spaceName.trim() || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Space'}
          </button>

          <button
            onClick={handleSkip}
            className="w-full text-gray-600 dark:text-gray-400 py-2 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Skip for now (you can create spaces in Settings)
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Email Confirmation Page
```typescript
// /app/auth/confirm/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ConfirmPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard?tour=true');
        } else {
          setError('Invalid or expired confirmation link');
        }
      } catch (error) {
        setError('Failed to confirm email');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/login" className="text-blue-600 hover:underline">
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  return null;
}
```

## Interactive Onboarding Tour Design

### Tour Library Recommendations

#### Option 1: Reactour (Recommended)
```bash
npm install @reactour/tour
```

**Pros:**
- React-native design, excellent TypeScript support
- Highly customizable styling
- Smooth animations and transitions
- Mobile-responsive
- Active maintenance and community

**Cons:**
- Larger bundle size
- More complex API

#### Option 2: Intro.js
```bash
npm install intro.js
```

**Pros:**
- Lightweight and fast
- Simple API
- Great mobile support
- Proven track record

**Cons:**
- jQuery-style API (not React-native)
- Less customization options
- Requires more custom styling work

#### Option 3: Shepherd.js
```bash
npm install shepherd.js
```

**Pros:**
- Framework agnostic
- Powerful positioning engine
- Highly customizable
- Great accessibility features

**Cons:**
- More complex setup
- Requires wrapper component for React

### Recommended Choice: Reactour
Best balance of React integration, customization, and user experience.

### 6-Stop Guided Tour Specification

#### Stop 1: Menu Bar & Header
**Target**: `.header-component` or `nav[role="navigation"]`
**Position**: bottom
**Content**:
```typescript
{
  selector: '.header-component',
  content: (
    <div>
      <h3>Welcome to Rowan! 👋</h3>
      <p>This is your command center. Here you can:</p>
      <ul>
        <li>• Switch between different spaces</li>
        <li>• Access your profile and settings</li>
        <li>• Manage notifications</li>
      </ul>
      <p>Let's take a quick tour of the main features!</p>
    </div>
  ),
  position: 'bottom',
  action: () => console.log('Tour started'),
}
```

#### Stop 2: Feature Cards on Dashboard
**Target**: `.feature-cards-grid` or `[data-testid="dashboard-features"]`
**Position**: center
**Content**:
```typescript
{
  selector: '.feature-cards-grid',
  content: (
    <div>
      <h3>Your Feature Hub 🎯</h3>
      <p>These cards give you quick access to all of Rowan's powerful features:</p>
      <ul>
        <li>• <strong>Tasks</strong> - Organize your to-dos</li>
        <li>• <strong>Calendar</strong> - Schedule events and meetings</li>
        <li>• <strong>Messages</strong> - Communicate with your space members</li>
        <li>• <strong>Shopping</strong> - Shared shopping lists</li>
        <li>• <strong>Goals</strong> - Track your progress</li>
      </ul>
    </div>
  ),
  position: 'center',
}
```

#### Stop 3: Check-in Feature
**Target**: `[data-feature="check-in"]` or `.check-in-component`
**Position**: right
**Content**:
```typescript
{
  selector: '[data-feature="check-in"]',
  content: (
    <div>
      <h3>Daily Check-in ✨</h3>
      <p>Stay connected with your space members through daily check-ins.</p>
      <p>Share how you're doing, what you're working on, and celebrate wins together!</p>
      <p><strong>Tip:</strong> Regular check-ins help keep everyone aligned and motivated.</p>
    </div>
  ),
  position: 'right',
}
```

#### Stop 4: Navigation Footer
**Target**: `footer` or `.navigation-footer`
**Position**: top
**Content**:
```typescript
{
  selector: '.navigation-footer',
  content: (
    <div>
      <h3>Quick Navigation 🧭</h3>
      <p>Your shortcuts to everything important are right here at the bottom.</p>
      <p>On mobile, this is your primary way to move between features quickly and efficiently.</p>
      <p><strong>Pro tip:</strong> You can access any feature with just one tap!</p>
    </div>
  ),
  position: 'top',
}
```

#### Stop 5: Space Management
**Target**: `.space-switcher` or `[data-testid="space-selector"]`
**Position**: bottom-right
**Content**:
```typescript
{
  selector: '.space-switcher',
  content: (
    <div>
      <h3>Spaces & Collaboration 🤝</h3>
      <p>Spaces are how you organize different areas of your life:</p>
      <ul>
        <li>• <strong>Personal</strong> - Your individual tasks and goals</li>
        <li>• <strong>Family</strong> - Shared household management</li>
        <li>• <strong>Work</strong> - Team projects and meetings</li>
      </ul>
      <p>Invite others to collaborate and share responsibilities!</p>
    </div>
  ),
  position: 'bottom-right',
}
```

#### Stop 6: Create Your First Item
**Target**: `.add-button` or `[aria-label="Add new item"]`
**Position**: left
**Content**:
```typescript
{
  selector: '.add-button',
  content: (
    <div>
      <h3>Ready to Get Started? 🚀</h3>
      <p>Click this button to create your first task, event, or reminder!</p>
      <p>Everything in Rowan is designed to be quick and intuitive.</p>
      <p><strong>You're all set!</strong> Explore at your own pace and don't hesitate to invite others to your space.</p>
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm">💡 <strong>Need help?</strong> Check out Settings → Help & Support</p>
      </div>
    </div>
  ),
  position: 'left',
  action: () => {
    // Mark tour as completed
    localStorage.setItem('rowan-tour-completed', 'true');
  },
}
```

### Tour Implementation Component

```typescript
// /components/onboarding/OnboardingTour.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTour } from '@reactour/tour';
import { useRouter, useSearchParams } from 'next/navigation';

const tourSteps = [
  // ... (steps defined above)
];

export default function OnboardingTour() {
  const { setIsOpen, setSteps } = useTour();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    const tourParam = searchParams.get('tour');
    const tourCompleted = localStorage.getItem('rowan-tour-completed');

    // Show tour if URL param is present and tour hasn't been completed
    if (tourParam === 'true' && !tourCompleted) {
      setShouldShowTour(true);
      setSteps(tourSteps);

      // Small delay to ensure DOM elements are rendered
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);

      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('tour');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, setIsOpen, setSteps, router]);

  return null; // This component only manages tour state
}
```

### Tour Styling Configuration

```typescript
// /lib/tour-config.ts
export const tourConfig = {
  styles: {
    popover: (base: any) => ({
      ...base,
      '--reactour-accent': '#3b82f6', // Blue-600
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    maskArea: (base: any) => ({ ...base, rx: 8 }),
    badge: (base: any) => ({ ...base, left: 'auto', right: '-0.8125em' }),
  },
  className: 'rowan-tour',
  padding: 10,
  disableInteraction: false,
  disableKeyboardNavigation: false,
  showCloseButton: true,
  showNavigation: true,
  showBadge: true,
  prevButton: ({ onClick }: any) => (
    <button
      onClick={onClick}
      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
    >
      ← Back
    </button>
  ),
  nextButton: ({ onClick, isLast }: any) => (
    <button
      onClick={onClick}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {isLast ? 'Finish' : 'Next →'}
    </button>
  ),
};
```

## Security Considerations

### Magic Link Security
1. **Token Expiration**: 15-minute window maximum
2. **One-Time Use**: Tokens invalidated after first use
3. **Rate Limiting**: Maximum 3 requests per email per hour
4. **Domain Validation**: Ensure redirect URLs match approved domains
5. **HTTPS Only**: All magic links must use HTTPS in production

### Google OAuth Security
1. **State Parameter**: Prevent CSRF attacks with random state
2. **Scope Limitation**: Only request necessary permissions (email, profile)
3. **Token Validation**: Verify OAuth tokens on server-side
4. **Redirect URI Validation**: Whitelist approved redirect URIs

### General Security
1. **Session Management**: Secure cookie settings with httpOnly, secure flags
2. **RLS Policies**: Ensure all data access is properly scoped to user's spaces
3. **Input Validation**: Zod schemas for all API endpoints
4. **Error Handling**: No sensitive information in error messages

## User Flow Diagrams

### Magic Link Flow
```
User enters email → API validates & sends magic link → User clicks link in email →
Supabase validates token → New user: create account & verify → Existing user: log in →
Redirect to dashboard with tour (new) or dashboard (existing)
```

### Google OAuth Flow
```
User clicks "Sign in with Google" → Google OAuth consent → Google returns with code →
API exchanges code for tokens → Check if new user → New user: create account & redirect to space creation →
Existing user: redirect to dashboard → Launch tour for new users
```

### Password Fallback Flow
```
User clicks "Use password instead" → Show email/password form → Existing auth flow →
Standard login/signup process → Redirect to dashboard
```

## Implementation Checklist

### Phase 1: Supabase Setup
- [ ] Enable email confirmations in Supabase
- [ ] Configure magic link email template
- [ ] Set up Google OAuth provider
- [ ] Configure redirect URLs for all environments
- [ ] Test email delivery with SMTP settings

### Phase 2: Environment & Security
- [ ] Add Google OAuth credentials to environment variables
- [ ] Update CORS settings in Supabase
- [ ] Configure rate limiting rules
- [ ] Set up production redirect URLs
- [ ] Test security headers and CSRF protection

### Phase 3: API Implementation
- [ ] Create magic link API endpoint with validation
- [ ] Implement Google OAuth callback route
- [ ] Add email verification API endpoints
- [ ] Update existing auth context for new flows
- [ ] Test all error scenarios and edge cases

### Phase 4: UI Updates
- [ ] Update login page with magic link primary option
- [ ] Add Google sign-in button with proper styling
- [ ] Create email confirmation page
- [ ] Build space creation onboarding page
- [ ] Implement password fallback (collapsible)

### Phase 5: Tour Implementation
- [ ] Install and configure Reactour library
- [ ] Create tour steps component
- [ ] Add data attributes to tour target elements
- [ ] Implement tour completion tracking
- [ ] Test tour on all screen sizes and devices

### Phase 6: Testing & Polish
- [ ] Test magic link flow on multiple devices
- [ ] Verify Google OAuth works in incognito/private mode
- [ ] Test email verification process
- [ ] Verify tour works after different signup methods
- [ ] Test all error states and edge cases
- [ ] Performance testing with tour enabled

## Success Metrics

### Authentication Metrics
- **Signup Conversion**: Increase from current rate
- **Login Success Rate**: Target 95%+ first-attempt success
- **Email Verification Rate**: Target 80%+ completion
- **OAuth Adoption**: Track Google vs. magic link vs. password usage

### Onboarding Metrics
- **Tour Completion Rate**: Target 70%+ completion
- **Time to First Value**: Measure time from signup to first item created
- **Feature Discovery**: Track which features users engage with post-tour
- **User Activation**: Measure users who create items within 24 hours

### Technical Metrics
- **Page Load Performance**: Ensure tour doesn't impact performance
- **Mobile Experience**: Test tour usability on mobile devices
- **Error Rates**: Monitor auth failure rates and tour issues
- **Security Incidents**: Track any auth-related security issues

## Future Enhancements

### Advanced Authentication
- **Multi-Factor Authentication**: SMS or authenticator app options
- **Social Logins**: GitHub, Apple, Microsoft integration
- **Enterprise SSO**: SAML/OIDC for business customers
- **Passwordless Phone**: SMS-based authentication option

### Enhanced Onboarding
- **Progressive Onboarding**: Feature-specific tours when users first access areas
- **Contextual Tips**: Smart tooltips based on user behavior
- **Video Walkthroughs**: Embedded tutorial videos
- **Interactive Tutorials**: Hands-on practice with sample data

### Personalization
- **Tour Customization**: Different tours based on signup method or user type
- **Feature Recommendations**: Suggest features based on usage patterns
- **Onboarding Analytics**: A/B testing different tour flows
- **Smart Defaults**: Pre-configure settings based on user preferences

This implementation guide provides a comprehensive roadmap for enhancing the Rowan authentication system with modern, user-friendly options while maintaining security and providing an excellent first-user experience through interactive onboarding.