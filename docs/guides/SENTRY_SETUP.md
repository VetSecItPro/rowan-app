# Sentry Error Tracking Setup Guide

This document provides instructions for setting up Sentry error tracking for the Rowan application.

## Why Sentry?

Sentry provides:
- Real-time error tracking
- Performance monitoring
- User session replay
- Release tracking
- Error alerting and notifications
- Detailed stack traces with source maps

## Installation Steps

### 1. Install Sentry SDK

```bash
npm install @sentry/nextjs --save
```

### 2. Initialize Sentry

Run the Sentry setup wizard:

```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.js` with Sentry plugin
- Add source map upload configuration

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_ORG=your_organization_slug
SENTRY_PROJECT=rowan-app
SENTRY_AUTH_TOKEN=your_auth_token_here

# Optional: Disable Sentry in development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### 4. Basic Configuration

**sentry.client.config.ts:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions
  // Lower in production to reduce costs
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture Replay for 10% of all sessions,
  // plus 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',

  // Ignore common errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  // Custom integrations
  integrations: [
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
```

**sentry.server.config.ts:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development',

  // Server-specific configuration
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});
```

### 5. Update next.config.js

The Sentry wizard should have added this automatically:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry webpack plugin options
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // Upload source maps for better error tracking
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

## Usage

### Automatic Error Capturing

Sentry will automatically capture:
- Unhandled exceptions
- Unhandled promise rejections
- API route errors
- React component errors

### Manual Error Reporting

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
  // Handle error
}
```

### Adding Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

Sentry.setTag('feature', 'tasks');
Sentry.setContext('task', {
  id: task.id,
  status: task.status,
});
```

### Performance Monitoring

```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  op: 'task',
  name: 'Create Task',
});

try {
  // Your code
  await createTask(data);
} finally {
  transaction.finish();
}
```

## API Route Integration

Add Sentry to API routes for better error tracking:

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: NextRequest) {
  try {
    // Your code
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/example',
        method: 'POST',
      },
      extra: {
        requestBody: await req.json(),
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Error Boundary (Already Implemented)

The app already has an error boundary at `app/error.tsx`. Enhance it with Sentry:

```typescript
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Testing

### Test in Development

```typescript
// pages/api/test-sentry.ts
import * as Sentry from '@sentry/nextjs';

export default function handler(req, res) {
  try {
    throw new Error('Sentry Test Error');
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Test error sent to Sentry' });
  }
}
```

Visit `/api/test-sentry` to trigger a test error.

## Monitoring Best Practices

1. **Set appropriate sample rates** - Don't send 100% of transactions in production
2. **Use tags** - Categorize errors by feature, user type, etc.
3. **Add breadcrumbs** - Track user actions leading to errors
4. **Filter sensitive data** - Don't send passwords, API keys, etc.
5. **Set up alerts** - Get notified of critical errors immediately
6. **Review regularly** - Check Sentry dashboard weekly

## Cost Optimization

- Use lower `tracesSampleRate` in production (0.1 = 10%)
- Use lower `replaysSessionSampleRate` (0.1 = 10%)
- Filter out non-critical errors in `beforeSend`
- Set up rate limiting per error type
- Archive resolved issues regularly

## Security Considerations

- Never send sensitive user data (passwords, tokens, etc.)
- Use `beforeSend` to scrub sensitive information
- Store Sentry auth token securely (not in git)
- Use environment-specific DSNs
- Enable source map uploading only in production builds

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Error Tracking Best Practices](https://docs.sentry.io/product/error-monitoring/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)

---

**Status:** Ready for implementation
**Priority:** Medium (implement when ready to go to production)
**Estimated Setup Time:** 30 minutes
