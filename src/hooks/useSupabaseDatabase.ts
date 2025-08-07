import { useState, useCallback, useEffect } from 'react';
import { Camera, RentalOrder } from '../types';
import { supabase } from '../lib/supabaseClient';

export function useSupabaseDatabase() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [confirmedPickups, setConfirmedPickups] = useState<string[]>([]);
  const [confirmedReturns, setConfirmedReturns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 转换数据格式
  const convertDBCameraToCamera = (dbCamera: any): Camera => ({
    id: dbCamera.id,
    model: dbCamera.model,
    serialNumber: dbCamera.serial_number
  });

  const convertDBOrderToOrder = (dbOrder: any): RentalOrder => ({
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
  });

  // 初始化数据库连接
  const initDatabase = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 初始化 Supabase 数据库连接...');
      
      // 测试数据库连接
      const { data, error } = await supabase.from('cameras').select('count').limit(1);
      
      if (error) {
        throw new Error(`数据库连接失败: ${error.message}`);
      }
      
      setIsInitialized(true);
      console.log('✅ Supabase 数据库连接成功');
    } catch (err) {
      console.error('❌ Supabase 数据库初始化失败:', err);
      setError(err instanceof Error ? err.message : '数据库初始化失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载所有数据
  const loadData = useCallback(async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 从 Supabase 数据库加载数据...');
      
      // 并行加载所有数据
      const [camerasResult, ordersResult, confirmationsResult] = await Promise.all([
        supabase.from('cameras').select('*').order('model', { ascending: true }),
        supabase.from('rental_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('confirmations').select('*')
      ]);

      if (camerasResult.error) throw camerasResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (confirmationsResult.error) throw confirmationsResult.error;

      const convertedCameras = (camerasResult.data || []).map(convertDBCameraToCamera);
      const convertedOrders = (ordersResult.data || []).map(convertDBOrderToOrder);
      
      const pickups = (confirmationsResult.data || [])
        .filter(c => c.pickup_confirmed)
        .map(c => c.order_id);
      
      const returns = (confirmationsResult.data || [])
        .filter(c => c.return_confirmed)
        .map(c => c.order_id);

      setCameras(convertedCameras);
      setOrders(convertedOrders);
      setConfirmedPickups(pickups);
      setConfirmedReturns(returns);

      console.log('✅ Supabase 数据库数据加载完成:', {
        cameras: convertedCameras.length,
        orders: convertedOrders.length,
        pickups: pickups.length,
        returns: returns.length
      });
    } catch (err) {
      console.error('❌ 加载 Supabase 数据库数据失败:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // 相机操作
  const addCamera = useCallback(async (camera: Omit<Camera, 'id'>) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('➕ 添加相机到 Supabase 数据库:', camera);
      
      const { data, error } = await supabase
        .from('cameras')
        .insert({
          model: camera.model,
          serial_number: camera.serialNumber
        })
        .select()
        .single();

      if (error) throw error;

      const newCamera = convertDBCameraToCamera(data);
      setCameras(prev => [...prev, newCamera]);
      console.log('✅ 相机添加成功:', newCamera.id);
      return newCamera;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加相机失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const deleteCamera = useCallback(async (id: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('🗑️ 从 Supabase 数据库删除相机:', id);
      
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCameras(prev => prev.filter(camera => camera.id !== id));
      console.log('✅ 相机删除成功:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除相机失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  // 订单操作
  const addOrder = useCallback(async (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('➕ 添加订单到 Supabase 数据库:', order);
      
      const { data, error } = await supabase
        .from('rental_orders')
        .insert({
          camera_model: order.cameraModel,
          camera_serial_number: order.cameraSerialNumber,
          renter_name: order.renterName,
          customer_service: order.customerService,
          salesperson: order.salesperson,
          pickup_date: order.pickupDate,
          pickup_time: order.pickupTime,
          return_date: order.returnDate,
          return_time: order.returnTime,
          deposit_status: order.depositStatus,
          notes: order.notes
        })
        .select()
        .single();

      if (error) throw error;

      const newOrder = convertDBOrderToOrder(data);
      setOrders(prev => [newOrder, ...prev]);
      console.log('✅ 订单添加成功:', newOrder.id);
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加订单失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const updateOrder = useCallback(async (id: string, updates: Partial<RentalOrder>) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('✏️ 更新 Supabase 数据库订单:', id, updates);
      
      const dbUpdates: any = {};
      if (updates.cameraModel !== undefined) dbUpdates.camera_model = updates.cameraModel;
      if (updates.cameraSerialNumber !== undefined) dbUpdates.camera_serial_number = updates.cameraSerialNumber;
      if (updates.renterName !== undefined) dbUpdates.renter_name = updates.renterName;
      if (updates.customerService !== undefined) dbUpdates.customer_service = updates.customerService;
      if (updates.salesperson !== undefined) dbUpdates.salesperson = updates.salesperson;
      if (updates.pickupDate !== undefined) dbUpdates.pickup_date = updates.pickupDate;
      if (updates.pickupTime !== undefined) dbUpdates.pickup_time = updates.pickupTime;
      if (updates.returnDate !== undefined) dbUpdates.return_date = updates.returnDate;
      if (updates.returnTime !== undefined) dbUpdates.return_time = updates.returnTime;
      if (updates.depositStatus !== undefined) dbUpdates.deposit_status = updates.depositStatus;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('rental_orders')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedOrder = convertDBOrderToOrder(data);
      setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
      console.log('✅ 订单更新成功:', id);
      return updatedOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新订单失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const deleteOrder = useCallback(async (id: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('🗑️ 从 Supabase 数据库删除订单:', id);
      
      // 删除订单（确认状态会通过外键级联删除）
      const { error } = await supabase
        .from('rental_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== id));
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
      
      console.log('✅ 订单删除成功:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除订单失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  // 确认状态操作
  const confirmPickup = useCallback(async (orderId: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      const isCurrentlyConfirmed = confirmedPickups.includes(orderId);
      const newState = !isCurrentlyConfirmed;
      const now = new Date().toISOString();

      console.log(`${newState ? '✅' : '❌'} 设置取机确认状态:`, orderId, newState);

      // 先检查是否已存在确认记录
      const { data: existing } = await supabase
        .from('confirmations')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (existing) {
        // 更新现有记录
        const { error } = await supabase
          .from('confirmations')
          .update({
            pickup_confirmed: newState,
            pickup_confirmed_at: newState ? now : null
          })
          .eq('order_id', orderId);

        if (error) throw error;
      } else {
        // 创建新记录
        const { error } = await supabase
          .from('confirmations')
          .insert({
            order_id: orderId,
            pickup_confirmed: newState,
            return_confirmed: false,
            pickup_confirmed_at: newState ? now : null
          });

        if (error) throw error;
      }

      setConfirmedPickups(prev => 
        newState 
          ? [...prev, orderId]
          : prev.filter(id => id !== orderId)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '确认取机失败';
      setError(errorMessage);
      throw err;
    }
  }, [confirmedPickups, isInitialized]);

  const confirmReturn = useCallback(async (orderId: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      const isCurrentlyConfirmed = confirmedReturns.includes(orderId);
      const newState = !isCurrentlyConfirmed;
      const now = new Date().toISOString();

      console.log(`${newState ? '✅' : '❌'} 设置还机确认状态:`, orderId, newState);

      // 先检查是否已存在确认记录
      const { data: existing } = await supabase
        .from('confirmations')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (existing) {
        // 更新现有记录
        const { error } = await supabase
          .from('confirmations')
          .update({
            return_confirmed: newState,
            return_confirmed_at: newState ? now : null
          })
          .eq('order_id', orderId);

        if (error) throw error;
      } else {
        // 创建新记录
        const { error } = await supabase
          .from('confirmations')
          .insert({
            order_id: orderId,
            pickup_confirmed: false,
            return_confirmed: newState,
            return_confirmed_at: newState ? now : null
          });

        if (error) throw error;
      }

      setConfirmedReturns(prev => 
        newState 
          ? [...prev, orderId]
          : prev.filter(id => id !== orderId)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '确认还机失败';
      setError(errorMessage);
      throw err;
    }
  }, [confirmedReturns, isInitialized]);

  // 数据导入导出
  const exportData = useCallback(async () => {
    try {
      console.log('📤 导出 Supabase 数据库数据...');
      const exportData = {
        cameras,
        orders,
        confirmedPickups,
        confirmedReturns,
        exportDate: new Date().toISOString(),
        version: '3.0',
        source: 'supabase'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Supabase数据库备份_${new Date().toISOString().split('T')[0]}.json`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('✅ 数据导出完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [cameras, orders, confirmedPickups, confirmedReturns]);

  const importData = useCallback(async (importedCameras: Camera[], importedOrders: RentalOrder[]) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('📥 导入数据到 Supabase 数据库...');
      
      // 清空现有数据
      await Promise.all([
        supabase.from('confirmations').delete().neq('id', ''),
        supabase.from('rental_orders').delete().neq('id', ''),
        supabase.from('cameras').delete().neq('id', '')
      ]);

      // 导入相机数据
      if (importedCameras.length > 0) {
        const { error: cameraError } = await supabase
          .from('cameras')
          .insert(importedCameras.map(camera => ({
            id: camera.id,
            model: camera.model,
            serial_number: camera.serialNumber
          })));

        if (cameraError) throw cameraError;
      }

      // 导入订单数据
      if (importedOrders.length > 0) {
        const { error: orderError } = await supabase
          .from('rental_orders')
          .insert(importedOrders.map(order => ({
            id: order.id,
            camera_model: order.cameraModel,
            camera_serial_number: order.cameraSerialNumber,
            renter_name: order.renterName,
            customer_service: order.customerService,
            salesperson: order.salesperson,
            pickup_date: order.pickupDate,
            pickup_time: order.pickupTime,
            return_date: order.returnDate,
            return_time: order.returnTime,
            deposit_status: order.depositStatus,
            notes: order.notes,
            created_at: order.createdAt
          })));

        if (orderError) throw orderError;
      }

      // 重新加载数据
      await loadData();
      console.log('✅ 数据导入完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized, loadData]);

  const clearAllData = useCallback(async () => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('🗑️ 清空 Supabase 数据库...');
      
      // 按顺序删除（考虑外键约束）
      await supabase.from('confirmations').delete().neq('id', '');
      await supabase.from('rental_orders').delete().neq('id', '');
      await supabase.from('cameras').delete().neq('id', '');

      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);
      
      console.log('✅ Supabase 数据库已清空');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const getStats = useCallback(async () => {
    if (!isInitialized) {
      return {
        cameras: cameras.length,
        orders: orders.length,
        confirmations: confirmedPickups.length + confirmedReturns.length,
        dbSize: '云端数据库'
      };
    }

    try {
      const [camerasCount, ordersCount, confirmationsCount] = await Promise.all([
        supabase.from('cameras').select('*', { count: 'exact', head: true }),
        supabase.from('rental_orders').select('*', { count: 'exact', head: true }),
        supabase.from('confirmations').select('*', { count: 'exact', head: true })
      ]);

      return {
        cameras: camerasCount.count || 0,
        orders: ordersCount.count || 0,
        confirmations: confirmationsCount.count || 0,
        dbSize: '云端 PostgreSQL'
      };
    } catch (err) {
      console.error('获取数据库统计失败:', err);
      return {
        cameras: cameras.length,
        orders: orders.length,
        confirmations: confirmedPickups.length + confirmedReturns.length,
        dbSize: '云端数据库'
      };
    }
  }, [cameras.length, orders.length, confirmedPickups.length, confirmedReturns.length, isInitialized]);

  const optimizeDatabase = useCallback(async () => {
    console.log('🔧 Supabase 数据库自动优化...');
    // Supabase 自动处理优化，无需手动操作
    return Promise.resolve();
  }, []);

  const backupDatabase = useCallback(async () => {
    await exportData();
  }, [exportData]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 组件挂载时初始化
  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized, loadData]);

  return {
    // 数据
    cameras,
    orders,
    confirmedPickups,
    confirmedReturns,
    loading,
    error,
    
    // 相机操作
    addCamera,
    deleteCamera,
    
    // 订单操作
    addOrder,
    updateOrder,
    deleteOrder,
    
    // 确认状态操作
    confirmPickup,
    confirmReturn,
    
    // 数据管理
    exportData,
    importData,
    clearAllData,
    getStats,
    optimizeDatabase,
    backupDatabase,
    
    // 工具函数
    clearError,
    loadData
  };
}