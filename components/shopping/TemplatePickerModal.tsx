'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, ShoppingCart, Plus, Loader2, GripVertical } from 'lucide-react';
import { shoppingService, type TemplateItemInput } from '@/lib/services/shopping-service';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/utils/toast';
import { CreateCustomTemplateModal } from './CreateCustomTemplateModal';

interface Template {
  id: string;
  name: string;
  description: string;
  items: TemplateItemInput[] | string;
  created_at: string;
  sort_order?: number;
}

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => Promise<void>;
  onStartFresh: () => void;
  spaceId: string;
}

/** Displays a modal for selecting a shopping list template. */
export function TemplatePickerModal({ isOpen, onClose, onSelectTemplate, onStartFresh, spaceId }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCustomTemplateModal, setShowCustomTemplateModal] = useState(false);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shoppingService.getTemplates(spaceId);
      setTemplates(data);
    } catch (error) {
      logger.error('Failed to load templates:', error, { component: 'TemplatePickerModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (isOpen && spaceId) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates, spaceId]);

  const handleSelectTemplate = async (templateId: string) => {
    try {
      setSelectedTemplateId(templateId);
      await onSelectTemplate(templateId);
      onClose();
    } catch (error) {
      logger.error('Failed to create list from template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
      showError('Failed to create list from template. Please try again.');
    } finally {
      setSelectedTemplateId(null);
    }
  };

  const handleDragStart = (templateId: string) => {
    setDraggedTemplateId(templateId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTemplateId || draggedTemplateId === targetId) return;

    const dragIndex = templates.findIndex(t => t.id === draggedTemplateId);
    const targetIndex = templates.findIndex(t => t.id === targetId);

    if (dragIndex === -1 || targetIndex === -1) return;

    const newTemplates = [...templates];
    const [draggedTemplate] = newTemplates.splice(dragIndex, 1);
    newTemplates.splice(targetIndex, 0, draggedTemplate);
    setTemplates(newTemplates);
  };

  const handleDragEnd = () => {
    setDraggedTemplateId(null);
  };

  const handleCustomTemplateCreated = () => {
    loadTemplates();
  };

  const handleStartFresh = () => {
    onStartFresh();
    onClose();
  };

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-4 sm:px-6 py-2.5 border border-gray-600 text-gray-300 rounded-full hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handleStartFresh}
        className="flex-1 px-4 sm:px-6 py-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors font-medium text-sm sm:text-base"
      >
        Start Fresh
      </button>
    </div>
  );

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a Template"
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-emerald-500 to-emerald-600"
      footer={footerContent}
    >
      <div className="space-y-4">
          {/* Templates Section */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading templates...</p>
            </div>
          ) : templates.length > 0 ? (
            <>
              <div className="pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                  Your Templates
                </h3>
                <button
                  onClick={() => setIsReorderMode(!isReorderMode)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    isReorderMode
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {isReorderMode ? 'Done' : 'Reorder'}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {templates.map((template) => {
                  const itemCount = Array.isArray(template.items)
                    ? template.items.length
                    : typeof template.items === 'string'
                    ? JSON.parse(template.items).length
                    : 0;

                  return (
                    <div
                      key={template.id}
                      draggable={isReorderMode}
                      onDragStart={() => isReorderMode && handleDragStart(template.id)}
                      onDragOver={(e) => isReorderMode && handleDragOver(e, template.id)}
                      onDragEnd={handleDragEnd}
                      className={`transition-all ${draggedTemplateId === template.id ? 'opacity-50 scale-95' : ''}`}
                    >
                      <button
                        onClick={() => !isReorderMode && handleSelectTemplate(template.id)}
                        disabled={selectedTemplateId === template.id || isReorderMode}
                        className={`w-full p-3 border-2 rounded-lg transition-all text-left group disabled:cursor-not-allowed ${
                          isReorderMode
                            ? 'border-dashed border-gray-600 cursor-move bg-gray-700/30'
                            : 'border-gray-700 hover:border-emerald-400 hover:bg-gray-700/50 disabled:opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isReorderMode && (
                            <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="w-9 h-9 bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                                {template.name}
                              </h4>
                              <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-300 text-xs font-medium rounded-full flex-shrink-0">
                                {itemCount}
                              </span>
                            </div>
                            {template.description && (
                              <p className="text-xs text-gray-400 line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                          {selectedTemplateId === template.id && (
                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Quick Start Templates Section - also show when user has templates */}
              <div className="pt-4 mt-4 border-t border-gray-700">
                <div className="pb-2">
                  <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                    Quick Start Templates
                  </h3>
                </div>
                <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:grid-cols-2">
                  {/* Weekly Groceries */}
                  <button
                    onClick={async () => {
                      try {
                        await shoppingService.createTemplate(spaceId, 'Weekly Groceries', 'Essential items for a week', [
                          { name: 'Milk', quantity: 1, category: 'Dairy' },
                          { name: 'Eggs', quantity: 12, category: 'Dairy' },
                          { name: 'Bread', quantity: 1, category: 'Bakery' },
                          { name: 'Chicken Breast', quantity: 2, category: 'Meat' },
                          { name: 'Bananas', quantity: 6, category: 'Produce' },
                          { name: 'Apples', quantity: 6, category: 'Produce' },
                          { name: 'Rice', quantity: 1, category: 'Grains' },
                          { name: 'Pasta', quantity: 2, category: 'Grains' },
                        ]);
                        loadTemplates();
                      } catch (error) {
                        logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                      }
                    }}
                    className="w-full p-3 border border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-white group-hover:text-emerald-400">Weekly Groceries</span>
                    </div>
                  </button>
                  {/* Breakfast Essentials */}
                  <button
                    onClick={async () => {
                      try {
                        await shoppingService.createTemplate(spaceId, 'Breakfast Essentials', 'Start your day right', [
                          { name: 'Cereal', quantity: 1, category: 'Breakfast' },
                          { name: 'Milk', quantity: 1, category: 'Dairy' },
                          { name: 'Orange Juice', quantity: 1, category: 'Beverages' },
                          { name: 'Bagels', quantity: 6, category: 'Bakery' },
                          { name: 'Cream Cheese', quantity: 1, category: 'Dairy' },
                          { name: 'Yogurt', quantity: 4, category: 'Dairy' },
                        ]);
                        loadTemplates();
                      } catch (error) {
                        logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                      }
                    }}
                    className="w-full p-3 border border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-orange-400" />
                      </div>
                      <span className="text-sm font-medium text-white group-hover:text-emerald-400">Breakfast Essentials</span>
                    </div>
                  </button>
                  {/* Home Essentials */}
                  <button
                    onClick={async () => {
                      try {
                        await shoppingService.createTemplate(spaceId, 'Home Essentials', 'Household necessities', [
                          { name: 'Paper Towels', quantity: 2, category: 'Household' },
                          { name: 'Dish Soap', quantity: 1, category: 'Cleaning' },
                          { name: 'Laundry Detergent', quantity: 1, category: 'Cleaning' },
                          { name: 'Trash Bags', quantity: 1, category: 'Household' },
                          { name: 'Toilet Paper', quantity: 1, category: 'Household' },
                          { name: 'Hand Soap', quantity: 2, category: 'Personal Care' },
                        ]);
                        loadTemplates();
                      } catch (error) {
                        logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                      }
                    }}
                    className="w-full p-3 border border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-white group-hover:text-emerald-400">Home Essentials</span>
                    </div>
                  </button>
                  {/* BBQ Cookout */}
                  <button
                    onClick={async () => {
                      try {
                        await shoppingService.createTemplate(spaceId, 'BBQ Cookout', 'Everything for a barbecue', [
                          { name: 'Hamburger Patties', quantity: 8, category: 'Meat' },
                          { name: 'Hot Dogs', quantity: 8, category: 'Meat' },
                          { name: 'Hamburger Buns', quantity: 8, category: 'Bakery' },
                          { name: 'Hot Dog Buns', quantity: 8, category: 'Bakery' },
                          { name: 'Ketchup', quantity: 1, category: 'Condiments' },
                          { name: 'Mustard', quantity: 1, category: 'Condiments' },
                        ]);
                        loadTemplates();
                      } catch (error) {
                        logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                      }
                    }}
                    className="w-full p-3 border border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-sm font-medium text-white group-hover:text-emerald-400">BBQ Cookout</span>
                    </div>
                  </button>
                  {/* Pet Supplies */}
                  <button
                    onClick={async () => {
                      try {
                        await shoppingService.createTemplate(spaceId, 'Pet Supplies', 'Food and essentials for pets', [
                          { name: 'Dog Food', quantity: 1, category: 'Pet' },
                          { name: 'Cat Food', quantity: 1, category: 'Pet' },
                          { name: 'Pet Treats', quantity: 2, category: 'Pet' },
                          { name: 'Cat Litter', quantity: 1, category: 'Pet' },
                          { name: 'Poop Bags', quantity: 1, category: 'Pet' },
                        ]);
                        loadTemplates();
                      } catch (error) {
                        logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                      }
                    }}
                    className="w-full p-3 border border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-sm font-medium text-white group-hover:text-emerald-400">Pet Supplies</span>
                    </div>
                  </button>
                  {/* Back to School */}
                  <button
                    onClick={async () => {
                      try {
                        await shoppingService.createTemplate(spaceId, 'Back to School', 'School supplies', [
                          { name: 'Notebooks', quantity: 5, category: 'School' },
                          { name: 'Pencils', quantity: 1, category: 'School' },
                          { name: 'Pens', quantity: 1, category: 'School' },
                          { name: 'Backpack', quantity: 1, category: 'School' },
                          { name: 'Binders', quantity: 3, category: 'School' },
                        ]);
                        loadTemplates();
                      } catch (error) {
                        logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                      }
                    }}
                    className="w-full p-3 border border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-sm font-medium text-white group-hover:text-emerald-400">Back to School</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Create Custom Template Button */}
              <button
                onClick={() => setShowCustomTemplateModal(true)}
                className="w-full p-3 mt-3 border-2 border-dashed border-emerald-600 rounded-lg hover:border-emerald-400 hover:bg-emerald-900/20 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      Create Custom Template
                    </h4>
                    <p className="text-xs text-gray-400">
                      Build your own reusable list
                    </p>
                  </div>
                </div>
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6 px-4 border border-gray-700 rounded-lg bg-gray-900/50">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No templates saved yet</p>
                <p className="text-sm text-gray-400">
                  Create a shopping list and save it as a template, or try one of our quick-start templates below!
                </p>
              </div>

              {/* Quick Start Templates */}
              <div className="pt-4 pb-2">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                  Quick Start Templates
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Click to create a pre-filled template
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
                {/* Weekly Groceries Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Weekly Groceries',
                        'Essential items for a week of groceries',
                        [
                          { name: 'Milk', quantity: 1, category: 'Dairy' },
                          { name: 'Eggs', quantity: 12, category: 'Dairy' },
                          { name: 'Bread', quantity: 1, category: 'Bakery' },
                          { name: 'Chicken Breast', quantity: 2, category: 'Meat' },
                          { name: 'Bananas', quantity: 6, category: 'Produce' },
                          { name: 'Apples', quantity: 6, category: 'Produce' },
                          { name: 'Rice', quantity: 1, category: 'Grains' },
                          { name: 'Pasta', quantity: 2, category: 'Grains' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Weekly Groceries
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        8 essential grocery items
                      </p>
                    </div>
                  </div>
                </button>

                {/* Party Supplies Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Party Supplies',
                        'Everything you need for a party',
                        [
                          { name: 'Chips', quantity: 3, category: 'Snacks' },
                          { name: 'Soda', quantity: 6, category: 'Beverages' },
                          { name: 'Pizza', quantity: 3, category: 'Food' },
                          { name: 'Ice Cream', quantity: 2, category: 'Frozen' },
                          { name: 'Paper Plates', quantity: 1, category: 'Party Supplies' },
                          { name: 'Napkins', quantity: 1, category: 'Party Supplies' },
                          { name: 'Cups', quantity: 1, category: 'Party Supplies' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Party Supplies
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        7 party essentials
                      </p>
                    </div>
                  </div>
                </button>

                {/* Breakfast Essentials Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Breakfast Essentials',
                        'Start your day right',
                        [
                          { name: 'Cereal', quantity: 1, category: 'Breakfast' },
                          { name: 'Milk', quantity: 1, category: 'Dairy' },
                          { name: 'Orange Juice', quantity: 1, category: 'Beverages' },
                          { name: 'Bagels', quantity: 6, category: 'Bakery' },
                          { name: 'Cream Cheese', quantity: 1, category: 'Dairy' },
                          { name: 'Yogurt', quantity: 4, category: 'Dairy' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Breakfast Essentials
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        6 breakfast staples
                      </p>
                    </div>
                  </div>
                </button>

                {/* Healthy Snacks Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Healthy Snacks',
                        'Nutritious snacking options',
                        [
                          { name: 'Almonds', quantity: 1, category: 'Snacks' },
                          { name: 'Greek Yogurt', quantity: 4, category: 'Dairy' },
                          { name: 'Carrots', quantity: 1, category: 'Produce' },
                          { name: 'Hummus', quantity: 1, category: 'Deli' },
                          { name: 'Granola Bars', quantity: 1, category: 'Snacks' },
                          { name: 'Fresh Berries', quantity: 2, category: 'Produce' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Healthy Snacks
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        6 nutritious snacks
                      </p>
                    </div>
                  </div>
                </button>

                {/* Home Essentials Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Home Essentials',
                        'Household necessities',
                        [
                          { name: 'Paper Towels', quantity: 2, category: 'Household' },
                          { name: 'Dish Soap', quantity: 1, category: 'Cleaning' },
                          { name: 'Laundry Detergent', quantity: 1, category: 'Cleaning' },
                          { name: 'Trash Bags', quantity: 1, category: 'Household' },
                          { name: 'Toilet Paper', quantity: 1, category: 'Household' },
                          { name: 'Hand Soap', quantity: 2, category: 'Personal Care' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Home Essentials
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        6 household items
                      </p>
                    </div>
                  </div>
                </button>

                {/* BBQ Cookout Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'BBQ Cookout',
                        'Everything for a great barbecue',
                        [
                          { name: 'Hamburger Patties', quantity: 8, category: 'Meat' },
                          { name: 'Hot Dogs', quantity: 8, category: 'Meat' },
                          { name: 'Hamburger Buns', quantity: 8, category: 'Bakery' },
                          { name: 'Hot Dog Buns', quantity: 8, category: 'Bakery' },
                          { name: 'Ketchup', quantity: 1, category: 'Condiments' },
                          { name: 'Mustard', quantity: 1, category: 'Condiments' },
                          { name: 'Potato Salad', quantity: 1, category: 'Deli' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        BBQ Cookout
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        7 barbecue essentials
                      </p>
                    </div>
                  </div>
                </button>

                {/* Baby Essentials Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Baby Essentials',
                        'Must-haves for baby care',
                        [
                          { name: 'Diapers', quantity: 1, category: 'Baby' },
                          { name: 'Baby Wipes', quantity: 2, category: 'Baby' },
                          { name: 'Formula', quantity: 1, category: 'Baby' },
                          { name: 'Baby Food', quantity: 6, category: 'Baby' },
                          { name: 'Baby Lotion', quantity: 1, category: 'Baby' },
                          { name: 'Pacifiers', quantity: 2, category: 'Baby' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Baby Essentials
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        6 baby care items
                      </p>
                    </div>
                  </div>
                </button>

                {/* Pet Supplies Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Pet Supplies',
                        'Food and essentials for your pets',
                        [
                          { name: 'Dog Food', quantity: 1, category: 'Pet' },
                          { name: 'Cat Food', quantity: 1, category: 'Pet' },
                          { name: 'Pet Treats', quantity: 2, category: 'Pet' },
                          { name: 'Cat Litter', quantity: 1, category: 'Pet' },
                          { name: 'Poop Bags', quantity: 1, category: 'Pet' },
                          { name: 'Pet Toys', quantity: 2, category: 'Pet' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Pet Supplies
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        6 pet essentials
                      </p>
                    </div>
                  </div>
                </button>

                {/* Office Supplies Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Office Supplies',
                        'Restock your home office',
                        [
                          { name: 'Printer Paper', quantity: 1, category: 'Office' },
                          { name: 'Pens', quantity: 1, category: 'Office' },
                          { name: 'Sticky Notes', quantity: 2, category: 'Office' },
                          { name: 'Notebooks', quantity: 2, category: 'Office' },
                          { name: 'Folders', quantity: 1, category: 'Office' },
                          { name: 'Stapler', quantity: 1, category: 'Office' },
                          { name: 'Paper Clips', quantity: 1, category: 'Office' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Office Supplies
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        7 office essentials
                      </p>
                    </div>
                  </div>
                </button>

                {/* Camping Trip Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Camping Trip',
                        'Outdoor adventure supplies',
                        [
                          { name: 'Bottled Water', quantity: 12, category: 'Beverages' },
                          { name: 'Trail Mix', quantity: 3, category: 'Snacks' },
                          { name: 'Marshmallows', quantity: 1, category: 'Snacks' },
                          { name: 'Hot Dogs', quantity: 8, category: 'Meat' },
                          { name: 'Sunscreen', quantity: 1, category: 'Personal Care' },
                          { name: 'Bug Spray', quantity: 1, category: 'Personal Care' },
                          { name: 'Flashlight Batteries', quantity: 1, category: 'Supplies' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Camping Trip
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        7 outdoor essentials
                      </p>
                    </div>
                  </div>
                </button>

                {/* Back to School Template */}
                <button
                  onClick={async () => {
                    try {
                      await shoppingService.createTemplate(
                        spaceId,
                        'Back to School',
                        'School supplies for students',
                        [
                          { name: 'Notebooks', quantity: 5, category: 'School' },
                          { name: 'Pencils', quantity: 1, category: 'School' },
                          { name: 'Pens', quantity: 1, category: 'School' },
                          { name: 'Backpack', quantity: 1, category: 'School' },
                          { name: 'Binders', quantity: 3, category: 'School' },
                          { name: 'Highlighters', quantity: 1, category: 'School' },
                          { name: 'Calculator', quantity: 1, category: 'School' },
                        ]
                      );
                      loadTemplates();
                    } catch (error) {
                      logger.error('Failed to create template:', error, { component: 'TemplatePickerModal', action: 'component_action' });
                    }
                  }}
                  className="w-full p-4 border-2 border-gray-700 rounded-lg hover:border-emerald-400 hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Back to School
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        7 school supplies
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Create Custom Template Option */}
              <div className="pt-4 mt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowCustomTemplateModal(true)}
                  className="w-full p-4 border-2 border-dashed border-emerald-600 rounded-lg hover:border-emerald-400 hover:bg-emerald-900/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Plus className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        Create Custom Template
                      </h4>
                      <p className="text-sm sm:text-xs text-gray-400 line-clamp-1 mt-1">
                        Build your own reusable shopping list
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
      </div>
    </Modal>

    {/* Custom Template Creation Modal */}
    <CreateCustomTemplateModal
      isOpen={showCustomTemplateModal}
      onClose={() => setShowCustomTemplateModal(false)}
      onSave={handleCustomTemplateCreated}
      spaceId={spaceId}
    />
    </>
  );
}
