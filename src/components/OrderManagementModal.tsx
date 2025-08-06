import React, { useState } from 'react';
import { RentalOrder, Camera } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { checkScheduleConflict } from '../utils/dateUtils';
import { Edit2, Trash2, X, Filter, Search, Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: RentalOrder[];
  cameras: Camera[];
  onUpdateOrder: (id: string, order: Partial<RentalOrder>) => void;
  onDeleteOrder: (id: string) => void;
  onSwitchToCalendar?: (model: string, date: string) => void;
}

export function OrderManagementModal({ 
  isOpen, 
  onClose, 
  orders, 
  cameras, 
  onUpdateOrder, 
  onDeleteOrder,
  onSwitchToCalendar
}: OrderManagementModalProps) {
  const [editingOrder, setEditingOrder] = useState<RentalOrder | null>(null);
  const [formData, setFormData] = useState<Partial<RentalOrder>>({});
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [conflictInfo, setConflictInfo] = useState<{
    conflictingOrder: RentalOrder | null;
    availableAlternatives: Array<{ model: string; serialNumber: string }>;
  }>({ conflictingOrder: null, availableAlternatives: [] });

  if (!isOpen) return null;

  // 筛选和搜索逻辑
  const filteredOrders = orders.filter(order => {
    // 月份筛选
    if (selectedMonth) {
      const orderMonth = order.pickupDate.substring(0, 7); // YYYY-MM 格式
      if (orderMonth !== selectedMonth) {
        return false;
      }
    }

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      const searchFields = [
        order.cameraModel,
        order.cameraSerialNumber,
        order.renterName,
        order.customerService,
        order.salesperson,
        order.depositStatus,
        order.notes
      ].join(' ').toLowerCase();
      
      if (!searchFields.includes(keyword)) {
        return false;
      }
    }

    return true;
  });

  // 生成月份选项
  const getMonthOptions = () => {
    const months = new Set<string>();
    orders.forEach(order => {
      const month = order.pickupDate.substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse(); // 最新月份在前
  };

  const monthOptions = getMonthOptions();

  const handleEdit = (order: RentalOrder) => {
    setEditingOrder(order);
    setFormData(order);
  };

  const handleSave = () => {
    if (editingOrder) {
      // 检查是否有冲突（排除当前编辑的订单）
      const otherOrders = orders.filter(order => order.id !== editingOrder.id);
      const hasConflict = checkScheduleConflict(
        formData,
        otherOrders,
        formData.cameraModel || '',
        formData.cameraSerialNumber || ''
      );

      if (hasConflict) {
        // 找到冲突的订单
        const conflictingOrder = otherOrders.find(order => 
          order.cameraModel === formData.cameraModel &&
          order.cameraSerialNumber === formData.cameraSerialNumber &&
          checkScheduleConflict(formData, [order], formData.cameraModel || '', formData.cameraSerialNumber || '')
        );

        // 找到可用的替代相机
        const availableAlternatives = cameras.filter(camera => {
          if (camera.model !== formData.cameraModel) return false;
          if (camera.serialNumber === formData.cameraSerialNumber) return false;
          
          const hasConflictWithAlternative = checkScheduleConflict(
            formData,
            otherOrders,
            camera.model,
            camera.serialNumber
          );
          
          return !hasConflictWithAlternative;
        });

        setConflictInfo({
          conflictingOrder: conflictingOrder || null,
          availableAlternatives
        });
        setShowConflictModal(true);
      } else {
        // 没有冲突，直接保存
        onUpdateOrder(editingOrder.id, formData);
        setEditingOrder(null);
        setShowConflictModal(false);
        setShowSuccessModal(true);
        // 3秒后自动关闭成功提示
        setTimeout(() => setShowSuccessModal(false), 3000);
      }
    }
  };

  const handleUseAlternative = (camera: { model: string; serialNumber: string }) => {
    if (editingOrder) {
      const updatedFormData = {
        ...formData,
        cameraModel: camera.model,
        cameraSerialNumber: camera.serialNumber
      };
      onUpdateOrder(editingOrder.id, updatedFormData);
      setEditingOrder(null);
      setShowConflictModal(false);
      setShowSuccessModal(true);
      // 3秒后自动关闭成功提示
      setTimeout(() => setShowSuccessModal(false), 3000);
    }
  };

  const handleSwitchToCalendar = (model: string) => {
    if (onSwitchToCalendar && formData.pickupDate) {
      onSwitchToCalendar(model, formData.pickupDate);
      onClose();
      setEditingOrder(null);
      setShowConflictModal(false);
    }
  };
  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个订单吗？')) {
      onDeleteOrder(id);
    }
  };

  const uniqueModels = [...new Set(cameras.map(cam => cam.model))];
  const availableSerials = cameras.filter(cam => cam.model === formData.cameraModel).map(cam => cam.serialNumber);

  const timeOptions = [
    { value: 'morning', label: '上午' },
    { value: 'afternoon', label: '下午' },
    { value: 'evening', label: '晚上' }
  ];

  const customerServiceOptions = ['1', '2', '3', '郭', '雨'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">租赁订单管理</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 筛选和搜索区域 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 月份筛选 */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">筛选月份:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[120px]"
              >
                <option value="">全部月份</option>
                {monthOptions.map(month => {
                  const [year, monthNum] = month.split('-');
                  return (
                    <option key={month} value={month}>
                      {year}年{parseInt(monthNum, 10)}月
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 关键词搜索 */}
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">搜索:</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="输入相机型号、租借人、销售人员等关键词..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* 清空筛选 */}
            {(selectedMonth || searchKeyword) && (
              <button
                onClick={() => {
                  setSelectedMonth('');
                  setSearchKeyword('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                清空筛选
              </button>
            )}

            {/* 结果统计 */}
            <div className="text-sm text-gray-600">
              显示 <span className="font-medium text-blue-600">{filteredOrders.length.toLocaleString('zh-CN')}</span> / {orders.length.toLocaleString('zh-CN')} 个订单
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {selectedMonth || searchKeyword ? '未找到匹配的订单' : '暂无订单'}
              </h3>
              <p className="text-gray-500">
                {selectedMonth || searchKeyword 
                  ? '请尝试调整筛选条件或搜索关键词' 
                  : '还没有任何租赁订单，请先添加订单'
                }
              </p>
              {(selectedMonth || searchKeyword) && (
                <button
                  onClick={() => {
                    setSelectedMonth('');
                    setSearchKeyword('');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200"
                >
                  清空筛选条件
                </button>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-semibold">相机型号</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">相机编号</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">租借人</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">客服号</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">销售人员</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">取机时间</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">还机时间</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">定金状态</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3">{order.cameraModel}</td>
                    <td className="border border-gray-300 p-3">{order.cameraSerialNumber}</td>
                    <td className="border border-gray-300 p-3">{order.renterName}</td>
                    <td className="border border-gray-300 p-3">{order.customerService}</td>
                    <td className="border border-gray-300 p-3">{order.salesperson}</td>
                    <td className="border border-gray-300 p-3">{formatDateTime(order.pickupDate, order.pickupTime)}</td>
                    <td className="border border-gray-300 p-3">{formatDateTime(order.returnDate, order.returnTime)}</td>
                    <td className="border border-gray-300 p-3">{order.depositStatus}</td>
                    <td className="border border-gray-300 p-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                          title="编辑订单"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg focus:ring-2 focus:ring-red-200 transition-all duration-200"
                          title="删除订单"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* 编辑订单模态框 */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">编辑订单</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">相机型号</label>
                  <select
                    value={formData.cameraModel || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cameraModel: e.target.value, cameraSerialNumber: '' }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {uniqueModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">相机编号</label>
                  <select
                    value={formData.cameraSerialNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cameraSerialNumber: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableSerials.map(serial => (
                      <option key={serial} value={serial}>{serial}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">租借人</label>
                  <input
                    type="text"
                    value={formData.renterName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, renterName: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">客服号</label>
                  <select
                    value={formData.customerService || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerService: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {customerServiceOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">销售人员</label>
                  <input
                    type="text"
                    value={formData.salesperson || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, salesperson: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">定金状态</label>
                  <input
                    type="text"
                    value={formData.depositStatus || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositStatus: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">取机时间</label>
                  <div className="flex space-x-2">
                    <DatePicker
                      value={formData.pickupDate || ''}
                      onChange={(date) => setFormData(prev => ({ ...prev, pickupDate: date }))}
                      placeholder="选择取机日期"
                      className="flex-1"
                    />
                    <select
                      value={formData.pickupTime || 'morning'}
                      onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value as any }))}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {timeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">还机时间</label>
                  <div className="flex space-x-2">
                    <DatePicker
                      value={formData.returnDate || ''}
                      onChange={(date) => setFormData(prev => ({ ...prev, returnDate: date }))}
                      placeholder="选择还机日期"
                      className="flex-1"
                    />
                    <select
                      value={formData.returnTime || 'morning'}
                      onChange={(e) => setFormData(prev => ({ ...prev, returnTime: e.target.value as any }))}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {timeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注信息</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 冲突处理模态框 */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-red-600">时间冲突</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-700">
                <p className="mb-2">您选择的时间段与以下订单冲突：</p>
                {conflictInfo.conflictingOrder && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium">租借人: {conflictInfo.conflictingOrder.renterName}</div>
                    <div className="text-sm text-gray-600">
                      {formatDateTime(conflictInfo.conflictingOrder.pickupDate, conflictInfo.conflictingOrder.pickupTime)} - 
                      {formatDateTime(conflictInfo.conflictingOrder.returnDate, conflictInfo.conflictingOrder.returnTime)}
                    </div>
                  </div>
                )}
              </div>

              {conflictInfo.availableAlternatives.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">可用的同型号相机：</p>
                  <div className="space-y-2">
                    {conflictInfo.availableAlternatives.map((camera, index) => (
                      <button
                        key={index}
                        onClick={() => handleUseAlternative(camera)}
                        className="w-full text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-200"
                      >
                        <div className="font-medium text-green-800">{camera.model}</div>
                        <div className="text-sm text-green-600">编号: {camera.serialNumber}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-700 mb-2">或者查看其他型号的档期：</p>
                <button
                  onClick={() => handleSwitchToCalendar(formData.cameraModel || '')}
                  className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-blue-700 font-medium"
                >
                  在相机档期日历中查看 {formData.cameraModel} 的档期
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowConflictModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存成功提示模态框 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">保存成功</h3>
              <p className="text-sm text-gray-600 mb-4">订单信息已成功更新</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 font-medium"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}