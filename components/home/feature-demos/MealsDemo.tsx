'use client';

import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Clock, ShoppingCart, ChevronRight } from 'lucide-react';

function PlanWeekStep() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <UtensilsCrossed className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Meal Plan</h4>
          <p className="text-xs text-gray-500">This week</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.06, duration: 0.3 }}
            className="text-center"
          >
            <p className="text-[10px] text-gray-500 mb-1.5">{day}</p>
            <div className="aspect-square rounded-lg bg-gray-800/60 border border-gray-700/50 border-dashed flex items-center justify-center">
              <Plus className="w-3 h-3 text-gray-700" />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="text-center text-xs text-gray-600 pt-2"
      >
        Tap a day to add a meal
      </motion.p>
    </div>
  );
}

function AddRecipesStep() {
  const days = [
    { day: 'Mon', meal: 'Chicken Stir-Fry', color: 'bg-orange-500/15 border-orange-500/30 text-orange-300' },
    { day: 'Tue', meal: null, color: '' },
    { day: 'Wed', meal: 'Taco Tuesday', color: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
    { day: 'Thu', meal: 'Pasta Bake', color: 'bg-orange-500/15 border-orange-500/30 text-orange-300' },
    { day: 'Fri', meal: null, color: '' },
    { day: 'Sat', meal: null, color: '' },
    { day: 'Sun', meal: null, color: '' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <UtensilsCrossed className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Meal Plan</h4>
          <p className="text-xs text-gray-500">3 meals planned</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((item, index) => (
          <motion.div
            key={item.day}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.06, duration: 0.3 }}
            className="text-center"
          >
            <p className="text-[10px] text-gray-500 mb-1.5">{item.day}</p>
            {item.meal ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1, type: 'spring', stiffness: 300 }}
                className={`aspect-square rounded-lg border flex items-center justify-center p-0.5 ${item.color}`}
              >
                <span className="text-[8px] leading-tight text-center font-medium line-clamp-2">
                  {item.meal.split(' ')[0]}
                </span>
              </motion.div>
            ) : (
              <div className="aspect-square rounded-lg bg-gray-800/60 border border-gray-700/50 border-dashed" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick meal list below */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="space-y-1.5 pt-1"
      >
        {[
          { day: 'Mon', meal: 'Chicken Stir-Fry' },
          { day: 'Wed', meal: 'Taco Tuesday' },
          { day: 'Thu', meal: 'Pasta Bake' },
        ].map((item) => (
          <div
            key={item.day}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-800/40"
          >
            <span className="text-[10px] text-gray-500 w-7">{item.day}</span>
            <span className="text-xs text-gray-300">{item.meal}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function SeeDetailsStep() {
  const ingredients = ['Chicken breast', 'Soy sauce', 'Bell peppers', 'Rice', 'Garlic & ginger'];

  return (
    <div className="space-y-3">
      {/* Recipe card header */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex items-center gap-2.5"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/30 border border-orange-500/20 flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">Chicken Stir-Fry</h4>
          <p className="text-xs text-gray-500">Monday dinner</p>
        </div>
      </motion.div>

      {/* Meta info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="flex gap-3"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs text-gray-300">25 min</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
          <span className="text-xs text-gray-500">Serves</span>
          <span className="text-xs text-gray-300 font-medium">4</span>
        </div>
      </motion.div>

      {/* Ingredients */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Ingredients</p>
        <div className="space-y-1.5">
          {ingredients.map((ingredient, index) => (
            <motion.div
              key={ingredient}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.08, duration: 0.25 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-800/40"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400/60 flex-shrink-0" />
              <span className="text-xs text-gray-300">{ingredient}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function AutoShoppingListStep() {
  const shoppingItems = ['Chicken breast x2', 'Soy sauce', 'Bell peppers x3', 'Rice 2 lbs', 'Garlic'];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <UtensilsCrossed className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Meal Plan</h4>
          <p className="text-xs text-gray-500">3 meals this week</p>
        </div>
      </div>

      {/* Generate button */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 cursor-default"
      >
        <ShoppingCart className="w-4 h-4 text-orange-400" />
        <span className="text-sm text-orange-300 font-medium">Generate Shopping List</span>
        <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
      </motion.div>

      {/* Arrow indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-0.5 h-3 bg-gray-700 rounded-full" />
          <div className="w-2 h-2 border-r-2 border-b-2 border-gray-700 rotate-45 -mt-1" />
        </div>
      </motion.div>

      {/* Mini shopping list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-2.5"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <ShoppingCart className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">
            Shopping List
          </span>
        </div>
        <div className="space-y-1">
          {shoppingItems.map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.25 }}
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

// Inline Plus icon to avoid importing from lucide for a tiny use
function Plus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
    </svg>
  );
}

const steps: DemoStep[] = [
  { label: 'Plan your week', content: <PlanWeekStep />, duration: 3000 },
  { label: 'Add recipes', content: <AddRecipesStep />, duration: 3000 },
  { label: 'See the details', content: <SeeDetailsStep />, duration: 3000 },
  { label: 'Auto shopping list', content: <AutoShoppingListStep />, duration: 3000 },
];

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
