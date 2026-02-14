// Stub for next/router in Remotion context
export const useRouter = () => ({
  push: () => Promise.resolve(true),
  replace: () => Promise.resolve(true),
  back: () => {},
  prefetch: () => Promise.resolve(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  events: { on: () => {}, off: () => {}, emit: () => {} },
});

const nextRouterStub = { useRouter };
export default nextRouterStub;
