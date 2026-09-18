export type AccountStatus = "active" | "suspended" | "deletion_pending" | "deleted";

export type StaffRole = "administrator" | "moderator" | "support_agent" | "content_editor";

export type PrivacyRequestType = "export_data" | "delete_account";

export type PrivacyRequestStatus = "pending" | "in_progress" | "resolved" | "rejected";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  user_id: string;
  account_status: AccountStatus;
  terms_accepted_at: string;
  terms_version: string;
  privacy_policy_version: string;
  acceptable_use_version?: string | null;
  age_confirmed_at?: string | null;
  minimum_age_confirmed?: number | null;
  notification_preferences: {
    email_notifications?: boolean;
    [key: string]: unknown;
  };
  optional_contact_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PrivacyRequest {
  id: string;
  user_id: string;
  request_type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export interface PolicyAcceptanceRecord {
  id: string;
  user_id: string;
  terms_version: string;
  privacy_policy_version: string;
  acceptable_use_version: string;
  minimum_age_confirmed: number;
  accepted_at: string;
}

