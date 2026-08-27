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
      terceros: {
        Row: {
          id: string
          user_id: string | null
          doc_type: string
          doc_number: string
          name: string
          phone: string | null
          address: string | null
          email: string | null
          nequi_number: string | null
          whatsapp_number: string | null
          birth_date: string | null
          driver_license_number: string | null
          driver_license_expiration: string | null
          is_owner: boolean
          is_service_client: boolean
          is_driver: boolean
          is_supplier: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          doc_type?: string
          doc_number: string
          name: string
          phone?: string | null
          address?: string | null
          email?: string | null
          nequi_number?: string | null
          whatsapp_number?: string | null
          birth_date?: string | null
          driver_license_number?: string | null
          driver_license_expiration?: string | null
          is_owner?: boolean
          is_service_client?: boolean
          is_driver?: boolean
          is_supplier?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          doc_type?: string
          doc_number?: string
          name?: string
          phone?: string | null
          address?: string | null
          email?: string | null
          nequi_number?: string | null
          whatsapp_number?: string | null
          birth_date?: string | null
          driver_license_number?: string | null
          driver_license_expiration?: string | null
          is_owner?: boolean
          is_service_client?: boolean
          is_driver?: boolean
          is_supplier?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terceros_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      servicios: {
        Row: {
          id: string
          name: string
          tercero_id: string
          status: 'activo' | 'inactivo'
          start_date: string
          end_date: string | null
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          tercero_id: string
          status?: 'activo' | 'inactivo'
          start_date?: string
          end_date?: string | null
          level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          tercero_id?: string
          status?: 'activo' | 'inactivo'
          start_date?: string
          end_date?: string | null
          level?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicios_tercero_id_fkey"
            columns: ["tercero_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          }
        ]
      }
      marcas: {
        Row: {
          id: string
          name: string
          country: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          country?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          country?: string | null
          created_at?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          id: string
          plate: string
          owner_id: string
          servicio_id: string
          model: string
          displacement: string | null
          fuel_type: string | null
          passenger_capacity: number | null
          serial_number: string | null
          chassis_number: string | null
          engine_number: string | null
          color: string | null
          affiliated_company_id: string | null
          driver_id: string | null
          marca_id: string | null
          operation_card_number: string | null
          operation_card_expedition: string | null
          operation_card_validity_start: string | null
          operation_card_validity_end: string | null
          daily_fee: number
          start_shift_time: string | null
          end_shift_time: string | null
          savings_amount: number | null
          status: 'disponible' | 'en_servicio' | 'fuera_de_servicio' | 'sin_conexion'
          last_known_lat: number | null
          last_known_lng: number | null
          last_location_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plate: string
          owner_id: string
          servicio_id: string
          model: string
          displacement?: string | null
          fuel_type?: string | null
          passenger_capacity?: number | null
          serial_number?: string | null
          chassis_number?: string | null
          engine_number?: string | null
          color?: string | null
          affiliated_company_id?: string | null
          driver_id?: string | null
          marca_id?: string | null
          operation_card_number?: string | null
          operation_card_expedition?: string | null
          operation_card_validity_start?: string | null
          operation_card_validity_end?: string | null
          daily_fee?: number
          start_shift_time?: string | null
          end_shift_time?: string | null
          savings_amount?: number | null
          status?: 'disponible' | 'en_servicio' | 'fuera_de_servicio' | 'sin_conexion'
          last_known_lat?: number | null
          last_known_lng?: number | null
          last_location_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plate?: string
          owner_id?: string
          servicio_id?: string
          model?: string
          displacement?: string | null
          fuel_type?: string | null
          passenger_capacity?: number | null
          serial_number?: string | null
          chassis_number?: string | null
          engine_number?: string | null
          color?: string | null
          affiliated_company_id?: string | null
          driver_id?: string | null
          marca_id?: string | null
          operation_card_number?: string | null
          operation_card_expedition?: string | null
          operation_card_validity_start?: string | null
          operation_card_validity_end?: string | null
          daily_fee?: number
          start_shift_time?: string | null
          end_shift_time?: string | null
          savings_amount?: number | null
          status?: 'disponible' | 'en_servicio' | 'fuera_de_servicio' | 'sin_conexion'
          last_known_lat?: number | null
          last_known_lng?: number | null
          last_location_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_servicio_id_fkey"
            columns: ["servicio_id"]
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_driver_id_fkey"
            columns: ["driver_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_marca_id_fkey"
            columns: ["marca_id"]
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          }
        ]
      }
      tarjeta_opera: {
        Row: {
          id: string
          document_count: number
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          document_count?: number
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          document_count?: number
          description?: string
          created_at?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          id: string
          name: string
          kms_interval: number | null
          months_interval: number | null
          applies_by: 'kilometros' | 'meses' | 'kilometros_y_meses' | 'ninguno'
          estimated_value: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          kms_interval?: number | null
          months_interval?: number | null
          applies_by?: 'kilometros' | 'meses' | 'kilometros_y_meses' | 'ninguno'
          estimated_value?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          kms_interval?: number | null
          months_interval?: number | null
          applies_by?: 'kilometros' | 'meses' | 'kilometros_y_meses' | 'ninguno'
          estimated_value?: number | null
          created_at?: string
        }
        Relationships: []
      }
      produccion: {
        Row: {
          id: string
          vehiculo_id: string
          date: string
          amount: number
          deduction: number
          status: 'trabajo' | 'pico_y_placa' | 'taller' | 'descanso'
          mileage: number | null
          savings_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehiculo_id: string
          date?: string
          amount?: number
          deduction?: number
          status?: 'trabajo' | 'pico_y_placa' | 'taller' | 'descanso'
          mileage?: number | null
          savings_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehiculo_id?: string
          date?: string
          amount?: number
          deduction?: number
          status?: 'trabajo' | 'pico_y_placa' | 'taller' | 'descanso'
          mileage?: number | null
          savings_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produccion_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          }
        ]
      }
      control: {
        Row: {
          id: string
          date: string
          evento_id: string
          vehiculo_id: string
          unit_value: number
          quantity: number
          total_value: number
          current_mileage: number
          next_change_mileage: number
          next_change_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date?: string
          evento_id: string
          vehiculo_id: string
          unit_value?: number
          quantity?: number
          total_value?: number
          current_mileage?: number
          next_change_mileage?: number
          next_change_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          evento_id?: string
          vehiculo_id?: string
          unit_value?: number
          quantity?: number
          total_value?: number
          current_mileage?: number
          next_change_mileage?: number
          next_change_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_evento_id_fkey"
            columns: ["evento_id"]
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          }
        ]
      }
      mantenimiento: {
        Row: {
          id: string
          date: string
          vehiculo_id: string
          supplier_id: string
          detail: string
          total_value: number
          current_mileage: number
          created_at: string
        }
        Insert: {
          id?: string
          date?: string
          vehiculo_id: string
          supplier_id: string
          detail: string
          total_value?: number
          current_mileage?: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          vehiculo_id?: string
          supplier_id?: string
          detail?: string
          total_value?: number
          current_mileage?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimiento_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimiento_supplier_id_fkey"
            columns: ["supplier_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          }
        ]
      }
      meses: {
        Row: {
          id: number
          name: string
          total_days: number
        }
        Insert: {
          id: number
          name: string
          total_days: number
        }
        Update: {
          id?: number
          name?: string
          total_days?: number
        }
        Relationships: []
      }
      s_social: {
        Row: {
          id: string
          tercero_id: string
          date: string
          evento_id: string | null
          month_value: number
          days_paid: number
          payment_amount: number
          mes_id: number
          created_at: string
        }
        Insert: {
          id?: string
          tercero_id: string
          date?: string
          evento_id?: string | null
          month_value?: number
          days_paid?: number
          payment_amount?: number
          mes_id: number
          created_at?: string
        }
        Update: {
          id?: string
          tercero_id?: string
          date?: string
          evento_id?: string | null
          month_value?: number
          days_paid?: number
          payment_amount?: number
          mes_id?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "s_social_tercero_id_fkey"
            columns: ["tercero_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s_social_evento_id_fkey"
            columns: ["evento_id"]
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s_social_mes_id_fkey"
            columns: ["mes_id"]
            referencedRelation: "meses"
            referencedColumns: ["id"]
          }
        ]
      }
      liquidacion: {
        Row: {
          id: string
          tercero_id: string
          payment_date: string
          from_date: string
          to_date: string
          detail: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          tercero_id: string
          payment_date?: string
          from_date: string
          to_date: string
          detail: string
          amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          tercero_id?: string
          payment_date?: string
          from_date?: string
          to_date?: string
          detail?: string
          amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_tercero_id_fkey"
            columns: ["tercero_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          }
        ]
      }
      tracking_sessions: {
        Row: {
          id: string
          vehiculo_id: string
          driver_tercero_id: string
          started_at: string
          ended_at: string | null
          status: 'active' | 'completed' | 'cancelled'
          total_distance_meters: number | null
          total_positions_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          vehiculo_id: string
          driver_tercero_id: string
          started_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          total_distance_meters?: number | null
          total_positions_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          vehiculo_id?: string
          driver_tercero_id?: string
          started_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          total_distance_meters?: number | null
          total_positions_count?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_sessions_driver_tercero_id_fkey"
            columns: ["driver_tercero_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          }
        ]
      }
      gps_positions: {
        Row: {
          id: number
          session_id: string
          vehiculo_id: string
          latitude: number
          longitude: number
          altitude: number | null
          speed: number | null
          heading: number | null
          accuracy: number | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: number
          session_id: string
          vehiculo_id: string
          latitude: number
          longitude: number
          altitude?: number | null
          speed?: number | null
          heading?: number | null
          accuracy?: number | null
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          session_id?: string
          vehiculo_id?: string
          latitude?: number
          longitude?: number
          altitude?: number | null
          speed?: number | null
          heading?: number | null
          accuracy?: number | null
          recorded_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_positions_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_positions_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          }
        ]
      }
      carreras: {
        Row: {
          id: string
          client_name: string
          client_phone: string
          origin_address: string
          destination_address: string
          origin_lat: number | null
          origin_lng: number | null
          destination_lat: number | null
          destination_lng: number | null
          notes: string | null
          status: 'pendiente' | 'asignado' | 'aceptado' | 'en_curso' | 'completado' | 'cancelado'
          cancel_reason: string | null
          vehiculo_id: string | null
          driver_tercero_id: string | null
          assigned_at: string | null
          accepted_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          tracking_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_name: string
          client_phone: string
          origin_address: string
          destination_address: string
          origin_lat?: number | null
          origin_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          notes?: string | null
          status?: 'pendiente' | 'asignado' | 'aceptado' | 'en_curso' | 'completado' | 'cancelado'
          cancel_reason?: string | null
          vehiculo_id?: string | null
          driver_tercero_id?: string | null
          assigned_at?: string | null
          accepted_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          tracking_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_name?: string
          client_phone?: string
          origin_address?: string
          destination_address?: string
          origin_lat?: number | null
          origin_lng?: number | null
          destination_lat?: number | null
          destination_lng?: number | null
          notes?: string | null
          status?: 'pendiente' | 'asignado' | 'aceptado' | 'en_curso' | 'completado' | 'cancelado'
          cancel_reason?: string | null
          vehiculo_id?: string | null
          driver_tercero_id?: string | null
          assigned_at?: string | null
          accepted_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          tracking_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carreras_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carreras_driver_tercero_id_fkey"
            columns: ["driver_tercero_id"]
            referencedRelation: "terceros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carreras_tracking_session_id_fkey"
            columns: ["tracking_session_id"]
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_service_level: {
        Args: Record<PropertyKey, never>
        Returns: number
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
