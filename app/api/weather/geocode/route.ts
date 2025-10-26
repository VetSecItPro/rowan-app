import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route since it uses request.url
export const dynamic = 'force-dynamic';

/**
 * Dynamic geocoding with universal fallback strategies
 */
async function tryGeocodingWithFallbacks(location: string): Promise<any> {
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

  for (const [index, searchTerm] of searchStrategies.entries()) {
    if (!searchTerm) continue;

    try {
      console.log(`[Weather Geocode API] Trying strategy ${index + 1}: "${searchTerm}"`);

      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=en&format=json`;

      const response = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Rowan-App/1.0',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.log(`[Weather Geocode API] Strategy ${index + 1} failed with status ${response.status}`);
        continue;
      }

      const data = await response.json();

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
            const countryResult = data.results.find((result: any) =>
              result.country_code === countryCode ||
              keywords.some(keyword => result.country?.toLowerCase().includes(keyword))
            );
            if (countryResult) {
              bestResult = countryResult;
              break;
            }
          }
        }

        console.log(`[Weather Geocode API] Strategy ${index + 1} successful:`, bestResult.name, bestResult.country);
        return bestResult;
      }

      console.log(`[Weather Geocode API] Strategy ${index + 1} returned no results`);
    } catch (error) {
      console.log(`[Weather Geocode API] Strategy ${index + 1} error:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json(
        { error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Weather Geocode API] Geocoding location:', location);

    // Try geocoding with multiple fallback strategies
    const result = await tryGeocodingWithFallbacks(location);

    if (!result) {
      console.log('[Weather Geocode API] All geocoding strategies failed for:', location);
      return NextResponse.json(
        { error: 'Location not found after trying multiple search strategies' },
        { status: 404 }
      );
    }

    const coordinates = {
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
      country: result.country,
      admin1: result.admin1, // state/region
    };

    console.log('[Weather Geocode API] Geocoding successful:', coordinates);

    return NextResponse.json(coordinates);
  } catch (error) {
    console.error('[Weather Geocode API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
}