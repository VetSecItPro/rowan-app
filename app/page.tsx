'use client';

import { CheckSquare, Calendar, Bell, MessageCircle, ShoppingCart, UtensilsCrossed, Home, Target } from 'lucide-react';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Image
                src="/rowan-logo.png"
                alt="Rowan Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-gray-900 dark:text-white text-2xl font-semibold">Rowan</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">About</a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            </nav>

            {/* Theme Toggle & Auth Buttons */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a href="#login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Login</a>
              <a
                href="#get-started"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-6">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={160}
              height={160}
              className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl"
            />
            <h1 className="text-8xl md:text-9xl font-bold text-gray-900 dark:text-white">Rowan</h1>
          </div>

          <h2 className="text-2xl md:text-3xl font-medium">
            <span className="text-gray-900 dark:text-white">Your Life, </span>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">Organized</span>
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-xl mb-12 max-w-2xl mx-auto">
          Collaborative life management for couples and families
        </p>

        <div className="flex items-center justify-center gap-4">
          <a
            href="#create-account"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/50"
          >
            Create Your Account
          </a>
          <a
            href="#sign-in"
            className="px-8 py-4 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-gradient-to-t from-purple-200 via-purple-100/50 to-white dark:from-purple-900 dark:via-purple-900/50 dark:to-black pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-16">What You Can Do</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1: Tasks & Projects */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <CheckSquare className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Tasks & Projects</h3>
            <p className="text-gray-600 dark:text-gray-400">Organize your tasks and manage projects with ease</p>
          </div>

          {/* Feature 2: Shared Calendar */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Shared Calendar</h3>
            <p className="text-gray-600 dark:text-gray-400">Keep everyone in sync with a shared calendar</p>
          </div>

          {/* Feature 3: Smart Reminders */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Smart Reminders</h3>
            <p className="text-gray-600 dark:text-gray-400">Never miss important moments with smart reminders</p>
          </div>

          {/* Feature 4: Built-in Messaging */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Built-in Messaging</h3>
            <p className="text-gray-600 dark:text-gray-400">Communicate seamlessly with your family</p>
          </div>

          {/* Feature 5: Shopping Lists */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Shopping Lists</h3>
            <p className="text-gray-600 dark:text-gray-400">Collaborative shopping lists that sync in real-time</p>
          </div>

          {/* Feature 6: Meal Planning */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Meal Planning</h3>
            <p className="text-gray-600 dark:text-gray-400">Plan your meals for the week ahead</p>
          </div>

          {/* Feature 7: Household */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4">
              <Home className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Household</h3>
            <p className="text-gray-600 dark:text-gray-400">Manage household tasks and responsibilities</p>
          </div>

          {/* Feature 8: Goals & Milestones */}
          <div className="bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-white animate-bounce-subtle" />
            </div>
            <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Goals & Milestones</h3>
            <p className="text-gray-600 dark:text-gray-400">Track your goals and celebrate achievements</p>
          </div>
        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-black border-t border-gray-300 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Copyright */}
            <div className="text-gray-600 dark:text-gray-400">
              Rowan © 2025
            </div>

            {/* Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
              <a href="#security" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Security</a>
              <a href="https://github.com" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">GitHub</a>
            </div>

            {/* Secured Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Secured</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
