import { createClient } from '@/lib/supabase/client';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_type: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_name: string | null;
  ip_address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_current: boolean;
  last_active: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  user_agent: string | null;
}

export interface DeviceInfo {
  device_type: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  device_name: string;
}

export interface LocationInfo {
  ip_address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Parse User-Agent string to extract device information
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  console.log('parseUserAgent: input userAgent =', userAgent);
  const ua = userAgent.toLowerCase();

  // Detect device type
  let device_type = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(userAgent)) {
    device_type = 'mobile';
    console.log('parseUserAgent: detected mobile device due to userAgent containing mobile keywords');
  } else if (/ipad|tablet|kindle/i.test(userAgent)) {
    device_type = 'tablet';
    console.log('parseUserAgent: detected tablet device');
  } else {
    console.log('parseUserAgent: detected desktop device');
  }

  // Detect browser
  let browser = 'Unknown';
  let browser_version = '';

  if (ua.includes('edg/')) {
    browser = 'Edge';
    browser_version = userAgent.match(/edg\/([\d.]+)/i)?.[1] || '';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome';
    browser_version = userAgent.match(/chrome\/([\d.]+)/i)?.[1] || '';
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser = 'Safari';
    browser_version = userAgent.match(/version\/([\d.]+)/i)?.[1] || '';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
    browser_version = userAgent.match(/firefox\/([\d.]+)/i)?.[1] || '';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera';
    browser_version = userAgent.match(/(?:opera|opr)\/([\d.]+)/i)?.[1] || '';
  }

  // Detect OS
  let os = 'Unknown';
  let os_version = '';

  console.log('parseUserAgent: detecting OS from ua =', ua);
  if (ua.includes('mac os x')) {
    os = 'macOS';
    console.log('parseUserAgent: detected macOS');
    const match = userAgent.match(/mac os x ([\d_]+)/i);
    if (match) {
      os_version = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('windows nt')) {
    console.log('parseUserAgent: detected Windows');
    os = 'Windows';
    const versionMap: Record<string, string> = {
      '10.0': '11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
    };
    const match = userAgent.match(/windows nt ([\d.]+)/i);
    if (match) {
      os_version = versionMap[match[1]] || match[1];
    }
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = ua.includes('ipad') ? 'iPadOS' : 'iOS';
    const match = userAgent.match(/os ([\d_]+)/i);
    if (match) {
      os_version = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('android')) {
    os = 'Android';
    console.log('parseUserAgent: detected Android');
    const match = userAgent.match(/android ([\d.]+)/i);
    if (match) {
      os_version = match[1];
    }
  } else if (ua.includes('linux')) {
    os = 'Linux';
    console.log('parseUserAgent: detected Linux');
  }

  // Determine device name
  let device_name = `${os}`;
  if (ua.includes('macbook')) {
    device_name = 'MacBook';
    if (ua.includes('macbook pro')) device_name = 'MacBook Pro';
    else if (ua.includes('macbook air')) device_name = 'MacBook Air';
  } else if (ua.includes('iphone')) {
    device_name = 'iPhone';
    // Try to detect model
    if (ua.includes('iphone15')) device_name = 'iPhone 15';
    else if (ua.includes('iphone14')) device_name = 'iPhone 14';
    else if (ua.includes('iphone13')) device_name = 'iPhone 13';
  } else if (ua.includes('ipad')) {
    device_name = 'iPad';
    if (ua.includes('ipad pro')) device_name = 'iPad Pro';
  } else if (ua.includes('imac')) {
    device_name = 'iMac';
  } else if (device_type === 'mobile') {
    device_name = `${os} Phone`;
    console.log('parseUserAgent: mobile device, setting device_name to:', device_name);
  } else if (device_type === 'tablet') {
    device_name = `${os} Tablet`;
    console.log('parseUserAgent: tablet device, setting device_name to:', device_name);
  }

  // Append browser to device name for clarity
  device_name = `${device_name} - ${browser}`;

  console.log('parseUserAgent: final result:', {
    device_type,
    browser,
    browser_version,
    os,
    os_version,
    device_name,
  });

  return {
    device_type,
    browser,
    browser_version,
    os,
    os_version,
    device_name,
  };
}

// Simple in-memory cache for geolocation results (5 minute TTL)
const locationCache = new Map<string, { data: LocationInfo; expires: number }>();

/**
 * Get location information from IP address using ipapi.co
 */
export async function getLocationFromIP(ip: string): Promise<LocationInfo> {
  console.log('getLocationFromIP: attempting to get location for IP:', ip);

  // Skip geolocation for anonymous IPs
  if (ip === 'anonymous' || !ip) {
    console.log('getLocationFromIP: skipping geolocation for anonymous/empty IP');
    return {
      ip_address: ip,
      city: null,
      region: null,
      country: null,
      country_code: null,
      latitude: null,
      longitude: null,
    };
  }

  // Check cache first
  const cached = locationCache.get(ip);
  if (cached && cached.expires > Date.now()) {
    console.log('getLocationFromIP: returning cached result for IP:', ip);
    return cached.data;
  }

  try {
    const url = `https://ipapi.co/${ip}/json/`;
    console.log('getLocationFromIP: fetching from URL:', url);

    const response = await fetch(url);
    console.log('getLocationFromIP: response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch location: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('getLocationFromIP: API response data:', data);

    const locationData = {
      ip_address: ip,
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      country_code: data.country_code || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
    };

    // Cache the result for 5 minutes
    locationCache.set(ip, {
      data: locationData,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    console.log('getLocationFromIP: parsed location data:', locationData);
    return locationData;
  } catch (error) {
    console.error('getLocationFromIP: error fetching location:', error);
    const errorData = {
      ip_address: ip,
      city: null,
      region: null,
      country: null,
      country_code: null,
      latitude: null,
      longitude: null,
    };

    // Cache error results for 1 minute to prevent repeated failures
    locationCache.set(ip, {
      data: errorData,
      expires: Date.now() + 1 * 60 * 1000, // 1 minute
    });

    return errorData;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string, supabaseClient?: any): Promise<{
  success: boolean;
  sessions?: UserSession[];
  error?: string;
}> {
  try {
    // Use provided client (from API route with auth context) or default client
    const supabase = supabaseClient || createClient();

    console.log('getUserSessions: querying for user_id:', userId);

    // First, let's check if the table exists and has any data at all
    const { data: allSessions, error: countError } = await supabase
      .from('user_sessions')
      .select('id, user_id, created_at')
      .limit(5);

    console.log('getUserSessions: table check - all sessions in DB:', { allSessions, countError });

    // Test auth context - what does auth.uid() return?
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log('getUserSessions: auth context check - auth.uid():', authUser?.id);
    console.log('getUserSessions: comparing auth.uid() vs queried userId:', authUser?.id, 'vs', userId);

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('last_active', { ascending: false });

    console.log('getUserSessions: database query result:', { data, error });

    if (error) {
      console.error('Error fetching user sessions:', error);
      return { success: false, error: error.message };
    }

    console.log('getUserSessions: returning sessions count:', data?.length || 0);
    return { success: true, sessions: data as UserSession[] };
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sessions',
    };
  }
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error revoking session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error revoking session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke session',
    };
  }
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .neq('id', currentSessionId)
      .is('revoked_at', null);

    if (error) {
      console.error('Error revoking other sessions:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error revoking other sessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke sessions',
    };
  }
}

/**
 * Update session last active timestamp
 */
export async function updateSessionActivity(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating session activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update session',
    };
  }
}

/**
 * Format last active time for display
 */
export function formatLastActive(lastActive: string): string {
  const now = new Date();
  const activeDate = new Date(lastActive);
  const diffMs = now.getTime() - activeDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Active now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}
