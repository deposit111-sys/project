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
  onAddCamera: (camera: Omit<Camera, 'id'>) => void;
  onAddOrder: (order: Omit<RentalOrder, 'id' | 'createdAt'>) => void;
  onImportData: (cameras: Camera[], orders: RentalOrder[]) => Promise<void>;
  onExportData: () => Promise<void>;
  onClearData: () => Promise<void>;
  getStats: () => Promise<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  }>;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCapacityTest, setShowCapacityTest] = useState(false);
  const [dbStats, setDbStats] = useState<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取数据库统计
  const fetchStats = async () => {
    try {
      const stats = await getStats();
      setDbStats(stats);
    } catch (error) {
      console.error('获取数据库统计失败:', error);
    }
  };

  // 组件加载时获取统计
  useEffect(() => {
    fetchStats();
  }, [cameras.length, orders.length]);

  const handleExportData = () => {
    try {
      onExportData();
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
        await onImportData(data.cameras, data.orders);
        setImportStatus({
          type: 'success',
          message: `数据导入成功！导入了 ${data.cameras.length} 台相机和 ${data.orders.length} 个订单`
        });
        // 重新获取统计
        await fetchStats();
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

  const handleClearData = async () => {
    if (window.confirm(
      '警告：此操作将清空所有本地数据库数据，包括相机信息和租赁订单。\n\n' +
      '建议在清空前先导出数据备份。\n\n' +
      '确定要继续吗？'
    )) {
      if (window.confirm('最后确认：真的要删除所有数据吗？此操作无法撤销！')) {
        try {
          await onClearData();
          setImportStatus({
            type: 'success',
            message: '所有数据已清空'
          });
          // 重新获取统计
          await fetchStats();
          setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
        } catch (error) {
          setImportStatus({
            type: 'error',
              <div className="font-medium mb-1">本地数据库说明：</div>
          });
                <li>• 使用<strong>IndexedDB本地数据库</strong>存储数据，比浏览器缓存更稳定可靠</li>
                <li>• 数据存储在用户设备本地，不依赖网络连接</li>
                <li>• 支持大容量数据存储，适合长期使用</li>
                <li>• 具有完整的数据库功能：索引、事务、查询等</li>
                <li>• 数据持久化保存，浏览器关闭重开后数据依然存在</li>
                <li>• 定期导出数据备份文件，作为额外保护</li>
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
                <li>• <strong>IndexedDB比localStorage更安全，数据不会因为清理缓存而丢失</strong></li>
          <Database className="h-5 w-5 mr-2" />
          本地数据库管理
        </h2>
        <div className="flex items-center space-x-3">
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
              <CapacityTestTool 
                cameras={cameras}
                orders={orders}
                onAddCamera={onAddCamera}
                onAddOrder={onAddOrder}
              />
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-6">
          {/* 数据库信息 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-3">
              <HardDrive className="h-4 w-4 mr-2 text-gray-600" />
              <span className="font-medium text-gray-800">本地数据库使用情况</span>
              <button
                onClick={fetchStats}
                className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                刷新
              </button>
            </div>
            {dbStats ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>相机记录：</span>
                  <span>{dbStats.cameras.toLocaleString()} 条</span>
                </div>
                <div className="flex justify-between">
                  <span>订单记录：</span>
                  <span>{dbStats.orders.toLocaleString()} 条</span>
                </div>
                <div className="flex justify-between">
                  <span>确认记录：</span>
                  <span>{dbStats.confirmations.toLocaleString()} 条</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>数据库大小：</span>
                  <span>{dbStats.dbSize}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">正在获取数据库统计...</div>
            )}
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
                  <li>• 所有数据自动保存在浏览器本地存储中，具有<strong>五重备份保护</strong></li>
                  <li>• 系统自动创建主备份、二级备份、三级备份、时间戳备份和紧急备份</li>
                  <li>• 每2秒自动进行定期保存，页面关闭前强制保存，防止数据丢失</li>
                  <li>• 每30分钟自动进行数据完整性检查和修复</li>
                  <li>• 保存失败时自动重试最多5次，并创建紧急备份</li>
                  <li>• 定期导出数据备份到文件，作为额外保护</li>
                  <li>• 导入数据会替换当前所有数据</li>
                  <li>• 清空数据操作无法撤销，请谨慎操作</li>
                  <li>• 建议定期进行数据健康检查，确保数据完整性</li>
                  <li>• <strong>数据丢失时，系统会自动从多层备份中恢复，无需手动操作</strong></li>
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
                  <li><strong>自动恢复：</strong>系统会在启动时自动检查并修复数据问题</li>
                  <li><strong>第一步：</strong>点击"扫描本地存储"查看是否有残留的数据</li>
                  <li><strong>第二步：</strong>点击"深度数据恢复"尝试从所有可能的备份源恢复</li>
                  <li><strong>第三步：</strong>如果仍然失败，点击"紧急数据恢复"从标准备份恢复</li>
                  <li><strong>第四步：</strong>最后尝试"导入数据备份"导入手动备份文件</li>
                  <li><strong>预防措施：</strong>系统已自动创建多层备份，建议定期导出数据文件作为额外保障</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}