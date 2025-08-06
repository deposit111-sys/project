import React, { useState } from 'react';
import { Camera, RentalOrder } from '../types';
import { CameraService } from '../services/cameraService';
import { OrderService } from '../services/orderService';
import { ConfirmationService } from '../services/confirmationService';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { 
  TestTube, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  Database,
  Clock,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface CapacityTestToolProps {
  onTestComplete?: (results: TestResults) => void;
}

interface TestResults {
  totalCameras: number;
  totalOrders: number;
  testDuration: number;
  averageCreateTime: number;
  averageReadTime: number;
  errors: string[];
  memoryUsage?: number;
}

export function CapacityTestTool({ onTestComplete }: CapacityTestToolProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResults | null>(null);
  const [testConfig, setTestConfig] = useState({
    cameraCount: 100,
    orderCount: 500,
    batchSize: 10
  });

  // 生成测试相机数据
  const generateTestCameras = (count: number): Omit<Camera, 'id'>[] => {
    const cameras: Omit<Camera, 'id'>[] = [];
    const models = ['Canon EOS R5', 'Sony A7R IV', 'Nikon Z9', 'Fujifilm X-T5', 'Panasonic GH6'];
    
    for (let i = 0; i < count; i++) {
      cameras.push({
        model: models[i % models.length],
        serialNumber: `TEST${String(i + 1).padStart(6, '0')}`
      });
    }
    
    return cameras;
  };

  // 生成测试订单数据
  const generateTestOrders = (count: number, cameras: Camera[]): Omit<RentalOrder, 'id' | 'createdAt'>[] => {
    const orders: Omit<RentalOrder, 'id' | 'createdAt'>[] = [];
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
    const salespeople = ['小明', '小红', '小刚', '小丽'];
    const customerServices = ['1', '2', '3', '郭', '雨'];
    const timeSlots: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening'];
    
    for (let i = 0; i < count; i++) {
      const camera = cameras[i % cameras.length];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 365));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 30) + 1);
      
      orders.push({
        cameraModel: camera.model,
        cameraSerialNumber: camera.serialNumber,
        renterName: names[i % names.length] + (i > names.length ? `_${Math.floor(i / names.length)}` : ''),
        customerService: customerServices[i % customerServices.length],
        salesperson: salespeople[i % salespeople.length],
        pickupDate: startDate.toISOString().split('T')[0],
        pickupTime: timeSlots[i % timeSlots.length],
        returnDate: endDate.toISOString().split('T')[0],
        returnTime: timeSlots[(i + 1) % timeSlots.length],
        depositStatus: Math.random() > 0.5 ? '已收取' : '未收取',
        notes: i % 3 === 0 ? `测试订单备注 ${i + 1}` : ''
      });
    }
    
    return orders;
  };

  // 批量创建数据
  const createDataInBatches = async <T,>(
    items: T[],
    createFn: (item: T) => Promise<any>,
    batchSize: number,
    onProgress: (current: number, total: number) => void
  ): Promise<{ created: any[], errors: string[], times: number[] }> => {
    const created: any[] = [];
    const errors: string[] = [];
    const times: number[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item) => {
        const startTime = performance.now();
        try {
          const result = await createFn(item);
          const endTime = performance.now();
          times.push(endTime - startTime);
          return result;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          errors.push(errorMsg);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      created.push(...batchResults.filter(result => result !== null));
      
      onProgress(Math.min(i + batchSize, items.length), items.length);
      
      // 短暂延迟避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return { created, errors, times };
  };

  // 运行容量测试
  const runCapacityTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);
    
    const startTime = performance.now();
    const testResults: TestResults = {
      totalCameras: 0,
      totalOrders: 0,
      testDuration: 0,
      averageCreateTime: 0,
      averageReadTime: 0,
      errors: []
    };

    try {
      // 1. 测试相机创建
      setCurrentTest('创建测试相机数据...');
      const testCameras = generateTestCameras(testConfig.cameraCount);
      
      const cameraResults = await createDataInBatches(
        testCameras,
        CameraService.create,
        testConfig.batchSize,
        (current, total) => {
          setProgress((current / total) * 30); // 30% for cameras
        }
      );
      
      testResults.totalCameras = cameraResults.created.length;
      testResults.errors.push(...cameraResults.errors);

      // 2. 测试订单创建
      setCurrentTest('创建测试订单数据...');
      const testOrders = generateTestOrders(testConfig.orderCount, cameraResults.created);
      
      const orderResults = await createDataInBatches(
        testOrders,
        OrderService.create,
        testConfig.batchSize,
        (current, total) => {
          setProgress(30 + (current / total) * 50); // 50% for orders
        }
      );
      
      testResults.totalOrders = orderResults.created.length;
      testResults.errors.push(...orderResults.errors);

      // 3. 测试读取性能
      setCurrentTest('测试数据读取性能...');
      const readStartTime = performance.now();
      
      await Promise.all([
        CameraService.getAll(),
        OrderService.getAll(),
        ConfirmationService.getAll()
      ]);
      
      const readEndTime = performance.now();
      testResults.averageReadTime = readEndTime - readStartTime;
      
      setProgress(90);

      // 4. 计算平均创建时间
      const allCreateTimes = [...cameraResults.times, ...orderResults.times];
      testResults.averageCreateTime = allCreateTimes.length > 0 
        ? allCreateTimes.reduce((sum, time) => sum + time, 0) / allCreateTimes.length 
        : 0;

      // 5. 获取内存使用情况（如果可用）
      if ('memory' in performance) {
        testResults.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }

      setProgress(100);
      
    } catch (error) {
      testResults.errors.push(error instanceof Error ? error.message : '测试过程中发生未知错误');
    }

    const endTime = performance.now();
    testResults.testDuration = endTime - startTime;
    
    setResults(testResults);
    setIsRunning(false);
    setCurrentTest('');
    
    onTestComplete?.(testResults);
  };

  // 清理测试数据
  const cleanupTestData = async () => {
    if (!window.confirm('确定要清理所有测试数据吗？这将删除所有以"TEST"开头的相机数据及其相关订单。')) {
      return;
    }

    try {
      setIsRunning(true);
      setCurrentTest('清理测试数据...');
      setProgress(0);
      
      let deletedCount = 0;
      
      // 如果Supabase可用，从数据库清理
      if (isSupabaseEnabled && supabase) {
        // 获取所有相机，找出测试数据
        const allCameras = await CameraService.getAll();
        const testCameras = allCameras.filter(camera => camera.serialNumber.startsWith('TEST'));
        
        // 删除测试相机（相关订单会通过级联删除）
        for (let i = 0; i < testCameras.length; i++) {
          const camera = testCameras[i];
          try {
            await CameraService.delete(camera.id);
            deletedCount++;
            setProgress((i + 1) / testCameras.length * 100);
          } catch (error) {
            console.error(`Failed to delete camera ${camera.id}:`, error);
          }
        }
      } else {
        // 如果没有数据库连接，清理本地存储中的测试数据
        const localCameras = JSON.parse(localStorage.getItem('cameras') || '[]');
        const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        
        // 过滤掉测试数据
        const filteredCameras = localCameras.filter((camera: any) => !camera.serialNumber.startsWith('TEST'));
        const testCameraIds = localCameras
          .filter((camera: any) => camera.serialNumber.startsWith('TEST'))
          .map((camera: any) => camera.id);
        
        const filteredOrders = localOrders.filter((order: any) => {
          const isTestOrder = testCameraIds.some(cameraId => 
            localCameras.find((cam: any) => cam.id === cameraId && 
              cam.model === order.cameraModel && 
              cam.serialNumber === order.cameraSerialNumber
            )
          );
          return !isTestOrder;
        });
        
        // 更新本地存储
        localStorage.setItem('cameras', JSON.stringify(filteredCameras));
        localStorage.setItem('orders', JSON.stringify(filteredOrders));
        
        deletedCount = localCameras.length - filteredCameras.length;
        setProgress(100);
      }
      
      setCurrentTest('');
      setProgress(0);
      alert(`已清理 ${deletedCount} 台测试相机及其相关数据`);
      
    } catch (error) {
      alert('清理测试数据失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <TestTube className="h-5 w-5 mr-2" />
        数据存储容量测试
      </h2>

      {/* 测试配置 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">测试配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">测试相机数量</label>
            <input
              type="number"
              value={testConfig.cameraCount}
              onChange={(e) => setTestConfig(prev => ({ ...prev, cameraCount: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="10000"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">测试订单数量</label>
            <input
              type="number"
              value={testConfig.orderCount}
              onChange={(e) => setTestConfig(prev => ({ ...prev, orderCount: parseInt(e.target.value) || 0 }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="50000"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">批处理大小</label>
            <input
              type="number"
              value={testConfig.batchSize}
              onChange={(e) => setTestConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1 }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="100"
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="mb-6 flex space-x-3">
        <button
          onClick={runCapacityTest}
          disabled={isRunning}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isRunning ? '测试进行中...' : '开始容量测试'}
        </button>

        <button
          onClick={cleanupTestData}
          disabled={isRunning}
          className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          清理测试数据
        </button>
      </div>

      {/* 测试进度 */}
      {isRunning && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-2">
            <RefreshCw className="h-4 w-4 text-blue-600 mr-2 animate-spin" />
            <span className="text-blue-800 font-medium">{currentTest}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-blue-600 mt-1">{progress.toFixed(1)}% 完成</div>
        </div>
      )}

      {/* 测试结果 */}
      {results && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            测试结果
          </h3>

          {/* 基本统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <Database className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{results.totalCameras}</div>
              <div className="text-sm text-green-800">创建相机数</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <Database className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{results.totalOrders}</div>
              <div className="text-sm text-blue-800">创建订单数</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{(results.testDuration / 1000).toFixed(1)}s</div>
              <div className="text-sm text-purple-800">总测试时间</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <BarChart3 className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{results.averageCreateTime.toFixed(1)}ms</div>
              <div className="text-sm text-orange-800">平均创建时间</div>
            </div>
          </div>

          {/* 性能指标 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-3">性能指标</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">数据读取时间:</span>
                <span className="ml-2">{results.averageReadTime.toFixed(1)}ms</span>
              </div>
              <div>
                <span className="font-medium">创建成功率:</span>
                <span className="ml-2">
                  {(((results.totalCameras + results.totalOrders) / (testConfig.cameraCount + testConfig.orderCount)) * 100).toFixed(1)}%
                </span>
              </div>
              {results.memoryUsage && (
                <div>
                  <span className="font-medium">内存使用:</span>
                  <span className="ml-2">{(results.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              )}
              <div>
                <span className="font-medium">平均吞吐量:</span>
                <span className="ml-2">
                  {((results.totalCameras + results.totalOrders) / (results.testDuration / 1000)).toFixed(1)} 条/秒
                </span>
              </div>
            </div>
          </div>

          {/* 错误信息 */}
          {results.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <h4 className="font-semibold text-red-800">错误信息 ({results.errors.length})</h4>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {results.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-sm text-red-700 mb-1">
                    {index + 1}. {error}
                  </div>
                ))}
                {results.errors.length > 10 && (
                  <div className="text-sm text-red-600 italic">
                    ... 还有 {results.errors.length - 10} 个错误
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 建议 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">性能建议：</div>
                <ul className="space-y-1 text-xs">
                  {results.averageCreateTime > 1000 && (
                    <li>• 平均创建时间较长，建议优化数据库连接或减少批处理大小</li>
                  )}
                  {results.averageReadTime > 5000 && (
                    <li>• 数据读取时间较长，建议添加数据库索引或优化查询</li>
                  )}
                  {results.errors.length > results.totalCameras * 0.1 && (
                    <li>• 错误率较高，建议检查网络连接和数据库配置</li>
                  )}
                  <li>• 当前测试创建了 {results.totalCameras + results.totalOrders} 条记录，系统表现良好</li>
                  <li>• 建议定期进行容量测试以监控系统性能</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <TestTube className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">容量测试说明：</div>
            <ul className="space-y-1 text-xs">
              <li>• 此工具用于测试系统在大量数据下的性能表现</li>
              <li>• 测试数据使用"TEST"前缀，可通过"清理测试数据"按钮删除</li>
              <li>• 建议从小数量开始测试，逐步增加到预期的数据量</li>
              <li>• 批处理大小影响创建速度，较大的批次可能更快但占用更多内存</li>
              <li>• 测试完成后请及时清理测试数据以避免影响正常使用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}