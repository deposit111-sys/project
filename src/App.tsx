import React, { useState, useEffect } from 'react';
import { Camera, Clock, Download, Calendar, Search, CalendarDays, AlertCircle } from 'lucide-react';
import { useLocalDatabase } from './hooks/useLocalDatabase';
import { initializeLocalDB } from './lib/indexedDB';
import { Camera as CameraType, RentalOrder } from './types';
import { exportToExcel } from './utils/exportUtils';
import { StatCard } from './components/StatCard';
import { AddOrderForm } from './components/AddOrderForm';
import { OrderManagementModal } from './components/OrderManagementModal';
import { CameraManagement } from './components/CameraManagement';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { ScheduleSearch } from './components/ScheduleSearch';
import { PickupReturnSchedule } from './components/PickupReturnSchedule';
import { PendingOrdersOverview } from './components/PendingOrdersOverview';
import DataManagement from './components/DataManagement';

function App() {
  // 本地数据库 hooks
  const {
    cameras,
    orders,
    confirmedPickups,
    confirmedReturns,
    loading,
    error,
    addCamera,
    deleteCamera,
    addOrder,
    updateOrder,
    deleteOrder,
    confirmPickup,
    confirmReturn,
    exportData,
    importData,
    clearAllData,
    getStats,
    clearError
  } = useLocalDatabase();
  
  // UI 状态
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [dbInitialized, setDbInitialized] = useState(false);

  // 应用启动时初始化本地数据库
  React.useEffect(() => {
    const initDB = async () => {
      try {
        console.log('🚀 初始化本地数据库...');
        await initializeLocalDB();
        setDbInitialized(true);
        console.log('✅ 本地数据库初始化完成');
      } catch (error) {
        console.error('❌ 本地数据库初始化失败:', error);
      }
    };

    initDB();
  }, []);

  // 显示当前数据统计
  React.useEffect(() => {
    if (dbInitialized) {
      console.log('📊 当前本地数据库统计:', {
        cameras: cameras.length,
        orders: orders.length,
        confirmedPickups: confirmedPickups.length,
        confirmedReturns: confirmedReturns.length
      });
    }
  }, [dbInitialized, cameras.length, orders.length, confirmedPickups.length, confirmedReturns.length]);

  const handleSwitchToCalendar = (model: string, date: string) => {
    // 切换到日历标签页
    setActiveTab('calendar');
    // 这里可以添加更多逻辑，比如设置日历的当前日期和筛选条件
    // 由于当前日历组件没有暴露这些控制接口，我们先实现基本的切换功能
  };

  const handleImportData = async (importedCameras: CameraType[], importedOrders: RentalOrder[]) => {
    await importData(importedCameras, importedOrders);
  };

  const handleExportExcel = () => {
    exportToExcel(orders, confirmedPickups, confirmedReturns);
  };

  const tabs = [
    { id: 'calendar', label: '相机档期日历', icon: Calendar },
    { id: 'search', label: '档期检索', icon: Search },
    { id: 'schedule', label: '取还相机目录', icon: CalendarDays },
    { id: 'pending', label: '未还未取统计目录', icon: AlertCircle }
  ];

  // 如果数据库未初始化，显示加载状态
  if (!dbInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">初始化本地数据库</h2>
          <p className="text-gray-600">正在准备数据存储环境...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">相机租赁管理系统</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-100">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">本地数据库</span>
            </div>
            <button
              onClick={handleExportExcel}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <div className="font-medium text-red-800">操作失败</div>
                <div className="text-sm text-red-700">{error}</div>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* 左侧区域 */}
          <div className="xl:col-span-1 space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-4">
              <StatCard
                title="相机总数量"
                value={cameras.length}
                icon={Camera}
                color="border-blue-500"
              />
              <StatCard
                title="订单总数量"
                value={orders.length}
                icon={Clock}
                color="border-green-500"
              />
            </div>

            {/* 添加订单表单 */}
            <AddOrderForm
              cameras={cameras}
              orders={orders}
              onAddOrder={addOrder}
            />

            {/* 订单管理按钮 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <button
                onClick={() => setShowOrderModal(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <Clock className="h-5 w-5 mr-2" />
                管理租赁订单
              </button>
            </div>

            {/* 相机管理 */}
            <CameraManagement
              cameras={cameras}
              onAddCamera={addCamera}
              onDeleteCamera={deleteCamera}
            />

            {/* 数据管理 */}
            <DataManagement
              cameras={cameras}
              orders={orders}
              onAddCamera={addCamera}
              onAddOrder={addOrder}
              onImportData={handleImportData}
              onExportData={exportData}
              onClearData={clearAllData}
              getStats={getStats}
            />
          </div>

          {/* 右侧区域 */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl shadow-lg">
              {/* 标签页导航 */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-2" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* 标签页内容 */}
              <div className="p-6">
                {activeTab === 'calendar' && (
                  <ScheduleCalendar
                    cameras={cameras}
                    orders={orders}
                    confirmedReturns={confirmedReturns}
                  />
                )}
                {activeTab === 'search' && (
                  <ScheduleSearch
                    cameras={cameras}
                    orders={orders}
                  />
                )}
                {activeTab === 'schedule' && (
                  <PickupReturnSchedule
                    orders={orders}
                    confirmedPickups={confirmedPickups}
                    confirmedReturns={confirmedReturns}
                    onConfirmPickup={confirmPickup}
                    onConfirmReturn={confirmReturn}
                  />
                )}
                {activeTab === 'pending' && (
                  <PendingOrdersOverview
                    orders={orders}
                    confirmedPickups={confirmedPickups}
                    confirmedReturns={confirmedReturns}
                    onConfirmPickup={confirmPickup}
                    onConfirmReturn={confirmReturn}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 订单管理模态框 */}
        <OrderManagementModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          orders={orders}
          cameras={cameras}
          onUpdateOrder={updateOrder}
          onDeleteOrder={deleteOrder}
          onSwitchToCalendar={handleSwitchToCalendar}
        />
      </div>
    </div>
  );
}

export default App;