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
  fitness: {
    Tables: {
      auth_handoffs: {
        Row: {
          audience: string
          binding_digest: string
          expires_at: string
          handoff_digest: string
          issuer: string
          return_to: string
        }
        Insert: {
          audience: string
          binding_digest: string
          expires_at: string
          handoff_digest: string
          issuer: string
          return_to: string
        }
        Update: {
          audience?: string
          binding_digest?: string
          expires_at?: string
          handoff_digest?: string
          issuer?: string
          return_to?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          billing_email: string | null
          created_at: string
          id: string
          latest_stripe_subscription_id: string | null
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          id?: string
          latest_stripe_subscription_id?: string | null
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          id?: string
          latest_stripe_subscription_id?: string | null
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_purchases: {
        Row: {
          amount_total: number | null
          billing_interval: string | null
          billing_interval_count: number | null
          completed_at: string | null
          created_at: string
          currency: string | null
          id: string
          period_end: string | null
          period_start: string | null
          purchase_kind: string
          raw_event_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_total?: number | null
          billing_interval?: string | null
          billing_interval_count?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          purchase_kind: string
          raw_event_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_total?: number | null
          billing_interval?: string | null
          billing_interval_count?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          purchase_kind?: string
          raw_event_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discord_feedback_reports: {
        Row: {
          area: string | null
          attachment_count: number
          attachment_metadata: Json | null
          attachment_pruned: boolean
          card_id: string | null
          card_phase: string | null
          card_priority: string | null
          closed_at: string | null
          completion_review_note: string | null
          completion_review_status: string
          completion_reviewed_at: string | null
          completion_reviewed_by_discord_user_id: string | null
          created_at: string
          dependency_notes: string | null
          depends_on: string[] | null
          details: string | null
          details_pruned: boolean
          discord_forum_applied_tag_ids: string[] | null
          discord_forum_channel_id: string | null
          discord_forum_message_id: string | null
          discord_forum_thread_id: string | null
          discord_forum_title: string | null
          discord_interaction_id: string | null
          duplicate_count: number
          duplicate_fingerprint: string | null
          effort_points: number | null
          first_seen_at: string
          id: string
          last_seen_at: string
          pruned_at: string | null
          report_type: string
          reporter_discord_user_id: string
          reporter_discord_username: string | null
          reporter_fitness_user_id: string | null
          reporter_member_number: number | null
          reporter_mentioned_at: string | null
          reporter_user_kind: string | null
          screenshot_url: string | null
          severity: string
          source: string
          staff_channel_message_id: string | null
          status: string
          status_note: string | null
          status_updated_at: string | null
          status_updated_by_discord_user_id: string | null
          steps_to_reproduce: string | null
          summary: string
          triage_notes: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          attachment_count?: number
          attachment_metadata?: Json | null
          attachment_pruned?: boolean
          card_id?: string | null
          card_phase?: string | null
          card_priority?: string | null
          closed_at?: string | null
          completion_review_note?: string | null
          completion_review_status?: string
          completion_reviewed_at?: string | null
          completion_reviewed_by_discord_user_id?: string | null
          created_at?: string
          dependency_notes?: string | null
          depends_on?: string[] | null
          details?: string | null
          details_pruned?: boolean
          discord_forum_applied_tag_ids?: string[] | null
          discord_forum_channel_id?: string | null
          discord_forum_message_id?: string | null
          discord_forum_thread_id?: string | null
          discord_forum_title?: string | null
          discord_interaction_id?: string | null
          duplicate_count?: number
          duplicate_fingerprint?: string | null
          effort_points?: number | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          pruned_at?: string | null
          report_type?: string
          reporter_discord_user_id: string
          reporter_discord_username?: string | null
          reporter_fitness_user_id?: string | null
          reporter_member_number?: number | null
          reporter_mentioned_at?: string | null
          reporter_user_kind?: string | null
          screenshot_url?: string | null
          severity?: string
          source?: string
          staff_channel_message_id?: string | null
          status?: string
          status_note?: string | null
          status_updated_at?: string | null
          status_updated_by_discord_user_id?: string | null
          steps_to_reproduce?: string | null
          summary: string
          triage_notes?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          attachment_count?: number
          attachment_metadata?: Json | null
          attachment_pruned?: boolean
          card_id?: string | null
          card_phase?: string | null
          card_priority?: string | null
          closed_at?: string | null
          completion_review_note?: string | null
          completion_review_status?: string
          completion_reviewed_at?: string | null
          completion_reviewed_by_discord_user_id?: string | null
          created_at?: string
          dependency_notes?: string | null
          depends_on?: string[] | null
          details?: string | null
          details_pruned?: boolean
          discord_forum_applied_tag_ids?: string[] | null
          discord_forum_channel_id?: string | null
          discord_forum_message_id?: string | null
          discord_forum_thread_id?: string | null
          discord_forum_title?: string | null
          discord_interaction_id?: string | null
          duplicate_count?: number
          duplicate_fingerprint?: string | null
          effort_points?: number | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          pruned_at?: string | null
          report_type?: string
          reporter_discord_user_id?: string
          reporter_discord_username?: string | null
          reporter_fitness_user_id?: string | null
          reporter_member_number?: number | null
          reporter_mentioned_at?: string | null
          reporter_user_kind?: string | null
          screenshot_url?: string | null
          severity?: string
          source?: string
          staff_channel_message_id?: string | null
          status?: string
          status_note?: string | null
          status_updated_at?: string | null
          status_updated_by_discord_user_id?: string | null
          steps_to_reproduce?: string | null
          summary?: string
          triage_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discord_member_links: {
        Row: {
          created_at: string
          discord_user_id: string
          discord_username: string | null
          fitness_user_id: string
          id: string
          last_error_code: string | null
          nickname_sync_status: string
          nickname_synced_at: string | null
          updated_at: string
          user_kind: string
          user_number: number | null
          verified_role_granted_at: string | null
        }
        Insert: {
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          fitness_user_id: string
          id?: string
          last_error_code?: string | null
          nickname_sync_status?: string
          nickname_synced_at?: string | null
          updated_at?: string
          user_kind?: string
          user_number?: number | null
          verified_role_granted_at?: string | null
        }
        Update: {
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          fitness_user_id?: string
          id?: string
          last_error_code?: string | null
          nickname_sync_status?: string
          nickname_synced_at?: string | null
          updated_at?: string
          user_kind?: string
          user_number?: number | null
          verified_role_granted_at?: string | null
        }
        Relationships: []
      }
      discord_message_command_claims: {
        Row: {
          channel_id: string
          claim_status: string
          claimed_at: string
          command_kind: string
          last_attempt_at: string
          message_id: string
          processed_at: string | null
          response_action: string | null
          result_code: string | null
        }
        Insert: {
          channel_id: string
          claim_status?: string
          claimed_at?: string
          command_kind: string
          last_attempt_at?: string
          message_id: string
          processed_at?: string | null
          response_action?: string | null
          result_code?: string | null
        }
        Update: {
          channel_id?: string
          claim_status?: string
          claimed_at?: string
          command_kind?: string
          last_attempt_at?: string
          message_id?: string
          processed_at?: string | null
          response_action?: string | null
          result_code?: string | null
        }
        Relationships: []
      }
      discord_moderation_cases: {
        Row: {
          action: string
          created_at: string
          duration_seconds: number | null
          expires_at: string | null
          id: string
          log_channel_id: string | null
          log_message_id: string | null
          moderator_discord_user_id: string
          moderator_discord_username: string | null
          purgatory_channel_id: string | null
          purgatory_role_id: string | null
          reason: string
          release_note: string | null
          released_at: string | null
          released_by_discord_user_id: string | null
          removed_role_ids: Json
          resolved_at: string | null
          resolved_by_discord_user_id: string | null
          restored_role_ids: Json
          severity: string
          status: string
          target_discord_user_id: string
          target_discord_username: string | null
          target_fitness_user_id: string | null
          target_member_number: number | null
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          log_channel_id?: string | null
          log_message_id?: string | null
          moderator_discord_user_id: string
          moderator_discord_username?: string | null
          purgatory_channel_id?: string | null
          purgatory_role_id?: string | null
          reason: string
          release_note?: string | null
          released_at?: string | null
          released_by_discord_user_id?: string | null
          removed_role_ids?: Json
          resolved_at?: string | null
          resolved_by_discord_user_id?: string | null
          restored_role_ids?: Json
          severity?: string
          status?: string
          target_discord_user_id: string
          target_discord_username?: string | null
          target_fitness_user_id?: string | null
          target_member_number?: number | null
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          log_channel_id?: string | null
          log_message_id?: string | null
          moderator_discord_user_id?: string
          moderator_discord_username?: string | null
          purgatory_channel_id?: string | null
          purgatory_role_id?: string | null
          reason?: string
          release_note?: string | null
          released_at?: string | null
          released_by_discord_user_id?: string | null
          removed_role_ids?: Json
          resolved_at?: string | null
          resolved_by_discord_user_id?: string | null
          restored_role_ids?: Json
          severity?: string
          status?: string
          target_discord_user_id?: string
          target_discord_username?: string | null
          target_fitness_user_id?: string | null
          target_member_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      discord_spotify_connections: {
        Row: {
          access_token_expires_at: string | null
          connected_at: string
          created_at: string
          disconnected_at: string | null
          discord_user_id: string
          encrypted_refresh_token: string
          id: string
          is_premium: boolean
          last_checked_at: string | null
          scopes: string[]
          spotify_display_name: string | null
          spotify_product: string
          spotify_user_id: string
          updated_at: string
        }
        Insert: {
          access_token_expires_at?: string | null
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          discord_user_id: string
          encrypted_refresh_token: string
          id?: string
          is_premium?: boolean
          last_checked_at?: string | null
          scopes?: string[]
          spotify_display_name?: string | null
          spotify_product?: string
          spotify_user_id: string
          updated_at?: string
        }
        Update: {
          access_token_expires_at?: string | null
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          discord_user_id?: string
          encrypted_refresh_token?: string
          id?: string
          is_premium?: boolean
          last_checked_at?: string | null
          scopes?: string[]
          spotify_display_name?: string | null
          spotify_product?: string
          spotify_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_spotify_lobbies: {
        Row: {
          approval_mode: string
          closed_at: string | null
          created_at: string
          description: string | null
          host_discord_user_id: string | null
          host_spotify_user_id: string | null
          id: string
          join_key_hash: string | null
          opened_at: string | null
          panel_channel_id: string | null
          panel_message_id: string | null
          room_name: string
          room_slug: string
          spotify_mirror_enabled: boolean
          spotify_mirror_error_count: number
          spotify_mirror_last_synced_at: string | null
          status: string
          stop_playback_on_close: boolean
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          approval_mode?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          host_discord_user_id?: string | null
          host_spotify_user_id?: string | null
          id?: string
          join_key_hash?: string | null
          opened_at?: string | null
          panel_channel_id?: string | null
          panel_message_id?: string | null
          room_name?: string
          room_slug?: string
          spotify_mirror_enabled?: boolean
          spotify_mirror_error_count?: number
          spotify_mirror_last_synced_at?: string | null
          status?: string
          stop_playback_on_close?: boolean
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          approval_mode?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          host_discord_user_id?: string | null
          host_spotify_user_id?: string | null
          id?: string
          join_key_hash?: string | null
          opened_at?: string | null
          panel_channel_id?: string | null
          panel_message_id?: string | null
          room_name?: string
          room_slug?: string
          spotify_mirror_enabled?: boolean
          spotify_mirror_error_count?: number
          spotify_mirror_last_synced_at?: string | null
          status?: string
          stop_playback_on_close?: boolean
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      discord_spotify_queue_items: {
        Row: {
          album_name: string | null
          approval_state: string
          approved_at: string | null
          approved_by_discord_user_id: string | null
          artist_name: string | null
          cleared_reason: string | null
          created_at: string
          dedupe_key: string | null
          display_position: number | null
          duration_ms: number | null
          id: string
          lobby_id: string | null
          mirror_first_seen_at: string | null
          mirror_last_seen_at: string | null
          playback_finished_at: string | null
          playback_started_at: string | null
          playback_state: string
          played_at: string | null
          queue_position: number | null
          rejected_at: string | null
          rejected_by_discord_user_id: string | null
          rejection_reason: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by_discord_user_id: string | null
          skipped_at: string | null
          source_type: string
          spotify_uri: string
          spotify_url: string | null
          status: string
          suggested_by_discord_user_id: string
          suggested_by_spotify_user_id: string | null
          track_title: string | null
          updated_at: string
        }
        Insert: {
          album_name?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by_discord_user_id?: string | null
          artist_name?: string | null
          cleared_reason?: string | null
          created_at?: string
          dedupe_key?: string | null
          display_position?: number | null
          duration_ms?: number | null
          id?: string
          lobby_id?: string | null
          mirror_first_seen_at?: string | null
          mirror_last_seen_at?: string | null
          playback_finished_at?: string | null
          playback_started_at?: string | null
          playback_state?: string
          played_at?: string | null
          queue_position?: number | null
          rejected_at?: string | null
          rejected_by_discord_user_id?: string | null
          rejection_reason?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by_discord_user_id?: string | null
          skipped_at?: string | null
          source_type?: string
          spotify_uri: string
          spotify_url?: string | null
          status?: string
          suggested_by_discord_user_id: string
          suggested_by_spotify_user_id?: string | null
          track_title?: string | null
          updated_at?: string
        }
        Update: {
          album_name?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by_discord_user_id?: string | null
          artist_name?: string | null
          cleared_reason?: string | null
          created_at?: string
          dedupe_key?: string | null
          display_position?: number | null
          duration_ms?: number | null
          id?: string
          lobby_id?: string | null
          mirror_first_seen_at?: string | null
          mirror_last_seen_at?: string | null
          playback_finished_at?: string | null
          playback_started_at?: string | null
          playback_state?: string
          played_at?: string | null
          queue_position?: number | null
          rejected_at?: string | null
          rejected_by_discord_user_id?: string | null
          rejection_reason?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by_discord_user_id?: string | null
          skipped_at?: string | null
          source_type?: string
          spotify_uri?: string
          spotify_url?: string | null
          status?: string
          suggested_by_discord_user_id?: string
          suggested_by_spotify_user_id?: string | null
          track_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_spotify_queue_items_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "discord_spotify_lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_spotify_room_members: {
        Row: {
          created_at: string
          discord_user_id: string
          id: string
          joined_at: string
          last_seen_at: string | null
          left_at: string | null
          lobby_id: string
          spotify_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_user_id: string
          id?: string
          joined_at?: string
          last_seen_at?: string | null
          left_at?: string | null
          lobby_id: string
          spotify_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_user_id?: string
          id?: string
          joined_at?: string
          last_seen_at?: string | null
          left_at?: string | null
          lobby_id?: string
          spotify_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_spotify_room_members_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "discord_spotify_lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_update_drafts: {
        Row: {
          created_at: string
          deployment_id: string
          deployment_url: string | null
          discord_channel_id: string | null
          discord_message_id: string | null
          git_commit_message: string | null
          git_commit_ref: string | null
          git_commit_sha: string | null
          id: string
          production_url: string | null
          published_at: string | null
          published_by_discord_user_id: string | null
          skip_reason: string | null
          skipped_at: string | null
          skipped_by_discord_user_id: string | null
          source: string
          status: string
          updated_at: string
          user_facing_changes: string | null
          user_facing_title: string | null
          user_facing_why_it_matters: string | null
          vercel_project_id: string | null
          vercel_project_name: string | null
          vercel_target: string | null
          webhook_received_at: string
        }
        Insert: {
          created_at?: string
          deployment_id: string
          deployment_url?: string | null
          discord_channel_id?: string | null
          discord_message_id?: string | null
          git_commit_message?: string | null
          git_commit_ref?: string | null
          git_commit_sha?: string | null
          id?: string
          production_url?: string | null
          published_at?: string | null
          published_by_discord_user_id?: string | null
          skip_reason?: string | null
          skipped_at?: string | null
          skipped_by_discord_user_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_facing_changes?: string | null
          user_facing_title?: string | null
          user_facing_why_it_matters?: string | null
          vercel_project_id?: string | null
          vercel_project_name?: string | null
          vercel_target?: string | null
          webhook_received_at?: string
        }
        Update: {
          created_at?: string
          deployment_id?: string
          deployment_url?: string | null
          discord_channel_id?: string | null
          discord_message_id?: string | null
          git_commit_message?: string | null
          git_commit_ref?: string | null
          git_commit_sha?: string | null
          id?: string
          production_url?: string | null
          published_at?: string | null
          published_by_discord_user_id?: string | null
          skip_reason?: string | null
          skipped_at?: string | null
          skipped_by_discord_user_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_facing_changes?: string | null
          user_facing_title?: string | null
          user_facing_why_it_matters?: string | null
          vercel_project_id?: string | null
          vercel_project_name?: string | null
          vercel_target?: string | null
          webhook_received_at?: string
        }
        Relationships: []
      }
      discord_verification_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          discord_user_id: string | null
          discord_username: string | null
          expires_at: string
          id: string
          token_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          discord_user_id?: string | null
          discord_username?: string | null
          expires_at: string
          id?: string
          token_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          discord_user_id?: string | null
          discord_username?: string | null
          expires_at?: string
          id?: string
          token_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_stats: {
        Row: {
          actual_pr_at: string | null
          actual_pr_reps: number | null
          actual_pr_weight: number | null
          exercise_id: string
          last_performed_at: string | null
          last_reps: number | null
          last_unit: string | null
          last_weight: number | null
          pr_achieved_at: string | null
          pr_est_1rm: number | null
          pr_reps: number | null
          pr_weight: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_pr_at?: string | null
          actual_pr_reps?: number | null
          actual_pr_weight?: number | null
          exercise_id: string
          last_performed_at?: string | null
          last_reps?: number | null
          last_unit?: string | null
          last_weight?: number | null
          pr_achieved_at?: string | null
          pr_est_1rm?: number | null
          pr_reps?: number | null
          pr_weight?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_pr_at?: string | null
          actual_pr_reps?: number | null
          actual_pr_weight?: number | null
          exercise_id?: string
          last_performed_at?: string | null
          last_reps?: number | null
          last_unit?: string | null
          last_weight?: number | null
          pr_achieved_at?: string | null
          pr_est_1rm?: number | null
          pr_reps?: number | null
          pr_weight?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_stats_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          calories_estimation_method: string | null
          categories: string[] | null
          created_at: string
          curation_tags: Json
          default_unit: string | null
          equipment: string | null
          how_to_short: string | null
          id: string
          image_howto_path: string | null
          image_icon_path: string | null
          image_muscles_path: string | null
          image_path: string | null
          is_global: boolean
          kind: string | null
          measurement_type: string
          movement_pattern: string | null
          name: string
          primary_muscle: string | null
          primary_muscles: string[] | null
          secondary_muscles: string[] | null
          slug: string | null
          tags: string[] | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          calories_estimation_method?: string | null
          categories?: string[] | null
          created_at?: string
          curation_tags?: Json
          default_unit?: string | null
          equipment?: string | null
          how_to_short?: string | null
          id?: string
          image_howto_path?: string | null
          image_icon_path?: string | null
          image_muscles_path?: string | null
          image_path?: string | null
          is_global?: boolean
          kind?: string | null
          measurement_type?: string
          movement_pattern?: string | null
          name: string
          primary_muscle?: string | null
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          slug?: string | null
          tags?: string[] | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          calories_estimation_method?: string | null
          categories?: string[] | null
          created_at?: string
          curation_tags?: Json
          default_unit?: string | null
          equipment?: string | null
          how_to_short?: string | null
          id?: string
          image_howto_path?: string | null
          image_icon_path?: string | null
          image_muscles_path?: string | null
          image_path?: string | null
          is_global?: boolean
          kind?: string | null
          measurement_type?: string
          movement_pattern?: string | null
          name?: string
          primary_muscle?: string | null
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
          slug?: string | null
          tags?: string[] | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_routine_id: string | null
          created_at: string
          id: string
          preferred_distance_unit: string
          preferred_weight_unit: string
          show_qa_llel_data: boolean
          timezone: string
          updated_at: string
          user_kind: string
          user_number: number | null
          user_number_assigned_at: string | null
        }
        Insert: {
          active_routine_id?: string | null
          created_at?: string
          id: string
          preferred_distance_unit?: string
          preferred_weight_unit?: string
          show_qa_llel_data?: boolean
          timezone?: string
          updated_at?: string
          user_kind?: string
          user_number?: number | null
          user_number_assigned_at?: string | null
        }
        Update: {
          active_routine_id?: string | null
          created_at?: string
          id?: string
          preferred_distance_unit?: string
          preferred_weight_unit?: string
          show_qa_llel_data?: boolean
          timezone?: string
          updated_at?: string
          user_kind?: string
          user_number?: number | null
          user_number_assigned_at?: string | null
        }
        Relationships: []
      }
      progression_events: {
        Row: {
          created_at: string
          event_type: string
          exercise_id: string
          from_target: Json
          id: string
          method: string
          reason: string
          routine_day_exercise_id: string
          routine_id: string
          source_session_id: string | null
          step: Json | null
          to_target: Json
          user_id: string
          vector: string
        }
        Insert: {
          created_at?: string
          event_type: string
          exercise_id: string
          from_target: Json
          id?: string
          method: string
          reason: string
          routine_day_exercise_id: string
          routine_id: string
          source_session_id?: string | null
          step?: Json | null
          to_target: Json
          user_id: string
          vector: string
        }
        Update: {
          created_at?: string
          event_type?: string
          exercise_id?: string
          from_target?: Json
          id?: string
          method?: string
          reason?: string
          routine_day_exercise_id?: string
          routine_id?: string
          source_session_id?: string | null
          step?: Json | null
          to_target?: Json
          user_id?: string
          vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "progression_events_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_events_routine_day_exercise_id_fkey"
            columns: ["routine_day_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_day_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_events_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_events_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_day_exercises: {
        Row: {
          created_at: string
          default_unit: string | null
          exercise_id: string
          id: string
          measurement_type: string | null
          notes: string | null
          position: number
          progression_playbook_config: Json | null
          progression_playbook_id: string | null
          rep_range_max: number | null
          rep_range_min: number | null
          routine_day_id: string
          target_calories: number | null
          target_distance: number | null
          target_distance_unit: string | null
          target_duration_seconds: number | null
          target_reps: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets: number | null
          target_weight: number | null
          target_weight_unit: string | null
          user_id: string
          workout_plan_template_exercise_id: string | null
        }
        Insert: {
          created_at?: string
          default_unit?: string | null
          exercise_id: string
          id?: string
          measurement_type?: string | null
          notes?: string | null
          position?: number
          progression_playbook_config?: Json | null
          progression_playbook_id?: string | null
          rep_range_max?: number | null
          rep_range_min?: number | null
          routine_day_id: string
          target_calories?: number | null
          target_distance?: number | null
          target_distance_unit?: string | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number | null
          target_weight?: number | null
          target_weight_unit?: string | null
          user_id: string
          workout_plan_template_exercise_id?: string | null
        }
        Update: {
          created_at?: string
          default_unit?: string | null
          exercise_id?: string
          id?: string
          measurement_type?: string | null
          notes?: string | null
          position?: number
          progression_playbook_config?: Json | null
          progression_playbook_id?: string | null
          rep_range_max?: number | null
          rep_range_min?: number | null
          routine_day_id?: string
          target_calories?: number | null
          target_distance?: number | null
          target_distance_unit?: string | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number | null
          target_weight?: number | null
          target_weight_unit?: string | null
          user_id?: string
          workout_plan_template_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_day_exercises_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_day_exercises_workout_plan_template_exercise_id_fkey"
            columns: ["workout_plan_template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_days: {
        Row: {
          created_at: string
          day_index: number
          duplicate_source_routine_day_id: string | null
          id: string
          is_optional: boolean
          is_rest: boolean
          name: string | null
          notes: string | null
          routine_id: string
          user_id: string
          workout_plan_template_edit_choice_required: boolean
          workout_plan_template_id: string | null
        }
        Insert: {
          created_at?: string
          day_index: number
          duplicate_source_routine_day_id?: string | null
          id?: string
          is_optional?: boolean
          is_rest?: boolean
          name?: string | null
          notes?: string | null
          routine_id: string
          user_id: string
          workout_plan_template_edit_choice_required?: boolean
          workout_plan_template_id?: string | null
        }
        Update: {
          created_at?: string
          day_index?: number
          duplicate_source_routine_day_id?: string | null
          id?: string
          is_optional?: boolean
          is_rest?: boolean
          name?: string | null
          notes?: string | null
          routine_id?: string
          user_id?: string
          workout_plan_template_edit_choice_required?: boolean
          workout_plan_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_duplicate_source_routine_day_id_fkey"
            columns: ["duplicate_source_routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_days_workout_plan_template_id_fkey"
            columns: ["workout_plan_template_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          cycle_length_days: number
          default_progression_playbook_config: Json | null
          default_progression_playbook_id: string | null
          id: string
          name: string
          progression_mode: string
          schedule_mode: string
          start_date: string
          temperament: string
          timezone: string
          updated_at: string
          user_id: string
          weight_unit: string
        }
        Insert: {
          created_at?: string
          cycle_length_days: number
          default_progression_playbook_config?: Json | null
          default_progression_playbook_id?: string | null
          id?: string
          name: string
          progression_mode?: string
          schedule_mode?: string
          start_date: string
          temperament?: string
          timezone?: string
          updated_at?: string
          user_id: string
          weight_unit?: string
        }
        Update: {
          created_at?: string
          cycle_length_days?: number
          default_progression_playbook_config?: Json | null
          default_progression_playbook_id?: string | null
          id?: string
          name?: string
          progression_mode?: string
          schedule_mode?: string
          start_date?: string
          temperament?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          copilot_feedback_effort: number | null
          copilot_feedback_note: string | null
          copilot_feedback_signal: string | null
          copilot_feedback_updated_at: string | null
          default_unit: string | null
          exercise_id: string
          exercise_timer_completed_at: string | null
          exercise_timer_elapsed_seconds: number
          exercise_timer_enabled: boolean
          exercise_timer_mode: string | null
          exercise_timer_started_at: string | null
          exercise_timer_status: string
          exercise_timer_target_seconds: number | null
          id: string
          is_skipped: boolean
          measurement_type: string | null
          notes: string | null
          performed_index: number | null
          position: number
          routine_day_exercise_id: string | null
          session_id: string
          target_calories: number | null
          target_calories_max: number | null
          target_calories_min: number | null
          target_distance: number | null
          target_distance_max: number | null
          target_distance_min: number | null
          target_distance_unit: string | null
          target_duration_seconds: number | null
          target_reps: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets_max: number | null
          target_sets_min: number | null
          target_time_seconds_max: number | null
          target_time_seconds_min: number | null
          target_weight: number | null
          target_weight_max: number | null
          target_weight_min: number | null
          target_weight_unit: string | null
          user_id: string
        }
        Insert: {
          copilot_feedback_effort?: number | null
          copilot_feedback_note?: string | null
          copilot_feedback_signal?: string | null
          copilot_feedback_updated_at?: string | null
          default_unit?: string | null
          exercise_id: string
          exercise_timer_completed_at?: string | null
          exercise_timer_elapsed_seconds?: number
          exercise_timer_enabled?: boolean
          exercise_timer_mode?: string | null
          exercise_timer_started_at?: string | null
          exercise_timer_status?: string
          exercise_timer_target_seconds?: number | null
          id?: string
          is_skipped?: boolean
          measurement_type?: string | null
          notes?: string | null
          performed_index?: number | null
          position?: number
          routine_day_exercise_id?: string | null
          session_id: string
          target_calories?: number | null
          target_calories_max?: number | null
          target_calories_min?: number | null
          target_distance?: number | null
          target_distance_max?: number | null
          target_distance_min?: number | null
          target_distance_unit?: string | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets_max?: number | null
          target_sets_min?: number | null
          target_time_seconds_max?: number | null
          target_time_seconds_min?: number | null
          target_weight?: number | null
          target_weight_max?: number | null
          target_weight_min?: number | null
          target_weight_unit?: string | null
          user_id: string
        }
        Update: {
          copilot_feedback_effort?: number | null
          copilot_feedback_note?: string | null
          copilot_feedback_signal?: string | null
          copilot_feedback_updated_at?: string | null
          default_unit?: string | null
          exercise_id?: string
          exercise_timer_completed_at?: string | null
          exercise_timer_elapsed_seconds?: number
          exercise_timer_enabled?: boolean
          exercise_timer_mode?: string | null
          exercise_timer_started_at?: string | null
          exercise_timer_status?: string
          exercise_timer_target_seconds?: number | null
          id?: string
          is_skipped?: boolean
          measurement_type?: string | null
          notes?: string | null
          performed_index?: number | null
          position?: number
          routine_day_exercise_id?: string | null
          session_id?: string
          target_calories?: number | null
          target_calories_max?: number | null
          target_calories_min?: number | null
          target_distance?: number | null
          target_distance_max?: number | null
          target_distance_min?: number | null
          target_distance_unit?: string | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets_max?: number | null
          target_sets_min?: number | null
          target_time_seconds_max?: number | null
          target_time_seconds_min?: number | null
          target_weight?: number | null
          target_weight_max?: number | null
          target_weight_min?: number | null
          target_weight_unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_routine_day_exercise_id_fkey"
            columns: ["routine_day_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_day_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_follow_up_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          id: string
          job_kind: string
          last_error: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          job_kind: string
          last_error?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          job_kind?: string
          last_error?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_follow_up_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          day_name_override: string | null
          duration_seconds: number | null
          id: string
          name: string | null
          notes: string | null
          performed_at: string
          routine_day_index: number | null
          routine_day_name: string | null
          routine_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          day_name_override?: string | null
          duration_seconds?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          performed_at?: string
          routine_day_index?: number | null
          routine_day_name?: string | null
          routine_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          day_name_override?: string | null
          duration_seconds?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          performed_at?: string
          routine_day_index?: number | null
          routine_day_name?: string | null
          routine_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          calories: number | null
          client_log_id: string | null
          distance: number | null
          distance_unit: string | null
          duration_seconds: number | null
          id: string
          is_warmup: boolean
          logged_at: string | null
          notes: string | null
          reps: number
          rpe: number | null
          session_exercise_id: string
          set_index: number
          user_id: string
          weight: number
          weight_unit: string | null
        }
        Insert: {
          calories?: number | null
          client_log_id?: string | null
          distance?: number | null
          distance_unit?: string | null
          duration_seconds?: number | null
          id?: string
          is_warmup?: boolean
          logged_at?: string | null
          notes?: string | null
          reps: number
          rpe?: number | null
          session_exercise_id: string
          set_index: number
          user_id: string
          weight: number
          weight_unit?: string | null
        }
        Update: {
          calories?: number | null
          client_log_id?: string | null
          distance?: number | null
          distance_unit?: string | null
          duration_seconds?: number | null
          id?: string
          is_warmup?: boolean
          logged_at?: string | null
          notes?: string | null
          reps?: number
          rpe?: number | null
          session_exercise_id?: string
          set_index?: number
          user_id?: string
          weight?: number
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          created_at: string
          entitlement_key: string
          expires_at: string | null
          granted_at: string
          granted_via_purchase_id: string | null
          id: string
          source_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entitlement_key: string
          expires_at?: string | null
          granted_at?: string
          granted_via_purchase_id?: string | null
          id?: string
          source_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entitlement_key?: string
          expires_at?: string | null
          granted_at?: string
          granted_via_purchase_id?: string | null
          id?: string
          source_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_granted_via_purchase_id_fkey"
            columns: ["granted_via_purchase_id"]
            isOneToOne: false
            referencedRelation: "billing_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_template_exercises: {
        Row: {
          created_at: string
          default_unit: string | null
          exercise_id: string
          id: string
          measurement_type: string | null
          notes: string | null
          position: number
          progression_playbook_config: Json | null
          progression_playbook_id: string | null
          target_calories: number | null
          target_distance: number | null
          target_distance_unit: string | null
          target_duration_seconds: number | null
          target_reps: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets: number | null
          target_weight: number | null
          target_weight_unit: string | null
          updated_at: string
          user_id: string
          workout_plan_template_id: string
        }
        Insert: {
          created_at?: string
          default_unit?: string | null
          exercise_id: string
          id?: string
          measurement_type?: string | null
          notes?: string | null
          position?: number
          progression_playbook_config?: Json | null
          progression_playbook_id?: string | null
          target_calories?: number | null
          target_distance?: number | null
          target_distance_unit?: string | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number | null
          target_weight?: number | null
          target_weight_unit?: string | null
          updated_at?: string
          user_id: string
          workout_plan_template_id: string
        }
        Update: {
          created_at?: string
          default_unit?: string | null
          exercise_id?: string
          id?: string
          measurement_type?: string | null
          notes?: string | null
          position?: number
          progression_playbook_config?: Json | null
          progression_playbook_id?: string | null
          target_calories?: number | null
          target_distance?: number | null
          target_distance_unit?: string | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number | null
          target_weight?: number | null
          target_weight_unit?: string | null
          updated_at?: string
          user_id?: string
          workout_plan_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_template_exercises_workout_plan_template_id_fkey"
            columns: ["workout_plan_template_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_templates: {
        Row: {
          created_at: string
          id: string
          is_rest: boolean
          name: string
          source_routine_day_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_rest?: boolean
          name: string
          source_routine_day_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_rest?: boolean
          name?: string
          source_routine_day_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_templates_source_routine_day_id_fkey"
            columns: ["source_routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_fitness_auth_handoff: {
        Args: {
          p_audience: string
          p_binding_digest: string
          p_expires_at: string
          p_handoff_digest: string
          p_issuer: string
          p_return_to: string
        }
        Returns: boolean
      }
      claim_session_follow_up_jobs: {
        Args: {
          claim_time?: string
          stale_before: string
          target_session_id: string
          target_user_id: string
        }
        Returns: {
          attempt_count: number
          id: string
          job_kind: string
          status: string
        }[]
      }
      compact_human_member_numbers_preserving_zero: {
        Args: never
        Returns: undefined
      }
      consume_discord_verification_token: {
        Args: {
          input_discord_user_id: string
          input_discord_username?: string
          input_token_hash: string
        }
        Returns: {
          consumed_at: string
          error: string
          expires_at: string
          ok: boolean
          user_id: string
          user_kind: string
          user_number: number
        }[]
      }
      consume_fitness_auth_handoff: {
        Args: {
          p_audience: string
          p_binding_digest: string
          p_handoff_digest: string
          p_issuer: string
          p_now: string
        }
        Returns: {
          return_to: string
        }[]
      }
      is_automation_auth_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      refresh_discord_member_link_member_number_snapshots: {
        Args: never
        Returns: number
      }
      reorder_routine_day_exercises: {
        Args: {
          ordered_exercise_row_ids: string[]
          target_routine_day_id: string
          target_user_id: string
        }
        Returns: undefined
      }
      reorder_routine_days: {
        Args: {
          ordered_routine_day_ids: string[]
          target_routine_id: string
          target_user_id: string
        }
        Returns: undefined
      }
      upsert_discord_member_link: {
        Args: {
          input_discord_user_id: string
          input_discord_username?: string
          input_fitness_user_id: string
          input_last_error_code?: string
          input_nickname_sync_status?: string
          input_nickname_synced_at?: string
          input_user_kind?: string
          input_user_number?: number
          input_verified_role_granted_at?: string
        }
        Returns: {
          created_at: string
          discord_user_id: string
          discord_username: string | null
          fitness_user_id: string
          id: string
          last_error_code: string | null
          nickname_sync_status: string
          nickname_synced_at: string | null
          updated_at: string
          user_kind: string
          user_number: number | null
          verified_role_granted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "discord_member_links"
          isOneToOne: true
          isSetofReturn: false
        }
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
  fitness: {
    Enums: {},
  },
} as const
