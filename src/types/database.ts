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
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      category_attributes: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_filterable: boolean
          is_required: boolean
          label: string
          name: string
          options: Json | null
          sort_order: number
          validation_rules: Json | null
          value_type: Database["public"]["Enums"]["attribute_value_type_enum"]
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          label: string
          name: string
          options?: Json | null
          sort_order?: number
          validation_rules?: Json | null
          value_type: Database["public"]["Enums"]["attribute_value_type_enum"]
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          label?: string
          name?: string
          options?: Json | null
          sort_order?: number
          validation_rules?: Json | null
          value_type?: Database["public"]["Enums"]["attribute_value_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          state?: string
        }
        Relationships: []
      }
      listing_media: {
        Row: {
          content_type: string
          created_at: string
          display_order: number
          file_size_bytes: number
          height: number | null
          id: string
          large_storage_path: string | null
          listing_id: string
          medium_storage_path: string | null
          original_filename: string
          original_storage_path: string | null
          processing_error: string | null
          processing_status: Database["public"]["Enums"]["media_processing_status_enum"]
          thumbnail_storage_path: string | null
          uploader_id: string
          width: number | null
        }
        Insert: {
          content_type: string
          created_at?: string
          display_order?: number
          file_size_bytes: number
          height?: number | null
          id?: string
          large_storage_path?: string | null
          listing_id: string
          medium_storage_path?: string | null
          original_filename: string
          original_storage_path?: string | null
          processing_error?: string | null
          processing_status?: Database["public"]["Enums"]["media_processing_status_enum"]
          thumbnail_storage_path?: string | null
          uploader_id?: string
          width?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string
          display_order?: number
          file_size_bytes?: number
          height?: number | null
          id?: string
          large_storage_path?: string | null
          listing_id?: string
          medium_storage_path?: string | null
          original_filename?: string
          original_storage_path?: string | null
          processing_error?: string | null
          processing_status?: Database["public"]["Enums"]["media_processing_status_enum"]
          thumbnail_storage_path?: string | null
          uploader_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_status_transitions: {
        Row: {
          actor_id: string | null
          actor_kind: Database["public"]["Enums"]["transition_actor_kind_enum"]
          created_at: string
          from_status: Database["public"]["Enums"]["listing_status_enum"] | null
          id: string
          listing_id: string
          reason: string | null
          revision_at_transition: number
          to_status: Database["public"]["Enums"]["listing_status_enum"]
        }
        Insert: {
          actor_id?: string | null
          actor_kind: Database["public"]["Enums"]["transition_actor_kind_enum"]
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["listing_status_enum"]
            | null
          id?: string
          listing_id: string
          reason?: string | null
          revision_at_transition: number
          to_status: Database["public"]["Enums"]["listing_status_enum"]
        }
        Update: {
          actor_id?: string | null
          actor_kind?: Database["public"]["Enums"]["transition_actor_kind_enum"]
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["listing_status_enum"]
            | null
          id?: string
          listing_id?: string
          reason?: string | null
          revision_at_transition?: number
          to_status?: Database["public"]["Enums"]["listing_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_status_transitions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category_attributes: Json
          category_id: string
          city_id: string
          condition:
            | Database["public"]["Enums"]["listing_condition_enum"]
            | null
          cover_photo_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          locality_id: string | null
          pin_code: string | null
          price_paise: number | null
          price_type:
            | Database["public"]["Enums"]["listing_price_type_enum"]
            | null
          published_at: string | null
          rejection_reason: string | null
          removal_reason: string | null
          removed_by: string | null
          renewal_count: number
          revision: number
          seller_id: string
          slug: string
          sold_at: string | null
          status: Database["public"]["Enums"]["listing_status_enum"]
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_attributes?: Json
          category_id: string
          city_id: string
          condition?:
            | Database["public"]["Enums"]["listing_condition_enum"]
            | null
          cover_photo_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          locality_id?: string | null
          pin_code?: string | null
          price_paise?: number | null
          price_type?:
            | Database["public"]["Enums"]["listing_price_type_enum"]
            | null
          published_at?: string | null
          rejection_reason?: string | null
          removal_reason?: string | null
          removed_by?: string | null
          renewal_count?: number
          revision?: number
          seller_id?: string
          slug?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status_enum"]
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_attributes?: Json
          category_id?: string
          city_id?: string
          condition?:
            | Database["public"]["Enums"]["listing_condition_enum"]
            | null
          cover_photo_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          locality_id?: string | null
          pin_code?: string | null
          price_paise?: number | null
          price_type?:
            | Database["public"]["Enums"]["listing_price_type_enum"]
            | null
          published_at?: string | null
          rejection_reason?: string | null
          removal_reason?: string | null
          removed_by?: string | null
          renewal_count?: number
          revision?: number
          seller_id?: string
          slug?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status_enum"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_listings_cover_photo"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "listing_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      localities: {
        Row: {
          city_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "localities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
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
      admin_manage_category: {
        Args: {
          action: string
          category_id?: string
          description?: string
          icon?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Returns: Json
      }
      admin_manage_location: {
        Args: {
          action: string
          city_id?: string
          is_active?: boolean
          locality_id?: string
          name?: string
          slug?: string
          state?: string
        }
        Returns: Json
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
      delete_listing_media_internal: {
        Args: { listing_id: string; media_id: string }
        Returns: Json
      }
      expire_listing: { Args: { listing_id: string }; Returns: Json }
      is_listing_publicly_visible: {
        Args: { listing_id: string }
        Returns: boolean
      }
      moderate_listing: {
        Args: { action: string; listing_id: string; reason?: string }
        Returns: Json
      }
      record_media_processing_result: {
        Args: {
          dimensions: Json
          error?: string
          media_id: string
          paths: Json
          status: string
        }
        Returns: Json
      }
      seller_submit_listing: { Args: { listing_id: string }; Returns: Json }
      seller_transition_listing: {
        Args: { action: string; listing_id: string }
        Returns: Json
      }
    }
    Enums: {
      account_status_enum:
        | "active"
        | "suspended"
        | "deletion_pending"
        | "deleted"
      attribute_value_type_enum: "text" | "number" | "select" | "boolean"
      listing_condition_enum: "new" | "like_new" | "good" | "fair" | "poor"
      listing_price_type_enum: "fixed" | "negotiable" | "free"
      listing_status_enum:
        | "draft"
        | "pending_review"
        | "active"
        | "reserved"
        | "sold"
        | "rejected"
        | "paused"
        | "expired"
        | "removed"
      media_processing_status_enum:
        | "uploading"
        | "processing"
        | "ready"
        | "failed"
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
      transition_actor_kind_enum: "seller" | "moderator" | "system"
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
      attribute_value_type_enum: ["text", "number", "select", "boolean"],
      listing_condition_enum: ["new", "like_new", "good", "fair", "poor"],
      listing_price_type_enum: ["fixed", "negotiable", "free"],
      listing_status_enum: [
        "draft",
        "pending_review",
        "active",
        "reserved",
        "sold",
        "rejected",
        "paused",
        "expired",
        "removed",
      ],
      media_processing_status_enum: [
        "uploading",
        "processing",
        "ready",
        "failed",
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
      transition_actor_kind_enum: ["seller", "moderator", "system"],
    },
  },
} as const

