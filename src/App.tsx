import React, { useState, useEffect } from 'react';
import { Camera, Clock, Download, Calendar, Search, CalendarDays, AlertCircle, TestTube, Database } from 'lucide-react';
import { useLocalDatabase } from './hooks/useLocalDatabase';
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
import { CapacityTestTool } from './components/CapacityTestTool';
import { DataManagement } from './components/DataManagement';

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
    getStats
  } = useLocalDatabase();
  
  // UI 状态
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [detailedStats, setDetailedStats] = useState({
    totalCameras: 0,
    totalOrders: 0,
    activeRentals: 0,
    upcomingPickups: 0,
    upcomingReturns: 0
  });

  // 计算详细统计信息
  useEffect(() => {
    const calculateDetailedStats = () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // 活跃租赁：已取但未还的订单
      const activeRentals = orders.filter(order => {
        const isPickedUp = confirmedPickups.some(pickup => pickup.orderId === order.id);
        const isReturned = confirmedReturns.some(returnItem => returnItem.orderId === order.id);
        return isPickedUp && !isReturned;
      }).length;

      // 今日待取：今天需要取的订单
      const upcomingPickups = orders.filter(order => {
        const isPickedUp = confirmedPickups.some(pickup => pickup.orderId === order.id);
        return !isPickedUp && order.pickupDate === todayStr;
      }).length;

      // 今日待还：今天需要还的订单
      const upcomingReturns = orders.filter(order => {
        const isPickedUp = confirmedPickups.some(pickup => pickup.orderId === order.id);
        const isReturned = confirmedReturns.some(returnItem => returnItem.orderId === order.id);
        return isPickedUp && !isReturned && order.returnDate === todayStr;
      }).length;

      setDetailedStats({
        totalCameras: cameras.length,
        totalOrders: orders.length,
        activeRentals,
        upcomingPickups,
        upcomingReturns
      });
    };

    calculateDetailedStats();
  }, [cameras, orders, confirmedPickups, confirmedReturns]);

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
    { id: 'pending', label: '未还未取统计目录', icon: AlertCircle },
    { id: 'test', label: '数据库稳定性测试', icon: TestTube },
    { id: 'data', label: '数据管理', icon: Database }
  ];

  // 如果数据库加载中，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
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
            <button
              onClick={handleExportExcel}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </button>
          </div>
        </div>

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
                {activeTab === 'test' && (
                  <CapacityTestTool
                    cameras={cameras}
                    orders={orders}
                    onAddCamera={addCamera}
                    onAddOrder={addOrder}
                  />
                )}
                {activeTab === 'data' && (
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