import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载所有数据
  const loadData = async () => {
    // 如果 Supabase 未配置，设置空数据并返回
    if (!isSupabaseEnabled) {
      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [camerasData, ordersData, confirmationsData] = await Promise.all([
        CameraService.getAll(),
        OrderService.getAll(),
        ConfirmationService.getAll()
      ]);

      setCameras(camerasData);
      setOrders(ordersData);
      setConfirmedPickups(confirmationsData.confirmedPickups);
      setConfirmedReturns(confirmationsData.confirmedReturns);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    loadData();
  }, []);

  // 相机操作
  const addCamera = async (camera: Omit<Camera, 'id'>) => {
    try {
      const newCamera = await CameraService.create(camera);
      setCameras(prev => [...prev, newCamera]);
      return newCamera;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加相机失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteCamera = async (id: string) => {
    try {
      await CameraService.delete(id);
      setCameras(prev => prev.filter(camera => camera.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除相机失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 订单操作
  const addOrder = async (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    try {
      const newOrder = await OrderService.create(order);
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加订单失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateOrder = async (id: string, updates: Partial<RentalOrder>) => {
    try {
      const updatedOrder = await OrderService.update(id, updates);
      setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
      return updatedOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新订单失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await OrderService.delete(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      // 同时清除确认状态
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除订单失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 确认操作
  const confirmPickup = async (orderId: string) => {
    try {
      const isCurrentlyConfirmed = confirmedPickups.includes(orderId);
      
      if (isCurrentlyConfirmed) {
        await ConfirmationService.unconfirmPickup(orderId);
        setConfirmedPickups(prev => prev.filter(id => id !== orderId));
      } else {
        await ConfirmationService.confirmPickup(orderId);
        setConfirmedPickups(prev => [...prev, orderId]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '确认取机操作失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const confirmReturn = async (orderId: string) => {
    try {
      const isCurrentlyConfirmed = confirmedReturns.includes(orderId);
      
      if (isCurrentlyConfirmed) {
        await ConfirmationService.unconfirmReturn(orderId);
        setConfirmedReturns(prev => prev.filter(id => id !== orderId));
      } else {
        await ConfirmationService.confirmReturn(orderId);
        setConfirmedReturns(prev => [...prev, orderId]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '确认还机操作失败';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 清除错误
  const clearError = () => setError(null);

  return {
    // 数据
    cameras,
    orders,
    confirmedPickups,
    confirmedReturns,
    loading,
    error,
    
    // 操作方法
    loadData,
    addCamera,
    deleteCamera,
    addOrder,
    updateOrder,
    deleteOrder,
    confirmPickup,
    confirmReturn,
    clearError
  };
}