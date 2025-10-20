import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Ensure feature gradient classes are always included in production
    'bg-gradient-tasks',
    'bg-gradient-calendar',
    'bg-gradient-reminders',
    'bg-gradient-messages',
    'bg-gradient-shopping',
    'bg-gradient-meals',
    'bg-gradient-projects',
    'bg-gradient-goals',
    // Gradient text utilities
    'bg-clip-text',
    'text-transparent',
    // Button touch utilities
    'btn-touch',
    // Stats grid
    'stats-grid-mobile',
    // Custom scrollbar
    'custom-scrollbar',
    // Dynamic width/height classes used in Tasks page
    'min-w-[110px]',
    'w-12', 'h-12', 'w-5', 'h-5', 'w-6', 'h-6', 'w-3', 'h-3', 'w-4', 'h-4',
    'w-10', 'h-10', 'w-16', 'h-16', 'w-20', 'h-20', 'w-24', 'h-24', 'w-32', 'h-32', 'w-48', 'h-48',
    // Background colors with opacity
    'bg-blue-900/30', 'bg-blue-900/20', 'bg-purple-900/20', 'bg-orange-900/20', 'bg-green-900/20',
    'bg-red-900/20', 'bg-gray-900/20', 'bg-amber-900/20', 'bg-indigo-900/20',
    // Hover states for backgrounds
    'hover:bg-gray-200', 'hover:bg-gray-700', 'hover:bg-blue-700', 'hover:bg-purple-50',
    'hover:bg-gray-600', 'hover:bg-gray-100', 'hover:shadow-lg',
    // Dark mode backgrounds
    'dark:bg-gray-800', 'dark:bg-gray-700', 'dark:bg-gray-600', 'dark:bg-blue-900',
    'dark:bg-purple-900', 'dark:bg-orange-900', 'dark:bg-green-900', 'dark:bg-red-900',
    // Border colors
    'border-gray-200', 'border-gray-700', 'border-blue-200', 'border-blue-700',
    'border-purple-200', 'border-purple-700', 'dark:border-gray-700', 'dark:border-blue-800',
    // Text colors
    'text-gray-700', 'text-gray-300', 'text-gray-600', 'text-gray-400', 'text-gray-900',
    'text-blue-700', 'text-blue-300', 'text-purple-600', 'text-purple-400',
    'dark:text-gray-300', 'dark:text-gray-400', 'dark:text-white', 'dark:text-blue-300',
    // Common utilities
    'animate-pulse', 'transition-colors', 'transition-shadow', 'transition-all',
    'rounded-xl', 'rounded-lg', 'rounded-md', 'rounded-full',
    'max-h-[600px]', 'max-h-[90vh]', 'max-w-4xl', 'max-w-xs',
    // Focus states
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-transparent',
    'focus:border-blue-500', 'dark:focus:border-blue-500',
  ],
  theme: {
    extend: {
      colors: {
        // Custom off-white for light mode backgrounds
        'off-white': '#fafafa', // gray-50 equivalent for softer light mode
      },
      // Feature color gradients
      backgroundImage: {
        'gradient-tasks': 'linear-gradient(to right, rgb(59 130 246), rgb(37 99 235))', // blue-500 to blue-600
        'gradient-calendar': 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))', // purple-500 to purple-600
        'gradient-reminders': 'linear-gradient(to right, rgb(236 72 153), rgb(219 39 119))', // pink-500 to pink-600
        'gradient-messages': 'linear-gradient(to right, rgb(34 197 94), rgb(22 163 74))', // green-500 to green-600
        'gradient-shopping': 'linear-gradient(to right, rgb(16 185 129), rgb(5 150 105))', // emerald-500 to emerald-600
        'gradient-meals': 'linear-gradient(to right, rgb(249 115 22), rgb(234 88 12))', // orange-500 to orange-600
        'gradient-projects': 'linear-gradient(to right, rgb(245 158 11), rgb(217 119 6))', // amber-500 to amber-600
        'gradient-goals': 'linear-gradient(to right, rgb(99 102 241), rgb(79 70 229))', // indigo-500 to indigo-600
      },
      // Custom animations
      animation: {
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'fadeIn': 'fadeIn 0.5s ease-in-out forwards',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fadeIn': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
