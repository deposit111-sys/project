import React, { useState, useRef } from 'react';
import { Camera, RentalOrder } from '../types';
import { 
  exportSystemData, 
  importSystemData, 
  clearAllLocalData, 
  getStorageInfo, 
  formatFileSize,
  SystemData 
} from '../utils/dataUtils';
import { 
  Download, 
  Upload, 
  Trash2, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Database
} from 'lucide-react';

interface DataManagementProps {
  cameras: Camera[];
  orders: RentalOrder[];
  onImportData: (cameras: Camera[], orders: RentalOrder[]) => void;
}

export function DataManagement({ cameras, orders, onImportData }: DataManagementProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageInfo = getStorageInfo();

  const handleExportData = () => {
    try {
      exportSystemData(cameras, orders);
      setImportStatus({
        type: 'success',
        message: '数据导出成功！'
      });
      setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: '数据导出失败，请重试'
      });
      setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data: SystemData = await importSystemData(file);
      
      if (window.confirm(
        `确定要导入数据吗？这将替换当前所有数据。\n\n` +
        `导入数据包含：\n` +
        `- 相机：${data.cameras.length} 台\n` +
        `- 订单：${data.orders.length} 个\n` +
        `- 导出时间：${new Date(data.exportDate).toLocaleString('zh-CN')}`
      )) {
        onImportData(data.cameras, data.orders);
        setImportStatus({
          type: 'success',
          message: `数据导入成功！导入了 ${data.cameras.length} 台相机和 ${data.orders.length} 个订单`
        });
        setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
      }
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '数据导入失败'
      });
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    if (window.confirm(
      '警告：此操作将清空所有本地数据，包括相机信息和租赁订单。\n\n' +
      '建议在清空前先导出数据备份。\n\n' +
      '确定要继续吗？'
    )) {
      if (window.confirm('最后确认：真的要删除所有数据吗？此操作无法撤销！')) {
        clearAllLocalData();
        onImportData([], []);
        setImportStatus({
          type: 'success',
          message: '所有数据已清空'
        });
        setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
      }
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center group">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mr-3 group-hover:rotate-12 transition-transform duration-300">
            <Database className="h-5 w-5 text-white" />
          </div>
          数据管理
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-all duration-300"
        >
          {isExpanded ? '收起' : '展开'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* 存储信息 */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl shadow-sm">
            <div className="flex items-center mb-3">
              <HardDrive className="h-4 w-4 mr-2 text-gray-600" />
              <span className="font-medium text-gray-800">本地存储使用情况</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>相机数据：</span>
                <span>{formatFileSize(storageInfo.camerasSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>订单数据：</span>
                <span>{formatFileSize(storageInfo.ordersSize)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>总计：</span>
                <span>{formatFileSize(storageInfo.used)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                使用了 {storageInfo.percentage.toFixed(1)}% 的本地存储空间
              </div>
            </div>
          </div>

          {/* 数据统计 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
              <div className="text-2xl font-bold text-blue-600">{cameras.length}</div>
              <div className="text-sm text-blue-800">相机总数</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
              <div className="text-2xl font-bold text-green-600">{orders.length}</div>
              <div className="text-sm text-green-800">订单总数</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="group w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 focus:ring-4 focus:ring-green-200 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4 mr-2 group-hover:animate-bounce" />
              导出数据备份
            </button>

            <button
              onClick={handleImportClick}
              className="group w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Upload className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
              导入数据备份
            </button>

            <button
              onClick={handleClearData}
              className="group w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 focus:ring-4 focus:ring-red-200 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Trash2 className="h-4 w-4 mr-2 group-hover:animate-pulse" />
              清空所有数据
            </button>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 状态消息 */}
          {importStatus.type && (
            <div className={`flex items-start p-3 rounded-lg ${
              importStatus.type === 'success'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm'
                : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 shadow-sm'
            }`}>
              {importStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5 animate-pulse" />
              )}
              <span className={`text-sm leading-relaxed ${
                importStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {importStatus.message}
              </span>
            </div>
          )}

          {/* 使用说明 */}
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl shadow-sm">
            <div className="flex items-start">
              <FileText className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">数据管理说明：</div>
                <ul className="space-y-1 text-xs">
                  <li>• 所有数据自动保存在浏览器本地存储中</li>
                  <li>• 定期导出数据备份，防止数据丢失</li>
                  <li>• 导入数据会替换当前所有数据</li>
                  <li>• 清空数据操作无法撤销，请谨慎操作</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}