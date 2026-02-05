'use client';

import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Check, Sparkles } from 'lucide-react';

interface Task {
    id: string;
    text: string;
    assignee: string;
    color: string;
    done: boolean;
}

interface ShoppingItem {
    text: string;
    done: boolean;
}

interface FamilyMember {
    initial: string;
    color: string;
    mood: string;
}

// Animation frames for the demo loop
type Frame = 'tasks' | 'task-complete' | 'calendar' | 'shopping' | 'budget' | 'family';

export default function HeroDemoAnimation() {
    const [currentFrame, setCurrentFrame] = useState<Frame>('tasks');
    const [isPaused, setIsPaused] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([
        { id: '1', text: 'Pack school lunches', assignee: 'Mom', color: 'bg-pink-400', done: false },
        { id: '2', text: 'Walk the dog', assignee: 'Emma', color: 'bg-purple-400', done: false },
        { id: '3', text: 'Take out recycling', assignee: 'Jake', color: 'bg-blue-400', done: false },
    ]);
    const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([
        { text: 'Milk (2%)', done: false },
        { text: 'Eggs', done: false },
        { text: 'Bread', done: false },
    ]);
    const [budgetProgress, setBudgetProgress] = useState(0);
    const [showPoints, setShowPoints] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: false, margin: '0px' });

    // Animation sequence timing
    useEffect(() => {
        if (!isInView || isPaused) return;

        const frames: Frame[] = ['tasks', 'task-complete', 'calendar', 'shopping', 'budget', 'family'];
        let currentIndex = 0;
        let frameTimer: NodeJS.Timeout;

        const advanceFrame = () => {
            const frame = frames[currentIndex];
            setCurrentFrame(frame);

            // Handle frame-specific logic
            if (frame === 'task-complete') {
                // Mark first task as complete
                setTimeout(() => {
                    setTasks(prev => prev.map((t, i) => i === 0 ? { ...t, done: true } : t));
                    setShowConfetti(true);
                    setShowPoints(true);
                    setTimeout(() => setShowPoints(false), 1500);
                    setTimeout(() => setShowConfetti(false), 2000);
                }, 500);
            } else if (frame === 'shopping') {
                // Mark first shopping item as complete
                setTimeout(() => {
                    setShoppingItems(prev => prev.map((item, i) => i === 0 ? { ...item, done: true } : item));
                }, 800);
            } else if (frame === 'budget') {
                // Animate budget bar
                setBudgetProgress(0);
                setTimeout(() => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 5;
                        setBudgetProgress(progress);
                        if (progress >= 65) clearInterval(interval);
                    }, 50);
                }, 300);
            } else if (frame === 'tasks') {
                // Reset for loop
                setTasks(prev => prev.map(t => ({ ...t, done: false })));
                setShoppingItems(prev => prev.map(item => ({ ...item, done: false })));
                setBudgetProgress(0);
            }

            // Timing for each frame
            const durations: Record<Frame, number> = {
                tasks: 3000,
                'task-complete': 3000,
                calendar: 3000,
                shopping: 3000,
                budget: 3000,
                family: 3000,
            };

            frameTimer = setTimeout(() => {
                currentIndex = (currentIndex + 1) % frames.length;
                advanceFrame();
            }, durations[frame]);
        };

        advanceFrame();

        return () => {
            clearTimeout(frameTimer);
        };
    }, [isInView, isPaused]);

    const handleMouseEnter = () => setIsPaused(true);
    const handleMouseLeave = () => setIsPaused(false);

    return (
        <div
            ref={containerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-[500px] mx-auto"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6 }}
                className="relative rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl shadow-blue-500/10 overflow-hidden md:[transform:perspective(1000px)_rotateY(-2deg)_rotateX(1deg)]"
            >
                {/* Container content */}
                <div className="p-6 min-h-[400px] md:min-h-[400px] relative">
                    <AnimatePresence mode="wait">
                        {/* Frame 1: Tasks Dashboard */}
                        {currentFrame === 'tasks' && (
                            <motion.div
                                key="tasks"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Today at a Glance</h3>
                                <div className="space-y-3">
                                    {tasks.map((task, index) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.15, duration: 0.4 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50"
                                        >
                                            <div
                                                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                                                    task.done ? 'bg-blue-500' : 'border-2 border-gray-600'
                                                }`}
                                            >
                                                {task.done && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span
                                                className={`flex-1 text-sm ${
                                                    task.done ? 'text-gray-500 line-through' : 'text-gray-200'
                                                }`}
                                            >
                                                {task.text}
                                            </span>
                                            <span
                                                className={`w-8 h-8 rounded-full ${task.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
                                            >
                                                {task.assignee[0]}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Frame 2: Task Complete with Confetti */}
                        {currentFrame === 'task-complete' && (
                            <motion.div
                                key="task-complete"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="relative"
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Today at a Glance</h3>
                                <div className="space-y-3">
                                    {tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 relative"
                                        >
                                            <motion.div
                                                animate={task.done ? { scale: [1, 1.2, 1] } : {}}
                                                transition={{ duration: 0.3 }}
                                                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                                                    task.done ? 'bg-blue-500' : 'border-2 border-gray-600'
                                                }`}
                                            >
                                                {task.done && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                            <span
                                                className={`flex-1 text-sm ${
                                                    task.done ? 'text-gray-500 line-through' : 'text-gray-200'
                                                }`}
                                            >
                                                {task.text}
                                            </span>
                                            <span
                                                className={`w-8 h-8 rounded-full ${task.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
                                            >
                                                {task.assignee[0]}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Points Badge */}
                                <AnimatePresence>
                                    {showPoints && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, y: -40, scale: 1 }}
                                            exit={{ opacity: 0, y: -60 }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded-full font-bold text-sm shadow-lg"
                                        >
                                            +15 pts
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Confetti Effect */}
                                <AnimatePresence>
                                    {showConfetti && (
                                        <>
                                            {[...Array(12)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{
                                                        opacity: 1,
                                                        x: '50%',
                                                        y: '20%',
                                                        scale: 0,
                                                    }}
                                                    animate={{
                                                        opacity: 0,
                                                        x: `${50 + (Math.random() - 0.5) * 100}%`,
                                                        y: `${20 + (Math.random() - 0.5) * 100}%`,
                                                        scale: 1,
                                                        rotate: Math.random() * 360,
                                                    }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{
                                                        duration: 1.5,
                                                        delay: i * 0.05,
                                                        ease: 'easeOut',
                                                    }}
                                                    className="absolute pointer-events-none"
                                                >
                                                    <Sparkles
                                                        className={`w-3 h-3 ${
                                                            ['text-blue-400', 'text-cyan-400', 'text-purple-400', 'text-pink-400'][
                                                                i % 4
                                                            ]
                                                        }`}
                                                    />
                                                </motion.div>
                                            ))}
                                        </>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Frame 3: Calendar View */}
                        {currentFrame === 'calendar' && (
                            <motion.div
                                key="calendar"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h3 className="text-xl font-bold text-white mb-6">This Week</h3>
                                <div className="flex gap-2 mb-6">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                                        <div key={day} className="flex-1 text-center">
                                            <div className="text-xs text-gray-500 mb-2">{day}</div>
                                            <div className="w-full aspect-square rounded-lg bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
                                                {index === 2 && (
                                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                    className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-1 h-12 rounded-full bg-purple-500 flex-shrink-0" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-white mb-1">Soccer Practice</h4>
                                            <p className="text-sm text-gray-400">4:00 PM</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Frame 4: Shopping List */}
                        {currentFrame === 'shopping' && (
                            <motion.div
                                key="shopping"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h3 className="text-xl font-bold text-white mb-2">Grocery Run</h3>
                                <p className="text-sm text-gray-400 mb-6">3 items</p>
                                <div className="space-y-3">
                                    {shoppingItems.map((item, index) => (
                                        <motion.div
                                            key={item.text}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1, duration: 0.3 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50"
                                        >
                                            <motion.div
                                                animate={item.done ? { scale: [1, 1.2, 1] } : {}}
                                                transition={{ duration: 0.3 }}
                                                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                                                    item.done ? 'bg-emerald-500' : 'border-2 border-gray-600'
                                                }`}
                                            >
                                                {item.done && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                            <span
                                                className={`flex-1 text-sm ${
                                                    item.done ? 'text-gray-500 line-through' : 'text-gray-200'
                                                }`}
                                            >
                                                {item.text}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8, duration: 0.3 }}
                                    className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Running total</span>
                                        <span className="text-lg font-bold text-emerald-400">$28.45</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Frame 5: Budget View */}
                        {currentFrame === 'budget' && (
                            <motion.div
                                key="budget"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h3 className="text-xl font-bold text-white mb-2">Monthly Budget</h3>
                                <p className="text-sm text-gray-400 mb-6">February 2026</p>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-end mb-3">
                                            <span className="text-sm text-gray-300">Groceries</span>
                                            <span className="text-xs text-gray-500">
                                                ${Math.round(400 * (budgetProgress / 100))} / $400
                                            </span>
                                        </div>
                                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${budgetProgress}%` }}
                                                transition={{ duration: 0.05 }}
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                            />
                                        </div>
                                    </div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5, duration: 0.4 }}
                                        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-300">Total Spent</span>
                                            <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                                                ${Math.round(400 * (budgetProgress / 100))}
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {/* Frame 6: Family Overview */}
                        {currentFrame === 'family' && (
                            <motion.div
                                key="family"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.5 }}
                            >
                                <h3 className="text-xl font-bold text-white mb-6">Family Status</h3>
                                <div className="flex justify-center gap-4 mb-8">
                                    {([
                                        { initial: 'M', color: 'bg-pink-400', mood: '😊' },
                                        { initial: 'D', color: 'bg-blue-400', mood: '👍' },
                                        { initial: 'E', color: 'bg-purple-400', mood: '😄' },
                                    ] as FamilyMember[]).map((member, index) => (
                                        <motion.div
                                            key={member.initial}
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.15, duration: 0.4 }}
                                            className="relative"
                                        >
                                            <div
                                                className={`w-16 h-16 rounded-full ${member.color} flex items-center justify-center text-xl font-bold text-white shadow-lg`}
                                            >
                                                {member.initial}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 text-2xl">{member.mood}</div>
                                        </motion.div>
                                    ))}
                                </div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6, duration: 0.5 }}
                                    className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30"
                                >
                                    <div className="text-3xl mb-2">✨</div>
                                    <h4 className="text-lg font-bold text-white mb-1">All caught up!</h4>
                                    <p className="text-sm text-gray-400">Everyone is on track today</p>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress indicator dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {(['tasks', 'task-complete', 'calendar', 'shopping', 'budget', 'family'] as Frame[]).map((frame) => (
                        <div
                            key={frame}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                currentFrame === frame ? 'bg-blue-500 w-6' : 'bg-gray-700'
                            }`}
                        />
                    ))}
                </div>
            </motion.div>

            {/* 3D perspective is applied via inline style; on mobile we use a className override */}
        </div>
    );
}
