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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          diagnosis: string | null
          doctor_id: string | null
          doctor_name: string | null
          id: string
          notes: string | null
          patient_id: string
          prescription: string | null
          reason: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          token_number: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescription?: string | null
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          token_number?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          token_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          ip_address: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
          ip_address?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
          ip_address?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number
          id: string
          next_followup_date: string | null
          notes: string | null
          outcome: string | null
          patient_id: string | null
          phone: string
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number
          id?: string
          next_followup_date?: string | null
          notes?: string | null
          outcome?: string | null
          patient_id?: string | null
          phone: string
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number
          id?: string
          next_followup_date?: string | null
          notes?: string | null
          outcome?: string | null
          patient_id?: string | null
          phone?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          is_done: boolean
          message: string | null
          outcome: string | null
          patient_id: string
          type: Database["public"]["Enums"]["followup_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          is_done?: boolean
          message?: string | null
          outcome?: string | null
          patient_id: string
          type?: Database["public"]["Enums"]["followup_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          is_done?: boolean
          message?: string | null
          outcome?: string | null
          patient_id?: string
          type?: Database["public"]["Enums"]["followup_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          paid_amount: number
          patient_id: string
          payment_mode: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          paid_amount?: number
          patient_id: string
          payment_mode?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          paid_amount?: number
          patient_id?: string
          payment_mode?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          appointment_id: string | null
          approved_at: string | null
          approved_by: string | null
          barcode: string | null
          category: string
          collected_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_abnormal: boolean
          patient_id: string
          price: number
          report_url: string | null
          result_summary: string | null
          result_values: Json
          status: Database["public"]["Enums"]["lab_status"]
          test_name: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          category?: string
          collected_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_abnormal?: boolean
          patient_id: string
          price?: number
          report_url?: string | null
          result_summary?: string | null
          result_values?: Json
          status?: Database["public"]["Enums"]["lab_status"]
          test_name: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          category?: string
          collected_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_abnormal?: boolean
          patient_id?: string
          price?: number
          report_url?: string | null
          result_summary?: string | null
          result_values?: Json
          status?: Database["public"]["Enums"]["lab_status"]
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          allergies: string | null
          alt_phone: string | null
          blood_group: string | null
          chronic_conditions: string | null
          city: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          gender: string
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          lead_source: string | null
          notes: string | null
          phone: string
          referring_doctor: string | null
          uhid: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          alt_phone?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          gender?: string
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          lead_source?: string | null
          notes?: string | null
          phone: string
          referring_doctor?: string | null
          uhid?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          alt_phone?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          gender?: string
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string
          referring_doctor?: string | null
          uhid?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          designation: string | null
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_code?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "owner"
        | "admin"
        | "receptionist"
        | "doctor"
        | "pathologist"
        | "lab_technician"
        | "radiologist"
        | "nurse"
        | "pharmacist"
        | "billing"
        | "accountant"
        | "telecaller"
        | "marketing"
        | "followup"
        | "patient"
      appointment_status:
        | "scheduled"
        | "checked_in"
        | "in_consultation"
        | "completed"
        | "cancelled"
        | "no_show"
      call_direction: "outgoing" | "incoming" | "missed"
      followup_type:
        | "medicine"
        | "appointment"
        | "lab"
        | "payment"
        | "revisit"
        | "vaccination"
        | "birthday"
        | "campaign"
        | "custom"
      invoice_status:
        | "draft"
        | "unpaid"
        | "partial"
        | "paid"
        | "refunded"
        | "cancelled"
      lab_status:
        | "ordered"
        | "sample_collected"
        | "processing"
        | "completed"
        | "approved"
        | "cancelled"
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
      app_role: [
        "super_admin",
        "owner",
        "admin",
        "receptionist",
        "doctor",
        "pathologist",
        "lab_technician",
        "radiologist",
        "nurse",
        "pharmacist",
        "billing",
        "accountant",
        "telecaller",
        "marketing",
        "followup",
        "patient",
      ],
      appointment_status: [
        "scheduled",
        "checked_in",
        "in_consultation",
        "completed",
        "cancelled",
        "no_show",
      ],
      call_direction: ["outgoing", "incoming", "missed"],
      followup_type: [
        "medicine",
        "appointment",
        "lab",
        "payment",
        "revisit",
        "vaccination",
        "birthday",
        "campaign",
        "custom",
      ],
      invoice_status: [
        "draft",
        "unpaid",
        "partial",
        "paid",
        "refunded",
        "cancelled",
      ],
      lab_status: [
        "ordered",
        "sample_collected",
        "processing",
        "completed",
        "approved",
        "cancelled",
      ],
    },
  },
} as const
