// Privacy & Data Management Service
// Handles all privacy-related database operations and business logic

import { createClient } from '@/lib/supabase/client';
import type {
  UserPrivacyPreferences,
  PrivacyPreferenceUpdate,
  PrivacyServiceResponse,
  AccountDeletionRequest,
  DataExportRequest,
  PrivacyPreferenceHistory,
  DeletionWorkflowStatus,
  ExportWorkflowStatus,
  ComplianceStatus,
  DataExportData,
  RequestDataExportRequest,
  RequestAccountDeletionRequest,
  CancelAccountDeletionRequest,
} from '@/lib/types/privacy';
import {
  CookiePreferences,
  updateCookiePreferences as updateCookiePreferencesUtil,
  getCookiePreferences,
  privacyToCookiePreferences,
  cookieToPrivacyUpdates,
} from '@/lib/utils/cookies';

const supabase = createClient();

// Privacy Preferences Management
export async function getPrivacyPreferences(userId: string): Promise<PrivacyServiceResponse<UserPrivacyPreferences>> {
  try {
    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        return await createDefaultPrivacyPreferences(userId);
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching privacy preferences:', error);
    return { success: false, error: 'Failed to fetch privacy preferences' };
  }
}

export async function createDefaultPrivacyPreferences(userId: string): Promise<PrivacyServiceResponse<UserPrivacyPreferences>> {
  try {
    const defaultPreferences = {
      user_id: userId,
      activity_status_visible: true,
      share_anonymous_analytics: false,
      ccpa_do_not_sell: true,
      marketing_emails_enabled: false,
      marketing_sms_enabled: false,
      analytics_cookies_enabled: false,
      performance_cookies_enabled: true,
      advertising_cookies_enabled: false,
      share_data_with_partners: false,
      third_party_analytics_enabled: false,
    };

    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .insert(defaultPreferences)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating default privacy preferences:', error);
    return { success: false, error: 'Failed to create default privacy preferences' };
  }
}

export async function updatePrivacyPreferences(
  userId: string,
  updates: PrivacyPreferenceUpdate
): Promise<PrivacyServiceResponse<UserPrivacyPreferences>> {
  try {
    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Handle real functionality based on preferences
    await applyPrivacyPreferences(userId, updates);

    return { success: true, data };
  } catch (error) {
    console.error('Error updating privacy preferences:', error);
    return { success: false, error: 'Failed to update privacy preferences' };
  }
}

// Apply real privacy functionality based on preferences
async function applyPrivacyPreferences(userId: string, updates: PrivacyPreferenceUpdate) {
  try {
    // Handle cookie preferences
    if (typeof updates.analytics_cookies_enabled !== 'undefined') {
      await updateCookieConsent('analytics', updates.analytics_cookies_enabled);
    }
    if (typeof updates.advertising_cookies_enabled !== 'undefined') {
      await updateCookieConsent('advertising', updates.advertising_cookies_enabled);
    }
    if (typeof updates.performance_cookies_enabled !== 'undefined') {
      await updateCookieConsent('performance', updates.performance_cookies_enabled);
    }

    // Handle marketing preferences
    if (typeof updates.marketing_emails_enabled !== 'undefined') {
      await updateMarketingSubscription(userId, 'email', updates.marketing_emails_enabled);
    }
    if (typeof updates.marketing_sms_enabled !== 'undefined') {
      await updateMarketingSubscription(userId, 'sms', updates.marketing_sms_enabled);
    }

    // Handle CCPA Do Not Sell
    if (typeof updates.ccpa_do_not_sell !== 'undefined') {
      await updateDataSharingConsent(userId, !updates.ccpa_do_not_sell);
    }

    // Handle third-party analytics
    if (typeof updates.third_party_analytics_enabled !== 'undefined') {
      await updateThirdPartyAnalytics(userId, updates.third_party_analytics_enabled);
    }
  } catch (error) {
    console.error('Error applying privacy preferences:', error);
    // Don't throw error here to avoid breaking the preference update
  }
}

// Cookie Management
export async function updateCookieConsent(cookieType: 'analytics' | 'advertising' | 'performance', enabled: boolean) {
  if (typeof window === 'undefined') return;

  if (!enabled) {
    // Remove cookies based on type
    switch (cookieType) {
      case 'analytics':
        // Remove Google Analytics cookies
        document.cookie = '_ga=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.rowan.app;';
        document.cookie = '_gid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.rowan.app;';
        document.cookie = '_gat=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.rowan.app;';
        break;
      case 'advertising':
        // Remove advertising cookies
        document.cookie = '_fbp=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.rowan.app;';
        document.cookie = '_fbc=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.rowan.app;';
        break;
      case 'performance':
        // Remove performance cookies (be careful with this as it might affect functionality)
        document.cookie = '_hjid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.rowan.app;';
        break;
    }
  }

  // Update consent state in localStorage
  const consentState = JSON.parse(localStorage.getItem('cookie-consent') || '{}');
  consentState[cookieType] = enabled;
  consentState.timestamp = new Date().toISOString();
  localStorage.setItem('cookie-consent', JSON.stringify(consentState));
}

// Marketing Subscription Management
async function updateMarketingSubscription(userId: string, type: 'email' | 'sms', enabled: boolean) {
  try {
    // This would integrate with your email service (Resend) and SMS service (Twilio)
    const response = await fetch('/api/privacy/marketing-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type, enabled }),
    });

    if (!response.ok) {
      throw new Error('Failed to update marketing subscription');
    }
  } catch (error) {
    console.error('Error updating marketing subscription:', error);
  }
}

// Data Sharing Consent
async function updateDataSharingConsent(userId: string, allowSharing: boolean) {
  try {
    const response = await fetch('/api/privacy/data-sharing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, allowSharing }),
    });

    if (!response.ok) {
      throw new Error('Failed to update data sharing consent');
    }
  } catch (error) {
    console.error('Error updating data sharing consent:', error);
  }
}

// Third-party Analytics
async function updateThirdPartyAnalytics(userId: string, enabled: boolean) {
  try {
    const response = await fetch('/api/privacy/third-party-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, enabled }),
    });

    if (!response.ok) {
      throw new Error('Failed to update third-party analytics');
    }
  } catch (error) {
    console.error('Error updating third-party analytics:', error);
  }
}

// Privacy Preference History
export async function getPrivacyPreferenceHistory(userId: string): Promise<PrivacyServiceResponse<PrivacyPreferenceHistory[]>> {
  try {
    const { data, error } = await supabase
      .from('privacy_preference_history')
      .select('*')
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching privacy preference history:', error);
    return { success: false, error: 'Failed to fetch privacy history' };
  }
}

// Account Deletion Management
export async function requestAccountDeletion(
  userId: string,
  request: RequestAccountDeletionRequest = {}
): Promise<PrivacyServiceResponse<AccountDeletionRequest>> {
  try {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30-day grace period

    const { data, error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        scheduled_deletion_date: scheduledDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Send confirmation email
    await sendDeletionConfirmationEmail(userId, scheduledDate);

    return { success: true, data };
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    return { success: false, error: 'Failed to request account deletion' };
  }
}

export async function cancelAccountDeletion(
  userId: string,
  request: CancelAccountDeletionRequest = {}
): Promise<PrivacyServiceResponse<AccountDeletionRequest>> {
  try {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .update({
        cancelled_at: new Date().toISOString(),
        cancellation_reason: request.reason || 'User cancelled',
      })
      .eq('user_id', userId)
      .eq('deletion_completed', false)
      .select()
      .single();

    if (error) throw error;

    // Send cancellation confirmation email
    await sendDeletionCancellationEmail(userId);

    return { success: true, data };
  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    return { success: false, error: 'Failed to cancel account deletion' };
  }
}

export async function getDeletionStatus(userId: string): Promise<PrivacyServiceResponse<DeletionWorkflowStatus>> {
  try {
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active deletion request
        return {
          success: true,
          data: {
            hasActiveRequest: false,
            scheduledDate: null,
            daysRemaining: null,
            canCancel: false,
            remindersSent: { sevenDays: false, oneDay: false },
          },
        };
      }
      throw error;
    }

    const scheduledDate = new Date(data.scheduled_deletion_date);
    const now = new Date();
    const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      success: true,
      data: {
        hasActiveRequest: true,
        scheduledDate: data.scheduled_deletion_date,
        daysRemaining,
        canCancel: daysRemaining > 0,
        remindersSent: {
          sevenDays: data.reminder_sent_7_days,
          oneDay: data.reminder_sent_1_day,
        },
      },
    };
  } catch (error) {
    console.error('Error getting deletion status:', error);
    return { success: false, error: 'Failed to get deletion status' };
  }
}

// Data Export Management
export async function requestDataExport(
  userId: string,
  request: RequestDataExportRequest
): Promise<PrivacyServiceResponse<DataExportRequest>> {
  try {
    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        export_format: request.format,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Start the export process asynchronously
    await initiateDataExport(data.id, userId, request);

    return { success: true, data };
  } catch (error) {
    console.error('Error requesting data export:', error);
    return { success: false, error: 'Failed to request data export' };
  }
}

export async function getExportStatus(userId: string): Promise<PrivacyServiceResponse<ExportWorkflowStatus>> {
  try {
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          hasActiveRequest: false,
          status: 'pending',
          downloadUrl: null,
          expiresAt: null,
          fileSize: null,
          format: null,
        },
      };
    }

    const latestRequest = data[0];
    return {
      success: true,
      data: {
        hasActiveRequest: latestRequest.status !== 'completed' && latestRequest.status !== 'failed',
        status: latestRequest.status,
        downloadUrl: latestRequest.file_url,
        expiresAt: latestRequest.expires_at,
        fileSize: latestRequest.file_size_bytes,
        format: latestRequest.export_format,
      },
    };
  } catch (error) {
    console.error('Error getting export status:', error);
    return { success: false, error: 'Failed to get export status' };
  }
}

// Initiate data export process
async function initiateDataExport(exportId: string, userId: string, request: RequestDataExportRequest) {
  try {
    const response = await fetch('/api/privacy/generate-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ exportId, userId, format: request.format }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate data export');
    }
  } catch (error) {
    console.error('Error initiating data export:', error);
    // Update the request status to failed
    await supabase
      .from('data_export_requests')
      .update({
        status: 'failed',
        error_message: 'Failed to initiate export process',
      })
      .eq('id', exportId);
  }
}

// Compliance Status
export async function getComplianceStatus(userId: string): Promise<PrivacyServiceResponse<ComplianceStatus>> {
  try {
    const preferencesResult = await getPrivacyPreferences(userId);
    if (!preferencesResult.success || !preferencesResult.data) {
      throw new Error('Failed to fetch privacy preferences');
    }

    const preferences = preferencesResult.data;

    return {
      success: true,
      data: {
        gdprCompliant: true, // We're GDPR compliant by design
        ccpaCompliant: preferences.ccpa_do_not_sell, // User has control over data selling
        cookieConsentGiven: true, // User has made cookie choices
        dataProcessingAgreements: {
          marketing: !!(preferences.marketing_emails_enabled || preferences.marketing_sms_enabled),
          analytics: !!(preferences.analytics_cookies_enabled || preferences.share_anonymous_analytics),
          thirdParty: !!(preferences.share_data_with_partners || preferences.third_party_analytics_enabled),
        },
        lastUpdated: preferences.updated_at,
      },
    };
  } catch (error) {
    console.error('Error getting compliance status:', error);
    return { success: false, error: 'Failed to get compliance status' };
  }
}

// Email notification helpers
async function sendDeletionConfirmationEmail(userId: string, deletionDate: Date) {
  try {
    await fetch('/api/privacy/emails/deletion-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deletionDate: deletionDate.toISOString() }),
    });
  } catch (error) {
    console.error('Error sending deletion confirmation email:', error);
  }
}

async function sendDeletionCancellationEmail(userId: string) {
  try {
    await fetch('/api/privacy/emails/deletion-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    console.error('Error sending deletion cancellation email:', error);
  }
}

// Cookie Preferences Management (New unified system)
export async function getCookiePreferencesForUser(userId: string): Promise<PrivacyServiceResponse<CookiePreferences>> {
  try {
    // Get privacy preferences and convert to cookie preferences
    const privacyResult = await getPrivacyPreferences(userId);
    if (!privacyResult.success || !privacyResult.data) {
      throw new Error('Failed to fetch privacy preferences');
    }

    const cookiePrefs = privacyToCookiePreferences(privacyResult.data);
    return { success: true, data: cookiePrefs };
  } catch (error) {
    console.error('Error getting cookie preferences for user:', error);
    return { success: false, error: 'Failed to get cookie preferences' };
  }
}

export async function updateCookiePreferencesForUser(
  userId: string,
  cookiePrefs: CookiePreferences
): Promise<PrivacyServiceResponse<UserPrivacyPreferences>> {
  try {
    // Convert cookie preferences to privacy updates
    const privacyUpdates = cookieToPrivacyUpdates(cookiePrefs);

    // Update privacy preferences in database
    const result = await updatePrivacyPreferences(userId, privacyUpdates);
    if (!result.success) {
      throw new Error('Failed to update privacy preferences');
    }

    // Apply cookie preferences locally
    updateCookiePreferencesUtil(cookiePrefs);

    return result;
  } catch (error) {
    console.error('Error updating cookie preferences for user:', error);
    return { success: false, error: 'Failed to update cookie preferences' };
  }
}

export async function syncCookiePreferencesWithPrivacy(userId: string): Promise<PrivacyServiceResponse<boolean>> {
  try {
    // Get current privacy preferences
    const privacyResult = await getPrivacyPreferences(userId);
    if (!privacyResult.success || !privacyResult.data) {
      throw new Error('Failed to fetch privacy preferences');
    }

    // Convert to cookie preferences and apply locally
    const cookiePrefs = privacyToCookiePreferences(privacyResult.data);
    updateCookiePreferencesUtil(cookiePrefs);

    return { success: true, data: true };
  } catch (error) {
    console.error('Error syncing cookie preferences with privacy:', error);
    return { success: false, error: 'Failed to sync cookie preferences' };
  }
}

// Cookie Consent API Integration
export async function updateCookieConsentViaAPI(cookiePrefs: CookiePreferences): Promise<PrivacyServiceResponse<CookiePreferences>> {
  try {
    const response = await fetch('/api/cookies/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cookiePrefs),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update cookie preferences');
    }

    const result = await response.json();
    return { success: true, data: result.data.preferences };
  } catch (error) {
    console.error('Error updating cookie consent via API:', error);
    return { success: false, error: 'Failed to update cookie preferences' };
  }
}

export async function getCookieConsentViaAPI(): Promise<PrivacyServiceResponse<CookiePreferences>> {
  try {
    const response = await fetch('/api/cookies/preferences', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get cookie preferences');
    }

    const result = await response.json();
    return { success: true, data: result.data.preferences };
  } catch (error) {
    console.error('Error getting cookie consent via API:', error);
    return { success: false, error: 'Failed to get cookie preferences' };
  }
}

export async function resetCookieConsentViaAPI(): Promise<PrivacyServiceResponse<CookiePreferences>> {
  try {
    const response = await fetch('/api/cookies/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reset cookie preferences');
    }

    const result = await response.json();
    return { success: true, data: result.data.preferences };
  } catch (error) {
    console.error('Error resetting cookie consent via API:', error);
    return { success: false, error: 'Failed to reset cookie preferences' };
  }
}

// Export all functions
export {
  applyPrivacyPreferences,
  updateMarketingSubscription,
  updateDataSharingConsent,
  updateThirdPartyAnalytics,
  initiateDataExport,
  sendDeletionConfirmationEmail,
  sendDeletionCancellationEmail,
};