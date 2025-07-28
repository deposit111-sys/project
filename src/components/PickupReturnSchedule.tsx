import React, { useState } from 'react';
import { RentalOrder } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface PickupReturnScheduleProps {
  orders: RentalOrder[];
  onConfirmPickup: (orderId: string) => void;
  onConfirmReturn: (orderId: string) => void;
}

export function PickupReturnSchedule({ orders, onConfirmPickup, onConfirmReturn }: PickupReturnScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmedPickups, setConfirmedPickups] = useState<Set<string>>(new Set());
  const [confirmedReturns, setConfirmedReturns] = useState<Set<string>>(new Set());

  const getOrdersForDate = (date: string, type: 'pickup' | 'return') => {
    return orders.filter(order => {
      const orderDate = type === 'pickup' ? order.pickupDate : order.returnDate;
      return orderDate === date;
    });
  };

  const pickupOrders = getOrdersForDate(selectedDate, 'pickup');
  const returnOrders = getOrdersForDate(selectedDate, 'return');

  const timeMap = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚上'
  };

  const handlePickupConfirm = (orderId: string) => {
    const newConfirmed = new Set(confirmedPickups);
    if (newConfirmed.has(orderId)) {
      newConfirmed.delete(orderId);
    } else {
      newConfirmed.add(orderId);
    }
    setConfirmedPickups(newConfirmed);
    onConfirmPickup(orderId);
  };

  const handleReturnConfirm = (orderId: string) => {
    const newConfirmed = new Set(confirmedReturns);
    if (newConfirmed.has(orderId)) {
      newConfirmed.delete(orderId);
    } else {
      newConfirmed.add(orderId);
    }
    setConfirmedReturns(newConfirmed);
    onConfirmReturn(orderId);
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
          onChange={(e) => setSelectedDate(e.target.value)}
          placeholder="选择查看日期"
          className="min-w-[180px]"
        />
      </div>

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
                    className="flex items-center text-green-600 hover:text-green-700 focus:ring-2 focus:ring-green-200 rounded transition-all duration-200 p-1"
                  >
                    {confirmedPickups.has(order.id) ? (
                      <CheckCircle2 className="h-5 w-5 mr-1 fill-current" />
                    ) : (
                      <Circle className="h-5 w-5 mr-1" />
                    )}
                    <span className="text-sm font-medium">确认取机</span>
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
                    className="flex items-center text-blue-600 hover:text-blue-700 focus:ring-2 focus:ring-blue-200 rounded transition-all duration-200 p-1"
                  >
                    {confirmedReturns.has(order.id) ? (
                      <CheckCircle2 className="h-5 w-5 mr-1 fill-current" />
                    ) : (
                      <Circle className="h-5 w-5 mr-1" />
                    )}
                    <span className="text-sm font-medium">确认还机</span>
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
        <div className="grid grid-cols-3 gap-4 text-center">
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
        </div>
      </div>
    </div>
  );
}