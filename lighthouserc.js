module.exports = {
  ci: {
    collect: {
      // Use mobile settings by default (Lighthouse mobile)
      settings: {
        preset: 'desktop', // We'll use mobile emulation in the config below
        // Mobile emulation settings
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
        },
        // Only run on key pages to keep CI fast
      },
      // Number of runs per URL for consistent results
      numberOfRuns: 3,
      // Start server and wait for it to be ready
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 60000,
      // URLs to test (focusing on key user flows)
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/signup',
      ],
    },
    assert: {
      // Performance budgets for mobile
      assertions: {
        // Core Web Vitals - Mobile thresholds
        'categories:performance': ['warn', { minScore: 0.7 }], // 70+ performance score
        'categories:accessibility': ['error', { minScore: 0.9 }], // 90+ accessibility
        'categories:best-practices': ['warn', { minScore: 0.8 }], // 80+ best practices
        'categories:seo': ['warn', { minScore: 0.9 }], // 90+ SEO

        // Performance metrics (mobile-focused)
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }], // 2.5s
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }], // 4s
        'interactive': ['warn', { maxNumericValue: 5000 }], // 5s TTI
        'speed-index': ['warn', { maxNumericValue: 4500 }], // 4.5s
        'total-blocking-time': ['warn', { maxNumericValue: 600 }], // 600ms
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.25 }], // 0.25 CLS

        // Bundle size budgets
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }], // 500KB JS
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 100000 }], // 100KB CSS
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }], // 2MB total

        // Image optimization
        'uses-responsive-images': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'offscreen-images': 'warn',

        // PWA checks
        'installable-manifest': 'warn',
        'maskable-icon': 'warn',
        'service-worker': 'warn',

        // Accessibility essentials
        'color-contrast': 'error',
        'tap-targets': 'warn',
        'meta-viewport': 'error',

        // Mobile-specific
        'viewport': 'error',
        'font-size': 'warn',
        'content-width': 'warn',
      },
    },
    upload: {
      // Store results locally (can be changed to LHCI server or GitHub if needed)
      target: 'temporary-public-storage',
    },
  },
};
