import { NextRequest, NextResponse } from 'next/server';

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

    // Clean up location string for better geocoding results
    // Convert "New York, New York, United States" to "New York"
    // Convert "Dallas, Texas, United States" to "Dallas, Texas"
    let cleanLocation = location;

    // Remove "United States" if present
    cleanLocation = cleanLocation.replace(/, United States$/, '');

    // If city and state are the same (like "New York, New York"), use just the city
    const parts = cleanLocation.split(',').map(part => part.trim());
    if (parts.length === 2 && parts[0] === parts[1]) {
      cleanLocation = parts[0];
    }

    console.log('[Weather Geocode API] Cleaned location for search:', cleanLocation);

    // Call Open-Meteo Geocoding API server-side
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLocation)}&count=1&language=en&format=json`;

    const response = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'Rowan-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log('[Weather Geocode API] Location not found:', location);
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    const result = data.results[0];
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