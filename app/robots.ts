import type { MetadataRoute } from 'next'

// SEO: robots.txt directives — FIX-018
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/articles/', '/features/', '/pricing', '/privacy-policy', '/terms', '/security'],
        disallow: ['/dashboard', '/tasks', '/calendar', '/reminders', '/messages', '/shopping', '/meals', '/household', '/goals', '/settings', '/admin', '/api/', '/checkin', '/expenses', '/budget', '/location', '/rewards', '/achievements', '/year-in-review', '/reports'],
      },
    ],
    sitemap: 'https://rowanapp.com/sitemap.xml',
  }
}
