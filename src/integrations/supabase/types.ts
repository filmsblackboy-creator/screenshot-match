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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      diaper_sizes: {
        Row: {
          active: boolean
          brands: string | null
          code: string
          created_at: string
          description: string | null
          goal: number
          id: string
          image_url: string | null
          label: string
          reserved: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          brands?: string | null
          code: string
          created_at?: string
          description?: string | null
          goal?: number
          id?: string
          image_url?: string | null
          label: string
          reserved?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          brands?: string | null
          code?: string
          created_at?: string
          description?: string | null
          goal?: number
          id?: string
          image_url?: string | null
          label?: string
          reserved?: number
          sort_order?: number
        }
        Relationships: []
      }
      event_settings: {
        Row: {
          baby_name: string
          cover_image_url: string | null
          event_at: string | null
          family_info: string | null
          headline: string
          id: number
          location: string | null
          location_url: string | null
          primary_color: string | null
          thank_you_message: string
          updated_at: string
          welcome_message: string
        }
        Insert: {
          baby_name?: string
          cover_image_url?: string | null
          event_at?: string | null
          family_info?: string | null
          headline?: string
          id?: number
          location?: string | null
          location_url?: string | null
          primary_color?: string | null
          thank_you_message?: string
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          baby_name?: string
          cover_image_url?: string | null
          event_at?: string | null
          family_info?: string | null
          headline?: string
          id?: number
          location?: string | null
          location_url?: string | null
          primary_color?: string | null
          thank_you_message?: string
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          code: string
          created_at: string
          guest_name: string
          id: string
          is_demo: boolean
          message: string | null
          phone: string | null
          quantity: number
          request_id: string | null
          size_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          guest_name: string
          id?: string
          is_demo?: boolean
          message?: string | null
          phone?: string | null
          quantity: number
          request_id?: string | null
          size_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          guest_name?: string
          id?: string
          is_demo?: boolean
          message?: string | null
          phone?: string | null
          quantity?: number
          request_id?: string | null
          size_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "diaper_sizes"
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
      admin_exists: { Args: never; Returns: boolean }
      cancel_reservation_by_token: { Args: { _token: string }; Returns: Json }
      claim_first_admin: { Args: never; Returns: boolean }
      clear_demo_data: { Args: never; Returns: number }
      create_reservation: {
        Args: {
          _message: string
          _name: string
          _phone: string
          _quantity: number
          _request_id: string
          _size_id: string
        }
        Returns: Json
      }
      get_reservation_by_token: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_size_reserved: { Args: { _size: string }; Returns: undefined }
      update_reservation_by_token: {
        Args: {
          _message: string
          _name: string
          _phone: string
          _quantity: number
          _token: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin"
      reservation_status: "reservado" | "entregue" | "cancelado"
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
      app_role: ["admin"],
      reservation_status: ["reservado", "entregue", "cancelado"],
    },
  },
} as const
