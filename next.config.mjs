import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract Supabase hostname from env for image remote patterns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
  // Prevent webpack from bundling packages that need native Node.js fs access
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
  experimental: {
    // Re-enabled: hang was caused by duplicate node_modules folders, not this feature
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns', '@supabase/supabase-js', 'sonner'],
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
    // SECURITY: Restricted to specific project hostname — FIX-057
    remotePatterns: [
      // Supabase Storage (avatars, attachments)
      {
        protocol: 'https',
        hostname: supabaseHostname,
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
      // Placeholder images (picsum)
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // Development only
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3333',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    // PERF: 1-day cache for optimized images — FIX-058
    minimumCacheTTL: 86400,
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
    // In development: Enable basic security headers but skip CSP (breaks hot reload)
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/:path*',
          headers: [
            // Basic security headers that don't break dev workflow
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
      ];
    }

    // SECURITY: CSP consolidated to middleware.ts — FIX-026
    // Production security headers (non-CSP only; CSP is set by middleware)
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self)',
          },
        ],
      },
      {
        // FIX-311: Cache-Control for read-only weather API (1 hour, stale-while-revalidate 24h)
        source: '/api/weather/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // FIX-311: Cache-Control for read-only geographic API (24 hours - rarely changes)
        source: '/api/geographic/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400',
          },
        ],
      },
      {
        // No-cache for API routes and dynamic pages only
        // Static assets (/_next/static/) use immutable hashes and are cached by Next.js automatically
        source: '/api/:path*',
        headers: [
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

// Export with bundle analyzer and Sentry wrappers
export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
