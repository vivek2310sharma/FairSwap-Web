/**
 * Communication, Notifications, Reports, and Support Types
 * FairSwap Milestone 1.5
 */

export type NotificationType =
  | 'message_received'
  | 'listing_approved'
  | 'listing_rejected'
  | 'report_update'
  | 'support_reply';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  link?: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  seller_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at?: string;
  // Joins
  listing?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    price_paise: number | null;
    cover_photo_id: string | null;
  };
  buyer?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  seller?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string | null;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  client_request_id?: string;
  content: string;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface ConversationReadState {
  conversation_id: string;
  user_id: string;
  last_read_message_id: string;
  last_read_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
}

export type ReportTargetType = 'listing' | 'user' | 'message';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_by_staff_id?: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joins
  reporter?: {
    display_name: string;
  };
  assignee?: {
    display_name: string;
  };
}

export type SupportTicketCategory =
  | 'general'
  | 'account'
  | 'listing_issue'
  | 'safety_concern'
  | 'moderation_appeal'
  | 'other';

export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'awaiting_user'
  | 'resolved'
  | 'closed';

export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  ticket_number?: number;
  user_id: string | null;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  messages?: SupportMessage[];
  assignee?: {
    display_name: string;
  };
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  content: string;
  is_staff_reply?: boolean;
  is_internal_note: boolean;
  created_at: string;
  sender?: {
    id?: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
}
