 
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
      bom_categories: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bom_headers: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          product_name: string
          status: string | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          product_name: string
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          product_name?: string
          status?: string | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      bom_items: {
        Row: {
          bom_header_id: string
          created_at: string | null
          formula: string | null
          id: string
          inventory_item_id: string | null
          item_name: string
          notes: string | null
          quantity: number
          total_cost: number | null
          unit: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          bom_header_id: string
          created_at?: string | null
          formula?: string | null
          id?: string
          inventory_item_id?: string | null
          item_name: string
          notes?: string | null
          quantity: number
          total_cost?: number | null
          unit: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          bom_header_id?: string
          created_at?: string | null
          formula?: string | null
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          notes?: string | null
          quantity?: number
          total_cost?: number | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "bom_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_templates: {
        Row: {
          base_batch_size: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          plant_type_id: string | null
          status: string
          updated_at: string | null
          variety: string | null
        }
        Insert: {
          base_batch_size: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          plant_type_id?: string | null
          status?: string
          updated_at?: string | null
          variety?: string | null
        }
        Update: {
          base_batch_size?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          plant_type_id?: string | null
          status?: string
          updated_at?: string | null
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_templates_plant_type_id_fkey"
            columns: ["plant_type_id"]
            isOneToOne: false
            referencedRelation: "plant_types"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_templates: {
        Row: {
          created_at: string | null
          description: string | null
          formula: string
          id: string
          name: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          formula: string
          id?: string
          name: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          formula?: string
          id?: string
          name?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      harvests: {
        Row: {
          created_at: string | null
          harvest_date: string
          id: string
          is_closed: boolean
          notes: string | null
          planting_id: string
          quality: string
          quantity_harvested: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          harvest_date: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          planting_id: string
          quality?: string
          quantity_harvested: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          harvest_date?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          planting_id?: string
          quality?: string
          quantity_harvested?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvests_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string | null
          current_stock: number
          description: string | null
          id: string
          minimum_stock: number | null
          name: string
          unit_of_measure: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          minimum_stock?: number | null
          name: string
          unit_of_measure: string
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_stock?: number
          description?: string | null
          id?: string
          minimum_stock?: number | null
          name?: string
          unit_of_measure?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_units: {
        Row: {
          abbreviation: string
          created_at: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          abbreviation: string
          created_at?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          capacity: number
          created_at: string | null
          current_occupancy: number
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          current_occupancy?: number
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          current_occupancy?: number
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
          resource: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name?: string
          resource?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
          resource?: string | null
        }
        Relationships: []
      }
      plant_types: {
        Row: {
          created_at: string | null
          description: string | null
          germination_rate: number | null
          growth_duration: number
          id: string
          name: string
          updated_at: string | null
          variety: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          germination_rate?: number | null
          growth_duration: number
          id?: string
          name: string
          updated_at?: string | null
          variety: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          germination_rate?: number | null
          growth_duration?: number
          id?: string
          name?: string
          updated_at?: string | null
          variety?: string
        }
        Relationships: []
      }
      planting_bom_costs: {
        Row: {
          actual_cost_per_seedling: number | null
          actual_fertilizer_cost: number | null
          actual_labor_cost: number | null
          actual_medium_cost: number | null
          actual_overhead_cost: number | null
          actual_seed_cost: number | null
          actual_total_cost: number | null
          actual_tray_cost: number | null
          actual_treatment_cost: number | null
          actual_utilities_cost: number | null
          bom_template_id: string | null
          calculation_date: string | null
          cost_variance: number | null
          estimated_cost_per_seedling: number | null
          estimated_fertilizer_cost: number | null
          estimated_labor_cost: number | null
          estimated_medium_cost: number | null
          estimated_overhead_cost: number | null
          estimated_seed_cost: number | null
          estimated_total_cost: number | null
          estimated_tray_cost: number | null
          estimated_treatment_cost: number | null
          estimated_utilities_cost: number | null
          id: string
          last_updated: string | null
          planting_id: string
          variance_percentage: number | null
        }
        Insert: {
          actual_cost_per_seedling?: number | null
          actual_fertilizer_cost?: number | null
          actual_labor_cost?: number | null
          actual_medium_cost?: number | null
          actual_overhead_cost?: number | null
          actual_seed_cost?: number | null
          actual_total_cost?: number | null
          actual_tray_cost?: number | null
          actual_treatment_cost?: number | null
          actual_utilities_cost?: number | null
          bom_template_id?: string | null
          calculation_date?: string | null
          cost_variance?: number | null
          estimated_cost_per_seedling?: number | null
          estimated_fertilizer_cost?: number | null
          estimated_labor_cost?: number | null
          estimated_medium_cost?: number | null
          estimated_overhead_cost?: number | null
          estimated_seed_cost?: number | null
          estimated_total_cost?: number | null
          estimated_tray_cost?: number | null
          estimated_treatment_cost?: number | null
          estimated_utilities_cost?: number | null
          id?: string
          last_updated?: string | null
          planting_id: string
          variance_percentage?: number | null
        }
        Update: {
          actual_cost_per_seedling?: number | null
          actual_fertilizer_cost?: number | null
          actual_labor_cost?: number | null
          actual_medium_cost?: number | null
          actual_overhead_cost?: number | null
          actual_seed_cost?: number | null
          actual_total_cost?: number | null
          actual_tray_cost?: number | null
          actual_treatment_cost?: number | null
          actual_utilities_cost?: number | null
          bom_template_id?: string | null
          calculation_date?: string | null
          cost_variance?: number | null
          estimated_cost_per_seedling?: number | null
          estimated_fertilizer_cost?: number | null
          estimated_labor_cost?: number | null
          estimated_medium_cost?: number | null
          estimated_overhead_cost?: number | null
          estimated_seed_cost?: number | null
          estimated_total_cost?: number | null
          estimated_tray_cost?: number | null
          estimated_treatment_cost?: number | null
          estimated_utilities_cost?: number | null
          id?: string
          last_updated?: string | null
          planting_id?: string
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planting_bom_costs_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: true
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_treatments: {
        Row: {
          planting_id: string
          treatment_id: string
        }
        Insert: {
          planting_id: string
          treatment_id: string
        }
        Update: {
          planting_id?: string
          treatment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planting_treatments_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      plantings: {
        Row: {
          batch_number: string
          created_at: string | null
          date_planted: string
          expected_harvest_date: string
          id: string
          location_id: string
          notes: string | null
          plant_type_id: string
          quantity: number
          remaining_quantity: number | null
          status: string
          updated_at: string | null
          variety: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          date_planted: string
          expected_harvest_date: string
          id?: string
          location_id: string
          notes?: string | null
          plant_type_id: string
          quantity: number
          remaining_quantity?: number | null
          status?: string
          updated_at?: string | null
          variety?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          date_planted?: string
          expected_harvest_date?: string
          id?: string
          location_id?: string
          notes?: string | null
          plant_type_id?: string
          quantity?: number
          remaining_quantity?: number | null
          status?: string
          updated_at?: string | null
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantings_plant_type_id_fkey"
            columns: ["plant_type_id"]
            isOneToOne: false
            referencedRelation: "plant_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          amount_paid: number | null
          collection_date: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          final_quantity: number | null
          id: string
          notes: string | null
          payment_status: string
          planting_id: string
          quantity_reserved: number
          reserved_date: string
          status: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          collection_date?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          final_quantity?: number | null
          id?: string
          notes?: string | null
          payment_status?: string
          planting_id: string
          quantity_reserved: number
          reserved_date: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          collection_date?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          final_quantity?: number | null
          id?: string
          notes?: string | null
          payment_status?: string
          planting_id?: string
          quantity_reserved?: number
          reserved_date?: string
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_planting_id_fkey"
            columns: ["planting_id"]
            isOneToOne: false
            referencedRelation: "plantings"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string | null
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string | null
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          transaction_date: string | null
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          application_date: string
          application_method: string
          applied_by: string | null
          created_at: string | null
          dosage: string
          id: string
          name: string
          notes: string | null
          planting_ids: string[]
          type: string
          updated_at: string | null
        }
        Insert: {
          application_date: string
          application_method: string
          applied_by?: string | null
          created_at?: string | null
          dosage: string
          id?: string
          name: string
          notes?: string | null
          planting_ids: string[]
          type: string
          updated_at?: string | null
        }
        Update: {
          application_date?: string
          application_method?: string
          applied_by?: string | null
          created_at?: string | null
          dosage?: string
          id?: string
          name?: string
          notes?: string | null
          planting_ids?: string[]
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_role: {
        Args: { check_user_id: string; required_role: string }
        Returns: boolean
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      has_role: {
        Args: { required_role: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "manager" | "staff" | "viewer"
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
      user_role: ["admin", "manager", "staff", "viewer"],
    },
  },
} as const
