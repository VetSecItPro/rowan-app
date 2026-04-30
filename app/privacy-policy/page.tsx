import { redirect } from 'next/navigation';

// Canonical privacy URL is /privacy. This route exists only as a permanent
// redirect to preserve old links/sitemaps that pointed at /privacy-policy.
export default function PrivacyPolicyRedirect() {
  redirect('/privacy');
}
