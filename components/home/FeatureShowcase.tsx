/**
 * FeatureShowcase — Grouped feature categories with Remotion Players
 *
 * 3 categories: Organize / Coordinate / Grow
 * Each group has a heading, description, brand-colored feature pills,
 * 5 benefit bullets, and a Remotion Player.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Player } from '@remotion/player';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  DollarSign,
  Target,
  Heart,
  Check,
} from 'lucide-react';
import { OrganizeShowcase } from '@/remotion/compositions/OrganizeShowcase';
import { CoordinateShowcase } from '@/remotion/compositions/CoordinateShowcase';
import { GrowShowcase } from '@/remotion/compositions/GrowShowcase';

const featureGroups = [
  {
    id: 'organize',
    label: 'Organize',
    title: 'Keep everything on track',
    description:
      'Tasks, calendars, and reminders that keep your household running smoothly so nothing falls through the cracks.',
    gradient: 'from-cyan-400 to-blue-500',
    dotColor: 'bg-cyan-400',
    checkColor: 'text-cyan-400',
    checkBg: 'bg-cyan-400/15',
    Composition: OrganizeShowcase,
    durationInFrames: 390,
    features: [
      { Icon: CheckSquare, name: 'Tasks & Chores', color: 'text-blue-400', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/25' },
      { Icon: Calendar, name: 'Family Calendar', color: 'text-purple-400', bg: 'bg-purple-500/10', borderColor: 'border-purple-500/25' },
      { Icon: Bell, name: 'Reminders', color: 'text-pink-400', bg: 'bg-pink-500/10', borderColor: 'border-pink-500/25' },
    ],
    benefits: [
      'Assign tasks and chores to any family member with due dates and priorities',
      'Shared family calendar syncs everyone\u2019s schedule automatically in real time',
      'Smart reminders notify the right person at exactly the right time',
      'Rotating chore assignments keep the workload fair for everyone',
      'Track completion with streaks and points to keep the family motivated',
    ],
  },
  {
    id: 'coordinate',
    label: 'Coordinate',
    title: 'Stay connected, stay aligned',
    description:
      'Messaging, shopping, and meal planning that keeps everyone on the same page. No more group text chaos.',
    gradient: 'from-green-400 to-emerald-500',
    dotColor: 'bg-green-400',
    checkColor: 'text-green-400',
    checkBg: 'bg-green-400/15',
    Composition: CoordinateShowcase,
    durationInFrames: 390,
    features: [
      { Icon: MessageCircle, name: 'Messages', color: 'text-green-400', bg: 'bg-green-500/10', borderColor: 'border-green-500/25' },
      { Icon: ShoppingCart, name: 'Shopping Lists', color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/25' },
      { Icon: UtensilsCrossed, name: 'Meal Planning', color: 'text-orange-400', bg: 'bg-orange-500/10', borderColor: 'border-orange-500/25' },
    ],
    benefits: [
      'Private family messaging keeps conversations organized and off social media',
      'Collaborative shopping lists update in real time as anyone adds or checks items',
      'Plan weekly meals with saved recipes and automatic ingredient tracking',
      'AI assistant suggests meals based on dietary preferences and what\u2019s on hand',
      'Pin important messages so critical family info never gets buried',
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    title: 'Build toward what matters',
    description:
      'Budgets, goals, and check-ins that help your family thrive together, beyond just getting things done.',
    gradient: 'from-amber-400 to-yellow-500',
    dotColor: 'bg-amber-400',
    checkColor: 'text-amber-400',
    checkBg: 'bg-amber-400/15',
    Composition: GrowShowcase,
    durationInFrames: 390,
    features: [
      { Icon: DollarSign, name: 'Budget Tracking', color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/25' },
      { Icon: Target, name: 'Family Goals', color: 'text-indigo-400', bg: 'bg-indigo-500/10', borderColor: 'border-indigo-500/25' },
      { Icon: Heart, name: 'Check-Ins', color: 'text-rose-400', bg: 'bg-rose-500/10', borderColor: 'border-rose-500/25' },
    ],
    benefits: [
      'Track household spending with clear category breakdowns and visual progress',
      'Set savings goals as a family and watch your collective progress grow',
      'Daily mood and energy check-ins help you understand how everyone is feeling',
      'Budget alerts notify you before any spending category goes over its limit',
      'Celebrate family milestones and wellness streaks to build positive habits',
    ],
  },
];

export function FeatureShowcase() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
            Everything your household needs,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              in one place
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto">
            Nine powerful features, three clear categories. No tab-switching, no app-juggling.
          </p>
        </motion.div>

        <div className="space-y-24">
          {featureGroups.map((group, groupIndex) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center ${
                groupIndex % 2 === 1 ? 'lg:direction-rtl' : ''
              }`}
            >
              {/* Text side */}
              <div className={groupIndex % 2 === 1 ? 'lg:order-2' : ''}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                  <span
                    className={`text-sm font-semibold bg-gradient-to-r ${group.gradient} bg-clip-text text-transparent uppercase tracking-wider`}
                  >
                    {group.label}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{group.title}</h3>

                <p className="text-gray-400 text-base leading-relaxed mb-5">{group.description}</p>

                {/* Brand-colored feature pills */}
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {group.features.map((feature) => (
                    <div
                      key={feature.name}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full ${feature.bg} border ${feature.borderColor}`}
                    >
                      <feature.Icon className={`w-4 h-4 ${feature.color}`} />
                      <span className={`text-sm font-medium ${feature.color}`}>{feature.name}</span>
                    </div>
                  ))}
                </div>

                {/* Benefit bullets */}
                <ul className="space-y-3">
                  {group.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full ${group.checkBg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                      >
                        <Check aria-hidden="true" className={`w-3 h-3 ${group.checkColor}`} strokeWidth={3} />
                      </div>
                      <span className="text-sm text-gray-400 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Video side */}
              <div className={`${groupIndex % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="rounded-2xl overflow-hidden border border-gray-800/40 bg-black shadow-2xl shadow-black/40">
                  <Player
                    component={group.Composition}
                    durationInFrames={group.durationInFrames}
                    fps={30}
                    compositionWidth={1280}
                    compositionHeight={720}
                    style={{ width: '100%' }}
                    loop
                    autoPlay
                    controls={false}
                    showVolumeControls={false}
                    clickToPlay={false}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
