import React from 'react';
import { Camera, Clock, Download, Calendar, Search, CalendarDays, AlertCircle } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Camera as CameraType, RentalOrder } from './types';
import { StatCard } from './components/StatCard';
import { AddOrderForm } from './components/AddOrderForm';
import { OrderManagementModal } from './components/OrderManagementModal';
import { CameraManagement } from './components/CameraManagement';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { ScheduleSearch } from './components/ScheduleSearch';
import { PickupReturnSchedule } from './components/PickupReturnSchedule';
import { PendingOrdersOverview } from './components/PendingOrdersOverview';
import { DataManagement } from './components/DataManagement';
import { exportToExcel } from './utils/exportUtils';

function App() {
  const [cameras, setCameras] = useLocalStorage<CameraType[]>('cameras', []);
  const [orders, setOrders] = useLocalStorage<RentalOrder[]>('orders', []);
  const [showOrderModal, setShowOrderModal] = useLocalStorage<boolean>('showOrderModal', false);
  const [activeTab, setActiveTab] = useLocalStorage<string>('activeTab', 'calendar');
  const [confirmedPickups, setConfirmedPickups] = useLocalStorage<string[]>('confirmedPickups', []);
  const [confirmedReturns, setConfirmedReturns] = useLocalStorage<string[]>('confirmedReturns', []);

  const handleSwitchToCalendar = (model: string, date: string) => {
    // 切换到日历标签页
    setActiveTab('calendar');
    // 这里可以添加更多逻辑，比如设置日历的当前日期和筛选条件
    // 由于当前日历组件没有暴露这些控制接口，我们先实现基本的切换功能
  };

  const addCamera = (camera: Omit<CameraType, 'id'>) => {
    const newCamera = {
      ...camera,
      id: Date.now().toString()
    };
    setCameras([...cameras, newCamera]);
  };

  const deleteCamera = (id: string) => {
    setCameras(cameras.filter(camera => camera.id !== id));
  };

  const addOrder = (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    const newOrder = {
      ...order,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setOrders([...orders, newOrder]);
  };

  const updateOrder = (id: string, updatedOrder: Partial<RentalOrder>) => {
    setOrders(prevOrders => {
      const newOrders = prevOrders.map(order => 
        order.id === id ? { ...order, ...updatedOrder } : order
      );
      // 确保创建新的数组引用，触发重新渲染
      return [...newOrders];
    });
  };

  const deleteOrder = (id: string) => {
    setOrders(prevOrders => {
      const newOrders = prevOrders.filter(order => order.id !== id);
      // 确保创建新的数组引用，触发重新渲染
      return [...newOrders];
    });
  };

  const handleImportData = (importedCameras: CameraType[], importedOrders: RentalOrder[]) => {
    setCameras(importedCameras);
    setOrders(importedOrders);
    // 清空确认状态，因为导入了新数据
    setConfirmedPickups([]);
    setConfirmedReturns([]);
  };
  const handleConfirmPickup = (orderId: string) => {
    setConfirmedPickups(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleConfirmReturn = (orderId: string) => {
    setConfirmedReturns(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* 顶部标题区域 */}
        <div className="relative mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  相机租赁管理系统
                </h1>
                <p className="text-gray-600 mt-1">专业的相机设备租赁管理平台</p>
              </div>
            </div>
            <button
              onClick={handleExportExcel}
              className="group flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="h-5 w-5 mr-2 group-hover:animate-bounce" />
              导出Excel报表
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* 左侧区域 */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:space-y-8">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <StatCard
                title="相机总数量"
                value={cameras.length}
                icon={Camera}
                color="border-blue-500 from-blue-50 to-blue-100"
              />
              <StatCard
                title="订单总数量"
                value={orders.length}
                icon={Clock}
                color="border-emerald-500 from-emerald-50 to-emerald-100"
              />
            </div>

            {/* 添加订单表单 */}
            <AddOrderForm
              cameras={cameras}
              orders={orders}
              onAddOrder={addOrder}
            />

            {/* 订单管理按钮 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
              <button
                onClick={() => setShowOrderModal(true)}
                className="group w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:ring-4 focus:ring-indigo-200 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Clock className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
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
              onImportData={handleImportData}
            />
          </div>

          {/* 右侧区域 */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {/* 标签页导航 */}
              <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50 overflow-x-auto">
                <nav className="flex space-x-1 px-4 sm:px-6 min-w-max">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group flex items-center py-3 sm:py-4 px-3 sm:px-6 border-b-3 font-medium text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 rounded-t-lg relative whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 bg-white/60 shadow-sm'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-white/30'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mr-2 transition-all duration-300 ${
                          activeTab === tab.id 
                            ? 'text-blue-600 scale-110' 
                            : 'group-hover:scale-105'
                        }`} />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.replace('相机档期', '档期').replace('未还未取统计', '统计')}</span>
                        {activeTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* 标签页内容 */}
              <div className="p-4 sm:p-6 lg:p-8">
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
                    onConfirmPickup={handleConfirmPickup}
                    onConfirmReturn={handleConfirmReturn}
                  />
                )}
                {activeTab === 'pending' && (
                  <PendingOrdersOverview
                    orders={orders}
                    confirmedPickups={confirmedPickups}
                    confirmedReturns={confirmedReturns}
                    onConfirmPickup={handleConfirmPickup}
                    onConfirmReturn={handleConfirmReturn}
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