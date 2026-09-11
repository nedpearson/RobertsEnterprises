export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      action_center_records: {
        Row: {
          action_type: string
          ai_confidence: number | null
          ai_generated: boolean
          approval_type: string | null
          assigned_role: string | null
          assigned_user_id: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          customer_impact: string | null
          data_plane: string
          deep_link: string
          description: string | null
          dismissed_at: string | null
          due_at: string | null
          financial_impact_cents: number | null
          id: string
          location_id: string | null
          metadata_json: Json | null
          operational_impact: string | null
          priority: string
          requires_approval: boolean
          severity: string | null
          snoozed_until: string | null
          source_module: string
          source_record_id: string
          source_record_type: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          action_type: string
          ai_confidence?: number | null
          ai_generated?: boolean
          approval_type?: string | null
          assigned_role?: string | null
          assigned_user_id?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          customer_impact?: string | null
          data_plane?: string
          deep_link: string
          description?: string | null
          dismissed_at?: string | null
          due_at?: string | null
          financial_impact_cents?: number | null
          id?: string
          location_id?: string | null
          metadata_json?: Json | null
          operational_impact?: string | null
          priority?: string
          requires_approval?: boolean
          severity?: string | null
          snoozed_until?: string | null
          source_module: string
          source_record_id: string
          source_record_type: string
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          action_type?: string
          ai_confidence?: number | null
          ai_generated?: boolean
          approval_type?: string | null
          assigned_role?: string | null
          assigned_user_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          customer_impact?: string | null
          data_plane?: string
          deep_link?: string
          description?: string | null
          dismissed_at?: string | null
          due_at?: string | null
          financial_impact_cents?: number | null
          id?: string
          location_id?: string | null
          metadata_json?: Json | null
          operational_impact?: string | null
          priority?: string
          requires_approval?: boolean
          severity?: string | null
          snoozed_until?: string | null
          source_module?: string
          source_record_id?: string
          source_record_type?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      alterations: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          customer: string
          customer_id: string | null
          due_date: string | null
          gown: string | null
          id: string
          location: string | null
          next_fitting: string | null
          notes: string | null
          order_id: string | null
          price_cents: number | null
          seamstress: string | null
          status: string | null
          tasks: Json | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          customer: string
          customer_id?: string | null
          due_date?: string | null
          gown?: string | null
          id: string
          location?: string | null
          next_fitting?: string | null
          notes?: string | null
          order_id?: string | null
          price_cents?: number | null
          seamstress?: string | null
          status?: string | null
          tasks?: Json | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          customer?: string
          customer_id?: string | null
          due_date?: string | null
          gown?: string | null
          id?: string
          location?: string | null
          next_fitting?: string | null
          notes?: string | null
          order_id?: string | null
          price_cents?: number | null
          seamstress?: string | null
          status?: string | null
          tasks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "alterations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alterations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alterations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "alterations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alterations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alterations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          business_id: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          business_id?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          business_id?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      appointment_assignment_recommendations: {
        Row: {
          disqualification_reasons_json: Json | null
          employee_id: string | null
          generated_at: string | null
          id: string
          location_id: string | null
          model_metadata: Json | null
          proposed_end_at: string | null
          proposed_start_at: string | null
          request_id: string
          score: number | null
          score_breakdown_json: Json | null
        }
        Insert: {
          disqualification_reasons_json?: Json | null
          employee_id?: string | null
          generated_at?: string | null
          id?: string
          location_id?: string | null
          model_metadata?: Json | null
          proposed_end_at?: string | null
          proposed_start_at?: string | null
          request_id: string
          score?: number | null
          score_breakdown_json?: Json | null
        }
        Update: {
          disqualification_reasons_json?: Json | null
          employee_id?: string | null
          generated_at?: string | null
          id?: string
          location_id?: string | null
          model_metadata?: Json | null
          proposed_end_at?: string | null
          proposed_start_at?: string | null
          request_id?: string
          score?: number | null
          score_breakdown_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_assignment_recommendations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_assignment_recommendations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_audit_events: {
        Row: {
          actor_user_id: string | null
          appointment_id: string | null
          business_id: string
          created_at: string | null
          event_type: string
          id: string
          location_id: string | null
          new_values: Json | null
          previous_values: Json | null
          request_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          event_type: string
          id?: string
          location_id?: string | null
          new_values?: Json | null
          previous_values?: Json | null
          request_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          location_id?: string | null
          new_values?: Json | null
          previous_values?: Json | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_audit_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_audit_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_audit_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "appointment_audit_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_audit_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_gowns: {
        Row: {
          appointment_id: string
          business_id: string
          created_at: string | null
          gown_id: string | null
          id: string
          name: string
          notes: string | null
          price_cents: number | null
          rating: string | null
          style: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          business_id: string
          created_at?: string | null
          gown_id?: string | null
          id?: string
          name: string
          notes?: string | null
          price_cents?: number | null
          rating?: string | null
          style?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          business_id?: string
          created_at?: string | null
          gown_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          price_cents?: number | null
          rating?: string | null
          style?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_gowns_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_gowns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_gowns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "appointment_gowns_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "gowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_gowns_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_gowns_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "inventory_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_gowns_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "inventory_variants"
            referencedColumns: ["item_id"]
          },
        ]
      }
      appointment_holds: {
        Row: {
          business_id: string
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          end_at: string
          expires_at: string
          id: string
          location_id: string | null
          request_id: string | null
          room_id: string | null
          start_at: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          end_at: string
          expires_at: string
          id?: string
          location_id?: string | null
          request_id?: string | null
          room_id?: string | null
          start_at: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          end_at?: string
          expires_at?: string
          id?: string
          location_id?: string | null
          request_id?: string | null
          room_id?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_holds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "appointment_holds_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_intake_notification_outbox: {
        Row: {
          appointment_request_id: string
          attempts: number
          brand_id: string | null
          business_id: string
          created_at: string
          delivered_at: string | null
          id: string
          last_error: string | null
          next_attempt_at: string
          notification_type: string
          payload: Json
          recipient: string
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_request_id: string
          attempts?: number
          brand_id?: string | null
          business_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          notification_type?: string
          payload?: Json
          recipient: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_request_id?: string
          attempts?: number
          brand_id?: string | null
          business_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          notification_type?: string
          payload?: Json
          recipient?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_intake_notification_out_appointment_request_id_fkey"
            columns: ["appointment_request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_intake_notification_outbox_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_intake_notification_outbox_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_intake_notification_outbox_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "appointment_intake_notification_outbox_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "business_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notes: {
        Row: {
          appointment_id: string
          author_id: string
          business_id: string
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          author_id: string
          business_id: string
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          author_id?: string
          business_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_notes_appointment"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_request_location_preferences: {
        Row: {
          location_id: string
          preference_order: number | null
          request_id: string
        }
        Insert: {
          location_id: string
          preference_order?: number | null
          request_id: string
        }
        Update: {
          location_id?: string
          preference_order?: number | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_request_location_preferences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_request_location_preferences_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          brand_id: string | null
          budget_cents: number | null
          business_id: string
          campaign_attribution: string | null
          customer_id: string | null
          designer_interest: string | null
          entered_by_user_id: string | null
          event_date: string | null
          fee_paid: boolean | null
          flexible_date: boolean | null
          flexible_location: boolean | null
          id: string
          idempotency_key: string | null
          intake_source: string | null
          looking_for: string | null
          metadata_json: Json | null
          notes: string | null
          number_of_guests: number | null
          preferred_date_1: string | null
          preferred_date_2: string | null
          preferred_employee_id: string | null
          preferred_location_id: string | null
          preferred_window_1: string | null
          preferred_window_2: string | null
          priority: string | null
          service_id: string | null
          source_site_id: string | null
          status: string | null
          submitted_at: string | null
          type: string | null
        }
        Insert: {
          brand_id?: string | null
          budget_cents?: number | null
          business_id: string
          campaign_attribution?: string | null
          customer_id?: string | null
          designer_interest?: string | null
          entered_by_user_id?: string | null
          event_date?: string | null
          fee_paid?: boolean | null
          flexible_date?: boolean | null
          flexible_location?: boolean | null
          id?: string
          idempotency_key?: string | null
          intake_source?: string | null
          looking_for?: string | null
          metadata_json?: Json | null
          notes?: string | null
          number_of_guests?: number | null
          preferred_date_1?: string | null
          preferred_date_2?: string | null
          preferred_employee_id?: string | null
          preferred_location_id?: string | null
          preferred_window_1?: string | null
          preferred_window_2?: string | null
          priority?: string | null
          service_id?: string | null
          source_site_id?: string | null
          status?: string | null
          submitted_at?: string | null
          type?: string | null
        }
        Update: {
          brand_id?: string | null
          budget_cents?: number | null
          business_id?: string
          campaign_attribution?: string | null
          customer_id?: string | null
          designer_interest?: string | null
          entered_by_user_id?: string | null
          event_date?: string | null
          fee_paid?: boolean | null
          flexible_date?: boolean | null
          flexible_location?: boolean | null
          id?: string
          idempotency_key?: string | null
          intake_source?: string | null
          looking_for?: string | null
          metadata_json?: Json | null
          notes?: string | null
          number_of_guests?: number | null
          preferred_date_1?: string | null
          preferred_date_2?: string | null
          preferred_employee_id?: string | null
          preferred_location_id?: string | null
          preferred_window_1?: string | null
          preferred_window_2?: string | null
          priority?: string | null
          service_id?: string | null
          source_site_id?: string | null
          status?: string | null
          submitted_at?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "appointment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_preferred_location_id_fkey"
            columns: ["preferred_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "appointment_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_source_site_id_fkey"
            columns: ["source_site_id"]
            isOneToOne: false
            referencedRelation: "business_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_services: {
        Row: {
          active: boolean | null
          business_id: string
          cleanup_buffer_minutes: number | null
          created_at: string | null
          duration_minutes: number
          id: string
          name: string
          required_role: string | null
          required_room_type: string | null
          setup_buffer_minutes: number | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          cleanup_buffer_minutes?: number | null
          created_at?: string | null
          duration_minutes: number
          id?: string
          name: string
          required_role?: string | null
          required_room_type?: string | null
          setup_buffer_minutes?: number | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          cleanup_buffer_minutes?: number | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          required_role?: string | null
          required_room_type?: string | null
          setup_buffer_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      appointments: {
        Row: {
          budget_cents: number | null
          business_id: string
          check_in_time: string | null
          confirmation_status: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer: string | null
          customer_id: string | null
          date: string | null
          employee_id: string | null
          end_at: string | null
          end_time: string | null
          external_appointment_id: string | null
          fee_paid: boolean | null
          id: string
          intake_source: string | null
          location: string | null
          location_id: string | null
          looking_for: string | null
          lost_reason: string | null
          next_action_id: string | null
          outcome: string | null
          provider_connection_id: string | null
          request_id: string | null
          revenue_cents: number | null
          room_id: string | null
          sentiment: string | null
          service_id: string | null
          start_at: string | null
          start_time: string | null
          status: string | null
          stylist: string | null
          time: string | null
          type: string | null
        }
        Insert: {
          budget_cents?: number | null
          business_id: string
          check_in_time?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer?: string | null
          customer_id?: string | null
          date?: string | null
          employee_id?: string | null
          end_at?: string | null
          end_time?: string | null
          external_appointment_id?: string | null
          fee_paid?: boolean | null
          id?: string
          intake_source?: string | null
          location?: string | null
          location_id?: string | null
          looking_for?: string | null
          lost_reason?: string | null
          next_action_id?: string | null
          outcome?: string | null
          provider_connection_id?: string | null
          request_id?: string | null
          revenue_cents?: number | null
          room_id?: string | null
          sentiment?: string | null
          service_id?: string | null
          start_at?: string | null
          start_time?: string | null
          status?: string | null
          stylist?: string | null
          time?: string | null
          type?: string | null
        }
        Update: {
          budget_cents?: number | null
          business_id?: string
          check_in_time?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer?: string | null
          customer_id?: string | null
          date?: string | null
          employee_id?: string | null
          end_at?: string | null
          end_time?: string | null
          external_appointment_id?: string | null
          fee_paid?: boolean | null
          id?: string
          intake_source?: string | null
          location?: string | null
          location_id?: string | null
          looking_for?: string | null
          lost_reason?: string | null
          next_action_id?: string | null
          outcome?: string | null
          provider_connection_id?: string | null
          request_id?: string | null
          revenue_cents?: number | null
          room_id?: string | null
          sentiment?: string | null
          service_id?: string | null
          start_at?: string | null
          start_time?: string | null
          status?: string | null
          stylist?: string | null
          time?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_next_action_id_fkey"
            columns: ["next_action_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "appointment_services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          actor_user_id: string | null
          after_state: Json | null
          after_value: Json | null
          before_state: Json | null
          before_value: Json | null
          brand: string | null
          business_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          reason: string | null
          resource: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          actor_user_id?: string | null
          after_state?: Json | null
          after_value?: Json | null
          before_state?: Json | null
          before_value?: Json | null
          brand?: string | null
          business_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          reason?: string | null
          resource?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          actor_user_id?: string | null
          after_state?: Json | null
          after_value?: Json | null
          before_state?: Json | null
          before_value?: Json | null
          brand?: string | null
          business_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          reason?: string | null
          resource?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      auth_dump: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string | null
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean | null
          is_sso_user: boolean | null
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string | null
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean | null
          is_sso_user?: boolean | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string | null
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean | null
          is_sso_user?: boolean | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auth_dump2: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string | null
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean | null
          is_sso_user: boolean | null
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string | null
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean | null
          is_sso_user?: boolean | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string | null
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean | null
          is_sso_user?: boolean | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auth_identities_dump: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          identity_data: Json | null
          last_sign_in_at: string | null
          provider: string | null
          provider_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          identity_data?: Json | null
          last_sign_in_at?: string | null
          provider?: string | null
          provider_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          identity_data?: Json | null
          last_sign_in_at?: string | null
          provider?: string | null
          provider_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_type: string
          brand: string | null
          business_id: string | null
          created_at: string
          execution_count: number
          execution_level: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          action_type: string
          brand?: string | null
          business_id?: string | null
          created_at?: string
          execution_count?: number
          execution_level?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          brand?: string | null
          business_id?: string | null
          created_at?: string
          execution_count?: number
          execution_level?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          location_id: string | null
          log: string | null
          name: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          log?: string | null
          name?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          log?: string | null
          name?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "automation_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_fees: {
        Row: {
          amount_cents: number
          appointment_id: string
          business_id: string
          created_at: string | null
          id: string
          is_refundable: boolean | null
          payment_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          appointment_id: string
          business_id: string
          created_at?: string | null
          id?: string
          is_refundable?: boolean | null
          payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          appointment_id?: string
          business_id?: string
          created_at?: string | null
          id?: string
          is_refundable?: boolean | null
          payment_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_fees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_fees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "booking_fees_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          name: string
          vendor_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          name: string
          vendor_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          name?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "brands_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      business_brands: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      business_memberships: {
        Row: {
          approved_by: string | null
          business_id: string | null
          created_at: string | null
          id: string
          invited_by: string | null
          role: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_by?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_by?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      business_sites: {
        Row: {
          booking_enabled: boolean | null
          brand_id: string | null
          business_id: string
          created_at: string | null
          domain: string
          ecommerce_enabled: boolean | null
          id: string
          inquiry_enabled: boolean | null
          is_primary: boolean | null
          location_id: string | null
          name: string
          notification_email: string | null
          provider: string
          site_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_enabled?: boolean | null
          brand_id?: string | null
          business_id: string
          created_at?: string | null
          domain: string
          ecommerce_enabled?: boolean | null
          id?: string
          inquiry_enabled?: boolean | null
          is_primary?: boolean | null
          location_id?: string | null
          name: string
          notification_email?: string | null
          provider: string
          site_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_enabled?: boolean | null
          brand_id?: string | null
          business_id?: string
          created_at?: string | null
          domain?: string
          ecommerce_enabled?: boolean | null
          id?: string
          inquiry_enabled?: boolean | null
          is_primary?: boolean | null
          location_id?: string | null
          name?: string
          notification_email?: string | null
          provider?: string
          site_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_sites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_sites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_sites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "business_sites_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          accent_color: string | null
          billing_email: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          display_name: string | null
          id: string
          industry: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          onboarding_progress: Json | null
          onboarding_status: string | null
          organization_type: string | null
          parent_id: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          state: string | null
          status: string | null
          subscription_plan_id: string | null
          subscription_status: string | null
          support_email: string | null
          timezone: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          version: number | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          billing_email?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          onboarding_progress?: Json | null
          onboarding_status?: string | null
          organization_type?: string | null
          parent_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          state?: string | null
          status?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string | null
          support_email?: string | null
          timezone?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          version?: number | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          billing_email?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          onboarding_progress?: Json | null
          onboarding_status?: string | null
          organization_type?: string | null
          parent_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          state?: string | null
          status?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string | null
          support_email?: string | null
          timezone?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          version?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      calendar_sync_events: {
        Row: {
          appointment_id: string | null
          employee_id: string
          error_message: string | null
          event_type: string
          id: string
          occurred_at: string | null
          provider: string
          provider_event_id: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          employee_id: string
          error_message?: string | null
          event_type: string
          id?: string
          occurred_at?: string | null
          provider: string
          provider_event_id?: string | null
          status: string
        }
        Update: {
          appointment_id?: string | null
          employee_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          occurred_at?: string | null
          provider?: string
          provider_event_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          appointment_id: string | null
          business_id: string
          communication_id: string | null
          created_at: string | null
          customer_confirmed: boolean | null
          customer_id: string | null
          duration_seconds: number | null
          employee_id: string
          follow_up_required: boolean | null
          id: string
          next_contact_date: string | null
          notes: string | null
          outcome: string
          voice_to_text_transcript: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          communication_id?: string | null
          created_at?: string | null
          customer_confirmed?: boolean | null
          customer_id?: string | null
          duration_seconds?: number | null
          employee_id: string
          follow_up_required?: boolean | null
          id?: string
          next_contact_date?: string | null
          notes?: string | null
          outcome: string
          voice_to_text_transcript?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          communication_id?: string | null
          created_at?: string | null
          customer_confirmed?: boolean | null
          customer_id?: string | null
          duration_seconds?: number | null
          employee_id?: string
          follow_up_required?: boolean | null
          id?: string
          next_contact_date?: string | null
          notes?: string | null
          outcome?: string
          voice_to_text_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "call_logs_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_import_batches: {
        Row: {
          business_id: string
          column_mapping: Json
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_rows: number
          file_name: string
          id: string
          imported_rows: number
          status: string
          total_rows: number
          updated_at: string
          vendor_id: string
          warning_rows: number
        }
        Insert: {
          business_id: string
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_rows?: number
          file_name: string
          id?: string
          imported_rows?: number
          status?: string
          total_rows?: number
          updated_at?: string
          vendor_id: string
          warning_rows?: number
        }
        Update: {
          business_id?: string
          column_mapping?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_rows?: number
          file_name?: string
          id?: string
          imported_rows?: number
          status?: string
          total_rows?: number
          updated_at?: string
          vendor_id?: string
          warning_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_import_batches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_batches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "catalog_import_batches_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_import_rows: {
        Row: {
          batch_id: string
          business_id: string
          created_at: string
          id: string
          mapped_data: Json
          product_id: string | null
          raw_data: Json
          row_number: number
          validation_errors: Json
          validation_status: string
          variant_id: string | null
        }
        Insert: {
          batch_id: string
          business_id: string
          created_at?: string
          id?: string
          mapped_data?: Json
          product_id?: string | null
          raw_data?: Json
          row_number: number
          validation_errors?: Json
          validation_status: string
          variant_id?: string | null
        }
        Update: {
          batch_id?: string
          business_id?: string
          created_at?: string
          id?: string
          mapped_data?: Json
          product_id?: string | null
          raw_data?: Json
          row_number?: number
          validation_errors?: Json
          validation_status?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "catalog_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "catalog_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_listings: {
        Row: {
          business_id: string
          channel_id: string
          created_at: string | null
          external_product_id: string | null
          external_variant_id: string | null
          id: string
          product_id: string
          status: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          business_id: string
          channel_id: string
          created_at?: string | null
          external_product_id?: string | null
          external_variant_id?: string | null
          id?: string
          product_id: string
          status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          business_id?: string
          channel_id?: string
          created_at?: string | null
          external_product_id?: string | null
          external_variant_id?: string | null
          id?: string
          product_id?: string
          status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "channel_listings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "commerce_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_listings_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_product_overrides: {
        Row: {
          business_id: string
          compare_at_cents: number | null
          created_at: string | null
          id: string
          listing_id: string
          price_cents: number | null
          title_override: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          compare_at_cents?: number | null
          created_at?: string | null
          id?: string
          listing_id: string
          price_cents?: number | null
          title_override?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          compare_at_cents?: number | null
          created_at?: string | null
          id?: string
          listing_id?: string
          price_cents?: number | null
          title_override?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_product_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_product_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "channel_product_overrides_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "channel_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          brand_id: string | null
          business_id: string
          created_at: string | null
          id: string
          name: string
          season: string | null
          year: number | null
        }
        Insert: {
          brand_id?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          name: string
          season?: string | null
          year?: number | null
        }
        Update: {
          brand_id?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          name?: string
          season?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      commerce_channels: {
        Row: {
          business_id: string
          connected_resource_id: string | null
          created_at: string | null
          id: string
          site_id: string
          status: string | null
          sync_direction: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          connected_resource_id?: string | null
          created_at?: string | null
          id?: string
          site_id: string
          status?: string | null
          sync_direction?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          connected_resource_id?: string | null
          created_at?: string | null
          id?: string
          site_id?: string
          status?: string | null
          sync_direction?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_channels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_channels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "commerce_channels_connected_resource_id_fkey"
            columns: ["connected_resource_id"]
            isOneToOne: false
            referencedRelation: "connected_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_channels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "business_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_attachments: {
        Row: {
          communication_id: string
          file_id: string
        }
        Insert: {
          communication_id: string
          file_id: string
        }
        Update: {
          communication_id?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_attachments_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_delivery_events: {
        Row: {
          communication_id: string
          error_message: string | null
          id: string
          occurred_at: string | null
          provider_status: string | null
          status: string
        }
        Insert: {
          communication_id: string
          error_message?: string | null
          id?: string
          occurred_at?: string | null
          provider_status?: string | null
          status: string
        }
        Update: {
          communication_id?: string
          error_message?: string | null
          id?: string
          occurred_at?: string | null
          provider_status?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_delivery_events_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_recipients: {
        Row: {
          address: string
          communication_id: string
          id: string
          name: string | null
          recipient_type: string
        }
        Insert: {
          address: string
          communication_id: string
          id?: string
          name?: string | null
          recipient_type: string
        }
        Update: {
          address?: string
          communication_id?: string
          id?: string
          name?: string | null
          recipient_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_recipients_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_threads: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          customer_id: string
          id: string
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "communication_threads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          appointment_id: string | null
          body: string | null
          business_id: string
          channel: string
          created_at: string | null
          customer_id: string | null
          direction: string
          follow_up_required: boolean | null
          html_body: string | null
          id: string
          is_automated: boolean | null
          location_id: string | null
          provider_message_id: string | null
          recipient_identifier: string | null
          sender_id: string | null
          sender_name: string | null
          sent_at: string | null
          status: string | null
          thread_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          business_id: string
          channel: string
          created_at?: string | null
          customer_id?: string | null
          direction: string
          follow_up_required?: boolean | null
          html_body?: string | null
          id?: string
          is_automated?: boolean | null
          location_id?: string | null
          provider_message_id?: string | null
          recipient_identifier?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string | null
          thread_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          business_id?: string
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          follow_up_required?: boolean | null
          html_body?: string | null
          id?: string
          is_automated?: boolean | null
          location_id?: string | null
          provider_message_id?: string | null
          recipient_identifier?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          access_token: string | null
          business_id: string
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          display_name: string
          external_account_id: string | null
          id: string
          last_verified_at: string | null
          provider: string
          refresh_token: string | null
          scopes: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          business_id: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          display_name: string
          external_account_id?: string | null
          id?: string
          last_verified_at?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          business_id?: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          display_name?: string
          external_account_id?: string | null
          id?: string
          last_verified_at?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      connected_resources: {
        Row: {
          business_id: string
          connected_account_id: string
          created_at: string | null
          external_id: string
          id: string
          name: string
          resource_type: string
          status: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          business_id: string
          connected_account_id: string
          created_at?: string | null
          external_id: string
          id?: string
          name: string
          resource_type: string
          status?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          business_id?: string
          connected_account_id?: string
          created_at?: string | null
          external_id?: string
          id?: string
          name?: string
          resource_type?: string
          status?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_resources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_resources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "connected_resources_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount_cents: number | null
          business_id: string
          created_at: string | null
          customer: string
          customer_id: string | null
          deposit_cents: number | null
          gown: string | null
          id: string
          location: string
          sent_at: string | null
          sign_token: string | null
          signed_at: string | null
          signed_initials: string | null
          signed_name: string | null
          special_terms: string | null
          status: string | null
        }
        Insert: {
          amount_cents?: number | null
          business_id: string
          created_at?: string | null
          customer: string
          customer_id?: string | null
          deposit_cents?: number | null
          gown?: string | null
          id: string
          location: string
          sent_at?: string | null
          sign_token?: string | null
          signed_at?: string | null
          signed_initials?: string | null
          signed_name?: string | null
          special_terms?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number | null
          business_id?: string
          created_at?: string | null
          customer?: string
          customer_id?: string | null
          deposit_cents?: number | null
          gown?: string | null
          id?: string
          location?: string
          sent_at?: string | null
          sign_token?: string | null
          signed_at?: string | null
          signed_initials?: string | null
          signed_name?: string | null
          special_terms?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_external_identities: {
        Row: {
          business_id: string
          connected_account_id: string | null
          created_at: string | null
          customer_id: string
          external_id: string
          id: string
          provider: string
        }
        Insert: {
          business_id: string
          connected_account_id?: string | null
          created_at?: string | null
          customer_id: string
          external_id: string
          id?: string
          provider: string
        }
        Update: {
          business_id?: string
          connected_account_id?: string | null
          created_at?: string | null
          customer_id?: string
          external_id?: string
          id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_external_identities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_external_identities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_external_identities_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_external_identities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_external_identities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_journey_events: {
        Row: {
          actor_user_id: string | null
          business_id: string
          created_at: string
          customer_visible: boolean
          detail: string | null
          event_type: string
          id: string
          journey_id: string
          metadata: Json
          title: string
        }
        Insert: {
          actor_user_id?: string | null
          business_id: string
          created_at?: string
          customer_visible?: boolean
          detail?: string | null
          event_type: string
          id?: string
          journey_id: string
          metadata?: Json
          title: string
        }
        Update: {
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          customer_visible?: boolean
          detail?: string | null
          event_type?: string
          id?: string
          journey_id?: string
          metadata?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_journey_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_journey_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_journey_events_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "customer_order_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_journey_notification_outbox: {
        Row: {
          attempts: number
          business_id: string
          channel: string
          created_at: string
          delivered_at: string | null
          id: string
          journey_event_id: string
          journey_id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          recipient: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          journey_event_id: string
          journey_id: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          recipient: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          journey_event_id?: string
          journey_id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          recipient?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_journey_notification_outbox_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_journey_notification_outbox_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_journey_notification_outbox_journey_event_id_fkey"
            columns: ["journey_event_id"]
            isOneToOne: false
            referencedRelation: "customer_journey_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_journey_notification_outbox_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "customer_order_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_link_quarantine: {
        Row: {
          business_id: string | null
          candidate_count: number
          created_at: string
          customer_name: string | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          source_id: string
          source_table: string
        }
        Insert: {
          business_id?: string | null
          candidate_count?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_id: string
          source_table: string
        }
        Update: {
          business_id?: string | null
          candidate_count?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_link_quarantine_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_link_quarantine_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_id: string
          business_id: string
          content: string
          created_at: string | null
          customer_id: string
          id: string
          is_pinned: boolean | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          business_id: string
          content: string
          created_at?: string | null
          customer_id: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          business_id?: string
          content?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_journeys: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          customer_visible: boolean
          id: string
          location_id: string | null
          product_variant_id: string | null
          promised_at: string | null
          purchase_order_id: string | null
          status: string
          updated_at: string
          vendor_id: string | null
          wedding_date: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_visible?: boolean
          id?: string
          location_id?: string | null
          product_variant_id?: string | null
          promised_at?: string | null
          purchase_order_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_date?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_visible?: boolean
          id?: string
          location_id?: string | null
          product_variant_id?: string | null
          promised_at?: string | null
          purchase_order_id?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_journeys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_order_journeys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_journeys_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          accessibility_needs: string | null
          business_id: string
          communication_consent: boolean | null
          created_at: string | null
          customer_id: string
          email_consent: boolean | null
          language: string | null
          notes: string | null
          preferred_contact_method: string | null
          sms_consent: boolean | null
          updated_at: string | null
        }
        Insert: {
          accessibility_needs?: string | null
          business_id: string
          communication_consent?: boolean | null
          created_at?: string | null
          customer_id: string
          email_consent?: boolean | null
          language?: string | null
          notes?: string | null
          preferred_contact_method?: string | null
          sms_consent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          accessibility_needs?: string | null
          business_id?: string
          communication_consent?: boolean | null
          created_at?: string | null
          customer_id?: string
          email_consent?: boolean | null
          language?: string | null
          notes?: string | null
          preferred_contact_method?: string | null
          sms_consent?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accessibility_needs: string | null
          business_id: string
          created_at: string | null
          email: string | null
          email_consent: boolean | null
          id: string
          language: string | null
          location: string | null
          location_id: string | null
          name: string
          phone: string | null
          portal_token: string | null
          profile_photo_updated_at: string | null
          profile_photo_url: string | null
          sms_consent: boolean | null
          sms_opt_in: boolean | null
          spend_cents: number | null
          status: string | null
          stylist: string | null
          wedding_date: string | null
        }
        Insert: {
          accessibility_needs?: string | null
          business_id: string
          created_at?: string | null
          email?: string | null
          email_consent?: boolean | null
          id?: string
          language?: string | null
          location?: string | null
          location_id?: string | null
          name: string
          phone?: string | null
          portal_token?: string | null
          profile_photo_updated_at?: string | null
          profile_photo_url?: string | null
          sms_consent?: boolean | null
          sms_opt_in?: boolean | null
          spend_cents?: number | null
          status?: string | null
          stylist?: string | null
          wedding_date?: string | null
        }
        Update: {
          accessibility_needs?: string | null
          business_id?: string
          created_at?: string | null
          email?: string | null
          email_consent?: boolean | null
          id?: string
          language?: string | null
          location?: string | null
          location_id?: string | null
          name?: string
          phone?: string | null
          portal_token?: string | null
          profile_photo_updated_at?: string | null
          profile_photo_url?: string | null
          sms_consent?: boolean | null
          sms_opt_in?: boolean | null
          spend_cents?: number | null
          status?: string | null
          stylist?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_sessions: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          entity_type: string
          error_rows: number | null
          id: string
          status: string
          total_rows: number | null
          updated_at: string | null
          valid_rows: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_type: string
          error_rows?: number | null
          id?: string
          status: string
          total_rows?: number | null
          updated_at?: string | null
          valid_rows?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          error_rows?: number | null
          id?: string
          status?: string
          total_rows?: number | null
          updated_at?: string | null
          valid_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_import_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      data_import_staging_rows: {
        Row: {
          created_at: string | null
          id: string
          mapped_data: Json | null
          raw_data: Json
          session_id: string | null
          status: string
          validation_errors: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mapped_data?: Json | null
          raw_data: Json
          session_id?: string | null
          status: string
          validation_errors?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mapped_data?: Json | null
          raw_data?: Json
          session_id?: string | null
          status?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "data_import_staging_rows_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "data_import_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          data_plane: string | null
          document_type: string
          effective_from: string | null
          effective_until: string | null
          field_mappings: Json | null
          file_path: string | null
          file_type: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          location_id: string | null
          logo_url: string | null
          margins: Json | null
          signature_blocks: Json | null
          template_name: string
          terms_text: string | null
          typography: Json | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_plane?: string | null
          document_type: string
          effective_from?: string | null
          effective_until?: string | null
          field_mappings?: Json | null
          file_path?: string | null
          file_type?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_id?: string | null
          logo_url?: string | null
          margins?: Json | null
          signature_blocks?: Json | null
          template_name: string
          terms_text?: string | null
          typography?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_plane?: string | null
          document_type?: string
          effective_from?: string | null
          effective_until?: string | null
          field_mappings?: Json | null
          file_path?: string | null
          file_type?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_id?: string | null
          logo_url?: string | null
          margins?: Json | null
          signature_blocks?: Json | null
          template_name?: string
          terms_text?: string | null
          typography?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "document_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      durable_jobs: {
        Row: {
          attempts: number
          business_id: string | null
          created_at: string
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          queue_name: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          queue_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          queue_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "durable_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "durable_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          business_id: string
          created_at: string | null
          day_of_week: number
          employee_id: string
          end_time: string | null
          id: string
          is_available: boolean | null
          start_time: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          day_of_week: number
          employee_id: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          day_of_week?: number
          employee_id?: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      employee_calendar_connections: {
        Row: {
          connection_status: string | null
          created_at: string | null
          employee_id: string
          encrypted_credential_reference: string | null
          last_synchronized: string | null
          provider: string | null
          sync_mode: string | null
        }
        Insert: {
          connection_status?: string | null
          created_at?: string | null
          employee_id: string
          encrypted_credential_reference?: string | null
          last_synchronized?: string | null
          provider?: string | null
          sync_mode?: string | null
        }
        Update: {
          connection_status?: string | null
          created_at?: string | null
          employee_id?: string
          encrypted_credential_reference?: string | null
          last_synchronized?: string | null
          provider?: string | null
          sync_mode?: string | null
        }
        Relationships: []
      }
      employee_notes: {
        Row: {
          author_id: string
          business_id: string
          content: string
          created_at: string | null
          employee_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          business_id: string
          content: string
          created_at?: string | null
          employee_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          business_id?: string
          content?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      employee_schedule_breaks: {
        Row: {
          break_type: string | null
          end_at: string
          id: string
          schedule_id: string
          start_at: string
        }
        Insert: {
          break_type?: string | null
          end_at: string
          id?: string
          schedule_id: string
          start_at: string
        }
        Update: {
          break_type?: string | null
          end_at?: string
          id?: string
          schedule_id?: string
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedule_breaks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "employee_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          business_id: string
          created_at: string | null
          department: string | null
          employee_id: string
          end_at: string
          id: string
          location_id: string | null
          notes: string | null
          paid_break_minutes: number | null
          published_at: string | null
          published_by: string | null
          shift_date: string
          shift_series_id: string | null
          shift_type: string | null
          start_at: string
          status: string | null
          unpaid_break_minutes: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          department?: string | null
          employee_id: string
          end_at: string
          id?: string
          location_id?: string | null
          notes?: string | null
          paid_break_minutes?: number | null
          published_at?: string | null
          published_by?: string | null
          shift_date: string
          shift_series_id?: string | null
          shift_type?: string | null
          start_at: string
          status?: string | null
          unpaid_break_minutes?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          department?: string | null
          employee_id?: string
          end_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          paid_break_minutes?: number | null
          published_at?: string | null
          published_by?: string | null
          shift_date?: string
          shift_series_id?: string | null
          shift_type?: string | null
          start_at?: string
          status?: string | null
          unpaid_break_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "employee_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_service_eligibility: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          employee_id: string
          location_id: string | null
          service_id: string
          skill_level: number | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          employee_id: string
          location_id?: string | null
          service_id: string
          skill_level?: number | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          employee_id?: string
          location_id?: string | null
          service_id?: string
          skill_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_service_eligibility_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_service_eligibility_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "employee_service_eligibility_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_service_eligibility_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "appointment_services"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_off: {
        Row: {
          business_id: string
          created_at: string | null
          employee_id: string
          end_at: string
          id: string
          reason: string | null
          start_at: string
          status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          employee_id: string
          end_at: string
          id?: string
          reason?: string | null
          start_at: string
          status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          employee_id?: string
          end_at?: string
          id?: string
          reason?: string | null
          start_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      file_links: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          file_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          file_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_permissions: {
        Row: {
          created_at: string | null
          file_id: string
          id: string
          permission: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_id: string
          id?: string
          permission: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string
          id?: string
          permission?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_permissions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string | null
          file_id: string
          id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          file_id: string
          id?: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          file_id?: string
          id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          appointment_id: string | null
          business_id: string
          category: string
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          location_id: string | null
          mime_type: string
          privacy_level: string | null
          retention_status: string | null
          size_bytes: number
          storage_path: string
          thumbnail_path: string | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          category: string
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          mime_type: string
          privacy_level?: string | null
          retention_status?: string | null
          size_bytes: number
          storage_path: string
          thumbnail_path?: string | null
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          category?: string
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          mime_type?: string
          privacy_level?: string | null
          retention_status?: string | null
          size_bytes?: number
          storage_path?: string
          thumbnail_path?: string | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_files_appointment"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          appointment_request_id: string | null
          business_id: string
          created_at: string | null
          customer_id: string | null
          external_submission_id: string | null
          form_type: string | null
          id: string
          payload: Json
          site_id: string | null
          source_domain: string | null
          source_provider: string | null
          status: string | null
        }
        Insert: {
          appointment_request_id?: string | null
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          external_submission_id?: string | null
          form_type?: string | null
          id?: string
          payload: Json
          site_id?: string | null
          source_domain?: string | null
          source_provider?: string | null
          status?: string | null
        }
        Update: {
          appointment_request_id?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          external_submission_id?: string | null
          form_type?: string | null
          id?: string
          payload?: Json
          site_id?: string | null
          source_domain?: string | null
          source_provider?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_appointment_request_id_fkey"
            columns: ["appointment_request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "form_submissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "business_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_watches: {
        Row: {
          business_id: string | null
          channel_id: string
          created_at: string
          expiration_timestamp: string
          id: string
          last_renewed_at: string | null
          metadata: Json | null
          provider_connection_id: string
          renewal_error: string | null
          resource_id: string
          resource_uri: string | null
          status: string
          token: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          channel_id: string
          created_at?: string
          expiration_timestamp: string
          id?: string
          last_renewed_at?: string | null
          metadata?: Json | null
          provider_connection_id: string
          renewal_error?: string | null
          resource_id: string
          resource_uri?: string | null
          status?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          channel_id?: string
          created_at?: string
          expiration_timestamp?: string
          id?: string
          last_renewed_at?: string | null
          metadata?: Json | null
          provider_connection_id?: string
          renewal_error?: string | null
          resource_id?: string
          resource_uri?: string | null
          status?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_watches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_watches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "google_drive_watches_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      gowns: {
        Row: {
          business_id: string
          category: string | null
          color: string | null
          condition: string | null
          cost_cents: number | null
          created_at: string | null
          designer: string | null
          id: string
          image: string | null
          inventory_type: string | null
          location: string | null
          location_id: string | null
          msrp_cents: number | null
          name: string
          notes: string | null
          price_cents: number | null
          reorder_point: number | null
          size: string | null
          sku: string | null
          status: string | null
          stock: number | null
          style: string | null
          variant_id: string | null
          vendor: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          color?: string | null
          condition?: string | null
          cost_cents?: number | null
          created_at?: string | null
          designer?: string | null
          id?: string
          image?: string | null
          inventory_type?: string | null
          location?: string | null
          location_id?: string | null
          msrp_cents?: number | null
          name: string
          notes?: string | null
          price_cents?: number | null
          reorder_point?: number | null
          size?: string | null
          sku?: string | null
          status?: string | null
          stock?: number | null
          style?: string | null
          variant_id?: string | null
          vendor?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          color?: string | null
          condition?: string | null
          cost_cents?: number | null
          created_at?: string | null
          designer?: string | null
          id?: string
          image?: string | null
          inventory_type?: string | null
          location?: string | null
          location_id?: string | null
          msrp_cents?: number | null
          name?: string
          notes?: string | null
          price_cents?: number | null
          reorder_point?: number | null
          size?: string | null
          sku?: string | null
          status?: string | null
          stock?: number | null
          style?: string | null
          variant_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gowns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gowns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "gowns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gowns_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_ad_campaigns: {
        Row: {
          ad_account_id: string | null
          business_id: string
          connection_id: string | null
          created_at: string
          daily_budget_cents: number | null
          ended_at: string | null
          external_id: string
          id: string
          lifetime_budget_cents: number | null
          name: string
          network: string
          objective: string | null
          started_at: string | null
          status: string | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          business_id: string
          connection_id?: string | null
          created_at?: string
          daily_budget_cents?: number | null
          ended_at?: string | null
          external_id: string
          id?: string
          lifetime_budget_cents?: number | null
          name: string
          network: string
          objective?: string | null
          started_at?: string | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          business_id?: string
          connection_id?: string | null
          created_at?: string
          daily_budget_cents?: number | null
          ended_at?: string | null
          external_id?: string
          id?: string
          lifetime_budget_cents?: number | null
          name?: string
          network?: string
          objective?: string | null
          started_at?: string | null
          status?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_ad_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_ad_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_ad_campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_ad_metrics: {
        Row: {
          business_id: string
          campaign_id: string
          clicks: number
          conversion_value_cents: number
          conversions: number
          cpc_cents: number | null
          cpm_cents: number | null
          created_at: string
          ctr: number | null
          frequency: number | null
          id: string
          impressions: number
          metric_date: string
          reach: number
          spend_cents: number
        }
        Insert: {
          business_id: string
          campaign_id: string
          clicks?: number
          conversion_value_cents?: number
          conversions?: number
          cpc_cents?: number | null
          cpm_cents?: number | null
          created_at?: string
          ctr?: number | null
          frequency?: number | null
          id?: string
          impressions?: number
          metric_date: string
          reach?: number
          spend_cents?: number
        }
        Update: {
          business_id?: string
          campaign_id?: string
          clicks?: number
          conversion_value_cents?: number
          conversions?: number
          cpc_cents?: number | null
          cpm_cents?: number | null
          created_at?: string
          ctr?: number | null
          frequency?: number | null
          id?: string
          impressions?: number
          metric_date?: string
          reach?: number
          spend_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "growth_ad_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_ad_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_ad_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "growth_ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_attribution_touchpoints: {
        Row: {
          business_id: string
          campaign: string | null
          channel: string
          click_id: string | null
          content: string | null
          cost_cents: number | null
          created_at: string
          customer_id: string | null
          device: string | null
          id: string
          is_first_touch: boolean
          is_last_touch: boolean
          landing_path: string | null
          lead_id: string | null
          medium: string | null
          occurred_at: string
          referrer: string | null
          session_id: string | null
          source: string | null
          term: string | null
        }
        Insert: {
          business_id: string
          campaign?: string | null
          channel: string
          click_id?: string | null
          content?: string | null
          cost_cents?: number | null
          created_at?: string
          customer_id?: string | null
          device?: string | null
          id?: string
          is_first_touch?: boolean
          is_last_touch?: boolean
          landing_path?: string | null
          lead_id?: string | null
          medium?: string | null
          occurred_at?: string
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          term?: string | null
        }
        Update: {
          business_id?: string
          campaign?: string | null
          channel?: string
          click_id?: string | null
          content?: string | null
          cost_cents?: number | null
          created_at?: string
          customer_id?: string | null
          device?: string | null
          id?: string
          is_first_touch?: boolean
          is_last_touch?: boolean
          landing_path?: string | null
          lead_id?: string | null
          medium?: string | null
          occurred_at?: string
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_attribution_touchpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_attribution_touchpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_attribution_touchpoints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_attribution_touchpoints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_attribution_touchpoints_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_channel_spend: {
        Row: {
          business_id: string
          campaign: string | null
          channel: string
          clicks: number
          connection_id: string | null
          created_at: string
          entry_source: string
          id: string
          impressions: number
          spend_cents: number
          spend_date: string
          updated_at: string
        }
        Insert: {
          business_id: string
          campaign?: string | null
          channel: string
          clicks?: number
          connection_id?: string | null
          created_at?: string
          entry_source?: string
          id?: string
          impressions?: number
          spend_cents?: number
          spend_date: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          campaign?: string | null
          channel?: string
          clicks?: number
          connection_id?: string | null
          created_at?: string
          entry_source?: string
          id?: string
          impressions?: number
          spend_cents?: number
          spend_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_channel_spend_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_channel_spend_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_channel_spend_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_local_listings: {
        Row: {
          additional_categories: string[]
          business_id: string
          completeness_score: number | null
          connection_id: string | null
          created_at: string
          external_id: string | null
          id: string
          is_published: boolean
          issues: Json
          location_id: string | null
          phone: string | null
          primary_category: string | null
          provider: string
          rating: number | null
          regular_hours: Json
          review_count: number
          storefront_address: Json
          synced_at: string | null
          title: string
          updated_at: string
          verification_state: string | null
          website_url: string | null
        }
        Insert: {
          additional_categories?: string[]
          business_id: string
          completeness_score?: number | null
          connection_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_published?: boolean
          issues?: Json
          location_id?: string | null
          phone?: string | null
          primary_category?: string | null
          provider?: string
          rating?: number | null
          regular_hours?: Json
          review_count?: number
          storefront_address?: Json
          synced_at?: string | null
          title: string
          updated_at?: string
          verification_state?: string | null
          website_url?: string | null
        }
        Update: {
          additional_categories?: string[]
          business_id?: string
          completeness_score?: number | null
          connection_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_published?: boolean
          issues?: Json
          location_id?: string | null
          phone?: string | null
          primary_category?: string | null
          provider?: string
          rating?: number | null
          regular_hours?: Json
          review_count?: number
          storefront_address?: Json
          synced_at?: string | null
          title?: string
          updated_at?: string
          verification_state?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_local_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_local_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_local_listings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_local_listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_local_metrics: {
        Row: {
          bookings: number
          business_id: string
          calls: number
          created_at: string
          direction_requests: number
          id: string
          impressions_maps: number
          impressions_search: number
          listing_id: string
          metric_date: string
          website_clicks: number
        }
        Insert: {
          bookings?: number
          business_id: string
          calls?: number
          created_at?: string
          direction_requests?: number
          id?: string
          impressions_maps?: number
          impressions_search?: number
          listing_id: string
          metric_date: string
          website_clicks?: number
        }
        Update: {
          bookings?: number
          business_id?: string
          calls?: number
          created_at?: string
          direction_requests?: number
          id?: string
          impressions_maps?: number
          impressions_search?: number
          listing_id?: string
          metric_date?: string
          website_clicks?: number
        }
        Relationships: [
          {
            foreignKeyName: "growth_local_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_local_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_local_metrics_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "growth_local_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_provider_connections: {
        Row: {
          business_id: string
          connected_at: string | null
          connected_by: string | null
          created_at: string
          display_name: string | null
          external_account_id: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          metadata: Json
          provider: string
          scopes: string[]
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          metadata?: Json
          provider: string
          scopes?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          metadata?: Json
          provider?: string
          scopes?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_provider_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_provider_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      growth_provider_secrets: {
        Row: {
          access_token: string | null
          connection_id: string
          expires_at: string | null
          refresh_token: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connection_id: string
          expires_at?: string | null
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connection_id?: string
          expires_at?: string | null
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_provider_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_recommendations: {
        Row: {
          action_type: string | null
          business_id: string
          category: string
          created_at: string | null
          description: string | null
          evidence: string | null
          expected_impact: string | null
          id: string
          metadata: Json | null
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          business_id: string
          category: string
          created_at?: string | null
          description?: string | null
          evidence?: string | null
          expected_impact?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          business_id?: string
          category?: string
          created_at?: string | null
          description?: string | null
          evidence?: string | null
          expected_impact?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_recommendations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_recommendations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      growth_reviews: {
        Row: {
          ai_draft: string | null
          author_name: string | null
          author_photo_url: string | null
          body: string | null
          business_id: string
          created_at: string
          customer_id: string | null
          external_id: string | null
          id: string
          listing_id: string | null
          location_id: string | null
          posted_at: string
          rating: number
          responded_at: string | null
          responded_by: string | null
          response_body: string | null
          response_sync_status: string | null
          sentiment: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_draft?: string | null
          author_name?: string | null
          author_photo_url?: string | null
          body?: string | null
          business_id: string
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          id?: string
          listing_id?: string | null
          location_id?: string | null
          posted_at?: string
          rating: number
          responded_at?: string | null
          responded_by?: string | null
          response_body?: string | null
          response_sync_status?: string | null
          sentiment?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_draft?: string | null
          author_name?: string | null
          author_photo_url?: string | null
          body?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          id?: string
          listing_id?: string | null
          location_id?: string | null
          posted_at?: string
          rating?: number
          responded_at?: string | null
          responded_by?: string | null
          response_body?: string | null
          response_sync_status?: string | null
          sentiment?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "growth_local_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_search_metrics: {
        Row: {
          business_id: string
          clicks: number
          connection_id: string | null
          country: string | null
          created_at: string
          ctr: number
          device: string | null
          id: string
          impressions: number
          metric_date: string
          page: string | null
          position: number | null
          query: string | null
          site_url: string
        }
        Insert: {
          business_id: string
          clicks?: number
          connection_id?: string | null
          country?: string | null
          created_at?: string
          ctr?: number
          device?: string | null
          id?: string
          impressions?: number
          metric_date: string
          page?: string | null
          position?: number | null
          query?: string | null
          site_url: string
        }
        Update: {
          business_id?: string
          clicks?: number
          connection_id?: string | null
          country?: string | null
          created_at?: string
          ctr?: number
          device?: string | null
          id?: string
          impressions?: number
          metric_date?: string
          page?: string | null
          position?: number | null
          query?: string | null
          site_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_search_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_search_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_search_metrics_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_seo_audits: {
        Row: {
          business_id: string
          error: string | null
          finished_at: string | null
          id: string
          issues_count: number
          overall_score: number | null
          pages_crawled: number
          site_url: string
          source: string
          started_at: string
          status: string
        }
        Insert: {
          business_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          issues_count?: number
          overall_score?: number | null
          pages_crawled?: number
          site_url: string
          source?: string
          started_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          issues_count?: number
          overall_score?: number | null
          pages_crawled?: number
          site_url?: string
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_seo_audits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_seo_audits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      growth_seo_page_results: {
        Row: {
          accessibility_score: number | null
          audit_id: string
          best_practices_score: number | null
          business_id: string
          canonical_url: string | null
          cls: number | null
          created_at: string
          http_status: number | null
          id: string
          indexable: boolean | null
          inp_ms: number | null
          issues: Json
          lcp_ms: number | null
          meta_description: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          og_type: string | null
          performance_score: number | null
          robots_directives: string | null
          schema_types: string[]
          seo_score: number | null
          social_score: number | null
          title: string | null
          ttfb_ms: number | null
          twitter_card: string | null
          twitter_image: string | null
          twitter_title: string | null
          url: string
        }
        Insert: {
          accessibility_score?: number | null
          audit_id: string
          best_practices_score?: number | null
          business_id: string
          canonical_url?: string | null
          cls?: number | null
          created_at?: string
          http_status?: number | null
          id?: string
          indexable?: boolean | null
          inp_ms?: number | null
          issues?: Json
          lcp_ms?: number | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          performance_score?: number | null
          robots_directives?: string | null
          schema_types?: string[]
          seo_score?: number | null
          social_score?: number | null
          title?: string | null
          ttfb_ms?: number | null
          twitter_card?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          url: string
        }
        Update: {
          accessibility_score?: number | null
          audit_id?: string
          best_practices_score?: number | null
          business_id?: string
          canonical_url?: string | null
          cls?: number | null
          created_at?: string
          http_status?: number | null
          id?: string
          indexable?: boolean | null
          inp_ms?: number | null
          issues?: Json
          lcp_ms?: number | null
          meta_description?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          performance_score?: number | null
          robots_directives?: string | null
          schema_types?: string[]
          seo_score?: number | null
          social_score?: number | null
          title?: string | null
          ttfb_ms?: number | null
          twitter_card?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_seo_page_results_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "growth_seo_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_seo_page_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_seo_page_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      growth_social_accounts: {
        Row: {
          avatar_url: string | null
          business_id: string
          connection_id: string | null
          created_at: string
          display_name: string | null
          external_id: string
          followers: number
          follows: number
          id: string
          is_business_account: boolean
          media_count: number
          platform: string
          profile_url: string | null
          synced_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          external_id: string
          followers?: number
          follows?: number
          id?: string
          is_business_account?: boolean
          media_count?: number
          platform: string
          profile_url?: string | null
          synced_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string
          followers?: number
          follows?: number
          id?: string
          is_business_account?: boolean
          media_count?: number
          platform?: string
          profile_url?: string | null
          synced_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_social_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_social_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_social_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_social_metrics: {
        Row: {
          account_id: string
          business_id: string
          created_at: string
          followers: number
          id: string
          impressions: number
          metric_date: string
          profile_views: number
          reach: number
          website_clicks: number
        }
        Insert: {
          account_id: string
          business_id: string
          created_at?: string
          followers?: number
          id?: string
          impressions?: number
          metric_date: string
          profile_views?: number
          reach?: number
          website_clicks?: number
        }
        Update: {
          account_id?: string
          business_id?: string
          created_at?: string
          followers?: number
          id?: string
          impressions?: number
          metric_date?: string
          profile_views?: number
          reach?: number
          website_clicks?: number
        }
        Relationships: [
          {
            foreignKeyName: "growth_social_metrics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "growth_social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_social_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_social_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      growth_social_posts: {
        Row: {
          account_id: string
          business_id: string
          caption: string | null
          comments: number
          created_at: string
          engagement_rate: number | null
          external_id: string
          id: string
          impressions: number
          likes: number
          media_url: string | null
          permalink: string | null
          platform: string
          post_type: string | null
          posted_at: string
          reach: number
          saves: number
          shares: number
          synced_at: string | null
          thumbnail_url: string | null
          video_views: number
        }
        Insert: {
          account_id: string
          business_id: string
          caption?: string | null
          comments?: number
          created_at?: string
          engagement_rate?: number | null
          external_id: string
          id?: string
          impressions?: number
          likes?: number
          media_url?: string | null
          permalink?: string | null
          platform: string
          post_type?: string | null
          posted_at: string
          reach?: number
          saves?: number
          shares?: number
          synced_at?: string | null
          thumbnail_url?: string | null
          video_views?: number
        }
        Update: {
          account_id?: string
          business_id?: string
          caption?: string | null
          comments?: number
          created_at?: string
          engagement_rate?: number | null
          external_id?: string
          id?: string
          impressions?: number
          likes?: number
          media_url?: string | null
          permalink?: string | null
          platform?: string
          post_type?: string | null
          posted_at?: string
          reach?: number
          saves?: number
          shares?: number
          synced_at?: string | null
          thumbnail_url?: string | null
          video_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "growth_social_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "growth_social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_social_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_social_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      growth_sync_runs: {
        Row: {
          business_id: string
          connection_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          job: string
          metadata: Json
          provider: string
          records_written: number
          started_at: string
          status: string
        }
        Insert: {
          business_id: string
          connection_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job: string
          metadata?: Json
          provider: string
          records_written?: number
          started_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          connection_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job?: string
          metadata?: Json
          provider?: string
          records_written?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_sync_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_sync_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "growth_sync_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_contexts: {
        Row: {
          article_id: string
          route_pattern: string
          workspace: string
        }
        Insert: {
          article_id: string
          route_pattern: string
          workspace: string
        }
        Update: {
          article_id?: string
          route_pattern?: string
          workspace?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_contexts_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_entitlements: {
        Row: {
          article_id: string
          feature: string
        }
        Insert: {
          article_id: string
          feature: string
        }
        Update: {
          article_id?: string
          feature?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_entitlements_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_feedback: {
        Row: {
          article_id: string
          created_at: string
          feedback_text: string | null
          id: string
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_roles: {
        Row: {
          article_id: string
          role: string
        }
        Insert: {
          article_id: string
          role: string
        }
        Update: {
          article_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_roles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_versions: {
        Row: {
          article_id: string
          author_id: string | null
          content: string
          created_at: string
          id: string
          summary: string | null
          title: string
        }
        Insert: {
          article_id: string
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          summary?: string | null
          title: string
        }
        Update: {
          article_id?: string
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_views: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          audience: string
          category: string
          category_id: string | null
          content: string
          created_at: string
          id: string
          last_reviewed_at: string | null
          read_time_minutes: number | null
          role: string | null
          search_vector: unknown
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          category: string
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          read_time_minutes?: number | null
          role?: string | null
          search_vector?: unknown
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          category?: string
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          read_time_minutes?: number | null
          role?: string | null
          search_vector?: unknown
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      help_search_events: {
        Row: {
          created_at: string
          id: string
          query: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          results_count: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          errors: Json | null
          file_name: string | null
          id: string
          started_at: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "import_jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      import_staging_records: {
        Row: {
          business_id: string | null
          created_at: string | null
          duplicate_of: string | null
          id: string
          job_id: string
          mapped_data: Json | null
          raw_data: Json | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          duplicate_of?: string | null
          id?: string
          job_id: string
          mapped_data?: Json | null
          raw_data?: Json | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          duplicate_of?: string | null
          id?: string
          job_id?: string
          mapped_data?: Json | null
          raw_data?: Json | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_staging_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_staging_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "import_staging_records_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_staging_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_circuit_breakers: {
        Row: {
          business_id: string | null
          consecutive_failures: number
          cooldown_expires_at: string | null
          cooldown_seconds: number
          created_at: string
          failure_count: number
          id: string
          is_provider_outage: boolean
          last_error_category: string | null
          last_error_message: string | null
          last_failure_at: string | null
          last_success_at: string | null
          metadata: Json | null
          provider: string
          scope: string
          scope_id: string
          state: string
          success_count: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          consecutive_failures?: number
          cooldown_expires_at?: string | null
          cooldown_seconds?: number
          created_at?: string
          failure_count?: number
          id?: string
          is_provider_outage?: boolean
          last_error_category?: string | null
          last_error_message?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          provider: string
          scope?: string
          scope_id: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          consecutive_failures?: number
          cooldown_expires_at?: string | null
          cooldown_seconds?: number
          created_at?: string
          failure_count?: number
          id?: string
          is_provider_outage?: boolean
          last_error_category?: string | null
          last_error_message?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          provider?: string
          scope?: string
          scope_id?: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_circuit_breakers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_circuit_breakers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      integration_dlq_events: {
        Row: {
          business_id: string | null
          created_at: string
          error_message: string
          event_type: string
          headers: Json | null
          id: string
          idempotency_key: string | null
          max_retries: number
          next_retry_at: string | null
          payload: Json
          provider: string
          provider_connection_id: string | null
          replay_result: Json | null
          replayed_at: string | null
          retry_count: number
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          error_message: string
          event_type: string
          headers?: Json | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload: Json
          provider: string
          provider_connection_id?: string | null
          replay_result?: Json | null
          replayed_at?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          error_message?: string
          event_type?: string
          headers?: Json | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          provider?: string
          provider_connection_id?: string | null
          replay_result?: Json | null
          replayed_at?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_dlq_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_dlq_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_dlq_events_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_error_logs: {
        Row: {
          business_id: string | null
          created_at: string
          endpoint: string | null
          error_message: string
          failure_category: string
          id: string
          is_auto_repairable: boolean | null
          is_resolved: boolean | null
          provider: string
          provider_connection_id: string | null
          raw_payload: Json | null
          resolution_action: string | null
          resolved_at: string | null
          root_cause: string | null
          sanitized_headers: Json | null
          status_code: number | null
          suggested_action: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message: string
          failure_category: string
          id?: string
          is_auto_repairable?: boolean | null
          is_resolved?: boolean | null
          provider: string
          provider_connection_id?: string | null
          raw_payload?: Json | null
          resolution_action?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          sanitized_headers?: Json | null
          status_code?: number | null
          suggested_action?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string
          failure_category?: string
          id?: string
          is_auto_repairable?: boolean | null
          is_resolved?: boolean | null
          provider?: string
          provider_connection_id?: string | null
          raw_payload?: Json | null
          resolution_action?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          sanitized_headers?: Json | null
          status_code?: number | null
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_error_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_error_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_error_logs_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_recovery_timelines: {
        Row: {
          action_type: string
          business_id: string | null
          created_at: string
          details: Json | null
          duration_ms: number | null
          executed_by: string | null
          id: string
          previous_status: string
          provider: string
          provider_connection_id: string
          resulting_status: string
          success: boolean
          trigger: string
        }
        Insert: {
          action_type: string
          business_id?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          executed_by?: string | null
          id?: string
          previous_status: string
          provider: string
          provider_connection_id: string
          resulting_status: string
          success?: boolean
          trigger?: string
        }
        Update: {
          action_type?: string
          business_id?: string | null
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          executed_by?: string | null
          id?: string
          previous_status?: string
          provider?: string
          provider_connection_id?: string
          resulting_status?: string
          success?: boolean
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_recovery_timelines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_recovery_timelines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_recovery_timelines_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_cursors: {
        Row: {
          buffer_seconds: number
          business_id: string | null
          created_at: string
          id: string
          last_cursor: string | null
          last_error: string | null
          last_sync_timestamp: string | null
          lock_acquired_at: string | null
          lock_expires_at: string | null
          locked_by: string | null
          metadata: Json | null
          provider_connection_id: string
          records_synced_last_run: number
          records_synced_total: number
          resource_type: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          buffer_seconds?: number
          business_id?: string | null
          created_at?: string
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_sync_timestamp?: string | null
          lock_acquired_at?: string | null
          lock_expires_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          provider_connection_id: string
          records_synced_last_run?: number
          records_synced_total?: number
          resource_type: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          buffer_seconds?: number
          business_id?: string | null
          created_at?: string
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_sync_timestamp?: string | null
          lock_acquired_at?: string | null
          lock_expires_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          provider_connection_id?: string
          records_synced_last_run?: number
          records_synced_total?: number
          resource_type?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_cursors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_cursors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_sync_cursors_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          integration_type: string
          last_attempt: string | null
          last_successful_sync: string | null
          next_sync: string | null
          organization_id: string | null
          records_processed: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_type: string
          last_attempt?: string | null
          last_successful_sync?: string | null
          next_sync?: string | null
          organization_id?: string | null
          records_processed?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_type?: string
          last_attempt?: string | null
          last_successful_sync?: string | null
          next_sync?: string | null
          organization_id?: string | null
          records_processed?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      integration_webhook_events: {
        Row: {
          brand_id: string
          business_id: string
          correlation_id: string
          customer_id: string | null
          error_code: string | null
          external_event_id: string
          id: string
          location_id: string | null
          payload_digest: string
          processed_at: string | null
          processing_status: string
          provider: string
          provider_account_id: string
          provider_connection_id: string | null
          received_at: string
          retry_count: number
          signature_verified: boolean
        }
        Insert: {
          brand_id: string
          business_id: string
          correlation_id: string
          customer_id?: string | null
          error_code?: string | null
          external_event_id: string
          id?: string
          location_id?: string | null
          payload_digest: string
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_account_id: string
          provider_connection_id?: string | null
          received_at?: string
          retry_count?: number
          signature_verified?: boolean
        }
        Update: {
          brand_id?: string
          business_id?: string
          correlation_id?: string
          customer_id?: string | null
          error_code?: string | null
          external_event_id?: string
          id?: string
          location_id?: string | null
          payload_digest?: string
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_account_id?: string
          provider_connection_id?: string | null
          received_at?: string
          retry_count?: number
          signature_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhook_events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integration_webhook_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhook_events_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          author_id: string | null
          business_id: string | null
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_pinned: boolean | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          business_id?: string | null
          content: string
          created_at?: string
          entity_id: string
          entity_type?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          business_id?: string | null
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          available: number
          business_id: string
          created_at: string
          external_inventory_item_id: string | null
          external_location_id: string | null
          id: string
          location_id: string
          synced_at: string | null
          updated_at: string
          variant_id: string
        }
        Insert: {
          available?: number
          business_id: string
          created_at?: string
          external_inventory_item_id?: string | null
          external_location_id?: string | null
          id?: string
          location_id: string
          synced_at?: string | null
          updated_at?: string
          variant_id: string
        }
        Update: {
          available?: number
          business_id?: string
          created_at?: string
          external_inventory_item_id?: string | null
          external_location_id?: string | null
          id?: string
          location_id?: string
          synced_at?: string | null
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "inventory_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payment_events: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string
          payer_email: string | null
          payer_name: string | null
          reference: string
        }
        Insert: {
          amount_cents: number
          business_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id: string
          payer_email?: string | null
          payer_name?: string | null
          reference: string
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string
          payer_email?: string | null
          payer_name?: string | null
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoice_payment_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payment_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payment_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number | null
          business_id: string
          created_at: string | null
          customer: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string | null
          location_id: string | null
          paid_cents: number | null
          pay_token: string | null
          status: string | null
        }
        Insert: {
          amount_cents?: number | null
          business_id: string
          created_at?: string | null
          customer?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          location_id?: string | null
          paid_cents?: number | null
          pay_token?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number | null
          business_id?: string
          created_at?: string | null
          customer?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          location_id?: string | null
          paid_cents?: number | null
          pay_token?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_insight: string | null
          ai_score: number | null
          budget_cents: number | null
          business_id: string
          created_at: string | null
          email: string | null
          id: string
          location_id: string | null
          name: string
          source: string | null
          stage: string | null
          wedding_date: string | null
        }
        Insert: {
          ai_insight?: string | null
          ai_score?: number | null
          budget_cents?: number | null
          business_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          location_id?: string | null
          name: string
          source?: string | null
          stage?: string | null
          wedding_date?: string | null
        }
        Update: {
          ai_insight?: string | null
          ai_score?: number | null
          budget_cents?: number | null
          business_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          location_id?: string | null
          name?: string
          source?: string | null
          stage?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leads_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_permissions: {
        Row: {
          id: string
          location_id: string | null
          membership_id: string | null
        }
        Insert: {
          id?: string
          location_id?: string | null
          membership_id?: string | null
        }
        Update: {
          id?: string
          location_id?: string | null
          membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_permissions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "business_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          brand_id: string | null
          business_id: string | null
          created_at: string | null
          email: string | null
          hours: Json | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          slug: string | null
          timezone: string | null
        }
        Insert: {
          address?: string | null
          brand_id?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          hours?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      marketing_attribution: {
        Row: {
          appointment_id: string | null
          business_id: string
          campaign: string | null
          content: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          landing_page: string | null
          lead_id: string | null
          medium: string | null
          referrer: string | null
          source: string | null
          term: string | null
          touch_type: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          campaign?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          landing_page?: string | null
          lead_id?: string | null
          medium?: string | null
          referrer?: string | null
          source?: string | null
          term?: string | null
          touch_type?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          campaign?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          landing_page?: string | null
          lead_id?: string | null
          medium?: string | null
          referrer?: string | null
          source?: string | null
          term?: string | null
          touch_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_attribution_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "marketing_attribution_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_attribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_budgets: {
        Row: {
          allocated_budget_cents: number
          brand: string | null
          business_id: string | null
          created_at: string
          id: string
          monthly_budget_cents: number
          updated_at: string
        }
        Insert: {
          allocated_budget_cents?: number
          brand?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          monthly_budget_cents?: number
          updated_at?: string
        }
        Update: {
          allocated_budget_cents?: number
          brand?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          monthly_budget_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_budgets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_budgets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          business_id: string
          campaign_name: string
          clicks: number | null
          created_at: string | null
          end_date: string | null
          external_campaign_id: string | null
          id: string
          impressions: number | null
          provider: string
          spend_to_date: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          business_id: string
          campaign_name: string
          clicks?: number | null
          created_at?: string | null
          end_date?: string | null
          external_campaign_id?: string | null
          id?: string
          impressions?: number | null
          provider: string
          spend_to_date?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          business_id?: string
          campaign_name?: string
          clicks?: number | null
          created_at?: string | null
          end_date?: string | null
          external_campaign_id?: string | null
          id?: string
          impressions?: number | null
          provider?: string
          spend_to_date?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      measurements: {
        Row: {
          bride_id: string | null
          business_id: string | null
          bust: string | null
          created_at: string
          customer: string | null
          gown_size: string | null
          heel_height: string | null
          height: string | null
          hips: string | null
          hollow_to_hem: string | null
          id: string
          notes: string | null
          street_size: string | null
          taken_by: string | null
          taken_on: string | null
          updated_at: string
          waist: string | null
        }
        Insert: {
          bride_id?: string | null
          business_id?: string | null
          bust?: string | null
          created_at?: string
          customer?: string | null
          gown_size?: string | null
          heel_height?: string | null
          height?: string | null
          hips?: string | null
          hollow_to_hem?: string | null
          id?: string
          notes?: string | null
          street_size?: string | null
          taken_by?: string | null
          taken_on?: string | null
          updated_at?: string
          waist?: string | null
        }
        Update: {
          bride_id?: string | null
          business_id?: string | null
          bust?: string | null
          created_at?: string
          customer?: string | null
          gown_size?: string | null
          heel_height?: string | null
          height?: string | null
          hips?: string | null
          hollow_to_hem?: string | null
          id?: string
          notes?: string | null
          street_size?: string | null
          taken_by?: string | null
          taken_on?: string | null
          updated_at?: string
          waist?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_bride_id_fkey"
            columns: ["bride_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_bride_id_fkey"
            columns: ["bride_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          business_id: string
          channel: string | null
          content: string | null
          created_at: string | null
          customer: string | null
          customer_id: string | null
          direction: string | null
          error: string | null
          external_id: string | null
          id: string
          kind: string | null
          location_id: string | null
          sender: string | null
          sent_at: string | null
          sentiment: string | null
          status: string | null
          subject: string | null
          to_address: string | null
        }
        Insert: {
          body?: string | null
          business_id: string
          channel?: string | null
          content?: string | null
          created_at?: string | null
          customer?: string | null
          customer_id?: string | null
          direction?: string | null
          error?: string | null
          external_id?: string | null
          id?: string
          kind?: string | null
          location_id?: string | null
          sender?: string | null
          sent_at?: string | null
          sentiment?: string | null
          status?: string | null
          subject?: string | null
          to_address?: string | null
        }
        Update: {
          body?: string | null
          business_id?: string
          channel?: string | null
          content?: string | null
          created_at?: string | null
          customer?: string | null
          customer_id?: string | null
          direction?: string | null
          error?: string | null
          external_id?: string | null
          id?: string
          kind?: string | null
          location_id?: string | null
          sender?: string | null
          sent_at?: string | null
          sentiment?: string | null
          status?: string | null
          subject?: string | null
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      omnichannel_inbox: {
        Row: {
          brand_id: string | null
          business_id: string | null
          content: string | null
          created_at: string | null
          customer_id: string | null
          external_message_id: string | null
          id: string
          identity_status: string
          location_id: string | null
          message_type: string | null
          metadata: Json | null
          provider_connection_id: string | null
          recipient_id: string | null
          sender_id: string | null
          sender_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          business_id?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          external_message_id?: string | null
          id?: string
          identity_status?: string
          location_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          provider_connection_id?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          business_id?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          external_message_id?: string | null
          id?: string
          identity_status?: string
          location_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          provider_connection_id?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnichannel_inbox_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_inbox_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_inbox_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnichannel_inbox_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      open_shifts: {
        Row: {
          business_id: string
          created_at: string | null
          department: string | null
          end_at: string
          id: string
          location_id: string | null
          shift_date: string
          shift_type: string | null
          start_at: string
          status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          department?: string | null
          end_at: string
          id?: string
          location_id?: string | null
          shift_date: string
          shift_type?: string | null
          start_at: string
          status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          department?: string | null
          end_at?: string
          id?: string
          location_id?: string | null
          shift_date?: string
          shift_type?: string | null
          start_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "open_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          business_id: string
          created_at: string
          discount_cents: number
          external_line_id: string
          external_product_id: string | null
          external_variant_id: string | null
          id: string
          order_id: string
          product_id: string | null
          properties: Json | null
          quantity: number
          refunded_quantity: number
          requires_shipping: boolean
          sku: string | null
          tax_cents: number
          title: string
          total_cents: number
          unit_price_cents: number
          updated_at: string
          variant_id: string | null
          variant_title: string | null
          vendor_name: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          discount_cents?: number
          external_line_id: string
          external_product_id?: string | null
          external_variant_id?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          properties?: Json | null
          quantity?: number
          refunded_quantity?: number
          requires_shipping?: boolean
          sku?: string | null
          tax_cents?: number
          title: string
          total_cents?: number
          unit_price_cents?: number
          updated_at?: string
          variant_id?: string | null
          variant_title?: string | null
          vendor_name?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          discount_cents?: number
          external_line_id?: string
          external_product_id?: string | null
          external_variant_id?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          properties?: Json | null
          quantity?: number
          refunded_quantity?: number
          requires_shipping?: boolean
          sku?: string | null
          tax_cents?: number
          title?: string
          total_cents?: number
          unit_price_cents?: number
          updated_at?: string
          variant_id?: string | null
          variant_title?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shopify_sales_grain"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          brand_id: string | null
          business_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          channel_id: string | null
          created_at: string | null
          currency: string
          customer_id: string | null
          customer_note: string | null
          discount_cents: number
          external_order_id: string | null
          external_order_url: string | null
          financial_status: string | null
          fulfillment_status: string | null
          id: string
          last_synced_at: string | null
          location_id: string | null
          order_number: string | null
          ordered_at: string | null
          raw_payload: Json | null
          refunded_cents: number
          shipping_address: Json | null
          shipping_cents: number
          site_id: string | null
          source_tags: string[] | null
          source_type: string | null
          status: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          business_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          channel_id?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_cents?: number
          external_order_id?: string | null
          external_order_url?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          last_synced_at?: string | null
          location_id?: string | null
          order_number?: string | null
          ordered_at?: string | null
          raw_payload?: Json | null
          refunded_cents?: number
          shipping_address?: Json | null
          shipping_cents?: number
          site_id?: string | null
          source_tags?: string[] | null
          source_type?: string | null
          status?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          business_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          channel_id?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          customer_note?: string | null
          discount_cents?: number
          external_order_id?: string | null
          external_order_url?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          last_synced_at?: string | null
          location_id?: string | null
          order_number?: string | null
          ordered_at?: string | null
          raw_payload?: Json | null
          refunded_cents?: number
          shipping_address?: Json | null
          shipping_cents?: number
          site_id?: string | null
          source_tags?: string[] | null
          source_type?: string | null
          status?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "commerce_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "business_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_overrides: {
        Row: {
          business_id: string | null
          changed_by: string | null
          created_at: string | null
          feature_key: string
          id: string
          reason: string | null
          state: string
        }
        Insert: {
          business_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          feature_key: string
          id?: string
          reason?: string | null
          state: string
        }
        Update: {
          business_id?: string | null
          changed_by?: string | null
          created_at?: string | null
          feature_key?: string
          id?: string
          reason?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_feature_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_module_preferences: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_enabled: boolean
          module_id: string
          organization_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id?: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_module_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_module_preferences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_module_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_module_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_reviews: {
        Row: {
          business_id: string
          created_at: string | null
          external_review_id: string | null
          id: string
          location_id: string | null
          provider: string
          rating: number | null
          reply_date: string | null
          reply_text: string | null
          review_date: string | null
          review_text: string | null
          reviewer_name: string | null
          reviewer_photo_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          external_review_id?: string | null
          id?: string
          location_id?: string | null
          provider: string
          rating?: number | null
          reply_date?: string | null
          reply_text?: string | null
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          reviewer_photo_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          external_review_id?: string | null
          id?: string
          location_id?: string | null
          provider?: string
          rating?: number | null
          reply_date?: string | null
          reply_text?: string | null
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          reviewer_photo_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          account_type: string | null
          active_trials: Json
          addons: string[]
          business_id: string | null
          created_at: string | null
          effective_price_cents: number | null
          grandfathered_features: string[]
          id: string
          industry_pack: string
          override_by: string | null
          override_date: string | null
          override_expiration: string | null
          override_reason: string | null
          plan_id: string
          standard_price_cents: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          usage_limits: Json
          version: number | null
        }
        Insert: {
          account_type?: string | null
          active_trials?: Json
          addons?: string[]
          business_id?: string | null
          created_at?: string | null
          effective_price_cents?: number | null
          grandfathered_features?: string[]
          id?: string
          industry_pack?: string
          override_by?: string | null
          override_date?: string | null
          override_expiration?: string | null
          override_reason?: string | null
          plan_id: string
          standard_price_cents?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          usage_limits?: Json
          version?: number | null
        }
        Update: {
          account_type?: string | null
          active_trials?: Json
          addons?: string[]
          business_id?: string | null
          created_at?: string | null
          effective_price_cents?: number | null
          grandfathered_features?: string[]
          id?: string
          industry_pack?: string
          override_by?: string | null
          override_date?: string | null
          override_expiration?: string | null
          override_reason?: string | null
          plan_id?: string
          standard_price_cents?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          usage_limits?: Json
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string | null
          due_date: string | null
          id: string
          invoice_id: string
          paid_cents: number | null
          stage_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          business_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_id: string
          paid_cents?: number | null
          stage_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string
          paid_cents?: number | null
          stage_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_schedules_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          appointment_id: string | null
          business_id: string
          created_at: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          location_id: string | null
          notes: string | null
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          provider_transaction_id: string | null
          status: string | null
        }
        Insert: {
          amount_cents: number
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          location_id?: string | null
          notes?: string | null
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          provider_transaction_id?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          location_id?: string | null
          notes?: string | null
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          provider_transaction_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pickups: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          item_description: string | null
          qa_verified: boolean | null
          ready_since: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          item_description?: string | null
          qa_verified?: boolean | null
          ready_since?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          item_description?: string | null
          qa_verified?: boolean | null
          ready_since?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pickups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_resource_id: string | null
          target_resource_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_resource_id?: string | null
          target_resource_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_resource_id?: string | null
          target_resource_type?: string | null
        }
        Relationships: []
      }
      platform_automation_audit: {
        Row: {
          action: string
          actor: string
          created_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          request_id: string | null
          result: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          request_id?: string | null
          result?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          request_id?: string | null
          result?: string | null
          target?: string | null
        }
        Relationships: []
      }
      platform_delivery_incidents: {
        Row: {
          branch: string
          commit_author: string | null
          commit_sha: string
          created_at: string | null
          error_summary: string | null
          failed_job: string | null
          failed_step: string | null
          failure_fingerprint: string
          first_seen: string | null
          id: string
          last_seen: string | null
          occurrence_count: number | null
          repair_attempts: number | null
          repository: string
          sanitized_logs: string | null
          status: string
          updated_at: string | null
          workflow: string
        }
        Insert: {
          branch: string
          commit_author?: string | null
          commit_sha: string
          created_at?: string | null
          error_summary?: string | null
          failed_job?: string | null
          failed_step?: string | null
          failure_fingerprint: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          occurrence_count?: number | null
          repair_attempts?: number | null
          repository: string
          sanitized_logs?: string | null
          status?: string
          updated_at?: string | null
          workflow: string
        }
        Update: {
          branch?: string
          commit_author?: string | null
          commit_sha?: string
          created_at?: string | null
          error_summary?: string | null
          failed_job?: string | null
          failed_step?: string | null
          failure_fingerprint?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          occurrence_count?: number | null
          repair_attempts?: number | null
          repository?: string
          sanitized_logs?: string | null
          status?: string
          updated_at?: string | null
          workflow?: string
        }
        Relationships: []
      }
      platform_deployments: {
        Row: {
          can_rollback: boolean | null
          commit_sha: string
          created_at: string | null
          deployment_completed: string | null
          deployment_started: string | null
          environment: string
          id: string
          railway_deployment_id: string
          service: string
          status: string
          updated_at: string | null
        }
        Insert: {
          can_rollback?: boolean | null
          commit_sha: string
          created_at?: string | null
          deployment_completed?: string | null
          deployment_started?: string | null
          environment: string
          id?: string
          railway_deployment_id: string
          service: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          can_rollback?: boolean | null
          commit_sha?: string
          created_at?: string | null
          deployment_completed?: string | null
          deployment_started?: string | null
          environment?: string
          id?: string
          railway_deployment_id?: string
          service?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_failed_jobs: {
        Row: {
          attempts: number | null
          business_id: string | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          next_retry_at: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          next_retry_at?: string | null
          status: string
        }
        Update: {
          attempts?: number | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          next_retry_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_failed_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_failed_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      platform_incidents: {
        Row: {
          affected_scope: string | null
          id: string
          severity: string
          started_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          affected_scope?: string | null
          id?: string
          severity: string
          started_at?: string | null
          status: string
          title: string
          updated_at?: string | null
        }
        Update: {
          affected_scope?: string | null
          id?: string
          severity?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_leads: {
        Row: {
          company_name: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          lead_type: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          lead_type: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          lead_type?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
        }
        Relationships: []
      }
      platform_repair_attempts: {
        Row: {
          antigravity_version: string | null
          attempt_number: number
          branch_name: string
          completed_at: string | null
          files_changed: string[] | null
          id: string
          incident_id: string | null
          prompt_hash: string | null
          started_at: string | null
          status: string
          validation_results: string | null
        }
        Insert: {
          antigravity_version?: string | null
          attempt_number: number
          branch_name: string
          completed_at?: string | null
          files_changed?: string[] | null
          id?: string
          incident_id?: string | null
          prompt_hash?: string | null
          started_at?: string | null
          status?: string
          validation_results?: string | null
        }
        Update: {
          antigravity_version?: string | null
          attempt_number?: number
          branch_name?: string
          completed_at?: string | null
          files_changed?: string[] | null
          id?: string
          incident_id?: string | null
          prompt_hash?: string | null
          started_at?: string | null
          status?: string
          validation_results?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_repair_attempts_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "platform_delivery_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_users: {
        Row: {
          active: boolean | null
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          platform_role: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          platform_role?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          platform_role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          active: boolean | null
          business_id: string
          color: string | null
          cost_cents: number | null
          created_at: string | null
          external_inventory_item_id: string | null
          external_synced_at: string | null
          external_variant_id: string | null
          id: string
          msrp_cents: number | null
          product_id: string
          size: string | null
          store_retail_cents: number | null
          upc: string | null
          updated_at: string | null
          vendor_sku: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          color?: string | null
          cost_cents?: number | null
          created_at?: string | null
          external_inventory_item_id?: string | null
          external_synced_at?: string | null
          external_variant_id?: string | null
          id?: string
          msrp_cents?: number | null
          product_id: string
          size?: string | null
          store_retail_cents?: number | null
          upc?: string | null
          updated_at?: string | null
          vendor_sku?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          color?: string | null
          cost_cents?: number | null
          created_at?: string | null
          external_inventory_item_id?: string | null
          external_synced_at?: string | null
          external_variant_id?: string | null
          id?: string
          msrp_cents?: number | null
          product_id?: string
          size?: string | null
          store_retail_cents?: number | null
          upc?: string | null
          updated_at?: string | null
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_images: Json | null
          attributes: Json | null
          brand_id: string | null
          business_id: string
          category: string | null
          collection_id: string | null
          created_at: string | null
          description: string | null
          external_handle: string | null
          external_product_id: string | null
          external_synced_at: string | null
          id: string
          name: string | null
          primary_image: string | null
          status: string | null
          style_number: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          additional_images?: Json | null
          attributes?: Json | null
          brand_id?: string | null
          business_id: string
          category?: string | null
          collection_id?: string | null
          created_at?: string | null
          description?: string | null
          external_handle?: string | null
          external_product_id?: string | null
          external_synced_at?: string | null
          id?: string
          name?: string | null
          primary_image?: string | null
          status?: string | null
          style_number: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          additional_images?: Json | null
          attributes?: Json | null
          brand_id?: string | null
          business_id?: string
          category?: string | null
          collection_id?: string | null
          created_at?: string | null
          description?: string | null
          external_handle?: string | null
          external_product_id?: string | null
          external_synced_at?: string | null
          id?: string
          name?: string | null
          primary_image?: string | null
          status?: string | null
          style_number?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_connections: {
        Row: {
          auth_state: string
          auth_token: string | null
          brand_id: string | null
          business_id: string | null
          capabilities: Json | null
          circuit_breaker_state: string
          created_at: string | null
          health_status: string
          id: string
          last_error_at: string | null
          last_error_category: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_health_check_at: string | null
          last_recovery_at: string | null
          last_successful_sync_at: string | null
          location_id: string | null
          metadata: Json | null
          provider: string
          provider_account_id: string
          reconnect_url: string | null
          recovery_attempts: number
          status: string
          sync_errors_24h: number
          updated_at: string | null
        }
        Insert: {
          auth_state?: string
          auth_token?: string | null
          brand_id?: string | null
          business_id?: string | null
          capabilities?: Json | null
          circuit_breaker_state?: string
          created_at?: string | null
          health_status?: string
          id?: string
          last_error_at?: string | null
          last_error_category?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_health_check_at?: string | null
          last_recovery_at?: string | null
          last_successful_sync_at?: string | null
          location_id?: string | null
          metadata?: Json | null
          provider: string
          provider_account_id: string
          reconnect_url?: string | null
          recovery_attempts?: number
          status?: string
          sync_errors_24h?: number
          updated_at?: string | null
        }
        Update: {
          auth_state?: string
          auth_token?: string | null
          brand_id?: string | null
          business_id?: string | null
          capabilities?: Json | null
          circuit_breaker_state?: string
          created_at?: string | null
          health_status?: string
          id?: string
          last_error_at?: string | null
          last_error_category?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_health_check_at?: string | null
          last_recovery_at?: string | null
          last_successful_sync_at?: string | null
          location_id?: string | null
          metadata?: Json | null
          provider?: string
          provider_account_id?: string
          reconnect_url?: string | null
          recovery_attempts?: number
          status?: string
          sync_errors_24h?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          amount_cents: number | null
          assigned_customer: string | null
          assigned_staff: string | null
          business_id: string
          created_at: string | null
          expected_delivery: string | null
          id: string
          items: string | null
          location: string | null
          location_id: string | null
          notes: string | null
          ordered: string | null
          status: string | null
          vendor: string | null
        }
        Insert: {
          amount_cents?: number | null
          assigned_customer?: string | null
          assigned_staff?: string | null
          business_id: string
          created_at?: string | null
          expected_delivery?: string | null
          id?: string
          items?: string | null
          location?: string | null
          location_id?: string | null
          notes?: string | null
          ordered?: string | null
          status?: string | null
          vendor?: string | null
        }
        Update: {
          amount_cents?: number | null
          assigned_customer?: string | null
          assigned_staff?: string | null
          business_id?: string
          created_at?: string | null
          expected_delivery?: string | null
          id?: string
          items?: string | null
          location?: string | null
          location_id?: string | null
          notes?: string | null
          ordered?: string | null
          status?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_assigned_customer_fkey"
            columns: ["assigned_customer"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_assigned_customer_fkey"
            columns: ["assigned_customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string | null
          currency: string
          external_refund_id: string | null
          id: string
          order_id: string | null
          payment_id: string | null
          processed_at: string | null
          processed_by: string | null
          raw_payload: Json | null
          reason: string | null
          status: string | null
        }
        Insert: {
          amount_cents: number
          business_id: string
          created_at?: string | null
          currency?: string
          external_refund_id?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_payload?: Json | null
          reason?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string | null
          currency?: string
          external_refund_id?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          raw_payload?: Json | null
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shopify_sales_grain"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_events: {
        Row: {
          communication_id: string | null
          error_message: string | null
          id: string
          occurred_at: string | null
          reminder_id: string
          status: string
        }
        Insert: {
          communication_id?: string | null
          error_message?: string | null
          id?: string
          occurred_at?: string | null
          reminder_id: string
          status: string
        }
        Update: {
          communication_id?: string | null
          error_message?: string | null
          id?: string
          occurred_at?: string | null
          reminder_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_events_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_events_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          appointment_id: string | null
          business_id: string
          channel: string
          created_at: string | null
          customer_id: string | null
          id: string
          status: string | null
          template_id: string | null
          trigger_at: string | null
          trigger_offset_minutes: number | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          channel: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          status?: string | null
          template_id?: string | null
          trigger_at?: string | null
          trigger_offset_minutes?: number | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          status?: string | null
          template_id?: string | null
          trigger_at?: string | null
          trigger_offset_minutes?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean | null
          business_id: string
          capacity: number | null
          created_at: string | null
          id: string
          location_id: string | null
          name: string
          room_type: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          capacity?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          room_type?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          capacity?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          business_id: string | null
          created_at: string
          goal_cents: number
          id: string
          location: string
          location_id: string | null
          month: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          goal_cents?: number
          id?: string
          location: string
          location_id?: string | null
          month: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          goal_cents?: number
          id?: string
          location?: string
          location_id?: string | null
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sales_goals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_health_snapshots: {
        Row: {
          business_id: string
          core_web_vitals: Json | null
          created_at: string | null
          id: string
          issues: Json | null
          location_id: string | null
          score_accessibility: number | null
          score_best_practices: number | null
          score_overall: number | null
          score_performance: number | null
          score_seo: number | null
          snapshot_date: string | null
          target_url: string
        }
        Insert: {
          business_id: string
          core_web_vitals?: Json | null
          created_at?: string | null
          id?: string
          issues?: Json | null
          location_id?: string | null
          score_accessibility?: number | null
          score_best_practices?: number | null
          score_overall?: number | null
          score_performance?: number | null
          score_seo?: number | null
          snapshot_date?: string | null
          target_url: string
        }
        Update: {
          business_id?: string
          core_web_vitals?: Json | null
          created_at?: string | null
          id?: string
          issues?: Json | null
          location_id?: string | null
          score_accessibility?: number | null
          score_best_practices?: number | null
          score_overall?: number | null
          score_performance?: number | null
          score_seo?: number | null
          snapshot_date?: string | null
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_health_snapshots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_health_snapshots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "seo_health_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          key: string | null
          location_id: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          key?: string | null
          location_id?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          key?: string | null
          location_id?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_values: {
        Row: {
          business_id: string | null
          created_at: string | null
          created_by: string | null
          data_plane: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          location_id: string | null
          schema_version: number | null
          setting_key: string
          setting_namespace: string
          status: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          value_json: Json
          version: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_plane?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          location_id?: string | null
          schema_version?: number | null
          setting_key: string
          setting_namespace: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          value_json: Json
          version?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_plane?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          location_id?: string | null
          schema_version?: number | null
          setting_key?: string
          setting_namespace?: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          value_json?: Json
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_values_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_values_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "settings_values_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_versions: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value_json: Json
          previous_value_json: Json | null
          setting_value_id: string
          version: number
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value_json: Json
          previous_value_json?: Json | null
          setting_value_id: string
          version: number
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value_json?: Json
          previous_value_json?: Json | null
          setting_value_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_versions_setting_value_id_fkey"
            columns: ["setting_value_id"]
            isOneToOne: false
            referencedRelation: "settings_values"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_requests: {
        Row: {
          business_id: string
          covering_employee_id: string | null
          created_at: string | null
          id: string
          manager_approval_required: boolean | null
          requesting_employee_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_id: string
          status: string | null
        }
        Insert: {
          business_id: string
          covering_employee_id?: string | null
          created_at?: string | null
          id?: string
          manager_approval_required?: boolean | null
          requesting_employee_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id: string
          status?: string | null
        }
        Update: {
          business_id?: string
          covering_employee_id?: string | null
          created_at?: string | null
          id?: string
          manager_approval_required?: boolean | null
          requesting_employee_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shift_swap_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "employee_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_location_mappings: {
        Row: {
          business_id: string
          connection_id: string
          created_at: string
          id: string
          is_default: boolean
          location_id: string
          shopify_location_id: string | null
          shopify_location_name: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          connection_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          location_id: string
          shopify_location_id?: string | null
          shopify_location_name?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          connection_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          location_id?: string
          shopify_location_id?: string | null
          shopify_location_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_location_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_location_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shopify_location_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_location_mappings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_webhook_deliveries: {
        Row: {
          business_id: string | null
          error_message: string | null
          external_webhook_id: string
          id: string
          received_at: string
          shop_domain: string
          status: string
          topic: string
        }
        Insert: {
          business_id?: string | null
          error_message?: string | null
          external_webhook_id: string
          id?: string
          received_at?: string
          shop_domain: string
          status?: string
          topic: string
        }
        Update: {
          business_id?: string | null
          error_message?: string | null
          external_webhook_id?: string
          id?: string
          received_at?: string
          shop_domain?: string
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_webhook_deliveries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_webhook_deliveries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      shopify_webhook_subscriptions: {
        Row: {
          business_id: string
          callback_url: string
          connection_id: string
          external_webhook_id: string | null
          id: string
          last_delivery_at: string | null
          last_error: string | null
          registered_at: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          business_id: string
          callback_url: string
          connection_id: string
          external_webhook_id?: string | null
          id?: string
          last_delivery_at?: string | null
          last_error?: string | null
          registered_at?: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          callback_url?: string
          connection_id?: string
          external_webhook_id?: string | null
          id?: string
          last_delivery_at?: string | null
          last_error?: string | null
          registered_at?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_webhook_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_webhook_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shopify_webhook_subscriptions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "growth_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      size_systems: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          measurements: Json | null
          name: string
          vendor_id: string | null
          version: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          measurements?: Json | null
          name: string
          vendor_id?: string | null
          version?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          measurements?: Json | null
          name?: string
          vendor_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "size_systems_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "size_systems_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "size_systems_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contacts: {
        Row: {
          business_id: string | null
          created_at: string
          email: string
          id: string
          staff_name: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email: string
          id?: string
          staff_name: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string
          id?: string
          staff_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          business_id: string | null
          created_at: string
          end_minutes: number | null
          id: string
          is_working: boolean | null
          kind: string
          location_id: string | null
          off_end: string | null
          off_start: string | null
          reason: string | null
          staff_name: string
          start_minutes: number | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          end_minutes?: number | null
          id?: string
          is_working?: boolean | null
          kind?: string
          location_id?: string | null
          off_end?: string | null
          off_start?: string | null
          reason?: string | null
          staff_name: string
          start_minutes?: number | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          end_minutes?: number | null
          id?: string
          is_working?: boolean | null
          kind?: string
          location_id?: string | null
          off_end?: string | null
          off_start?: string | null
          reason?: string | null
          staff_name?: string
          start_minutes?: number | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          message_id: string | null
          size_bytes: number | null
          ticket_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          message_id?: string | null
          size_bytes?: number | null
          ticket_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          message_id?: string | null
          size_bytes?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          active: boolean | null
          ended_at: string | null
          id: string
          ip_address: string | null
          platform_user_id: string
          started_at: string | null
          target_organization_id: string
          user_agent: string | null
        }
        Insert: {
          active?: boolean | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          platform_user_id: string
          started_at?: string | null
          target_organization_id: string
          user_agent?: string | null
        }
        Update: {
          active?: boolean | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          platform_user_id?: string
          started_at?: string | null
          target_organization_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_sessions_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          app_version: string | null
          business_id: string
          category: string
          created_at: string
          description: string
          id: string
          organization_id: string | null
          priority: string | null
          resolved_at: string | null
          severity: string
          status: string
          subject: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          business_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          organization_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          subject: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          subject?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          business_id: string
          conflict_reason: string
          created_at: string | null
          entity_type: string
          external_id: string | null
          id: string
          job_id: string
          local_id: string | null
          resolution_status: string | null
          resolved_at: string | null
        }
        Insert: {
          business_id: string
          conflict_reason: string
          created_at?: string | null
          entity_type: string
          external_id?: string | null
          id?: string
          job_id: string
          local_id?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
        }
        Update: {
          business_id?: string
          conflict_reason?: string
          created_at?: string | null
          entity_type?: string
          external_id?: string | null
          id?: string
          job_id?: string
          local_id?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sync_conflicts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          business_id: string
          channel_id: string | null
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          id: string
          job_type: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          business_id: string
          channel_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          id?: string
          job_type: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          business_id?: string
          channel_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          id?: string
          job_type?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sync_jobs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "commerce_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          organization_id: string | null
          payload: Json | null
          severity: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          severity?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_at: string | null
          assignee_id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string | null
          assignee_id: string
          task_id: string
        }
        Update: {
          assigned_at?: string | null
          assignee_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_id: string
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          task_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          task_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          appointment_id: string | null
          business_id: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          location_id: string | null
          priority: string | null
          status: string | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location_id?: string | null
          priority?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location_id?: string | null
          priority?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          access_token: string | null
          business_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          provider: string
          provider_account_id: string | null
          refresh_token: string | null
          scopes: string[] | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          provider_account_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          provider_account_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      tenant_orphan_audit: {
        Row: {
          id: string
          observed_at: string
          orphan_rows: number
          source_table: string
        }
        Insert: {
          id?: string
          observed_at?: string
          orphan_rows: number
          source_table: string
        }
        Update: {
          id?: string
          observed_at?: string
          orphan_rows?: number
          source_table?: string
        }
        Relationships: []
      }
      tenant_subscriptions: {
        Row: {
          active_trials: Json | null
          addons: string[] | null
          business_id: string | null
          created_at: string | null
          grandfathered_features: string[] | null
          id: string
          overrides: Json | null
          plan: Database["public"]["Enums"]["commercial_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string | null
          usage_limits: Json | null
        }
        Insert: {
          active_trials?: Json | null
          addons?: string[] | null
          business_id?: string | null
          created_at?: string | null
          grandfathered_features?: string[] | null
          id?: string
          overrides?: Json | null
          plan?: Database["public"]["Enums"]["commercial_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
          usage_limits?: Json | null
        }
        Update: {
          active_trials?: Json | null
          addons?: string[] | null
          business_id?: string | null
          created_at?: string | null
          grandfathered_features?: string[] | null
          id?: string
          overrides?: Json | null
          plan?: Database["public"]["Enums"]["commercial_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string | null
          usage_limits?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      time_entries: {
        Row: {
          business_id: string | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          location_id: string | null
          note: string | null
          staff_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          note?: string | null
          staff_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          note?: string | null
          staff_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "time_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          business_id: string
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string | null
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string | null
          type: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      transfers: {
        Row: {
          business_id: string
          created_at: string | null
          from_location: string | null
          from_location_id: string | null
          gown_id: string | null
          gown_name: string | null
          id: string
          location_id: string | null
          note: string | null
          qty: number | null
          received: string | null
          requested: string | null
          status: string | null
          to_location: string | null
          to_location_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          from_location?: string | null
          from_location_id?: string | null
          gown_id?: string | null
          gown_name?: string | null
          id?: string
          location_id?: string | null
          note?: string | null
          qty?: number | null
          received?: string | null
          requested?: string | null
          status?: string | null
          to_location?: string | null
          to_location_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          from_location?: string | null
          from_location_id?: string | null
          gown_id?: string | null
          gown_name?: string | null
          id?: string
          location_id?: string | null
          note?: string | null
          qty?: number | null
          received?: string | null
          requested?: string | null
          status?: string | null
          to_location?: string | null
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "gowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "inventory_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_gown_id_fkey"
            columns: ["gown_id"]
            isOneToOne: false
            referencedRelation: "inventory_variants"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "transfers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      try_on_notes: {
        Row: {
          bride_id: string | null
          business_id: string | null
          created_at: string
          customer: string | null
          designer: string | null
          gown_name: string | null
          id: string
          notes: string | null
          price_cents: number | null
          rating: string | null
          stylist: string | null
          tried_on: string | null
          updated_at: string
        }
        Insert: {
          bride_id?: string | null
          business_id?: string | null
          created_at?: string
          customer?: string | null
          designer?: string | null
          gown_name?: string | null
          id?: string
          notes?: string | null
          price_cents?: number | null
          rating?: string | null
          stylist?: string | null
          tried_on?: string | null
          updated_at?: string
        }
        Update: {
          bride_id?: string | null
          business_id?: string | null
          created_at?: string
          customer?: string | null
          designer?: string | null
          gown_name?: string | null
          id?: string
          notes?: string | null
          price_cents?: number | null
          rating?: string | null
          stylist?: string | null
          tried_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "try_on_notes_bride_id_fkey"
            columns: ["bride_id"]
            isOneToOne: false
            referencedRelation: "brides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "try_on_notes_bride_id_fkey"
            columns: ["bride_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "try_on_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "try_on_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      vendor_colors: {
        Row: {
          active: boolean | null
          business_id: string
          canonical_family: string | null
          code: string | null
          created_at: string | null
          id: string
          name: string
          swatch_url: string | null
          vendor_id: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          canonical_family?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          swatch_url?: string | null
          vendor_id?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          canonical_family?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          swatch_url?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_colors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_colors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "vendor_colors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_order_confirmations: {
        Row: {
          business_id: string
          confirmation_number: string
          expected_delivery_at: string | null
          expected_ship_at: string | null
          id: string
          journey_id: string
          raw_confirmation: Json
          received_at: string
          vendor_id: string
          vendor_status: string | null
        }
        Insert: {
          business_id: string
          confirmation_number: string
          expected_delivery_at?: string | null
          expected_ship_at?: string | null
          id?: string
          journey_id: string
          raw_confirmation?: Json
          received_at?: string
          vendor_id: string
          vendor_status?: string | null
        }
        Update: {
          business_id?: string
          confirmation_number?: string
          expected_delivery_at?: string | null
          expected_ship_at?: string | null
          id?: string
          journey_id?: string
          raw_confirmation?: Json
          received_at?: string
          vendor_id?: string
          vendor_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_order_confirmations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_order_confirmations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "vendor_order_confirmations_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "customer_order_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_order_confirmations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          business_id: string
          created_at: string | null
          dba: string | null
          id: string
          internal_id: string | null
          name: string
          ordering_rules: Json | null
          primary_contact: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          dba?: string | null
          id?: string
          internal_id?: string | null
          name: string
          ordering_rules?: Json | null
          primary_contact?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          dba?: string | null
          id?: string
          internal_id?: string | null
          name?: string
          ordering_rules?: Json | null
          primary_contact?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      brides: {
        Row: {
          business_id: string | null
          created_at: string | null
          email: string | null
          email_consent: boolean | null
          id: string | null
          location_id: string | null
          name: string | null
          phone: string | null
          portal_token: string | null
          profile_photo_updated_at: string | null
          profile_photo_url: string | null
          sms_consent: boolean | null
          sms_opt_in: boolean | null
          spend_cents: number | null
          status: string | null
          stylist: string | null
          wedding_date: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          email_consent?: boolean | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          phone?: string | null
          portal_token?: string | null
          profile_photo_updated_at?: string | null
          profile_photo_url?: string | null
          sms_consent?: boolean | null
          sms_opt_in?: boolean | null
          spend_cents?: number | null
          status?: string | null
          stylist?: string | null
          wedding_date?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          email_consent?: boolean | null
          id?: string | null
          location_id?: string | null
          name?: string | null
          phone?: string | null
          portal_token?: string | null
          profile_photo_updated_at?: string | null
          profile_photo_url?: string | null
          sms_consent?: boolean | null
          sms_opt_in?: boolean | null
          spend_cents?: number | null
          status?: string | null
          stylist?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          base_price_cents: number | null
          business_id: string | null
          category: string | null
          created_at: string | null
          id: string | null
          style_number: string | null
          vendor_name: string | null
        }
        Insert: {
          base_price_cents?: number | null
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          style_number?: string | null
          vendor_name?: string | null
        }
        Update: {
          base_price_cents?: number | null
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          style_number?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gowns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gowns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      inventory_variants: {
        Row: {
          color: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          price_cents: number | null
          size: string | null
          sku: string | null
          stock: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string | null
          item_id?: string | null
          price_cents?: number | null
          size?: string | null
          sku?: string | null
          stock?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string | null
          item_id?: string | null
          price_cents?: number | null
          size?: string | null
          sku?: string | null
          stock?: number | null
        }
        Relationships: []
      }
      organization_health_scores: {
        Row: {
          health_score: number | null
          health_status: string | null
          last_activity: string | null
          organization_id: string | null
          organization_name: string | null
          organization_type: string | null
        }
        Insert: {
          health_score?: never
          health_status?: never
          last_activity?: never
          organization_id?: string | null
          organization_name?: string | null
          organization_type?: string | null
        }
        Update: {
          health_score?: never
          health_status?: never
          last_activity?: never
          organization_id?: string | null
          organization_name?: string | null
          organization_type?: string | null
        }
        Relationships: []
      }
      shopify_sales_grain: {
        Row: {
          brand_id: string | null
          business_id: string | null
          cancelled_at: string | null
          currency: string | null
          discount_cents: number | null
          financial_status: string | null
          fulfillment_status: string | null
          location_id: string | null
          net_quantity: number | null
          net_revenue_cents: number | null
          order_id: string | null
          order_item_id: string | null
          order_number: string | null
          ordered_at: string | null
          product_id: string | null
          quantity: number | null
          refunded_quantity: number | null
          sku: string | null
          tax_cents: number | null
          title: string | null
          total_cents: number | null
          unit_price_cents: number | null
          variant_id: string | null
          variant_title: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "organization_health_scores"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_appointment_idempotent: {
        Args: {
          p_business_id: string
          p_employee_id: string
          p_end_at: string
          p_location_id: string
          p_request_id: string
          p_room_id: string
          p_start_at: string
        }
        Returns: Json
      }
      assign_appointment_request: {
        Args: {
          p_employee_id: string
          p_end_at: string
          p_request_id: string
          p_room_id: string
          p_start_at: string
        }
        Returns: string
      }
      billing_create_checkout_session: {
        Args: { p_business_id: string; p_plan_id: string }
        Returns: string
      }
      billing_handle_webhook: {
        Args: {
          p_business_id: string
          p_event_id: string
          p_event_type: string
          p_plan_id: string
        }
        Returns: boolean
      }
      canonical_workspace_role: { Args: { p_role: string }; Returns: string }
      check_in_appointment: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      clear_staging_data: { Args: never; Returns: undefined }
      complete_appointment: {
        Args: { p_appointment_id: string; p_notes?: string; p_outcome: string }
        Returns: undefined
      }
      confirm_appointment_hold: { Args: { p_hold_id: string }; Returns: string }
      connect_stripe_integration: {
        Args: { integration_id?: string }
        Returns: Json
      }
      create_appointment_hold: {
        Args: {
          p_business_id: string
          p_employee_id: string
          p_end_at: string
          p_expires_in_minutes?: number
          p_location_id: string
          p_request_id: string
          p_room_id: string
          p_start_at: string
        }
        Returns: string
      }
      create_direct_appointment: {
        Args: {
          p_business_id: string
          p_customer_id: string
          p_employee_id: string
          p_end_at: string
          p_location_id: string
          p_room_id: string
          p_service_id: string
          p_start_at: string
        }
        Returns: string
      }
      enter_support_mode: { Args: { target_org_id: string }; Returns: Json }
      generate_ai_recommendations: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      get_auth_platform_role: { Args: never; Returns: string }
      get_auth_tenant_id: { Args: never; Returns: string }
      get_platform_directory: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          email: string
          id: string
          last_login: string
          platform_role: string
        }[]
      }
      get_tenant_user_directory: {
        Args: never
        Returns: {
          business_id: string
          business_name: string
          created_at: string
          email: string
          id: string
          last_login: string
          role: string
        }[]
      }
      handle_employee_callout: {
        Args: { p_date: string; p_employee_id: string; p_reason?: string }
        Returns: undefined
      }
      invite_platform_user: {
        Args: { p_email: string; p_role: string }
        Returns: Json
      }
      is_active_business_member: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      is_business_manager: { Args: { p_business_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_platform_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      platform_add_tenant_user: {
        Args: { p_business_id: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      platform_create_brand: {
        Args: {
          p_business_id: string
          p_description?: string
          p_logo_url?: string
          p_name: string
        }
        Returns: Json
      }
      platform_create_location: {
        Args: {
          p_address?: string
          p_brand_id?: string
          p_business_id: string
          p_email?: string
          p_name: string
          p_phone?: string
        }
        Returns: Json
      }
      platform_get_organizations: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      platform_update_organization_core: {
        Args: {
          p_business_id: string
          p_expected_version: number
          p_name: string
          p_onboarding_status: string
          p_reason: string
          p_slug: string
          p_status: string
        }
        Returns: Json
      }
      platform_update_subscription: {
        Args: {
          p_account_type: string
          p_business_id: string
          p_effective_price_cents: number
          p_expected_version: number
          p_plan_id: string
          p_reason: string
          p_status: string
        }
        Returns: Json
      }
      portal_apply_invoice_payment: {
        Args: {
          p_amount_cents: number
          p_invoice_id: string
          p_note?: string
          p_pay_token: string
          p_payer_email?: string
          p_payer_name?: string
          p_reference: string
        }
        Returns: Json
      }
      portal_get_bride_bundle: {
        Args: { p_customer_id: string; p_portal_token: string }
        Returns: Json
      }
      portal_get_contract: {
        Args: { p_contract_id: string; p_sign_token: string }
        Returns: Json
      }
      portal_get_invoice: {
        Args: { p_invoice_id: string; p_pay_token: string }
        Returns: Json
      }
      portal_sign_contract: {
        Args: {
          p_contract_id: string
          p_sign_token: string
          p_signed_initials: string
          p_signed_name: string
        }
        Returns: Json
      }
      provision_full_tenant: { Args: { payload: Json }; Returns: Json }
      provision_new_organization:
        | {
            Args: {
              p_email: string
              p_first_name: string
              p_industry: string
              p_last_name: string
              p_name: string
              p_slug: string
              p_timezone: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_country: string
              p_display_name: string
              p_industry: string
              p_legal_name: string
              p_organization_type: string
              p_parent_id?: string
              p_slug: string
              p_state: string
              p_timezone: string
              p_websites?: string[]
            }
            Returns: string
          }
        | {
            Args: {
              p_country: string
              p_display_name: string
              p_industry: string
              p_legal_name: string
              p_organization_type: string
              p_parent_id?: string
              p_plan_id?: string
              p_slug: string
              p_state: string
              p_timezone: string
              p_websites?: string[]
            }
            Returns: string
          }
        | {
            Args: {
              p_country: string
              p_display_name: string
              p_industry: string
              p_legal_name: string
              p_organization_type: string
              p_plan_id?: string
              p_slug: string
              p_state: string
              p_timezone: string
            }
            Returns: string
          }
      publish_employee_schedule: {
        Args: { p_business_id: string; p_location_id: string }
        Returns: undefined
      }
      reschedule_appointment: {
        Args: {
          p_appointment_id: string
          p_new_employee_id: string
          p_new_end_at: string
          p_new_start_at: string
        }
        Returns: undefined
      }
      resolve_public_organization_by_slug: {
        Args: { p_slug: string }
        Returns: {
          accent_color: string
          display_name: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          status: string
          subscription_status: string
        }[]
      }
      revoke_all_sessions: { Args: never; Returns: undefined }
      search_help_articles: {
        Args: { search_query: string; user_role?: string }
        Returns: {
          category: string
          id: string
          rank: number
          read_time_minutes: number
          slug: string
          summary: string
          title: string
        }[]
      }
      send_test_template: {
        Args: { recipient: string; template_id: string }
        Returns: undefined
      }
      start_appointment: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      submit_public_appointment: {
        Args: {
          p_budget_cents: number
          p_customer_name: string
          p_date: string
          p_email: string
          p_looking_for: string
          p_payment_intent_id: string
          p_phone: string
          p_store_slug: string
          p_time: string
          p_total_cents: number
          p_type: string
        }
        Returns: string
      }
      test_automation_rule: { Args: { rule_id: string }; Returns: Json }
      test_twilio_connection: { Args: never; Returns: undefined }
      transition_request_status: {
        Args: { p_new_status: string; p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      update_organization_industry_pack: {
        Args: { p_business_id: string; p_industry_pack: string }
        Returns: Json
      }
      upsert_external_order: {
        Args: {
          p_business_id: string
          p_channel_id: string
          p_customer_id: string
          p_external_order_id: string
          p_external_order_url: string
          p_location_id: string
          p_source_type: string
          p_status: string
          p_total_cents: number
        }
        Returns: string
      }
      user_has_role: {
        Args: { allowed_roles: string[]; check_business_id: string }
        Returns: boolean
      }
    }
    Enums: {
      commercial_plan: "essentials" | "growth" | "pro" | "enterprise"
      subscription_status:
        | "active"
        | "past_due"
        | "suspended"
        | "canceled"
        | "trialing"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      commercial_plan: ["essentials", "growth", "pro", "enterprise"],
      subscription_status: [
        "active",
        "past_due",
        "suspended",
        "canceled",
        "trialing",
      ],
    },
  },
} as const

