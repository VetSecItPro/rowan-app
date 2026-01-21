'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChefHat, Plus, X, ArrowLeft, Loader2, Sparkles, Image as ImageIcon, FileText, Info } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { mealsService } from '@/lib/services/meals-service';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

type TabType = 'manual' | 'ai';

export default function NewRecipePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('manual');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '', unit: '' }]);
  const [instructions, setInstructions] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');

  // AI Import fields
  const [recipeText, setRecipeText] = useState('');
  const [recipeImage, setRecipeImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's current space
  useEffect(() => {
    const loadSpace = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/spaces');
        if (!response.ok) throw new Error('Failed to load spaces');

        const spaces = await response.json();
        if (spaces && Array.isArray(spaces) && spaces.length > 0) {
          setCurrentSpaceId(spaces[0].id);
        }
      } catch (error) {
        logger.error('Failed to load space:', error, { component: 'page', action: 'execution' });
      }
    };

    loadSpace();
  }, [user]);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) return; // Keep at least one
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

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

      const response = await csrfFetch('/api/recipes/parse', {
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

      // Pre-fill the form with parsed data
      setName(recipe.name || '');
      setDescription(recipe.description || '');
      setInstructions(recipe.instructions || '');
      setPrepTime(recipe.prep_time?.toString() || '');
      setCookTime(recipe.cook_time?.toString() || '');
      setServings(recipe.servings?.toString() || '');
      setDifficulty(recipe.difficulty || '');
      setCuisineType(recipe.cuisine_type || '');
      setTags(recipe.tags?.join(', ') || '');

      // Set ingredients
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients);
      }

      // Switch to manual tab so user can review and edit
      setActiveTab('manual');

      alert('✓ Recipe parsed successfully! Please review and edit as needed before saving.');
    } catch (error) {
      logger.error('Parse error:', error, { component: 'page', action: 'execution' });
      alert(error instanceof Error ? error.message : 'Failed to parse recipe. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSpaceId) {
      alert('Please wait while loading your space...');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a recipe name');
      return;
    }

    // Filter out empty ingredients
    const validIngredients = ingredients.filter(ing => ing.name.trim());

    if (validIngredients.length === 0) {
      alert('Please add at least one ingredient');
      return;
    }

    setLoading(true);

    try {
      await mealsService.createRecipe({
        space_id: currentSpaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        ingredients: validIngredients,
        instructions: instructions.trim() || undefined,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        cook_time: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        difficulty: difficulty || undefined,
        cuisine_type: cuisineType || undefined,
        image_url: imageUrl.trim() || undefined,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      });

      alert('✓ Recipe created successfully!');
      router.push('/recipes');
    } catch (error) {
      logger.error('Failed to create recipe:', error, { component: 'page', action: 'execution' });
      alert('Failed to create recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/recipes"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Back to recipes"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <ChefHat className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Create New Recipe</h1>
              <p className="text-orange-100 text-sm">Add your own recipe or use AI to import from anywhere</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'manual'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
              title="Enter recipe details manually"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Manual Entry
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'ai'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
              title="Use AI to parse recipe from text or image"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Import
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Import Tab */}
        {activeTab === 'ai' && (
          <div className="bg-gray-800 rounded-xl shadow-md p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
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
              <label htmlFor="recipe-text" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Paste Recipe Text
              </label>
              <textarea
                id="recipe-text"
                value={recipeText}
                onChange={(e) => setRecipeText(e.target.value)}
                placeholder="Paste your recipe here... Include ingredients, instructions, prep time, etc."
                rows={10}
                className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm min-h-[120px] bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-500"
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-800 text-gray-400">OR</span>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label htmlFor="recipe-image-upload" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Upload Recipe Image
              </label>
              <div className="space-y-3">
                <input
                  id="recipe-image-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-orange-400 transition-colors"
                  title="Click to upload an image"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImageIcon className="w-10 h-10" />
                    <span className="font-medium">Click to upload image</span>
                    <span className="text-sm">PNG, JPG, or JPEG</span>
                  </div>
                </button>

                {imagePreview && (
                  <div className="relative h-64">
                    <Image
                      src={imagePreview}
                      alt="Recipe preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover rounded-lg"
                      unoptimized
                    />
                    <button
                      onClick={() => {
                        setRecipeImage(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-5 h-5" />
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
              title={parsing ? 'Parsing recipe...' : 'Parse recipe with AI'}
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
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl shadow-md p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Basic Information</h2>

              {/* Recipe Name */}
              <div>
                <label htmlFor="recipe-name" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                  Recipe Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipe-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Grandma's Apple Pie"
                  required
                  className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="recipe-description" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                  Description
                </label>
                <textarea
                  id="recipe-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the recipe..."
                  rows={3}
                  className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm min-h-[120px] bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                />
              </div>

              {/* Image URL */}
              <div>
                <label htmlFor="recipe-image-url" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                  Image URL
                </label>
                <input
                  id="recipe-image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                  title="Optional: Add a URL to an image for this recipe"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Ingredients <span className="text-red-500">*</span>
                </h2>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
                  title="Add another ingredient"
                >
                  <Plus className="w-4 h-4" />
                  Add Ingredient
                </button>
              </div>

              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      placeholder="Ingredient name"
                      className="flex-1 px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                    />
                    <input
                      type="text"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-24 px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                      title="e.g., 2, 1/2, 3.5"
                    />
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-24 px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                      title="e.g., cups, tsp, oz"
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove this ingredient"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label htmlFor="recipe-instructions" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Instructions
              </label>
              <textarea
                id="recipe-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step-by-step cooking instructions..."
                rows={8}
                className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm min-h-[120px] bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
              />
            </div>

            {/* Recipe Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Recipe Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Prep Time */}
                <div>
                  <label htmlFor="recipe-prep-time" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                    Prep Time (minutes)
                  </label>
                  <input
                    id="recipe-prep-time"
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="30"
                    min="0"
                    className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                    title="Time to prepare ingredients"
                  />
                </div>

                {/* Cook Time */}
                <div>
                  <label htmlFor="recipe-cook-time" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                    Cook Time (minutes)
                  </label>
                  <input
                    id="recipe-cook-time"
                    type="number"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    placeholder="45"
                    min="0"
                    className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                    title="Time to cook the recipe"
                  />
                </div>

                {/* Servings */}
                <div>
                  <label htmlFor="recipe-servings" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                    Servings
                  </label>
                  <input
                    id="recipe-servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                    min="1"
                    className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                    title="Number of servings"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label htmlFor="recipe-difficulty" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                    Difficulty
                  </label>
                  <select
                    id="recipe-difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                    title="Recipe difficulty level"
                  >
                    <option value="">Select difficulty...</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Cuisine Type */}
                <div>
                  <label htmlFor="recipe-cuisine-type" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                    Cuisine Type
                  </label>
                  <input
                    id="recipe-cuisine-type"
                    type="text"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    placeholder="e.g., Italian, Mexican, Asian"
                    className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                    title="Type of cuisine"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="recipe-tags" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                  Tags (comma-separated)
                </label>
                <input
                  id="recipe-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="dessert, holiday, vegetarian"
                  className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white"
                  title="Add tags to categorize this recipe"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
              <Link
                href="/recipes"
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={loading ? 'Creating recipe...' : 'Create recipe'}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Recipe
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
