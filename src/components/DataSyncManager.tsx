import React, { useState } from 'react';
import { Camera, RentalOrder } from '../types';
import { CameraService } from '../services/cameraService';
import { OrderService } from '../services/orderService';
import { ConfirmationService } from '../services/confirmationService';
import { RefreshCw, Upload, Download, AlertTriangle, CheckCircle, Database, HardDrive, FolderSync as Sync } from 'lucide-react';

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
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

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
        message: `同步成功！获取了 ${cameras.length} 台相机和 ${orders.length} 个订单` 
      });
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
      '这将会覆盖数据库中的现有数据。\n\n' +
      `本地数据：${localCameras.length} 台相机，${localOrders.length} 个订单`
    )) {
      return;
    }

    try {
      setSyncing(true);
      setSyncStatus({ type: 'info', message: '正在上传本地数据到数据库...' });

      // 上传相机数据
      for (const camera of localCameras) {
        try {
          await CameraService.create({
            model: camera.model,
            serialNumber: camera.serialNumber
          });
        } catch (error) {
          // 如果相机已存在，忽略错误
          if (error instanceof Error && !error.message.includes('已存在')) {
            throw error;
          }
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
        }
      }

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
        message: `上传成功！上传了 ${localCameras.length} 台相机和 ${localOrders.length} 个订单` 
      });

      // 上传完成后重新同步
      setTimeout(() => {
        syncFromDatabase();
      }, 1000);

    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : '上传失败' 
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
              {localCameras.length} 台相机<br />
              {localOrders.length} 个订单
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <Database className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-600">数据库</div>
            <div className="text-sm text-green-800">
              云端存储<br />
              多设备同步
            </div>
          </div>
        </div>

        {/* 同步操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={syncFromDatabase}
            disabled={syncing}
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
            disabled={syncing}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            上传本地数据到数据库
          </button>
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">数据同步说明：</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>从数据库同步</strong>：将云端数据下载到本地，覆盖本地数据</li>
                <li>• <strong>上传到数据库</strong>：将本地数据上传到云端，与现有数据合并</li>
                <li>• 建议在多设备使用前先进行数据同步</li>
                <li>• 上传前请确保本地数据是最新的</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}