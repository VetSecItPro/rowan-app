import { generateFeatureOG, FEATURE_CONFIG, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image';

export const runtime = 'edge';
export const alt = 'Rowan Tasks — Shared task management for families';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  const config = FEATURE_CONFIG['tasks'];
  return generateFeatureOG(config.name, config.color, config.description, config.icon);
}
