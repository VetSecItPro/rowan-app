'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckSquare, Calendar, Bell, MessageCircle, ShoppingCart, UtensilsCrossed, Home, Target, ArrowRight, Sun, Check } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight-card';

const features = [
    {
        title: "Tasks & Chores",
        description: "Organize daily tasks and household chores together with smart assignments and completion tracking",
        icon: CheckSquare,
        gradient: "from-blue-500 via-cyan-500 to-blue-600",
        href: "/features/tasks",
        size: "large"
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
        size: "large"
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
        href: "/features/daily-check-in",
        size: "large"
    },
];

// ── Mock UI Previews ──────────────────────────────────────────────

function TasksPreview() {
    const tasks = [
        { text: "Pack school lunches", assignee: "Mom", done: true, color: "bg-pink-400" },
        { text: "Take out recycling", assignee: "Jake", done: false, color: "bg-blue-400" },
        { text: "Vacuum living room", assignee: "Dad", done: false, color: "bg-emerald-400" },
        { text: "Walk the dog", assignee: "Emma", done: true, color: "bg-purple-400" },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-2">
            {tasks.map((t) => (
                <div key={t.text} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${t.done ? 'bg-blue-500' : 'border border-gray-600'}`}>
                        {t.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-xs flex-1 ${t.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{t.text}</span>
                    <span className={`w-5 h-5 rounded-full ${t.color} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                        {t.assignee[0]}
                    </span>
                </div>
            ))}
        </div>
    );
}

function CalendarPreview() {
    const days = [
        { day: "Mon", events: [{ text: "Soccer", color: "bg-blue-500" }] },
        { day: "Tue", events: [{ text: "PTA", color: "bg-purple-500" }] },
        { day: "Wed", events: [{ text: "Dentist", color: "bg-pink-500" }] },
        { day: "Thu", events: [{ text: "Date night", color: "bg-emerald-500" }] },
        { day: "Fri", events: [{ text: "Movie", color: "bg-amber-500" }] },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3">
            <div className="flex gap-1.5">
                {days.map((d) => (
                    <div key={d.day} className="flex-1 text-center">
                        <div className="text-[10px] text-gray-500 mb-1.5">{d.day}</div>
                        {d.events.map((e) => (
                            <div key={e.text} className={`${e.color} rounded px-1 py-0.5 text-[9px] text-white font-medium truncate`}>
                                {e.text}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function RemindersPreview() {
    const reminders = [
        { text: "Pick up prescription", time: "2:30 PM", urgent: true },
        { text: "Call plumber", time: "Tomorrow 9 AM", urgent: false },
        { text: "Renew car insurance", time: "Feb 15", urgent: false },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-2">
            {reminders.map((r) => (
                <div key={r.text} className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.urgent ? 'bg-pink-400' : 'bg-gray-600'}`} />
                    <span className="text-xs text-gray-300 flex-1">{r.text}</span>
                    <span className="text-[10px] text-gray-500">{r.time}</span>
                </div>
            ))}
        </div>
    );
}

function MessagesPreview() {
    const messages = [
        { sender: "Sarah", text: "Can someone grab milk on the way home?", color: "bg-pink-400", align: "left" as const },
        { sender: "Mike", text: "On it!", color: "bg-emerald-400", align: "right" as const },
        { sender: "Emma", text: "Get OJ too please!", color: "bg-purple-400", align: "left" as const },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-2">
            {messages.map((m) => (
                <div key={m.text} className={`flex ${m.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] flex items-start gap-1.5 ${m.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-4 h-4 rounded-full ${m.color} flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white mt-0.5`}>
                            {m.sender[0]}
                        </div>
                        <div className={`rounded-lg px-2 py-1 text-[11px] ${m.align === 'right' ? 'bg-green-600/20 text-green-200' : 'bg-gray-700/60 text-gray-300'}`}>
                            {m.text}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ShoppingPreview() {
    const lists = [
        {
            name: "Grocery",
            items: [
                { text: "Milk (2%)", done: true },
                { text: "Chicken breast", done: true },
                { text: "Avocados (3)", done: false },
                { text: "Greek yogurt", done: false },
            ]
        },
        {
            name: "Target Run",
            items: [
                { text: "Dish soap", done: false },
                { text: "Paper towels", done: false },
                { text: "Birthday card", done: false },
            ]
        }
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3">
            <div className="grid grid-cols-2 gap-3">
                {lists.map((list) => (
                    <div key={list.name}>
                        <div className="text-[10px] font-semibold text-emerald-400 mb-1.5">{list.name}</div>
                        <div className="space-y-1">
                            {list.items.map((item) => (
                                <div key={item.text} className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-emerald-500/30' : 'border border-gray-600'}`}>
                                        {item.done && <Check className="w-2 h-2 text-emerald-400" />}
                                    </div>
                                    <span className={`text-[11px] ${item.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MealsPreview() {
    const meals = [
        { day: "Mon", meal: "Chicken stir-fry", emoji: "🍗" },
        { day: "Tue", meal: "Pasta carbonara", emoji: "🍝" },
        { day: "Wed", meal: "Fish tacos", emoji: "🌮" },
        { day: "Thu", meal: "Leftovers", emoji: "📦" },
        { day: "Fri", meal: "Pizza night", emoji: "🍕" },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-1.5">
            {meals.map((m) => (
                <div key={m.day} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-7 flex-shrink-0">{m.day}</span>
                    <span className="text-xs">{m.emoji}</span>
                    <span className="text-[11px] text-gray-300">{m.meal}</span>
                </div>
            ))}
        </div>
    );
}

function BudgetPreview() {
    const categories = [
        { name: "Groceries", spent: 420, budget: 600, color: "bg-amber-500" },
        { name: "Dining", spent: 180, budget: 250, color: "bg-orange-500" },
        { name: "Gas", spent: 95, budget: 150, color: "bg-yellow-500" },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-2.5">
            {categories.map((c) => (
                <div key={c.name}>
                    <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-gray-300">{c.name}</span>
                        <span className="text-[10px] text-gray-500">${c.spent} / ${c.budget}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${c.color} rounded-full`} style={{ width: `${(c.spent / c.budget) * 100}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function GoalsPreview() {
    const goals = [
        { name: "Family vacation fund", current: 2400, target: 5000, color: "bg-indigo-500" },
        { name: "Read 24 books", current: 7, target: 24, color: "bg-blue-500", unit: "books" },
        { name: "Run a 5K together", current: 6, target: 8, color: "bg-cyan-500", unit: "weeks" },
    ];
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-2.5">
            {goals.map((g) => (
                <div key={g.name}>
                    <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-gray-300">{g.name}</span>
                        <span className="text-[10px] text-gray-500">
                            {'unit' in g ? `${g.current}/${g.target}` : `$${g.current.toLocaleString()}`}
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full ${g.color} rounded-full`} style={{ width: `${(g.current / g.target) * 100}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function CheckInPreview() {
    return (
        <div className="mt-5 rounded-xl bg-gray-800/60 border border-gray-700/50 p-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <div className="text-[10px] text-gray-500 mb-1">Mood</div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-base">😊</span>
                        <span className="text-xs text-gray-300">Feeling good</span>
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 mb-1">Energy</div>
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`w-4 h-1.5 rounded-full ${i <= 3 ? 'bg-orange-400' : 'bg-gray-700'}`} />
                        ))}
                    </div>
                </div>
                <div className="col-span-2">
                    <div className="text-[10px] text-gray-500 mb-1">Today&apos;s priority</div>
                    <div className="text-[11px] text-gray-300">Finish tax documents &amp; Emma&apos;s recital at 6 PM</div>
                </div>
            </div>
        </div>
    );
}

const previewMap: Record<string, ReactNode> = {
    "Tasks & Chores": <TasksPreview />,
    "Shared Calendar": <CalendarPreview />,
    "Smart Reminders": <RemindersPreview />,
    "Built-in Messaging": <MessagesPreview />,
    "Shopping Lists": <ShoppingPreview />,
    "Meal Planning": <MealsPreview />,
    "Budget & Expenses": <BudgetPreview />,
    "Goals & Milestones": <GoalsPreview />,
    "Daily Check-In": <CheckInPreview />,
};

// ── Feature Card ──────────────────────────────────────────────────

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
                <SpotlightCard className="h-full transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
                    <div className="p-6 h-full relative z-10">
                        {/* Animated gradient background on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        {/* Icon + Title row */}
                        <div className="relative flex items-center gap-4 mb-4">
                            {/* Glassmorphic icon container */}
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                                    <Icon className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-bold tracking-tight text-white group-hover:translate-x-1 transition-transform duration-300">
                                {feature.title}
                            </h3>
                        </div>

                        {/* Description below */}
                        <p className="relative text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300 font-serif italic">
                            {feature.description}
                        </p>

                        {/* Mock UI Preview */}
                        <div className="relative">
                            {previewMap[feature.title]}
                        </div>

                        {/* Arrow icon that appears on hover */}
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            <ArrowRight className="w-5 h-5 text-gray-500" />
                        </div>
                    </div>
                </SpotlightCard>
            </Link>
        </motion.div>
    );
}

export function FeatureGrid() {
    return (
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
                        className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white mb-4"
                    >
                        Everything You Need
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="text-xl text-gray-300 max-w-2xl mx-auto font-light"
                    >
                        Powerful features designed to simplify your family&apos;s daily life
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
    );
}
