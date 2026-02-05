import Link from 'next/link';
import { Award } from 'lucide-react';

const productLinks = [
  { label: 'Features', href: '/features/tasks' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
];

const resourceLinks = [
  { label: 'Articles', href: '/articles' },
  { label: 'Help', href: 'mailto:support@rowanapp.com' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

function FooterLinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">
        {heading}
      </h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith('mailto:') ? (
              <a
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-transparent to-gray-900/50 border-t border-gray-800/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main grid: brand full-width on mobile, then 2x2 for link columns */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* Brand column - full width on mobile */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block">
              <span className="text-xl font-bold text-white tracking-tight">
                Rowan
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              Your household, finally in sync.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-800/60 border border-gray-700/40 px-3 py-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-gray-300">
                Veteran Owned &amp; Operated
              </span>
            </div>
          </div>

          {/* Link columns - 2x2 grid on mobile, 3 cols on desktop */}
          <FooterLinkColumn heading="Product" links={productLinks} />
          <FooterLinkColumn heading="Resources" links={resourceLinks} />
          <FooterLinkColumn heading="Legal" links={legalLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-gray-800/50 pt-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Rowan. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
