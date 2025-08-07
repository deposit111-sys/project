import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseEnabled = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey !== 'your_supabase_anon_key' &&
  supabaseUrl.includes('.supabase.co')
);

export const supabase = isSupabaseEnabled 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'camera-rental-system',
        },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000), // 30秒超时
          });
        },
      },
    })
  : null;

// Helper function to get configuration status
export const getSupabaseConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      isConfigured: false,
      error: '环境变量未设置。请在 .env 文件中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。'
    };
  }

  if (supabaseUrl === 'your_supabase_project_url' || supabaseAnonKey === 'your_supabase_anon_key') {
    return {
      isConfigured: false,
      error: '请将 .env 文件中的占位符替换为实际的 Supabase 配置值。'
    };
  }

  if (!supabaseUrl.includes('.supabase.co')) {
    return {
      isConfigured: false,
      error: 'Supabase URL 格式不正确。应该类似于：https://your-project.supabase.co'
    };
  }

  return {
    isConfigured: true,
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  };
};

// Data transformation utilities
export const transformDatabaseOrder = (dbOrder: any) => {
  return {
    id: dbOrder.id,
    cameraModel: dbOrder.camera_model,
    cameraSerialNumber: dbOrder.camera_serial_number,
    renterName: dbOrder.renter_name,
    customerService: dbOrder.customer_service || '',
    salesperson: dbOrder.salesperson,
    pickupDate: dbOrder.pickup_date,
    pickupTime: dbOrder.pickup_time,
    returnDate: dbOrder.return_date,
    returnTime: dbOrder.return_time,
    depositStatus: dbOrder.deposit_status || '',
    notes: dbOrder.notes || '',
    createdAt: dbOrder.created_at
  };
};

export const transformOrderForDatabase = (order: any) => {
  return {
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
  };
};

export const transformDatabaseCamera = (dbCamera: any) => {
  return {
    id: dbCamera.id,
    model: dbCamera.model,
    serialNumber: dbCamera.serial_number
  };
};

export const transformCameraForDatabase = (camera: any) => {
  return {
    model: camera.model,
    serial_number: camera.serialNumber
  };
};

// Table names constant
export const TABLES = {
  CAMERAS: 'cameras',
  RENTAL_ORDERS: 'rental_orders',
  CONFIRMATIONS: 'confirmations'
};

// Transform functions bundled for service imports
export const transformToDatabase = {
  order: transformOrderForDatabase,
  camera: transformCameraForDatabase
};