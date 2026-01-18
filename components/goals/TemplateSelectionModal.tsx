'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { Search, TrendingUp, ChevronRight } from 'lucide-react';
import { GoalTemplate } from '@/lib/services/goals-service';
import { goalsService } from '@/lib/services/goals-service';
import { logger } from '@/lib/logger';
import { Modal } from '@/components/ui/Modal';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: GoalTemplate) => void;
  onCreateFromScratch?: () => void;
  spaceId: string;
}

export function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateFromScratch,
  spaceId,
}: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number; icon: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadCategories();
    }
  }, [isOpen, selectedCategory]);

  // Fallback data for when database is unavailable
  const fallbackTemplates: GoalTemplate[] = [
    {
      id: 'fallback-1',
      title: 'Build Emergency Fund',
      description: 'Save 3-6 months of living expenses for unexpected situations',
      category: 'financial',
      icon: '💰',
      target_days: 180,
      is_public: true,
      usage_count: 245,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-2',
      title: 'Pay Off Debt',
      description: 'Eliminate credit card or loan debt systematically',
      category: 'financial',
      icon: '💳',
      target_days: 365,
      is_public: true,
      usage_count: 189,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-3',
      title: 'Weight Loss Journey',
      description: 'Lose weight through healthy eating and regular exercise',
      category: 'health',
      icon: '🏃',
      target_days: 90,
      is_public: true,
      usage_count: 156,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-4',
      title: 'Save for Home Down Payment',
      description: 'Accumulate funds for a house or apartment down payment',
      category: 'home',
      icon: '🏠',
      target_days: 730,
      is_public: true,
      usage_count: 134,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-5',
      title: 'Retirement Savings Boost',
      description: 'Increase retirement account contributions and grow nest egg',
      category: 'financial',
      icon: '🏦',
      target_days: 365,
      is_public: true,
      usage_count: 112,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-6',
      title: 'Investment Portfolio',
      description: 'Build a diversified investment portfolio',
      category: 'financial',
      icon: '📈',
      target_days: 365,
      is_public: true,
      usage_count: 98,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'fallback-7',
      title: 'Career Advancement',
      description: 'Work towards a promotion or new career opportunity',
      category: 'career',
      icon: '💼',
      target_days: 365,
      is_public: true,
      usage_count: 87,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const fallbackCategories = [
    { category: 'financial', count: 5, icon: '💰' },
    { category: 'health', count: 4, icon: '🏃' },
    { category: 'home', count: 4, icon: '🏠' },
    { category: 'relationship', count: 4, icon: '💕' },
    { category: 'career', count: 3, icon: '💼' },
  ];

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await goalsService.getGoalTemplates(selectedCategory || undefined);
      setTemplates(data);
    } catch (error) {
      logger.error('Error loading templates, using fallback data:', error, { component: 'TemplateSelectionModal', action: 'component_action' });
      // Use fallback data when database is unavailable
      const filtered = selectedCategory
        ? fallbackTemplates.filter(t => t.category === selectedCategory)
        : fallbackTemplates;
      setTemplates(filtered);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await goalsService.getTemplateCategories();
      setCategories(data);
    } catch (error) {
      logger.error('Error loading categories, using fallback data:', error, { component: 'TemplateSelectionModal', action: 'component_action' });
      // Use fallback data when database is unavailable
      setCategories(fallbackCategories);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(template =>
      template.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [templates, debouncedSearchQuery]);

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.category === category);
    return categoryData?.icon || '📋';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      financial: 'from-green-500 to-emerald-600',
      health: 'from-blue-500 to-cyan-600',
      home: 'from-orange-500 to-red-600',
      relationship: 'from-pink-500 to-purple-600',
      career: 'from-indigo-500 to-blue-600',
      personal: 'from-purple-500 to-pink-600',
      education: 'from-yellow-500 to-orange-600',
      family: 'from-rose-500 to-pink-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const footerContent = (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
      <button
        onClick={onClose}
        title="Close without selecting a template"
        className="flex-1 sm:flex-none px-6 py-3 bg-gray-700 text-gray-300 rounded-full font-medium hover:bg-gray-600 transition-colors"
      >
        Cancel
      </button>
      {onCreateFromScratch && (
        <button
          onClick={onCreateFromScratch}
          title="Start with a blank goal instead of using a template"
          className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-full font-medium transition-all shadow-lg shadow-indigo-500/25"
        >
          Create from Scratch
        </button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a Goal Template"
      subtitle="Start with a pre-built template or create from scratch"
      maxWidth="6xl"
      headerGradient="bg-gradient-to-r from-indigo-500 to-indigo-600"
      footer={footerContent}
    >
      {/* Search Bar */}
      <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all hover:border-indigo-500"
            />
          </div>
        </div>

      {/* Category Tabs */}
      <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === null
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Templates
            </button>
            {categories.map(({ category, count, icon }) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
                  selectedCategory === category
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{icon}</span>
                <span>{formatCategoryName(category)}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            ))}
          </div>
        </div>

      {/* Template Grid */}
      <div className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  title={`Click to use "${template.title}" template - ${template.description || 'Pre-configured goal template'}`}
                  className="group relative bg-gray-800 border border-gray-700 rounded-xl p-6 text-left hover:border-indigo-500 hover:shadow-lg transition-all duration-200"
                >
                  {/* Category Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(template.category)} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                      {template.icon || getCategoryIcon(template.category)}
                    </div>
                    {template.usage_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>{template.usage_count} uses</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {template.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-300 rounded-lg">
                        {formatCategoryName(template.category)}
                      </span>
                      {template.milestones && template.milestones.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {template.milestones.length} milestones
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Target Days Badge */}
                  {template.target_days && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-indigo-900 text-indigo-300 text-xs font-medium rounded-lg border border-indigo-700">
                      {template.target_days} days
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
      </div>
    </Modal>
  );
}
