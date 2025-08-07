import { supabase, TABLES, transformDatabaseOrder, transformToDatabase, isSupabaseEnabled } from '../lib/supabase';
import { RentalOrder } from '../types';

export class OrderService {
  // 获取所有订单
  static async getAll(): Promise<RentalOrder[]> {
    // 如果 Supabase 未配置，直接返回空数组
    if (!isSupabaseEnabled || !supabase) {
      console.log('Supabase not configured, returning empty orders');
      return [];
    }

    try {
      console.log('Fetching orders from Supabase...');
      
      const { data, error } = await supabase
        .from(TABLES.RENTAL_ORDERS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Orders fetched:', data?.length || 0);
      return data?.map(transformDatabaseOrder) || [];
    } catch (error) {
      // 网络错误时返回空数组而不是抛出错误
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.name === 'TypeError'
      )) {
        console.log('Network error detected, returning empty orders');
        return [];
      }
      
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  // 创建订单
  static async create(order: Omit<RentalOrder, 'id' | 'createdAt'>): Promise<RentalOrder> {
    try {
      const { data, error } = await supabase
        .from(TABLES.RENTAL_ORDERS)
        .insert([transformToDatabase.order(order)])
        .select()
        .single();

      if (error) throw error;

      const newOrder = transformDatabaseOrder(data);

      // 同时创建确认状态记录
      await supabase
        .from(TABLES.CONFIRMATIONS)
        .insert([{
          order_id: newOrder.id,
          pickup_confirmed: false,
          return_confirmed: false
        }]);

      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('创建订单失败');
    }
  }

  // 更新订单
  static async update(id: string, updates: Partial<RentalOrder>): Promise<RentalOrder> {
    try {
      const { data, error } = await supabase
        .from(TABLES.RENTAL_ORDERS)
        .update(transformToDatabase.order(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return transformDatabaseOrder(data);
    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error('更新订单失败');
    }
  }

  // 删除订单
  static async delete(id: string): Promise<void> {
    try {
      // 删除订单时，确认状态会通过外键级联删除
      const { error } = await supabase
        .from(TABLES.RENTAL_ORDERS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw new Error('删除订单失败');
    }
  }

  // 获取指定日期范围的订单
  static async getByDateRange(startDate: string, endDate: string): Promise<RentalOrder[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.RENTAL_ORDERS)
        .select('*')
        .or(`pickup_date.gte.${startDate},return_date.lte.${endDate}`)
        .order('pickup_date', { ascending: true });

      if (error) throw error;

      return data?.map(transformDatabaseOrder) || [];
    } catch (error) {
      console.error('Error fetching orders by date range:', error);
      throw new Error('获取指定日期订单失败');
    }
  }
}