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
      gd_ai_messages: {
        Row: {
          content: string
          created_at: string | null
          id: number
          role: string
          session_id: string
          source: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          role: string
          session_id: string
          source?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          role?: string
          session_id?: string
          source?: string | null
        }
        Relationships: []
      }
      gd_ai_sessions: {
        Row: {
          blocked_until: string | null
          introduced: boolean | null
          last_updated: string | null
          recent_timestamps: Json | null
          session_id: string
          strikes: number | null
          total_messages: number | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          blocked_until?: string | null
          introduced?: boolean | null
          last_updated?: string | null
          recent_timestamps?: Json | null
          session_id: string
          strikes?: number | null
          total_messages?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          blocked_until?: string | null
          introduced?: boolean | null
          last_updated?: string | null
          recent_timestamps?: Json | null
          session_id?: string
          strikes?: number | null
          total_messages?: number | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      gd_knowledge_base: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: number
          source: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: never
          source: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: never
          source?: string
        }
        Relationships: []
      }
      gd_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          intent_note: string
          session_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          intent_note: string
          session_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          intent_note?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gd_leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_ai_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      gd_notification_outbox: {
        Row: {
          attempts: number
          created_at: string
          email: string | null
          id: string
          sent_at: string | null
          session_id: string
          summary: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email?: string | null
          id?: string
          sent_at?: string | null
          session_id: string
          summary: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string | null
          id?: string
          sent_at?: string | null
          session_id?: string
          summary?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gd_notification_outbox_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gd_ai_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_gdx_chat_turn: {
        Args: {
          p_is_policy_violation: boolean
          p_message: string
          p_session_id: string
        }
        Returns: {
          status: string
        }[]
      }
      complete_gdx_chat_turn: {
        Args: {
          p_assistant_message: string
          p_create_notification: boolean
          p_intent_note: string
          p_lead_email: string
          p_mark_introduced: boolean
          p_session_id: string
        }
        Returns: {
          notification_id: string
        }[]
      }
      get_session_info: {
        Args: { p_session_id: string }
        Returns: {
          introduced: boolean
          last_updated: string
          session_id: string
          total_messages: number
          user_name: string
        }[]
      }
      get_session_messages: {
        Args: { p_session_id: string }
        Returns: {
          content: string
          created_at: string
          id: number
          role: string
          source: string
        }[]
      }
      insert_session_message: {
        Args: {
          p_content: string
          p_role: string
          p_session_id: string
          p_source?: string
        }
        Returns: number
      }
      mark_gdx_notification_sent: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      match_knowledge_base: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: number
          similarity: number
          source: string
        }[]
      }
      match_user_messages: {
        Args: {
          p_match_count?: number
          p_query_embedding: string
          p_session_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: number
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
