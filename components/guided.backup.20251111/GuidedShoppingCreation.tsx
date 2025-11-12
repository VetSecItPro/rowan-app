'use client';

import { useState } from 'react';
import { ShoppingCart, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { shoppingService } from '@/lib/services/shopping-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedShoppingCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedShoppingCreation({ onComplete, onSkip }: GuidedShoppingCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<'groceries' | 'household' | 'personal'>('groceries');

  const stepTitles = ['Welcome', 'Item Details', 'Success'];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateShoppingItem = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      // First, get or create a shopping list
      const lists = await shoppingService.getLists(currentSpace.id);
      let listId: string;

      if (lists.length > 0) {
        // Use the first active list
        const activeList = lists.find(l => l.status === 'active');
        if (activeList) {
          listId = activeList.id;
        } else {
          // Create a new list
          const list = await shoppingService.createList({
            space_id: currentSpace.id,
            title: 'Shopping List',
            status: 'active',
          });
          listId = list.id;
        }
      } else {
        // Create a new list
        const list = await shoppingService.createList({
          space_id: currentSpace.id,
          title: 'Shopping List',
          status: 'active',
        });
        listId = list.id;
      }

      await shoppingService.createItem({
        list_id: listId,
        name: name || 'My First Item',
        quantity: parseInt(quantity) || 1,
        category,
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_shopping_item_added');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating shopping item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-900 rounded-full">
              <ShoppingCart className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Create Your First Shopping Item
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Keep track of groceries and household items you need.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Create shared shopping lists so nothing gets forgotten.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                aria-label="Skip shopping item creation"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start creating first shopping item"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Item Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What do you need?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Add an item to your shopping list
              </p>
            </div>

            <div>
              <label htmlFor="item-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Name *
              </label>
              <input
                id="item-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Milk"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="item-quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <input
                id="item-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'groceries', label: 'Groceries' },
                  { value: 'household', label: 'Household' },
                  { value: 'personal', label: 'Personal' },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value as typeof category)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      category === cat.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`Set category to ${cat.label}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                <strong>Tip:</strong> Your partner can see the shopping list and check off items as they shop!
              </p>
            </div>

            <div className="flex gap-4 justify-between pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateShoppingItem}
                disabled={!name.trim() || loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Adding item...' : 'Add item'}
              >
                {loading ? 'Adding...' : 'Add Item'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <ShoppingCart className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Shopping Item Added Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first item has been added to the shopping list.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You can now manage your shopping together.
              </p>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                What you can do with shopping lists:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Create multiple lists for different stores or occasions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Check off items as you shop in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Organize items by category for easier shopping</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Share lists with your partner to split shopping duties</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Go to shopping lists"
            >
              Go to Shopping Lists
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
