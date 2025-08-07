import { useState, useCallback, useEffect } from 'react';
import { Camera, RentalOrder } from '../types';
import { robustDB } from '../lib/robustDatabase';

export function useRobustDatabase() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [confirmedPickups, setConfirmedPickups] = useState<string[]>([]);
  const [confirmedReturns, setConfirmedReturns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    pendingOperations: 0,
    lastSnapshot: null as string | null,
    dbSize: '0 KB',
    isHealthy: true
  });

  // 初始化数据库
  const initDatabase = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 初始化强化数据库...');
      await robustDB.init();
      setIsInitialized(true);
      console.log('✅ 强化数据库初始化成功');
    } catch (err) {
      console.error('❌ 强化数据库初始化失败:', err);
      setError(err instanceof Error ? err.message : '数据库初始化失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    if (!isInitialized) return;

    try {
      setLoading(true);
      console.log('📖 加载数据...');
      
      // 这里需要实现从强化数据库读取数据的逻辑
      // 由于我们使用的是 IndexedDB，需要直接访问数据
      const db = (robustDB as any).db;
      if (!db) throw new Error('数据库未初始化');

      const transaction = db.transaction(['cameras', 'orders', 'confirmations'], 'readonly');
      
      // 读取相机数据
      const cameraStore = transaction.objectStore('cameras');
      const camerasData = await new Promise<any[]>((resolve, reject) => {
        const request = cameraStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 读取订单数据
      const orderStore = transaction.objectStore('orders');
      const ordersData = await new Promise<any[]>((resolve, reject) => {
        const request = orderStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 读取确认状态数据
      const confirmationStore = transaction.objectStore('confirmations');
      const confirmationsData = await new Promise<any[]>((resolve, reject) => {
        const request = confirmationStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      setCameras(camerasData);
      setOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      const pickups = confirmationsData.filter(c => c.pickupConfirmed).map(c => c.orderId);
      const returns = confirmationsData.filter(c => c.returnConfirmed).map(c => c.orderId);
      setConfirmedPickups(pickups);
      setConfirmedReturns(returns);

      console.log('✅ 数据加载完成:', {
        cameras: camerasData.length,
        orders: ordersData.length,
        pickups: pickups.length,
        returns: returns.length
      });
    } catch (err) {
      console.error('❌ 数据加载失败:', err);
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // 更新系统状态
  const updateSystemStatus = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const status = await robustDB.getSystemStatus();
      setSystemStatus(status);
    } catch (err) {
      console.error('获取系统状态失败:', err);
    }
  }, [isInitialized]);

  // 相机操作
  const addCamera = useCallback(async (camera: Omit<Camera, 'id'>) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    const now = new Date().toISOString();
    const newCamera: Camera = {
      ...camera,
      id: `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      await robustDB.performOperation({
        type: 'create',
        table: 'cameras',
        data: {
          ...newCamera,
          createdAt: now,
          updatedAt: now
        }
      });

      setCameras(prev => [...prev, newCamera]);
      console.log('✅ 相机添加成功:', newCamera.id);
      return newCamera;
    } catch (err) {
      console.error('❌ 添加相机失败:', err);
      setError(err instanceof Error ? err.message : '添加相机失败');
      throw err;
    }
  }, [isInitialized]);

  const deleteCamera = useCallback(async (id: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      await robustDB.performOperation({
        type: 'delete',
        table: 'cameras',
        data: { id }
      });

      setCameras(prev => prev.filter(camera => camera.id !== id));
      console.log('✅ 相机删除成功:', id);
    } catch (err) {
      console.error('❌ 删除相机失败:', err);
      setError(err instanceof Error ? err.message : '删除相机失败');
      throw err;
    }
  }, [isInitialized]);

  // 订单操作
  const addOrder = useCallback(async (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    const now = new Date().toISOString();
    const newOrder: RentalOrder = {
      ...order,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now
    };

    try {
      await robustDB.performOperation({
        type: 'create',
        table: 'orders',
        data: {
          ...newOrder,
          updatedAt: now
        }
      });

      setOrders(prev => [newOrder, ...prev]);
      console.log('✅ 订单添加成功:', newOrder.id);
      return newOrder;
    } catch (err) {
      console.error('❌ 添加订单失败:', err);
      setError(err instanceof Error ? err.message : '添加订单失败');
      throw err;
    }
  }, [isInitialized]);

  const updateOrder = useCallback(async (id: string, updates: Partial<RentalOrder>) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    const existingOrder = orders.find(order => order.id === id);
    if (!existingOrder) throw new Error('订单不存在');

    const updatedOrder: RentalOrder = {
      ...existingOrder,
      ...updates,
      id
    };

    try {
      await robustDB.performOperation({
        type: 'update',
        table: 'orders',
        data: {
          ...updatedOrder,
          updatedAt: new Date().toISOString()
        }
      });

      setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
      console.log('✅ 订单更新成功:', id);
      return updatedOrder;
    } catch (err) {
      console.error('❌ 更新订单失败:', err);
      setError(err instanceof Error ? err.message : '更新订单失败');
      throw err;
    }
  }, [orders, isInitialized]);

  const deleteOrder = useCallback(async (id: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      await robustDB.performOperation({
        type: 'delete',
        table: 'orders',
        data: { id }
      });

      // 同时删除相关确认状态
      const confirmationsToDelete = [...confirmedPickups, ...confirmedReturns]
        .filter(orderId => orderId === id);

      for (const confirmationId of confirmationsToDelete) {
        await robustDB.performOperation({
          type: 'delete',
          table: 'confirmations',
          data: { orderId: confirmationId }
        });
      }

      setOrders(prev => prev.filter(order => order.id !== id));
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
      
      console.log('✅ 订单删除成功:', id);
    } catch (err) {
      console.error('❌ 删除订单失败:', err);
      setError(err instanceof Error ? err.message : '删除订单失败');
      throw err;
    }
  }, [confirmedPickups, confirmedReturns, isInitialized]);

  // 确认状态操作
  const confirmPickup = useCallback(async (orderId: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    const isCurrentlyConfirmed = confirmedPickups.includes(orderId);
    const newState = !isCurrentlyConfirmed;
    const now = new Date().toISOString();

    try {
      const confirmationId = `conf_pickup_${orderId}`;
      
      await robustDB.performOperation({
        type: newState ? 'create' : 'update',
        table: 'confirmations',
        data: {
          id: confirmationId,
          orderId,
          pickupConfirmed: newState,
          returnConfirmed: confirmedReturns.includes(orderId),
          pickupConfirmedAt: newState ? now : null,
          createdAt: now,
          updatedAt: now
        }
      });

      setConfirmedPickups(prev => 
        newState 
          ? [...prev, orderId]
          : prev.filter(id => id !== orderId)
      );

      console.log(`✅ 取机确认状态更新: ${orderId} -> ${newState}`);
    } catch (err) {
      console.error('❌ 确认取机失败:', err);
      setError(err instanceof Error ? err.message : '确认取机失败');
      throw err;
    }
  }, [confirmedPickups, confirmedReturns, isInitialized]);

  const confirmReturn = useCallback(async (orderId: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    const isCurrentlyConfirmed = confirmedReturns.includes(orderId);
    const newState = !isCurrentlyConfirmed;
    const now = new Date().toISOString();

    try {
      const confirmationId = `conf_return_${orderId}`;
      
      await robustDB.performOperation({
        type: newState ? 'create' : 'update',
        table: 'confirmations',
        data: {
          id: confirmationId,
          orderId,
          pickupConfirmed: confirmedPickups.includes(orderId),
          returnConfirmed: newState,
          returnConfirmedAt: newState ? now : null,
          createdAt: now,
          updatedAt: now
        }
      });

      setConfirmedReturns(prev => 
        newState 
          ? [...prev, orderId]
          : prev.filter(id => id !== orderId)
      );

      console.log(`✅ 还机确认状态更新: ${orderId} -> ${newState}`);
    } catch (err) {
      console.error('❌ 确认还机失败:', err);
      setError(err instanceof Error ? err.message : '确认还机失败');
      throw err;
    }
  }, [confirmedReturns, confirmedPickups, isInitialized]);

  // 数据管理
  const exportData = useCallback(async () => {
    try {
      const exportData = {
        cameras,
        orders,
        confirmedPickups,
        confirmedReturns,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `强化数据库备份_${new Date().toISOString().split('T')[0]}.json`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('✅ 数据导出完成');
    } catch (err) {
      console.error('❌ 数据导出失败:', err);
      setError(err instanceof Error ? err.message : '数据导出失败');
      throw err;
    }
  }, [cameras, orders, confirmedPickups, confirmedReturns]);

  const importData = useCallback(async (importedCameras: Camera[], importedOrders: RentalOrder[]) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('📥 开始导入数据...');
      
      // 清空现有数据
      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);

      // 导入相机
      for (const camera of importedCameras) {
        await robustDB.performOperation({
          type: 'create',
          table: 'cameras',
          data: {
            ...camera,
            createdAt: camera.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      // 导入订单
      for (const order of importedOrders) {
        await robustDB.performOperation({
          type: 'create',
          table: 'orders',
          data: {
            ...order,
            createdAt: order.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      // 重新加载数据
      await loadData();
      console.log('✅ 数据导入完成');
    } catch (err) {
      console.error('❌ 数据导入失败:', err);
      setError(err instanceof Error ? err.message : '数据导入失败');
      throw err;
    }
  }, [isInitialized, loadData]);

  const clearAllData = useCallback(async () => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('🗑️ 清空所有数据...');
      
      // 清空所有表
      const db = (robustDB as any).db;
      if (!db) throw new Error('数据库未初始化');

      const transaction = db.transaction(['cameras', 'orders', 'confirmations'], 'readwrite');
      
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('cameras').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('orders').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore('confirmations').clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      ]);

      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);
      
      console.log('✅ 所有数据已清空');
    } catch (err) {
      console.error('❌ 清空数据失败:', err);
      setError(err instanceof Error ? err.message : '清空数据失败');
      throw err;
    }
  }, [isInitialized]);

  const getStats = useCallback(async () => {
    return {
      cameras: cameras.length,
      orders: orders.length,
      confirmations: confirmedPickups.length + confirmedReturns.length,
      dbSize: systemStatus.dbSize
    };
  }, [cameras.length, orders.length, confirmedPickups.length, confirmedReturns.length, systemStatus.dbSize]);

  const optimizeDatabase = useCallback(async () => {
    console.log('🔧 强化数据库自动优化中...');
    return Promise.resolve();
  }, []);

  const backupDatabase = useCallback(async () => {
    await exportData();
  }, [exportData]);

  const recoverFromSnapshot = useCallback(async (snapshotId?: string) => {
    if (!isInitialized) throw new Error('数据库未初始化');

    try {
      console.log('🔄 从快照恢复数据...');
      await robustDB.recoverFromSnapshot(snapshotId);
      await loadData();
      console.log('✅ 数据恢复完成');
    } catch (err) {
      console.error('❌ 数据恢复失败:', err);
      setError(err instanceof Error ? err.message : '数据恢复失败');
      throw err;
    }
  }, [isInitialized, loadData]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 初始化和定期更新状态
  useEffect(() => {
    initDatabase();
    
    return () => {
      robustDB.destroy();
    };
  }, [initDatabase]);

  useEffect(() => {
    if (isInitialized) {
      loadData();
      
      // 定期更新系统状态
      const statusInterval = setInterval(updateSystemStatus, 5000);
      return () => clearInterval(statusInterval);
    }
  }, [isInitialized, loadData, updateSystemStatus]);

  return {
    // 数据
    cameras,
    orders,
    confirmedPickups,
    confirmedReturns,
    loading,
    error,
    systemStatus,
    
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
    recoverFromSnapshot,
    
    // 工具函数
    clearError,
    loadData
  };
}