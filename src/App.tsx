import React from 'react';
import { Camera, Clock, Download, Calendar, Search, CalendarDays, AlertCircle } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Camera as CameraType, RentalOrder } from './types';
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
      const newState = prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId];
      
      // 强制触发重新渲染
      return [...newState];
    });
  };

  const handleConfirmReturn = (orderId: string) => {
    setConfirmedReturns(prev => {
      const newState = prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId];
      
      // 强制触发重新渲染
      return [...newState];
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">相机租赁管理系统</h1>
          <button
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Download className="h-4 w-4 mr-2" />
            导出Excel
          </button>
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

            {/* 数据管理 */}
            <DataManagement
              cameras={cameras}
              orders={orders}
              onImportData={handleImportData}
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