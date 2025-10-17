/**
 * Web Share API Utilities
 * Provides native share functionality on supported devices
 */

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  success: boolean;
  error?: string;
}

/**
 * Check if the Web Share API is supported on this device
 */
export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Check if file sharing is supported
 */
export function isFileShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'canShare' in navigator;
}

/**
 * Share content using the native share dialog
 * @param data - The content to share
 * @returns Promise with success status
 */
export async function share(data: ShareData): Promise<ShareResult> {
  if (!isShareSupported()) {
    return {
      success: false,
      error: 'Web Share API is not supported on this device',
    };
  }

  try {
    // Check if we can share files (if files are provided)
    if (data.files && data.files.length > 0) {
      if (!isFileShareSupported()) {
        return {
          success: false,
          error: 'File sharing is not supported on this device',
        };
      }

      const canShare = navigator.canShare && navigator.canShare({ files: data.files });
      if (!canShare) {
        return {
          success: false,
          error: 'These files cannot be shared',
        };
      }
    }

    await navigator.share(data);
    return { success: true };
  } catch (error) {
    // User cancelled the share or an error occurred
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Share cancelled' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Share a shopping list
 */
export async function shareShoppingList(listName: string, items: string[], url?: string): Promise<ShareResult> {
  const text = `${listName}\n\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;

  return share({
    title: `Shopping List: ${listName}`,
    text,
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
  });
}

/**
 * Share a recipe
 */
export async function shareRecipe(
  recipeName: string,
  description?: string,
  url?: string
): Promise<ShareResult> {
  return share({
    title: `Recipe: ${recipeName}`,
    text: description || `Check out this recipe: ${recipeName}`,
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
  });
}

/**
 * Share a meal plan
 */
export async function shareMealPlan(
  weekOf: string,
  meals: Array<{ day: string; meal: string }>,
  url?: string
): Promise<ShareResult> {
  const text = `Meal Plan for ${weekOf}\n\n${meals
    .map((m) => `${m.day}: ${m.meal}`)
    .join('\n')}`;

  return share({
    title: `Meal Plan - ${weekOf}`,
    text,
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
  });
}

/**
 * Share a goal or milestone
 */
export async function shareGoal(goalName: string, description?: string, url?: string): Promise<ShareResult> {
  return share({
    title: `Goal: ${goalName}`,
    text: description || `I'm working on: ${goalName}`,
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
  });
}

/**
 * Share a project
 */
export async function shareProject(
  projectName: string,
  description?: string,
  url?: string
): Promise<ShareResult> {
  return share({
    title: `Project: ${projectName}`,
    text: description || `Check out this project: ${projectName}`,
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
  });
}

/**
 * Share current page
 */
export async function sharePage(title?: string, text?: string): Promise<ShareResult> {
  return share({
    title: title || (typeof document !== 'undefined' ? document.title : 'Rowan App'),
    text: text || 'Check this out!',
    url: typeof window !== 'undefined' ? window.location.href : '',
  });
}

/**
 * Fallback: Copy to clipboard if share is not supported
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Share or copy fallback
 * Tries to use native share, falls back to clipboard
 */
export async function shareOrCopy(data: ShareData): Promise<ShareResult> {
  if (isShareSupported()) {
    return share(data);
  }

  // Fallback: copy URL or text to clipboard
  const textToCopy = data.url || data.text || data.title || '';
  const copied = await copyToClipboard(textToCopy);

  if (copied) {
    return { success: true };
  }

  return { success: false, error: 'Failed to copy to clipboard' };
}
