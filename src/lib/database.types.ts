export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          name: string
          role: string
          user_rights: string
          enabled: boolean
          profile_picture_url: string | null
          customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          name: string
          role?: string
          user_rights?: string
          enabled?: boolean
          profile_picture_url?: string | null
          customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          name?: string
          role?: string
          user_rights?: string
          enabled?: boolean
          profile_picture_url?: string | null
          customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          name: string
          description: string | null
          sku: string | null
          category: string | null
          unit: string
          quantity_in_stock: number
          reorder_point: number
          unit_cost: number
          sales_sold: number
          is_finished_product: boolean
          vendor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sku?: string | null
          category?: string | null
          unit?: string
          quantity_in_stock?: number
          reorder_point?: number
          unit_cost?: number
          sales_sold?: number
          is_finished_product?: boolean
          vendor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sku?: string | null
          category?: string | null
          unit?: string
          quantity_in_stock?: number
          reorder_point?: number
          unit_cost?: number
          sales_sold?: number
          is_finished_product?: boolean
          vendor_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          contact_name: string | null
          rating: number | null
          rating_count: number
          rating_average: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          contact_name?: string | null
          rating?: number | null
          rating_count?: number
          rating_average?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          contact_name?: string | null
          rating?: number | null
          rating_count?: number
          rating_average?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          vendor_id: string
          po_reference: string | null
          status: string
          notes: string | null
          total_amount: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          po_reference?: string | null
          status?: string
          notes?: string | null
          total_amount?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          po_reference?: string | null
          status?: string
          notes?: string | null
          total_amount?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          inventory_item_id: string
          quantity_ordered: number
          quantity_received: number
          remaining_quantity: number
          unit_cost: number | null
          vendor_item_code: string | null
          lead_time_days: number | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          inventory_item_id: string
          quantity_ordered: number
          quantity_received?: number
          remaining_quantity?: number
          unit_cost?: number | null
          vendor_item_code?: string | null
          lead_time_days?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string
          inventory_item_id?: string
          quantity_ordered?: number
          quantity_received?: number
          remaining_quantity?: number
          unit_cost?: number | null
          vendor_item_code?: string | null
          lead_time_days?: number | null
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          vendor_id: string
          status: string
          expected_date: string | null
          notes: string | null
          total_amount: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_number: string
          vendor_id: string
          status?: string
          expected_date?: string | null
          notes?: string | null
          total_amount?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_number?: string
          vendor_id?: string
          status?: string
          expected_date?: string | null
          notes?: string | null
          total_amount?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          inventory_item_id: string
          quantity: number
          unit_cost: number | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_order_id: string
          inventory_item_id: string
          quantity?: number
          unit_cost?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          purchase_order_id?: string
          inventory_item_id?: string
          quantity?: number
          unit_cost?: number | null
          created_at?: string
        }
      }
      boms: {
        Row: {
          id: string
          name: string
          description: string | null
          finished_product_id: string
          output_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          finished_product_id: string
          output_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          finished_product_id?: string
          output_quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      bom_components: {
        Row: {
          id: string
          bom_id: string
          inventory_item_id: string
          quantity_required: number
          created_at: string
        }
        Insert: {
          id?: string
          bom_id: string
          inventory_item_id: string
          quantity_required: number
          created_at?: string
        }
        Update: {
          id?: string
          bom_id?: string
          inventory_item_id?: string
          quantity_required?: number
          created_at?: string
        }
      }
      assemblies: {
        Row: {
          id: string
          bom_id: string
          quantity: number
          po_number: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bom_id: string
          quantity: number
          po_number?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bom_id?: string
          quantity?: number
          po_number?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      assembly_units: {
        Row: {
          id: string
          assembly_id: string
          serial_number: string | null
          unit_cost: number | null
          created_at: string
        }
        Insert: {
          id?: string
          assembly_id: string
          serial_number?: string | null
          unit_cost?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          assembly_id?: string
          serial_number?: string | null
          unit_cost?: number | null
          created_at?: string
        }
      }
      assembly_components: {
        Row: {
          id: string
          assembly_id: string
          inventory_item_id: string
          purchase_item_id: string | null
          quantity_used: number
          serial_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          assembly_id: string
          inventory_item_id: string
          purchase_item_id?: string | null
          quantity_used: number
          serial_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          assembly_id?: string
          inventory_item_id?: string
          purchase_item_id?: string | null
          quantity_used?: number
          serial_number?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          customer_company: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_company: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_company?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          source: string | null
          status: string
          industry: string | null
          notes: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          industry?: string | null
          notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          industry?: string | null
          notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prospects: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          status: string
          notes: string | null
          lead_id: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          status?: string
          notes?: string | null
          lead_id?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          status?: string
          notes?: string | null
          lead_id?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string
          order_number: string | null
          status: string
          total_amount: number | null
          discount: number | null
          tax: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          order_number?: string | null
          status?: string
          total_amount?: number | null
          discount?: number | null
          tax?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          order_number?: string | null
          status?: string
          total_amount?: number | null
          discount?: number | null
          tax?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          inventory_item_id: string
          assembly_unit_id: string | null
          quantity: number
          unit_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          inventory_item_id: string
          assembly_unit_id?: string | null
          quantity?: number
          unit_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          inventory_item_id?: string
          assembly_unit_id?: string | null
          quantity?: number
          unit_price?: number | null
          created_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          sale_id: string
          status: string
          delivery_date: string | null
          tracking_number: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          status?: string
          delivery_date?: string | null
          tracking_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          status?: string
          delivery_date?: string | null
          tracking_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      delivery_items: {
        Row: {
          id: string
          delivery_id: string
          sale_item_id: string
          quantity_delivered: number
          created_at: string
        }
        Insert: {
          id?: string
          delivery_id: string
          sale_item_id: string
          quantity_delivered?: number
          created_at?: string
        }
        Update: {
          id?: string
          delivery_id?: string
          sale_item_id?: string
          quantity_delivered?: number
          created_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          name: string
          serial_number: string | null
          model: string | null
          customer_id: string | null
          status: string
          last_seen: string | null
          uptime_seconds: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          serial_number?: string | null
          model?: string | null
          customer_id?: string | null
          status?: string
          last_seen?: string | null
          uptime_seconds?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          serial_number?: string | null
          model?: string | null
          customer_id?: string | null
          status?: string
          last_seen?: string | null
          uptime_seconds?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      device_issue_types: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          priority: string
          device_id: string | null
          customer_id: string | null
          created_by: string | null
          assigned_to: string | null
          issue_type_id: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          device_id?: string | null
          customer_id?: string | null
          created_by?: string | null
          assigned_to?: string | null
          issue_type_id?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          device_id?: string | null
          customer_id?: string | null
          created_by?: string | null
          assigned_to?: string | null
          issue_type_id?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      ticket_message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          media_url: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          content: string
          media_url?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          content?: string
          media_url?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: Json | null
          created_at?: string
        }
      }
      dropdown_types: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      dropdown_values: {
        Row: {
          id: string
          dropdown_type_id: string
          value: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          dropdown_type_id: string
          value: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          dropdown_type_id?: string
          value?: string
          sort_order?: number
          created_at?: string
        }
      }
      help_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      help_articles: {
        Row: {
          id: string
          category_id: string
          title: string
          content: string
          tags: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          title: string
          content: string
          tags?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          content?: string
          tags?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      system_requests: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: string
          priority: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      foreign_exchange_rates: {
        Row: {
          id: string
          currency_code: string
          currency_name: string
          inr_per_unit: number
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          currency_code: string
          currency_name: string
          inr_per_unit?: number
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          currency_code?: string
          currency_name?: string
          inr_per_unit?: number
          updated_by?: string | null
          updated_at?: string
        }
      }
      assembly_files: {
        Row: {
          id: string
          assembly_id: string
          file_name: string
          file_url: string
          file_size: number | null
          file_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          assembly_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          assembly_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          file_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
    }
  }
}
