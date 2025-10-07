/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore build errors for development
    ignoreBuildErrors: true,
  },
  // Use standalone output for Vercel deployment
  output: 'standalone',
};

export default nextConfig;
