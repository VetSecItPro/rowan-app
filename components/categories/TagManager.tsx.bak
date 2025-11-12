'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X,
  Plus,
  Tag,
  Trash2,
  Edit,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Tag as TagType,
  getTags,
  createTag,
  deleteTag,
  getExpenseTags,
  addTagToExpense,
  removeTagFromExpense,
  getGoalTags,
  addTagToGoal,
  removeTagFromGoal,
  getTaskTags,
  addTagToTask,
  removeTagFromTask
} from '@/lib/services/categories-tags-service';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  itemId: string;
  itemType: 'expense' | 'goal' | 'task';
  className?: string;
  compact?: boolean;
}

interface TagInputProps {
  onTagAdd: (tagId: string) => void;
  existingTagIds: string[];
  placeholder?: string;
  className?: string;
}

function TagInput({ onTagAdd, existingTagIds, placeholder = "Add tags...", className }: TagInputProps) {
  const { currentSpace, user } = useAuth();
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Load all tags
  useEffect(() => {
    const loadTags = async () => {
      if (!currentSpace) return;

      try {
        const data = await getTags(currentSpace.id);
        setAllTags(data);
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };

    loadTags();
  }, [currentSpace]);

  // Filter available tags (exclude already selected)
  const availableTags = allTags.filter(tag => !existingTagIds.includes(tag.id));

  // Handle create new tag
  const handleCreateTag = async (name: string) => {
    if (!currentSpace || !user || !name.trim()) return;

    try {
      setLoading(true);
      const newTag = await createTag({
        space_id: currentSpace.id,
        name: name.trim(),
        description: '',
        color: '#8b5cf6',
        created_by: user.id
      });

      setAllTags(prev => [...prev, newTag]);
      onTagAdd(newTag.id);
      setInputValue('');
      setOpen(false);
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Plus className="h-4 w-4 mr-2" />
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
              {inputValue.trim() && (
                <div className="p-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleCreateTag(inputValue)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create "{inputValue}"
                  </Button>
                </div>
              )}
            </CommandEmpty>

            {availableTags.length > 0 && (
              <CommandGroup>
                {availableTags
                  .filter(tag =>
                    inputValue === '' ||
                    tag.name.toLowerCase().includes(inputValue.toLowerCase())
                  )
                  .map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => {
                        onTagAdd(tag.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                        {tag.description && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {tag.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TagManager({ itemId, itemType, className, compact = false }: TagManagerProps) {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load item tags
  useEffect(() => {
    const loadItemTags = async () => {
      try {
        setLoading(true);
        let itemTags: TagType[] = [];

        switch (itemType) {
          case 'expense':
            itemTags = await getExpenseTags(itemId);
            break;
          case 'goal':
            itemTags = await getGoalTags(itemId);
            break;
          case 'task':
            itemTags = await getTaskTags(itemId);
            break;
        }

        setTags(itemTags);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tags');
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      loadItemTags();
    }
  }, [itemId, itemType]);

  // Handle add tag
  const handleAddTag = async (tagId: string) => {
    try {
      switch (itemType) {
        case 'expense':
          await addTagToExpense(itemId, tagId);
          break;
        case 'goal':
          await addTagToGoal(itemId, tagId);
          break;
        case 'task':
          await addTagToTask(itemId, tagId);
          break;
      }

      // Reload tags
      const itemTags = await (async () => {
        switch (itemType) {
          case 'expense':
            return await getExpenseTags(itemId);
          case 'goal':
            return await getGoalTags(itemId);
          case 'task':
            return await getTaskTags(itemId);
        }
      })();

      setTags(itemTags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
    }
  };

  // Handle remove tag
  const handleRemoveTag = async (tagId: string) => {
    try {
      switch (itemType) {
        case 'expense':
          await removeTagFromExpense(itemId, tagId);
          break;
        case 'goal':
          await removeTagFromGoal(itemId, tagId);
          break;
        case 'task':
          await removeTagFromTask(itemId, tagId);
          break;
      }

      setTags(prev => prev.filter(tag => tag.id !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="animate-pulse bg-muted rounded h-6 w-16" />
        <div className="animate-pulse bg-muted rounded h-6 w-20" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="text-white text-xs"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              className="ml-1 hover:bg-black/20 rounded"
              onClick={() => handleRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <TagInput
          onTagAdd={handleAddTag}
          existingTagIds={tags.map(t => t.id)}
          placeholder="Tag"
        />
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {/* Current Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Current Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      className="ml-2 hover:bg-black/20 rounded"
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add Tags */}
          <div>
            <p className="text-sm font-medium mb-2">Add Tags</p>
            <TagInput
              onTagAdd={handleAddTag}
              existingTagIds={tags.map(t => t.id)}
              className="w-full sm:w-auto"
            />
          </div>

          {tags.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tags added yet</p>
              <p className="text-xs">Tags help organize and filter your {itemType}s</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Standalone tag display component
interface TagDisplayProps {
  tags: TagType[];
  onRemoveTag?: (tagId: string) => void;
  maxDisplay?: number;
  className?: string;
}

export function TagDisplay({ tags, onRemoveTag, maxDisplay = 3, className }: TagDisplayProps) {
  const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
  const remainingCount = tags.length - displayTags.length;

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {displayTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-white text-xs"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          {onRemoveTag && (
            <button
              className="ml-1 hover:bg-black/20 rounded"
              onClick={() => onRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}