import React, { useState } from 'react';
import { Camera, RentalOrder } from '../types';
import { isDateInRange } from '../utils/dateUtils';
import { Search, Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface ScheduleSearchProps {
  cameras: Camera[];
  orders: RentalOrder[];
}

export function ScheduleSearch({ cameras, orders }: ScheduleSearchProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableCameras, setAvailableCameras] = useState<Camera[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchAvailableCameras = () => {
    if (!startDate || !endDate) return;

    const available = cameras.filter(camera => {
      const hasConflict = orders.some(order => 
        order.cameraModel === camera.model &&
        order.cameraSerialNumber === camera.serialNumber &&
        (isDateInRange(startDate, order.pickupDate, order.returnDate) ||
         isDateInRange(endDate, order.pickupDate, order.returnDate) ||
         isDateInRange(order.pickupDate, startDate, endDate))
      );
      return !hasConflict;
    });

    setAvailableCameras(available);
    setHasSearched(true);
  };

  const handleDateChange = (type: 'start' | 'end', date: string) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    // 重置搜索状态，清空之前的结果
    setHasSearched(false);
    setAvailableCameras([]);
  };

  return (
    <div>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              开始时间
            </label>
            <DatePicker
              value={startDate}
              onChange={(date) => handleDateChange('start', date)}
              placeholder="选择开始日期"
              className="min-w-[150px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              结束时间
            </label>
            <DatePicker
              value={endDate}
              onChange={(date) => handleDateChange('end', date)}
              placeholder="选择结束日期"
              className="min-w-[150px]"
            />
          </div>
          <div>
            <button
              onClick={searchAvailableCameras}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Search className="h-4 w-4 mr-2" />
              搜索
            </button>
          </div>
        </div>

        {/* 搜索提示 */}
        {startDate && endDate && !hasSearched && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <Search className="h-4 w-4 mr-2" />
              <span className="text-sm">已选择时间段：{startDate} 至 {endDate}，点击"搜索"按钮查看可用相机</span>
            </div>
          </div>
        )}

        {availableCameras.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">搜索结果</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {availableCameras.length}台可用
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCameras.map(camera => (
                <div key={camera.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="font-semibold text-gray-800 mb-1">{camera.model}</div>
                  <div className="text-sm text-gray-600">编号: {camera.serialNumber}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {hasSearched && startDate && endDate && availableCameras.length === 0 && (
          <div className="mt-6 text-center py-8">
            <div className="text-gray-500">该时间段内暂无可用相机</div>
          </div>
        )}
      </div>
    </div>
  );
}