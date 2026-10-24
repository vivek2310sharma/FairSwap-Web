export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      car_brands: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id?: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      car_catalogue_rows: {
        Row: {
          model_id: string
          raw: Json
          selection_enabled: boolean
          snapshot_id: string
          source_order: number
          source_row: number
        }
        Insert: {
          model_id: string
          raw: Json
          selection_enabled?: boolean
          snapshot_id: string
          source_order: number
          source_row: number
        }
        Update: {
          model_id?: string
          raw?: Json
          selection_enabled?: boolean
          snapshot_id?: string
          source_order?: number
          source_row?: number
        }
        Relationships: [
          {
            foreignKeyName: "car_catalogue_rows_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "car_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_catalogue_rows_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "car_source_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      car_category_contracts: {
        Row: {
          category_id: string
          display_order: number
          fields: Json
          source_path: Json
          source_provenance: Json
          version_id: string
        }
        Insert: {
          category_id: string
          display_order: number
          fields: Json
          source_path: Json
          source_provenance: Json
          version_id: string
        }
        Update: {
          category_id?: string
          display_order?: number
          fields?: Json
          source_path?: Json
          source_provenance?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_category_contracts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_category_contracts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "car_contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      car_contract_versions: {
        Row: {
          contract_key: string
          definition: Json
          id: string
          new_assignment_enabled: boolean
          snapshot_id: string
        }
        Insert: {
          contract_key: string
          definition: Json
          id?: string
          new_assignment_enabled?: boolean
          snapshot_id: string
        }
        Update: {
          contract_key?: string
          definition?: Json
          id?: string
          new_assignment_enabled?: boolean
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_contract_versions_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "car_source_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      car_models: {
        Row: {
          brand_id: string
          id: string
          label: string
        }
        Insert: {
          brand_id: string
          id?: string
          label: string
        }
        Update: {
          brand_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "car_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      car_source_snapshots: {
        Row: {
          id: string
          row_count: number
          sha256: string
          source_file: string
        }
        Insert: {
          id?: string
          row_count: number
          sha256: string
          source_file: string
        }
        Update: {
          id?: string
          row_count?: number
          sha256?: string
          source_file?: string
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
          macro_category: string | null
          name: string
          new_listing_enabled: boolean
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
          macro_category?: string | null
          name: string
          new_listing_enabled?: boolean
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
          macro_category?: string | null
          name?: string
          new_listing_enabled?: boolean
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
      conversation_read_states: {
        Row: {
          conversation_id: string
          last_read_at: string
          last_read_message_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          last_read_message_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          last_read_message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_read_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_read_state_message"
            columns: ["conversation_id", "last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["conversation_id", "id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempt_count: number
          created_at: string
          event_type: Database["public"]["Enums"]["email_outbox_event_type"]
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_error_status: number | null
          listing_id: string
          lock_token: string | null
          locked_at: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient_user_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_outbox_status"]
          transition_id: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_type: Database["public"]["Enums"]["email_outbox_event_type"]
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_error_status?: number | null
          listing_id: string
          lock_token?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          recipient_user_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_outbox_status"]
          transition_id: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["email_outbox_event_type"]
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_error_status?: number | null
          listing_id?: string
          lock_token?: string | null
          locked_at?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          recipient_user_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_outbox_status"]
          transition_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_transition_id_fkey"
            columns: ["transition_id"]
            isOneToOne: false
            referencedRelation: "listing_status_transitions"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      india_postal_data: {
        Row: {
          circle: string | null
          created_at: string
          delivery_status: string | null
          district: string
          division: string | null
          id: string
          office_name: string
          office_type: string | null
          pincode: string
          region: string | null
          source: string
          source_record_key: string
          source_updated_at: string | null
          state: string
          taluk: string | null
          updated_at: string
        }
        Insert: {
          circle?: string | null
          created_at?: string
          delivery_status?: string | null
          district: string
          division?: string | null
          id?: string
          office_name: string
          office_type?: string | null
          pincode: string
          region?: string | null
          source: string
          source_record_key: string
          source_updated_at?: string | null
          state: string
          taluk?: string | null
          updated_at?: string
        }
        Update: {
          circle?: string | null
          created_at?: string
          delivery_status?: string | null
          district?: string
          division?: string | null
          id?: string
          office_name?: string
          office_type?: string | null
          pincode?: string
          region?: string | null
          source?: string
          source_record_key?: string
          source_updated_at?: string | null
          state?: string
          taluk?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      listing_car_contexts: {
        Row: {
          brand_id: string | null
          brand_text: string | null
          category_id: string
          classification_review_required: boolean
          listing_id: string
          mode: string
          model_id: string | null
          model_text: string | null
          version_id: string
        }
        Insert: {
          brand_id?: string | null
          brand_text?: string | null
          category_id: string
          classification_review_required?: boolean
          listing_id: string
          mode: string
          model_id?: string | null
          model_text?: string | null
          version_id: string
        }
        Update: {
          brand_id?: string | null
          brand_text?: string | null
          category_id?: string
          classification_review_required?: boolean
          listing_id?: string
          mode?: string
          model_id?: string | null
          model_text?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_car_contexts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "car_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_car_contexts_category_id_version_id_fkey"
            columns: ["category_id", "version_id"]
            isOneToOne: false
            referencedRelation: "car_category_contracts"
            referencedColumns: ["category_id", "version_id"]
          },
          {
            foreignKeyName: "listing_car_contexts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_car_contexts_model_id_brand_id_fkey"
            columns: ["model_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "car_models"
            referencedColumns: ["id", "brand_id"]
          },
        ]
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
          uploader_id: string | null
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
          uploader_id?: string | null
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
          uploader_id?: string | null
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
      listing_property_contexts: {
        Row: {
          category_id: string
          financial: Json
          listing_id: string
          society_name: string | null
          version_id: string
        }
        Insert: {
          category_id: string
          financial: Json
          listing_id: string
          society_name?: string | null
          version_id: string
        }
        Update: {
          category_id?: string
          financial?: Json
          listing_id?: string
          society_name?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_property_contexts_category_id_version_id_fkey"
            columns: ["category_id", "version_id"]
            isOneToOne: false
            referencedRelation: "property_category_contracts"
            referencedColumns: ["category_id", "version_id"]
          },
          {
            foreignKeyName: "listing_property_contexts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_slug_history: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_slug_history_listing_id_fkey"
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
      listing_vehicle_contexts: {
        Row: {
          brand_id: string | null
          brand_text: string | null
          category_id: string
          classification_review_required: boolean
          listing_id: string
          mode: string
          model_id: string | null
          model_text: string | null
          version_id: string
        }
        Insert: {
          brand_id?: string | null
          brand_text?: string | null
          category_id: string
          classification_review_required?: boolean
          listing_id: string
          mode: string
          model_id?: string | null
          model_text?: string | null
          version_id: string
        }
        Update: {
          brand_id?: string | null
          brand_text?: string | null
          category_id?: string
          classification_review_required?: boolean
          listing_id?: string
          mode?: string
          model_id?: string | null
          model_text?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_vehicle_contexts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vehicle_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_vehicle_contexts_category_id_version_id_fkey"
            columns: ["category_id", "version_id"]
            isOneToOne: false
            referencedRelation: "vehicle_category_contracts"
            referencedColumns: ["category_id", "version_id"]
          },
          {
            foreignKeyName: "listing_vehicle_contexts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_vehicle_contexts_model_id_brand_id_fkey"
            columns: ["model_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id", "brand_id"]
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
          landmark: string | null
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
          search_vector: unknown
          seller_id: string | null
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
          landmark?: string | null
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
          search_vector?: unknown
          seller_id?: string | null
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
          landmark?: string | null
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
          search_vector?: unknown
          seller_id?: string | null
          slug?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status_enum"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "listings_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "listing_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["user_id"]
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
      messages: {
        Row: {
          client_request_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          client_request_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          client_request_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type_enum"]
          user_id?: string
        }
        Relationships: []
      }
      policy_acceptance_records: {
        Row: {
          acceptable_use_version: string
          accepted_at: string
          id: string
          minimum_age_confirmed: number
          privacy_policy_version: string
          terms_version: string
          user_id: string
        }
        Insert: {
          acceptable_use_version: string
          accepted_at?: string
          id?: string
          minimum_age_confirmed: number
          privacy_policy_version: string
          terms_version: string
          user_id: string
        }
        Update: {
          acceptable_use_version?: string
          accepted_at?: string
          id?: string
          minimum_age_confirmed?: number
          privacy_policy_version?: string
          terms_version?: string
          user_id?: string
        }
        Relationships: []
      }
      postal_pincode_localities: {
        Row: {
          created_at: string
          id: string
          locality_id: string
          office_name: string | null
          pincode: string
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          locality_id: string
          office_name?: string | null
          pincode: string
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          locality_id?: string
          office_name?: string | null
          pincode?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "postal_pincode_localities_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
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
          user_id: string | null
        }
        Insert: {
          id?: string
          request_type: Database["public"]["Enums"]["privacy_request_type_enum"]
          requested_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["privacy_request_status_enum"]
          user_id?: string | null
        }
        Update: {
          id?: string
          request_type?: Database["public"]["Enums"]["privacy_request_type_enum"]
          requested_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["privacy_request_status_enum"]
          user_id?: string | null
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
      property_category_contracts: {
        Row: {
          category_id: string
          definition: Json
          display_order: number
          fields: Json
          source_path: Json
          source_provenance: Json
          version_id: string
        }
        Insert: {
          category_id: string
          definition: Json
          display_order: number
          fields: Json
          source_path: Json
          source_provenance: Json
          version_id: string
        }
        Update: {
          category_id?: string
          definition?: Json
          display_order?: number
          fields?: Json
          source_path?: Json
          source_provenance?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_category_contracts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_category_contracts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "property_contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      property_contract_versions: {
        Row: {
          contract_key: string
          definition: Json
          id: string
          new_assignment_enabled: boolean
          source_file: string
          source_sha256: string
        }
        Insert: {
          contract_key: string
          definition: Json
          id?: string
          new_assignment_enabled?: boolean
          source_file: string
          source_sha256: string
        }
        Update: {
          contract_key?: string
          definition?: Json
          id?: string
          new_assignment_enabled?: boolean
          source_file?: string
          source_sha256?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          assigned_to: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_staff_id: string | null
          status: Database["public"]["Enums"]["report_status_enum"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type_enum"]
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["report_status_enum"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type_enum"]
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["report_status_enum"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type_enum"]
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
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal_note: boolean
          is_staff_reply: boolean
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal_note?: boolean
          is_staff_reply?: boolean
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal_note?: boolean
          is_staff_reply?: boolean
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["support_ticket_category_enum"]
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["support_ticket_priority_enum"]
          status: Database["public"]["Enums"]["support_ticket_status_enum"]
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["support_ticket_category_enum"]
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority_enum"]
          status?: Database["public"]["Enums"]["support_ticket_status_enum"]
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category_enum"]
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority_enum"]
          status?: Database["public"]["Enums"]["support_ticket_status_enum"]
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          acceptable_use_version: string | null
          account_status: Database["public"]["Enums"]["account_status_enum"]
          age_confirmed_at: string | null
          created_at: string
          minimum_age_confirmed: number | null
          notification_preferences: Json
          optional_contact_preferences: Json
          privacy_policy_version: string
          terms_accepted_at: string
          terms_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acceptable_use_version?: string | null
          account_status?: Database["public"]["Enums"]["account_status_enum"]
          age_confirmed_at?: string | null
          created_at?: string
          minimum_age_confirmed?: number | null
          notification_preferences?: Json
          optional_contact_preferences?: Json
          privacy_policy_version: string
          terms_accepted_at: string
          terms_version: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acceptable_use_version?: string | null
          account_status?: Database["public"]["Enums"]["account_status_enum"]
          age_confirmed_at?: string | null
          created_at?: string
          minimum_age_confirmed?: number | null
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
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      vehicle_brands: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id?: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      vehicle_catalogue_rows: {
        Row: {
          model_id: string
          raw: Json
          selection_enabled: boolean
          snapshot_id: string
          source_order: number
          source_row: number
        }
        Insert: {
          model_id: string
          raw: Json
          selection_enabled?: boolean
          snapshot_id: string
          source_order: number
          source_row: number
        }
        Update: {
          model_id?: string
          raw?: Json
          selection_enabled?: boolean
          snapshot_id?: string
          source_order?: number
          source_row?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_catalogue_rows_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_catalogue_rows_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "vehicle_source_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_category_contracts: {
        Row: {
          category_id: string
          display_order: number
          fields: Json
          source_path: Json
          source_provenance: Json
          version_id: string
        }
        Insert: {
          category_id: string
          display_order: number
          fields: Json
          source_path: Json
          source_provenance: Json
          version_id: string
        }
        Update: {
          category_id?: string
          display_order?: number
          fields?: Json
          source_path?: Json
          source_provenance?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_category_contracts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_category_contracts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vehicle_contract_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_contract_versions: {
        Row: {
          contract_key: string
          definition: Json
          id: string
          new_assignment_enabled: boolean
          snapshot_id: string
        }
        Insert: {
          contract_key: string
          definition: Json
          id?: string
          new_assignment_enabled?: boolean
          snapshot_id: string
        }
        Update: {
          contract_key?: string
          definition?: Json
          id?: string
          new_assignment_enabled?: boolean
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_contract_versions_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "vehicle_source_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_models: {
        Row: {
          brand_id: string
          id: string
          label: string
        }
        Insert: {
          brand_id: string
          id?: string
          label: string
        }
        Update: {
          brand_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vehicle_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_registration_states: {
        Row: {
          id: string
          kind: string
          label: string
          reference_key: string
          source_url: string
        }
        Insert: {
          id?: string
          kind: string
          label: string
          reference_key: string
          source_url: string
        }
        Update: {
          id?: string
          kind?: string
          label?: string
          reference_key?: string
          source_url?: string
        }
        Relationships: []
      }
      vehicle_source_snapshots: {
        Row: {
          id: string
          row_count: number
          sha256: string
          source_file: string
        }
        Insert: {
          id?: string
          row_count: number
          sha256: string
          source_file: string
        }
        Update: {
          id?: string
          row_count?: number
          sha256?: string
          source_file?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_ticket_internal_note: {
        Args: { content: string; ticket_id: string }
        Returns: string
      }
      admin_assign_staff_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["staff_role_enum"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      admin_begin_account_deletion: {
        Args: { request_id: string }
        Returns: Json
      }
      admin_finalize_account_deletion: {
        Args: { request_id: string }
        Returns: undefined
      }
      admin_fulfill_data_export: { Args: { request_id: string }; Returns: Json }
      admin_get_report_evidence: { Args: { report_id: string }; Returns: Json }
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
      admin_reply_support_ticket: {
        Args: { content: string; ticket_id: string }
        Returns: string
      }
      admin_resolve_privacy_request: {
        Args: {
          p_new_status: Database["public"]["Enums"]["privacy_request_status_enum"]
          p_notes: string
          p_request_id: string
        }
        Returns: undefined
      }
      admin_resolve_report: {
        Args: {
          new_status: Database["public"]["Enums"]["report_status_enum"]
          report_id: string
          resolution_notes?: string
        }
        Returns: undefined
      }
      admin_revoke_staff_role: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_search_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: Database["public"]["Enums"]["account_status_enum"]
        }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status_enum"]
          created_at: string
          display_name: string
          email: string
          listings_count: number
          role: Database["public"]["Enums"]["staff_role_enum"]
          user_id: string
        }[]
      }
      admin_update_ticket_status: {
        Args: {
          assigned_to?: string
          priority: Database["public"]["Enums"]["support_ticket_priority_enum"]
          status: Database["public"]["Enums"]["support_ticket_status_enum"]
          ticket_id: string
        }
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
      block_user: {
        Args: { blocked_user_id: string; reason?: string }
        Returns: undefined
      }
      claim_email_outbox_batch: {
        Args: {
          p_batch_size: number
          p_lock_token: string
          p_stale_timeout_seconds?: number
        }
        Returns: {
          attempt_count: number
          created_at: string
          event_type: Database["public"]["Enums"]["email_outbox_event_type"]
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_error_status: number | null
          listing_id: string
          lock_token: string | null
          locked_at: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient_user_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_outbox_status"]
          transition_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_email_outbox_job_by_id: {
        Args: {
          p_job_id: string
          p_lock_token: string
          p_stale_timeout_seconds?: number
        }
        Returns: {
          attempt_count: number
          created_at: string
          event_type: Database["public"]["Enums"]["email_outbox_event_type"]
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_error_status: number | null
          listing_id: string
          lock_token: string | null
          locked_at: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          recipient_user_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_outbox_status"]
          transition_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_email_outbox_job: {
        Args: {
          p_job_id: string
          p_lock_token: string
          p_provider_message_id: string
        }
        Returns: boolean
      }
      create_report: {
        Args: {
          details?: string
          reason: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type_enum"]
        }
        Returns: string
      }
      create_support_ticket: {
        Args: {
          category: Database["public"]["Enums"]["support_ticket_category_enum"]
          message: string
          subject: string
        }
        Returns: string
      }
      customer_reply_support_ticket: {
        Args: { content: string; ticket_id: string }
        Returns: string
      }
      delete_listing_media_internal: {
        Args: { listing_id: string; media_id: string }
        Returns: Json
      }
      expire_listing: { Args: { listing_id: string }; Returns: Json }
      fail_email_outbox_job: {
        Args: {
          p_backoff_seconds?: number
          p_error_code: string
          p_error_message: string
          p_error_status: number
          p_is_permanent: boolean
          p_job_id: string
          p_lock_token: string
          p_max_attempts?: number
        }
        Returns: boolean
      }
      get_my_reports: {
        Args: never
        Returns: {
          created_at: string
          id: string
          reason: string
          resolved_at: string
          status: Database["public"]["Enums"]["report_status_enum"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type_enum"]
        }[]
      }
      get_seller_listing_category_context: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      get_seller_listing_location_private: {
        Args: { p_listing_id: string }
        Returns: {
          landmark: string
          listing_id: string
          pin_code: string
        }[]
      }
      get_seller_submission_status: {
        Args: { listing_id: string }
        Returns: Json
      }
      get_staff_listing_location_private: {
        Args: { p_listing_id: string }
        Returns: {
          landmark: string
          listing_id: string
          pin_code: string
        }[]
      }
      has_current_policy_acceptance: { Args: never; Returns: boolean }
      is_listing_publicly_visible: {
        Args: { listing_id: string }
        Returns: boolean
      }
      lookup_car_catalogue: {
        Args: {
          p_brand_id?: string
          p_category_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_selected_id?: string
          p_version_id: string
          p_view?: string
        }
        Returns: Json
      }
      lookup_pincode: { Args: { p_pincode: string }; Returns: Json }
      lookup_two_wheeler_catalogue: {
        Args: {
          p_brand_id?: string
          p_category_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_selected_id?: string
          p_version_id: string
          p_view?: string
        }
        Returns: Json
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_conversation_read: {
        Args: { conversation_id: string; message_id: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      moderate_listing: {
        Args: { action: string; listing_id: string; reason?: string }
        Returns: Json
      }
      moderate_listing_reviewed: {
        Args: {
          action: string
          expected_revision: number
          expected_status: Database["public"]["Enums"]["listing_status_enum"]
          listing_id: string
          reason?: string | null
        }
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
      record_policy_reacceptance: {
        Args: { age_confirmed: boolean; terms_and_privacy_accepted: boolean }
        Returns: Json
      }
      save_car_draft: {
        Args: {
          p_listing: Json
          p_listing_id: string
          p_resolution: Json
          p_version_id: string
        }
        Returns: string
      }
      save_property_draft: {
        Args: {
          p_financial: Json
          p_listing: Json
          p_listing_id: string
          p_society_name: string
          p_version_id: string
        }
        Returns: string
      }
      save_two_wheeler_draft: {
        Args: {
          p_listing: Json
          p_listing_id: string
          p_resolution: Json
          p_version_id: string
        }
        Returns: string
      }
      search_public_listings: {
        Args: {
          category_id?: string
          category_slug?: string
          city_id?: string
          condition?: string
          locality_id?: string
          page?: number
          per_page?: number
          price_max?: number
          price_min?: number
          query?: string
          sort?: string
        }
        Returns: Json
      }
      search_seller_public_listings: {
        Args: {
          category_slug?: string
          condition?: string
          page?: number
          per_page?: number
          price_max?: number
          price_min?: number
          query?: string
          seller_id: string
          sort?: string
        }
        Returns: Json
      }
      seller_delete_listing_media: {
        Args: { listing_id: string; media_id: string }
        Returns: Json
      }
      seller_reorder_listing_media: {
        Args: { listing_id: string; media_ids: string[] }
        Returns: Json
      }
      seller_set_listing_cover_photo: {
        Args: { listing_id: string; media_id: string }
        Returns: Json
      }
      seller_submit_listing:
        | { Args: { listing_id: string }; Returns: Json }
        | {
            Args: { expected_revision: number; listing_id: string }
            Returns: Json
          }
      seller_transition_listing: {
        Args: { action: string; listing_id: string }
        Returns: Json
      }
      send_message: {
        Args: {
          client_request_id: string
          content: string
          conversation_id: string
        }
        Returns: Json
      }
      start_conversation: {
        Args: { client_request_id: string; content: string; listing_id: string }
        Returns: Json
      }
      unblock_user: { Args: { blocked_user_id: string }; Returns: undefined }
    }
    Enums: {
      account_status_enum:
        | "active"
        | "suspended"
        | "deletion_pending"
        | "deleted"
      attribute_value_type_enum: "text" | "number" | "select" | "boolean"
      email_outbox_event_type:
        | "listing_submitted_for_review"
        | "listing_approved"
        | "listing_rejected"
      email_outbox_status:
        | "pending"
        | "processing"
        | "retry"
        | "sent"
        | "dead_letter"
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
      notification_type_enum:
        | "new_message"
        | "listing_approved"
        | "listing_rejected"
        | "report_update"
        | "support_reply"
      privacy_request_status_enum:
        | "pending"
        | "in_progress"
        | "resolved"
        | "rejected"
      privacy_request_type_enum: "export_data" | "delete_account"
      report_status_enum: "pending" | "investigating" | "resolved" | "dismissed"
      report_target_type_enum: "listing" | "user" | "message"
      staff_role_enum:
        | "administrator"
        | "moderator"
        | "support_agent"
        | "content_editor"
      support_ticket_category_enum:
        | "general"
        | "account"
        | "moderation_appeal"
        | "safety"
        | "bug"
      support_ticket_priority_enum: "low" | "normal" | "high" | "urgent"
      support_ticket_status_enum:
        | "open"
        | "in_progress"
        | "awaiting_user"
        | "resolved"
        | "closed"
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
      email_outbox_event_type: [
        "listing_submitted_for_review",
        "listing_approved",
        "listing_rejected",
      ],
      email_outbox_status: [
        "pending",
        "processing",
        "retry",
        "sent",
        "dead_letter",
      ],
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
      notification_type_enum: [
        "new_message",
        "listing_approved",
        "listing_rejected",
        "report_update",
        "support_reply",
      ],
      privacy_request_status_enum: [
        "pending",
        "in_progress",
        "resolved",
        "rejected",
      ],
      privacy_request_type_enum: ["export_data", "delete_account"],
      report_status_enum: ["pending", "investigating", "resolved", "dismissed"],
      report_target_type_enum: ["listing", "user", "message"],
      staff_role_enum: [
        "administrator",
        "moderator",
        "support_agent",
        "content_editor",
      ],
      support_ticket_category_enum: [
        "general",
        "account",
        "moderation_appeal",
        "safety",
        "bug",
      ],
      support_ticket_priority_enum: ["low", "normal", "high", "urgent"],
      support_ticket_status_enum: [
        "open",
        "in_progress",
        "awaiting_user",
        "resolved",
        "closed",
      ],
      transition_actor_kind_enum: ["seller", "moderator", "system"],
    },
  },
} as const
