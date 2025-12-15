/**
 * Geographic Detection Service
 *
 * Handles geographic location detection for CCPA compliance.
 * Automatically identifies California residents to provide appropriate
 * privacy notices and rights under the California Consumer Privacy Act.
 */

import { logger } from '@/lib/logger';

export interface LocationData {
  ip: string;
  country: string;
  region: string;
  state: string;
  city: string;
  zip: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isCaliforniaResident: boolean;
}

export interface GeographicDetectionResult {
  success: boolean;
  data?: LocationData;
  error?: string;
  confidence?: 'high' | 'medium' | 'low';
}

class GeographicDetectionService {
  private readonly CALIFORNIA_IDENTIFIERS = [
    'CA', 'California', 'california', 'CALIFORNIA'
  ];

  private readonly CALIFORNIA_CITIES = [
    'Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento',
    'Oakland', 'Fresno', 'Long Beach', 'Santa Ana', 'Anaheim', 'Bakersfield',
    'Riverside', 'Stockton', 'Irvine', 'Fremont', 'San Bernardino'
  ];

  private readonly CALIFORNIA_ZIP_RANGES = [
    { start: 90000, end: 96699 }, // Primary CA ZIP codes
    { start: 93000, end: 93599 }, // Additional CA ranges
  ];

  /**
   * Detect geographic location using multiple geolocation services
   */
  async detectLocation(ipAddress: string): Promise<GeographicDetectionResult> {
    try {
      // Remove localhost/private IPs - treat as unknown
      if (this.isPrivateIP(ipAddress)) {
        return {
          success: true,
          data: {
            ip: ipAddress,
            country: 'Unknown',
            region: 'Unknown',
            state: 'Unknown',
            city: 'Unknown',
            zip: 'Unknown',
            latitude: 0,
            longitude: 0,
            timezone: 'Unknown',
            isCaliforniaResident: false
          },
          confidence: 'low'
        };
      }

      // Try primary service first (ipapi.co)
      const primaryResult = await this.detectWithIPAPI(ipAddress);
      if (primaryResult.success) {
        return primaryResult;
      }

      // Fallback to alternative service (ipgeolocation.io)
      const fallbackResult = await this.detectWithIPGeolocation(ipAddress);
      if (fallbackResult.success) {
        return fallbackResult;
      }

      // Final fallback - conservative approach for compliance
      return {
        success: true,
        data: {
          ip: ipAddress,
          country: 'US',
          region: 'Unknown',
          state: 'Unknown',
          city: 'Unknown',
          zip: 'Unknown',
          latitude: 0,
          longitude: 0,
          timezone: 'Unknown',
          isCaliforniaResident: true // Default to true for CCPA compliance
        },
        confidence: 'low'
      };
    } catch (error) {
      logger.error('Error detecting location:', error, { component: 'lib-geographic-detection-service', action: 'service_call' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect location'
      };
    }
  }

  /**
   * Primary geolocation service using ipapi.co
   */
  private async detectWithIPAPI(ipAddress: string): Promise<GeographicDetectionResult> {
    try {
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
        headers: {
          'User-Agent': 'Rowan-App-CCPA-Compliance/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.reason || 'API error');
      }

      const locationData: LocationData = {
        ip: ipAddress,
        country: data.country_name || 'Unknown',
        region: data.region || 'Unknown',
        state: data.region_code || 'Unknown',
        city: data.city || 'Unknown',
        zip: data.postal || 'Unknown',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timezone: data.timezone || 'Unknown',
        isCaliforniaResident: this.isCaliforniaLocation(data)
      };

      return {
        success: true,
        data: locationData,
        confidence: this.calculateConfidence(data)
      };
    } catch (error) {
      logger.error('Error with ipapi.co:', error, { component: 'lib-geographic-detection-service', action: 'service_call' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IP API service failed'
      };
    }
  }

  /**
   * Fallback geolocation service using ipgeolocation.io
   */
  private async detectWithIPGeolocation(ipAddress: string): Promise<GeographicDetectionResult> {
    try {
      const apiKey = process.env.IPGEOLOCATION_API_KEY;
      const url = apiKey
        ? `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`
        : `https://api.ipgeolocation.io/ipgeo?ip=${ipAddress}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Rowan-App-CCPA-Compliance/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.message) {
        throw new Error(data.message);
      }

      const locationData: LocationData = {
        ip: ipAddress,
        country: data.country_name || 'Unknown',
        region: data.state_prov || 'Unknown',
        state: data.state_code || 'Unknown',
        city: data.city || 'Unknown',
        zip: data.zipcode || 'Unknown',
        latitude: parseFloat(data.latitude) || 0,
        longitude: parseFloat(data.longitude) || 0,
        timezone: data.time_zone?.name || 'Unknown',
        isCaliforniaResident: this.isCaliforniaLocation(data)
      };

      return {
        success: true,
        data: locationData,
        confidence: this.calculateConfidence(data)
      };
    } catch (error) {
      logger.error('Error with ipgeolocation.io:', error, { component: 'lib-geographic-detection-service', action: 'service_call' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IP Geolocation service failed'
      };
    }
  }

  /**
   * Determine if location data indicates California residency
   */
  private isCaliforniaLocation(data: any): boolean {
    // Check state/region code
    const stateCode = data.region_code || data.state_code || '';
    if (this.CALIFORNIA_IDENTIFIERS.includes(stateCode)) {
      return true;
    }

    // Check state/region name
    const stateName = data.region || data.state_prov || '';
    if (this.CALIFORNIA_IDENTIFIERS.includes(stateName)) {
      return true;
    }

    // Check city names
    const city = data.city || '';
    if (this.CALIFORNIA_CITIES.includes(city)) {
      return true;
    }

    // Check ZIP code ranges
    const zipCode = parseInt(data.postal || data.zipcode || '0');
    if (zipCode > 0) {
      for (const range of this.CALIFORNIA_ZIP_RANGES) {
        if (zipCode >= range.start && zipCode <= range.end) {
          return true;
        }
      }
    }

    // Check coordinates (California bounding box)
    const lat = parseFloat(data.latitude || '0');
    const lng = parseFloat(data.longitude || '0');
    if (lat !== 0 && lng !== 0) {
      // California approximate bounding box
      const CA_BOUNDS = {
        north: 42.0,   // Northern border
        south: 32.5,   // Southern border
        east: -114.0,   // Eastern border
        west: -124.5    // Western border
      };

      if (lat >= CA_BOUNDS.south && lat <= CA_BOUNDS.north &&
          lng >= CA_BOUNDS.west && lng <= CA_BOUNDS.east) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate confidence level of the detection
   */
  private calculateConfidence(data: any): 'high' | 'medium' | 'low' {
    let score = 0;

    // State/region data available
    if (data.region_code || data.state_code) score += 3;
    if (data.region || data.state_prov) score += 2;

    // City data available
    if (data.city) score += 2;

    // ZIP code available
    if (data.postal || data.zipcode) score += 2;

    // Coordinates available
    if (data.latitude && data.longitude) score += 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Check if IP address is private/local
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./, // localhost
      /^192\.168\./, // private class C
      /^10\./, // private class A
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // private class B
      /^::1$/, // IPv6 localhost
      /^fc00:/, // IPv6 private
      /^fe80:/, // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip)) || ip === 'unknown';
  }

  /**
   * Extract IP address from request headers
   */
  getClientIP(request: Request): string {
    // Check various headers that might contain the real IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-cluster-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];

    for (const header of headers) {
      const value = request.headers.get(header);
      if (value) {
        // x-forwarded-for can contain multiple IPs, take the first one
        const ip = value.split(',')[0].trim();
        if (ip && !this.isPrivateIP(ip)) {
          return ip;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Determine if CCPA notice should be shown
   */
  shouldShowCCPANotice(locationData?: LocationData): boolean {
    if (!locationData) {
      // If we can't determine location, show CCPA notice to be safe
      return true;
    }

    // Show if identified as California resident
    if (locationData.isCaliforniaResident) {
      return true;
    }

    // Show if location is unknown (conservative approach)
    if (locationData.state === 'Unknown' || locationData.country === 'Unknown') {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const geographicDetectionService = new GeographicDetectionService();

// Export individual functions for flexibility
export const {
  detectLocation,
  getClientIP,
  shouldShowCCPANotice,
} = geographicDetectionService;