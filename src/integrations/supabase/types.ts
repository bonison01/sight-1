//Users/apple/Documents/GitHub/sight/src/integrations/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }

      banner_settings: {
        Row: {
          banner_height: number | null
          banner_width: number | null
          button_link: string
          button_text: string
          created_at: string
          display_order: number | null
          id: string
          image_position: string | null
          image_url: string
          is_active: boolean
          is_published: boolean | null
          overlay_opacity: number | null
          secondary_button_link: string
          secondary_button_text: string
          subtitle: string
          text_position: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_height?: number | null
          banner_width?: number | null
          button_link?: string
          button_text?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_position?: string | null
          image_url?: string
          is_active?: boolean
          is_published?: boolean | null
          overlay_opacity?: number | null
          secondary_button_link?: string
          secondary_button_text?: string
          subtitle?: string
          text_position?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          banner_height?: number | null
          banner_width?: number | null
          button_link?: string
          button_text?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_position?: string | null
          image_url?: string
          is_active?: boolean
          is_published?: boolean | null
          overlay_opacity?: number | null
          secondary_button_link?: string
          secondary_button_text?: string
          subtitle?: string
          text_position?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }

      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }

      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }

      orders: {
        Row: {
          courier_contact: string | null
          courier_name: string | null
          created_at: string | null
          delivery_address: Json | null
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_screenshot_url: string | null
          phone: string | null
          shipping_status: string | null
          status: string
          total_amount: number
          tracking_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          courier_contact?: string | null
          courier_name?: string | null
          created_at?: string | null
          delivery_address?: Json | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_screenshot_url?: string | null
          phone?: string | null
          shipping_status?: string | null
          status?: string
          total_amount: number
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          courier_contact?: string | null
          courier_name?: string | null
          created_at?: string | null
          delivery_address?: Json | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_screenshot_url?: string | null
          phone?: string | null
          shipping_status?: string | null
          status?: string
          total_amount?: number
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }

      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          featured: boolean | null
          features: string[] | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          ingredients: string | null
          is_active: boolean | null
          name: string
          nutrition_facts: Json | null
          offer_price: number | null
          offers: string | null
          price: number
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          ingredients?: string | null
          is_active?: boolean | null
          name: string
          nutrition_facts?: Json | null
          offer_price?: number | null
          offers?: string | null
          price: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          ingredients?: string | null
          is_active?: boolean | null
          name?: string
          nutrition_facts?: Json | null
          offer_price?: number | null
          offers?: string | null
          price?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }

      product_variants: {
        Row: {
          id: string
          product_id: string
          color: string | null
          size: string | null
          price: number | null
          stock_quantity: number | null
          image_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          color?: string | null
          size?: string | null
          price?: number | null
          stock_quantity?: number | null
          image_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          color?: string | null
          size?: string | null
          price?: number | null
          stock_quantity?: number | null
          image_url?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }

      profiles: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          reset_code: string | null
          reset_code_expires: string | null
          role: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          reset_code?: string | null
          reset_code_expires?: string | null
          role?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          reset_code?: string | null
          reset_code_expires?: string | null
          role?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_verified_purchase: boolean | null
          product_id: string | null
          rating: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reviews_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      /* ============================================================
         🔥 NEW TABLE 1: INVOICES
      ============================================================ */
      invoices: {
        Row: {
          id: string
          user_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_address: string | null
          invoice_number: string
          subtotal: number
          tax_amount: number | null
          discount_amount: number | null
          grand_total: number
          paid_amount: number | null
          status: "unpaid" | "partial" | "paid"
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_address?: string | null
          invoice_number: string
          subtotal: number
          tax_amount?: number | null
          discount_amount?: number | null
          grand_total: number
          paid_amount?: number | null
          status?: "unpaid" | "partial" | "paid"
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_address?: string | null
          invoice_number?: string
          subtotal?: number
          tax_amount?: number | null
          discount_amount?: number | null
          grand_total?: number
          paid_amount?: number | null
          status?: "unpaid" | "partial" | "paid"
          created_at?: string | null
        }
        Relationships: []
      }

      /* ============================================================
         🔥 NEW TABLE 2: INVOICE ITEMS
      ============================================================ */
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          item_code: string | null
          product_id: string | null
          variant_id: string | null
          quantity: number
          rate: number
          amount: number
          created_at: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          item_code?: string | null
          product_id?: string | null
          variant_id?: string | null
          quantity: number
          rate: number
          amount: number
          created_at?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          item_code?: string | null
          product_id?: string | null
          variant_id?: string | null
          quantity?: number
          rate?: number
          amount?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }

      /* ============================================================
         🔥 NEW TABLE 3: INVOICE BRANDING
      ============================================================ */
      invoice_branding: {
        Row: {
          id: string
          user_id: string
          payment_details: string | null
          signature_url: string | null
          stamp_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          payment_details?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          payment_details?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      /* ============================================================
         🔥 NEW TABLE 4: COMPANY PROFILE
      ============================================================ */
      company_profile: {
        Row: {
          id: string
          company_name: string
          address: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_name: string
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_name?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      check_user_is_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      create_admin_notification: {
        Args: {
          notification_message: string
          notification_title: string
          notification_type: string
          related_order_id?: string
          related_user_id?: string
        }
        Returns: string
      }
      create_admin_user: {
        Args: { user_email: string }
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      promote_user_to_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
      request_password_reset: {
        Args: { user_email: string; user_phone: string }
        Returns: {
          error_message: string
          reset_code: string
          success: boolean
        }[]
      }
      verify_reset_code: {
        Args: { code: string; user_email: string; user_phone: string }
        Returns: {
          error_message: string
          success: boolean
          user_id: string
        }[]
      }
    }

    Enums: {
      product_category: "chicken" | "red_meat" | "chilli_condiments" | "other"
      user_role: "admin" | "paying_user" | "free_user"
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
