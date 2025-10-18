'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ChefHat, Clock, Users, Trash2, ExternalLink, Filter, X } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { mealsService, type Recipe } from '@/lib/services/meals-service';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Link from 'next/link';

export default function RecipesPage() {
  const { user } = useAuth();
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, recipeId: '' });

  // Load user's current space
  useEffect(() => {
    const loadSpace = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/spaces');
        if (!response.ok) throw new Error('Failed to load spaces');

        const spaces = await response.json();
        if (spaces && Array.isArray(spaces) && spaces.length > 0) {
          setCurrentSpaceId(spaces[0].id);
        }
      } catch (error) {
        console.error('Failed to load space:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpace();
  }, [user]);

  // Load recipes when space is available
  useEffect(() => {
    if (!currentSpaceId) return;

    const loadRecipes = async () => {
      setLoading(true);
      try {
        const data = await mealsService.getRecipes(currentSpaceId);
        setRecipes(data);
      } catch (error) {
        console.error('Failed to load recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, [currentSpaceId]);

  // Get unique cuisines and difficulties from recipes
  const cuisines = useMemo(() => {
    const unique = new Set(recipes.map(r => r.cuisine_type).filter(Boolean));
    return Array.from(unique).sort();
  }, [recipes]);

  const difficulties = useMemo(() => {
    const unique = new Set(recipes.map(r => r.difficulty).filter(Boolean));
    return Array.from(unique).sort();
  }, [recipes]);

  // Filter recipes based on search and filters
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Search filter
      const matchesSearch = !searchQuery ||
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Cuisine filter
      const matchesCuisine = !selectedCuisine || recipe.cuisine_type === selectedCuisine;

      // Difficulty filter
      const matchesDifficulty = !selectedDifficulty || recipe.difficulty === selectedDifficulty;

      return matchesSearch && matchesCuisine && matchesDifficulty;
    });
  }, [recipes, searchQuery, selectedCuisine, selectedDifficulty]);

  const handleDelete = async (recipeId: string) => {
    setConfirmDialog({ isOpen: true, recipeId });
  };

  const handleConfirmDelete = async () => {
    const recipeId = confirmDialog.recipeId;
    setConfirmDialog({ isOpen: false, recipeId: '' });
    setDeletingId(recipeId);
    try {
      await mealsService.deleteRecipe(recipeId);
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCuisine(null);
    setSelectedDifficulty(null);
  };

  const hasActiveFilters = searchQuery || selectedCuisine || selectedDifficulty;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ChefHat className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Recipe Library</h1>
                <p className="text-orange-100 mt-1">Manage your saved recipes</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/recipes/discover"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/20"
              >
                Discover Recipes
              </Link>
              <Link
                href="/recipes/new"
                className="px-4 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Recipe
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className={`apple-search-container group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
              <Search className="apple-search-icon" />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchTyping(true);
                  setTimeout(() => setIsSearchTyping(false), 300);
                }}
                placeholder="Search recipes..."
                className="apple-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="apple-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ✕ Clear all
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
            {/* Cuisine Filter */}
            {cuisines.length > 0 && (
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <label htmlFor="cuisine-filter-mobile" className="text-sm font-medium text-gray-600 dark:text-gray-400 md:font-normal">Cuisine:</label>

                {/* Mobile: Dropdown if 3+ options */}
                {cuisines.length >= 3 ? (
                  <select
                    id="cuisine-filter-mobile"
                    value={selectedCuisine || ''}
                    onChange={(e) => setSelectedCuisine(e.target.value || null)}
                    className="md:hidden w-full px-4 py-3 text-base bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white font-medium appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                  >
                    <option value="">All Cuisines</option>
                    {cuisines.map((cuisine) => (
                      <option key={cuisine} value={cuisine || ''}>{cuisine}</option>
                    ))}
                  </select>
                ) : (
                  /* Mobile: Pills if 1-2 options */
                  <div className="md:hidden flex flex-wrap gap-2">
                    {cuisines.map((cuisine) => (
                      <button
                        key={cuisine}
                        onClick={() => setSelectedCuisine(cuisine === selectedCuisine ? null : (cuisine || null))}
                        className={`px-4 py-2.5 text-sm min-h-[44px] rounded-full font-medium transition-colors ${
                          selectedCuisine === cuisine
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>
                )}

                {/* Desktop: Always use pills */}
                <div className="hidden md:flex flex-wrap gap-2">
                  {cuisines.map((cuisine) => (
                    <button
                      key={cuisine}
                      onClick={() => setSelectedCuisine(cuisine === selectedCuisine ? null : (cuisine || null))}
                      className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                        selectedCuisine === cuisine
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty Filter */}
            {difficulties.length > 0 && (
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <label htmlFor="difficulty-filter-mobile" className="text-sm font-medium text-gray-600 dark:text-gray-400 md:font-normal">Difficulty:</label>

                {/* Mobile: Dropdown if 3+ options */}
                {difficulties.length >= 3 ? (
                  <select
                    id="difficulty-filter-mobile"
                    value={selectedDifficulty || ''}
                    onChange={(e) => setSelectedDifficulty(e.target.value || null)}
                    className="md:hidden w-full px-4 py-3 text-base bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white font-medium appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                  >
                    <option value="">All Difficulties</option>
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty || ''}>{difficulty}</option>
                    ))}
                  </select>
                ) : (
                  /* Mobile: Pills if 1-2 options */
                  <div className="md:hidden flex flex-wrap gap-2">
                    {difficulties.map((difficulty) => (
                      <button
                        key={difficulty}
                        onClick={() => setSelectedDifficulty(difficulty === selectedDifficulty ? null : (difficulty || null))}
                        className={`px-4 py-2.5 text-sm min-h-[44px] rounded-full font-medium transition-colors ${
                          selectedDifficulty === difficulty
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                )}

                {/* Desktop: Always use pills */}
                <div className="hidden md:flex flex-wrap gap-2">
                  {difficulties.map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty === selectedDifficulty ? null : (difficulty || null))}
                      className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                        selectedDifficulty === difficulty
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600 dark:text-gray-400">
            {filteredRecipes.length === recipes.length
              ? `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`
              : `${filteredRecipes.length} of ${recipes.length} recipes`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading recipes...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && recipes.length === 0 && (
          <div className="text-center py-12">
            <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No recipes yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start building your recipe collection
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/recipes/discover"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all"
              >
                Discover Recipes
              </Link>
              <Link
                href="/recipes/new"
                className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-orange-600 dark:text-orange-400 border-2 border-orange-600 dark:border-orange-400 rounded-lg font-medium hover:bg-orange-50 dark:hover:bg-gray-700 transition-all"
              >
                Create Recipe
              </Link>
            </div>
          </div>
        )}

        {/* No Results State */}
        {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No recipes found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your filters or search query
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && filteredRecipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Recipe Image */}
                {recipe.image_url ? (
                  <div className="h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <ChefHat className="w-16 h-16 text-white/30" />
                  </div>
                )}

                <div className="p-5">
                  {/* Recipe Name */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {recipe.name}
                  </h3>

                  {/* Description */}
                  {recipe.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {(() => {
                      const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
                      if (totalTime > 0) {
                        return (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{totalTime} min</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{recipe.servings}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.cuisine_type && (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                        {recipe.cuisine_type}
                      </span>
                    )}
                    {recipe.difficulty && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                        {recipe.difficulty}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all text-center"
                    >
                      View Recipe
                    </Link>
                    {recipe.source_url && (
                      <a
                        href={recipe.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="View original source"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      disabled={deletingId === recipe.id}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete recipe"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, recipeId: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Recipe"
        message="Are you sure you want to delete this recipe? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
