import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import type { UserPrivacyPreferences } from '@/lib/types/privacy';

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

export type PrivacyPreferences = UserPrivacyPreferences;

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
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Retrieves the user's privacy preferences.
 *
 * Fetches stored preferences for data collection, sharing, and communication settings
 * as configured by the user in their privacy settings.
 *
 * @param userId - The unique identifier of the user
 * @returns Result object containing privacy preferences or an error message
 */
export async function getPrivacyPreferences(userId: string): Promise<{
  success: boolean;
  data?: PrivacyPreferences;
  error?: string;
}> {
  try {
    void userId;
    const response = await fetch('/api/privacy/preferences');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch privacy preferences');
    }

    return { success: true, data: result.data as PrivacyPreferences };
  } catch (error) {
    logger.error('Error fetching privacy preferences:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch preferences',
    };
  }
}

/**
 * Updates the user's privacy preferences.
 *
 * Persists the updated preferences and logs a compliance event for audit purposes.
 * Implements GDPR Article 7 (Conditions for Consent) by tracking preference changes.
 *
 * @param userId - The unique identifier of the user
 * @param preferences - Partial preferences object with fields to update
 * @returns Result object indicating success or failure
 */
export async function updatePrivacyPreferences(
  userId: string,
  preferences: Partial<PrivacyPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await csrfFetch('/api/privacy/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to update privacy preferences');
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
    logger.error('Error updating privacy preferences:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update preferences',
    };
  }
}

/**
 * Retrieves the user's CCPA "Do Not Sell My Personal Information" preference.
 *
 * Implements CCPA compliance by tracking the user's opt-out status for data sales.
 *
 * @param userId - The unique identifier of the user
 * @returns Result object containing CCPA preference or an error message
 */
export async function getCCPAPreference(userId: string): Promise<{
  success: boolean;
  data?: CCPAPreference;
  error?: string;
}> {
  try {
    void userId;
    const response = await fetch('/api/ccpa/opt-out');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch CCPA preference');
    }

    return { success: true, data: result.data as CCPAPreference };
  } catch (error) {
    logger.error('Error fetching CCPA preference:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch CCPA preference',
    };
  }
}

/**
 * Updates the user's CCPA "Do Not Sell My Personal Information" preference.
 *
 * Records the opt-in or opt-out status with timestamp for compliance auditing.
 *
 * @param userId - The unique identifier of the user
 * @param doNotSell - True to opt out of data sales, false to opt in
 * @returns Result object indicating success or failure
 */
export async function updateCCPAPreference(
  userId: string,
  doNotSell: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await csrfFetch('/api/ccpa/opt-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        optedOut: doNotSell,
        verificationMethod: 'user_declaration',
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to update CCPA preference');
    }

    return { success: true };
  } catch (error) {
    logger.error('Error updating CCPA preference:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update CCPA preference',
    };
  }
}

/**
 * Retrieves all data processing agreements for a user.
 *
 * Returns the history of consent records including agreement type, version,
 * legal basis, and consent status. Implements GDPR Article 28 requirements.
 *
 * @param userId - The unique identifier of the user
 * @returns Result object containing array of agreements or an error message
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
      logger.error('Error fetching data processing agreements:', error, { component: 'lib-compliance-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DataProcessingAgreement[] };
  } catch (error) {
    logger.error('Error fetching data processing agreements:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch agreements',
    };
  }
}

/**
 * Records user consent for a specific data processing agreement.
 *
 * Creates a timestamped consent record with full audit trail including legal basis,
 * processing purposes, data categories, and retention period. Implements GDPR
 * Article 6 (Legal Basis for Processing) and Article 7 (Conditions for Consent).
 *
 * @param userId - The unique identifier of the user
 * @param agreementType - The type of agreement (e.g., 'terms_of_service', 'marketing')
 * @param agreementVersion - The version identifier of the agreement document
 * @param legalBasis - The legal basis for processing (e.g., 'consent', 'contract')
 * @param options - Optional additional consent details
 * @returns Result object indicating success or failure
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
      logger.error('Error recording consent:', error, { component: 'lib-compliance-service', action: 'service_call' });
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
    logger.error('Error recording consent:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record consent',
    };
  }
}

/**
 * Logs a compliance-related event for audit purposes.
 *
 * Records privacy and compliance events with categorization for GDPR, CCPA,
 * or general privacy activities. Used for maintaining audit trails.
 *
 * @param event - The compliance event to log (id and created_at are auto-generated)
 * @returns Result object indicating success or failure
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
      logger.error('Error logging compliance event:', error, { component: 'lib-compliance-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error logging compliance event:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log event',
    };
  }
}

/**
 * Retrieves compliance events for a user.
 *
 * Returns the history of compliance-related activities, optionally filtered
 * by category and limited to a specific number of records.
 *
 * @param userId - The unique identifier of the user
 * @param options - Optional filters for limit and category
 * @returns Result object containing array of compliance events or an error message
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
      logger.error('Error fetching compliance events:', error, { component: 'lib-compliance-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ComplianceEvent[] };
  } catch (error) {
    logger.error('Error fetching compliance events:', error, { component: 'lib-compliance-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch events',
    };
  }
}
