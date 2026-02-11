import path from 'path';
import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';

Config.overrideWebpackConfig((currentConfiguration) => {
  const withTailwind = enableTailwind(currentConfiguration);

  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        '@': path.resolve(process.cwd()),
        // Stub Next.js-specific modules that don't exist outside Next.js webpack
        '@sentry/nextjs': path.resolve(process.cwd(), 'remotion/stubs/sentry.ts'),
        'next/router': path.resolve(process.cwd(), 'remotion/stubs/next-router.ts'),
        'next/constants': path.resolve(process.cwd(), 'remotion/stubs/next-constants.ts'),
      },
    },
  };
});

Config.setPort(3100);
