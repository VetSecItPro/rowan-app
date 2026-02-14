'use client';

import { motion } from 'framer-motion';
import { Sunrise, Sun, Moon, Cookie, UtensilsCrossed, Clock, ShoppingCart, ChevronRight } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

/* Meal type config matching real WeekCalendarView.tsx */
const MEAL_TYPE = {
  breakfast: { icon: Sunrise, color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', bar: 'border-l-orange-400', square: 'bg-yellow-500' },
  lunch:     { icon: Sun,     color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', bar: 'border-l-yellow-400', square: 'bg-green-500' },
  dinner:    { icon: Moon,    color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', bar: 'border-l-indigo-400', square: 'bg-blue-500' },
  snack:     { icon: Cookie,  color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  bar: 'border-l-amber-400',  square: 'bg-purple-500' },
};

type MealKey = keyof typeof MEAL_TYPE;

/* ── Step 1: Week calendar view (matches real WeekCalendarView) ──── */
function WeekCalendarStep() {
  const days: { day: string; date: number; isToday: boolean; meals: { name: string; type: MealKey }[] }[] = [
    { day: 'Mon', date: 10, isToday: false, meals: [{ name: 'Oatmeal', type: 'breakfast' }, { name: 'Stir-fry', type: 'dinner' }] },
    { day: 'Tue', date: 11, isToday: false, meals: [{ name: 'Tacos', type: 'dinner' }] },
    { day: 'Wed', date: 12, isToday: true, meals: [{ name: 'Smoothie', type: 'breakfast' }, { name: 'Salad', type: 'lunch' }, { name: 'Pasta', type: 'dinner' }] },
    { day: 'Thu', date: 13, isToday: false, meals: [{ name: 'Soup', type: 'lunch' }] },
    { day: 'Fri', date: 14, isToday: false, meals: [] },
    { day: 'Sat', date: 15, isToday: false, meals: [{ name: 'Pancakes', type: 'breakfast' }, { name: 'BBQ', type: 'dinner' }] },
    { day: 'Sun', date: 16, isToday: false, meals: [{ name: 'Brunch', type: 'lunch' }] },
  ];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d, dayIdx) => (
        <motion.div
          key={d.day}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: dayIdx * 0.05 }}
          className={`min-h-[200px] rounded-lg border-2 p-1.5 ${
            d.isToday
              ? 'border-orange-500 bg-orange-900/10'
              : 'border-gray-700/50 bg-gray-800/30'
          }`}
        >
          {/* Day header */}
          <div className="text-center mb-1.5">
            <span className="text-[9px] text-gray-400 uppercase block">{d.day}</span>
            <span className={`text-xs font-medium ${d.isToday ? 'text-orange-300' : 'text-gray-400'}`}>
              {d.date}
            </span>
            {d.isToday && (
              <div className="mt-0.5">
                <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                  Today
                </span>
              </div>
            )}
          </div>

          {/* Meal items with border-l-4 (matches real pattern) */}
          <div className="space-y-1">
            {d.meals.map((meal, mealIdx) => {
              const mt = MEAL_TYPE[meal.type];
              const Icon = mt.icon;
              return (
                <motion.div
                  key={meal.name}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 + dayIdx * 0.05 + mealIdx * 0.08 }}
                  className={`rounded px-1 py-1 border-l-[3px] ${mt.bar} ${mt.bg}`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className={`w-2.5 h-2.5 ${mt.color} flex-shrink-0`} />
                    <span className="text-[8px] text-gray-300 leading-tight truncate">{meal.name}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Step 2: Add a meal (real MealCard pattern) ──────────────────── */
function AddMealStep() {
  return (
    <div className="space-y-3">
      {/* Meal card being added (matches real MealCard.tsx) */}
      <motion.div
        className="bg-gray-800 border border-gray-700 rounded-xl p-4"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-start gap-3">
          {/* Meal type icon square (real pattern) */}
          <motion.div
            className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3, type: 'spring', stiffness: 300 }}
          >
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">Chicken Stir-Fry</h4>
            <p className="text-xs text-gray-400 capitalize mt-0.5">dinner &bull; Wednesday</p>
          </div>

          {/* Assignee pill (real pattern) */}
          <motion.div
            className="px-2 py-0.5 bg-orange-900/30 rounded-full flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
              <span className="text-[8px] font-semibold text-blue-300">S</span>
            </div>
            <span className="text-[10px] text-orange-300">Sarah</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Meal type selector with real icons */}
      <motion.div
        className="flex gap-2 justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
          const mt = MEAL_TYPE[type];
          const Icon = mt.icon;
          const active = type === 'dinner';
          return (
            <div
              key={type}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg ${
                active
                  ? `${mt.bg} border ${mt.border}`
                  : 'bg-gray-800/60 border border-gray-700/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? mt.color : 'text-gray-400'}`} />
              <span className={`text-[9px] capitalize font-medium ${active ? mt.color : 'text-gray-400'}`}>
                {type}
              </span>
            </div>
          );
        })}
      </motion.div>

      {/* Quick meal list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="space-y-1.5"
      >
        {['Mon - Oatmeal', 'Wed - Chicken Stir-Fry', 'Sat - BBQ Ribs'].map((item) => (
          <div key={item} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-800/40">
            <UtensilsCrossed className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-400">{item}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Step 3: Recipe details ──────────────────────────────────────── */
function RecipeDetailsStep() {
  const ingredients = ['Chicken breast', 'Soy sauce', 'Bell peppers', 'Rice', 'Garlic & ginger'];

  return (
    <div className="space-y-3">
      {/* Recipe header (MealCard-style) */}
      <motion.div
        className="bg-gray-800 border border-gray-700 rounded-xl p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">Chicken Stir-Fry</h4>
            <p className="text-xs text-gray-400 capitalize mt-0.5">dinner &bull; Wednesday</p>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700/40">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-gray-300">25 min</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700/40">
            <span className="text-xs text-gray-400">Serves</span>
            <span className="text-xs text-gray-300 font-medium">4</span>
          </div>
        </div>
      </motion.div>

      {/* Ingredients */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Ingredients</p>
        <div className="space-y-1">
          {ingredients.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.2 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-800/40"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400/60 flex-shrink-0" />
              <span className="text-xs text-gray-300">{item}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Step 4: Auto shopping list ──────────────────────────────────── */
function AutoShoppingListStep() {
  const items = ['Chicken breast x2', 'Soy sauce', 'Bell peppers x3', 'Rice 2 lbs', 'Garlic'];

  return (
    <div className="space-y-3">
      {/* Meal plan summary header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <UtensilsCrossed className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Meal Plan</h4>
          <p className="text-xs text-gray-400">5 meals this week</p>
        </div>
      </div>

      {/* Generate button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30"
      >
        <ShoppingCart className="w-4 h-4 text-orange-400" />
        <span className="text-sm text-orange-300 font-medium">Generate Shopping List</span>
        <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
      </motion.div>

      {/* Arrow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-0.5 h-3 bg-gray-700 rounded-full" />
          <div className="w-2 h-2 border-r-2 border-b-2 border-gray-700 rotate-45 -mt-1" />
        </div>
      </motion.div>

      {/* Shopping list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-2.5"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <ShoppingCart className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">
            Shopping List
          </span>
        </div>
        <div className="space-y-1">
          {items.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.08, duration: 0.2 }}
              className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30"
            >
              <div className="w-3.5 h-3.5 rounded border border-gray-600 flex-shrink-0" />
              <span className="text-[11px] text-gray-400">{item}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Your meal week', content: <WeekCalendarStep /> },
  { label: 'Add a meal', content: <AddMealStep /> },
  { label: 'See the details', content: <RecipeDetailsStep /> },
  { label: 'Auto shopping list', content: <AutoShoppingListStep /> },
];

/** Renders an animated meals feature demonstration for the landing page. */
export function MealsDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Meals"
      colorScheme={{
        primary: 'orange-500',
        secondary: 'amber-500',
        gradient: 'from-orange-500 to-amber-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
