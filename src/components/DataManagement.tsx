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
  getStats: () => Promise<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  }>;
  optimizeDatabase: () => Promise<void>;
  backupDatabase: () => Promise<void>;
}

export function DataManagement({
  cameras,
  orders,
  onAddCamera,
  onAddOrder,
  onImportData,
  onExportData,
  onClearData,
  getStats,
  optimizeDatabase,
  backupDatabase,
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
  const [isBacking, setIsBacking] = useState(false);

  // 加载数据库统计信息
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getStats();
        setDbStats(stats);
      } catch (error) {
        console.error('获取统计信息失败:', error);
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
    setIsOptimizing(true);
    try {
      await optimizeDatabase();
      alert('数据库优化完成！');
      // 重新加载统计信息
      const stats = await getStats();
      setDbStats(stats);
    } catch (error) {
      console.error('数据库优化失败:', error);
      alert('数据库优化失败，请重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleBackup = async () => {
    setIsBacking(true);
    try {
      await backupDatabase();
      alert('数据库备份完成！');
    } catch (error) {
      console.error('数据库备份失败:', error);
      alert('数据库备份失败，请重试');
    } finally {
      setIsBacking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Supabase 云端数据库管理</h2>
        <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          云端 PostgreSQL
        </div>
      </div>

      {/* 数据库信息概览 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-gray-800 mb-3">云端数据库特性</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">✓</div>
            <div className="text-gray-600">实时同步</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">✓</div>
            <div className="text-gray-600">自动备份</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">✓</div>
            <div className="text-gray-600">高可用性</div>
          </div>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          <div className="text-sm text-gray-600">确认记录</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{dbStats.dbSize}</div>
          <div className="text-sm text-gray-600">数据库大小</div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* 导出数据 */}
        <button
          onClick={onExportData}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          导出数据
        </button>

        {/* 导入数据 */}
        <div className="space-y-1">
          <input
            type="file"
            accept=".json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          <button
            onClick={handleImport}
            disabled={!importFile}
            className="w-full flex items-center justify-center gap-1 bg-green-600 text-white px-2 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Upload className="w-4 h-4" />
            导入数据
          </button>
        </div>

        {/* 数据库优化 */}
        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Settings className={`w-5 h-5 ${isOptimizing ? 'animate-spin' : ''}`} />
          {isOptimizing ? '优化中...' : '优化数据库'}
        </button>

        {/* 数据库备份 */}
        <button
          onClick={handleBackup}
          disabled={isBacking}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Archive className="w-5 h-5" />
          {isBacking ? '备份中...' : '备份数据库'}
        </button>

        {/* 清空数据 */}
        <div className="space-y-1">
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
              className="w-full text-xs text-gray-600 hover:text-gray-800"
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
          Supabase 云端数据库说明
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>导出数据</strong>：将云端数据库数据导出为 JSON 文件</li>
          <li>• <strong>导入数据</strong>：从 JSON 文件导入数据到云端数据库</li>
          <li>• <strong>优化数据库</strong>：Supabase 自动优化，无需手动操作</li>
          <li>• <strong>备份数据库</strong>：导出完整的数据库备份文件</li>
          <li>• <strong>清空数据</strong>：删除所有本地数据（需要二次确认）</li>
          <li>• 基于 PostgreSQL 的企业级云端数据库，支持实时同步和自动备份</li>
          <li>• 支持大量数据的高效处理，具有 ACID 事务保证和高可用性</li>
          <li>• 数据存储在云端，不依赖浏览器缓存，确保数据持久性和安全性</li>
        </ul>
      </div>
    </div>
  );
}