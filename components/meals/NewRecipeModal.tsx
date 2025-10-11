'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, FileText, Info, Image as ImageIcon, Loader2 } from 'lucide-react';
import { CreateRecipeInput, Recipe } from '@/lib/services/meals-service';

interface NewRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: CreateRecipeInput) => void;
  editRecipe?: Recipe | null;
  spaceId: string;
}

type TabType = 'manual' | 'ai';

export function NewRecipeModal({ isOpen, onClose, onSave, editRecipe, spaceId }: NewRecipeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [formData, setFormData] = useState<CreateRecipeInput>({
    space_id: spaceId,
    name: '',
    description: '',
    ingredients: [''],
    instructions: '',
    prep_time: undefined,
    cook_time: undefined,
    servings: undefined,
    image_url: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  // AI Import state
  const [recipeText, setRecipeText] = useState('');
  const [recipeImage, setRecipeImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editRecipe) {
      setFormData({
        space_id: spaceId,
        name: editRecipe.name,
        description: editRecipe.description || '',
        ingredients: editRecipe.ingredients || [''],
        instructions: editRecipe.instructions || '',
        prep_time: editRecipe.prep_time,
        cook_time: editRecipe.cook_time,
        servings: editRecipe.servings,
        image_url: editRecipe.image_url || '',
        tags: editRecipe.tags || [],
      });
    } else {
      setFormData({
        space_id: spaceId,
        name: '',
        description: '',
        ingredients: [''],
        instructions: '',
        prep_time: undefined,
        cook_time: undefined,
        servings: undefined,
        image_url: '',
        tags: [],
      });
    }
    // Reset AI import fields when modal opens/closes
    setActiveTab('manual');
    setRecipeText('');
    setRecipeImage(null);
    setImagePreview(null);
    setParsing(false);
  }, [editRecipe, spaceId, isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecipeImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleParseRecipe = async () => {
    if (!recipeText && !recipeImage) {
      alert('Please provide either recipe text or an image');
      return;
    }

    setParsing(true);

    try {
      let imageBase64 = null;

      if (recipeImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(recipeImage);
        });
      }

      const response = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: recipeText,
          imageBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse recipe');
      }

      const recipe = data.recipe;

      // Convert ingredients to proper format
      let parsedIngredients: any[] = [];
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        parsedIngredients = recipe.ingredients.map((ing: any) => {
          if (typeof ing === 'object' && ing.name) {
            // Keep as object with name, amount, unit
            return ing;
          } else if (typeof ing === 'string') {
            // Convert string to simple string for modal
            return ing;
          }
          return ing;
        });
      }

      // Pre-fill the form with parsed data
      setFormData({
        space_id: spaceId,
        name: recipe.name || '',
        description: recipe.description || '',
        ingredients: parsedIngredients.length > 0 ? parsedIngredients : [''],
        instructions: recipe.instructions || '',
        prep_time: recipe.prep_time || undefined,
        cook_time: recipe.cook_time || undefined,
        servings: recipe.servings || undefined,
        difficulty: recipe.difficulty || undefined,
        cuisine_type: recipe.cuisine_type || undefined,
        image_url: '',
        tags: recipe.tags || [],
      });

      // Switch to manual tab so user can review and edit
      setActiveTab('manual');

      alert('✓ Recipe parsed successfully! Please review and edit as needed before saving.');
    } catch (error) {
      console.error('Parse error:', error);
      alert(error instanceof Error ? error.message : 'Failed to parse recipe. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty ingredients
    const cleanedIngredients = Array.isArray(formData.ingredients)
      ? formData.ingredients.filter((i: any) => {
          if (typeof i === 'string') return i.trim() !== '';
          if (typeof i === 'object') return i.name?.trim() !== '';
          return false;
        })
      : [];

    const cleanedData = {
      ...formData,
      ingredients: cleanedIngredients,
    };
    onSave(cleanedData);
    onClose();
  };

  const addIngredient = () => {
    setFormData({ ...formData, ingredients: [...formData.ingredients, ''] });
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 border-b border-orange-200 dark:border-orange-800 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {editRecipe ? 'Edit Recipe' : 'Create New Recipe'}
            </h2>
            <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Buttons */}
          {!editRecipe && (
            <div className="flex items-center gap-1 p-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-700">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${
                  activeTab === 'manual'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Manual Entry</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium ${
                  activeTab === 'ai'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI Import</span>
              </button>
            </div>
          )}
        </div>

        {/* Content - scrollable with fixed min-height */}
        <div className="flex-1 overflow-y-auto">
          {/* AI Import Tab */}
          {activeTab === 'ai' && !editRecipe && (
            <div className="p-6 space-y-6 min-h-[600px]">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-1">How AI Import Works</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Paste recipe text from a website, blog, or document</li>
                    <li>Or upload a screenshot/photo of a recipe</li>
                    <li>AI will extract ingredients, instructions, and cooking details</li>
                    <li>Review and edit the parsed data before saving</li>
                  </ul>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paste Recipe Text
                </label>
                <textarea
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder="Paste your recipe here... Include ingredients, instructions, prep time, etc."
                  rows={8}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-500 resize-none"
                />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">OR</span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Recipe Image
                </label>
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-400 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
                      <ImageIcon className="w-10 h-10" />
                      <span className="font-medium">Click to upload image</span>
                      <span className="text-sm">PNG, JPG, or JPEG</span>
                    </div>
                  </button>

                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Recipe preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setRecipeImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Parse Button */}
              <button
                onClick={handleParseRecipe}
                disabled={parsing || (!recipeText && !recipeImage)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Parsing Recipe...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Parse Recipe with AI
                  </>
                )}
              </button>
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 min-h-[600px]">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Recipe Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spaghetti Bolognese"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of the recipe"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.prep_time || ''}
                    onChange={(e) => setFormData({ ...formData, prep_time: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Cook Time (min)</label>
                  <input
                    type="number"
                    value={formData.cook_time || ''}
                    onChange={(e) => setFormData({ ...formData, cook_time: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Servings</label>
                  <input
                    type="number"
                    value={formData.servings || ''}
                    onChange={(e) => setFormData({ ...formData, servings: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Ingredients *</label>
                <div className="space-y-2">
                  {formData.ingredients.map((ingredient, index) => {
                    const displayValue = typeof ingredient === 'string'
                      ? ingredient
                      : ingredient.amount && ingredient.unit
                        ? `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`
                        : ingredient.name || '';

                    return (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={displayValue}
                          onChange={(e) => updateIngredient(index, e.target.value)}
                          placeholder="e.g., 2 cups flour"
                          className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                        />
                        {formData.ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="px-4 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Instructions</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={6}
                  placeholder="Step-by-step cooking instructions..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag (e.g., Italian, Quick, Vegetarian)"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Add
                  </button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-orange-900 dark:hover:text-orange-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg">
                  {editRecipe ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
