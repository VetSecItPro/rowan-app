// Custom error page to prevent Sentry from auto-generating one with Html imports
// This fixes Next.js 15 compatibility issues with static 404/500 page generation
function Error({ statusCode }: { statusCode: number }) {
  return null; // Return null as app router handles errors via app/error.tsx and app/not-found.tsx
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
