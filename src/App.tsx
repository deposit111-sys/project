import React from 'react';
import { Camera, Clock, Download, Calendar, Search, CalendarDays, AlertCircle } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDatabase } from './hooks/useDatabase';
import { Camera as CameraType, RentalOrder } from './types';
import { checkAndRepairData } from './utils/dataUtils';
import { exportToExcel } from './utils/exportUtils';
import { StatCard } from './components/StatCard';
import { AddOrderForm } from './components/AddOrderForm';
import { OrderManagementModal } from './components/OrderManagementModal';
import { CameraManagement } from './components/CameraManagement';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { ScheduleSearch } from './components/ScheduleSearch';
import { PickupReturnSchedule } from './components/PickupReturnSchedule';
import { PendingOrdersOverview } from './components/PendingOrdersOverview';
import { DataManagement } from './components/DataManagement';
import { DatabaseStatus } from './components/DatabaseStatus';
import { DataSyncManager } from './components/DataSyncManager';

function App() {
  // 本地存储 hooks（作为备份）
  const [cameras, setCameras] = useLocalStorage<CameraType[]>('cameras', []);
  const [orders, setOrders] = useLocalStorage<RentalOrder[]>('orders', []);
  const [confirmedPickups, setConfirmedPickups] = useLocalStorage<string[]>('confirmedPickups', []);
  const [confirmedReturns, setConfirmedReturns] = useLocalStorage<string[]>('confirmedReturns', []);
  
  // UI 状态
  const [showOrderModal, setShowOrderModal] = useLocalStorage<boolean>('showOrderModal', false);
  const [activeTab, setActiveTab] = useLocalStorage<string>('activeTab', 'calendar');
  const [databaseConnected, setDatabaseConnected] = useState(false);
  
  // 数据库 hooks
  const {
    cameras: dbCameras,
    orders: dbOrders,
    confirmedPickups: dbConfirmedPickups,
    confirmedReturns: dbConfirmedReturns,
    loading: dbLoading,
    error: dbError,
    addCamera: dbAddCamera,
    deleteCamera: dbDeleteCamera,
    addOrder: dbAddOrder,
    updateOrder: dbUpdateOrder,
    deleteOrder: dbDeleteOrder,
    confirmPickup: dbConfirmPickup,
    confirmReturn: dbConfirmReturn,
    clearError: dbClearError
  } = useDatabase();

  // 应用启动时检查和修复数据
  React.useEffect(() => {
    const result = checkAndRepairData();
    if (result.repaired) {
      console.log('Data repair completed on startup:', result.issues);
    }
  }, []);

  // 根据数据库连接状态决定使用哪套数据
  const currentCameras = databaseConnected ? dbCameras : cameras;
  const currentOrders = databaseConnected ? dbOrders : orders;
  const currentConfirmedPickups = databaseConnected ? dbConfirmedPickups : confirmedPickups;
  const currentConfirmedReturns = databaseConnected ? dbConfirmedReturns : confirmedReturns;

  const handleSwitchToCalendar = (model: string, date: string) => {
    // 切换到日历标签页
    setActiveTab('calendar');
    // 这里可以添加更多逻辑，比如设置日历的当前日期和筛选条件
    // 由于当前日历组件没有暴露这些控制接口，我们先实现基本的切换功能
  };
  
  const addCamera = async (camera: Omit<CameraType, 'id'>) => {
    if (databaseConnected) {
      try {
        await dbAddCamera(camera);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        const newCamera = {
          ...camera,
          id: Date.now().toString()
        };
        setCameras([...cameras, newCamera]);
        throw error;
      }
    } else {
      const newCamera = {
        ...camera,
        id: Date.now().toString()
      };
      setCameras([...cameras, newCamera]);
    }
  };

  const deleteCamera = async (id: string) => {
    if (databaseConnected) {
      try {
        await dbDeleteCamera(id);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        setCameras(cameras.filter(camera => camera.id !== id));
        throw error;
      }
    } else {
      setCameras(cameras.filter(camera => camera.id !== id));
    }
  };

  const addOrder = async (order: Omit<RentalOrder, 'id' | 'createdAt'>) => {
    if (databaseConnected) {
      try {
        await dbAddOrder(order);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        const newOrder = {
          ...order,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        };
        setOrders([...orders, newOrder]);
        throw error;
      }
    } else {
      const newOrder = {
        ...order,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      setOrders([...orders, newOrder]);
    }
  };

  const updateOrder = async (id: string, updatedOrder: Partial<RentalOrder>) => {
    if (databaseConnected) {
      try {
        await dbUpdateOrder(id, updatedOrder);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        setOrders(prevOrders => {
          const newOrders = prevOrders.map(order => 
            order.id === id ? { ...order, ...updatedOrder } : order
          );
          return [...newOrders];
        });
        throw error;
      }
    } else {
      setOrders(prevOrders => {
        const newOrders = prevOrders.map(order => 
          order.id === id ? { ...order, ...updatedOrder } : order
        );
        return [...newOrders];
      });
    }
  };

  const deleteOrder = async (id: string) => {
    if (databaseConnected) {
      try {
        await dbDeleteOrder(id);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
        setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
        setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
        throw error;
      }
    } else {
      setOrders(prevOrders => prevOrders.filter(order => order.id !== id));
      setConfirmedPickups(prev => prev.filter(orderId => orderId !== id));
      setConfirmedReturns(prev => prev.filter(orderId => orderId !== id));
    }
  };

  const handleImportData = (importedCameras: CameraType[], importedOrders: RentalOrder[]) => {
    setCameras(importedCameras);
    setOrders(importedOrders);
    // 清空确认状态，因为导入了新数据
    setConfirmedPickups([]);
    setConfirmedReturns([]);
  };
  
  const handleConfirmPickup = async (orderId: string) => {
    if (databaseConnected) {
      try {
        await dbConfirmPickup(orderId);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        const isCurrentlyConfirmed = confirmedPickups.includes(orderId);
        const newState = isCurrentlyConfirmed 
          ? confirmedPickups.filter(id => id !== orderId)
          : [...confirmedPickups, orderId];
        setConfirmedPickups(newState);
        throw error;
      }
    } else {
      const isCurrentlyConfirmed = confirmedPickups.includes(orderId);
      const newState = isCurrentlyConfirmed 
        ? confirmedPickups.filter(id => id !== orderId)
        : [...confirmedPickups, orderId];
      setConfirmedPickups(newState);
    }
  };

  const handleConfirmReturn = async (orderId: string) => {
    if (databaseConnected) {
      try {
        await dbConfirmReturn(orderId);
      } catch (error) {
        // 如果数据库操作失败，回退到本地存储
        const isCurrentlyConfirmed = confirmedReturns.includes(orderId);
        const newState = isCurrentlyConfirmed 
          ? confirmedReturns.filter(id => id !== orderId)
          : [...confirmedReturns, orderId];
        setConfirmedReturns(newState);
        throw error;
      }
    } else {
      const isCurrentlyConfirmed = confirmedReturns.includes(orderId);
      const newState = isCurrentlyConfirmed 
        ? confirmedReturns.filter(id => id !== orderId)
        : [...confirmedReturns, orderId];
      setConfirmedReturns(newState);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(currentOrders, currentConfirmedPickups, currentConfirmedReturns);
  };
  
  const handleSyncComplete = (
    syncedCameras: CameraType[], 
    syncedOrders: RentalOrder[], 
    syncedConfirmedPickups: string[], 
    syncedConfirmedReturns: string[]
  ) => {
    setCameras(syncedCameras);
    setOrders(syncedOrders);
    setConfirmedPickups(syncedConfirmedPickups);
    setConfirmedReturns(syncedConfirmedReturns);
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
          <div className="flex items-center space-x-4">
            <DatabaseStatus onConnectionChange={setDatabaseConnected} />
            <button
              onClick={handleExportExcel}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              导出Excel
            </button>
          </div>
        </div>

        {/* 数据库错误提示 */}
        {dbError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <div className="font-medium text-red-800">数据库操作失败</div>
                <div className="text-sm text-red-700">{dbError}</div>
                <button
                  onClick={dbClearError}
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
                value={currentCameras.length}
                icon={Camera}
                color="border-blue-500"
              />
              <StatCard
                title="订单总数量"
                value={currentOrders.length}
                icon={Clock}
                color="border-green-500"
              />
            </div>

            {/* 添加订单表单 */}
            <AddOrderForm
              cameras={currentCameras}
              orders={currentOrders}
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
              cameras={currentCameras}
              onAddCamera={addCamera}
              onDeleteCamera={deleteCamera}
            />

            {/* 数据同步管理 */}
            {databaseConnected && (
              <DataSyncManager
                localCameras={cameras}
                localOrders={orders}
                localConfirmedPickups={confirmedPickups}
                localConfirmedReturns={confirmedReturns}
                onSyncComplete={handleSyncComplete}
              />
            )}

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
                    cameras={currentCameras}
                    orders={currentOrders}
                    confirmedReturns={currentConfirmedReturns}
                  />
                )}
                {activeTab === 'search' && (
                  <ScheduleSearch
                    cameras={currentCameras}
                    orders={currentOrders}
                  />
                )}
                {activeTab === 'schedule' && (
                  <PickupReturnSchedule
                    orders={currentOrders}
                    confirmedPickups={currentConfirmedPickups}
                    confirmedReturns={currentConfirmedReturns}
                    onConfirmPickup={handleConfirmPickup}
                    onConfirmReturn={handleConfirmReturn}
                  />
                )}
                {activeTab === 'pending' && (
                  <PendingOrdersOverview
                    orders={currentOrders}
                    confirmedPickups={currentConfirmedPickups}
                    confirmedReturns={currentConfirmedReturns}
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
          orders={currentOrders}
          cameras={currentCameras}
          onUpdateOrder={updateOrder}
          onDeleteOrder={deleteOrder}
          onSwitchToCalendar={handleSwitchToCalendar}
        />
      </div>
    </div>
  );
}

export default App;