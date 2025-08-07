import { useState, useCallback, useEffect } from 'react';
import { Camera, RentalOrder } from '../types';
import { electronSQLiteDB, SQLiteCamera, SQLiteOrder, initializeElectronSQLiteDB } from '../lib/electronSQLite';

// 检查是否在 Electron 环境中
const isElectron = () => {
  return typeof window !== 'undefined' && window.process && window.process.type;
};

export function useElectronSQLite() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [confirmedPickups, setConfirmedPickups] = useState<string[]>([]);
  const [confirmedReturns, setConfirmedReturns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 转换数据格式
  const convertSQLiteCameraToCamera = (sqliteCamera: SQLiteCamera): Camera => ({
    id: sqliteCamera.id,
    model: sqliteCamera.model,
    serialNumber: sqliteCamera.serial_number
  });

  const convertSQLiteOrderToOrder = (sqliteOrder: SQLiteOrder): RentalOrder => ({
    id: sqliteOrder.id,
    cameraModel: sqliteOrder.camera_model,
    cameraSerialNumber: sqliteOrder.camera_serial_number,
    renterName: sqliteOrder.renter_name,
    customerService: sqliteOrder.customer_service,
    salesperson: sqliteOrder.salesperson,
    pickupDate: sqliteOrder.pickup_date,
    pickupTime: sqliteOrder.pickup_time,
    returnDate: sqliteOrder.return_date,
    returnTime: sqliteOrder.return_time,
    depositStatus: sqliteOrder.deposit_status,
    notes: sqliteOrder.notes,
    createdAt: sqliteOrder.created_at
  });

  // 初始化数据库
  const initDatabase = useCallback(async () => {
    if (!isElectron()) {
      setError('此功能仅在桌面应用中可用');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 初始化 Electron SQLite 数据库...');
      await initializeElectronSQLiteDB();
      setIsInitialized(true);
      console.log('✅ Electron SQLite 数据库初始化成功');
    } catch (err) {
      console.error('❌ Electron SQLite 数据库初始化失败:', err);
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
      console.log('🔄 从 Electron SQLite 数据库加载数据...');
      
      const [sqliteCameras, sqliteOrders, confirmations] = await Promise.all([
        electronSQLiteDB.getAllCameras(),
        electronSQLiteDB.getAllOrders(),
        electronSQLiteDB.getAllConfirmations()
      ]);

      const convertedCameras = sqliteCameras.map(convertSQLiteCameraToCamera);
      const convertedOrders = sqliteOrders.map(convertSQLiteOrderToOrder);

      setCameras(convertedCameras);
      setOrders(convertedOrders);
      setConfirmedPickups(confirmations.confirmedPickups);
      setConfirmedReturns(confirmations.confirmedReturns);

      console.log('✅ Electron SQLite 数据库数据加载完成:', {
        cameras: convertedCameras.length,
        orders: convertedOrders.length,
        pickups: confirmations.confirmedPickups.length,
        returns: confirmations.confirmedReturns.length
      });
    } catch (err) {
      console.error('❌ 加载 Electron SQLite 数据库数据失败:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // 相机操作
  const addCamera = useCallback(async (camera: Omit<Camera, 'id'>) => {
    if (!isInitialized) throw new Error('数据库未初始化');
    
    try {
      console.log('➕ 添加相机到 Electron SQLite 数据库:', camera);
      const newSQLiteCamera = await electronSQLiteDB.addCamera({
        model: camera.model,
        serial_number: camera.serialNumber
      });
      const newCamera = convertSQLiteCameraToCamera(newSQLiteCamera);
      setCameras(prev => [...prev, newCamera]);
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
      console.log('🗑️ 从 Electron SQLite 数据库删除相机:', id);
      await electronSQLiteDB.deleteCamera(id);
      setCameras(prev => prev.filter(camera => camera.id !== id));
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
      console.log('➕ 添加订单到 Electron SQLite 数据库:', order);
      const newSQLiteOrder = await electronSQLiteDB.addOrder({
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
      });
      const newOrder = convertSQLiteOrderToOrder(newSQLiteOrder);
      setOrders(prev => [...prev, newOrder]);
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
      console.log('✏️ 更新 Electron SQLite 数据库订单:', id, updates);
      const sqliteUpdates: Partial<SQLiteOrder> = {};
      
      if (updates.cameraModel !== undefined) sqliteUpdates.camera_model = updates.cameraModel;
      if (updates.cameraSerialNumber !== undefined) sqliteUpdates.camera_serial_number = updates.cameraSerialNumber;
      if (updates.renterName !== undefined) sqliteUpdates.renter_name = updates.renterName;
      if (updates.customerService !== undefined) sqliteUpdates.customer_service = updates.customerService;
      if (updates.salesperson !== undefined) sqliteUpdates.salesperson = updates.salesperson;
      if (updates.pickupDate !== undefined) sqliteUpdates.pickup_date = updates.pickupDate;
      if (updates.pickupTime !== undefined) sqliteUpdates.pickup_time = updates.pickupTime;
      if (updates.returnDate !== undefined) sqliteUpdates.return_date = updates.returnDate;
      if (updates.returnTime !== undefined) sqliteUpdates.return_time = updates.returnTime;
      if (updates.depositStatus !== undefined) sqliteUpdates.deposit_status = updates.depositStatus;
      if (updates.notes !== undefined) sqliteUpdates.notes = updates.notes;

      const updatedSQLiteOrder = await electronSQLiteDB.updateOrder(id, sqliteUpdates);
      const updatedOrder = convertSQLiteOrderToOrder(updatedSQLiteOrder);
      setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
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
      console.log('🗑️ 从 Electron SQLite 数据库删除订单:', id);
      await electronSQLiteDB.deleteOrder(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      // 同时从确认状态中移除
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
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
      
      console.log(`${newState ? '✅' : '❌'} 设置取机确认状态:`, orderId, newState);
      await electronSQLiteDB.setConfirmation(orderId, 'pickup', newState);
      
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
      
      console.log(`${newState ? '✅' : '❌'} 设置还机确认状态:`, orderId, newState);
      await electronSQLiteDB.setConfirmation(orderId, 'return', newState);
      
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
    if (!isInitialized) throw new Error('数据库未初始化');
    
    try {
      console.log('📤 导出 Electron SQLite 数据库数据...');
      const data = await electronSQLiteDB.exportData();
      
      // 转换为应用格式
      const exportData = {
        cameras: data.cameras.map(convertSQLiteCameraToCamera),
        orders: data.orders.map(convertSQLiteOrderToOrder),
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
  }, [isInitialized]);

  const importData = useCallback(async (importedCameras: Camera[], importedOrders: RentalOrder[]) => {
    if (!isInitialized) throw new Error('数据库未初始化');
    
    try {
      console.log('📥 导入数据到 Electron SQLite 数据库...');
      
      // 转换为 SQLite 格式
      const now = new Date().toISOString();
      const sqliteCameras = importedCameras.map(camera => ({
        id: camera.id,
        model: camera.model,
        serial_number: camera.serialNumber,
        created_at: now,
        updated_at: now
      }));

      const sqliteOrders = importedOrders.map(order => ({
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
        created_at: order.createdAt || now,
        updated_at: now
      }));

      await electronSQLiteDB.importData({
        cameras: sqliteCameras,
        orders: sqliteOrders
      });

      // 重新加载数据
      await loadData();
      console.log('✅ 数据导入完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData, isInitialized]);

  const clearAllData = useCallback(async () => {
    if (!isInitialized) throw new Error('数据库未初始化');
    
    try {
      console.log('🗑️ 清空 Electron SQLite 数据库...');
      await electronSQLiteDB.clearAllData();
      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);
      console.log('✅ Electron SQLite 数据库已清空');
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
        dbSize: '未知'
      };
    }
    
    try {
      return await electronSQLiteDB.getStats();
    } catch (err) {
      console.error('获取数据库统计失败:', err);
      return {
        cameras: cameras.length,
        orders: orders.length,
        confirmations: confirmedPickups.length + confirmedReturns.length,
        dbSize: '未知'
      };
    }
  }, [cameras.length, orders.length, confirmedPickups.length, confirmedReturns.length, isInitialized]);

  const optimizeDatabase = useCallback(async () => {
    if (!isInitialized) throw new Error('数据库未初始化');
    
    try {
      console.log('🔧 优化 Electron SQLite 数据库...');
      await electronSQLiteDB.optimizeDatabase();
      console.log('✅ 数据库优化完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据库优化失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const backupDatabase = useCallback(async () => {
    if (!isInitialized) throw new Error('数据库未初始化');
    
    try {
      console.log('💾 备份 Electron SQLite 数据库...');
      await electronSQLiteDB.backupDatabase();
      console.log('✅ 数据库备份完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据库备份失败';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  // 获取数据库文件路径
  const getDatabasePath = useCallback(() => {
    if (!isInitialized) return '';
    return electronSQLiteDB.getDatabasePath();
  }, [isInitialized]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 组件挂载时初始化
  useEffect(() => {
    initDatabase();
    
    // 清理函数
    return () => {
      if (isInitialized) {
        electronSQLiteDB.close();
      }
    };
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
    isInitialized,
    
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
    getDatabasePath,
    
    // 工具函数
    clearError,
    loadData
  };
}