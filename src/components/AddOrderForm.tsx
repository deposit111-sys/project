import React, { useState } from 'react';
import { Camera, RentalOrder } from '../types';
import { checkScheduleConflict } from '../utils/dateUtils';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface AddOrderFormProps {
  cameras: Camera[];
  orders: RentalOrder[];
  onAddOrder: (order: Omit<RentalOrder, 'id' | 'createdAt'>) => void;
}

export function AddOrderForm({ cameras, orders, onAddOrder }: AddOrderFormProps) {
  const [formData, setFormData] = useState({
    cameraModel: '',
    cameraSerialNumber: '',
    renterName: '',
    customerService: '',
    salesperson: '',
    pickupDate: '',
    pickupTime: 'morning' as 'morning' | 'afternoon' | 'evening',
    returnDate: '',
    returnTime: 'morning' as 'morning' | 'afternoon' | 'evening',
    depositStatus: '',
    notes: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableSerials, setAvailableSerials] = useState<string[]>([]);

  const customerServiceOptions = ['1', '2', '3', '郭', '雨'];
  const timeOptions = [
    { value: 'morning', label: '上午' },
    { value: 'afternoon', label: '下午' },
    { value: 'evening', label: '晚上' }
  ];

  const handleModelChange = (model: string) => {
    setFormData(prev => ({ ...prev, cameraModel: model, cameraSerialNumber: '' }));
    const serials = cameras
      .filter(cam => cam.model === model)
      .map(cam => cam.serialNumber)
      .sort((a, b) => {
        // 尝试按数字排序，如果不是数字则按字符串排序
        const aNum = parseInt(a, 10);
        const bNum = parseInt(b, 10);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum; // 数字升序
        } else {
          return a.localeCompare(b); // 字符串升序
        }
      });
    setAvailableSerials(serials);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 验证必填字段
    if (!formData.renterName.trim()) {
      setError('请输入租借人名称');
      return;
    }

    if (!formData.customerService) {
      setError('请选择客服号');
      return;
    }

    if (!formData.salesperson.trim()) {
      setError('请输入销售人员');
      return;
    }

    if (!formData.pickupDate) {
      setError('请选择取机时间');
      return;
    }

    if (!formData.returnDate) {
      setError('请选择还机时间');
      return;
    }

    // 验证日期逻辑 - 允许同一天的不同时间段
    const pickupDate = new Date(formData.pickupDate + 'T00:00:00');
    const returnDate = new Date(formData.returnDate + 'T00:00:00');
    
    // 如果是同一天，检查时间段逻辑
    if (pickupDate.getTime() === returnDate.getTime()) {
      const timeOrder = { morning: 1, afternoon: 2, evening: 3 };
      if (timeOrder[formData.returnTime] <= timeOrder[formData.pickupTime]) {
        setError('同一天内，还机时间段必须晚于取机时间段');
        return;
      }
    } else if (returnDate < pickupDate) {
      setError('还机日期不能早于取机日期');
      return;
    }
    
    if (!formData.cameraModel || !formData.cameraSerialNumber) {
      setError('请选择相机型号和编号');
      return;
    }

    const hasConflict = checkScheduleConflict(
      formData,
      orders,
      formData.cameraModel,
      formData.cameraSerialNumber
    );

    if (hasConflict) {
      setError('该相机在选择的时间段内已被预订，请重新选择时间或相机！');
      return;
    }

    try {
      onAddOrder(formData);
      setSuccess(`租赁订单添加成功！相机：${formData.cameraModel} (${formData.cameraSerialNumber})，租借人：${formData.renterName}`);
      
      // 清空表单
      setFormData({
        cameraModel: '',
        cameraSerialNumber: '',
        renterName: '',
        customerService: '',
        salesperson: '',
        pickupDate: '',
        pickupTime: 'morning',
        returnDate: '',
        returnTime: 'morning',
        depositStatus: '',
        notes: ''
      });
      setAvailableSerials([]);
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('添加订单失败，请重试');
    }
  };

  const uniqueModels = [...new Set(cameras.map(cam => cam.model))];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center group">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 group-hover:rotate-180 transition-transform duration-500">
          <Plus className="h-5 w-5 text-white" />
        </div>
        添加租赁订单
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">相机型号</label>
            <select
              value={formData.cameraModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 text-sm"
              required
            >
              <option value="">选择相机型号</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">相机编号</label>
            <select
              value={formData.cameraSerialNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, cameraSerialNumber: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 text-sm"
              required
              disabled={!formData.cameraModel}
            >
              <option value="">选择相机编号</option>
              {availableSerials.map(serial => (
                <option key={serial} value={serial}>{serial}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">租借人名称</label>
            <input
              type="text"
              value={formData.renterName}
              onChange={(e) => setFormData(prev => ({ ...prev, renterName: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-0 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客服号</label>
            <select
              value={formData.customerService}
              onChange={(e) => setFormData(prev => ({ ...prev, customerService: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-0 text-sm"
              required
            >
              <option value="">选择客服号</option>
              {customerServiceOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">销售人员</label>
            <input
              type="text"
              value={formData.salesperson}
              onChange={(e) => setFormData(prev => ({ ...prev, salesperson: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-0 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">定金状态</label>
            <input
              type="text"
              value={formData.depositStatus}
              onChange={(e) => setFormData(prev => ({ ...prev, depositStatus: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-0 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">取机时间</label>
            <div className="flex space-x-2">
              <DatePicker
                value={formData.pickupDate}
                onChange={(date) => setFormData(prev => ({ ...prev, pickupDate: date }))}
                placeholder="选择取机日期"
                className="flex-1 min-w-[180px]"
                required
              />
              <select
                value={formData.pickupTime}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value as any }))}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] text-sm"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">还机时间</label>
            <div className="flex space-x-2">
              <DatePicker
                value={formData.returnDate}
                onChange={(date) => setFormData(prev => ({ ...prev, returnDate: date }))}
                placeholder="选择还机日期"
                className="flex-1 min-w-[180px]"
                required
              />
              <select
                value={formData.returnTime}
                onChange={(e) => setFormData(prev => ({ ...prev, returnTime: e.target.value as any }))}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px] text-sm"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注信息</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-0 text-sm resize-none"
            placeholder="请输入备注信息..."
          />
        </div>

        <button
          type="submit"
          className="group w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
        >
          <span className="group-hover:scale-105 transition-transform duration-300 inline-block">
          添加租赁订单
          </span>
        </button>
        
        {/* 反馈消息显示在按钮下方 */}
        {error && (
          <div className="flex items-start p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl mt-4 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl mt-4 shadow-sm">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-green-700 text-sm leading-relaxed">{success}</span>
          </div>
        )}
      </form>
    </div>
  );
}