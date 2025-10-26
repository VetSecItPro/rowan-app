import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return basic cookie information/status
    return NextResponse.json({
      success: true,
      data: {
        essential: true,
        analytics: false,
        marketing: false,
        preferences: true,
      },
    });
  } catch (error) {
    console.error('Error fetching cookie status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cookie status' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { preferences } = await request.json();

    // Here you would normally save cookie preferences
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Cookie preferences updated',
      data: preferences,
    });
  } catch (error) {
    console.error('Error updating cookie preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update cookie preferences' },
      { status: 500 }
    );
  }
}