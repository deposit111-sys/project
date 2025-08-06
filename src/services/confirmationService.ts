import { supabase, TABLES, isSupabaseEnabled } from '../lib/supabase';

export class ConfirmationService {
  // 获取所有确认状态
  static async getAll(): Promise<{ confirmedPickups: string[]; confirmedReturns: string[] }> {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Supabase not configured, returning empty confirmations');
      return { confirmedPickups: [], confirmedReturns: [] };
    }

    try {
      console.log('Fetching confirmations from Supabase...');
      const { data, error } = await supabase
        .from(TABLES.CONFIRMATIONS)
        .select('order_id, pickup_confirmed, return_confirmed');

      if (error) throw error;

      const confirmedPickups = data
        ?.filter(item => item.pickup_confirmed)
        .map(item => item.order_id) || [];

      const confirmedReturns = data
        ?.filter(item => item.return_confirmed)
        .map(item => item.order_id) || [];

      console.log('Confirmations fetched:', { confirmedPickups: confirmedPickups.length, confirmedReturns: confirmedReturns.length });
      return { confirmedPickups, confirmedReturns };
    } catch (error) {
      console.error('Error fetching confirmations:', error);
      throw new Error('获取确认状态失败');
    }
  }

  // 确认取机
  static async confirmPickup(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CONFIRMATIONS)
        .upsert({
          order_id: orderId,
          pickup_confirmed: true,
          pickup_confirmed_at: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error confirming pickup:', error);
      throw new Error('确认取机失败');
    }
  }

  // 取消确认取机
  static async unconfirmPickup(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CONFIRMATIONS)
        .upsert({
          order_id: orderId,
          pickup_confirmed: false,
          pickup_confirmed_at: null
        }, {
          onConflict: 'order_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error unconfirming pickup:', error);
      throw new Error('取消确认取机失败');
    }
  }

  // 确认还机
  static async confirmReturn(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CONFIRMATIONS)
        .upsert({
          order_id: orderId,
          return_confirmed: true,
          return_confirmed_at: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error confirming return:', error);
      throw new Error('确认还机失败');
    }
  }

  // 取消确认还机
  static async unconfirmReturn(orderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CONFIRMATIONS)
        .upsert({
          order_id: orderId,
          return_confirmed: false,
          return_confirmed_at: null
        }, {
          onConflict: 'order_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error unconfirming return:', error);
      throw new Error('取消确认还机失败');
    }
  }
}