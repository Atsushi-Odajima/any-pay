// `supabase gen types typescript` と同じ形式で管理する。
// スキーマ変更時は `npm run gen:types`（要 supabase link）で再生成できる。
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url: string | null;
          role: Database['public']['Enums']['user_role'];
          pin_hash: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          pin_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          display_name?: string;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          pin_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          owner_id: string | null;
          kind: Database['public']['Enums']['wallet_kind'];
          balance_cache: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          kind: Database['public']['Enums']['wallet_kind'];
          balance_cache?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          kind?: Database['public']['Enums']['wallet_kind'];
          balance_cache?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      merchants: {
        Row: {
          id: string;
          owner_id: string;
          wallet_id: string;
          name: string;
          category: string | null;
          address: string | null;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          wallet_id: string;
          name: string;
          category?: string | null;
          address?: string | null;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          wallet_id?: string;
          name?: string;
          category?: string | null;
          address?: string | null;
          logo_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'merchants_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'merchants_wallet_id_fkey';
            columns: ['wallet_id'];
            isOneToOne: true;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          type: Database['public']['Enums']['tx_type'];
          status: Database['public']['Enums']['tx_status'];
          amount: number;
          from_wallet_id: string | null;
          to_wallet_id: string | null;
          merchant_id: string | null;
          memo: string | null;
          idempotency_key: string;
          created_by: string;
          metadata: Json;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          type: Database['public']['Enums']['tx_type'];
          status?: Database['public']['Enums']['tx_status'];
          amount: number;
          from_wallet_id?: string | null;
          to_wallet_id?: string | null;
          merchant_id?: string | null;
          memo?: string | null;
          idempotency_key: string;
          created_by: string;
          metadata?: Json;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          type?: Database['public']['Enums']['tx_type'];
          status?: Database['public']['Enums']['tx_status'];
          amount?: number;
          from_wallet_id?: string | null;
          to_wallet_id?: string | null;
          merchant_id?: string | null;
          memo?: string | null;
          idempotency_key?: string;
          created_by?: string;
          metadata?: Json;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_from_wallet_id_fkey';
            columns: ['from_wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_to_wallet_id_fkey';
            columns: ['to_wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ledger_entries: {
        Row: {
          id: number;
          transaction_id: string;
          wallet_id: string;
          amount: number;
          balance_after: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          transaction_id: string;
          wallet_id: string;
          amount: number;
          balance_after: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          transaction_id?: string;
          wallet_id?: string;
          amount?: number;
          balance_after?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ledger_entries_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ledger_entries_wallet_id_fkey';
            columns: ['wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
        ];
      };
      qr_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'qr_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_requests: {
        Row: {
          id: string;
          merchant_id: string;
          amount: number;
          memo: string | null;
          status: string;
          expires_at: string;
          paid_transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          amount: number;
          memo?: string | null;
          status?: string;
          expires_at: string;
          paid_transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          amount?: number;
          memo?: string | null;
          status?: string;
          expires_at?: string;
          paid_transaction_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_requests_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_requests_paid_transaction_id_fkey';
            columns: ['paid_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      split_requests: {
        Row: {
          id: string;
          creator_id: string;
          total_amount: number;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          total_amount: number;
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          total_amount?: number;
          memo?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'split_requests_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      split_members: {
        Row: {
          id: string;
          split_request_id: string;
          user_id: string;
          amount: number;
          paid_transaction_id: string | null;
        };
        Insert: {
          id?: string;
          split_request_id: string;
          user_id: string;
          amount: number;
          paid_transaction_id?: string | null;
        };
        Update: {
          id?: string;
          split_request_id?: string;
          user_id?: string;
          amount?: number;
          paid_transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'split_members_split_request_id_fkey';
            columns: ['split_request_id'];
            isOneToOne: false;
            referencedRelation: 'split_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'split_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'split_members_paid_transaction_id_fkey';
            columns: ['paid_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      coupons: {
        Row: {
          id: string;
          merchant_id: string | null;
          title: string;
          discount_type: string;
          value: number;
          min_amount: number;
          valid_from: string;
          valid_until: string;
          max_uses: number | null;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          title: string;
          discount_type: string;
          value: number;
          min_amount?: number;
          valid_from?: string;
          valid_until: string;
          max_uses?: number | null;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          title?: string;
          discount_type?: string;
          value?: number;
          min_amount?: number;
          valid_from?: string;
          valid_until?: string;
          max_uses?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'coupons_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      user_coupons: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          used_at: string | null;
          transaction_id: string | null;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          used_at?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          user_id?: string;
          used_at?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_coupons_coupon_id_fkey';
            columns: ['coupon_id'];
            isOneToOne: false;
            referencedRelation: 'coupons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_coupons_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_coupons_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      point_entries: {
        Row: {
          id: number;
          user_id: string;
          delta: number;
          reason: string;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          delta: number;
          reason: string;
          transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          delta?: number;
          reason?: string;
          transaction_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'point_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'point_entries_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string | null;
          handle: string | null;
          display_name: string | null;
          avatar_url: string | null;
        };
        Relationships: [];
      };
      point_balances: {
        Row: {
          user_id: string | null;
          balance: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      register_merchant: {
        Args: { p_name: string; p_category?: string | null; p_address?: string | null };
        Returns: Database['public']['Tables']['merchants']['Row'];
      };
      create_qr_token: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      pay_with_token: {
        Args: { p_token: string; p_amount: number; p_merchant_id: string; p_idempotency_key: string };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      create_payment_request: {
        Args: { p_amount: number; p_memo?: string | null; p_merchant_id?: string | null };
        Returns: Database['public']['Tables']['payment_requests']['Row'];
      };
      get_payment_request: {
        Args: { p_request_id: string };
        Returns: Json;
      };
      cancel_payment_request: {
        Args: { p_request_id: string };
        Returns: Database['public']['Tables']['payment_requests']['Row'];
      };
      pay_request: {
        Args: { p_request_id: string; p_idempotency_key: string; p_user_coupon_id?: string | null };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      pay_static: {
        Args: {
          p_merchant_id: string;
          p_amount: number;
          p_idempotency_key: string;
          p_user_coupon_id?: string | null;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      charge_wallet: {
        Args: { p_amount: number; p_method: string; p_idempotency_key: string };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      withdraw: {
        Args: { p_amount: number; p_idempotency_key: string; p_wallet_id?: string | null };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      my_wallet_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      my_merchant_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      is_split_participant: {
        Args: { p_split_request_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      wallet_kind: 'user' | 'merchant' | 'system';
      tx_type: 'charge' | 'payment' | 'transfer' | 'withdrawal' | 'refund' | 'split';
      tx_status: 'pending' | 'completed' | 'failed' | 'refunded';
      user_role: 'user' | 'merchant' | 'admin';
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
export type FunctionArgs<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns'];
