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
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          position: number | null
          server_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          position?: number | null
          server_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          position?: number | null
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_permission_overrides: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          permission: Database["public"]["Enums"]["server_permission"]
          role_id: string | null
          sync_with_category: boolean | null
          type: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          permission: Database["public"]["Enums"]["server_permission"]
          role_id?: string | null
          sync_with_category?: boolean | null
          type: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["server_permission"]
          role_id?: string | null
          sync_with_category?: boolean | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_permission_overrides_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_permission_overrides_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          position: number | null
          server_id: string
          type: Database["public"]["Enums"]["channel_type"] | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          position?: number | null
          server_id: string
          type?: Database["public"]["Enums"]["channel_type"] | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: number | null
          server_id?: string
          type?: Database["public"]["Enums"]["channel_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_calls: {
        Row: {
          call_type: string
          conversation_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          initiator_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          call_type?: string
          conversation_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          initiator_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          call_type?: string
          conversation_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          initiator_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_calls_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_conversations: {
        Row: {
          created_at: string | null
          icon_url: string | null
          id: string
          is_group: boolean | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_group?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          attachments: Json | null
          author_id: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_read_states: {
        Row: {
          conversation_id: string
          id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_read_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_read_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: Database["public"]["Enums"]["friendship_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_permanent: boolean | null
          max_uses: number | null
          server_id: string
          uses: number | null
        }
        Insert: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_permanent?: boolean | null
          max_uses?: number | null
          server_id: string
          uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_permanent?: boolean | null
          max_uses?: number | null
          server_id?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          id: string
          member_id: string
          role_id: string
        }
        Insert: {
          id?: string
          member_id: string
          role_id: string
        }
        Update: {
          id?: string
          member_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "server_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          author_id: string | null
          channel_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          channel_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          channel_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          channel_id: string
          id: string
          message_id: string
          pinned_at: string | null
          pinned_by: string | null
        }
        Insert: {
          channel_id: string
          id?: string
          message_id: string
          pinned_at?: string | null
          pinned_by?: string | null
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string
          pinned_at?: string | null
          pinned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          custom_status: string | null
          display_name: string
          id: string
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name: string
          id: string
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name?: string
          id?: string
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission: Database["public"]["Enums"]["server_permission"]
          role_id: string
        }
        Insert: {
          id?: string
          permission: Database["public"]["Enums"]["server_permission"]
          role_id: string
        }
        Update: {
          id?: string
          permission?: Database["public"]["Enums"]["server_permission"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          color: string | null
          created_at: string | null
          icon_url: string | null
          id: string
          is_default: boolean | null
          name: string
          position: number | null
          server_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          position?: number | null
          server_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number | null
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_bans: {
        Row: {
          banned_by: string | null
          created_at: string | null
          id: string
          reason: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_bans_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      server_members: {
        Row: {
          id: string
          joined_at: string | null
          nickname: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          nickname?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          nickname?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      server_settings: {
        Row: {
          auto_assign_roles: string[] | null
          created_at: string | null
          id: string
          server_id: string
          system_messages_enabled: boolean | null
          updated_at: string | null
          welcome_channel_id: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_assign_roles?: string[] | null
          created_at?: string | null
          id?: string
          server_id: string
          system_messages_enabled?: boolean | null
          updated_at?: string | null
          welcome_channel_id?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_assign_roles?: string[] | null
          created_at?: string | null
          id?: string
          server_id?: string
          system_messages_enabled?: boolean | null
          updated_at?: string | null
          welcome_channel_id?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_settings_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: true
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_settings_welcome_channel_id_fkey"
            columns: ["welcome_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_public: boolean | null
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          channel_id: string | null
          conversation_id: string | null
          id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          conversation_id?: string | null
          id?: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string | null
          conversation_id?: string | null
          id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_signals: {
        Row: {
          channel_id: string
          created_at: string | null
          from_user_id: string
          id: string
          signal_data: Json
          signal_type: string
          to_user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          from_user_id: string
          id?: string
          signal_data: Json
          signal_type: string
          to_user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          signal_data?: Json
          signal_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_signals_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_signals_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_signals_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_states: {
        Row: {
          camera: boolean | null
          channel_id: string
          deafened: boolean | null
          id: string
          joined_at: string | null
          muted: boolean | null
          streaming: boolean | null
          user_id: string
        }
        Insert: {
          camera?: boolean | null
          channel_id: string
          deafened?: boolean | null
          id?: string
          joined_at?: string | null
          muted?: boolean | null
          streaming?: boolean | null
          user_id: string
        }
        Update: {
          camera?: boolean | null
          channel_id?: string
          deafened?: boolean | null
          id?: string
          joined_at?: string | null
          muted?: boolean | null
          streaming?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_states_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          avatar_url: string | null
          channel_id: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          token: string
        }
        Insert: {
          avatar_url?: string | null
          channel_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          token?: string
        }
        Update: {
          avatar_url?: string | null
          channel_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ban_member: {
        Args: { _reason?: string; _server_id: string; _user_id: string }
        Returns: undefined
      }
      can_view_webhook_token: {
        Args: { _user_id: string; _webhook_id: string }
        Returns: boolean
      }
      cleanup_old_typing_indicators: { Args: never; Returns: undefined }
      cleanup_old_voice_signals: { Args: never; Returns: undefined }
      create_dm_conversation: {
        Args: { p_other_user_id?: string }
        Returns: string
      }
      get_channel_webhooks: {
        Args: { _channel_id: string }
        Returns: {
          avatar_url: string
          channel_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          token: string
        }[]
      }
      get_invite_details: {
        Args: { invite_code: string }
        Returns: {
          expires_at: string
          id: string
          is_expired: boolean
          is_maxed: boolean
          max_uses: number
          member_count: number
          server_description: string
          server_icon_url: string
          server_id: string
          server_name: string
          uses: number
        }[]
      }
      has_dm_interaction: {
        Args: { _other_user_id: string; _user_id: string }
        Returns: boolean
      }
      has_server_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["server_permission"]
          _server_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_dm_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_friend_with: {
        Args: { _other_user_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_owner: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      kick_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: undefined
      }
      shares_dm_with: {
        Args: { _other_user_id: string; _user_id: string }
        Returns: boolean
      }
      shares_server_with: {
        Args: { _other_user_id: string; _user_id: string }
        Returns: boolean
      }
      unban_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: undefined
      }
      use_invite: { Args: { invite_code: string }; Returns: string }
    }
    Enums: {
      channel_type:
        | "text"
        | "voice"
        | "forum"
        | "announcement"
        | "media"
        | "calendar"
        | "tasks"
      friendship_status: "pending" | "accepted" | "blocked"
      server_permission:
        | "manage_server"
        | "manage_channels"
        | "manage_roles"
        | "kick_members"
        | "ban_members"
        | "manage_messages"
        | "send_messages"
        | "read_messages"
        | "connect_voice"
        | "speak_voice"
        | "mention_everyone"
        | "administrator"
      user_status: "online" | "idle" | "dnd" | "offline"
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
      channel_type: [
        "text",
        "voice",
        "forum",
        "announcement",
        "media",
        "calendar",
        "tasks",
      ],
      friendship_status: ["pending", "accepted", "blocked"],
      server_permission: [
        "manage_server",
        "manage_channels",
        "manage_roles",
        "kick_members",
        "ban_members",
        "manage_messages",
        "send_messages",
        "read_messages",
        "connect_voice",
        "speak_voice",
        "mention_everyone",
        "administrator",
      ],
      user_status: ["online", "idle", "dnd", "offline"],
    },
  },
} as const
