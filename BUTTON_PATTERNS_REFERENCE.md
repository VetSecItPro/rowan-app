# Button Patterns Reference Guide

A quick visual and code reference for all button patterns used in the Rowan app.

---

## Pattern 1: Primary Action Button

**Use Case**: Main CTAs in modals, forms, critical user actions

**Code Pattern**:
```tsx
<button
  onClick={handler}
  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
>
  Primary Action
</button>
```

**Visual Appearance**:
- Solid background color (feature-specific or blue-600)
- Darker shade on hover
- White text
- Rounded corners (lg)
- Responsive: Full width on mobile

**Real Examples**:
- Export button in ExportButton.tsx
- Save Task button in NewTaskModal.tsx
- Confirm button in ConfirmDialog.tsx

---

## Pattern 2: Secondary Action Button

**Use Case**: Less critical actions (Cancel, Skip, Back)

**Code Pattern**:
```tsx
<button
  onClick={handler}
  className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
>
  Secondary Action
</button>
```

**Visual Appearance**:
- Gray background (light/dark mode appropriate)
- Lighter gray text
- No border
- Responds to theme changes

**Real Examples**:
- Cancel buttons in modals
- Skip buttons in workflows
- Back buttons

---

## Pattern 3: Icon Button (Circle)

**Use Case**: Single action, no text, accessible

**Code Pattern**:
```tsx
<button
  onClick={handler}
  className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95"
  aria-label="Close"
>
  <X className="w-5 h-5 sm:w-4 sm:h-4" />
</button>
```

**Visual Appearance**:
- Circle shape (rounded-full)
- Mobile: 48x48px, Desktop: 40x40px
- Icon only, centered
- Scale down on press (active:scale-95)
- Hover background appears

**Real Examples**:
- Close buttons (X icon) in modals
- Theme toggle button
- Menu close buttons

---

## Pattern 4: Compact Action Button

**Use Case**: Multiple quick actions in groups

**Code Pattern**:
```tsx
<button
  onClick={handler}
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
>
  <Icon className="w-3.5 h-3.5" />
  Action
</button>
```

**Visual Appearance**:
- Small size (xs text, compact padding)
- Icon + text layout
- Gray or action color background
- Multiple buttons typically grouped
- Rounded corners

**Real Examples**:
- Task quick actions (Complete, Snooze, Assign)
- Bulk actions toolbar buttons
- Formatting toolbar buttons

---

## Pattern 5: Selection Toggle Button

**Use Case**: Choose between multiple options

**Code Pattern**:
```tsx
<button
  onClick={() => setSelected('option')}
  className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
    isSelected
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
  }`}
>
  <Icon className="w-4 h-4" />
  Option Label
</button>
```

**Visual Appearance**:
- Border-based design (not filled background)
- Selected: Thick colored border + colored background
- Unselected: Gray border with hover effect
- Icon + text horizontal layout
- Larger padding for touch targets

**Real Examples**:
- Export format selection (CSV vs PDF)
- Quick snooze options
- Category selection

---

## Pattern 6: Menu Item Button

**Use Case**: Items in dropdown/context menus

**Code Pattern**:
```tsx
<button
  onClick={handler}
  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
>
  Menu Item
</button>
```

**Visual Appearance**:
- Full width (w-full)
- Left-aligned text
- Compact vertical padding (py-2)
- Minimal horizontal padding (px-3)
- Subtle hover background
- No borders

**Real Examples**:
- Status options in bulk menu
- Priority options in bulk menu
- Category selection dropdowns

---

## Pattern 7: Form Submission Button

**Use Case**: Submit forms in modals/pages

**Code Pattern**:
```tsx
<form onSubmit={handleSubmit}>
  {/* form fields */}
  <button
    type="submit"
    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
  >
    Save Changes
  </button>
</form>
```

**Visual Appearance**:
- Full width on mobile (can be constrained on desktop)
- Larger padding for prominence
- Primary color
- Type: submit (not onClick)
- Loading state handling recommended

**Real Examples**:
- New Task modal submission
- New Message modal submission
- New Goal modal submission

---

## Animation Patterns Used

### Current Transitions
```
transition-colors     → Background/text color changes
transition-all        → All properties (scale, position, etc.)
active:scale-95       → Press feedback (95% of original size)
```

### Current Hover Effects
```
hover:bg-{darker}     → Background becomes darker shade
hover:scale-105       → Subtle enlargement (rare)
hover:border-{color}  → Border color change
```

---

## Responsive Behavior Patterns

### Mobile to Desktop Scaling
```
Icon buttons:
- Mobile: w-12 h-12 (48x48px)
- Desktop: w-10 h-10 (40x40px)

Text buttons:
- Mobile: py-3 text-base (taller, readable)
- Desktop: py-2.5 text-sm (compact)

Icon sizes:
- Mobile: w-5 h-5 (larger touch target)
- Desktop: w-4 h-4 (refined appearance)
```

---

## Color Patterns by Feature

### Feature Colors
```
Tasks: Blue (bg-blue-600, hover:bg-blue-700)
Calendar: Purple (bg-purple-600, hover:bg-purple-700)
Messages: Green (bg-green-600, hover:bg-green-700)
Shopping: Emerald (bg-emerald-600, hover:bg-emerald-700)
Reminders: Pink (bg-pink-600, hover:bg-pink-700)
Goals: Indigo (bg-indigo-600, hover:bg-indigo-700)
Meals: Orange (bg-orange-600, hover:bg-orange-700)
Projects: Amber (bg-amber-600, hover:bg-amber-700)
```

### Action Colors
```
Success/Confirm: Green (bg-green-500/600)
Warning/Delete: Red/Amber (bg-red-600, bg-amber-600)
Neutral/Secondary: Gray (bg-gray-100/200)
```

---

## Loading State Pattern

**Standard Loading Button**:
```tsx
<button
  disabled={isLoading}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? (
    <>
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Loading...
    </>
  ) : (
    'Save'
  )}
</button>
```

---

## Focus State Pattern

**Keyboard Navigation Support**:
```tsx
className="... focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 md:focus:ring-2"
```

---

## Dark Mode Pattern

**All buttons follow this pattern**:
```tsx
// Background
className="bg-gray-100 dark:bg-gray-800"

// Text
className="text-gray-900 dark:text-white"

// Hover
className="hover:bg-gray-200 dark:hover:bg-gray-700"

// Borders
className="border-gray-300 dark:border-gray-600"
```

---

## Touch Feedback Patterns

### Mobile Users
```
active:scale-95              → Button shrinks when pressed
transition-transform         → Smooth scale animation
py-3 (mobile) vs py-2.5      → Larger touch targets
w-12 h-12 (mobile) vs w-10   → Accessible icon buttons
```

### Accessibility
```
aria-label="Action"          → Screen reader support
type="submit" vs onClick      → Semantic HTML
focus:ring-4 focus:ring-*    → Keyboard navigation
```

---

## Quick Copy-Paste Templates

### Primary Button
```tsx
<button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50">
  Action
</button>
```

### Icon Button
```tsx
<button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95">
  <Icon className="w-5 h-5" />
</button>
```

### Compact Button
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
  <Icon className="w-4 h-4" />
  Label
</button>
```

### Selection Button
```tsx
<button className={`px-4 py-3 rounded-lg border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
  Option
</button>
```

---

## Common Modifications

### Full Width Button
```tsx
// Add: w-full sm:w-auto
className="w-full sm:w-auto px-6 py-2.5 ..."
```

### Danger Button
```tsx
// Change color to red
className="... bg-red-600 hover:bg-red-700 ..."
```

### Disabled Button
```tsx
// Always include
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

### With Loading Spinner
```tsx
// Use pattern from "Loading State Pattern" section
```

---

## Statistics for Implementation

- **Button Types**: 7 core patterns
- **Most Common**: Primary (1) and Icon (3) buttons
- **Padding Sizes**: 4 variants (py-1.5, py-2, py-2.5, py-3)
- **Border Radius**: 3 options (rounded-full, rounded-lg, rounded)
- **Transition Types**: 2 primary (transition-colors, transition-all)
- **Dark Mode**: 100% support
- **Mobile Responsive**: All buttons scale appropriately
- **Accessibility**: Full keyboard navigation support

---

This reference guide provides templates and patterns for consistent button implementation across the Rowan app. Always follow the established patterns to maintain visual consistency and user experience.
