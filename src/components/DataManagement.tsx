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
  getStats: () => {
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
  getStats
}: DataManagementProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dbStats, setDbStats] = useState({
    totalCameras: 0,
    totalOrders: 0,
    activeRentals: 0,
    upcomingPickups: 0,
    upcomingReturns: 0
  });

  // 加载数据库统计信息
  useEffect(() => {
    const stats = getStats();
    setDbStats(stats);
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">本地数据管理</h2>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{dbStats.totalCameras}</div>
          <div className="text-sm text-gray-600">相机总数</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{dbStats.totalOrders}</div>
          <div className="text-sm text-gray-600">订单总数</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{dbStats.activeRentals}</div>
          <div className="text-sm text-gray-600">活跃租赁</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{dbStats.upcomingPickups}</div>
          <div className="text-sm text-gray-600">待取相机</div>
        </div>
        <div className="bg-indigo-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-600">{dbStats.upcomingReturns}</div>
          <div className="text-sm text-gray-600">待还相机</div>
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

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          使用说明
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>导出数据</strong>：将所有相机和订单数据导出为JSON文件</li>
          <li>• <strong>导入数据</strong>：从JSON文件导入数据（会合并到现有数据）</li>
          <li>• <strong>清空数据</strong>：删除所有本地数据（需要二次确认）</li>
          <li>• 数据存储在浏览器的IndexedDB中，具有良好的稳定性</li>
        </ul>
      </div>
    </div>
  );
}