import React, { useState } from 'react';
import { RentalOrder } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Calendar, CheckCircle2, Circle, AlertCircle, Package, PackageX } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface PickupReturnScheduleProps {
  orders: RentalOrder[];
  confirmedPickups: string[];
  confirmedReturns: string[];
  onConfirmPickup: (orderId: string) => void;
  onConfirmReturn: (orderId: string) => void;
}

export function PickupReturnSchedule({ 
  orders, 
  confirmedPickups, 
  confirmedReturns, 
  onConfirmPickup, 
  onConfirmReturn 
}: PickupReturnScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPendingPickups, setShowPendingPickups] = useState(false);
  const [showPendingReturns, setShowPendingReturns] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // 获取当前日期
  const today = new Date().toISOString().split('T')[0];
  const getOrdersForDate = (date: string, type: 'pickup' | 'return') => {
    return orders.filter(order => {
      const orderDate = type === 'pickup' ? order.pickupDate : order.returnDate;
      return orderDate === date;
    });
  };

  const pickupOrders = getOrdersForDate(selectedDate, 'pickup');
  const returnOrders = getOrdersForDate(selectedDate, 'return');

  // 计算未取和未还的订单
  const pendingPickupOrders = pickupOrders.filter(order => !confirmedPickups.includes(order.id));
  const pendingReturnOrders = returnOrders.filter(order => !confirmedReturns.includes(order.id));

  const timeMap = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚上'
  };

  const handlePickupConfirm = (orderId: string) => {
    // 确保状态更新能正确触发
    if (confirmedPickups.includes(orderId)) {
      // 如果已确认，则取消确认
      onConfirmPickup(orderId);
    } else {
      // 如果未确认，则确认
      onConfirmPickup(orderId);
    }
  };

  const handleReturnConfirm = (orderId: string) => {
    // 检查是否已经确认取机
    if (!confirmedPickups.includes(orderId)) {
      setAlertMessage('请先确认取机后再确认还机！');
      setShowAlert(true);
      // 3秒后自动关闭提示
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    // 确保状态更新能正确触发
    if (confirmedReturns.includes(orderId)) {
      // 如果已确认，则取消确认
      onConfirmReturn(orderId);
    } else {
      // 如果未确认，则确认
      onConfirmReturn(orderId);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          选择日期
        </label>
        <DatePicker
          value={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          placeholder="选择查看日期"
          className="min-w-[180px]"
        />
      </div>

      {/* 未取未还统计卡片 */}
      {(pendingPickupOrders.length > 0 || pendingReturnOrders.length > 0) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 未取订单统计 */}
          {pendingPickupOrders.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="font-semibold text-orange-800">未取相机</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-medium">
                    {pendingPickupOrders.length}台
                  </span>
                  <button
                    onClick={() => setShowPendingPickups(!showPendingPickups)}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    {showPendingPickups ? '收起' : '详情'}
                  </button>
                </div>
              </div>
              {showPendingPickups && (
                <div className="space-y-2">
                  {pendingPickupOrders.map(order => (
                    <div key={order.id} className="bg-white p-3 rounded border border-orange-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{order.cameraModel} - {order.cameraSerialNumber}</div>
                          <div className="text-sm text-orange-600 font-medium">{timeMap[order.pickupTime]}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>租借人: {order.renterName}</div>
                            <div>销售: {order.salesperson}</div>
                            {order.customerService && <div>客服: {order.customerService}</div>}
                            {order.depositStatus && <div>定金: {order.depositStatus}</div>}
                          </div>
                        </div>
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 未还订单统计 */}
          {pendingReturnOrders.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <PackageX className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-red-800">未还相机</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                    {pendingReturnOrders.length}台
                  </span>
                  <button
                    onClick={() => setShowPendingReturns(!showPendingReturns)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    {showPendingReturns ? '收起' : '详情'}
                  </button>
                </div>
              </div>
              {showPendingReturns && (
                <div className="space-y-2">
                  {pendingReturnOrders.map(order => (
                    <div key={order.id} className="bg-white p-3 rounded border border-red-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{order.cameraModel} - {order.cameraSerialNumber}</div>
                          <div className="text-sm text-red-600 font-medium">{timeMap[order.returnTime]}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>租借人: {order.renterName}</div>
                            <div>销售: {order.salesperson}</div>
                            {order.customerService && <div>客服: {order.customerService}</div>}
                            {order.depositStatus && <div>定金: {order.depositStatus}</div>}
                          </div>
                        </div>
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">取机安排</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {pickupOrders.length}个
            </span>
          </div>
          <div className="space-y-3">
            {pickupOrders.map(order => (
              <div key={order.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-800">{order.cameraModel} - {order.cameraSerialNumber}</div>
                    <div className="text-sm text-blue-600 font-medium">{timeMap[order.pickupTime]}</div>
                  </div>
                  <button
                    onClick={() => handlePickupConfirm(order.id)}
                    className={`flex items-center focus:ring-2 rounded transition-all duration-200 p-1 ${
                      confirmedPickups.includes(order.id)
                        ? 'text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-300'
                        : 'text-green-600 hover:text-green-700 hover:bg-green-50 focus:ring-green-200'
                    }`}
                  >
                    {confirmedPickups.includes(order.id) ? (
                      <CheckCircle2 className="h-5 w-5 mr-1 fill-current text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 mr-1 text-green-600" />
                    )}
                    <span className="text-sm font-medium">
                      {confirmedPickups.includes(order.id) ? '已确认取机' : '确认取机'}
                    </span>
                  </button>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">租借人:</span> {order.renterName}</div>
                  <div><span className="font-medium">销售人员:</span> {order.salesperson}</div>
                  <div><span className="font-medium">定金状态:</span> {order.depositStatus}</div>
                  {order.notes && (
                    <div><span className="font-medium">备注信息:</span> {order.notes}</div>
                  )}
                </div>
              </div>
            ))}
            {pickupOrders.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">📅</div>
                <p className="text-gray-500">今日无取机安排</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">还机安排</h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {returnOrders.length}个
            </span>
          </div>
          <div className="space-y-3">
            {returnOrders.map(order => (
              <div key={order.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-800">{order.cameraModel} - {order.cameraSerialNumber}</div>
                    <div className="text-sm text-orange-600 font-medium">{timeMap[order.returnTime]}</div>
                  </div>
                  <button
                    onClick={() => handleReturnConfirm(order.id)}
                    className={`flex items-center focus:ring-2 rounded transition-all duration-200 p-1 ${
                      !confirmedPickups.includes(order.id)
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                      : confirmedReturns.includes(order.id)
                        ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-300'
                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:ring-blue-200'
                    }`}
                    disabled={!confirmedPickups.includes(order.id)}
                    title={!confirmedPickups.includes(order.id) ? '请先确认取机' : ''}
                  >
                    {confirmedReturns.includes(order.id) ? (
                      <CheckCircle2 className="h-5 w-5 mr-1 fill-current text-blue-600" />
                    ) : (
                      <Circle className={`h-5 w-5 mr-1 ${
                        !confirmedPickups.includes(order.id) ? 'text-gray-400' : 'text-blue-600'
                      }`} />
                    )}
                    <span className="text-sm font-medium">
                      {confirmedReturns.includes(order.id) ? '已确认还机' : '确认还机'}
                    </span>
                  </button>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">租借人:</span> {order.renterName}</div>
                  <div><span className="font-medium">销售人员:</span> {order.salesperson}</div>
                  <div><span className="font-medium">定金状态:</span> {order.depositStatus}</div>
                  {order.notes && (
                    <div><span className="font-medium">备注信息:</span> {order.notes}</div>
                  )}
                </div>
              </div>
            ))}
            {returnOrders.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-lg mb-2">📅</div>
                <p className="text-gray-500">今日无还机安排</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">当日统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{pickupOrders.length}</div>
            <div className="text-sm text-gray-600">取机数量</div>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{returnOrders.length}</div>
            <div className="text-sm text-gray-600">还机数量</div>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{pickupOrders.length + returnOrders.length}</div>
            <div className="text-sm text-gray-600">总安排</div>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{pendingPickupOrders.length}</div>
            <div className="text-sm text-gray-600">未取数量</div>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-red-600">{pendingReturnOrders.length}</div>
            <div className="text-sm text-gray-600">未还数量</div>
          </div>
        </div>
      </div>

      {/* 提示弹窗 */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">操作提示</h3>
              <p className="text-sm text-gray-600 mb-4">{alertMessage}</p>
              <button
                onClick={() => setShowAlert(false)}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:ring-4 focus:ring-yellow-200 transition-all duration-200 font-medium"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}