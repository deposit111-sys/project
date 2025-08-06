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
  SystemData,
  performComprehensiveDataCheck,
  attemptFullDataRecovery,
  scanAllLocalStorageKeys
} from '../utils/dataUtils';
import { 
  Download, 
  Upload, 
  Trash2, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Database,
  Shield,
  Activity,
  Search,
  TestTube,
  X
} from 'lucide-react';
import { CapacityTestTool } from './CapacityTestTool';

interface DataManagementProps {
  cameras: Camera[];
  orders: RentalOrder[];
  onImportData: (cameras: Camera[], orders: RentalOrder[]) => void;
}

export function DataManagement({ cameras, orders, onImportData }: DataManagementProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCapacityTest, setShowCapacityTest] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'warning' | 'critical';
    lastCheck: string;
  } | null>(null);
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

  const handleHealthCheck = () => {
    const result = performComprehensiveDataCheck();
    setHealthStatus({
      status: result.status,
      lastCheck: new Date().toLocaleString('zh-CN')
    });
    
    const statusMessages = {
      healthy: '数据健康状况良好！所有数据和备份都完整。',
      warning: '数据健康状况一般，发现一些备份缺失，建议进行修复。',
      critical: '数据健康状况严重，发现重要数据丢失，请立即进行修复！'
    };
    
    setImportStatus({
      type: result.status === 'healthy' ? 'success' : 'error',
      message: statusMessages[result.status] + (result.recommendations.length > 0 ? '\n建议：' + result.recommendations.join('; ') : '')
    });
    
    setTimeout(() => setImportStatus({ type: null, message: '' }), 8000);
  };

  const handleDataRecovery = () => {
    const result = checkAndRepairData();
    if (result.repaired) {
      setImportStatus({
        type: 'success',
        message: `数据恢复成功！已从备份恢复：${result.issues.join(', ')}`
      });
      // 刷新页面以重新加载恢复的数据
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setImportStatus({
        type: 'error',
        message: '未找到可恢复的备份数据，请尝试导入之前的数据备份文件'
      });
    }
    setTimeout(() => setImportStatus({ type: null, message: '' }), 8000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          数据管理
        </h2>
        <div className="flex items-center space-x-3">
          {healthStatus && (
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              healthStatus.status === 'healthy' 
                ? 'bg-green-100 text-green-800'
                : healthStatus.status === 'warning'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <Shield className="h-3 w-3 mr-1" />
              {healthStatus.status === 'healthy' ? '健康' : healthStatus.status === 'warning' ? '警告' : '严重'}
            </div>
          )}
          <button
            onClick={() => setShowCapacityTest(!showCapacityTest)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <TestTube className="h-4 w-4 mr-2" />
            容量测试
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {showCapacityTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">数据存储容量测试</h2>
              <button
                onClick={() => setShowCapacityTest(false)}
                className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <CapacityTestTool />
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-6">
          {/* 数据健康状态 */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium text-blue-800">数据健康监控</span>
              </div>
              <button
                onClick={handleHealthCheck}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                立即检查
              </button>
            </div>
            {healthStatus && (
              <div className="text-sm text-blue-700">
                <div className="flex items-center justify-between">
                  <span>上次检查：{healthStatus.lastCheck}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    healthStatus.status === 'healthy' 
                      ? 'bg-green-100 text-green-800'
                      : healthStatus.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {healthStatus.status === 'healthy' ? '数据健康' : healthStatus.status === 'warning' ? '需要注意' : '需要修复'}
                  </span>
                </div>
              </div>
            )}
          </div>

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
              <div className="flex justify-between">
                <span>备份数据：</span>
                <span>{formatFileSize(storageInfo.backupSize)}</span>
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
              <div className="text-2xl font-bold text-blue-600">{cameras.length.toLocaleString()}</div>
              <div className="text-sm text-blue-800">相机总数</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{orders.length.toLocaleString()}</div>
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
                handleHealthCheck(); // 修复后重新检查健康状态
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
              onClick={handleDataRecovery}
              className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Shield className="h-4 w-4 mr-2" />
              紧急数据恢复
            </button>

            <button
              onClick={() => {
                const recovery = attemptFullDataRecovery();
                
                if (recovery.recovered) {
                  // 恢复数据到主存储
                  if (recovery.data.cameras.length > 0) {
                    localStorage.setItem('cameras', JSON.stringify(recovery.data.cameras));
                  }
                  if (recovery.data.orders.length > 0) {
                    localStorage.setItem('orders', JSON.stringify(recovery.data.orders));
                  }
                  if (recovery.data.confirmedPickups.length > 0) {
                    localStorage.setItem('confirmedPickups', JSON.stringify(recovery.data.confirmedPickups));
                  }
                  if (recovery.data.confirmedReturns.length > 0) {
                    localStorage.setItem('confirmedReturns', JSON.stringify(recovery.data.confirmedReturns));
                  }
                  
                  onImportData(recovery.data.cameras, recovery.data.orders);
                  setImportStatus({
                    type: 'success',
                    message: `深度恢复成功！${recovery.source}找到 ${recovery.data.cameras.length} 台相机，${recovery.data.orders.length} 个订单`
                  });
                  
                  // 刷新页面以重新加载数据
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                } else {
                  setImportStatus({
                    type: 'error',
                    message: '深度扫描未找到任何可恢复的数据。请检查是否有手动导出的备份文件。'
                  });
                }
                setTimeout(() => setImportStatus({ type: null, message: '' }), 8000);
              }}
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              深度数据恢复
            </button>

            <button
              onClick={() => {
                const scan = scanAllLocalStorageKeys();
                
                let message = `扫描完成！\n\n总共找到 ${scan.allKeys.length} 个存储键\n`;
                if (scan.possibleDataKeys.length > 0) {
                  message += `可能包含数据的键：\n${scan.possibleDataKeys.join('\n')}\n\n`;
                  message += '请尝试"深度数据恢复"功能';
                } else {
                  message += '未找到可能包含相机或订单数据的键';
                }
                
                setImportStatus({
                  type: scan.possibleDataKeys.length > 0 ? 'success' : 'error',
                  message
                });
                setTimeout(() => setImportStatus({ type: null, message: '' }), 10000);
              }}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Search className="h-4 w-4 mr-2" />
              扫描本地存储
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
                  <li>• 所有数据自动保存在浏览器本地存储中，具有多重备份保护</li>
                  <li>• 系统自动创建主备份和二级备份，确保数据安全</li>
                  <li>• 每5秒自动进行定期保存，防止数据丢失</li>
                  <li>• 定期导出数据备份到文件，作为额外保护</li>
                  <li>• 导入数据会替换当前所有数据</li>
                  <li>• 清空数据操作无法撤销，请谨慎操作</li>
                  <li>• 建议定期进行数据健康检查，确保数据完整性</li>
                  <li>• <strong>数据丢失时，请先点击"紧急数据恢复"尝试从备份恢复</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* 数据恢复指南 */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <div className="font-medium mb-1">数据丢失恢复指南：</div>
                <ol className="space-y-1 text-xs list-decimal list-inside">
                  <li><strong>第一步：</strong>点击"扫描本地存储"查看是否有残留的数据</li>
                  <li><strong>第二步：</strong>点击"深度数据恢复"尝试从所有可能的备份源恢复</li>
                  <li><strong>第三步：</strong>如果仍然失败，点击"紧急数据恢复"从标准备份恢复</li>
                  <li><strong>第四步：</strong>最后尝试"导入数据备份"导入手动备份文件</li>
                  <li><strong>预防措施：</strong>定期导出数据备份到本地文件作为最后保障</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}