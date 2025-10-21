import type { Config } from "tailwindcss";

const config: Config & { safelist?: any[] } = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    // Scan for dynamic class generation
    "./app/globals.css",
  ],
  safelist: [
    // Essential custom classes that might not be detected
    'bg-gradient-tasks', 'bg-gradient-calendar', 'bg-gradient-reminders',
    'bg-gradient-messages', 'bg-gradient-shopping', 'bg-gradient-meals',
    'bg-gradient-projects', 'bg-gradient-goals', 'bg-clip-text', 'text-transparent',
    'btn-touch', 'stats-grid-mobile', 'custom-scrollbar',
    // Comprehensive pattern-based safelist for ALL styling
    {
      pattern: /^(bg|text|border|ring|shadow|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)(\/\d+)?$/,
      variants: ['hover', 'focus', 'active', 'disabled', 'dark', 'dark:hover', 'dark:focus', 'dark:active', 'group-hover', 'peer-focus']
    },
    {
      pattern: /^(w|h|min-w|min-h|max-w|max-h)-(\d+|auto|full|screen|min|max|fit|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|\[\d+px\]|\[\d+rem\]|\[\d+%\]|\[\d+vh\]|\[\d+vw\])$/,
    },
    {
      pattern: /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y)-(\d+|auto|\[\d+px\]|\[\d+rem\])$/,
    },
    {
      pattern: /^(rounded|transition|animate|transform|scale|rotate|translate|duration|ease|delay)-[\w-]+$/,
    },
    {
      pattern: /^(grid|flex|inline|block|hidden|absolute|relative|fixed|sticky|top|bottom|left|right|inset)-[\w-]*$/,
    },
    {
      pattern: /^(text|font|leading|tracking|align|whitespace|break|overflow|truncate)-[\w-]*$/,
    },
    {
      pattern: /^(opacity|backdrop|filter|blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|drop-shadow)-[\w-]*$/,
    }
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
