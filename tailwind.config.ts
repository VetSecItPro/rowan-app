import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
