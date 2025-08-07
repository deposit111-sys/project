import { useState, useCallback, useEffect } from 'react';
import { Camera, RentalOrder } from '../types';
import { localDB } from '../lib/indexedDB';

export function useLocalDatabase() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [confirmedPickups, setConfirmedPickups] = useState<string[]>([]);
  const [confirmedReturns, setConfirmedReturns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 转换数据格式
  const convertDBCameraToCamera = (dbCamera: any): Camera => ({
    id: dbCamera.id,
    model: dbCamera.model,
    serialNumber: dbCamera.serialNumber
  });

  const convertDBOrderToOrder = (dbOrder: any): RentalOrder => ({
    id: dbOrder.id,
    cameraModel: dbOrder.cameraModel,
    cameraSerialNumber: dbOrder.cameraSerialNumber,
    renterName: dbOrder.renterName,
    customerService: dbOrder.customerService,
    salesperson: dbOrder.salesperson,
    pickupDate: dbOrder.pickupDate,
    pickupTime: dbOrder.pickupTime,
    returnDate: dbOrder.returnDate,
    returnTime: dbOrder.returnTime,
    depositStatus: dbOrder.depositStatus,
    notes: dbOrder.notes,
    createdAt: dbOrder.createdAt
  });

  // 加载所有数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 从本地数据库加载数据...');
      
      const [dbCameras, dbOrders, confirmations] = await Promise.all([
        localDB.getAllCameras(),
        localDB.getAllOrders(),
        localDB.getAllConfirmations()
      ]);

      const convertedCameras = dbCameras.map(convertDBCameraToCamera);
      const convertedOrders = dbOrders.map(convertDBOrderToOrder);

      setCameras(convertedCameras);
      setOrders(convertedOrders);
      setConfirmedPickups(confirmations.confirmedPickups);
      setConfirmedReturns(confirmations.confirmedReturns);

      console.log('✅ 本地数据库数据加载完成:', {
        cameras: convertedCameras.length,
        orders: convertedOrders.length,
        pickups: confirmations.confirmedPickups.length,
        returns: confirmations.confirmedReturns.length
      });
    } catch (err) {
      console.error('❌ 加载本地数据库数据失败:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 相机操作
  const addCamera = useCallback(async (camera: Omit<Camera, 'id'>) => {
    try {
      console.log('➕ 添加相机到本地数据库:', camera);
      const newDBCamera = await localDB.addCamera(camera);
      const newCamera = convertDBCameraToCamera(newDBCamera);
      setCameras(prev => [...prev, newCamera]);
      return newCamera;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加相机失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteCamera = useCallback(async (id: string) => {
    try {
      console.log('🗑️ 从本地数据库删除相机:', id);
      await localDB.deleteCamera(id);
      setCameras(prev => prev.filter(camera => camera.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除相机失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 订单操作
  const addOrder = useCallback(async (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    try {
      console.log('➕ 添加订单到本地数据库:', order);
      const newDBOrder = await localDB.addOrder(order);
      const newOrder = convertDBOrderToOrder(newDBOrder);
      setOrders(prev => [...prev, newOrder]);
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '添加订单失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateOrder = useCallback(async (id: string, updates: Partial<RentalOrder>) => {
    try {
      console.log('✏️ 更新本地数据库订单:', id, updates);
      const updatedDBOrder = await localDB.updateOrder(id, updates);
      const updatedOrder = convertDBOrderToOrder(updatedDBOrder);
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
      console.log('🗑️ 从本地数据库删除订单:', id);
      await localDB.deleteOrder(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      // 同时从确认状态中移除
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除订单失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 确认状态操作
  const confirmPickup = useCallback(async (orderId: string) => {
    try {
      const isCurrentlyConfirmed = confirmedPickups.includes(orderId);
      const newState = !isCurrentlyConfirmed;
      
      console.log(`${newState ? '✅' : '❌'} 设置取机确认状态:`, orderId, newState);
      await localDB.setConfirmation(orderId, 'pickup', newState);
      
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
  }, [confirmedPickups]);

  const confirmReturn = useCallback(async (orderId: string) => {
    try {
      const isCurrentlyConfirmed = confirmedReturns.includes(orderId);
      const newState = !isCurrentlyConfirmed;
      
      console.log(`${newState ? '✅' : '❌'} 设置还机确认状态:`, orderId, newState);
      await localDB.setConfirmation(orderId, 'return', newState);
      
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
  }, [confirmedReturns]);

  // 数据导入导出
  const exportData = useCallback(async () => {
    try {
      console.log('📤 导出本地数据库数据...');
      const data = await localDB.exportData();
      
      // 转换为应用格式
      const exportData = {
        cameras: data.cameras.map(convertDBCameraToCamera),
        orders: data.orders.map(convertDBOrderToOrder),
        exportDate: data.exportDate,
        version: data.version
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `相机租赁系统数据备份_${new Date().toISOString().split('T')[0]}.json`;
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
  }, []);

  const importData = useCallback(async (importedCameras: Camera[], importedOrders: RentalOrder[]) => {
    try {
      console.log('📥 导入数据到本地数据库...');
      
      // 转换为数据库格式
      const now = new Date().toISOString();
      const dbCameras = importedCameras.map(camera => ({
        id: camera.id,
        model: camera.model,
        serialNumber: camera.serialNumber,
        createdAt: now,
        updatedAt: now
      }));

      const dbOrders = importedOrders.map(order => ({
        id: order.id,
        cameraModel: order.cameraModel,
        cameraSerialNumber: order.cameraSerialNumber,
        renterName: order.renterName,
        customerService: order.customerService,
        salesperson: order.salesperson,
        pickupDate: order.pickupDate,
        pickupTime: order.pickupTime,
        returnDate: order.returnDate,
        returnTime: order.returnTime,
        depositStatus: order.depositStatus,
        notes: order.notes,
        createdAt: order.createdAt || now,
        updatedAt: now
      }));

      await localDB.importData({
        cameras: dbCameras,
        orders: dbOrders
      });

      // 重新加载数据
      await loadData();
      console.log('✅ 数据导入完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  const clearAllData = useCallback(async () => {
    try {
      console.log('🗑️ 清空本地数据库...');
      await localDB.clearAllData();
      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);
      console.log('✅ 本地数据库已清空');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空数据失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      return await localDB.getStats();
    } catch (err) {
      console.error('获取数据库统计失败:', err);
      return {
        cameras: cameras.length,
        orders: orders.length,
        confirmations: confirmedPickups.length + confirmedReturns.length,
        dbSize: '未知'
      };
    }
  }, [cameras.length, orders.length, confirmedPickups.length, confirmedReturns.length]);

  // 数据库优化（IndexedDB 不需要优化，返回成功）
  const optimizeDatabase = useCallback(async () => {
    console.log('✅ IndexedDB 不需要优化操作');
    return Promise.resolve();
  }, []);

  // 数据库备份（导出数据作为备份）
  const backupDatabase = useCallback(async () => {
    try {
      console.log('💾 创建 IndexedDB 数据备份...');
      const data = await localDB.exportData();
      
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `indexeddb_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('✅ IndexedDB 数据备份完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据库备份失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

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