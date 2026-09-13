export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_entity: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_entity: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_entity?: string
          target_id?: string | null
        }
        Relationships: []
      }
      privacy_requests: {
        Row: {
          id: string
          request_type: Database["public"]["Enums"]["privacy_request_type_enum"]
          requested_at: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["privacy_request_status_enum"]
          user_id: string
        }
        Insert: {
          id?: string
          request_type: Database["public"]["Enums"]["privacy_request_type_enum"]
          requested_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["privacy_request_status_enum"]
          user_id: string
        }
        Update: {
          id?: string
          request_type?: Database["public"]["Enums"]["privacy_request_type_enum"]
          requested_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["privacy_request_status_enum"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role: Database["public"]["Enums"]["staff_role_enum"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role: Database["public"]["Enums"]["staff_role_enum"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role?: Database["public"]["Enums"]["staff_role_enum"]
          user_id?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status_enum"]
          created_at: string
          notification_preferences: Json
          optional_contact_preferences: Json
          privacy_policy_version: string
          terms_accepted_at: string
          terms_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status_enum"]
          created_at?: string
          notification_preferences?: Json
          optional_contact_preferences?: Json
          privacy_policy_version: string
          terms_accepted_at: string
          terms_version: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status_enum"]
          created_at?: string
          notification_preferences?: Json
          optional_contact_preferences?: Json
          privacy_policy_version?: string
          terms_accepted_at?: string
          terms_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_staff_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["staff_role_enum"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_resolve_privacy_request: {
        Args: {
          p_new_status: Database["public"]["Enums"]["privacy_request_status_enum"]
          p_notes: string
          p_request_id: string
        }
        Returns: undefined
      }
      admin_revoke_staff_role: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_update_user_account_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["account_status_enum"]
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status_enum:
        | "active"
        | "suspended"
        | "deletion_pending"
        | "deleted"
      privacy_request_status_enum:
        | "pending"
        | "in_progress"
        | "resolved"
        | "rejected"
      privacy_request_type_enum: "export_data" | "delete_account"
      staff_role_enum:
        | "administrator"
        | "moderator"
        | "support_agent"
        | "content_editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status_enum: [
        "active",
        "suspended",
        "deletion_pending",
        "deleted",
      ],
      privacy_request_status_enum: [
        "pending",
        "in_progress",
        "resolved",
        "rejected",
      ],
      privacy_request_type_enum: ["export_data", "delete_account"],
      staff_role_enum: [
        "administrator",
        "moderator",
        "support_agent",
        "content_editor",
      ],
    },
  },
} as const

