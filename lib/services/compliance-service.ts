import { createClient } from '@/lib/supabase/client';

/**
 * Compliance Service
 *
 * GDPR COMPLIANCE:
 * ----------------
 * - Article 6: Legal Basis for Processing
 * - Article 7: Conditions for Consent
 * - Article 28: Data Processing Agreements
 *
 * CCPA COMPLIANCE:
 * ----------------
 * - Do Not Sell My Personal Information
 * - Right to Know and Access
 * - Notice at Collection
 */

export interface PrivacyPreferences {
  id?: string;
  user_id: string;
  marketing_emails_enabled: boolean;
  marketing_sms_enabled: boolean;
  analytics_cookies_enabled: boolean;
  performance_cookies_enabled: boolean;
  advertising_cookies_enabled: boolean;
  share_data_with_partners: boolean;
  allow_third_party_analytics: boolean;
  location_tracking_enabled: boolean;
  ccpa_do_not_sell: boolean;
  gdpr_automated_decision_making_opt_out: boolean;
}

export interface CCPAPreference {
  id?: string;
  user_id: string;
  do_not_sell: boolean;
  current_status: 'opted_in' | 'opted_out';
  opted_out_at?: string;
  opted_in_at?: string;
}

export interface DataProcessingAgreement {
  id?: string;
  user_id: string;
  agreement_type: string;
  agreement_version: string;
  legal_basis: string;
  consented: boolean;
  consent_date?: string;
  withdrawn: boolean;
  processing_purposes?: string[];
  data_categories?: string[];
  retention_period?: string;
}

export interface ComplianceEvent {
  id?: string;
  user_id: string;
  event_type: string;
  event_category: 'gdpr' | 'ccpa' | 'general_privacy';
  description?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

/**
 * Get user's privacy preferences
 */
export async function getPrivacyPreferences(userId: string): Promise<{
  success: boolean;
  data?: PrivacyPreferences;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      console.error('Error fetching privacy preferences:', error);
      return { success: false, error: error.message };
    }

    // If no preferences exist, return defaults
    if (!data) {
      const defaults: PrivacyPreferences = {
        user_id: userId,
        marketing_emails_enabled: false,
        marketing_sms_enabled: false,
        analytics_cookies_enabled: true,
        performance_cookies_enabled: true,
        advertising_cookies_enabled: false,
        share_data_with_partners: false,
        allow_third_party_analytics: true,
        location_tracking_enabled: false,
        ccpa_do_not_sell: true,
        gdpr_automated_decision_making_opt_out: false,
      };
      return { success: true, data: defaults };
    }

    return { success: true, data: data as PrivacyPreferences };
  } catch (error) {
    console.error('Error fetching privacy preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch preferences',
    };
  }
}

/**
 * Update user's privacy preferences
 */
export async function updatePrivacyPreferences(
  userId: string,
  preferences: Partial<PrivacyPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_privacy_preferences')
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error updating privacy preferences:', error);
      return { success: false, error: error.message };
    }

    // Log compliance event
    await logComplianceEvent({
      user_id: userId,
      event_type: 'privacy_preferences_updated',
      event_category: 'general_privacy',
      description: 'User updated privacy preferences',
      metadata: preferences,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating privacy preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences',
    };
  }
}

/**
 * Get user's CCPA Do Not Sell preference
 */
export async function getCCPAPreference(userId: string): Promise<{
  success: boolean;
  data?: CCPAPreference;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('ccpa_do_not_sell')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching CCPA preference:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      // Return default
      const defaults: CCPAPreference = {
        user_id: userId,
        do_not_sell: true,
        current_status: 'opted_out',
      };
      return { success: true, data: defaults };
    }

    return { success: true, data: data as CCPAPreference };
  } catch (error) {
    console.error('Error fetching CCPA preference:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch CCPA preference',
    };
  }
}

/**
 * Update user's CCPA Do Not Sell preference
 */
export async function updateCCPAPreference(
  userId: string,
  doNotSell: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const currentStatus = doNotSell ? 'opted_out' : 'opted_in';
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('ccpa_do_not_sell')
      .upsert(
        {
          user_id: userId,
          do_not_sell: doNotSell,
          current_status: currentStatus,
          opted_out_at: doNotSell ? timestamp : undefined,
          opted_in_at: !doNotSell ? timestamp : undefined,
          updated_at: timestamp,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error updating CCPA preference:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating CCPA preference:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update CCPA preference',
    };
  }
}

/**
 * Get user's data processing agreements
 */
export async function getDataProcessingAgreements(userId: string): Promise<{
  success: boolean;
  data?: DataProcessingAgreement[];
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('data_processing_agreements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data processing agreements:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DataProcessingAgreement[] };
  } catch (error) {
    console.error('Error fetching data processing agreements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch agreements',
    };
  }
}

/**
 * Record user consent for data processing
 */
export async function recordConsent(
  userId: string,
  agreementType: string,
  agreementVersion: string,
  legalBasis: string,
  options?: {
    processing_purposes?: string[];
    data_categories?: string[];
    retention_period?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('data_processing_agreements').insert({
      user_id: userId,
      agreement_type: agreementType,
      agreement_version: agreementVersion,
      legal_basis: legalBasis,
      consented: true,
      consent_date: new Date().toISOString(),
      consent_method: 'settings_update',
      processing_purposes: options?.processing_purposes,
      data_categories: options?.data_categories,
      retention_period: options?.retention_period,
    });

    if (error) {
      console.error('Error recording consent:', error);
      return { success: false, error: error.message };
    }

    // Log compliance event
    await logComplianceEvent({
      user_id: userId,
      event_type: 'consent_given',
      event_category: 'gdpr',
      description: `User gave consent for ${agreementType}`,
      metadata: { agreement_type: agreementType, agreement_version: agreementVersion },
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording consent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record consent',
    };
  }
}

/**
 * Log a compliance event
 */
export async function logComplianceEvent(
  event: Omit<ComplianceEvent, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('compliance_events_log').insert({
      user_id: event.user_id,
      event_type: event.event_type,
      event_category: event.event_category,
      description: event.description,
      metadata: event.metadata,
    });

    if (error) {
      console.error('Error logging compliance event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging compliance event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log event',
    };
  }
}

/**
 * Get user's compliance events
 */
export async function getComplianceEvents(
  userId: string,
  options?: {
    limit?: number;
    category?: 'gdpr' | 'ccpa' | 'general_privacy';
  }
): Promise<{
  success: boolean;
  data?: ComplianceEvent[];
  error?: string;
}> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('compliance_events_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.category) {
      query = query.eq('event_category', options.category);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching compliance events:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ComplianceEvent[] };
  } catch (error) {
    console.error('Error fetching compliance events:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch events',
    };
  }
}
