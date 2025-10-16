'use client';

import { useState, useEffect } from 'react';
import {
  Tags,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Palette,
  DollarSign,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import {
  type CustomCategory,
  type Tag,
  type CreateCustomCategoryInput,
  type CreateTagInput,
  getCustomCategories,
  getTags,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  createTag,
  updateTag,
  deleteTag,
} from '@/lib/services/categories-tags-service';

interface CategoryTagManagerProps {
  spaceId: string;
  userId: string;
  onClose: () => void;
}

type TabType = 'categories' | 'tags';

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
];

const POPULAR_ICONS = [
  'Coffee', 'ShoppingCart', 'Car', 'Home', 'Utensils', 'Heart', 'Gamepad2',
  'Plane', 'GraduationCap', 'Briefcase', 'Dumbbell', 'Music', 'Film', 'Book',
  'Gift', 'Palette', 'Scissors', 'Wrench', 'Smartphone', 'Laptop',
];

export function CategoryTagManager({ spaceId, userId, onClose }: CategoryTagManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Category form state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('FolderOpen');
  const [categoryColor, setCategoryColor] = useState('#6366f1');
  const [categoryBudget, setCategoryBudget] = useState('');

  // Tag form state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagDescription, setTagDescription] = useState('');
  const [tagColor, setTagColor] = useState('#8b5cf6');

  useEffect(() => {
    loadData();
  }, [spaceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, tagsData] = await Promise.all([
        getCustomCategories(spaceId),
        getTags(spaceId),
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Category handlers
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        // Update existing
        await updateCustomCategory(editingCategory.id, {
          name: categoryName,
          description: categoryDescription || undefined,
          icon: categoryIcon,
          color: categoryColor,
          monthly_budget: categoryBudget ? parseFloat(categoryBudget) : undefined,
        });
      } else {
        // Create new
        await createCustomCategory({
          space_id: spaceId,
          name: categoryName,
          description: categoryDescription,
          icon: categoryIcon,
          color: categoryColor,
          monthly_budget: categoryBudget ? parseFloat(categoryBudget) : undefined,
          created_by: userId,
        });
      }
      await loadData();
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const handleEditCategory = (category: CustomCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setCategoryIcon(category.icon || 'FolderOpen');
    setCategoryColor(category.color);
    setCategoryBudget(category.monthly_budget?.toString() || '');
    setIsAddingCategory(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCustomCategory(categoryId);
      await loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const resetCategoryForm = () => {
    setIsAddingCategory(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setCategoryIcon('FolderOpen');
    setCategoryColor('#6366f1');
    setCategoryBudget('');
  };

  // Tag handlers
  const handleSaveTag = async () => {
    try {
      if (editingTag) {
        // Update existing
        await updateTag(editingTag.id, {
          name: tagName,
          description: tagDescription || undefined,
          color: tagColor,
        });
      } else {
        // Create new
        await createTag({
          space_id: spaceId,
          name: tagName,
          description: tagDescription,
          color: tagColor,
          created_by: userId,
        });
      }
      await loadData();
      resetTagForm();
    } catch (error) {
      console.error('Error saving tag:', error);
      alert('Failed to save tag');
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagDescription(tag.description || '');
    setTagColor(tag.color);
    setIsAddingTag(true);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await deleteTag(tagId);
      await loadData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag');
    }
  };

  const resetTagForm = () => {
    setIsAddingTag(false);
    setEditingTag(null);
    setTagName('');
    setTagDescription('');
    setTagColor('#8b5cf6');
  };

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.FolderOpen;
    return IconComponent;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Category & Tag Manager
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'categories'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Categories ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'tags'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Tags className="w-4 h-4" />
              Tags ({tags.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'categories' && (
            <div className="space-y-4">
              {/* Add Category Button */}
              {!isAddingCategory && (
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Plus className="w-5 h-5" />
                  Add Custom Category
                </button>
              )}

              {/* Category Form */}
              {isAddingCategory && (
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </h3>

                  <input
                    type="text"
                    placeholder="Category name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />

                  <textarea
                    placeholder="Description (optional)"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={2}
                  />

                  {/* Icon Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Icon
                    </label>
                    <div className="grid grid-cols-10 gap-2">
                      {POPULAR_ICONS.map((iconName) => {
                        const IconComponent = getIconComponent(iconName);
                        return (
                          <button
                            key={iconName}
                            onClick={() => setCategoryIcon(iconName)}
                            className={`p-2 rounded-lg transition-colors ${
                              categoryIcon === iconName
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setCategoryColor(color)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            categoryColor === color ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Monthly Budget */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Monthly budget (optional)"
                      value={categoryBudget}
                      onChange={(e) => setCategoryBudget(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCategory}
                      disabled={!categoryName.trim()}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Save
                    </button>
                    <button
                      onClick={resetCategoryForm}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Categories List */}
              <div className="space-y-2">
                {categories.map((category) => {
                  const IconComponent = getIconComponent(category.icon || 'FolderOpen');
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: category.color + '20', color: category.color }}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                          )}
                          {category.monthly_budget && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Budget: ${category.monthly_budget.toFixed(2)}/month
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {categories.length === 0 && !isAddingCategory && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No custom categories yet.</p>
                    <p className="text-sm mt-1">Create your first category above!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              {/* Add Tag Button */}
              {!isAddingTag && (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Plus className="w-5 h-5" />
                  Add Tag
                </button>
              )}

              {/* Tag Form */}
              {isAddingTag && (
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {editingTag ? 'Edit Tag' : 'New Tag'}
                  </h3>

                  <input
                    type="text"
                    placeholder="Tag name"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />

                  <textarea
                    placeholder="Description (optional)"
                    value={tagDescription}
                    onChange={(e) => setTagDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={2}
                  />

                  {/* Color Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setTagColor(color)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            tagColor === color ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveTag}
                      disabled={!tagName.trim()}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Save
                    </button>
                    <button
                      onClick={resetTagForm}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Tags List */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {tag.name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditTag(tag)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {tags.length === 0 && !isAddingTag && (
                  <div className="w-full text-center py-8 text-gray-500 dark:text-gray-400">
                    <Tags className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tags yet.</p>
                    <p className="text-sm mt-1">Create your first tag above!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
