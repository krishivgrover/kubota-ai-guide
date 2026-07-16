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
      dealers: {
        Row: {
          address: string | null
          city: string
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          region: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          region: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          page: number | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          page?: number | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          page?: number | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          error: string | null
          id: string
          page_count: number | null
          source_type: string
          status: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          page_count?: number | null
          source_type?: string
          status?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          page_count?: number | null
          source_type?: string
          status?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      maintenance_schedules: {
        Row: {
          category: string
          created_at: string
          id: string
          interval_hours: number
          notes: string | null
          task: string
          tractor_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          interval_hours: number
          notes?: string | null
          task: string
          tractor_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          interval_hours?: number
          notes?: string | null
          task?: string
          tractor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dealer_code: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: Database["public"]["Enums"]["app_language"]
          region: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dealer_code?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: Database["public"]["Enums"]["app_language"]
          region?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dealer_code?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: Database["public"]["Enums"]["app_language"]
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_appointment_updates: {
        Row: {
          appointment_id: string
          author_id: string | null
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          appointment_id: string
          author_id?: string | null
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          appointment_id?: string
          author_id?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "service_appointment_updates_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "service_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      service_appointments: {
        Row: {
          address: string | null
          created_at: string
          customer_id: string
          dealer_id: string | null
          engineer_id: string | null
          id: string
          notes: string | null
          scheduled_at: string
          serial_number: string | null
          service_type: string
          status: Database["public"]["Enums"]["appointment_status"]
          tractor_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id: string
          dealer_id?: string | null
          engineer_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          serial_number?: string | null
          service_type: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tractor_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: string
          dealer_id?: string | null
          engineer_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          serial_number?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tractor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_appointments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_appointments_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_priority: Database["public"]["Enums"]["ticket_priority"] | null
          ai_summary: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          customer_id: string
          dealer_id: string | null
          description: string
          engineer_id: string | null
          id: string
          location: string | null
          model: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          serial_no: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_no: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_priority?: Database["public"]["Enums"]["ticket_priority"] | null
          ai_summary?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          customer_id: string
          dealer_id?: string | null
          description: string
          engineer_id?: string | null
          id?: string
          location?: string | null
          model?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          serial_no?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_no?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_priority?: Database["public"]["Enums"]["ticket_priority"] | null
          ai_summary?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          customer_id?: string
          dealer_id?: string | null
          description?: string
          engineer_id?: string | null
          id?: string
          location?: string | null
          model?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          serial_no?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_no?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tractors: {
        Row: {
          brand: string
          created_at: string
          description: string | null
          fuel_type: string
          hp: number
          id: string
          image_url: string | null
          model: string
          price_inr: number | null
          updated_at: string
          use_cases: string[]
        }
        Insert: {
          brand: string
          created_at?: string
          description?: string | null
          fuel_type?: string
          hp: number
          id?: string
          image_url?: string | null
          model: string
          price_inr?: number | null
          updated_at?: string
          use_cases?: string[]
        }
        Update: {
          brand?: string
          created_at?: string
          description?: string | null
          fuel_type?: string
          hp?: number
          id?: string
          image_url?: string | null
          model?: string
          price_inr?: number | null
          updated_at?: string
          use_cases?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warranties: {
        Row: {
          coverage: string | null
          created_at: string
          customer_id: string
          id: string
          purchase_date: string
          serial_number: string
          tractor_id: string | null
          updated_at: string
          warranty_end: string
        }
        Insert: {
          coverage?: string | null
          created_at?: string
          customer_id: string
          id?: string
          purchase_date: string
          serial_number: string
          tractor_id?: string | null
          updated_at?: string
          warranty_end: string
        }
        Update: {
          coverage?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          purchase_date?: string
          serial_number?: string
          tractor_id?: string | null
          updated_at?: string
          warranty_end?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranties_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "tractors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_ticket: {
        Args: { _ticket_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_document_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          page: number
          similarity: number
        }[]
      }
    }
    Enums: {
      app_language: "en" | "hi"
      app_role: "customer" | "dealer" | "service_engineer" | "admin"
      appointment_status:
        | "requested"
        | "confirmed"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      ticket_category:
        | "engine"
        | "hydraulics"
        | "electrical"
        | "transmission"
        | "body"
        | "implement"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status:
        | "open"
        | "triaged"
        | "assigned"
        | "in_progress"
        | "resolved"
        | "closed"
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
      app_language: ["en", "hi"],
      app_role: ["customer", "dealer", "service_engineer", "admin"],
      appointment_status: [
        "requested",
        "confirmed",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      ticket_category: [
        "engine",
        "hydraulics",
        "electrical",
        "transmission",
        "body",
        "implement",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: [
        "open",
        "triaged",
        "assigned",
        "in_progress",
        "resolved",
        "closed",
      ],
    },
  },
} as const
