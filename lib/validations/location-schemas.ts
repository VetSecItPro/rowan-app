import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

export const createPlaceRouteSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim()
    .transform(val => sanitizePlainText(val)),
  icon: z.string().max(50).default('map-pin'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').default('#3b82f6'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional()
    .transform(val => val ? sanitizePlainText(val) : val),
  radius_meters: z.number().min(50, 'Radius must be at least 50m').max(5000, 'Radius must be at most 5000m').default(150),
  notify_on_arrival: z.boolean().default(true),
  notify_on_departure: z.boolean().default(true),
});

export const updatePlaceRouteSchema = z.object({
  id: z.string().uuid('Invalid place ID'),
  space_id: z.string().uuid('Invalid space ID'),
  name: z.string().min(1).max(100).trim()
    .transform(val => sanitizePlainText(val))
    .optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional()
    .transform(val => val ? sanitizePlainText(val) : val),
  radius_meters: z.number().min(50).max(5000).optional(),
  notify_on_arrival: z.boolean().optional(),
  notify_on_departure: z.boolean().optional(),
});
