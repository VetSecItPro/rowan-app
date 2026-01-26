import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'

import { Articles } from './collections/Articles'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  routes: {
    admin: '/studio',
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Articles, Media, Categories],
  secret: process.env.PAYLOAD_SECRET || 'CHANGE-ME-IN-PRODUCTION',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_DATABASE_URI || '',
    },
  }),
  editor: lexicalEditor(),
  sharp,
  plugins: [
    ...(process.env.SUPABASE_STORAGE_ACCESS_KEY_ID
      ? [
          s3Storage({
            collections: {
              media: {
                prefix: 'media',
              },
            },
            bucket: process.env.SUPABASE_STORAGE_BUCKET || 'payload-media',
            config: {
              credentials: {
                accessKeyId: process.env.SUPABASE_STORAGE_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY || '',
              },
              region: 'us-east-1',
              endpoint: `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')}/storage/v1/s3`,
              forcePathStyle: true,
            },
          }),
        ]
      : []),
  ],
})
