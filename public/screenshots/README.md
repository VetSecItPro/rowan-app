# PWA Screenshots

These screenshots are referenced by `/public/manifest.json` for the PWA install prompt.
They must be captured manually from the running application.

## Required Files

| File | Size | Form Factor | Content |
|------|------|-------------|---------|
| `dashboard-mobile.png` | 750x1334 | narrow (mobile) | Dashboard page on iPhone |
| `tasks-mobile.png` | 750x1334 | narrow (mobile) | Tasks page on iPhone |
| `dashboard-desktop.png` | 1280x800 | wide (desktop) | Dashboard page on desktop |
| `calendar-desktop.png` | 1280x800 | wide (desktop) | Calendar page on desktop |

## How to Capture

1. Run the app locally (`npm run dev`) or use the production deployment.
2. Open Chrome DevTools, toggle device toolbar for mobile shots (iPhone 6/7/8 at 750x1334).
3. Navigate to the relevant page and take a screenshot (Cmd+Shift+P, "Capture screenshot").
4. For desktop shots, set the viewport to 1280x800.
5. Save each file with the exact name listed above into this directory.

Once the PNG files are added here, the manifest `screenshots` array will work and browsers
will display them during the PWA install flow.
