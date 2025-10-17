import { createClient } from '@/lib/supabase/server';

/**
 * CCPA (California Consumer Privacy Act) Compliance Service
 *
 * Handles CCPA compliance requirements including:
 * - Do Not Sell My Personal Information opt-out
 * - California resident identification
 * - CCPA-specific data rights management
 *
 * CCPA Section 1798.135 - Right to Opt-Out of Sale of Personal Information
 */

export interface CCPAOptOutStatus {
  user_id: string;
  opted_out: boolean;
  opt_out_date?: string;
  ip_address?: string;
  user_agent?: string;
  california_resident?: boolean;
  verification_method?: 'geolocation' | 'user_declaration' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface CCPAServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

class CCPAService {
  /**
   * Set CCPA opt-out status for a user
   */
  async setOptOutStatus(
    userId: string,
    optedOut: boolean,
    options: {
      ipAddress?: string;
      userAgent?: string;
      californiaResident?: boolean;
      verificationMethod?: 'geolocation' | 'user_declaration' | 'admin';
    } = {}
  ): Promise<CCPAServiceResult> {
    try {
      const supabase = await createClient();

      const now = new Date().toISOString();
      const optOutData = {
        user_id: userId,
        opted_out: optedOut,
        opt_out_date: optedOut ? now : null,
        ip_address: options.ipAddress,
        user_agent: options.userAgent,
        california_resident: options.californiaResident,
        verification_method: options.verificationMethod || 'user_declaration',
        updated_at: now,
      };

      // Upsert the opt-out status
      const { data, error } = await supabase
        .from('ccpa_opt_out_status')
        .upsert(optOutData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;

      // Log the CCPA action for audit trail
      await this.logCCPAAction(userId, optedOut ? 'opt_out_enabled' : 'opt_out_disabled', {
        ip_address: options.ipAddress,
        user_agent: options.userAgent,
        california_resident: options.californiaResident,
        verification_method: options.verificationMethod,
        timestamp: now,
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error setting CCPA opt-out status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update opt-out status'
      };
    }
  }

  /**
   * Get CCPA opt-out status for a user
   */
  async getOptOutStatus(userId: string): Promise<CCPAServiceResult> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('ccpa_opt_out_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return {
        success: true,
        data: data || {
          user_id: userId,
          opted_out: false,
          california_resident: null
        }
      };
    } catch (error) {
      console.error('Error getting CCPA opt-out status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get opt-out status'
      };
    }
  }

  /**
   * Check if user is likely a California resident based on IP geolocation
   */
  async checkCaliforniaResident(ipAddress: string): Promise<boolean> {
    try {
      // Use IP geolocation service to determine if user is in California
      // For now, we'll implement a basic check - in production, you'd use a service like:
      // - MaxMind GeoIP2
      // - IPinfo.io
      // - ipapi.com

      // Placeholder implementation - in real app, use actual geolocation service
      const response = await fetch(`https://ipapi.co/${ipAddress}/region_code/`);
      const regionCode = await response.text();

      return regionCode.trim() === 'CA';
    } catch (error) {
      console.error('Error checking California residence:', error);
      // Default to true for CCPA compliance if we can't determine location
      return true;
    }
  }

  /**
   * Get CCPA data export for a user (similar to GDPR but CCPA-specific)
   */
  async getCCPADataPortability(userId: string): Promise<CCPAServiceResult> {
    try {
      const supabase = await createClient();

      // Get user's CCPA opt-out status
      const optOutResult = await this.getOptOutStatus(userId);
      if (!optOutResult.success) {
        throw new Error(optOutResult.error);
      }

      // Get CCPA audit logs for this user
      const { data: auditLogs, error: auditError } = await supabase
        .from('ccpa_audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (auditError) throw auditError;

      const ccpaData = {
        user_id: userId,
        ccpa_opt_out_status: optOutResult.data,
        ccpa_audit_history: auditLogs || [],
        export_date: new Date().toISOString(),
        export_type: 'ccpa_data_portability',
      };

      return { success: true, data: ccpaData };
    } catch (error) {
      console.error('Error generating CCPA data export:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate CCPA data export'
      };
    }
  }

  /**
   * Log CCPA actions for audit trail
   */
  async logCCPAAction(
    userId: string,
    action: 'opt_out_enabled' | 'opt_out_disabled' | 'data_request' | 'california_resident_verified',
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase
        .from('ccpa_audit_log')
        .insert({
          user_id: userId,
          action,
          action_details: details,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error logging CCPA action:', error);
      // Don't throw here - audit logging shouldn't break the main flow
    }
  }

  /**
   * Bulk update opt-out status for California residents (admin function)
   */
  async bulkUpdateCaliforniaResidents(
    optedOut: boolean,
    adminUserId: string
  ): Promise<CCPAServiceResult> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('ccpa_opt_out_status')
        .update({
          opted_out: optedOut,
          opt_out_date: optedOut ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('california_resident', true)
        .select();

      if (error) throw error;

      // Log the bulk action
      await this.logCCPAAction(adminUserId, optedOut ? 'opt_out_enabled' : 'opt_out_disabled', {
        bulk_action: true,
        affected_users: data?.length || 0,
        timestamp: new Date().toISOString(),
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error bulk updating California residents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update residents'
      };
    }
  }
}

// Export singleton instance
export const ccpaService = new CCPAService();

// Export individual functions for flexibility
export const {
  setOptOutStatus,
  getOptOutStatus,
  checkCaliforniaResident,
  getCCPADataPortability,
  logCCPAAction,
  bulkUpdateCaliforniaResidents,
} = ccpaService;