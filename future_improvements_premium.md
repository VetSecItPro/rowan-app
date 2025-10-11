# Future Improvements & Premium Features

This document tracks planned enhancements and premium features for the Rowan app that will be implemented in future phases.

---

## 🛒 Shopping List & Meal Planning Integration

### Phase 2: Advanced Shopping List Features

**Feature Name:** Smart Meal Shopping Integration

**Description:**
Advanced shopping list features that enhance the meal planning workflow with intelligent ingredient management, bulk operations, and cost tracking.

**Planned Features:**

#### 1. Retroactive Shopping List Creation from Meal Cards
- **What:** Add "Add to Shopping List" button on existing meal cards
- **Why:** Allows users to create shopping lists for already-planned meals
- **Flow:**
  - Meal card displays button if no shopping list exists
  - Click button → Creates shopping list with recipe ingredients
  - Button changes to "View Shopping List" after creation
- **User Benefit:** Flexibility to add meals to shopping anytime after planning

#### 2. Bulk Calendar Shopping List Generation
- **What:** Create shopping lists from multiple meals in calendar view
- **Why:** Perfect for weekly meal prep and consolidated shopping trips
- **Flow:**
  - User selects date range in calendar (e.g., "This Week")
  - Click "Create Shopping List from Selection"
  - System aggregates all meals in date range
  - Creates single shopping list: `"Weekly Shopping - [Date Range]"`
  - Automatically combines duplicate ingredients with total quantities
- **Example:**
  - Monday: Pasta (needs garlic, tomatoes)
  - Wednesday: Stir Fry (needs garlic, broccoli)
  - Result: Single list with "Garlic (2 cloves)", "Tomatoes (1 can)", "Broccoli (1 head)"
- **User Benefit:** Reduces shopping trips, clear quantity visibility

#### 3. Ingredient Deduplication & Quantity Aggregation
- **What:** Smart combining of duplicate ingredients across multiple meals
- **Why:** Prevents buying duplicate items, shows total needed amounts
- **How:**
  - Detects same ingredient across multiple recipes
  - Sums quantities (e.g., "2 cups flour" + "1 cup flour" = "3 cups flour")
  - Handles different units (converts where possible)
  - Groups by category (produce, dairy, meat, etc.)
- **User Benefit:** More efficient shopping, accurate quantities

#### 4. Shopping List Cost Tracking (Premium)
- **What:** Track estimated costs and actual spending per shopping trip
- **Why:** Budget management for meal planning
- **Features:**
  - Add estimated price per ingredient
  - Calculate total estimated cost
  - Track actual cost after shopping
  - Compare estimated vs actual over time
  - Generate spending reports by category
- **User Benefit:** Better budget control, spending insights

#### 5. Recipe Ingredient Pantry Check (Premium)
- **What:** Track pantry inventory and check what you already have
- **Why:** Avoid buying items you already own
- **Features:**
  - Maintain pantry inventory with expiration dates
  - Mark ingredients as "In Pantry" when creating shopping list
  - Auto-remove pantry items from shopping list
  - Low stock alerts for staple ingredients
  - Expiration date warnings
- **User Benefit:** Reduce food waste, save money

#### 6. Shopping List Templates (Premium)
- **What:** Save recurring shopping lists as templates
- **Why:** Common shopping trips (weekly staples, party prep, etc.)
- **Examples:**
  - "Weekly Basics" (milk, eggs, bread, etc.)
  - "Dinner Party Essentials"
  - "Breakfast Week"
- **User Benefit:** Faster list creation for routine shopping

#### 7. Smart Recipe Suggestions Based on Shopping List
- **What:** Suggest additional recipes using ingredients already on list
- **Why:** Maximize ingredient usage, reduce waste
- **How:**
  - Analyzes current shopping list
  - Finds recipes that use ≥70% of listed ingredients
  - Suggests: "You're already buying chicken & rice - try this recipe too!"
- **User Benefit:** Better meal variety, less food waste

#### 8. Store Aisle Organization (Premium)
- **What:** Organize shopping list by store layout/aisles
- **Why:** More efficient in-store shopping experience
- **Features:**
  - Custom aisle configuration per store
  - Drag-and-drop aisle assignment
  - Auto-sort items by aisle order
  - Multiple store profiles
- **User Benefit:** Faster shopping trips, less backtracking

#### 9. Shared Shopping Mode
- **What:** Real-time collaboration on shopping trips
- **Why:** Partners can split up in store, check off together
- **Features:**
  - Real-time item check-off syncing
  - "Who's getting this?" assignment
  - In-store chat per item
  - Notification when partner completes section
- **User Benefit:** Faster collaborative shopping

#### 10. Shopping History & Repeat Lists
- **What:** Track shopping history and recreate past lists
- **Why:** Quickly recreate successful shopping trips
- **Features:**
  - Browse past shopping lists by date
  - "Shop Again" button to recreate list
  - Track frequency of purchased items
  - Suggest items you buy regularly
- **User Benefit:** Faster list creation, pattern recognition

---

## 📊 Implementation Priority

| Feature | Priority | Effort | Impact | Premium? |
|---------|----------|--------|--------|----------|
| Retroactive Shopping List Creation | High | Low | High | No |
| Bulk Calendar Shopping | Medium | Medium | High | No |
| Ingredient Deduplication | Medium | High | High | No |
| Cost Tracking | Low | Medium | Medium | Yes |
| Pantry Check | Low | High | High | Yes |
| Shopping Templates | Low | Low | Medium | Yes |
| Recipe Suggestions | Low | High | Medium | Yes |
| Store Aisle Organization | Low | Medium | Low | Yes |
| Shared Shopping Mode | Low | High | High | Yes |
| Shopping History | Low | Low | Medium | Yes |

---

## 🎯 Phase 2 Rollout Plan

**Q1 2026: Core Features**
- Retroactive shopping list creation from meal cards
- Bulk calendar shopping list generation
- Basic ingredient deduplication

**Q2 2026: Premium Launch**
- Cost tracking
- Pantry inventory management
- Shopping templates

**Q3 2026: Collaboration Features**
- Shared shopping mode
- Real-time syncing enhancements

**Q4 2026: Intelligence Features**
- Recipe suggestions based on shopping list
- Smart pantry alerts
- Store aisle optimization

---

## 💡 Additional Ideas (Brainstorm)

- **Voice Shopping List:** Add items via voice command
- **Barcode Scanner:** Scan items to add to pantry/shopping list
- **Price Comparison:** Compare prices across stores (API integration)
- **Nutrition Aggregation:** Total nutrition facts for planned meals
- **Meal Prep Timer:** Cooking time coordination for multiple recipes
- **Leftover Tracking:** Track what's left after cooking, suggest recipes
- **Seasonal Produce Alerts:** Notify when ingredients are in season
- **Grocery Delivery Integration:** Send list directly to Instacart/Amazon Fresh

---

*Last Updated: October 10, 2025*
*Status: Phase 1 Completed - Basic meal-to-shopping integration*
