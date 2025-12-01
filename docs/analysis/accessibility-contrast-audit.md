# Accessibility Color Contrast Audit

**Date**: 2025-10-15
**Standard**: WCAG 2.1 Level AA
**Requirements**:
- Normal text (< 18pt): 4.5:1 contrast ratio
- Large text (≥ 18pt or 14pt bold): 3:1 contrast ratio
- UI components: 3:1 contrast ratio

## Recommended Tools

### Browser-Based Tools
1. **Chrome DevTools Lighthouse**
   - Run: Chrome DevTools > Lighthouse > Accessibility audit
   - Automatically checks contrast ratios

2. **axe DevTools** (Browser Extension)
   - Install: https://www.deque.com/axe/devtools/
   - Run automated accessibility scan

3. **WAVE** (Browser Extension)
   - Install: https://wave.webaim.org/extension/
   - Visual feedback on accessibility issues

### Manual Testing Tools
1. **WebAIM Contrast Checker**
   - URL: https://webaim.org/resources/contrastchecker/
   - Test individual color combinations

2. **Colour Contrast Analyser** (Desktop App)
   - Download: https://www.tpgi.com/color-contrast-checker/
   - Eyedropper tool for testing live pages

## Testing Checklist

### Light Mode

- [ ] Primary text on background (`text-gray-900` on `bg-white`)
- [ ] Secondary text on background (`text-gray-600` on `bg-gray-50`)
- [ ] Link text (`text-blue-600` on `bg-white`)
- [ ] Button text on colored backgrounds (all feature colors)
- [ ] Form labels and inputs
- [ ] Error messages (`text-red-600`)
- [ ] Success messages (`text-green-600`)
- [ ] Warning messages (`text-amber-600`)
- [ ] Info messages (`text-blue-600`)
- [ ] Disabled state text
- [ ] Placeholder text
- [ ] Border colors on focus

### Dark Mode

- [ ] Primary text on background (`text-white` on `bg-black`)
- [ ] Secondary text on background (`text-gray-400` on `bg-gray-800`)
- [ ] Link text (`text-blue-400` on `bg-black`)
- [ ] Button text on colored backgrounds (all feature colors)
- [ ] Form labels and inputs
- [ ] Error messages (`text-red-400`)
- [ ] Success messages (`text-green-400`)
- [ ] Warning messages (`text-amber-400`)
- [ ] Info messages (`text-blue-400`)
- [ ] Disabled state text
- [ ] Placeholder text
- [ ] Border colors on focus

### UI Components

- [ ] Card backgrounds vs text
- [ ] Modal backgrounds vs text
- [ ] Dropdown menu backgrounds vs text
- [ ] Toast notification backgrounds vs text
- [ ] Badge backgrounds vs text
- [ ] Tab active/inactive states
- [ ] Progress bar colors
- [ ] Chart/graph colors
- [ ] Icon colors vs backgrounds

## Known Color Palette

### Feature Colors (from globals.css)
```css
--color-tasks: blue (59 130 246 / 37 99 235)
--color-calendar: purple (168 85 247 / 147 51 234)
--color-reminders: pink (236 72 153 / 219 39 119)
--color-messages: green (34 197 94 / 22 163 74)
--color-shopping: emerald (16 185 129 / 5 150 105)
--color-meals: orange (249 115 22 / 234 88 12)
--color-projects: amber (245 158 11 / 217 119 6)
--color-goals: indigo (99 102 241 / 79 70 229)
```

### Text Colors
- Light mode: `text-gray-900`, `text-gray-600`, `text-gray-400`
- Dark mode: `text-white`, `text-gray-300`, `text-gray-400`

### Background Colors
- Light mode: `bg-white`, `bg-gray-50`, `bg-gray-100`
- Dark mode: `bg-black`, `bg-gray-900`, `bg-gray-800`

## Auto-Fix Suggestions

If contrast issues are found, use these Tailwind class replacements:

### Light Mode Fixes
```
text-gray-400 → text-gray-500 (increase contrast)
text-gray-500 → text-gray-600 (increase contrast)
text-blue-400 → text-blue-600 (increase contrast)
```

### Dark Mode Fixes
```
dark:text-gray-600 → dark:text-gray-500 (increase contrast)
dark:text-gray-500 → dark:text-gray-400 (increase contrast)
dark:text-blue-300 → dark:text-blue-200 (increase contrast)
```

## How to Run Audit

1. Open the app in Chrome
2. Enable dark mode (test both modes)
3. Open Chrome DevTools (F12)
4. Go to Lighthouse tab
5. Select "Accessibility" category
6. Click "Analyze page load"
7. Review contrast issues in report
8. Fix issues and re-test

## CI/CD Integration

Consider adding automated accessibility testing:

```bash
# Install pa11y for CI/CD
npm install --save-dev pa11y pa11y-ci

# Run accessibility tests
npx pa11y-ci --sitemap http://localhost:3000/sitemap.xml
```

## Status

- **Last Audit**: Pending
- **Issues Found**: TBD
- **Issues Fixed**: TBD
- **WCAG Level**: Targeting AA (minimum)

## Next Steps

1. Run Lighthouse accessibility audit
2. Document any contrast failures
3. Apply fixes using Tailwind class adjustments
4. Re-test to verify fixes
5. Consider automated testing in CI/CD
