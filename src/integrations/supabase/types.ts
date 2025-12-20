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
      announcement_categories: {
        Row: {
          color: string
          created_at: string | null
          icon: string | null
          id: string
          name: string
          server_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          server_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_categories_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          author_id: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
        }
        Insert: {
          announcement_id: string
          author_id?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Update: {
          announcement_id?: string
          author_id?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string | null
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string | null
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string | null
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          banner_url: string | null
          category_id: string | null
          channel_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          featured: boolean | null
          id: string
          pinned: boolean | null
          title: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          banner_url?: string | null
          category_id?: string | null
          channel_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          featured?: boolean | null
          id?: string
          pinned?: boolean | null
          title: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          banner_url?: string | null
          category_id?: string | null
          channel_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          featured?: boolean | null
          id?: string
          pinned?: boolean | null
          title?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "announcement_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          server_id: string
          target_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          server_id: string
          target_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          server_id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      category_permission_overrides: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          permission: Database["public"]["Enums"]["server_permission"]
          role_id: string | null
          type: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          permission: Database["public"]["Enums"]["server_permission"]
          role_id?: string | null
          type: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["server_permission"]
          role_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_permission_overrides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_permission_overrides_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_followers: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          source_channel_id: string
          target_channel_id: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          source_channel_id: string
          target_channel_id: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          source_channel_id?: string
          target_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_followers_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_followers_source_channel_id_fkey"
            columns: ["source_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_followers_target_channel_id_fkey"
            columns: ["target_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
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
      channel_summaries: {
        Row: {
          channel_id: string
          created_at: string | null
          end_message_id: string | null
          id: string
          message_count: number | null
          participants: string[] | null
          start_message_id: string | null
          summary: string
          title: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          end_message_id?: string | null
          id?: string
          message_count?: number | null
          participants?: string[] | null
          start_message_id?: string | null
          summary: string
          title: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          end_message_id?: string | null
          id?: string
          message_count?: number | null
          participants?: string[] | null
          start_message_id?: string | null
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_summaries_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_summaries_end_message_id_fkey"
            columns: ["end_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_summaries_start_message_id_fkey"
            columns: ["start_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          edited_at: string | null
          id: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
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
          is_published_message: boolean | null
          original_message_id: string | null
          publish_dismissed: boolean | null
          source_channel_name: string | null
          source_server_icon: string | null
          source_server_id: string | null
          source_server_name: string | null
          target_user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          channel_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_published_message?: boolean | null
          original_message_id?: string | null
          publish_dismissed?: boolean | null
          source_channel_name?: string | null
          source_server_icon?: string | null
          source_server_id?: string | null
          source_server_name?: string | null
          target_user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          channel_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_published_message?: boolean | null
          original_message_id?: string | null
          publish_dismissed?: boolean | null
          source_channel_name?: string | null
          source_server_icon?: string | null
          source_server_id?: string | null
          source_server_name?: string | null
          target_user_id?: string | null
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
          {
            foreignKeyName: "messages_original_message_id_fkey"
            columns: ["original_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_source_server_id_fkey"
            columns: ["source_server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      poll_options: {
        Row: {
          emoji: string | null
          id: string
          poll_id: string
          position: number
          text: string
        }
        Insert: {
          emoji?: string | null
          id?: string
          poll_id: string
          position?: number
          text: string
        }
        Update: {
          emoji?: string | null
          id?: string
          poll_id?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          author_id: string | null
          channel_id: string
          created_at: string
          expires_at: string | null
          id: string
          question: string
          thread_id: string | null
        }
        Insert: {
          allow_multiple?: boolean
          author_id?: string | null
          channel_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          question: string
          thread_id?: string | null
        }
        Update: {
          allow_multiple?: boolean
          author_id?: string | null
          channel_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          question?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_text: string | null
          activity_type: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          custom_status: string | null
          display_name: string
          id: string
          pronouns: string | null
          server_order: string[] | null
          status: Database["public"]["Enums"]["user_status"] | null
          theme_color: string | null
          theme_gradient: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          activity_text?: string | null
          activity_type?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name: string
          id: string
          pronouns?: string | null
          server_order?: string[] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          theme_color?: string | null
          theme_gradient?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          activity_text?: string | null
          activity_type?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_status?: string | null
          display_name?: string
          id?: string
          pronouns?: string | null
          server_order?: string[] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          theme_color?: string | null
          theme_gradient?: string | null
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
          description: string | null
          hoist: boolean | null
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
          description?: string | null
          hoist?: boolean | null
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
          description?: string | null
          hoist?: boolean | null
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
      server_emojis: {
        Row: {
          created_at: string | null
          creator_id: string | null
          id: string
          name: string
          server_id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          name: string
          server_id: string
          url: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          name?: string
          server_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_emojis_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_expanded: boolean | null
          name: string | null
          position: number
          server_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_expanded?: boolean | null
          name?: string | null
          position?: number
          server_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_expanded?: boolean | null
          name?: string | null
          position?: number
          server_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      server_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          recipient_id: string
          responded_at: string | null
          sender_id: string | null
          server_id: string
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          recipient_id: string
          responded_at?: string | null
          sender_id?: string | null
          server_id: string
          status?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string | null
          server_id?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_notifications_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_read_states: {
        Row: {
          id: string
          last_read_at: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_read_states_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_read_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      server_settings: {
        Row: {
          activity_channel_id: string | null
          activity_feed_enabled: boolean | null
          auto_assign_roles: string[] | null
          boost_channel_id: string | null
          boost_message_enabled: boolean | null
          created_at: string | null
          id: string
          server_id: string
          setup_tips_enabled: boolean | null
          sticker_channel_id: string | null
          sticker_reply_enabled: boolean | null
          system_channel_id: string | null
          system_messages_enabled: boolean | null
          tips_channel_id: string | null
          updated_at: string | null
          welcome_channel_id: string | null
          welcome_message: string | null
        }
        Insert: {
          activity_channel_id?: string | null
          activity_feed_enabled?: boolean | null
          auto_assign_roles?: string[] | null
          boost_channel_id?: string | null
          boost_message_enabled?: boolean | null
          created_at?: string | null
          id?: string
          server_id: string
          setup_tips_enabled?: boolean | null
          sticker_channel_id?: string | null
          sticker_reply_enabled?: boolean | null
          system_channel_id?: string | null
          system_messages_enabled?: boolean | null
          tips_channel_id?: string | null
          updated_at?: string | null
          welcome_channel_id?: string | null
          welcome_message?: string | null
        }
        Update: {
          activity_channel_id?: string | null
          activity_feed_enabled?: boolean | null
          auto_assign_roles?: string[] | null
          boost_channel_id?: string | null
          boost_message_enabled?: boolean | null
          created_at?: string | null
          id?: string
          server_id?: string
          setup_tips_enabled?: boolean | null
          sticker_channel_id?: string | null
          sticker_reply_enabled?: boolean | null
          system_channel_id?: string | null
          system_messages_enabled?: boolean | null
          tips_channel_id?: string | null
          updated_at?: string | null
          welcome_channel_id?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_settings_activity_channel_id_fkey"
            columns: ["activity_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_settings_boost_channel_id_fkey"
            columns: ["boost_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_settings_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: true
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_settings_sticker_channel_id_fkey"
            columns: ["sticker_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_settings_system_channel_id_fkey"
            columns: ["system_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_settings_tips_channel_id_fkey"
            columns: ["tips_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
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
      server_stickers: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          name: string
          server_id: string
          url: string
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          name: string
          server_id: string
          url: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          name?: string
          server_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_stickers_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
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
          secondary_owner_id: string | null
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
          secondary_owner_id?: string | null
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
          secondary_owner_id?: string | null
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
          {
            foreignKeyName: "servers_secondary_owner_id_fkey"
            columns: ["secondary_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_hand_requests: {
        Row: {
          created_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_hand_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_hand_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stage_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_hand_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_participants: {
        Row: {
          id: string
          is_muted: boolean | null
          is_video_on: boolean | null
          joined_at: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean | null
          is_video_on?: boolean | null
          joined_at?: string | null
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean | null
          is_video_on?: boolean | null
          joined_at?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stage_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_sessions: {
        Row: {
          channel_id: string
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          started_at: string | null
          started_by: string | null
          status: string
          title: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_followers: {
        Row: {
          created_at: string | null
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_followers_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          attachments: Json | null
          author_id: string | null
          content: string
          created_at: string
          edited_at: string | null
          id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_read_states: {
        Row: {
          id: string
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_read_states_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          archived: boolean
          archived_at: string | null
          channel_id: string
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          message_id: string | null
          name: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          channel_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          message_id?: string | null
          name: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          channel_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          message_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          thread_id: string | null
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          conversation_id?: string | null
          id?: string
          started_at?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string | null
          conversation_id?: string | null
          id?: string
          started_at?: string | null
          thread_id?: string | null
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
            foreignKeyName: "typing_indicators_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
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
      user_channel_settings: {
        Row: {
          category_id: string | null
          channel_id: string | null
          created_at: string | null
          id: string
          mute_until: string | null
          muted: boolean | null
          notification_setting: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          channel_id?: string | null
          created_at?: string | null
          id?: string
          mute_until?: string | null
          muted?: boolean | null
          notification_setting?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          channel_id?: string | null
          created_at?: string | null
          id?: string
          mute_until?: string | null
          muted?: boolean | null
          notification_setting?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_channel_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_channel_settings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_summary_likes: {
        Row: {
          created_at: string | null
          id: string
          summary_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          summary_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          summary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_summary_likes_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "channel_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_summary_reads: {
        Row: {
          id: string
          read_at: string | null
          summary_id: string
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string | null
          summary_id: string
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string | null
          summary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_summary_reads_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "channel_summaries"
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
          muted_by: string | null
          server_deafened: boolean | null
          server_muted: boolean | null
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
          muted_by?: string | null
          server_deafened?: boolean | null
          server_muted?: boolean | null
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
          muted_by?: string | null
          server_deafened?: boolean | null
          server_muted?: boolean | null
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
            foreignKeyName: "voice_states_muted_by_fkey"
            columns: ["muted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      voice_user_settings: {
        Row: {
          created_at: string | null
          id: string
          target_user_id: string
          user_id: string
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_user_id: string
          user_id: string
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          target_user_id?: string
          user_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_user_settings_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_user_settings_user_id_fkey"
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
      check_username_availability: {
        Args: { p_username: string }
        Returns: boolean
      }
      cleanup_old_typing_indicators: { Args: never; Returns: undefined }
      cleanup_old_voice_signals: { Args: never; Returns: undefined }
      create_dm_conversation: {
        Args: { p_other_user_id?: string }
        Returns: string
      }
      delete_server_as_owner: { Args: { _server_id: string }; Returns: boolean }
      find_user_for_friend_request: {
        Args: { target_username: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
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
      get_friendship_profiles: {
        Args: { friendship_user_ids: string[] }
        Returns: {
          avatar_url: string
          custom_status: string
          display_name: string
          id: string
          status: string
          username: string
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
      get_user_channel_permissions: {
        Args: { _channel_id: string; _user_id: string }
        Returns: {
          granted: boolean
          permission: Database["public"]["Enums"]["server_permission"]
        }[]
      }
      has_channel_permission: {
        Args: {
          _channel_id: string
          _permission: Database["public"]["Enums"]["server_permission"]
          _user_id: string
        }
        Returns: boolean
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
      is_server_owner_or_secondary: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      kick_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: undefined
      }
      remove_secondary_owner: {
        Args: { _server_id: string }
        Returns: undefined
      }
      request_server_deletion: {
        Args: { _server_id: string }
        Returns: boolean
      }
      respond_to_deletion_request: {
        Args: { _accept: boolean; _notification_id: string }
        Returns: boolean
      }
      server_deafen_participant: {
        Args: {
          _channel_id: string
          _deafened: boolean
          _target_user_id: string
        }
        Returns: undefined
      }
      server_mute_participant: {
        Args: { _channel_id: string; _muted: boolean; _target_user_id: string }
        Returns: undefined
      }
      set_secondary_owner: {
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
      transfer_server_ownership: {
        Args: { _new_owner_id: string; _server_id: string }
        Returns: undefined
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
        | "stage"
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
        | "stream"
        | "use_vad"
        | "priority_speaker"
        | "mute_members"
        | "deafen_members"
        | "move_members"
        | "request_to_speak"
        | "send_posts"
        | "manage_threads"
        | "manage_events"
        | "manage_tasks"
        | "use_soundboard"
        | "use_external_stickers"
        | "view_channel"
        | "create_instant_invite"
        | "change_nickname"
        | "manage_nicknames"
        | "manage_emojis"
        | "manage_stickers"
        | "view_audit_log"
        | "view_server_insights"
        | "manage_webhooks"
        | "manage_guild_expressions"
        | "add_reactions"
        | "use_slash_commands"
        | "use_external_emojis"
        | "embed_links"
        | "attach_files"
        | "read_message_history"
        | "send_tts_messages"
        | "use_application_commands"
        | "send_voice_messages"
        | "create_public_threads"
        | "create_private_threads"
        | "send_messages_in_threads"
        | "video"
        | "use_external_sounds"
        | "use_voice_activity"
        | "use_embedded_activities"
        | "start_embedded_activities"
        | "moderate_stage"
        | "become_speaker"
        | "start_stage_session"
        | "end_stage_session"
        | "invite_stage_speaker"
        | "create_forum_posts"
        | "manage_forum_posts"
        | "pin_forum_posts"
        | "archive_forum_posts"
        | "lock_forum_posts"
        | "add_forum_tags"
        | "manage_forum_tags"
        | "moderate_forum"
        | "publish_messages"
        | "manage_announcements"
        | "follow_announcements"
        | "create_announcements"
        | "edit_announcements"
        | "delete_announcements"
        | "pin_announcements"
        | "feature_announcements"
        | "moderate_announcements"
        | "view_announcement_analytics"
        | "upload_media"
        | "download_media"
        | "manage_media"
        | "create_albums"
        | "delete_albums"
        | "organize_media"
        | "tag_media"
        | "share_media"
        | "moderate_media"
        | "view_media_analytics"
        | "view_events"
        | "create_events"
        | "edit_events"
        | "delete_events"
        | "rsvp_events"
        | "invite_to_events"
        | "manage_event_rsvps"
        | "create_recurring_events"
        | "moderate_events"
        | "view_tasks"
        | "create_tasks"
        | "edit_tasks"
        | "delete_tasks"
        | "assign_tasks"
        | "complete_tasks"
        | "reopen_tasks"
        | "create_task_lists"
        | "manage_task_lists"
        | "create_polls"
        | "vote_in_polls"
        | "manage_polls"
        | "view_poll_results"
        | "end_polls"
        | "edit_polls"
        | "delete_polls"
        | "create_anonymous_polls"
        | "view_poll_voters"
        | "moderate_polls"
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
        "stage",
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
        "stream",
        "use_vad",
        "priority_speaker",
        "mute_members",
        "deafen_members",
        "move_members",
        "request_to_speak",
        "send_posts",
        "manage_threads",
        "manage_events",
        "manage_tasks",
        "use_soundboard",
        "use_external_stickers",
        "view_channel",
        "create_instant_invite",
        "change_nickname",
        "manage_nicknames",
        "manage_emojis",
        "manage_stickers",
        "view_audit_log",
        "view_server_insights",
        "manage_webhooks",
        "manage_guild_expressions",
        "add_reactions",
        "use_slash_commands",
        "use_external_emojis",
        "embed_links",
        "attach_files",
        "read_message_history",
        "send_tts_messages",
        "use_application_commands",
        "send_voice_messages",
        "create_public_threads",
        "create_private_threads",
        "send_messages_in_threads",
        "video",
        "use_external_sounds",
        "use_voice_activity",
        "use_embedded_activities",
        "start_embedded_activities",
        "moderate_stage",
        "become_speaker",
        "start_stage_session",
        "end_stage_session",
        "invite_stage_speaker",
        "create_forum_posts",
        "manage_forum_posts",
        "pin_forum_posts",
        "archive_forum_posts",
        "lock_forum_posts",
        "add_forum_tags",
        "manage_forum_tags",
        "moderate_forum",
        "publish_messages",
        "manage_announcements",
        "follow_announcements",
        "create_announcements",
        "edit_announcements",
        "delete_announcements",
        "pin_announcements",
        "feature_announcements",
        "moderate_announcements",
        "view_announcement_analytics",
        "upload_media",
        "download_media",
        "manage_media",
        "create_albums",
        "delete_albums",
        "organize_media",
        "tag_media",
        "share_media",
        "moderate_media",
        "view_media_analytics",
        "view_events",
        "create_events",
        "edit_events",
        "delete_events",
        "rsvp_events",
        "invite_to_events",
        "manage_event_rsvps",
        "create_recurring_events",
        "moderate_events",
        "view_tasks",
        "create_tasks",
        "edit_tasks",
        "delete_tasks",
        "assign_tasks",
        "complete_tasks",
        "reopen_tasks",
        "create_task_lists",
        "manage_task_lists",
        "create_polls",
        "vote_in_polls",
        "manage_polls",
        "view_poll_results",
        "end_polls",
        "edit_polls",
        "delete_polls",
        "create_anonymous_polls",
        "view_poll_voters",
        "moderate_polls",
      ],
      user_status: ["online", "idle", "dnd", "offline"],
    },
  },
} as const
