'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, FileText, Info, Image as ImageIcon, Loader2, Search, Globe } from 'lucide-react';
import { CreateRecipeInput, Recipe } from '@/lib/services/meals-service';
import ImageUpload from '@/components/shared/ImageUpload';
import { searchExternalRecipes, searchByCuisine, getRandomRecipes, SUPPORTED_CUISINES, ExternalRecipe } from '@/lib/services/external-recipes-service';
import { RecipePreviewModal } from '@/components/meals/RecipePreviewModal';

interface NewRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: CreateRecipeInput) => void;
  editRecipe?: Recipe | null;
  spaceId: string;
  initialTab?: TabType;
  onRecipeAdded?: (recipeData: CreateRecipeInput) => void;
}

type TabType = 'manual' | 'ai' | 'discover';

export function NewRecipeModal({ isOpen, onClose, onSave, editRecipe, spaceId, initialTab = 'manual', onRecipeAdded }: NewRecipeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
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

  // Discover Recipes state
  const [searchQuery, setSearchQuery] = useState('');
  const [externalRecipes, setExternalRecipes] = useState<ExternalRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<ExternalRecipe | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCuisineDropdown, setShowCuisineDropdown] = useState(false);

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
    setActiveTab(initialTab);
    setRecipeText('');
    setRecipeImage(null);
    setImagePreview(null);
    setParsing(false);
  }, [editRecipe, spaceId, isOpen, initialTab]);

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

  // Discover Recipes handlers
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await searchExternalRecipes(searchQuery);
      setExternalRecipes(results);
    } catch (error) {
      console.error('Search error:', error);
      setExternalRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseCuisine = async (cuisine: string) => {
    setLoading(true);
    try {
      const results = await searchByCuisine(cuisine);
      setExternalRecipes(results);
      setSearchQuery(cuisine); // Show the cuisine in search box
    } catch (error) {
      console.error('Cuisine browse error:', error);
      setExternalRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRandom = async () => {
    setLoading(true);
    try {
      const results = await getRandomRecipes(12);
      setExternalRecipes(results);
      setSearchQuery(''); // Clear search when loading random
    } catch (error) {
      console.error('Random recipes error:', error);
      setExternalRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = (recipe: ExternalRecipe) => {
    // Convert external recipe to our format
    const recipeData: CreateRecipeInput = {
      space_id: spaceId,
      name: recipe.name,
      description: recipe.description || '',
      ingredients: recipe.ingredients.map(ing =>
        [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
      ),
      instructions: recipe.instructions || '',
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      cuisine_type: recipe.cuisine,
      image_url: recipe.image_url || '',
      tags: recipe.cuisine ? [recipe.cuisine] : [],
    };

    // If onRecipeAdded is provided, this was opened from meal planning
    // Pass the recipe data back instead of saving directly
    if (onRecipeAdded) {
      onRecipeAdded(recipeData);
      onClose();
    } else {
      // Normal flow - save and close
      onSave(recipeData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-meals px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {editRecipe ? 'Edit Recipe' : 'Create New Recipe'}
            </h2>
            <button onClick={onClose} aria-label="Close modal" className="p-2 flex items-center justify-center hover:opacity-75 transition-opacity">
              <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content - scrollable with fixed height */}
        <div className="flex-1 overflow-y-auto">
          {/* Toggle Buttons - In Content Area */}
          {!editRecipe && (
            <div className="p-6 pb-0">
              <div className="inline-flex items-center gap-1 sm:gap-2 p-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-200 dark:border-orange-700">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm min-w-[130px] ${
                    activeTab === 'manual'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Manual Entry</span>
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm min-w-[130px] ${
                    activeTab === 'ai'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Import</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('discover');
                    if (externalRecipes.length === 0) handleLoadRandom();
                  }}
                  className={`btn-touch px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm min-w-[130px] hover-lift active-press ${
                    activeTab === 'discover'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Discover</span>
                </button>
              </div>
            </div>
          )}

          {/* AI Import Tab */}
          {activeTab === 'ai' && !editRecipe && (
            <div className="p-6 pt-4 space-y-6 h-full">
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
                <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Paste Recipe Text
                </label>
                <textarea
                  value={recipeText}
                  id="field-1"
              onChange={(e) =>  setRecipeText(e.target.value)}
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
                  <span className="px-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">OR</span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Upload Recipe Image
                </label>
                <div className="space-y-3 max-w-md">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  id="field-2" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-touch w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 dark:hover:border-orange-400 transition-colors hover-lift active-press shimmer-orange"
                  >
                    <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                      <span className="font-medium text-sm">Click to upload</span>
                      <span className="text-xs">PNG, JPG, or JPEG</span>
                    </div>
                  </button>

                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Recipe preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setRecipeImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="btn-touch absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shimmer-red active-press hover-lift"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Parse Button */}
              <button
                onClick={handleParseRecipe}
                disabled={parsing || (!recipeText && !recipeImage)}
                className="btn-touch w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shimmer-orange hover-lift active-press"
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

          {/* Discover Recipes Tab */}
          {activeTab === 'discover' && !editRecipe && (
            <div className="p-6 pt-4 space-y-6 h-full">
              {/* Search Bar */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search recipes (e.g., 'pasta', 'chicken curry', 'chocolate cake')..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !searchQuery.trim()}
                    className="btn-touch px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shimmer-orange hover-lift active-press"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleLoadRandom}
                    disabled={loading}
                    className="btn-touch px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 text-sm font-medium hover-lift active-press"
                  >
                    🎲 Random Recipes
                  </button>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

                  {/* Cuisine Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCuisineDropdown(!showCuisineDropdown)}
                      disabled={loading}
                      className="btn-touch px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2 shimmer-orange hover-lift active-press"
                    >
                      🍽️ Browse by Cuisine
                      <span className="text-xs">▼</span>
                    </button>

                    {showCuisineDropdown && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowCuisineDropdown(false)}
                        />

                        {/* Dropdown Menu */}
                        <div className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-20">
                          <div className="p-2 space-y-1">
                            {SUPPORTED_CUISINES.map((cuisine) => (
                              <button
                                key={cuisine.value}
                                onClick={() => {
                                  handleBrowseCuisine(cuisine.value);
                                  setShowCuisineDropdown(false);
                                }}
                                disabled={loading}
                                className="btn-touch w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300 disabled:opacity-50 active-press hover-lift"
                              >
                                <span className="text-lg">{cuisine.flag}</span>
                                <span>{cuisine.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Searching recipes...</p>
                </div>
              )}

              {/* Results */}
              {!loading && externalRecipes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Found {externalRecipes.length} recipe{externalRecipes.length > 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                    {externalRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setShowPreview(true);
                        }}
                        className="btn-touch text-left p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-orange-500 dark:hover:border-orange-400 transition-all group hover-lift active-press shimmer-orange"
                      >
                        {recipe.image_url && (
                          <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <img
                              src={recipe.image_url}
                              alt={recipe.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                          {recipe.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                            {recipe.source}
                          </span>
                          {recipe.cuisine && (
                            <span>{recipe.cuisine}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && externalRecipes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Discover Recipes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
                    Search for recipes or browse by cuisine to find inspiration from multiple recipe APIs.
                  </p>
                  <button
                    onClick={handleLoadRandom}
                    className="btn-touch px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all flex items-center gap-2 font-medium shimmer-orange hover-lift active-press"
                  >
                    🎲 Load Random Recipes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className={`p-6 space-y-4 h-full ${!editRecipe ? 'pt-4' : ''}`}>
              <div>
                <label htmlFor="field-3" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Recipe Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  id="field-3"
              onChange={(e) =>  setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spaghetti Bolognese"
                  className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="field-4" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Description</label>
                <textarea
                  value={formData.description}
                  id="field-4"
              onChange={(e) =>  setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of the recipe"
                  className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="field-5" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.prep_time || ''}
                    id="field-5"
              onChange={(e) =>  setFormData({ ...formData, prep_time: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="field-6" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Cook Time (min)</label>
                  <input
                    type="number"
                    value={formData.cook_time || ''}
                    id="field-6"
              onChange={(e) =>  setFormData({ ...formData, cook_time: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="field-7" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Servings</label>
                  <input
                    type="number"
                    value={formData.servings || ''}
                    id="field-7"
              onChange={(e) =>  setFormData({ ...formData, servings: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="field-8" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Ingredients *</label>
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
                          id="field-8"
              onChange={(e) =>  updateIngredient(index, e.target.value)}
                          placeholder="e.g., 2 cups flour"
                          className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                        />
                        {formData.ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="btn-touch p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg active-press hover-lift"
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
                    className="btn-touch px-4 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg flex items-center gap-2 text-sm font-medium hover-lift active-press"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="field-9" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Instructions</label>
                <textarea
                  value={formData.instructions}
                  id="field-9"
              onChange={(e) =>  setFormData({ ...formData, instructions: e.target.value })}
                  rows={6}
                  placeholder="Step-by-step cooking instructions..."
                  className="w-full input-mobile bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label htmlFor="field-10" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Recipe Image</label>
                <div className="w-full max-w-sm">
                  <ImageUpload
                    label=""
                    description="Upload a photo"
                    currentImageUrl={formData.image_url}
                    onUploadSuccess={(url) => setFormData({ ...formData, image_url: url })}
                    uploadEndpoint="/api/upload/recipe"
                    maxSizeMB={10}
                    aspectRatio="landscape"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="field-11" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 cursor-pointer">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    id="field-11"
              onChange={(e) =>  setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag (e.g., Italian, Quick, Vegetarian)"
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="btn-touch px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shimmer-orange hover-lift active-press"
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
                          className="btn-touch hover:text-orange-900 dark:hover:text-orange-100 active-press hover-lift"
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
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all">
                  {editRecipe ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Recipe Preview Modal */}
      <RecipePreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
        onPlanMeal={(recipe) => {
          // This would need to be handled by the parent, for now just add to library
          handleAddToLibrary(recipe);
        }}
        onAddToLibrary={handleAddToLibrary}
      />
    </div>
  );
}
