import React, { useState } from 'react';
import type { Camera } from '../types';
import { Plus, ChevronDown, ChevronUp, Trash2, Camera } from 'lucide-react';

interface CameraManagementProps {
  cameras: Camera[];
  onAddCamera: (camera: Omit<Camera, 'id'>) => void;
  onDeleteCamera: (id: string) => void;
}

export function CameraManagement({ cameras, onAddCamera, onDeleteCamera }: CameraManagementProps) {
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddCamera = () => {
    setError('');
    setSuccess('');
    
    if (!newModel.trim()) {
      setError('请输入相机型号');
      return;
    }
    
    if (!newSerial.trim()) {
      setError('请输入相机编号');
      return;
    }
    
    if (newModel.trim() && newSerial.trim()) {
      // 检查是否已存在相同的相机编号
      const existingCamera = cameras.find(camera => 
        camera.model === newModel.trim() && camera.serialNumber === newSerial.trim()
      );
      
      if (existingCamera) {
        setError('该相机型号和编号已存在！');
        return;
      }
      
      try {
        onAddCamera({
          model: newModel.trim(),
          serialNumber: newSerial.trim()
        });
        setSuccess(`相机添加成功！型号：${newModel.trim()}，编号：${newSerial.trim()}`);
        setNewModel('');
        setNewSerial('');
        
        // 3秒后清除成功消息
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('添加相机失败，请重试');
      }
    }
  };

  const groupedCameras = cameras.reduce((acc, camera) => {
    if (!acc[camera.model]) {
      acc[camera.model] = [];
    }
    acc[camera.model].push(camera);
    return acc;
  }, {} as Record<string, Camera[]>);

  // 对每个型号的相机按编号降序排列
  Object.keys(groupedCameras).forEach(model => {
    groupedCameras[model].sort((a, b) => {
      // 尝试按数字排序，如果不是数字则按字符串排序
      const aNum = parseInt(a.serialNumber, 10);
      const bNum = parseInt(b.serialNumber, 10);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum; // 数字升序
      } else {
        return a.serialNumber.localeCompare(b.serialNumber); // 字符串升序
      }
    });
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center group">
        <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg mr-3 group-hover:rotate-12 transition-transform duration-300">
          <CameraIcon className="h-5 w-5 text-white" />
        </div>
        相机型号管理
      </h2>
      
      <div className="space-y-4">
        {error && (
          <div className="flex items-center p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm">
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder="相机型号"
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 min-w-0 text-sm shadow-sm focus:shadow-md"
          />
          <input
            type="text"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
            placeholder="相机编号"
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 min-w-0 text-sm shadow-sm focus:shadow-md"
            onKeyPress={(e) => e.key === 'Enter' && handleAddCamera()}
          />
          <button
            onClick={handleAddCamera}
            className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
          >
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="group flex items-center justify-between w-full p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:from-gray-100 hover:to-blue-100 focus:ring-2 focus:ring-gray-200 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <span className="font-medium">相机库存 ({cameras.length}台)</span>
            {isExpanded ? 
              <ChevronUp className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" /> : 
              <ChevronDown className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
            }
          </button>
          
          {isExpanded && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(groupedCameras).map(([model, cameraList]) => (
                <div key={model} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="font-medium text-gray-800 mb-2">{model} ({cameraList.length}台)</h3>
                  <div className="space-y-1">
                    {cameraList.map(camera => (
                      <div key={camera.id} className="group flex items-center justify-between py-2 px-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:from-gray-100 hover:to-blue-100 transition-all duration-300">
                        <span className="text-sm text-gray-600">编号: {camera.serialNumber}</span>
                        <button
                          onClick={() => onDeleteCamera(camera.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg focus:ring-2 focus:ring-red-200 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110"
                          title="删除相机"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}