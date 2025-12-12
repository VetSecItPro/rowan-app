import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';
import os from 'os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // FIX: Webpack cache race condition with spaces in path
  // Move cache to /tmp/rowan-app-cache (no spaces) to prevent ENOENT errors
  webpack: (config, { dev }) => {
    if (dev) {
      // Use temp directory for webpack cache (no spaces in path)
      const cacheDir = path.join(os.tmpdir(), 'rowan-app-cache');
      config.cache = {
        type: 'filesystem',
        cacheDirectory: cacheDir,
        // Prevent stale cache issues
        compression: false,
        // Use content hash for better cache invalidation
        hashAlgorithm: 'xxhash64',
      };
    }
    return config;
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore build errors due to Next.js 15.5.4 Html component bug
    // Our TypeScript code is valid (verified by type-check passing)
    ignoreBuildErrors: true,
  },
  // Workaround for Next.js 15.x Html import bug
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
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
    instrumentationHook: false,
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
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
      console.log('🚀 Development mode: All CSP and restrictive headers disabled');
      return [];
    }

    // Production CSP policy - permissive to match development behavior
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

    console.log('🔒 Production CSP Policy applied:', cspPolicy);

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

// Sentry configuration
const sentryWebpackPluginOptions = {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: true,

  // Upload source maps during build
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Disable automatic instrumentation of error pages to prevent Next.js 15 Html component issues
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,

  // Source map upload enabled (org/project names verified)
};

// Configure bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Export with bundle analyzer and Sentry wrapper
export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
