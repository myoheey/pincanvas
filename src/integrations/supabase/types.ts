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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      canvas_shares: {
        Row: {
          canvas_id: string
          created_at: string
          id: string
          permission: string
          shared_by: string
          shared_with_email: string
        }
        Insert: {
          canvas_id: string
          created_at?: string
          id?: string
          permission: string
          shared_by: string
          shared_with_email: string
        }
        Update: {
          canvas_id?: string
          created_at?: string
          id?: string
          permission?: string
          shared_by?: string
          shared_with_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_shares_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
        ]
      }
      canvases: {
        Row: {
          allow_comments: boolean
          allow_likes: boolean
          background_color: string | null
          background_image_url: string | null
          background_type: string | null
          created_at: string
          id: string
          image_url: string | null
          is_public: boolean
          owner_id: string
          public_permission: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean
          allow_likes?: boolean
          background_color?: string | null
          background_image_url?: string | null
          background_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          owner_id: string
          public_permission?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean
          allow_likes?: boolean
          background_color?: string | null
          background_image_url?: string | null
          background_type?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          owner_id?: string
          public_permission?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_email: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          pin_id: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          pin_id: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          pin_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          canvas_id: string
          created_at: string
          drawing_data: Json
          id: string
          layer_id: string
          updated_at: string
        }
        Insert: {
          canvas_id: string
          created_at?: string
          drawing_data: Json
          id?: string
          layer_id: string
          updated_at?: string
        }
        Update: {
          canvas_id?: string
          created_at?: string
          drawing_data?: Json
          id?: string
          layer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      layers: {
        Row: {
          canvas_id: string
          color: string
          created_at: string
          id: string
          locked: boolean
          name: string
          visible: boolean
        }
        Insert: {
          canvas_id: string
          color: string
          created_at?: string
          id?: string
          locked?: boolean
          name: string
          visible?: boolean
        }
        Update: {
          canvas_id?: string
          color?: string
          created_at?: string
          id?: string
          locked?: boolean
          name?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "layers_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          author_email: string | null
          author_name: string
          created_at: string
          id: string
          pin_id: string
        }
        Insert: {
          author_email?: string | null
          author_name: string
          created_at?: string
          id?: string
          pin_id: string
        }
        Update: {
          author_email?: string | null
          author_name?: string
          created_at?: string
          id?: string
          pin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_at: string
          id: string
          name: string | null
          pin_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          pin_id: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          pin_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_items_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_templates: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_default: boolean
          is_public: boolean
          name: string
          shape: string
          size: string
          style: Json | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          is_public?: boolean
          name: string
          shape: string
          size?: string
          style?: Json | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          is_public?: boolean
          name?: string
          shape?: string
          size?: string
          style?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      pins: {
        Row: {
          canvas_id: string
          created_at: string
          description: string | null
          id: string
          layer_id: string
          template_id: string | null
          title: string
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          canvas_id: string
          created_at?: string
          description?: string | null
          id?: string
          layer_id: string
          template_id?: string | null
          title: string
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          canvas_id?: string
          created_at?: string
          description?: string | null
          id?: string
          layer_id?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "pins_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pins_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pins_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pin_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      secure_comments: {
        Row: {
          author_email: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          id: string | null
          pin_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_email?: never
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          pin_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_email?: never
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          pin_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_likes: {
        Row: {
          author_email: string | null
          author_name: string | null
          created_at: string | null
          id: string | null
          pin_id: string | null
        }
        Insert: {
          author_email?: never
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          pin_id?: string | null
        }
        Update: {
          author_email?: never
          author_name?: string | null
          created_at?: string | null
          id?: string | null
          pin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      user_can_see_emails_for_canvas: {
        Args: { canvas_id: string }
        Returns: boolean
      }
      user_has_canvas_access: {
        Args:
          | { canvas_id: string; user_email: string }
          | { canvas_id: string; user_id: string }
        Returns: boolean
      }
      user_has_canvas_access_with_permission: {
        Args: {
          canvas_id: string
          required_permission: string
          user_id: string
        }
        Returns: boolean
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
