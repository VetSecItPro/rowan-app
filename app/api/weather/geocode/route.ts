import { NextRequest, NextResponse } from 'next/server';
import { weatherCacheService } from '@/lib/services/weather-cache-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

// Force dynamic rendering for this route since it uses request.url
export const dynamic = 'force-dynamic';

type GeocodeResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  timezone?: string;
};

type GeocodeResponse = {
  results?: GeocodeResult[];
};

/**
 * Dynamic geocoding with universal fallback strategies
 */
async function tryGeocodingWithFallbacks(location: string): Promise<GeocodeResult | null> {
  const searchStrategies = [
    // Strategy 1: Clean location string - remove common suffixes
    (() => {
      let cleanLocation = location;

      // Remove common country suffixes
      cleanLocation = cleanLocation.replace(/, (United States|USA|US)$/i, '');
      cleanLocation = cleanLocation.replace(/, (United Kingdom|UK|England|Scotland|Wales)$/i, '');
      cleanLocation = cleanLocation.replace(/, (Canada|France|Germany|Australia|New Zealand)$/i, '');

      const parts = cleanLocation.split(',').map(part => part.trim());

      // If city and state/region are the same (like "New York, New York"), use just the city
      if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
        return parts[0];
      }

      return cleanLocation;
    })(),

    // Strategy 2: Just the city name (first part before comma)
    location.split(',')[0].trim(),

    // Strategy 3: City, Region format without country
    (() => {
      const parts = location.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
      }
      return location.split(',')[0].trim();
    })(),

    // Strategy 4: Original location string as-is
    location,

    // Strategy 5: Try with common state/region abbreviations
    (() => {
      const parts = location.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        const region = parts[1].toLowerCase();

        // Common region/state abbreviations mapping
        const regionMappings: Record<string, string> = {
          'california': 'CA',
          'new york': 'NY',
          'texas': 'TX',
          'florida': 'FL',
          'illinois': 'IL',
          'pennsylvania': 'PA',
          'ohio': 'OH',
          'georgia': 'GA',
          'north carolina': 'NC',
          'michigan': 'MI',
          'new jersey': 'NJ',
          'virginia': 'VA',
          'washington': 'WA',
          'arizona': 'AZ',
          'massachusetts': 'MA',
          'tennessee': 'TN',
          'indiana': 'IN',
          'missouri': 'MO',
          'maryland': 'MD',
          'wisconsin': 'WI',
          'colorado': 'CO',
          'minnesota': 'MN',
          'south carolina': 'SC',
          'alabama': 'AL',
          'louisiana': 'LA',
          'kentucky': 'KY',
          'oregon': 'OR',
          'oklahoma': 'OK',
          'connecticut': 'CT',
          'utah': 'UT',
          'iowa': 'IA',
          'nevada': 'NV',
          'arkansas': 'AR',
          'mississippi': 'MS',
          'kansas': 'KS',
          'new mexico': 'NM',
          'nebraska': 'NE',
          'west virginia': 'WV',
          'idaho': 'ID',
          'hawaii': 'HI',
          'new hampshire': 'NH',
          'maine': 'ME',
          'montana': 'MT',
          'rhode island': 'RI',
          'delaware': 'DE',
          'south dakota': 'SD',
          'north dakota': 'ND',
          'alaska': 'AK',
          'vermont': 'VT',
          'wyoming': 'WY',
        };

        const abbrev = regionMappings[region];
        if (abbrev) {
          return `${parts[0]}, ${abbrev}`;
        }
      }
      return null;
    })(),
  ].filter(Boolean); // Remove null values

  for (const searchTerm of searchStrategies) {
    if (!searchTerm) continue;

    try {
      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`;

      const response = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Rowan-App/1.0',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json() as GeocodeResponse;

      if (data.results && data.results.length > 0) {
        // Try to find the most relevant result based on the original location context
        const originalLocation = location.toLowerCase();
        let bestResult = data.results[0]; // Default to first result

        // Look for country-specific preferences based on the input
        const countryPreferences: Record<string, string[]> = {
          'US': ['united states', 'usa', 'us'],
          'CA': ['canada'],
          'GB': ['united kingdom', 'uk', 'england', 'scotland', 'wales'],
          'AU': ['australia'],
          'DE': ['germany'],
          'FR': ['france'],
          'NZ': ['new zealand'],
          'JP': ['japan'],
          'CN': ['china'],
          'IN': ['india'],
          'BR': ['brazil'],
          'MX': ['mexico'],
        };

        // Check if the original location suggests a specific country
        for (const [countryCode, keywords] of Object.entries(countryPreferences)) {
          if (keywords.some(keyword => originalLocation.includes(keyword))) {
            const countryResult = data.results.find((result) =>
              result.country_code === countryCode ||
              keywords.some(keyword => result.country?.toLowerCase().includes(keyword))
            );
            if (countryResult) {
              bestResult = countryResult;
              break;
            }
          }
        }

        return bestResult;
      }

    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    // Get geocoding result (cache the basic coordinates, but get full details)
    let fullResult: GeocodeResult | null = null;
    const cachedCoords = await weatherCacheService.getOrFetchGeocode(
      location,
      async () => {
        fullResult = await tryGeocodingWithFallbacks(location);
        if (!fullResult) return null;
        if (typeof fullResult.latitude !== 'number' || typeof fullResult.longitude !== 'number') {
          return null;
        }

        // Return coordinates for caching
        return {
          lat: fullResult.latitude,
          lon: fullResult.longitude,
        };
      }
    );

    // If we got cached coordinates but no full result, we need to fetch again for details
    if (cachedCoords && !fullResult) {
      fullResult = await tryGeocodingWithFallbacks(location);
    }

    if (!cachedCoords || !fullResult) {
      return NextResponse.json(
        { error: 'Location not found after trying multiple search strategies' },
        { status: 404 }
      );
    }

    const coordinates = {
      lat: cachedCoords.lat,
      lon: cachedCoords.lon,
      name: fullResult.name || 'Unknown',
      country: fullResult.country || 'Unknown',
      admin1: fullResult.admin1 || 'Unknown', // state/region
    };

    return NextResponse.json(coordinates);
  } catch {
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
}
