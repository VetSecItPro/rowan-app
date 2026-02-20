import Link from 'next/link';
import Image from 'next/image';
import { Github, Linkedin } from 'lucide-react';

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Mobile App', href: '/#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Articles', href: '/articles' },
      { label: 'Help Center', href: '/articles' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Security', href: '/security' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

/** Renders the authenticated app footer with links and legal information. */
export function Footer() {
  return (
    <footer className="border-t border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Top — Brand + Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand column (spans full row on mobile, first col on lg) */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image
                src="/rowan-logo.png"
                alt="Rowan Logo"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Rowan
              </span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
              One app for your entire household. Tasks, calendar, meals, budget, and more.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.linkedin.com/in/vetsecitpro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-400 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/VetSecItPro/rowan-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                {col.title}
              </h4>
              <ul className="space-y-0.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="block py-1.5 text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-gray-800/50">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Rowan. All rights reserved.
          </p>
          <span className="text-xs text-gray-600">
            Veteran-Owned Business
          </span>
        </div>
      </div>
    </footer>
  );
}
