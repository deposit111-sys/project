import React, { useState, useRef } from 'react';
import { Camera, RentalOrder } from '../types';
import { 
  exportSystemData, 
  importSystemData, 
  clearAllLocalData, 
  clearBusinessDataOnly,
  checkAndRepairData,
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          数据管理
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? '收起' : '展开'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* 存储信息 */}
          <div className="p-4 bg-gray-50 rounded-lg">
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
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{cameras.length}</div>
              <div className="text-sm text-blue-800">相机总数</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{orders.length}</div>
              <div className="text-sm text-green-800">订单总数</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              导出数据备份
            </button>

            <button
              onClick={handleImportClick}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Upload className="h-4 w-4 mr-2" />
              导入数据备份
            </button>

            <button
              onClick={() => {
                const result = checkAndRepairData();
                setImportStatus({
                  type: result.repaired ? 'success' : 'error',
                  message: result.repaired 
                    ? `数据修复完成：${result.issues.join(', ')}` 
                    : '数据检查完成，未发现问题'
                });
                setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
              }}
              className="w-full flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:ring-4 focus:ring-yellow-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              检查并修复数据
            </button>

            <button
              onClick={() => {
                if (window.confirm(
                  '确定要清空业务数据吗？\n\n' +
                  '此操作将清空相机和订单数据，但会保留确认状态。\n\n' +
                  '建议在清空前先导出数据备份。'
                )) {
                  clearBusinessDataOnly();
                  onImportData([], []);
                  setImportStatus({
                    type: 'success',
                    message: '业务数据已清空，确认状态已保留'
                  });
                  setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
                }
              }}
              className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:ring-4 focus:ring-orange-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空业务数据（保留确认状态）
            </button>
            <button
              onClick={handleClearData}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Trash2 className="h-4 w-4 mr-2" />
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
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {importStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <span className={`text-sm leading-relaxed ${
                importStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {importStatus.message}
              </span>
            </div>
          )}

          {/* 使用说明 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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