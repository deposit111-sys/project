import { useState, useCallback, useEffect } from 'react';
import { Camera, RentalOrder } from '../types';
import { sqliteDB } from '../lib/sqliteDB';

export function useSQLiteDatabase() {
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
    serialNumber: dbCamera.serial_number
  });

  const convertDBOrderToOrder = (dbOrder: any): RentalOrder => ({
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

  // 加载所有数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 从SQLite数据库加载数据...');
      
      const [dbCameras, dbOrders, confirmations] = await Promise.all([
        sqliteDB.getAllCameras(),
        sqliteDB.getAllOrders(),
        sqliteDB.getAllConfirmations()
      ]);

      const convertedCameras = dbCameras.map(convertDBCameraToCamera);
      const convertedOrders = dbOrders.map(convertDBOrderToOrder);

      setCameras(convertedCameras);
      setOrders(convertedOrders);
      setConfirmedPickups(confirmations.confirmedPickups);
      setConfirmedReturns(confirmations.confirmedReturns);

      console.log('✅ SQLite数据库数据加载完成:', {
        cameras: convertedCameras.length,
        orders: convertedOrders.length,
        pickups: confirmations.confirmedPickups.length,
        returns: confirmations.confirmedReturns.length
      });
    } catch (err) {
      console.error('❌ 加载SQLite数据库数据失败:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 相机操作
  const addCamera = useCallback(async (camera: Omit<Camera, 'id'>) => {
    try {
      console.log('➕ 添加相机到SQLite数据库:', camera);
      const newDBCamera = await sqliteDB.addCamera({
        model: camera.model,
        serial_number: camera.serialNumber
      });
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
      console.log('🗑️ 从SQLite数据库删除相机:', id);
      await sqliteDB.deleteCamera(id);
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
      console.log('➕ 添加订单到SQLite数据库:', order);
      const newDBOrder = await sqliteDB.addOrder({
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
      console.log('✏️ 更新SQLite数据库订单:', id, updates);
      
      // 转换字段名
      const dbUpdates: any = {};
      if (updates.cameraModel) dbUpdates.camera_model = updates.cameraModel;
      if (updates.cameraSerialNumber) dbUpdates.camera_serial_number = updates.cameraSerialNumber;
      if (updates.renterName) dbUpdates.renter_name = updates.renterName;
      if (updates.customerService) dbUpdates.customer_service = updates.customerService;
      if (updates.salesperson) dbUpdates.salesperson = updates.salesperson;
      if (updates.pickupDate) dbUpdates.pickup_date = updates.pickupDate;
      if (updates.pickupTime) dbUpdates.pickup_time = updates.pickupTime;
      if (updates.returnDate) dbUpdates.return_date = updates.returnDate;
      if (updates.returnTime) dbUpdates.return_time = updates.returnTime;
      if (updates.depositStatus) dbUpdates.deposit_status = updates.depositStatus;
      if (updates.notes) dbUpdates.notes = updates.notes;
      
      const updatedDBOrder = await sqliteDB.updateOrder(id, dbUpdates);
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
      console.log('🗑️ 从SQLite数据库删除订单:', id);
      await sqliteDB.deleteOrder(id);
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
      await sqliteDB.setConfirmation(orderId, 'pickup', newState);
      
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
      await sqliteDB.setConfirmation(orderId, 'return', newState);
      
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
      console.log('📤 导出SQLite数据库数据...');
      const data = await sqliteDB.exportData();
      
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
      console.log('📥 导入数据到SQLite数据库...');
      
      // 转换为数据库格式
      const now = new Date().toISOString();
      const dbCameras = importedCameras.map(camera => ({
        id: camera.id,
        model: camera.model,
        serial_number: camera.serialNumber,
        created_at: now,
        updated_at: now
      }));

      const dbOrders = importedOrders.map(order => ({
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

      await sqliteDB.importData({
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
      console.log('🗑️ 清空SQLite数据库...');
      await sqliteDB.clearAllData();
      setCameras([]);
      setOrders([]);
      setConfirmedPickups([]);
      setConfirmedReturns([]);
      console.log('✅ SQLite数据库已清空');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空数据失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      return await sqliteDB.getStats();
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

  // 数据库优化
  const optimizeDatabase = useCallback(async () => {
    try {
      console.log('🔧 优化SQLite数据库...');
      await sqliteDB.optimize();
      console.log('✅ 数据库优化完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据库优化失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 数据库备份
  const backupDatabase = useCallback(async (backupPath?: string) => {
    try {
      const defaultPath = `./backup_${new Date().toISOString().split('T')[0]}.db`;
      const path = backupPath || defaultPath;
      
      console.log('💾 备份SQLite数据库...');
      await sqliteDB.backup(path);
      console.log('✅ 数据库备份完成:', path);
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
    
    // 数据库维护
    optimizeDatabase,
    backupDatabase,
    
    // 工具函数
    clearError,
    loadData
  };
}