import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // FIX: Explicitly set workspace root to prevent lockfile confusion
  outputFileTracingRoot: __dirname,

  typescript: {
    // TypeScript errors are now fixed - strict mode enabled
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint has a circular structure error - skip during builds
    // Run ESLint separately with: npm run lint
    ignoreDuringBuilds: true,
  },
  // Workaround for Next.js 15.x Html import bug
  skipTrailingSlashRedirect: true,
  // Note: skipProxyUrlNormalize removed in Next.js 16
  // Use standalone output only on Vercel (not local builds)
  ...(process.env.VERCEL === '1' && { output: 'standalone' }),
  // Disable static error page generation to prevent Next.js 15 Html import issues
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // Disabled due to race condition causing 500 errors in dev
    // webpackBuildWorker: true,
  },

  // Re-enable webpack cache (disabling it causes server folder to not be created)
  // webpack: (config) => {
  //   config.cache = false;
  //   return config;
  // },

  // Performance optimizations
  // Remove console.log/warn in production but keep console.error for Sentry
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'],
    } : false,
  },

  // Image optimization settings (optimized for high-DPI mobile displays)
  // SECURITY: Restricted to trusted image hosts to prevent SSRF attacks
  images: {
    remotePatterns: [
      // Supabase Storage (avatars, attachments)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      // Gravatar for default avatars
      {
        protocol: 'https',
        hostname: 'gravatar.com',
      },
      {
        protocol: 'https',
        hostname: '*.gravatar.com',
      },
      // Google profile pictures (OAuth)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Apple profile pictures (OAuth)
      {
        protocol: 'https',
        hostname: '*.apple.com',
      },
      // Development only
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    // SECURITY: SVG disabled - SVGs can contain executable scripts
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Device sizes for high-DPI displays (1x, 2x, 3x pixel densities)
    // These are the srcset breakpoints for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for specific component sizes (thumbnails, avatars, etc.)
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Generate blur placeholders for better perceived performance
    // Note: Requires explicit placeholder="blur" on Image components
  },

  // Security headers and CSP
  async headers() {
    // COMPLETELY DISABLE CSP AND MOST HEADERS IN DEVELOPMENT
    if (process.env.NODE_ENV === 'development') {
      return [];
    }

    // Production CSP policy
    //
    // SECURITY NOTE: 'unsafe-inline' and 'unsafe-eval' are required due to Next.js framework limitations:
    // - 'unsafe-inline': Required for Next.js hydration scripts and inline styles (CSS-in-JS)
    // - 'unsafe-eval': Required for some bundled libraries and webpack runtime
    //
    // FUTURE IMPROVEMENT: Next.js 13.4+ supports experimental nonce-based CSP via:
    // - experimental.appDocumentPreloading in next.config.js
    // - Using generateNonce() in middleware and passing to Script components
    // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
    //
    // Priority: Medium - Implement when Next.js nonce support stabilizes
    const scriptSources = [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://vercel.live",
      "https://va.vercel-scripts.com",
      "https://vitals.vercel-insights.com",
      "https://cdn.vercel-insights.com",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://cdnjs.cloudflare.com",
      "https://static.cloudflareinsights.com",
      "https://unpkg.com",
      "https://cdn.jsdelivr.net",
      // Browser extension support for users
      "chrome-extension:",
      "safari-extension:",
      "moz-extension:",
      "ms-browser-extension:",
      // Additional sources to prevent errors
      "data:",
      "blob:",
      "'wasm-unsafe-eval'"
    ].join(' ');

    const styleSources = [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com",
      "https://unpkg.com",
      "https://cdn.jsdelivr.net",
      // Browser extension support for users
      "chrome-extension:",
      "safari-extension:",
      "moz-extension:",
      "ms-browser-extension:",
      // Additional sources to prevent errors
      "data:",
      "blob:"
    ].join(' ');

    const cspPolicy = [
      "default-src 'self'",
      `script-src ${scriptSources}`,
      `style-src ${styleSources}`,
      "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https: wss: data:",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.google.com",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "manifest-src 'self'",
      "media-src 'self' blob: data: https:",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspPolicy,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Sentry configuration - Updated to new format (v10.x+)
const sentryWebpackPluginOptions = {
  // Sentry organization and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: true,

  // Upload source maps during build
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Webpack-specific options (new format for v10.x+)
  webpack: {
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Disable automatic instrumentation of error pages to prevent Next.js 15 Html component issues
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,

    // Tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

// Configure bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Export with bundle analyzer and Sentry wrapper
export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
