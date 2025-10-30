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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          page_context: string | null
          rating: number
          user_email: string | null
        }
        Insert: {
          created_at?: string
          feedback_text: string
          id?: string
          page_context?: string | null
          rating: number
          user_email?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          page_context?: string | null
          rating?: number
          user_email?: string | null
        }
        Relationships: []
      }
      fluxa_awards: {
        Row: {
          announced: boolean | null
          created_at: string | null
          fluxa_fan_id: string | null
          hot_topic_room_id: string | null
          id: string
          top_gister_id: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          announced?: boolean | null
          created_at?: string | null
          fluxa_fan_id?: string | null
          hot_topic_room_id?: string | null
          id?: string
          top_gister_id?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          announced?: boolean | null
          created_at?: string | null
          fluxa_fan_id?: string | null
          hot_topic_room_id?: string | null
          id?: string
          top_gister_id?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "fluxa_awards_hot_topic_room_id_fkey"
            columns: ["hot_topic_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxa_memory: {
        Row: {
          created_at: string | null
          favorite_topics: string[] | null
          gist_history: Json | null
          id: string
          last_active: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          favorite_topics?: string[] | null
          gist_history?: Json | null
          id?: string
          last_active?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          favorite_topics?: string[] | null
          gist_history?: Json | null
          id?: string
          last_active?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gists: {
        Row: {
          audio_url: string
          context: string
          created_at: string | null
          favorite_count: number | null
          headline: string
          id: string
          image_url: string | null
          meta: Json | null
          narration: string | null
          play_count: number | null
          published_at: string | null
          script: string
          source_url: string | null
          status: string | null
          topic: string
          topic_category: string | null
        }
        Insert: {
          audio_url: string
          context: string
          created_at?: string | null
          favorite_count?: number | null
          headline: string
          id?: string
          image_url?: string | null
          meta?: Json | null
          narration?: string | null
          play_count?: number | null
          published_at?: string | null
          script: string
          source_url?: string | null
          status?: string | null
          topic: string
          topic_category?: string | null
        }
        Update: {
          audio_url?: string
          context?: string
          created_at?: string | null
          favorite_count?: number | null
          headline?: string
          id?: string
          image_url?: string | null
          meta?: Json | null
          narration?: string | null
          play_count?: number | null
          published_at?: string | null
          script?: string
          source_url?: string | null
          status?: string | null
          topic?: string
          topic_category?: string | null
        }
        Relationships: []
      }
      live_participants: {
        Row: {
          hand_raised: boolean | null
          id: string
          is_speaking: boolean | null
          joined_at: string | null
          role: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          hand_raised?: boolean | null
          id?: string
          is_speaking?: boolean | null
          joined_at?: string | null
          role?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          hand_raised?: boolean | null
          id?: string
          is_speaking?: boolean | null
          joined_at?: string | null
          role?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          chat_history: Json | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          host_id: string | null
          id: string
          participant_count: number | null
          replay_audio_url: string | null
          started_at: string | null
          status: string | null
          title: string
          topic: string
        }
        Insert: {
          chat_history?: Json | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          participant_count?: number | null
          replay_audio_url?: string | null
          started_at?: string | null
          status?: string | null
          title: string
          topic: string
        }
        Update: {
          chat_history?: Json | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          participant_count?: number | null
          replay_audio_url?: string | null
          started_at?: string | null
          status?: string | null
          title?: string
          topic?: string
        }
        Relationships: []
      }
      room_hosts: {
        Row: {
          created_at: string | null
          id: string
          role: string
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_hosts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_stats: {
        Row: {
          created_at: string | null
          date: string
          id: string
          revenue: number | null
          room_id: string | null
          session_length: number | null
          total_listeners: number | null
          total_reactions: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          revenue?: number | null
          room_id?: string | null
          session_length?: number | null
          total_listeners?: number | null
          total_reactions?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          revenue?: number | null
          room_id?: string | null
          session_length?: number | null
          total_listeners?: number | null
          total_reactions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_stats_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active_listeners: number | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          topic_category: string
        }
        Insert: {
          active_listeners?: number | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          topic_category: string
        }
        Update: {
          active_listeners?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          topic_category?: string
        }
        Relationships: []
      }
      sponsorships: {
        Row: {
          ad_copy: string
          brand_name: string
          created_at: string | null
          end_date: string
          id: string
          impressions: number | null
          room_id: string | null
          start_date: string
        }
        Insert: {
          ad_copy: string
          brand_name: string
          created_at?: string | null
          end_date: string
          id?: string
          impressions?: number | null
          room_id?: string | null
          start_date: string
        }
        Update: {
          ad_copy?: string
          brand_name?: string
          created_at?: string | null
          end_date?: string
          id?: string
          impressions?: number | null
          room_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorships_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          audio_url: string
          created_at: string
          duration: number | null
          expires_at: string | null
          gist_id: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration?: number | null
          expires_at?: string | null
          gist_id?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration?: number | null
          expires_at?: string | null
          gist_id?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_gist_id_fkey"
            columns: ["gist_id"]
            isOneToOne: false
            referencedRelation: "gists"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_conversations: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          gist_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          gist_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          gist_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_gist_id_fkey"
            columns: ["gist_id"]
            isOneToOne: false
            referencedRelation: "gists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string | null
          id: string
          interest: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interest?: string
          user_id?: string | null
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
      user_vip: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          user_id: string
          vip_status: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          user_id: string
          vip_status?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          user_id?: string
          vip_status?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
