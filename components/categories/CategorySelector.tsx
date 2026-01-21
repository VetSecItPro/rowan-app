'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import {
  Check,
  ChevronDown,
  Plus,
  X,
  Tag
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  CustomCategory,
  Tag as TagType,
  getCustomCategories,
  getTags,
  createCustomCategory,
  createTag
} from '@/lib/services/categories-tags-service';
import {
  getDefaultCategoriesForDomain,
  findDefaultCategory,
  getCategoryIcon
} from '@/lib/constants/default-categories';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  domain?: 'expense' | 'task' | 'goal' | 'universal';
  placeholder?: string;
  allowCustom?: boolean;
  showIcon?: boolean;
  className?: string;
}

interface TagSelectorProps {
  values?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  maxTags?: number;
  className?: string;
}

export function CategorySelector({
  value,
  onChange,
  domain,
  placeholder = "Select category...",
  allowCustom = true,
  showIcon = true,
  className
}: CategorySelectorProps) {
  const { currentSpace, user } = useAuth();
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!currentSpace) return;

      try {
        const data = await getCustomCategories(currentSpace.id);
        setCategories(data);
      } catch (err) {
        logger.error('Failed to load categories:', err, { component: 'CategorySelector', action: 'component_action' });
      }
    };

    loadCategories();
  }, [currentSpace]);

  // Filter categories by domain if specified
  const filteredCategories = domain
    ? categories.filter(cat => cat.name.toLowerCase().includes(domain) || !domain)
    : categories;

  // Get selected category
  const selectedCategory = value ? categories.find(cat => cat.id === value || cat.name === value) : null;
  const defaultCategory = value && !selectedCategory ? findDefaultCategory(value, domain) : null;

  // Handle create new category
  const handleCreateCategory = async () => {
    if (!currentSpace || !user || !newCategoryName.trim()) return;

    try {
      const defaultCat = findDefaultCategory(newCategoryName, domain);
      const newCategory = await createCustomCategory({
        space_id: currentSpace.id,
        name: newCategoryName,
        description: defaultCat?.description || '',
        icon: defaultCat?.icon || '📁',
        color: defaultCat?.color || '#3b82f6',
        monthly_budget: defaultCat?.monthly_budget,
        created_by: user.id
      });

      setCategories(prev => [...prev, newCategory]);
      onChange?.(newCategory.id);
      setShowCreateDialog(false);
      setNewCategoryName('');
      setOpen(false);
    } catch (err) {
      logger.error('Failed to create category:', err, { component: 'CategorySelector', action: 'component_action' });
    }
  };

  const displayCategory = selectedCategory || defaultCategory;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              {displayCategory && showIcon && (
                <span className="text-lg">{displayCategory.icon || getCategoryIcon(displayCategory.name, domain)}</span>
              )}
              <span className="truncate">
                {displayCategory?.name || placeholder}
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No categories found</p>
                  {allowCustom && (
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create Category</DialogTitle>
                          <DialogDescription>
                            Create a new category for your {domain || 'items'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="category-name">Category Name</Label>
                            <Input
                              id="category-name"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Enter category name"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCreateCategory();
                                }
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowCreateDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCreateCategory}
                              disabled={!newCategoryName.trim()}
                            >
                              Create
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CommandEmpty>

              {/* Custom Categories */}
              {filteredCategories.length > 0 && (
                <CommandGroup heading="Your Categories">
                  {filteredCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        onChange?.(category.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-4 h-4 rounded-sm flex items-center justify-center text-xs"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.icon}
                        </div>
                        <span>{category.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === category.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Default Categories */}
              {domain && (
                <CommandGroup heading="Suggested Categories">
                  {getDefaultCategoriesForDomain(domain)
                    .filter(defaultCat => !categories.some(cat => cat.name === defaultCat.name))
                    .map((defaultCat) => (
                      <CommandItem
                        key={defaultCat.name}
                        value={defaultCat.name}
                        onSelect={() => {
                          onChange?.(defaultCat.name);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-4 h-4 rounded-sm flex items-center justify-center text-xs"
                            style={{ backgroundColor: defaultCat.color }}
                          >
                            {defaultCat.icon}
                          </div>
                          <span>{defaultCat.name}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            Default
                          </Badge>
                        </div>
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4",
                            value === defaultCat.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function TagSelector({
  values = [],
  onChange,
  placeholder = "Add tags...",
  allowCustom = true,
  maxTags = 10,
  className
}: TagSelectorProps) {
  const { currentSpace, user } = useAuth();
  const [tags, setTags] = useState<TagType[]>([]);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Load tags
  useEffect(() => {
    const loadTags = async () => {
      if (!currentSpace) return;

      try {
        const data = await getTags(currentSpace.id);
        setTags(data);
      } catch (err) {
        logger.error('Failed to load tags:', err, { component: 'CategorySelector', action: 'component_action' });
      }
    };

    loadTags();
  }, [currentSpace]);

  // Get selected tags
  const selectedTags = values.map(value =>
    tags.find(tag => tag.id === value || tag.name === value)
  ).filter(Boolean) as TagType[];

  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    if (values.includes(tagId)) {
      onChange?.(values.filter(v => v !== tagId));
    } else if (values.length < maxTags) {
      onChange?.([...values, tagId]);
    }
  };

  // Handle tag removal
  const handleTagRemove = (tagId: string) => {
    onChange?.(values.filter(v => v !== tagId));
  };

  // Handle create new tag
  const handleCreateTag = async (name: string) => {
    if (!currentSpace || !user || !name.trim()) return;

    try {
      const newTag = await createTag({
        space_id: currentSpace.id,
        name: name.trim(),
        description: '',
        color: '#8b5cf6',
        created_by: user.id
      });

      setTags(prev => [...prev, newTag]);
      handleTagSelect(newTag.id);
      setInputValue('');
    } catch (err) {
      logger.error('Failed to create tag:', err, { component: 'CategorySelector', action: 'component_action' });
    }
  };

  // Filter available tags
  const availableTags = tags.filter(tag => !values.includes(tag.id));

  return (
    <div className={className}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                className="ml-1 hover:bg-black/20 rounded"
                onClick={() => handleTagRemove(tag.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tag Input */}
      {values.length < maxTags && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Tag className="h-4 w-4 mr-2" />
              {placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput
                placeholder="Search or create tags..."
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {allowCustom && inputValue.trim() && (
                    <div className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCreateTag(inputValue)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create &quot;{inputValue}&quot;
                      </Button>
                    </div>
                  )}
                </CommandEmpty>

                {availableTags.length > 0 && (
                  <CommandGroup>
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => {
                          handleTagSelect(tag.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
