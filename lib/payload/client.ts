import { getPayload as getPayloadInstance } from 'payload'
import config from '@payload-config'

/**
 * Get the local Payload CMS instance (server-side only).
 * Used by Rowan's server components and API routes to fetch articles.
 *
 * For Kaulby (external project), use the REST API instead:
 * GET https://rowanapp.com/api/articles?where[site][equals]=kaulby&where[_status][equals]=published
 */
export async function getPayload() {
  return getPayloadInstance({ config })
}
