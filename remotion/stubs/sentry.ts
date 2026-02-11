// Stub for @sentry/nextjs in Remotion context
// Sentry's Next.js integration imports next/router and next/constants
// which don't exist outside Next.js webpack.

const noop = () => {};
const noopObj = new Proxy({}, { get: () => noop });

export const addBreadcrumb = noop;
export const captureException = noop;
export const captureMessage = noop;
export const setContext = noop;
export const setMeasurement = noop;
export const setTag = noop;
export const setUser = noop;
export const startSpan = noop;
export const withScope = noop;
export const init = noop;
export const Integrations = noopObj;
export default noopObj;
