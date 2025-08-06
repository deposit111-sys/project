import { createClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 调试信息
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

// 检查环境变量是否配置
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key' &&
  supabaseUrl.startsWith('https://');

console.log('Supabase configured:', isSupabaseConfigured);

// 只有在正确配置时才创建 Supabase 客户端
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    })
  : null;

export const isSupabaseEnabled = isSupabaseConfigured;

// 数据库表名常量
export const TABLES = {
  CAMERAS: 'cameras',
  RENTAL_ORDERS: 'rental_orders',
  CONFIRMATIONS: 'confirmations'
} as const;

// 数据库类型定义
export interface DatabaseCamera {
  id: string;
  model: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRentalOrder {
  id: string;
  camera_model: string;
  camera_serial_number: string;
  renter_name: string;
  customer_service: string;
  salesperson: string;
  pickup_date: string;
  pickup_time: 'morning' | 'afternoon' | 'evening';
  return_date: string;
  return_time: 'morning' | 'afternoon' | 'evening';
  deposit_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseConfirmation {
  id: string;
  order_id: string;
  pickup_confirmed: boolean;
  return_confirmed: boolean;
  pickup_confirmed_at: string | null;
  return_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 类型转换函数
export const transformDatabaseCamera = (dbCamera: DatabaseCamera) => ({
  id: dbCamera.id,
  model: dbCamera.model,
  serialNumber: dbCamera.serial_number
});

export const transformDatabaseOrder = (dbOrder: DatabaseRentalOrder) => ({
  id: dbOrder.id,
  cameraModel: dbOrder.camera_model,
  cameraSerialNumber: dbOrder.camera_serial_number,
  renterName: dbOrder.renter_name,
  customerService: dbOrder.customer_service,
  salesperson: dbOrder.salesperson,
  pickupDate: dbOrder.pickup_date,
  pickupTime: dbOrder.pickup_time,
  returnDate: dbOrder.return_date,
  returnTime: dbOrder.return_time,
  depositStatus: dbOrder.deposit_status,
  notes: dbOrder.notes,
  createdAt: dbOrder.created_at
});

export const transformToDatabase = {
  camera: (camera: { model: string; serialNumber: string }) => ({
    model: camera.model,
    serial_number: camera.serialNumber
  }),
  
  order: (order: any) => ({
    camera_model: order.cameraModel,
    camera_serial_number: order.cameraSerialNumber,
    renter_name: order.renterName,
    customer_service: order.customerService || '',
    salesperson: order.salesperson,
    pickup_date: order.pickupDate,
    pickup_time: order.pickupTime,
    return_date: order.returnDate,
    return_time: order.returnTime,
    deposit_status: order.depositStatus || '',
    notes: order.notes || ''
  })
};