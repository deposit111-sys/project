export interface SystemData {
  cameras: any[];
  orders: any[];
  exportDate: string;
  version: string;
}

// 导出所有系统数据
export function exportSystemData(cameras: any[], orders: any[]): void {
  const systemData: SystemData = {
    cameras,
    orders,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };

  const dataStr = JSON.stringify(systemData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `相机租赁系统数据备份_${new Date().toISOString().split('T')[0]}.json`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// 导入系统数据
export function importSystemData(file: File): Promise<SystemData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as SystemData;
        
        // 验证数据格式
        if (!data.cameras || !data.orders || !Array.isArray(data.cameras) || !Array.isArray(data.orders)) {
          throw new Error('数据格式不正确');
        }
        
        resolve(data);
      } catch (error) {
        reject(new Error('文件格式错误或数据损坏'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}

// 清空所有本地数据
export function clearAllLocalData(): void {
  localStorage.removeItem('cameras');
  localStorage.removeItem('orders');
  localStorage.removeItem('confirmedPickups');
  localStorage.removeItem('confirmedReturns');
  localStorage.removeItem('showOrderModal');
  localStorage.removeItem('activeTab');
}

// 获取本地存储使用情况
export function getStorageInfo(): {
  used: number;
  total: number;
  percentage: number;
  camerasSize: number;
  ordersSize: number;
} {
  const cameras = localStorage.getItem('cameras') || '[]';
  const orders = localStorage.getItem('orders') || '[]';
  
  const camerasSize = new Blob([cameras]).size;
  const ordersSize = new Blob([orders]).size;
  const used = camerasSize + ordersSize;
  
  // localStorage 通常限制为 5-10MB，这里假设 5MB
  const total = 5 * 1024 * 1024;
  const percentage = (used / total) * 100;
  
  return {
    used,
    total,
    percentage,
    camerasSize,
    ordersSize
  };
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}