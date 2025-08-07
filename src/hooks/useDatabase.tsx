import { useState, useCallback, useEffect } from 'react';
import { Camera, RentalOrder } from '../types';
import { CameraService } from '../services/cameraService';
import { OrderService } from '../services/orderService';
import { ConfirmationService } from '../services/confirmationService';
import { isSupabaseEnabled } from '../lib/supabase';

export function useDatabase() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [confirmedPickups, setConfirmedPickups] = useState<string[]>([]);
  const [confirmedReturns, setConfirmedReturns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all data from database
  const loadData = useCallback(async () => {
    if (!isSupabaseEnabled) {
      console.log('Supabase not enabled - using local storage only');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Loading data from Supabase database...');
      
      // 添加超时控制
      const [camerasData, ordersData, confirmationsData] = await Promise.race([
        Promise.all([
          CameraService.getAll(),
          OrderService.getAll(),
          ConfirmationService.getAll()
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 60000)
        )
      ]);

      setCameras(camerasData);
      setOrders(ordersData);
      setConfirmedPickups(confirmationsData.confirmedPickups);
      setConfirmedReturns(confirmationsData.confirmedReturns);
      
      console.log('Supabase data loaded successfully:', {
        cameras: camerasData.length,
        orders: ordersData.length,
        pickups: confirmationsData.confirmedPickups.length,
        returns: confirmationsData.confirmedReturns.length
      });
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
      
      // 不设置错误状态，让应用继续使用本地数据
      console.log('Failed to load from Supabase, continuing with local data');
      
      // 只在开发环境显示错误
      if (import.meta.env.DEV) {
        const errorMessage = err instanceof Error ? err.message : '获取数据失败';
        setError(`数据库连接失败: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Camera operations
  const addCamera = useCallback(async (camera: Omit<Camera, 'id'>) => {
    try {
      console.log('Adding camera to Supabase:', camera);
      const newCamera = await CameraService.create(camera);
      setCameras(prev => [...prev, newCamera]);
      console.log('Camera added to Supabase successfully:', newCamera.id);
      return newCamera;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加相机失败';
      console.error('Failed to add camera to Supabase:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteCamera = useCallback(async (id: string) => {
    try {
      await CameraService.delete(id);
      setCameras(prev => prev.filter(camera => camera.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除相机失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Order operations
  const addOrder = useCallback(async (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    try {
      console.log('Adding order to Supabase:', order);
      const newOrder = await OrderService.create(order);
      setOrders(prev => [...prev, newOrder]);
      console.log('Order added to Supabase successfully:', newOrder.id);
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加订单失败';
      console.error('Failed to add order to Supabase:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateOrder = useCallback(async (id: string, updates: Partial<RentalOrder>) => {
    try {
      const updatedOrder = await OrderService.update(id, updates);
      setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
      return updatedOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新订单失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      await OrderService.delete(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      // Also remove from confirmations
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除订单失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Confirmation operations
  const confirmPickup = useCallback(async (orderId: string) => {
    try {
      await ConfirmationService.confirmPickup(orderId);
      setConfirmedPickups(prev => {
        const isConfirmed = prev.includes(orderId);
        return isConfirmed 
          ? prev.filter(id => id !== orderId)
          : [...prev, orderId];
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '确认取机失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const confirmReturn = useCallback(async (orderId: string) => {
    try {
      await ConfirmationService.confirmReturn(orderId);
      setConfirmedReturns(prev => {
        const isConfirmed = prev.includes(orderId);
        return isConfirmed 
          ? prev.filter(id => id !== orderId)
          : [...prev, orderId];
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '确认还机失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount if Supabase is enabled
  useEffect(() => {
    if (isSupabaseEnabled) {
      loadData();
    }
  }, [loadData]);

  return {
    // Data
    cameras,
    orders,
    confirmedPickups,
    confirmedReturns,
    loading,
    error,
    
    // Camera operations
    addCamera,
    deleteCamera,
    
    // Order operations
    addOrder,
    updateOrder,
    deleteOrder,
    
    // Confirmation operations
    confirmPickup,
    confirmReturn,
    
    // Utility functions
    clearError,
    loadData
  };
}