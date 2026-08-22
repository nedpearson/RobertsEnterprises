export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          organization_type: string | null;
          status: string;
          onboarding_status: string | null;
          subscription_status: string | null;
          version?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          organization_type?: string | null;
          status?: string;
          onboarding_status?: string | null;
          subscription_status?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
      };
      locations: {
        Row: {
          id: string;
          business_id: string;
          brand_id: string | null;
          name: string;
          slug: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          brand_id?: string | null;
          name: string;
          slug?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          wedding_date: string | null;
          stylist: string | null;
          status: string;
          spend_cents: number;
          portal_token: string | null;
          profile_photo_url: string | null;
          profile_photo_updated_at: string | null;
          sms_opt_in: boolean;
          sms_consent: boolean;
          email_consent: boolean;
          accessibility_needs?: string | null;
          language?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          wedding_date?: string | null;
          stylist?: string | null;
          status?: string;
          spend_cents?: number;
          portal_token?: string | null;
          profile_photo_url?: string | null;
          profile_photo_updated_at?: string | null;
          sms_opt_in?: boolean;
          sms_consent?: boolean;
          email_consent?: boolean;
          accessibility_needs?: string | null;
          language?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          customer_id: string | null;
          customer: string | null;
          service_id: string | null;
          employee_id: string | null;
          provider_connection_id: string | null;
          external_appointment_id: string | null;
          type: string | null;
          date: string | null;
          time: string | null;
          start_at: string;
          end_at: string;
          stylist: string | null;
          status: string;
          confirmation_status: string | null;
          intake_source: string | null;
          looking_for: string | null;
          budget_cents: number;
          fee_paid: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          customer_id?: string | null;
          customer?: string | null;
          service_id?: string | null;
          employee_id?: string | null;
          provider_connection_id?: string | null;
          external_appointment_id?: string | null;
          type?: string | null;
          date?: string | null;
          time?: string | null;
          start_at?: string;
          end_at?: string;
          stylist?: string | null;
          status?: string;
          confirmation_status?: string | null;
          intake_source?: string | null;
          looking_for?: string | null;
          budget_cents?: number;
          fee_paid?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          business_id: string | null;
          location_id: string | null;
          customer_id: string | null;
          customer: string | null;
          sender: string | null;
          content: string | null;
          channel: string;
          to_address: string | null;
          subject: string | null;
          body: string | null;
          kind: string | null;
          status: string;
          error: string | null;
          direction: string;
          sentiment: string | null;
          external_id: string | null;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          location_id?: string | null;
          customer_id?: string | null;
          customer?: string | null;
          sender?: string | null;
          content?: string | null;
          channel?: string;
          to_address?: string | null;
          subject?: string | null;
          body?: string | null;
          kind?: string | null;
          status?: string;
          error?: string | null;
          direction?: string;
          sentiment?: string | null;
          external_id?: string | null;
          sent_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      time_entries: {
        Row: {
          id: string;
          business_id: string | null;
          location_id: string | null;
          user_id: string | null;
          staff_name: string;
          clock_in: string;
          clock_out: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          location_id?: string | null;
          user_id?: string | null;
          staff_name: string;
          clock_in?: string;
          clock_out?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['time_entries']['Insert']>;
      };
      sales_goals: {
        Row: {
          id: string;
          business_id: string | null;
          location: string;
          location_id: string | null;
          month: string;
          goal_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          location: string;
          location_id?: string | null;
          month: string;
          goal_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sales_goals']['Insert']>;
      };
      try_on_notes: {
        Row: {
          id: string;
          business_id: string | null;
          bride_id: string;
          customer: string | null;
          gown_name: string | null;
          designer: string | null;
          price_cents: number;
          rating: string;
          notes: string | null;
          stylist: string | null;
          tried_on: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          bride_id: string;
          customer?: string | null;
          gown_name?: string | null;
          designer?: string | null;
          price_cents?: number;
          rating?: string;
          notes?: string | null;
          stylist?: string | null;
          tried_on?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['try_on_notes']['Insert']>;
      };
      measurements: {
        Row: {
          id: string;
          business_id: string | null;
          bride_id: string;
          customer: string | null;
          taken_on: string;
          bust: string | null;
          waist: string | null;
          hips: string | null;
          hollow_to_hem: string | null;
          height: string | null;
          heel_height: string | null;
          street_size: string | null;
          gown_size: string | null;
          notes: string | null;
          taken_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          bride_id: string;
          customer?: string | null;
          taken_on?: string;
          bust?: string | null;
          waist?: string | null;
          hips?: string | null;
          hollow_to_hem?: string | null;
          height?: string | null;
          heel_height?: string | null;
          street_size?: string | null;
          gown_size?: string | null;
          notes?: string | null;
          taken_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['measurements']['Insert']>;
      };
      staff_schedules: {
        Row: {
          id: string;
          business_id: string | null;
          location_id: string | null;
          staff_name: string;
          kind: string;
          weekday: number | null;
          is_working: boolean;
          start_minutes: number;
          end_minutes: number;
          off_start: string | null;
          off_end: string | null;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          location_id?: string | null;
          staff_name: string;
          kind?: string;
          weekday?: number | null;
          is_working?: boolean;
          start_minutes?: number;
          end_minutes?: number;
          off_start?: string | null;
          off_end?: string | null;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_schedules']['Insert']>;
      };
      internal_notes: {
        Row: {
          id: string;
          business_id: string;
          entity_id: string;
          entity_type: string;
          author_id: string | null;
          content: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          entity_id: string;
          entity_type?: string;
          author_id?: string | null;
          content: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['internal_notes']['Insert']>;
      };
      staff_contacts: {
        Row: {
          id: string;
          business_id: string | null;
          staff_name: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          staff_name: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_contacts']['Insert']>;
      };
      app_settings: {
        Row: {
          key: string;
          business_id: string | null;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          business_id?: string | null;
          value: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['app_settings']['Insert']>;
      };
      durable_jobs: {
        Row: {
          id: string;
          business_id: string | null;
          queue_name: string;
          payload: Json;
          status: string;
          attempts: number;
          max_attempts: number;
          locked_at: string | null;
          locked_by: string | null;
          next_retry_at: string | null;
          error_message: string | null;
          error_code: string | null;
          error_details: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          queue_name: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          locked_at?: string | null;
          locked_by?: string | null;
          next_retry_at?: string | null;
          error_message?: string | null;
          error_code?: string | null;
          error_details?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['durable_jobs']['Insert']>;
      };
      automation_rules: {
        Row: {
          id: string;
          business_id: string | null;
          brand: string | null;
          name: string;
          action_type: string;
          execution_level: number;
          execution_count: number;
          last_executed_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          brand?: string | null;
          name: string;
          action_type: string;
          execution_level?: number;
          execution_count?: number;
          last_executed_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['automation_rules']['Insert']>;
      };
      marketing_budgets: {
        Row: {
          id: string;
          business_id: string | null;
          brand: string | null;
          monthly_budget_cents: number;
          allocated_budget_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          brand?: string | null;
          monthly_budget_cents?: number;
          allocated_budget_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marketing_budgets']['Insert']>;
      };
      pickups: {
        Row: {
          id: string;
          business_id: string | null;
          customer_id: string | null;
          item_description: string | null;
          qa_verified: boolean;
          ready_since: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          customer_id?: string | null;
          item_description?: string | null;
          qa_verified?: boolean;
          ready_since?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pickups']['Insert']>;
      };
      gowns: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          name: string;
          designer: string;
          style: string;
          size: string;
          color: string;
          price_cents: number;
          stock: number;
          status: string;
          image: string | null;
          sku: string | null;
          cost_cents: number;
          msrp_cents: number;
          category: string;
          condition: string;
          vendor: string;
          reorder_point: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          name: string;
          designer: string;
          style: string;
          size: string;
          color: string;
          price_cents: number;
          stock?: number;
          status?: string;
          image?: string | null;
          sku?: string | null;
          cost_cents?: number;
          msrp_cents?: number;
          category?: string;
          condition?: string;
          vendor?: string;
          reorder_point?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gowns']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          customer_id: string | null;
          customer: string | null;
          description: string;
          amount_cents: number;
          paid_cents: number;
          due_date: string;
          status: string;
          pay_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          customer_id?: string | null;
          customer?: string | null;
          description: string;
          amount_cents: number;
          paid_cents?: number;
          due_date: string;
          status?: string;
          pay_token?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      payment_schedules: {
        Row: {
          id: string;
          business_id: string;
          invoice_id: string;
          stage_name: string;
          amount_cents: number;
          paid_cents: number;
          due_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          invoice_id: string;
          stage_name: string;
          amount_cents: number;
          paid_cents?: number;
          due_date: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payment_schedules']['Insert']>;
      };
      purchase_orders: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          vendor: string;
          items: string;
          amount_cents: number;
          ordered: string;
          expected_delivery: string;
          status: string;
          assigned_staff: string | null;
          assigned_customer: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          vendor: string;
          items: string;
          amount_cents: number;
          ordered?: string;
          expected_delivery: string;
          status?: string;
          assigned_staff?: string | null;
          assigned_customer?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
      };
      transfers: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          gown_id: string | null;
          gown_name: string;
          from_location_id: string | null;
          to_location_id: string | null;
          from_location: string | null;
          to_location: string | null;
          qty: number;
          status: string;
          requested: string;
          received: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          gown_id?: string | null;
          gown_name: string;
          from_location_id?: string | null;
          to_location_id?: string | null;
          from_location?: string | null;
          to_location?: string | null;
          qty?: number;
          status?: string;
          requested?: string;
          received?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transfers']['Insert']>;
      };
      contracts: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          customer: string;
          gown: string;
          amount_cents: number;
          deposit_cents: number;
          special_terms: string | null;
          status: string;
          sign_token: string | null;
          signed_name: string | null;
          signed_initials: string | null;
          signed_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          customer: string;
          gown: string;
          amount_cents: number;
          deposit_cents: number;
          special_terms?: string | null;
          status?: string;
          sign_token?: string | null;
          signed_name?: string | null;
          signed_initials?: string | null;
          signed_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>;
      };
      alterations: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          location: string | null;
          customer: string;
          gown: string;
          seamstress: string | null;
          status: string;
          tasks: Json | null;
          next_fitting: string | null;
          due_date: string | null;
          price_cents: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          location?: string | null;
          customer: string;
          gown: string;
          seamstress?: string | null;
          status?: string;
          tasks?: Json | null;
          next_fitting?: string | null;
          due_date?: string | null;
          price_cents?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['alterations']['Insert']>;
      };
      support_tickets: {
        Row: {
          id: string;
          business_id: string;
          organization_id: string | null;
          tenant_id: string | null;
          user_id: string | null;
          category: string;
          subject: string;
          description: string;
          status: string;
          severity: string;
          priority: string;
          app_version: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          business_id?: string;
          organization_id?: string | null;
          tenant_id?: string | null;
          user_id?: string | null;
          category?: string;
          subject: string;
          description?: string;
          status?: string;
          severity?: string;
          priority?: string;
          app_version?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>;
      };
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string | null;
          message: string;
          is_internal_note: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id?: string | null;
          message: string;
          is_internal_note?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['support_messages']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          business_id: string | null;
          organization_id: string | null;
          actor_id: string | null;
          actor_user_id: string | null;
          user_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          resource: string | null;
          resource_id: string | null;
          resource_type: string | null;
          action: string;
          brand: string | null;
          before_value: Json | null;
          after_value: Json | null;
          before_state: Json | null;
          after_state: Json | null;
          metadata: Json | null;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          organization_id?: string | null;
          actor_id?: string | null;
          actor_user_id?: string | null;
          user_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          resource?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          action: string;
          brand?: string | null;
          before_value?: Json | null;
          after_value?: Json | null;
          before_state?: Json | null;
          after_state?: Json | null;
          metadata?: Json | null;
          reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
      organization_module_preferences: {
        Row: {
          id: string;
          business_id: string;
          organization_id: string | null;
          module_id: string;
          is_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string;
          organization_id?: string | null;
          module_id: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_module_preferences']['Insert']>;
      };
      organization_feature_overrides: {
        Row: {
          id: string;
          business_id: string;
          feature_key: string;
          state: string;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          feature_key: string;
          state: string;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_feature_overrides']['Insert']>;
      };
      organization_subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan_id: string;
          status: string;
          account_type: string | null;
          effective_price_cents: number;
          version?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan_id: string;
          status?: string;
          account_type?: string | null;
          effective_price_cents?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_subscriptions']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          business_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          source: string | null;
          budget_cents: number;
          wedding_date: string | null;
          stage: string;
          ai_score: number | null;
          ai_insight: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          source?: string | null;
          budget_cents?: number;
          wedding_date?: string | null;
          stage?: string;
          ai_score?: number | null;
          ai_insight?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          customer_id: string | null;
          site_id: string | null;
          channel_id: string | null;
          source_type: string | null;
          external_order_id: string | null;
          external_order_url: string | null;
          status: string | null;
          total_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          customer_id?: string | null;
          site_id?: string | null;
          channel_id?: string | null;
          source_type?: string | null;
          external_order_id?: string | null;
          external_order_url?: string | null;
          status?: string | null;
          total_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      provider_connections: {
        Row: {
          id: string;
          business_id: string | null;
          brand_id: string | null;
          location_id: string | null;
          provider: string;
          provider_account_id: string;
          status: string;
          capabilities: Json | null;
          auth_token: string | null;
          health_status: string;
          circuit_breaker_state: string;
          auth_state: string;
          last_health_check_at: string | null;
          last_successful_sync_at: string | null;
          last_error_at: string | null;
          last_error_code: string | null;
          last_error_message: string | null;
          last_error_category: string | null;
          sync_errors_24h: number;
          recovery_attempts: number;
          last_recovery_at: string | null;
          reconnect_url: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          brand_id?: string | null;
          location_id?: string | null;
          provider: string;
          provider_account_id: string;
          status?: string;
          capabilities?: Json | null;
          auth_token?: string | null;
          health_status?: string;
          circuit_breaker_state?: string;
          auth_state?: string;
          last_health_check_at?: string | null;
          last_successful_sync_at?: string | null;
          last_error_at?: string | null;
          last_error_code?: string | null;
          last_error_message?: string | null;
          last_error_category?: string | null;
          sync_errors_24h?: number;
          recovery_attempts?: number;
          last_recovery_at?: string | null;
          reconnect_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['provider_connections']['Insert']>;
      };
      omnichannel_inbox: {
        Row: {
          id: string;
          business_id: string | null;
          brand_id: string | null;
          provider_connection_id: string | null;
          external_message_id: string | null;
          sender_id: string | null;
          sender_name: string | null;
          recipient_id: string | null;
          content: string | null;
          message_type: string;
          metadata: Json | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          brand_id?: string | null;
          provider_connection_id?: string | null;
          external_message_id?: string | null;
          sender_id?: string | null;
          sender_name?: string | null;
          recipient_id?: string | null;
          content?: string | null;
          message_type?: string;
          metadata?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['omnichannel_inbox']['Insert']>;
      };
      integration_circuit_breakers: {
        Row: {
          id: string;
          provider: string;
          scope: string;
          scope_id: string;
          business_id: string | null;
          state: string;
          failure_count: number;
          consecutive_failures: number;
          success_count: number;
          last_failure_at: string | null;
          last_success_at: string | null;
          cooldown_expires_at: string | null;
          cooldown_seconds: number;
          is_provider_outage: boolean;
          last_error_message: string | null;
          last_error_category: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          scope?: string;
          scope_id: string;
          business_id?: string | null;
          state?: string;
          failure_count?: number;
          consecutive_failures?: number;
          success_count?: number;
          last_failure_at?: string | null;
          last_success_at?: string | null;
          cooldown_expires_at?: string | null;
          cooldown_seconds?: number;
          is_provider_outage?: boolean;
          last_error_message?: string | null;
          last_error_category?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['integration_circuit_breakers']['Insert']>;
      };
      integration_sync_cursors: {
        Row: {
          id: string;
          provider_connection_id: string;
          business_id: string | null;
          resource_type: string;
          last_cursor: string | null;
          last_sync_timestamp: string | null;
          buffer_seconds: number;
          sync_status: string;
          records_synced_total: number;
          records_synced_last_run: number;
          lock_acquired_at: string | null;
          lock_expires_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_connection_id: string;
          business_id?: string | null;
          resource_type: string;
          last_cursor?: string | null;
          last_sync_timestamp?: string | null;
          buffer_seconds?: number;
          sync_status?: string;
          records_synced_total?: number;
          records_synced_last_run?: number;
          lock_acquired_at?: string | null;
          lock_expires_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['integration_sync_cursors']['Insert']>;
      };
      integration_error_logs: {
        Row: {
          id: string;
          provider_connection_id: string | null;
          business_id: string | null;
          provider: string;
          endpoint: string | null;
          status_code: number | null;
          failure_category: string;
          error_message: string;
          root_cause: string | null;
          suggested_action: string | null;
          raw_payload: Json | null;
          sanitized_headers: Json | null;
          is_auto_repairable: boolean;
          is_resolved: boolean;
          resolved_at: string | null;
          resolution_action: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_connection_id?: string | null;
          business_id?: string | null;
          provider: string;
          endpoint?: string | null;
          status_code?: number | null;
          failure_category: string;
          error_message: string;
          root_cause?: string | null;
          suggested_action?: string | null;
          raw_payload?: Json | null;
          sanitized_headers?: Json | null;
          is_auto_repairable?: boolean;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolution_action?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['integration_error_logs']['Insert']>;
      };
      integration_recovery_timelines: {
        Row: {
          id: string;
          provider_connection_id: string;
          business_id: string | null;
          provider: string;
          action_type: string;
          trigger: string;
          previous_status: string;
          resulting_status: string;
          details: Json | null;
          success: boolean;
          duration_ms: number;
          executed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_connection_id: string;
          business_id?: string | null;
          provider: string;
          action_type: string;
          trigger?: string;
          previous_status: string;
          resulting_status: string;
          details?: Json | null;
          success?: boolean;
          duration_ms?: number;
          executed_by?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['integration_recovery_timelines']['Insert']>;
      };
      integration_dlq_events: {
        Row: {
          id: string;
          provider_connection_id: string | null;
          business_id: string | null;
          provider: string;
          event_type: string;
          idempotency_key: string | null;
          payload: Json;
          headers: Json | null;
          error_message: string;
          retry_count: number;
          max_retries: number;
          next_retry_at: string | null;
          status: string;
          replay_result: Json | null;
          replayed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_connection_id?: string | null;
          business_id?: string | null;
          provider: string;
          event_type: string;
          idempotency_key?: string | null;
          payload: Json;
          headers?: Json | null;
          error_message: string;
          retry_count?: number;
          max_retries?: number;
          next_retry_at?: string | null;
          status?: string;
          replay_result?: Json | null;
          replayed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['integration_dlq_events']['Insert']>;
      };
      google_drive_watches: {
        Row: {
          id: string;
          provider_connection_id: string;
          business_id: string | null;
          channel_id: string;
          resource_id: string;
          resource_uri: string | null;
          expiration_timestamp: string;
          token: string | null;
          status: string;
          last_renewed_at: string | null;
          renewal_error: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_connection_id: string;
          business_id?: string | null;
          channel_id: string;
          resource_id: string;
          resource_uri?: string | null;
          expiration_timestamp: string;
          token?: string | null;
          status?: string;
          last_renewed_at?: string | null;
          renewal_error?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['google_drive_watches']['Insert']>;
      };
      system_events: {
        Row: {
          id: string;
          organization_id: string | null;
          business_id: string | null;
          event_type: string;
          event_level: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          business_id?: string | null;
          event_type: string;
          event_level?: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['system_events']['Insert']>;
      };
      integration_sync_status: {
        Row: {
          id: string;
          organization_id: string;
          business_id: string | null;
          integration_type: string;
          status: string;
          records_processed: number;
          error_message: string | null;
          last_successful_sync: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          business_id?: string | null;
          integration_type: string;
          status?: string;
          records_processed?: number;
          error_message?: string | null;
          last_successful_sync?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['integration_sync_status']['Insert']>;
      };
    };
    Views: {
      brides: {
        Row: Database['public']['Tables']['customers']['Row'];
      };
      inventory_items: {
        Row: {
          id: string;
          business_id: string;
          vendor_name: string | null;
          style_number: string | null;
          base_price_cents: number;
          category: string | null;
          created_at: string;
        };
      };
      inventory_variants: {
        Row: {
          id: string;
          item_id: string;
          sku: string | null;
          size: string | null;
          color: string | null;
          stock: number;
          price_cents: number;
          created_at: string;
        };
      };
    };
    Functions: {
      user_has_role: {
        Args: {
          check_business_id: string;
          allowed_roles: string[];
        };
        Returns: boolean;
      };
    };
  };
}
