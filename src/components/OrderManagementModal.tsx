import React, { useState } from 'react';
import { RentalOrder, Camera } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { Edit2, Trash2, X } from 'lucide-react';

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: RentalOrder[];
  cameras: Camera[];
  onUpdateOrder: (id: string, order: Partial<RentalOrder>) => void;
  onDeleteOrder: (id: string) => void;
}

export function OrderManagementModal({ 
  isOpen, 
  onClose, 
  orders, 
  cameras, 
  onUpdateOrder, 
  onDeleteOrder 
}: OrderManagementModalProps) {
  const [editingOrder, setEditingOrder] = useState<RentalOrder | null>(null);
  const [formData, setFormData] = useState<Partial<RentalOrder>>({});

  if (!isOpen) return null;

  const handleEdit = (order: RentalOrder) => {
    setEditingOrder(order);
    setFormData(order);
  };

  const handleSave = () => {
    if (editingOrder) {
      onUpdateOrder(editingOrder.id, formData);
      setEditingOrder(null);
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

        <div className="flex-1 overflow-auto p-6">
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
                {orders.map(order => (
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
                    <input
                      type="date"
                      value={formData.pickupDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, pickupDate: e.target.value }))}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <input
                      type="date"
                      value={formData.returnDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
    </div>
  );
}