import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      cameras: {
        Row: {
          id: string
          model: string
          serial_number: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          model: string
          serial_number: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          model?: string
          serial_number?: string
          created_at?: string
          updated_at?: string
        }
      }
      rental_orders: {
        Row: {
          id: string
          camera_model: string
          camera_serial_number: string
          renter_name: string
          customer_service: string
          salesperson: string
          pickup_date: string
          pickup_time: 'morning' | 'afternoon' | 'evening'
          return_date: string
          return_time: 'morning' | 'afternoon' | 'evening'
          deposit_status: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          camera_model: string
          camera_serial_number: string
          renter_name: string
          customer_service?: string
          salesperson: string
          pickup_date: string
          pickup_time: 'morning' | 'afternoon' | 'evening'
          return_date: string
          return_time: 'morning' | 'afternoon' | 'evening'
          deposit_status?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          camera_model?: string
          camera_serial_number?: string
          renter_name?: string
          customer_service?: string
          salesperson?: string
          pickup_date?: string
          pickup_time?: 'morning' | 'afternoon' | 'evening'
          return_date?: string
          return_time?: 'morning' | 'afternoon' | 'evening'
          deposit_status?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      confirmations: {
        Row: {
          id: string
          order_id: string
          pickup_confirmed: boolean
          return_confirmed: boolean
          pickup_confirmed_at: string | null
          return_confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          pickup_confirmed?: boolean
          return_confirmed?: boolean
          pickup_confirmed_at?: string | null
          return_confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          pickup_confirmed?: boolean
          return_confirmed?: boolean
          pickup_confirmed_at?: string | null
          return_confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}