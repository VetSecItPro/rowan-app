'use client';

export function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-black border-t border-gray-300 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Copyright */}
          <div className="text-gray-600 dark:text-gray-400">
            Rowan © 2025
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a href="#privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#security" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Security</a>
            <a href="https://github.com" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
