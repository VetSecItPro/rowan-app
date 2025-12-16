'use client';

import { useState, useRef } from 'react';
import { CheckSquare, Calendar, Bell, MessageCircle, ShoppingCart, UtensilsCrossed, Home, Target, ArrowRight, Sparkles, Users, Zap, Shield, Sun, Download, Smartphone, Monitor, Share, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const features = [
  {
    title: "Tasks & Chores",
    description: "Organize daily tasks and household chores together with smart assignments and completion tracking",
    icon: CheckSquare,
    gradient: "from-blue-500 via-cyan-500 to-blue-600",
    href: "/features/tasks",
    size: "large" // Takes 2 columns
  },
  {
    title: "Shared Calendar",
    description: "Keep everyone in sync with a shared calendar that works for the whole family",
    icon: Calendar,
    gradient: "from-indigo-500 via-blue-500 to-indigo-600",
    href: "/features/calendar",
    size: "normal"
  },
  {
    title: "Smart Reminders",
    description: "Never miss important moments with intelligent reminders that know your schedule",
    icon: Bell,
    gradient: "from-pink-500 via-rose-500 to-pink-600",
    href: "/features/reminders",
    size: "normal"
  },
  {
    title: "Built-in Messaging",
    description: "Communicate seamlessly with your family in dedicated conversation threads",
    icon: MessageCircle,
    gradient: "from-green-500 via-emerald-500 to-green-600",
    href: "/features/messages",
    size: "normal"
  },
  {
    title: "Shopping Lists",
    description: "Collaborative shopping that syncs in real-time so everyone stays on the same page",
    icon: ShoppingCart,
    gradient: "from-emerald-500 via-teal-500 to-emerald-600",
    href: "/features/shopping",
    size: "large" // Takes 2 columns
  },
  {
    title: "Meal Planning",
    description: "Plan your meals for the week with recipe management and ingredient tracking",
    icon: UtensilsCrossed,
    gradient: "from-orange-500 via-amber-500 to-orange-600",
    href: "/features/meals",
    size: "normal"
  },
  {
    title: "Budget & Expenses",
    description: "Track your budget and manage household expenses with detailed insights",
    icon: Home,
    gradient: "from-amber-500 via-yellow-500 to-amber-600",
    href: "/features/budget",
    size: "normal"
  },
  {
    title: "Goals & Milestones",
    description: "Track your goals and celebrate achievements together as a family",
    icon: Target,
    gradient: "from-blue-600 via-indigo-500 to-blue-700",
    href: "/features/goals",
    size: "normal"
  },
  {
    title: "Daily Check-In",
    description: "Start each day with intention — reflect on your mood, set priorities, and stay connected with your family's rhythm",
    icon: Sun,
    gradient: "from-yellow-400 via-orange-400 to-rose-400",
    href: "/dashboard",
    size: "large"
  },
];

const benefits = [
  {
    icon: Users,
    title: "Built for Families",
    description: "Designed specifically for couples and families to collaborate effortlessly",
    gradient: "from-blue-500 to-indigo-500"
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description: "Everything syncs instantly across all devices for seamless coordination",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Enterprise-grade security protects your family's data",
    gradient: "from-purple-500 to-violet-500"
  },
  {
    icon: Sparkles,
    title: "Beautifully Simple",
    description: "Intuitive design that makes managing life feel effortless",
    gradient: "from-orange-500 to-amber-500"
  }
];

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 100, scale: 0.8 }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className={`group relative ${feature.size === 'large' ? 'md:col-span-2' : 'md:col-span-1'}`}
    >
      <Link
        href={feature.href}
        prefetch={true}
      >
        <div className="relative h-full rounded-3xl bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl overflow-hidden">
          {/* Animated gradient background on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

          {/* Icon + Title row */}
          <div className="relative flex items-center gap-4 mb-4">
            {/* Glassmorphic icon container */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
              <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
                <Icon className="w-7 h-7 text-gray-900 dark:text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-display font-bold tracking-tight text-gray-900 dark:text-white group-hover:translate-x-1 transition-transform duration-300">
              {feature.title}
            </h3>
          </div>

          {/* Description below */}
          <p className="relative text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 font-serif italic">
            {feature.description}
          </p>

          {/* Arrow icon that appears on hover */}
          <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const heroRef = useRef(null);
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, canPrompt, promptInstall } = usePWAInstall();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);

  const handleBetaSuccess = () => {
    router.push('/signup?beta=true');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/40 to-cyan-50/40 dark:from-gray-900 dark:via-blue-950/20 dark:to-cyan-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                <Image
                  src="/rowan-logo.png"
                  alt="Rowan Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                  priority
                />
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Rowan
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/pricing" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <a href="#features" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <ThemeToggle />
              <Link
                href="/login"
                prefetch={true}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Split Layout (60/40) */}
      <section ref={heroRef} className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div
            style={{ opacity, scale }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center"
          >
            {/* Left Section - 60% (3/5 columns) */}
            <div className="lg:col-span-3 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 border border-blue-500/20 dark:border-blue-500/30"
              >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Your Life Management Hub
                </span>
              </motion.div>

              {/* Logo and Brand Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex items-center gap-6"
              >
                <Image
                  src="/rowan-logo.png"
                  alt="Rowan Logo"
                  width={96}
                  height={96}
                  className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl"
                  priority
                />
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Rowan
                </h1>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-tight"
              >
                <span className="text-gray-900 dark:text-white">Your Life, </span>
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent animate-gradient">
                  Organized
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-serif italic"
              >
                Rowan brings tasks, schedules, lists, meals, budgets, and goals into one elegant workspace, so your family stays aligned without constant reminders.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 w-full sm:w-auto"
              >
                <button
                  onClick={() => setIsBetaModalOpen(true)}
                  className="group px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm sm:text-base transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  Access Beta Test
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setIsLaunchModalOpen(true)}
                  className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold text-sm sm:text-base transition-all border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-105 active:scale-95 text-center"
                >
                  Get Notified on Launch
                </button>
              </motion.div>
            </div>

            {/* Right Section - 40% (2/5 columns) - Benefits Grid */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-2 gap-4">
                {benefits.map((benefit, index) => {
                  // Map gradients to specific icon colors
                  const iconColorMap: Record<string, string> = {
                    'from-blue-500 to-indigo-500': 'text-blue-600 dark:text-blue-400',
                    'from-green-500 to-emerald-500': 'text-green-600 dark:text-green-400',
                    'from-purple-500 to-violet-500': 'text-purple-600 dark:text-purple-400',
                    'from-orange-500 to-amber-500': 'text-orange-600 dark:text-orange-400'
                  };

                  return (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      className="relative group p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 hover:scale-105 transition-all duration-300 hover:shadow-xl"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.gradient} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <div className="w-full h-full rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center">
                          <benefit.icon className={`w-6 h-6 ${iconColorMap[benefit.gradient]}`} />
                        </div>
                      </div>
                      <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                        {benefit.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                        {benefit.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Veteran-Owned Business Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.1 }}
                className="flex items-center justify-center gap-2 mt-6"
              >
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Veteran-Owned Business
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pain Points Section - Subtle & Relatable */}
      <section className="relative py-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className="text-lg text-gray-500 dark:text-gray-400 mb-8"
          >
            Sound familiar?
          </motion.p>

          <div className="space-y-4">
            {[
              "Who was supposed to pick up the kids?",
              "Did we already buy milk?",
              "When is that appointment again?"
            ].map((quote, index) => (
              <motion.p
                key={quote}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 font-serif italic"
              >
                "{quote}"
              </motion.p>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10"
          >
            <span className="text-2xl sm:text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Rowan fixes this.
            </span>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Enhanced Bento Grid */}
      <section id="features" className="relative pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-center mb-16"
          >
            <motion.h2
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white mb-4"
            >
              Everything You Need
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light"
            >
              Powerful features designed to simplify your family's daily life
            </motion.p>
          </motion.div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section - One App vs Many */}
      <section className="relative py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
              One App. Not Five.
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 font-light">
              Stop juggling separate apps for every part of family life
            </p>
          </motion.div>

          {/* Mobile scroll hint */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Swipe to see all columns</span>
            <ArrowRight className="w-3 h-3 animate-pulse" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
          >
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-display font-semibold text-gray-900 dark:text-white">Feature</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Task Apps</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Calendars</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">List Apps</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Meal Apps</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-500 dark:text-gray-400">Budget Apps</th>
                  <th className="text-center py-4 px-3 font-display font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Rowan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  { feature: 'Tasks & To-dos', cols: [true, false, false, false, false, true] },
                  { feature: 'Family Calendar', cols: [false, true, false, false, false, true] },
                  { feature: 'Shopping Lists', cols: [false, false, true, false, false, true] },
                  { feature: 'Meal Planning', cols: [false, false, false, true, false, true] },
                  { feature: 'Budget Tracking', cols: [false, false, false, false, true, true] },
                  { feature: 'Family Sharing', cols: ['some', 'some', 'some', 'rare', 'rare', true] },
                  { feature: 'One Login', cols: [false, false, false, false, false, true] },
                  { feature: 'Everything Synced', cols: [false, false, false, false, false, true] },
                ].map((row, idx) => (
                  <tr key={row.feature} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{row.feature}</td>
                    {row.cols.map((val, colIdx) => (
                      <td key={colIdx} className={`text-center py-3 px-3 ${colIdx === 5 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        {val === true ? (
                          <span className={`inline-block w-5 h-5 rounded-full ${colIdx === 5 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-green-500'} text-white text-xs flex items-center justify-center mx-auto`}>✓</span>
                        ) : val === 'some' ? (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">Some</span>
                        ) : val === 'rare' ? (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">Rare</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-8 text-gray-500 dark:text-gray-400 font-serif italic"
          >
            Why manage five apps when one does it all?
          </motion.p>
        </div>
      </section>

      {/* Install App Section */}
      {!isInstalled && (
        <section className="relative py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-teal-600/10 dark:from-blue-500/20 dark:via-cyan-500/20 dark:to-teal-500/20 backdrop-blur-xl border border-blue-500/20 dark:border-blue-400/30 p-4 sm:p-5"
            >
              {/* Header */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">
                    Install Rowan
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Add to your home screen for the best experience
                </p>
              </div>

              {/* Install Button (when browser supports it) */}
              {canPrompt ? (
                <div className="flex justify-center">
                  <button
                    onClick={promptInstall}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install App
                  </button>
                </div>
              ) : (
                /* Platform-specific install cards */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* iOS Card */}
                  <div className={`relative p-3 rounded-xl transition-all ${isIOS ? 'bg-blue-500/10 dark:bg-blue-500/20 ring-2 ring-blue-500/50' : 'bg-white/50 dark:bg-gray-800/50'}`}>
                    {isIOS && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                        Your Device
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">iOS</span>
                    </div>
                    <ol className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">1.</span> Tap <Share className="inline w-3 h-3 text-blue-500" /> Share
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">2.</span> <Plus className="inline w-3 h-3 text-blue-500" /> Add to Home Screen
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">3.</span> Tap Add
                      </li>
                    </ol>
                  </div>

                  {/* Android Card */}
                  <div className={`relative p-3 rounded-xl transition-all ${isAndroid ? 'bg-blue-500/10 dark:bg-blue-500/20 ring-2 ring-blue-500/50' : 'bg-white/50 dark:bg-gray-800/50'}`}>
                    {isAndroid && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                        Your Device
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">Android</span>
                    </div>
                    <ol className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">1.</span> Open in Chrome
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">2.</span> Tap menu (⋮)
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">3.</span> Add to Home screen
                      </li>
                    </ol>
                  </div>

                  {/* Desktop Card */}
                  <div className={`relative p-3 rounded-xl transition-all ${!isIOS && !isAndroid ? 'bg-blue-500/10 dark:bg-blue-500/20 ring-2 ring-blue-500/50' : 'bg-white/50 dark:bg-gray-800/50'}`}>
                    {!isIOS && !isAndroid && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                        Your Device
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">Desktop</span>
                    </div>
                    <ol className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">1.</span> Use Chrome or Edge
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">2.</span> Click <Download className="inline w-3 h-3 text-blue-500" /> in URL bar
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="text-blue-500 font-bold">3.</span> Click Install
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-3 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-500" /> Lightning fast</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-500" /> Works offline</span>
                <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-blue-500" /> Push notifications</span>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
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

      {/* Modals */}
      <BetaAccessModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
        onSuccess={handleBetaSuccess}
        onSwitchToLaunch={() => {
          setIsBetaModalOpen(false);
          setIsLaunchModalOpen(true);
        }}
      />
      <LaunchNotificationModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
      />
    </div>
  );
}
