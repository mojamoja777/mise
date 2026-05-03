// types/database.ts
// Supabase データベースの型定義
// @supabase/supabase-js v2.101+ の GenericTable 形式に準拠

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: "admin" | "buyer";
          company_name: string;
          tenant_id: string;
          customer_code: string | null;
          postal_code: string | null;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          last_chat_seen_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: "admin" | "buyer";
          company_name: string;
          tenant_id: string;
          customer_code?: string | null;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          last_chat_seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          role?: "admin" | "buyer";
          company_name?: string;
          tenant_id?: string;
          customer_code?: string | null;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          last_chat_seen_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      tenants: {
        Row: {
          id: string;
          company_name: string;
          display_name: string;
          postal_code: string | null;
          address: string | null;
          phone: string | null;
          fax: string | null;
          email: string | null;
          website_url: string | null;
          invoice_number: string | null;
          bank_info: string | null;
          representative: string | null;
          logo_url: string | null;
          primary_color: string | null;
          payment_terms_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          display_name: string;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          fax?: string | null;
          email?: string | null;
          website_url?: string | null;
          invoice_number?: string | null;
          bank_info?: string | null;
          representative?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          payment_terms_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_name?: string;
          display_name?: string;
          postal_code?: string | null;
          address?: string | null;
          phone?: string | null;
          fax?: string | null;
          email?: string | null;
          website_url?: string | null;
          invoice_number?: string | null;
          bank_info?: string | null;
          representative?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          payment_terms_days?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          vintage: number | null;
          producer: string | null;
          region: string | null;
          grape_variety: string | null;
          price: number;
          stock: number;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          country: string | null;
          comment: string | null;
          category: string | null;
          type: string | null;
          is_allocation: boolean;
          allocation_deadline: string | null;
          tax_class: "standard" | "reduced" | "exempt";
        };
        Insert: {
          id?: string;
          name: string;
          vintage?: number | null;
          producer?: string | null;
          region?: string | null;
          grape_variety?: string | null;
          price: number;
          stock?: number;
          image_url?: string | null;
          is_active?: boolean;
          country?: string | null;
          comment?: string | null;
          category?: string | null;
          type?: string | null;
          is_allocation?: boolean;
          allocation_deadline?: string | null;
          tax_class?: "standard" | "reduced" | "exempt";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          vintage?: number | null;
          producer?: string | null;
          region?: string | null;
          grape_variety?: string | null;
          price?: number;
          stock?: number;
          image_url?: string | null;
          is_active?: boolean;
          country?: string | null;
          comment?: string | null;
          category?: string | null;
          type?: string | null;
          is_allocation?: boolean;
          allocation_deadline?: string | null;
          tax_class?: "standard" | "reduced" | "exempt";
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          status: "pending" | "confirmed" | "cancelled" | "allocation_pending";
          note: string | null;
          ordered_at: string;
          updated_at: string;
          allocation_decided_at: string | null;
          allocation_decided_by: string | null;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          status?: "pending" | "confirmed" | "cancelled" | "allocation_pending";
          note?: string | null;
          ordered_at?: string;
          updated_at?: string;
          allocation_decided_at?: string | null;
          allocation_decided_by?: string | null;
        };
        Update: {
          status?: "pending" | "confirmed" | "cancelled" | "allocation_pending";
          note?: string | null;
          allocation_decided_at?: string | null;
          allocation_decided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          allocated_quantity: number | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          allocated_quantity?: number | null;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
          allocated_quantity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          id: string;
          buyer_id: string;
          period_start: string;
          period_end: string;
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          note: string | null;
          status: "issued" | "paid";
          issued_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          period_start: string;
          period_end: string;
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          note?: string | null;
          status?: "issued" | "paid";
          issued_at?: string;
          updated_at?: string;
        };
        Update: {
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          note?: string | null;
          status?: "issued" | "paid";
        };
        Relationships: [
          {
            foreignKeyName: "invoices_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          order_id: string | null;
          product_name: string;
          producer: string | null;
          region: string | null;
          vintage: number | null;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          order_id?: string | null;
          product_name: string;
          producer?: string | null;
          region?: string | null;
          vintage?: number | null;
          quantity: number;
          unit_price: number;
          tax_rate?: number;
          sort_order?: number;
        };
        Update: {
          product_name?: string;
          producer?: string | null;
          region?: string | null;
          vintage?: number | null;
          quantity?: number;
          unit_price?: number;
          tax_rate?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          tenant_id: string;
          buyer_id: string;
          sender_id: string;
          sender_role: "admin" | "buyer";
          body: string;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          buyer_id: string;
          sender_id: string;
          sender_role: "admin" | "buyer";
          body: string;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          body?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      chat_read_states: {
        Row: {
          admin_id: string;
          buyer_id: string;
          last_read_at: string;
        };
        Insert: {
          admin_id: string;
          buyer_id: string;
          last_read_at?: string;
        };
        Update: {
          last_read_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      confirm_product_allocations: {
        Args: {
          p_product_id: string;
          p_decisions: Array<{
            order_item_id: string;
            allocated_quantity: number;
          }>;
          p_admin_id: string;
        };
        Returns: void;
      };
      list_admin_chat_threads: {
        Args: {
          p_admin_id: string;
        };
        Returns: Array<{
          buyer_id: string;
          company_name: string;
          customer_code: string | null;
          is_active: boolean;
          last_body: string | null;
          last_sender_role: "admin" | "buyer" | null;
          last_created_at: string | null;
          last_deleted_at: string | null;
          unread_count: number;
        }>;
      };
    };
    Enums: Record<string, never>;
  };
};
