import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-transparent to-gray-100/50 dark:to-gray-900/50 border-t border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-8 gap-4">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <span>Rowan © 2025</span>
            <span className="text-gray-400 dark:text-gray-600">•</span>
            <span className="text-sm">Veteran Owned Business</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/security" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
