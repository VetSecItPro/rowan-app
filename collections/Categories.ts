import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-safe identifier (e.g., "getting-started")',
      },
    },
    {
      name: 'color',
      type: 'text',
      required: true,
      admin: {
        description: 'Tailwind color name (emerald, purple, blue, green, indigo, pink, orange, amber)',
      },
    },
    {
      name: 'icon',
      type: 'text',
      required: true,
      admin: {
        description: 'Lucide icon name (FileText, Calendar, CheckSquare, etc.)',
      },
    },
  ],
}
