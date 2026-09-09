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
      charge_requests: {
        Row: {
          amount: number
          channel: string
          completed_at: string | null
          created_at: string
          expires_at: string
          failure_code: string | null
          id: string
          idempotency_key: string
          instructions: Json | null
          metadata: Json
          method: string
          provider: string
          provider_ref: string | null
          redirect_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          channel: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          failure_code?: string | null
          id?: string
          idempotency_key: string
          instructions?: Json | null
          metadata?: Json
          method: string
          provider: string
          provider_ref?: string | null
          redirect_url?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          channel?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          failure_code?: string | null
          id?: string
          idempotency_key?: string
          instructions?: Json | null
          metadata?: Json
          method?: string
          provider?: string
          provider_ref?: string | null
          redirect_url?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_requests_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          discount_type: string
          id: string
          max_uses: number | null
          merchant_id: string | null
          min_amount: number
          title: string
          valid_from: string
          valid_until: string
          value: number
        }
        Insert: {
          discount_type: string
          id?: string
          max_uses?: number | null
          merchant_id?: string | null
          min_amount?: number
          title: string
          valid_from?: string
          valid_until: string
          value: number
        }
        Update: {
          discount_type?: string
          id?: string
          max_uses?: number | null
          merchant_id?: string | null
          min_amount?: number
          title?: string
          valid_from?: string
          valid_until?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: number
          transaction_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: number
          transaction_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: number
          transaction_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          category: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          wallet_id: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          wallet_id: string
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: true
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          memo: string | null
          merchant_id: string
          paid_transaction_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at: string
          id?: string
          memo?: string | null
          merchant_id: string
          paid_transaction_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          memo?: string | null
          merchant_id?: string
          paid_transaction_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_paid_transaction_id_fkey"
            columns: ["paid_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_attempts: {
        Row: {
          failed_count: number
          locked_until: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          failed_count?: number
          locked_until?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          failed_count?: number
          locked_until?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pin_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pin_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_entries: {
        Row: {
          created_at: string
          delta: number
          id: number
          reason: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: number
          reason: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: number
          reason?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          pin_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          handle: string
          id: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      qr_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_payments: {
        Row: {
          amount: number
          channel: string
          created_at: string
          currency: string
          expires_at: string
          id: string
          instructions: Json | null
          method: string
          paid_at: string | null
          reference: string | null
          return_url: string
          status: string
          updated_at: string
          webhook_log: Json
          webhook_url: string
        }
        Insert: {
          amount: number
          channel: string
          created_at?: string
          currency?: string
          expires_at: string
          id: string
          instructions?: Json | null
          method: string
          paid_at?: string | null
          reference?: string | null
          return_url: string
          status?: string
          updated_at?: string
          webhook_log?: Json
          webhook_url: string
        }
        Update: {
          amount?: number
          channel?: string
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          instructions?: Json | null
          method?: string
          paid_at?: string | null
          reference?: string | null
          return_url?: string
          status?: string
          updated_at?: string
          webhook_log?: Json
          webhook_url?: string
        }
        Relationships: []
      }
      split_members: {
        Row: {
          amount: number
          id: string
          paid_transaction_id: string | null
          split_request_id: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          paid_transaction_id?: string | null
          split_request_id: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          paid_transaction_id?: string | null
          split_request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_members_paid_transaction_id_fkey"
            columns: ["paid_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_members_split_request_id_fkey"
            columns: ["split_request_id"]
            isOneToOne: false
            referencedRelation: "split_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      split_requests: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          memo: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          memo?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          memo?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "split_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          created_by: string
          from_wallet_id?: string | null
          id?: string
          idempotency_key: string
          memo?: string | null
          merchant_id?: string | null
          metadata?: Json
          status?: Database["public"]["Enums"]["tx_status"]
          to_wallet_id?: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string
          from_wallet_id?: string | null
          id?: string
          idempotency_key?: string
          memo?: string | null
          merchant_id?: string | null
          metadata?: Json
          status?: Database["public"]["Enums"]["tx_status"]
          to_wallet_id?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coupons: {
        Row: {
          coupon_id: string
          id: string
          transaction_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          transaction_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          transaction_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coupons_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coupons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coupons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cache: number
          id: string
          kind: Database["public"]["Enums"]["wallet_kind"]
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          balance_cache?: number
          id?: string
          kind: Database["public"]["Enums"]["wallet_kind"]
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          balance_cache?: number
          id?: string
          kind?: Database["public"]["Enums"]["wallet_kind"]
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      point_balances: {
        Row: {
          balance: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          handle: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _apply_coupon: {
        Args: {
          p_amount: number
          p_merchant_id: string
          p_user_coupon_id: string
          p_user_id: string
        }
        Returns: Json
      }
      _begin_idempotent: {
        Args: { p_idempotency_key: string }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _check_payment_rate: {
        Args: { p_payer_wallet_id: string }
        Returns: undefined
      }
      _my_user_wallet: {
        Args: { p_uid: string }
        Returns: {
          balance_cache: number
          id: string
          kind: Database["public"]["Enums"]["wallet_kind"]
          owner_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _notify: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      _points_for: { Args: { p_amount: number }; Returns: number }
      _post_transaction: {
        Args: {
          p_amount: number
          p_created_by: string
          p_from_wallet_id: string
          p_idempotency_key: string
          p_max_to_balance?: number
          p_memo?: string
          p_merchant_id?: string
          p_metadata?: Json
          p_subsidy?: number
          p_to_wallet_id: string
          p_type: Database["public"]["Enums"]["tx_type"]
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _replay: {
        Args: { p_created_by: string; p_idempotency_key: string }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _require_merchant_owner: {
        Args: { p_merchant_id: string; p_uid: string }
        Returns: {
          address: string | null
          category: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "merchants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _require_pin_verified: { Args: { p_uid: string }; Returns: undefined }
      _settle_payment: {
        Args: {
          p_amount: number
          p_created_by: string
          p_idempotency_key: string
          p_memo: string
          p_merchant: Database["public"]["Tables"]["merchants"]["Row"]
          p_method: string
          p_payer_id: string
          p_user_coupon_id: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _treasury_id: { Args: never; Returns: string }
      _uid: { Args: never; Returns: string }
      cancel_payment_request: {
        Args: { p_request_id: string }
        Returns: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          memo: string | null
          merchant_id: string
          paid_transaction_id: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attach_charge_provider: {
        Args: {
          p_expires_at?: string
          p_instructions?: Json
          p_provider_ref: string
          p_redirect_url?: string
          p_request_id: string
          p_status?: string
        }
        Returns: {
          amount: number
          channel: string
          completed_at: string | null
          created_at: string
          expires_at: string
          failure_code: string | null
          id: string
          idempotency_key: string
          instructions: Json | null
          metadata: Json
          method: string
          provider: string
          provider_ref: string | null
          redirect_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
      }
      cancel_charge_request: {
        Args: { p_request_id: string }
        Returns: {
          amount: number
          channel: string
          completed_at: string | null
          created_at: string
          expires_at: string
          failure_code: string | null
          id: string
          idempotency_key: string
          instructions: Json | null
          metadata: Json
          method: string
          provider: string
          provider_ref: string | null
          redirect_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
      }
      charge_wallet: {
        Args: { p_amount: number; p_idempotency_key: string; p_method: string }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      charge_wallet_for: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_metadata?: Json
          p_method: string
          p_user_id: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_coupon: {
        Args: { p_coupon_id: string }
        Returns: {
          coupon_id: string
          id: string
          transaction_id: string | null
          used_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_coupons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_charge_request: {
        Args: { p_payload?: Json; p_provider_ref?: string; p_request_id: string }
        Returns: {
          amount: number
          channel: string
          completed_at: string | null
          created_at: string
          expires_at: string
          failure_code: string | null
          id: string
          idempotency_key: string
          instructions: Json | null
          metadata: Json
          method: string
          provider: string
          provider_ref: string | null
          redirect_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
      }
      create_charge_request: {
        Args: {
          p_amount: number
          p_channel: string
          p_idempotency_key: string
          p_method: string
          p_provider: string
        }
        Returns: {
          amount: number
          channel: string
          completed_at: string | null
          created_at: string
          expires_at: string
          failure_code: string | null
          id: string
          idempotency_key: string
          instructions: Json | null
          metadata: Json
          method: string
          provider: string
          provider_ref: string | null
          redirect_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
      }
      fail_charge_request: {
        Args: { p_code?: string; p_payload?: Json; p_request_id: string }
        Returns: {
          amount: number
          channel: string
          completed_at: string | null
          created_at: string
          expires_at: string
          failure_code: string | null
          id: string
          idempotency_key: string
          instructions: Json | null
          metadata: Json
          method: string
          provider: string
          provider_ref: string | null
          redirect_url: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
      }
      create_payment_request: {
        Args: { p_amount: number; p_memo?: string; p_merchant_id?: string }
        Returns: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          memo: string | null
          merchant_id: string
          paid_transaction_id: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_qr_token: { Args: never; Returns: Json }
      create_split_request: {
        Args: { p_members: Json; p_memo?: string; p_total: number }
        Returns: {
          created_at: string
          creator_id: string
          id: string
          memo: string | null
          total_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "split_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_payment_request: { Args: { p_request_id: string }; Returns: Json }
      is_split_participant: {
        Args: { p_split_request_id: string }
        Returns: boolean
      }
      ledger_stats: { Args: never; Returns: Json }
      merchant_today_summary: { Args: { p_merchant_id: string }; Returns: Json }
      my_merchant_ids: { Args: never; Returns: string[] }
      my_wallet_ids: { Args: never; Returns: string[] }
      pay_request: {
        Args: {
          p_idempotency_key: string
          p_request_id: string
          p_user_coupon_id?: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_split: {
        Args: { p_idempotency_key: string; p_split_member_id: string }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_static: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_merchant_id: string
          p_user_coupon_id?: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_with_token: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_merchant_id: string
          p_token: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pin_status: { Args: never; Returns: Json }
      reconcile_wallets: {
        Args: never
        Returns: {
          balance_cache: number
          diff: number
          kind: Database["public"]["Enums"]["wallet_kind"]
          ledger_sum: number
          owner_handle: string
          owner_id: string
          wallet_id: string
        }[]
      }
      refund_transaction: {
        Args: { p_transaction_id: string }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_merchant: {
        Args: { p_address?: string; p_category?: string; p_name: string }
        Returns: {
          address: string | null
          category: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "merchants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_pin: {
        Args: { p_current_pin?: string; p_pin: string }
        Returns: boolean
      }
      transfer: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_memo: string
          p_to_handle: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_pin: { Args: { p_pin: string }; Returns: Json }
      withdraw: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_wallet_id?: string
        }
        Returns: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string
          from_wallet_id: string | null
          id: string
          idempotency_key: string
          memo: string | null
          merchant_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["tx_status"]
          to_wallet_id: string | null
          type: Database["public"]["Enums"]["tx_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      tx_status: "pending" | "completed" | "failed" | "refunded"
      tx_type:
        | "charge"
        | "payment"
        | "transfer"
        | "withdrawal"
        | "refund"
        | "split"
      user_role: "user" | "merchant" | "admin"
      wallet_kind: "user" | "merchant" | "system"
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
      tx_status: ["pending", "completed", "failed", "refunded"],
      tx_type: [
        "charge",
        "payment",
        "transfer",
        "withdrawal",
        "refund",
        "split",
      ],
      user_role: ["user", "merchant", "admin"],
      wallet_kind: ["user", "merchant", "system"],
    },
  },
} as const
