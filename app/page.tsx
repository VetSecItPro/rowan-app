'use client';

import { useState, useRef } from 'react';
import { CheckSquare, Calendar, Bell, MessageCircle, ShoppingCart, UtensilsCrossed, Home, Target, ArrowRight, Sparkles, Users, Zap, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';

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
        <div className="relative h-full min-h-[240px] rounded-3xl bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl overflow-hidden">
          {/* Animated gradient background on hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

          {/* Glassmorphic icon container */}
          <div className={`relative mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center">
              <Icon className="w-8 h-8 text-gray-900 dark:text-white" />
            </div>
          </div>

          <h3 className="relative text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:translate-x-1 transition-transform duration-300">
            {feature.title}
          </h3>
          <p className="relative text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
            {feature.description}
          </p>

          {/* Arrow icon that appears on hover */}
          <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <ArrowRight className="w-6 h-6 text-gray-400 dark:text-gray-500" />
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
              <a href="#features" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <ThemeToggle />
              <Link
                href="/login"
                prefetch={true}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
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
                  Your Life Management Platform
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
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Rowan
                </h1>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
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
                className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                Collaborative life management for couples and families. Everything you need, beautifully organized in one place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-start gap-4"
              >
                <button
                  onClick={() => setIsBetaModalOpen(true)}
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold transition-all shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 flex items-center gap-2"
                >
                  Access Beta Test
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setIsLaunchModalOpen(true)}
                  className="px-8 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold transition-all border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-105"
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
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                        {benefit.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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

      {/* Features Section - Enhanced Bento Grid */}
      <section id="features" className="relative pb-32 px-4 sm:px-6 lg:px-8">
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
              className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Everything You Need
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
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
