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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_accounts: {
        Row: {
          account_type: string | null
          activation_code: string | null
          balance: number | null
          balance_sar: number | null
          balance_usd: number | null
          balance_yer: number | null
          created_at: string
          currency: string | null
          id: string
          is_activated: boolean | null
          is_admin: boolean | null
          name: string
          password_hash: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          account_type?: string | null
          activation_code?: string | null
          balance?: number | null
          balance_sar?: number | null
          balance_usd?: number | null
          balance_yer?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          is_activated?: boolean | null
          is_admin?: boolean | null
          name: string
          password_hash: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          account_type?: string | null
          activation_code?: string | null
          balance?: number | null
          balance_sar?: number | null
          balance_usd?: number | null
          balance_yer?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          is_activated?: boolean | null
          is_admin?: boolean | null
          name?: string
          password_hash?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          account_type: string | null
          created_at: string
          currency: string | null
          customer_id: string
          end_date: string
          id: string
          price: number
          service_name: string
          slot_id: string | null
          start_date: string
          status: string | null
          subscription_type: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          created_at?: string
          currency?: string | null
          customer_id: string
          end_date: string
          id?: string
          price?: number
          service_name: string
          slot_id?: string | null
          start_date?: string
          status?: string | null
          subscription_type?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string
          end_date?: string
          id?: string
          price?: number
          service_name?: string
          slot_id?: string | null
          start_date?: string
          status?: string | null
          subscription_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "service_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_requests: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          status: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          status?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          status?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_accounts: {
        Row: {
          account_type: string
          created_at: string
          id: string
          name: string | null
          service_id: string
          subscriber_customer_id: string | null
          subscriber_email: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          id?: string
          name?: string | null
          service_id: string
          subscriber_customer_id?: string | null
          subscriber_email?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          id?: string
          name?: string | null
          service_id?: string
          subscriber_customer_id?: string | null
          subscriber_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_accounts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_accounts_subscriber_customer_id_fkey"
            columns: ["subscriber_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_id: string
          id: string
          period_days: number
          period_name: string
          price: number
          service_id: string
          service_name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id: string
          id?: string
          period_days: number
          period_name: string
          price?: number
          service_id: string
          service_name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id?: string
          id?: string
          period_days?: number
          period_name?: string
          price?: number
          service_id?: string
          service_name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_slots: {
        Row: {
          account_id: string
          assigned_at: string | null
          assigned_customer_id: string | null
          assigned_subscription_id: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          is_available: boolean
          password: string | null
          slot_name: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          assigned_at?: string | null
          assigned_customer_id?: string | null
          assigned_subscription_id?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean
          password?: string | null
          slot_name?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          assigned_at?: string | null
          assigned_customer_id?: string | null
          assigned_subscription_id?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          is_available?: boolean
          password?: string | null
          slot_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_slots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "service_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_slots_assigned_customer_id_fkey"
            columns: ["assigned_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_slots_assigned_subscription_id_fkey"
            columns: ["assigned_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          default_type: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          pricing: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_type?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          pricing?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_type?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          pricing?: Json
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          priority: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          message_type: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "customer"],
    },
  },
} as const
