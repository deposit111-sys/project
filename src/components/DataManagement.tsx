import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, BarChart3, Settings, Archive } from 'lucide-react';
import { Camera, RentalOrder } from '../types';

interface DataManagementProps {
  cameras: Camera[];
  orders: RentalOrder[];
  onAddCamera: (camera: Omit<Camera, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddOrder: (order: Omit<RentalOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onImportData: (data: { cameras: Camera[]; orders: RentalOrder[] }) => void;
  onExportData: () => void;
  onClearData: () => void;
  onOptimizeDatabase?: () => Promise<void>;
  onBackupDatabase?: (path?: string) => Promise<void>;
  getStats: () => Promise<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  }> | {
    totalCameras: number;
    totalOrders: number;
    activeRentals: number;
    upcomingPickups: number;
    upcomingReturns: number;
  };
}

export function DataManagement({
  cameras,
  orders,
  onAddCamera,
  onAddOrder,
  onImportData,
  onExportData,
  onClearData,
  onOptimizeDatabase,
  onBackupDatabase,
  getStats
}: DataManagementProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dbStats, setDbStats] = useState({
    cameras: 0,
    orders: 0,
    confirmations: 0,
    dbSize: '0 KB'
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // 加载数据库统计信息
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getStats();
        if ('totalCameras' in stats) {
          // 兼容旧版本统计格式
          setDbStats({
            cameras: stats.totalCameras,
            orders: stats.totalOrders,
            confirmations: 0,
            dbSize: '未知'
          });
        } else {
          setDbStats(stats);
        }
      } catch (error) {
        console.error('获取数据库统计失败:', error);
      }
    };

    loadStats();
  }, [getStats, cameras.length, orders.length]);

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      
      if (data.cameras && data.orders) {
        onImportData(data);
        setImportFile(null);
        alert('数据导入成功！');
      } else {
        alert('导入文件格式不正确');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败，请检查文件格式');
    }
  };

  const handleClearData = () => {
    if (showClearConfirm) {
      onClearData();
      setShowClearConfirm(false);
      alert('所有数据已清空');
    } else {
      setShowClearConfirm(true);
    }
  };

  const handleOptimize = async () => {
    if (!onOptimizeDatabase) return;
    
    setIsOptimizing(true);
    try {
      await onOptimizeDatabase();
      alert('数据库优化完成！');
    } catch (error) {
      console.error('数据库优化失败:', error);
      alert('数据库优化失败');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleBackup = async () => {
    if (!onBackupDatabase) return;
    
    setIsBackingUp(true);
    try {
      await onBackupDatabase();
      alert('数据库备份完成！');
    } catch (error) {
      console.error('数据库备份失败:', error);
      alert('数据库备份失败');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">SQLite数据管理</h2>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{dbStats.cameras}</div>
          <div className="text-sm text-gray-600">相机总数</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{dbStats.orders}</div>
          <div className="text-sm text-gray-600">订单总数</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{dbStats.confirmations}</div>
          <div className="text-sm text-gray-600">进行中</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-600">{dbStats.dbSize}</div>
          <div className="text-sm text-gray-600">数据库大小</div>
        </div>
        <div className="bg-indigo-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-600">{cameras.length + orders.length}</div>
          <div className="text-sm text-gray-600">总记录数</div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* 导出数据 */}
        <button
          onClick={onExportData}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          导出数据
        </button>

        {/* 导入数据 */}
        <div className="space-y-2">
          <input
            type="file"
            accept=".json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          <button
            onClick={handleImport}
            disabled={!importFile}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            导入数据
          </button>
        </div>

        {/* 清空数据 */}
        <div className="space-y-2">
          <button
            onClick={handleClearData}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
              showClearConfirm
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {showClearConfirm ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                确认清空
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                清空数据
              </>
            )}
          </button>
          {showClearConfirm && (
            <button
              onClick={() => setShowClearConfirm(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* SQLite 专用功能 */}
      {(onOptimizeDatabase || onBackupDatabase) && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            SQLite 数据库维护
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 数据库优化 */}
            {onOptimizeDatabase && (
              <button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Settings className={`w-5 h-5 ${isOptimizing ? 'animate-spin' : ''}`} />
                {isOptimizing ? '优化中...' : '优化数据库'}
              </button>
            )}

            {/* 数据库备份 */}
            {onBackupDatabase && (
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Archive className={`w-5 h-5 ${isBackingUp ? 'animate-pulse' : ''}`} />
                {isBackingUp ? '备份中...' : '备份数据库'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          使用说明
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>导出数据</strong>：将所有相机和订单数据导出为JSON文件</li>
          <li>• <strong>导入数据</strong>：从JSON文件导入数据（会覆盖现有数据）</li>
          <li>• <strong>清空数据</strong>：删除所有SQLite数据（需要二次确认）</li>
          <li>• <strong>优化数据库</strong>：清理碎片，提高查询性能</li>
          <li>• <strong>备份数据库</strong>：创建完整的数据库文件备份</li>
          <li>• SQLite提供更高的数据稳定性和查询性能</li>
          <li>• 数据文件位置：./camera_rental.db</li>
        </ul>
      </div>
    </div>
  );
}