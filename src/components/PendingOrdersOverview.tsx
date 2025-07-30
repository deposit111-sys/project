import React, { useState, useMemo } from 'react';
import type { RentalOrder } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { AlertTriangle, Package, PackageX, Calendar, User, Phone, DollarSign, FileText, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';

interface PendingOrdersOverviewProps {
  orders: RentalOrder[];
  confirmedPickups: string[];
  confirmedReturns: string[];
  onConfirmPickup: (orderId: string) => void;
  onConfirmReturn: (orderId: string) => void;
}

export function PendingOrdersOverview({ orders, confirmedPickups, confirmedReturns, onConfirmPickup, onConfirmReturn }: PendingOrdersOverviewProps) {
  const [showPendingPickups, setShowPendingPickups] = useState(true);
  const [showPendingReturns, setShowPendingReturns] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'camera' | 'renter'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    orderId: string;
    type: 'pickup' | 'return';
    orderInfo: {
      cameraModel: string;
      cameraSerialNumber: string;
      renterName: string;
    };
  } | null>(null);

  // 获取当前日期
  const today = new Date().toISOString().split('T')[0];

  // 计算未取和未还的订单
  const pendingOrders = useMemo(() => {
    // 未取订单：应该取机但还未确认取机的订单
    const pendingPickups = orders.filter(order => 
      order.pickupDate <= today && 
      order.returnDate >= today && 
      !confirmedPickups.includes(order.id)
    );
    
    // 未还订单：应该还机但还未确认还机的订单
    const pendingReturns = orders.filter(order => 
      order.returnDate < today && 
      !confirmedReturns.includes(order.id)
    );

    // 排序函数
    const sortOrders = (ordersList: RentalOrder[]) => {
      return [...ordersList].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = a.pickupDate.localeCompare(b.pickupDate);
            break;
          case 'camera':
            comparison = a.cameraModel.localeCompare(b.cameraModel) || 
                        a.cameraSerialNumber.localeCompare(b.cameraSerialNumber);
            break;
          case 'renter':
            comparison = a.renterName.localeCompare(b.renterName);
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    };

    return {
      pendingPickups: sortOrders(pendingPickups),
      pendingReturns: sortOrders(pendingReturns)
    };
  }, [orders, today, sortBy, sortOrder, confirmedPickups, confirmedReturns]);

  const handleSort = (newSortBy: 'date' | 'camera' | 'renter') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'date' | 'camera' | 'renter') => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getOverdueDays = (date: string) => {
    const orderDate = new Date(date);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - orderDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCheckboxClick = (order: RentalOrder, type: 'pickup' | 'return') => {
    setConfirmAction({
      orderId: order.id,
      type,
      orderInfo: {
        cameraModel: order.cameraModel,
        cameraSerialNumber: order.cameraSerialNumber,
        renterName: order.renterName
      }
    });
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      if (confirmAction.type === 'pickup') {
        onConfirmPickup(confirmAction.orderId);
      } else {
        onConfirmReturn(confirmAction.orderId);
      }
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const OrderCard = ({ order, type }: { order: RentalOrder; type: 'pickup' | 'return' }) => {
    const isOverdue = type === 'return' && order.returnDate < today;
    const overdueDays = isOverdue ? getOverdueDays(order.returnDate) : 0;
    const isConfirmed = type === 'pickup' 
      ? confirmedPickups.includes(order.id)
      : confirmedReturns.includes(order.id);

    return (
      <div className={`p-4 rounded-lg border-l-4 ${
        type === 'pickup' 
          ? 'bg-orange-50 border-orange-400 border border-orange-200' 
          : isOverdue 
            ? 'bg-red-50 border-red-400 border border-red-200'
            : 'bg-yellow-50 border-yellow-400 border border-yellow-200'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            {type === 'pickup' ? (
              <Package className="h-5 w-5 text-orange-600 mr-2" />
            ) : (
              <PackageX className="h-5 w-5 text-red-600 mr-2" />
            )}
            <div>
              <div className="font-semibold text-gray-800">
                {order.cameraModel} - {order.cameraSerialNumber}
              </div>
              <div className={`text-sm font-medium ${
                type === 'pickup' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {type === 'pickup' 
                  ? `应取机: ${formatDateTime(order.pickupDate, order.pickupTime)}`
                  : `应还机: ${formatDateTime(order.returnDate, order.returnTime)}`
                }
              </div>
            </div>
          </div>
          {isOverdue && (
            <div className="flex items-center space-x-2">
            <div className="flex items-center bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              <AlertTriangle className="h-3 w-3 mr-1" />
              逾期 {overdueDays} 天
            </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-3">
          <div></div>
          <button
            onClick={() => handleCheckboxClick(order, type)}
            className="flex items-center text-green-600 hover:text-green-700 focus:ring-2 focus:ring-green-200 rounded transition-all duration-200 p-1"
            title={type === 'pickup' ? '确认取机' : '确认还机'}
          >
            {isConfirmed ? (
              <CheckCircle2 className="h-5 w-5 mr-1 fill-current" />
            ) : (
              <Circle className="h-5 w-5 mr-1" />
            )}
            <span className="text-sm font-medium">
              {type === 'pickup' ? '确认取机' : '确认还机'}
            </span>
          </button>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-500 mr-2" />
              <span className="font-medium">租借人:</span>
              <span className="ml-1">{order.renterName}</span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-500 mr-2" />
              <span className="font-medium">销售:</span>
              <span className="ml-1">{order.salesperson}</span>
            </div>
            {order.customerService && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-500 mr-2" />
                <span className="font-medium">客服:</span>
                <span className="ml-1">{order.customerService}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="font-medium">租期:</span>
              <span className="ml-1 text-xs">
                {formatDateTime(order.pickupDate, order.pickupTime)} - {formatDateTime(order.returnDate, order.returnTime)}
              </span>
            </div>
            {order.depositStatus && (
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-gray-500 mr-2" />
                <span className="font-medium">定金:</span>
                <span className="ml-1">{order.depositStatus}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex items-start">
                <FileText className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                <span className="font-medium">备注:</span>
                <span className="ml-1 text-xs">{order.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <Package className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-orange-600">{pendingOrders.pendingPickups.length}</div>
          <div className="text-sm font-medium text-orange-800">未取相机</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <PackageX className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-red-600">{pendingOrders.pendingReturns.length}</div>
          <div className="text-sm font-medium text-red-800">未还相机</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <div className="text-3xl font-bold text-gray-600">
            {pendingOrders.pendingPickups.length + pendingOrders.pendingReturns.length}
          </div>
          <div className="text-sm font-medium text-gray-800">总计待处理</div>
        </div>
      </div>

      {/* 排序控制 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2 sm:space-y-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="text-sm font-medium text-gray-700">排序方式:</span>
          <button
            onClick={() => handleSort('date')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
              sortBy === 'date' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>日期</span>
            {getSortIcon('date')}
          </button>
          <button
            onClick={() => handleSort('camera')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
              sortBy === 'camera' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>相机</span>
            {getSortIcon('camera')}
          </button>
          <button
            onClick={() => handleSort('renter')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
              sortBy === 'renter' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>租借人</span>
            {getSortIcon('renter')}
          </button>
        </div>
      </div>

      {/* 未取相机列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={() => setShowPendingPickups(!showPendingPickups)}
        >
          <div className="flex items-center">
            <Package className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">未取相机</h3>
            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {pendingOrders.pendingPickups.length}
            </span>
          </div>
          {showPendingPickups ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        
        {showPendingPickups && (
          <div className="p-4">
            {pendingOrders.pendingPickups.length > 0 ? (
              <div className="space-y-4">
                {pendingOrders.pendingPickups.map(order => (
                  <OrderCard key={order.id} order={order} type="pickup" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无未取相机</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 未还相机列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={() => setShowPendingReturns(!showPendingReturns)}
        >
          <div className="flex items-center">
            <PackageX className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">未还相机</h3>
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              {pendingOrders.pendingReturns.length}
            </span>
          </div>
          {showPendingReturns ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
        
        {showPendingReturns && (
          <div className="p-4">
            {pendingOrders.pendingReturns.length > 0 ? (
              <div className="space-y-4">
                {pendingOrders.pendingReturns.map(order => (
                  <OrderCard key={order.id} order={order} type="return" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <PackageX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无未还相机</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      {(pendingOrders.pendingPickups.length > 0 || pendingOrders.pendingReturns.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">处理建议：</div>
              <ul className="space-y-1 text-xs">
                <li>• 及时联系未取相机的客户确认取机时间</li>
                <li>• 重点关注逾期未还的相机，联系客户尽快归还</li>
                <li>• 定期更新订单状态，确保数据准确性</li>
                <li>• 对于长期逾期的订单，考虑采取进一步措施</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {confirmAction.type === 'pickup' ? '确认取机' : '确认还机'}
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  您确定要{confirmAction.type === 'pickup' ? '确认取机' : '确认还机'}吗？
                </p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">相机:</span> {confirmAction.orderInfo.cameraModel} - {confirmAction.orderInfo.cameraSerialNumber}</div>
                    <div><span className="font-medium">租借人:</span> {confirmAction.orderInfo.renterName}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-2 md:mt-0">
                <p>
                  {confirmAction.type === 'pickup' 
                    ? '确认后，该订单将标记为已取机状态。'
                    : '确认后，该订单将标记为已还机状态。'
                  }
                </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className={`px-6 py-2 text-white rounded-lg focus:ring-4 transition-all duration-200 shadow-sm hover:shadow-md ${
                  confirmAction.type === 'pickup'
                    ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-200'
                }`}
              >
                确认{confirmAction.type === 'pickup' ? '取机' : '还机'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}