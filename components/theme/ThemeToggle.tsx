'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, memo } from 'react';

const ThemeToggle = memo(function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const isDark = theme === 'dark';

  const handleToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className="w-10 h-10 flex items-center justify-center transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors" />
      )}
    </button>
  );
});

export { ThemeToggle };
