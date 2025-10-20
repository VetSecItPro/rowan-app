// Privacy & Data Management Types
// TypeScript interfaces for the privacy and data management system

export interface UserPrivacyPreferences {
  id: string;
  user_id: string;

  // Personal Privacy
  activity_status_visible: boolean;
  share_anonymous_analytics: boolean;

  // Legal Compliance
  ccpa_do_not_sell: boolean;
  marketing_emails_enabled: boolean;
  marketing_sms_enabled: boolean;

  // Cookie Preferences
  analytics_cookies_enabled: boolean;
  performance_cookies_enabled: boolean;
  advertising_cookies_enabled: boolean;

  // Data Sharing
  share_data_with_partners: boolean;
  third_party_analytics_enabled: boolean;

  created_at: string;
  updated_at: string;
}

export interface PrivacyPreferenceUpdate {
  activity_status_visible?: boolean;
  share_anonymous_analytics?: boolean;
  ccpa_do_not_sell?: boolean;
  marketing_emails_enabled?: boolean;
  marketing_sms_enabled?: boolean;
  analytics_cookies_enabled?: boolean;
  performance_cookies_enabled?: boolean;
  advertising_cookies_enabled?: boolean;
  share_data_with_partners?: boolean;
  third_party_analytics_enabled?: boolean;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_deletion_date: string;
  reminder_sent_7_days: boolean;
  reminder_sent_1_day: boolean;
  deletion_completed: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacyPreferenceHistory {
  id: string;
  user_id: string;
  preference_key: string;
  old_value: boolean | null;
  new_value: boolean;
  changed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DataExportRequest {
  id: string;
  user_id: string;
  export_format: 'json' | 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  file_url: string | null;
  file_size_bytes: number | null;
  expires_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailNotificationType =
  | 'deletion_confirmation'
  | 'deletion_reminder_7_days'
  | 'deletion_reminder_1_day'
  | 'deletion_completed'
  | 'deletion_cancelled'
  | 'data_export_ready'
  | 'privacy_settings_changed';

export interface PrivacyEmailNotification {
  id: string;
  user_id: string;
  notification_type: EmailNotificationType;
  email_address: string;
  sent_at: string;
  delivery_status: 'sent' | 'delivered' | 'failed' | 'bounced';
  email_provider_id: string | null;
  created_at: string;
}

// API Response types
export interface PrivacyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DataExportData {
  profile: any;
  tasks: any[];
  messages: any[];
  expenses: any[];
  calendar: any[];
  spaces: any[];
  preferences: UserPrivacyPreferences;
  auditLog: PrivacyPreferenceHistory[];
  exportedAt: string;
  gdprCompliance: {
    article: string;
    description: string;
  };
}

// Form types for UI components
export interface PrivacySettingsForm {
  personalPrivacy: {
    activityStatusVisible: boolean;
    shareAnonymousAnalytics: boolean;
  };
  legalCompliance: {
    ccpaDoNotSell: boolean;
    marketingEmailsEnabled: boolean;
    marketingSmsEnabled: boolean;
  };
  cookiePreferences: {
    analyticsCookiesEnabled: boolean;
    performanceCookiesEnabled: boolean;
    advertisingCookiesEnabled: boolean;
  };
  dataSharing: {
    shareDataWithPartners: boolean;
    thirdPartyAnalyticsEnabled: boolean;
  };
}

// Cookie management types
export interface CookieConsentState {
  analytics: boolean;
  performance: boolean;
  advertising: boolean;
  essential: boolean; // Always true, not configurable
  timestamp: string;
  version: string;
}

// Account deletion workflow types
export interface DeletionWorkflowStatus {
  hasActiveRequest: boolean;
  scheduledDate: string | null;
  daysRemaining: number | null;
  canCancel: boolean;
  remindersSent: {
    sevenDays: boolean;
    oneDay: boolean;
  };
}

// Data export workflow types
export interface ExportWorkflowStatus {
  hasActiveRequest: boolean;
  status: DataExportRequest['status'];
  downloadUrl: string | null;
  expiresAt: string | null;
  fileSize: number | null;
  format: string | null;
}

// Service response types
export interface PrivacyServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Privacy compliance status
export interface ComplianceStatus {
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  cookieConsentGiven: boolean;
  dataProcessingAgreements: {
    marketing: boolean;
    analytics: boolean;
    thirdParty: boolean;
  };
  lastUpdated: string;
}

// Audit log entry for comprehensive tracking
export interface PrivacyAuditLogEntry {
  id: string;
  userId: string;
  action: 'preference_changed' | 'data_exported' | 'deletion_requested' | 'deletion_cancelled' | 'consent_given' | 'consent_withdrawn';
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

// Request types for API endpoints
export interface UpdatePrivacyPreferencesRequest {
  preferences: Partial<PrivacyPreferenceUpdate>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface RequestDataExportRequest {
  format: 'json' | 'csv' | 'pdf';
  includeData?: {
    profile?: boolean;
    tasks?: boolean;
    messages?: boolean;
    expenses?: boolean;
    calendar?: boolean;
    spaces?: boolean;
  };
}

export interface RequestAccountDeletionRequest {
  reason?: string;
  feedback?: string;
}

export interface CancelAccountDeletionRequest {
  reason?: string;
}

// Email template context types
export interface DeletionEmailContext {
  userName: string;
  deletionDate: string;
  daysRemaining: number;
  cancelUrl: string;
  supportEmail: string;
}

export interface DataExportEmailContext {
  userName: string;
  downloadUrl: string;
  expiresAt: string;
  fileSize: string;
  format: string;
}

export interface PrivacyChangeEmailContext {
  userName: string;
  changedSettings: string[];
  timestamp: string;
  settingsUrl: string;
}

// Analytics and monitoring types
export interface PrivacyMetrics {
  totalUsers: number;
  optOutRates: {
    ccpaDoNotSell: number;
    marketingEmails: number;
    analyticsCookies: number;
    dataSharing: number;
  };
  exportRequests: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  deletionRequests: {
    daily: number;
    weekly: number;
    monthly: number;
    cancellationRate: number;
  };
}

export default UserPrivacyPreferences;