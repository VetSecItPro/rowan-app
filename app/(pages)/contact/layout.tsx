import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | Rowan',
  description: 'Get in touch with Rowan. Support for users, partnerships for businesses, media inquiries, and security reports.',
  openGraph: {
    title: 'Contact Rowan',
    description: 'Get in touch with Rowan for support, partnerships, media inquiries, or security reports.',
    url: 'https://rowanapp.com/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact Rowan',
    description: 'Get in touch with Rowan for support, partnerships, media inquiries, or security reports.',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
