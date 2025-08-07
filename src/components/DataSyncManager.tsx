import React, { useState } from 'react';
import { Camera, RentalOrder } from '../types';
import { CameraService } from '../services/cameraService';
import { OrderService } from '../services/orderService';
import { ConfirmationService } from '../services/confirmationService';
import { RefreshCw, Upload, Download, AlertTriangle, CheckCircle, Database, HardDrive, FolderSync as Sync, RotateCcw, Trash2 } from 'lucide-react';

interface DataSyncManagerProps {
  localCameras: Camera[];
  localOrders: RentalOrder[];
  localConfirmedPickups: string[];
  localConfirmedReturns: string[];
  onSyncComplete: (
    cameras: Camera[], 
    orders: RentalOrder[], 
    confirmedPickups: string[], 
    confirmedReturns: string[]
  ) => void;
}

export function DataSyncManager({ 
  localCameras, 
  localOrders, 
  localConfirmedPickups, 
  localConfirmedReturns,
  onSyncComplete 
}: DataSyncManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dbStats, setDbStats] = useState<{
    cameras: number;
    orders: number;
    lastUpdated: string | null;
  }>({
    cameras: 0,
    orders: 0,
    lastUpdated: null
  });
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // 获取云端数据统计
  const fetchDatabaseStats = async () => {
    try {
      setRefreshing(true);
      setSyncStatus({ type: 'info', message: '正在获取云端数据统计...' });

      const [cameras, orders] = await Promise.all([
        CameraService.getAll(),
        OrderService.getAll()
      ]);

      setDbStats({
        cameras: cameras.length,
        orders: orders.length,
        lastUpdated: new Date().toLocaleString('zh-CN')
      });

      setSyncStatus({ 
        type: 'success', 
        message: `云端数据统计更新成功！相机：${cameras.length.toLocaleString()} 台，订单：${orders.length.toLocaleString()} 个` 
      });
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : '获取云端数据统计失败' 
      });
    } finally {
      setRefreshing(false);
      setTimeout(() => setSyncStatus({ type: null, message: '' }), 3000);
    }
  };

  // 组件加载时获取云端数据统计
  React.useEffect(() => {
    fetchDatabaseStats();
  }, []);

  // 从数据库同步到本地
  const syncFromDatabase = async () => {
    try {
      setSyncing(true);
      setSyncStatus({ type: 'info', message: '正在从数据库同步数据...' });

      const [cameras, orders, confirmations] = await Promise.all([
        CameraService.getAll(),
        OrderService.getAll(),
        ConfirmationService.getAll()
      ]);

      onSyncComplete(
        cameras, 
        orders, 
        confirmations.confirmedPickups, 
        confirmations.confirmedReturns
      );

      setSyncStatus({ 
        type: 'success', 
        message: `同步成功！获取了 ${cameras.length.toLocaleString()} 台相机和 ${orders.length.toLocaleString()} 个订单` 
      });

      // 更新云端数据统计
      setDbStats({
        cameras: cameras.length,
        orders: orders.length,
        lastUpdated: new Date().toLocaleString('zh-CN')
      });
      
      // 同步完成后，强制刷新页面以确保所有组件都使用最新数据
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : '同步失败' 
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus({ type: null, message: '' }), 5000);
    }
  };

  // 上传本地数据到数据库
  const uploadToDatabase = async () => {
    if (!window.confirm(
      '确定要将本地数据上传到数据库吗？\n\n' +
      '⚠️ 警告：这将完全覆盖云端数据库中的所有数据！\n\n' +
      '操作步骤：\n' +
      '1. 清空云端数据库\n' +
      '2. 上传本地数据到云端\n\n' +
      `本地数据：${localCameras.length} 台相机，${localOrders.length} 个订单`
    )) {
      return;
    }

    try {
      setSyncing(true);
      setSyncStatus({ type: 'info', message: '第1步：正在清空云端数据库...' });

      // 第一步：清空云端数据库
      const [cloudCameras, cloudOrders] = await Promise.all([
        CameraService.getAll(),
        OrderService.getAll()
      ]);

      // 删除所有云端订单（会级联删除确认状态）
      for (const order of cloudOrders) {
        await OrderService.delete(order.id);
      }

      // 删除所有云端相机
      for (const camera of cloudCameras) {
        await CameraService.delete(camera.id);
      }

      setSyncStatus({ type: 'info', message: `第2步：正在上传本地数据到云端数据库...` });

      // 上传相机数据
      for (const camera of localCameras) {
        try {
          await CameraService.create({
            model: camera.model,
            serialNumber: camera.serialNumber
          });
        } catch (error) {
          // 由于已经清空了云端数据库，这里不应该有重复数据错误
          console.error('Error uploading camera:', error);
          throw error;
        }
      }

      // 上传订单数据
      const uploadedOrders: RentalOrder[] = [];
      for (const order of localOrders) {
        try {
          const newOrder = await OrderService.create({
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
            notes: order.notes
          });
          uploadedOrders.push(newOrder);
        } catch (error) {
          console.error('Error uploading order:', error);
          throw error;
        }
      }

      setSyncStatus({ type: 'info', message: '第3步：正在同步确认状态...' });

      // 上传确认状态
      for (const order of uploadedOrders) {
        const oldOrderIndex = localOrders.findIndex(o => 
          o.cameraModel === order.cameraModel && 
          o.cameraSerialNumber === order.cameraSerialNumber &&
          o.renterName === order.renterName &&
          o.pickupDate === order.pickupDate
        );

        if (oldOrderIndex !== -1) {
          const oldOrderId = localOrders[oldOrderIndex].id;
          
          if (localConfirmedPickups.includes(oldOrderId)) {
            await ConfirmationService.confirmPickup(order.id);
          }
          
          if (localConfirmedReturns.includes(oldOrderId)) {
            await ConfirmationService.confirmReturn(order.id);
          }
        }
      }

      setSyncStatus({ 
        type: 'success', 
        message: `覆盖上传成功！已完全替换云端数据：${localCameras.length.toLocaleString()} 台相机和 ${localOrders.length.toLocaleString()} 个订单` 
      });

      // 上传完成后重新同步
      setTimeout(() => {
        syncFromDatabase();
      }, 1000);

    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : '覆盖上传失败' 
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus({ type: null, message: '' }), 5000);
    }
  };

  // 清空云端数据库
  const clearDatabase = async () => {
    if (!window.confirm(
      '警告：此操作将清空云端数据库中的所有数据！\n\n' +
      '这包括：\n' +
      '- 所有相机数据\n' +
      '- 所有订单数据\n' +
      '- 所有确认状态数据\n\n' +
      '此操作无法撤销！确定要继续吗？'
    )) {
      return;
    }

    if (!window.confirm('最后确认：真的要清空整个云端数据库吗？')) {
      return;
    }

    try {
      setSyncing(true);
      setSyncStatus({ type: 'info', message: '正在清空云端数据库...' });

      // 获取所有数据用于统计
      const [cameras, orders] = await Promise.all([
        CameraService.getAll(),
        OrderService.getAll()
      ]);

      const totalCameras = cameras.length;
      const totalOrders = orders.length;

      // 删除所有订单（会级联删除确认状态）
      for (const order of orders) {
        await OrderService.delete(order.id);
      }

      // 删除所有相机
      for (const camera of cameras) {
        await CameraService.delete(camera.id);
      }

      setSyncStatus({ 
        type: 'success', 
        message: `云端数据库清空成功！删除了 ${totalCameras} 台相机和 ${totalOrders} 个订单` 
      });

      // 更新云端数据统计
      setDbStats({
        cameras: 0,
        orders: 0,
        lastUpdated: new Date().toLocaleString('zh-CN')
      });

    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : '清空数据库失败' 
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus({ type: null, message: '' }), 5000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Sync className="h-5 w-5 mr-2" />
        数据同步管理
      </h2>

      <div className="space-y-4">
        {/* 同步状态显示 */}
        {syncStatus.type && (
          <div className={`flex items-start p-3 rounded-lg ${
            syncStatus.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : syncStatus.type === 'error'
              ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            {syncStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            ) : syncStatus.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5 animate-spin" />
            )}
            <span className={`text-sm leading-relaxed ${
              syncStatus.type === 'success' ? 'text-green-700' : 
              syncStatus.type === 'error' ? 'text-red-700' : 'text-blue-700'
            }`}>
              {syncStatus.message}
            </span>
          </div>
        )}

        {/* 数据统计 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <HardDrive className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-600">本地数据</div>
            <div className="text-sm text-blue-800">
              {localCameras.length.toLocaleString()} 台相机<br />
              {localOrders.length.toLocaleString()} 个订单
            </div>
            <div className="text-xs text-blue-600 mt-1">实时数据</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Database className="h-6 w-6 text-green-600 mr-1" />
              <button
                onClick={fetchDatabaseStats}
                disabled={refreshing}
                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors duration-200 disabled:opacity-50"
                title="刷新云端数据统计"
              >
                <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-lg font-bold text-green-600">数据库</div>
            <div className="text-sm text-green-800">
              {dbStats.cameras.toLocaleString()} 台相机<br />
              {dbStats.orders.toLocaleString()} 个订单
            </div>
            {dbStats.lastUpdated && (
              <div className="text-xs text-green-600 mt-1">
                更新于: {dbStats.lastUpdated}
              </div>
            )}
          </div>
        </div>

        {/* 同步操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={fetchDatabaseStats}
            disabled={refreshing || syncing}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            刷新云端数据统计
          </button>

          <button
            onClick={syncFromDatabase}
            disabled={syncing || refreshing}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            从数据库同步到本地
          </button>

          <button
            onClick={uploadToDatabase}
            disabled={syncing || refreshing}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            覆盖上传本地数据到云端
          </button>

          <button
            onClick={clearDatabase}
            disabled={syncing || refreshing}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            清空云端数据库
          </button>
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">数据同步说明：</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>刷新云端数据统计</strong>：获取最新的云端数据数量信息</li>
                <li>• <strong>从数据库同步</strong>：将云端数据下载到本地，覆盖本地数据</li>
                <li>• <strong>覆盖上传到云端</strong>：清空云端数据库，然后上传本地数据完全替换</li>
                <li>• <strong>清空云端数据库</strong>：删除云端数据库中的所有数据（危险操作）</li>
                <li>• 建议在多设备使用前先进行数据同步</li>
                <li>• <strong>覆盖上传前请确保本地数据是最新且正确的</strong></li>
                <li>• 如果添加数据后本地界面未更新，请点击刷新按钮</li>
                <li>• <strong>警告：清空数据库操作无法撤销，请谨慎使用</strong></li>
                <li>• <strong>警告：覆盖上传会完全替换云端数据，请谨慎使用</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}