// Shopping Item Categories
export const SHOPPING_CATEGORIES = [
  { value: 'produce', label: 'Produce', icon: '🥬', description: 'Fruits and vegetables' },
  { value: 'dairy', label: 'Dairy', icon: '🥛', description: 'Milk, cheese, yogurt' },
  { value: 'meat', label: 'Meat & Seafood', icon: '🍖', description: 'Meat, poultry, fish' },
  { value: 'frozen', label: 'Frozen', icon: '❄️', description: 'Frozen foods' },
  { value: 'bakery', label: 'Bakery', icon: '🍞', description: 'Bread, pastries' },
  { value: 'pantry', label: 'Pantry', icon: '🥫', description: 'Canned goods, dry goods' },
  { value: 'household', label: 'Household', icon: '🧹', description: 'Cleaning, paper products' },
  { value: 'beverages', label: 'Beverages', icon: '🥤', description: 'Drinks, juices' },
  { value: 'snacks', label: 'Snacks', icon: '🍿', description: 'Chips, crackers, candy' },
  { value: 'personal', label: 'Personal Care', icon: '🧴', description: 'Toiletries, hygiene' },
  { value: 'other', label: 'Other', icon: '📦', description: 'Miscellaneous items' },
] as const;

export type ShoppingCategory = typeof SHOPPING_CATEGORIES[number]['value'];

// Map ingredients to categories for auto-categorization
export const INGREDIENT_CATEGORY_MAP: Record<string, ShoppingCategory> = {
  // Produce
  'tomato': 'produce', 'tomatoes': 'produce', 'lettuce': 'produce', 'onion': 'produce', 'onions': 'produce',
  'garlic': 'produce', 'potato': 'produce', 'potatoes': 'produce', 'carrot': 'produce', 'carrots': 'produce',
  'celery': 'produce', 'bell pepper': 'produce', 'peppers': 'produce', 'cucumber': 'produce',
  'spinach': 'produce', 'broccoli': 'produce', 'cauliflower': 'produce', 'mushroom': 'produce', 'mushrooms': 'produce',
  'apple': 'produce', 'apples': 'produce', 'banana': 'produce', 'bananas': 'produce', 'orange': 'produce', 'oranges': 'produce',
  'lemon': 'produce', 'lemons': 'produce', 'lime': 'produce', 'limes': 'produce', 'avocado': 'produce', 'avocados': 'produce',

  // Dairy
  'milk': 'dairy', 'cream': 'dairy', 'heavy cream': 'dairy', 'sour cream': 'dairy',
  'cheese': 'dairy', 'cheddar': 'dairy', 'mozzarella': 'dairy', 'parmesan': 'dairy',
  'butter': 'dairy', 'yogurt': 'dairy', 'greek yogurt': 'dairy',
  'eggs': 'dairy', 'egg': 'dairy',

  // Meat & Seafood
  'chicken': 'meat', 'beef': 'meat', 'pork': 'meat', 'turkey': 'meat',
  'ground beef': 'meat', 'ground turkey': 'meat', 'ground chicken': 'meat',
  'steak': 'meat', 'bacon': 'meat', 'sausage': 'meat', 'ham': 'meat',
  'salmon': 'meat', 'tuna': 'meat', 'shrimp': 'meat', 'fish': 'meat', 'cod': 'meat',

  // Frozen
  'frozen peas': 'frozen', 'frozen corn': 'frozen', 'frozen vegetables': 'frozen',
  'ice cream': 'frozen', 'frozen pizza': 'frozen', 'frozen berries': 'frozen',

  // Bakery
  'bread': 'bakery', 'buns': 'bakery', 'rolls': 'bakery', 'bagels': 'bakery',
  'croissant': 'bakery', 'muffin': 'bakery', 'muffins': 'bakery', 'tortilla': 'bakery', 'tortillas': 'bakery',

  // Pantry
  'rice': 'pantry', 'pasta': 'pantry', 'noodles': 'pantry', 'spaghetti': 'pantry',
  'flour': 'pantry', 'sugar': 'pantry', 'brown sugar': 'pantry', 'salt': 'pantry', 'pepper': 'pantry',
  'olive oil': 'pantry', 'vegetable oil': 'pantry', 'canola oil': 'pantry',
  'canned tomatoes': 'pantry', 'tomato sauce': 'pantry', 'tomato paste': 'pantry',
  'beans': 'pantry', 'black beans': 'pantry', 'kidney beans': 'pantry', 'chickpeas': 'pantry',
  'soup': 'pantry', 'broth': 'pantry', 'chicken broth': 'pantry', 'vegetable broth': 'pantry', 'beef broth': 'pantry',
  'cereal': 'pantry', 'oatmeal': 'pantry', 'granola': 'pantry',
  'peanut butter': 'pantry', 'jelly': 'pantry', 'jam': 'pantry', 'honey': 'pantry',
  'spices': 'pantry', 'oregano': 'pantry', 'basil': 'pantry', 'thyme': 'pantry', 'cumin': 'pantry',
  'paprika': 'pantry', 'cinnamon': 'pantry', 'vanilla': 'pantry', 'vanilla extract': 'pantry',

  // Household
  'paper towels': 'household', 'toilet paper': 'household', 'tissues': 'household',
  'dish soap': 'household', 'laundry detergent': 'household', 'bleach': 'household',
  'trash bags': 'household', 'aluminum foil': 'household', 'plastic wrap': 'household', 'ziplock bags': 'household',

  // Beverages
  'water': 'beverages', 'soda': 'beverages', 'juice': 'beverages', 'orange juice': 'beverages', 'apple juice': 'beverages',
  'coffee': 'beverages', 'tea': 'beverages', 'beer': 'beverages', 'wine': 'beverages',

  // Snacks
  'chips': 'snacks', 'crackers': 'snacks', 'popcorn': 'snacks', 'pretzels': 'snacks',
  'cookies': 'snacks', 'candy': 'snacks', 'chocolate': 'snacks', 'nuts': 'snacks',

  // Personal Care
  'shampoo': 'personal', 'conditioner': 'personal', 'soap': 'personal', 'body wash': 'personal',
  'toothpaste': 'personal', 'toothbrush': 'personal', 'deodorant': 'personal', 'lotion': 'personal',
};

// Get category for an ingredient name
export function getCategoryForItem(itemName: string): ShoppingCategory {
  const normalizedName = itemName.toLowerCase().trim();

  // Direct match
  if (INGREDIENT_CATEGORY_MAP[normalizedName]) {
    return INGREDIENT_CATEGORY_MAP[normalizedName];
  }

  // Partial match (check if any key is contained in the item name)
  for (const [key, category] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return category;
    }
  }

  // Default to other
  return 'other';
}

// Get icon for category
export function getCategoryIcon(category: ShoppingCategory): string {
  const cat = SHOPPING_CATEGORIES.find(c => c.value === category);
  return cat?.icon || '📦';
}

// Get label for category
export function getCategoryLabel(category: ShoppingCategory): string {
  const cat = SHOPPING_CATEGORIES.find(c => c.value === category);
  return cat?.label || 'Other';
}
