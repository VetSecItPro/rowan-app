'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  FolderPlus,
  Search,
  Filter,
  Palette,
  DollarSign,
  Eye,
  EyeOff,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  CustomCategory,
  Tag as TagType,
  getCustomCategories,
  getTags,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  createTag,
  updateTag,
  deleteTag,
  getCategoryHierarchy,
  getSubcategories
} from '@/lib/services/categories-tags-service';
import {
  DefaultCategory,
  getDefaultCategoriesForDomain,
  getAllDefaultCategories
} from '@/lib/constants/default-categories';
import { cn } from '@/lib/utils';

interface CategoryManagerProps {
  domain?: 'expense' | 'task' | 'goal' | 'universal';
  showTags?: boolean;
  showBudgets?: boolean;
  className?: string;
}

interface NewCategoryForm {
  name: string;
  description: string;
  icon: string;
  color: string;
  parent_category_id: string;
  monthly_budget: string;
}

interface NewTagForm {
  name: string;
  description: string;
  color: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#64748b', '#dc2626', '#ea580c', '#059669',
  '#0284c7', '#7c3aed', '#db2777', '#0891b2'
];

const PRESET_ICONS = [
  '📁', '💼', '🏠', '🚗', '🛒', '🎭', '💰', '🏥',
  '🎯', '📚', '🎨', '✈️', '🍽️', '💪', '📱', '⚡',
  '🔧', '🎵', '📝', '🌟', '🔥', '💡', '🚀', '🎲'
];

export function CategoryManager({ domain, showTags = true, showBudgets = true, className }: CategoryManagerProps) {
  const { currentSpace, user } = useAuth();
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CustomCategory | null>(null);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);
  const [showDefaultsDialog, setShowDefaultsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('categories');

  const [newCategoryForm, setNewCategoryForm] = useState<NewCategoryForm>({
    name: '',
    description: '',
    icon: '📁',
    color: '#3b82f6',
    parent_category_id: '',
    monthly_budget: ''
  });

  const [newTagForm, setNewTagForm] = useState<NewTagForm>({
    name: '',
    description: '',
    color: '#8b5cf6'
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!currentSpace) return;

      try {
        setLoading(true);
        const [categoriesData, tagsData] = await Promise.all([
          getCustomCategories(currentSpace.id, showInactive),
          showTags ? getTags(currentSpace.id) : Promise.resolve([])
        ]);
        setCategories(categoriesData);
        setTags(tagsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories and tags');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentSpace, showInactive, showTags]);

  // Filter categories
  const filteredCategories = categories.filter(category => {
    if (searchQuery) {
      return category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             category.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Filter tags
  const filteredTags = tags.filter(tag => {
    if (searchQuery) {
      return tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             tag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Handle create category
  const handleCreateCategory = async () => {
    if (!currentSpace || !user) return;

    try {
      const categoryData = {
        space_id: currentSpace.id,
        name: newCategoryForm.name,
        description: newCategoryForm.description,
        icon: newCategoryForm.icon,
        color: newCategoryForm.color,
        parent_category_id: newCategoryForm.parent_category_id || undefined,
        monthly_budget: newCategoryForm.monthly_budget ? parseFloat(newCategoryForm.monthly_budget) : undefined,
        created_by: user.id
      };

      const newCategory = await createCustomCategory(categoryData);
      setCategories(prev => [...prev, newCategory]);
      setShowNewCategoryDialog(false);
      setNewCategoryForm({
        name: '',
        description: '',
        icon: '📁',
        color: '#3b82f6',
        parent_category_id: '',
        monthly_budget: ''
      });
    } catch (err) {
      setError('Failed to create category');
    }
  };

  // Handle create tag
  const handleCreateTag = async () => {
    if (!currentSpace || !user) return;

    try {
      const tagData = {
        space_id: currentSpace.id,
        name: newTagForm.name,
        description: newTagForm.description,
        color: newTagForm.color,
        created_by: user.id
      };

      const newTag = await createTag(tagData);
      setTags(prev => [...prev, newTag]);
      setShowNewTagDialog(false);
      setNewTagForm({
        name: '',
        description: '',
        color: '#8b5cf6'
      });
    } catch (err) {
      setError('Failed to create tag');
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCustomCategory(categoryId);
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      setSelectedCategory(null);
    } catch (err) {
      setError('Failed to delete category');
    }
  };

  // Handle delete tag
  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      setTags(prev => prev.filter(t => t.id !== tagId));
      setSelectedTag(null);
    } catch (err) {
      setError('Failed to delete tag');
    }
  };

  // Handle create from defaults
  const handleCreateFromDefaults = async (defaults: DefaultCategory[]) => {
    if (!currentSpace || !user) return;

    try {
      const promises = defaults.map(defaultCat =>
        createCustomCategory({
          space_id: currentSpace.id,
          name: defaultCat.name,
          description: defaultCat.description,
          icon: defaultCat.icon,
          color: defaultCat.color,
          monthly_budget: defaultCat.monthly_budget,
          created_by: user.id
        })
      );

      const newCategories = await Promise.all(promises);
      setCategories(prev => [...prev, ...newCategories]);
      setShowDefaultsDialog(false);
    } catch (err) {
      setError('Failed to create categories from defaults');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>Loading categories...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Category & Tag Manager
            </CardTitle>
            <CardDescription>
              Organize your {domain ? `${domain} ` : ''}items with custom categories and tags
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDefaultsDialog(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Defaults
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories and tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Categories ({filteredCategories.length})
            </TabsTrigger>
            {showTags && (
              <TabsTrigger value="tags" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags ({filteredTags.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Categories</h3>
              <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>
                      Add a custom category to organize your items
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newCategoryForm.name}
                        onChange={(e) => setNewCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Category name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newCategoryForm.description}
                        onChange={(e) => setNewCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Icon</Label>
                        <Select
                          value={newCategoryForm.icon}
                          onValueChange={(value) => setNewCategoryForm(prev => ({ ...prev, icon: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRESET_ICONS.map((icon) => (
                              <SelectItem key={icon} value={icon}>
                                <span className="text-lg">{icon}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={cn(
                                "w-6 h-6 rounded border-2",
                                newCategoryForm.color === color ? "border-foreground" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewCategoryForm(prev => ({ ...prev, color }))}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {showBudgets && (
                      <div>
                        <Label htmlFor="budget">Monthly Budget (optional)</Label>
                        <Input
                          id="budget"
                          type="number"
                          step="0.01"
                          value={newCategoryForm.monthly_budget}
                          onChange={(e) => setNewCategoryForm(prev => ({ ...prev, monthly_budget: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowNewCategoryDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateCategory}
                        disabled={!newCategoryForm.name.trim()}
                      >
                        Create Category
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Categories List */}
            <div className="space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No categories found</p>
                  <p className="text-sm">Create your first category to get started</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <Card key={category.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{category.name}</h4>
                            {!category.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                          {showBudgets && category.monthly_budget && (
                            <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                              <DollarSign className="h-3 w-3" />
                              {category.monthly_budget}/month
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {showTags && (
            <TabsContent value="tags" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Tags</h3>
                <Dialog open={showNewTagDialog} onOpenChange={setShowNewTagDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Tag</DialogTitle>
                      <DialogDescription>
                        Add a tag to label and filter your items
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tag-name">Name</Label>
                        <Input
                          id="tag-name"
                          value={newTagForm.name}
                          onChange={(e) => setNewTagForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Tag name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tag-description">Description</Label>
                        <Textarea
                          id="tag-description"
                          value={newTagForm.description}
                          onChange={(e) => setNewTagForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={cn(
                                "w-6 h-6 rounded border-2",
                                newTagForm.color === color ? "border-foreground" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewTagForm(prev => ({ ...prev, color }))}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowNewTagDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateTag}
                          disabled={!newTagForm.name.trim()}
                        >
                          Create Tag
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Tags List */}
              <div className="flex flex-wrap gap-2">
                {filteredTags.length === 0 ? (
                  <div className="w-full text-center py-8 text-muted-foreground">
                    <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tags found</p>
                    <p className="text-sm">Create your first tag to get started</p>
                  </div>
                ) : (
                  filteredTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="group relative"
                    >
                      <Badge
                        variant="secondary"
                        className="text-white cursor-pointer hover:shadow-md transition-shadow"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                        <button
                          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Default Categories Dialog */}
        <Dialog open={showDefaultsDialog} onOpenChange={setShowDefaultsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Default Categories</DialogTitle>
              <DialogDescription>
                Choose from pre-built category sets to get started quickly
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {(['expense', 'task', 'goal', 'universal'] as const).map((categoryDomain) => {
                const defaults = getDefaultCategoriesForDomain(categoryDomain);
                if (defaults.length === 0 || (domain && domain !== categoryDomain && categoryDomain !== 'universal')) return null;

                return (
                  <div key={categoryDomain}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium capitalize">{categoryDomain} Categories</h4>
                      <Button
                        size="sm"
                        onClick={() => handleCreateFromDefaults(defaults)}
                      >
                        Add All ({defaults.length})
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {defaults.map((defaultCat) => (
                        <div
                          key={defaultCat.name}
                          className="flex items-center gap-2 p-2 rounded border"
                        >
                          <span className="text-lg">{defaultCat.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{defaultCat.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{defaultCat.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}