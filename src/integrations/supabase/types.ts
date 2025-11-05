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
      fan_entities: {
        Row: {
          achievements: Json | null
          api_id: string | null
          api_source: string | null
          background_url: string | null
          bio: string | null
          category: Database["public"]["Enums"]["fan_entity_category"]
          created_at: string | null
          current_match: Json | null
          id: string
          last_match: Json | null
          logo_url: string | null
          name: string
          news_feed: Json | null
          next_match: Json | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          stats: Json | null
          upcoming_events: Json | null
          updated_at: string | null
        }
        Insert: {
          achievements?: Json | null
          api_id?: string | null
          api_source?: string | null
          background_url?: string | null
          bio?: string | null
          category: Database["public"]["Enums"]["fan_entity_category"]
          created_at?: string | null
          current_match?: Json | null
          id?: string
          last_match?: Json | null
          logo_url?: string | null
          name: string
          news_feed?: Json | null
          next_match?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          stats?: Json | null
          upcoming_events?: Json | null
          updated_at?: string | null
        }
        Update: {
          achievements?: Json | null
          api_id?: string | null
          api_source?: string | null
          background_url?: string | null
          bio?: string | null
          category?: Database["public"]["Enums"]["fan_entity_category"]
          created_at?: string | null
          current_match?: Json | null
          id?: string
          last_match?: Json | null
          logo_url?: string | null
          name?: string
          news_feed?: Json | null
          next_match?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          stats?: Json | null
          upcoming_events?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fan_entity_stats: {
        Row: {
          entity_id: string
          id: string
          stat_type: string
          stat_value: Json
          updated_at: string | null
        }
        Insert: {
          entity_id: string
          id?: string
          stat_type: string
          stat_value: Json
          updated_at?: string | null
        }
        Update: {
          entity_id?: string
          id?: string
          stat_type?: string
          stat_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fan_entity_stats_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "fan_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_follows: {
        Row: {
          created_at: string | null
          entity_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_follows_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "fan_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_posts: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          id: string
          media_url: string | null
          reaction_count: number | null
          reactions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          id?: string
          media_url?: string | null
          reaction_count?: number | null
          reactions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          id?: string
          media_url?: string | null
          reaction_count?: number | null
          reactions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_posts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "fan_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fanbase_threads: {
        Row: {
          audio_url: string | null
          category: string
          created_at: string
          id: string
          post: string
          reactions: Json | null
          topic_name: string
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          category: string
          created_at?: string
          id?: string
          post: string
          reactions?: Json | null
          topic_name: string
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          category?: string
          created_at?: string
          id?: string
          post?: string
          reactions?: Json | null
          topic_name?: string
          user_id?: string | null
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
      fluxa_health_log: {
        Row: {
          component: string
          created_at: string | null
          details: Json | null
          id: string
          status: string
          timestamp: string
        }
        Insert: {
          component: string
          created_at?: string | null
          details?: Json | null
          id?: string
          status: string
          timestamp?: string
        }
        Update: {
          component?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      fluxa_lines: {
        Row: {
          category: string
          created_at: string | null
          id: string
          line: string
          mood: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          line: string
          mood: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          line?: string
          mood?: string
        }
        Relationships: []
      }
      fluxa_memory: {
        Row: {
          created_at: string | null
          favorite_topics: string[] | null
          gist_history: Json | null
          id: string
          last_active: string | null
          last_gist_played: string | null
          name: string | null
          preferred_time: string | null
          streak_count: number | null
          updated_at: string | null
          user_id: string | null
          visit_count: number | null
        }
        Insert: {
          created_at?: string | null
          favorite_topics?: string[] | null
          gist_history?: Json | null
          id?: string
          last_active?: string | null
          last_gist_played?: string | null
          name?: string | null
          preferred_time?: string | null
          streak_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          visit_count?: number | null
        }
        Update: {
          created_at?: string | null
          favorite_topics?: string[] | null
          gist_history?: Json | null
          id?: string
          last_active?: string | null
          last_gist_played?: string | null
          name?: string | null
          preferred_time?: string | null
          streak_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          visit_count?: number | null
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
          news_published_at: string | null
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
          news_published_at?: string | null
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
          news_published_at?: string | null
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
      match_results: {
        Row: {
          created_at: string
          id: string
          league: string
          match_date: string
          match_id: string
          score_away: number | null
          score_home: number | null
          status: string
          team_away: string
          team_home: string
        }
        Insert: {
          created_at?: string
          id?: string
          league: string
          match_date: string
          match_id: string
          score_away?: number | null
          score_home?: number | null
          status: string
          team_away: string
          team_home: string
        }
        Update: {
          created_at?: string
          id?: string
          league?: string
          match_date?: string
          match_id?: string
          score_away?: number | null
          score_home?: number | null
          status?: string
          team_away?: string
          team_home?: string
        }
        Relationships: []
      }
      raw_trends: {
        Row: {
          category: string
          created_at: string | null
          id: string
          popularity_score: number | null
          processed: boolean | null
          published_at: string | null
          source: string
          title: string
          url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          popularity_score?: number | null
          processed?: boolean | null
          published_at?: string | null
          source: string
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          popularity_score?: number | null
          processed?: boolean | null
          published_at?: string | null
          source?: string
          title?: string
          url?: string | null
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
      sports_fan_reactions: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          reaction: string
          team: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          reaction: string
          team: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          reaction?: string
          team?: string
          user_id?: string
        }
        Relationships: []
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
      user_subniches: {
        Row: {
          created_at: string
          id: string
          main_topic: string
          sub_niches: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_topic: string
          sub_niches?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_topic?: string
          sub_niches?: string[]
          user_id?: string
        }
        Relationships: []
      }
      user_teams: {
        Row: {
          created_at: string
          favorite_teams: string[] | null
          id: string
          rival_teams: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite_teams?: string[] | null
          id?: string
          rival_teams?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          favorite_teams?: string[] | null
          id?: string
          rival_teams?: string[] | null
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
      get_favorite_category: { Args: { user_uuid: string }; Returns: string }
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
      fan_entity_category: "sports" | "music" | "culture"
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
      fan_entity_category: ["sports", "music", "culture"],
    },
  },
} as const
