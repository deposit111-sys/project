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
  // 警告：这个函数会清空所有数据，包括备份
  const keysToRemove = [
    'cameras',
    'orders', 
    'confirmedPickups',
    'confirmedReturns',
    'showOrderModal',
    'activeTab',
    // 备份键
    'cameras_backup',
    'orders_backup',
    'confirmedPickups_backup',
    'confirmedReturns_backup',
    'showOrderModal_backup',
    'activeTab_backup',
    // 二级备份键
    'cameras_backup2',
    'orders_backup2',
    'confirmedPickups_backup2',
    'confirmedReturns_backup2',
    'showOrderModal_backup2',
    'activeTab_backup2'
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`Removed localStorage key: ${key}`);
    } catch (error) {
      console.error(`Failed to remove localStorage key "${key}":`, error);
    }
  });
}

// 新增：仅清空业务数据，保留确认状态
export function clearBusinessDataOnly(): void {
  const keysToRemove = [
    'cameras',
    'orders',
    'showOrderModal',
    'activeTab',
    // 对应的备份
    'cameras_backup',
    'orders_backup',
    'showOrderModal_backup',
    'activeTab_backup',
    // 二级备份
    'cameras_backup2',
    'orders_backup2',
    'showOrderModal_backup2',
    'activeTab_backup2'
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`Removed business data key: ${key}`);
    } catch (error) {
      console.error(`Failed to remove business data key "${key}":`, error);
    }
  });
  
  console.log('Business data cleared, confirmation states preserved');
}

// 新增：数据完整性检查和修复
export function checkAndRepairData(): {
  repaired: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let repaired = false;
  
  // 检查关键数据的完整性
  const criticalKeys = ['confirmedPickups', 'confirmedReturns', 'cameras', 'orders', 'showOrderModal', 'activeTab'];
  
  criticalKeys.forEach(key => {
    try {
      const mainData = localStorage.getItem(key);
      const backupKey = `${key}_backup`;
      const backupData = localStorage.getItem(backupKey);
      const secondaryBackupKey = `${key}_backup2`;
      const secondaryBackupData = localStorage.getItem(secondaryBackupKey);
      
      if (!mainData && (backupData || secondaryBackupData)) {
        // 主数据丢失，从备份恢复
        let restored = false;
        
        // 优先从主备份恢复
        if (backupData) {
          try {
            const backup = JSON.parse(backupData);
            if (backup.data) {
              localStorage.setItem(key, JSON.stringify(backup.data));
              issues.push(`Restored ${key} from primary backup`);
              repaired = true;
              restored = true;
            }
          } catch (error) {
            console.error(`Failed to restore from primary backup for ${key}:`, error);
          }
        }
        
        // 如果主备份失败，尝试从二级备份恢复
        if (!restored && secondaryBackupData) {
          try {
            const secondaryBackup = JSON.parse(secondaryBackupData);
            if (secondaryBackup.data) {
              localStorage.setItem(key, JSON.stringify(secondaryBackup.data));
              issues.push(`Restored ${key} from secondary backup`);
              repaired = true;
            }
          } catch (error) {
            console.error(`Failed to restore from secondary backup for ${key}:`, error);
          }
        }
      } else if (mainData && (!backupData || !secondaryBackupData)) {
        // 备份丢失，重新创建
        try {
          const parsedMainData = JSON.parse(mainData);
          const backupData = {
            data: parsedMainData,
            timestamp: Date.now(),
            version: '1.0'
          };
          
          if (!backupData) {
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            issues.push(`Recreated primary backup for ${key}`);
            repaired = true;
          }
          
          if (!secondaryBackupData) {
            localStorage.setItem(secondaryBackupKey, JSON.stringify(backupData));
            issues.push(`Recreated secondary backup for ${key}`);
            repaired = true;
          }
        } catch (error) {
          console.error(`Failed to recreate backup for ${key}:`, error);
          issues.push(`Failed to recreate backup for ${key}: ${error}`);
        }
      }
    } catch (error) {
      issues.push(`Error checking ${key}: ${error}`);
    }
  });
  
  return { repaired, issues };
}

// 新增：全面数据完整性检查
export function performComprehensiveDataCheck(): {
  status: 'healthy' | 'warning' | 'critical';
  details: {
    mainStorage: { [key: string]: boolean };
    primaryBackups: { [key: string]: boolean };
    secondaryBackups: { [key: string]: boolean };
  };
  recommendations: string[];
} {
  const criticalKeys = ['confirmedPickups', 'confirmedReturns', 'cameras', 'orders'];
  const details = {
    mainStorage: {} as { [key: string]: boolean },
    primaryBackups: {} as { [key: string]: boolean },
    secondaryBackups: {} as { [key: string]: boolean }
  };
  const recommendations: string[] = [];
  
  let healthyCount = 0;
  let totalChecks = 0;
  
  criticalKeys.forEach(key => {
    // 检查主存储
    const mainData = localStorage.getItem(key);
    details.mainStorage[key] = !!mainData;
    if (mainData) healthyCount++;
    totalChecks++;
    
    // 检查主备份
    const primaryBackup = localStorage.getItem(`${key}_backup`);
    details.primaryBackups[key] = !!primaryBackup;
    if (primaryBackup) healthyCount++;
    totalChecks++;
    
    // 检查二级备份
    const secondaryBackup = localStorage.getItem(`${key}_backup2`);
    details.secondaryBackups[key] = !!secondaryBackup;
    if (secondaryBackup) healthyCount++;
    totalChecks++;
    
    // 生成建议
    if (!mainData && !primaryBackup && !secondaryBackup) {
      recommendations.push(`${key}: 所有数据丢失，建议重新初始化`);
    } else if (!mainData) {
      recommendations.push(`${key}: 主数据丢失，建议从备份恢复`);
    } else if (!primaryBackup || !secondaryBackup) {
      recommendations.push(`${key}: 备份不完整，建议重新创建备份`);
    }
  });
  
  const healthPercentage = (healthyCount / totalChecks) * 100;
  let status: 'healthy' | 'warning' | 'critical';
  
  if (healthPercentage >= 90) {
    status = 'healthy';
  } else if (healthPercentage >= 60) {
    status = 'warning';
  } else {
    status = 'critical';
  }
  
  return { status, details, recommendations };
}

// 获取本地存储使用情况
export function getStorageInfo(): {
  used: number;
  total: number;
  percentage: number;
  camerasSize: number;
  ordersSize: number;
  backupSize: number;
} {
  const cameras = localStorage.getItem('cameras') || '[]';
  const orders = localStorage.getItem('orders') || '[]';
  const confirmedPickups = localStorage.getItem('confirmedPickups') || '[]';
  const confirmedReturns = localStorage.getItem('confirmedReturns') || '[]';
  
  // 计算备份大小
  let backupSize = 0;
  const backupKeys = [
    'cameras_backup', 'orders_backup', 'confirmedPickups_backup', 'confirmedReturns_backup',
    'cameras_backup2', 'orders_backup2', 'confirmedPickups_backup2', 'confirmedReturns_backup2'
  ];
  
  backupKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      backupSize += new Blob([data]).size;
    }
  });
  
  const camerasSize = new Blob([cameras]).size;
  const ordersSize = new Blob([orders]).size;
  const confirmationSize = new Blob([confirmedPickups + confirmedReturns]).size;
  const used = camerasSize + ordersSize + confirmationSize + backupSize;
  
  // localStorage 通常限制为 5-10MB，这里假设 5MB
  const total = 5 * 1024 * 1024;
  const percentage = (used / total) * 100;
  
  return {
    used,
    total,
    percentage,
    camerasSize,
    ordersSize,
    backupSize
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