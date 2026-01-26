# Rowan Payload CMS Integration

## Overview

Payload CMS 3.x is integrated directly into the Rowan Next.js app, providing a full content management system accessible at `/studio`. It manages articles for both **Rowan** and **Kaulby** from a single admin interface.

---

## Architecture

### How It Works

```
/studio         → Payload Admin Panel (login, create/edit articles, upload media)
/api/payload/*  → Payload REST API (used internally by admin + frontend)
/articles       → Public articles page (fetches from Payload via local API)
/articles/[slug]→ Individual article page (rich text content from Payload)
```

### Database Schema

Payload uses a **separate PostgreSQL schema** (`payload`) within the existing Supabase database. This follows the same isolation pattern as `sm_content` and `aws_course_memory`.

| Schema | Purpose | Owner |
|--------|---------|-------|
| `public` | Rowan app tables | Rowan app |
| `payload` | CMS tables | Payload CMS |

Payload tables:
- `payload.articles` - Article content with rich text, metadata, multi-site support
- `payload.media` - Uploaded images, screenshots, videos
- `payload.categories` - Article categories (Getting Started, Calendar, Tasks, etc.)
- `payload.cms_users` - CMS admin accounts (separate from Rowan admin_users)

### Multi-Site Support

Articles have a `site` field that determines which project they belong to:
- `rowan` - Articles for rowanapp.com
- `kaulby` - Articles for kaulby.com (or similar)

Each project fetches only its own articles by filtering on the `site` field.

---

## File Structure

```
rowan-app/
├── payload.config.ts                    # Main Payload configuration
├── payload-types.ts                     # Auto-generated TypeScript types
├── collections/                         # Payload collection definitions
│   ├── Articles.ts                      # Articles schema
│   ├── Media.ts                         # Media uploads
│   ├── Categories.ts                    # Article categories
│   └── Users.ts                         # CMS admin users
├── app/
│   └── (payload)/                       # Payload route group (isolated)
│       ├── layout.tsx                   # Payload root layout
│       ├── studio/                      # Admin panel
│       │   └── [[...segments]]/
│       │       ├── page.tsx             # Catch-all admin page
│       │       └── not-found.tsx        # 404 handler
│       └── api/
│           └── [...slug]/
│               └── route.ts             # REST API handler
├── lib/
│   └── payload/
│       └── client.ts                    # Server-side Payload access
├── components/
│   └── payload/
│       ├── Logo.tsx                     # Custom studio logo
│       └── RichText.tsx                 # Rich text renderer for frontend
└── payload-migrations/                  # Payload DB migrations (auto-generated)
```

---

## Collections

### Articles

| Field | Type | Description |
|-------|------|-------------|
| `site` | select | `rowan` or `kaulby` (sidebar) |
| `title` | text | Article title |
| `slug` | text | URL slug (auto-generated from title) |
| `description` | textarea | Short description for cards |
| `featuredImage` | upload | Hero image (relates to media) |
| `category` | relationship | Relates to categories collection |
| `content` | richText | Full article body (Lexical editor) |
| `readTime` | text | e.g., "5 min read" |
| `featured` | checkbox | Show in featured section |
| `publishedDate` | date | Publication date |
| `seo.metaTitle` | text | SEO title override |
| `seo.metaDescription` | textarea | SEO description |
| `seo.ogImage` | upload | Open Graph image |

**Features:**
- Draft/publish workflow with version history (10 versions per doc)
- Auto-slug generation from title
- Public read access, authenticated write access

### Media

| Field | Type | Description |
|-------|------|-------------|
| `alt` | text | Alt text (required for accessibility) |
| `caption` | text | Optional image caption |

**Image Sizes Auto-Generated:**
- `thumbnail`: 400x300
- `card`: 768x512
- `hero`: 1920x1080

**Storage:** Supabase S3-compatible storage in `payload-media` bucket.

### Categories

| Field | Type | Description |
|-------|------|-------------|
| `name` | text | Category name (e.g., "Getting Started") |
| `slug` | text | URL slug |
| `color` | text | Tailwind color name (emerald, purple, blue, etc.) |
| `icon` | text | Lucide icon name (FileText, Calendar, etc.) |

### CMS Users

| Field | Type | Description |
|-------|------|-------------|
| `email` | email | Login email (built-in auth) |
| `password` | password | Hashed password (built-in auth) |
| `name` | text | Display name |
| `role` | select | `admin` or `editor` |

---

## Environment Variables

```env
# Payload CMS
PAYLOAD_SECRET=<random-32-character-secret>

# Database (Supabase transaction pooler - port 6543 for serverless)
PAYLOAD_DATABASE_URI=postgresql://postgres.mhqpjprmpvigmwcghpzx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Supabase S3 Storage (for media uploads)
SUPABASE_STORAGE_BUCKET=payload-media
SUPABASE_STORAGE_ACCESS_KEY_ID=<from-supabase-dashboard>
SUPABASE_STORAGE_SECRET_ACCESS_KEY=<from-supabase-dashboard>
```

### Getting S3 Keys from Supabase

1. Go to Supabase Dashboard → Storage → S3 Connection
2. Create a new bucket called `payload-media` (public)
3. Copy the Access Key ID and Secret Access Key
4. Add to `.env.local`

---

## Workflow

### Creating an Article

1. Navigate to `rowanapp.com/studio`
2. Login with CMS credentials
3. Click "Articles" → "Create New"
4. Select site: **Rowan** or **Kaulby**
5. Write title, description
6. Upload featured image
7. Select category
8. Write content using rich text editor (supports images, headings, lists, code blocks, embeds)
9. Set read time, featured status, publish date
10. Click "Save Draft" to preview, or "Publish" to go live
11. Article appears on the public `/articles` page

### Managing Media

1. Navigate to `/studio` → "Media"
2. Upload images, screenshots, videos
3. Organize with alt text and captions
4. Images auto-generate thumbnail/card/hero sizes
5. Use in articles via rich text editor upload button

---

## Authentication

Payload CMS has its own auth system, **separate from Rowan admin**.

- CMS users are stored in `payload.cms_users` (not `admin_users`)
- Login at `/studio` with email/password
- First user created automatically becomes admin
- Admins can add editors with restricted permissions
- Roles: `admin` (full access), `editor` (create/edit articles only)

---

## Frontend Integration

### Fetching Articles

```typescript
// lib/services/articles-service.ts
import { getPayload } from '@/lib/payload/client'

export async function getArticles(site: 'rowan' | 'kaulby' = 'rowan') {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      site: { equals: site },
      _status: { equals: 'published' },
    },
    sort: '-publishedDate',
    depth: 2,
  })
  return docs
}

export async function getArticleBySlug(slug: string, site = 'rowan') {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug }, site: { equals: site } },
    depth: 2,
    limit: 1,
  })
  return docs[0] || null
}
```

### Rich Text Rendering

Articles use the Lexical rich text editor. Content is rendered on the frontend using `@payloadcms/richtext-lexical/react`.

---

## Pre-Seeded Categories

| Name | Slug | Color | Icon |
|------|------|-------|------|
| Getting Started | getting-started | emerald | FileText |
| Calendar | calendar | purple | Calendar |
| Tasks | tasks | blue | CheckSquare |
| Shopping | shopping | emerald | ShoppingCart |
| Messages | messages | green | MessageSquare |
| Goals | goals | indigo | Target |
| Reminders | reminders | pink | Bell |
| Meals | meals | orange | Utensils |
| Budget | budget | amber | DollarSign |

---

## Security

- Payload manages its own access control (no Supabase RLS on payload schema)
- Admin panel at `/studio` requires login
- Public read access to published articles only
- Drafts are not publicly accessible
- Media URLs served through Supabase Storage public bucket
- CSP headers updated to allow Payload admin resources

---

## Maintenance

### Updating Payload CMS
```bash
npm update payload @payloadcms/next @payloadcms/richtext-lexical @payloadcms/db-postgres @payloadcms/storage-s3
```

### Running Payload Migrations
Payload auto-manages database migrations. If you need to run them manually:
```bash
npx payload migrate
```

### Generating Types
```bash
npx payload generate:types
```
