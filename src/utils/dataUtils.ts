// 生成简单的校验和
function generateChecksum<T>(data: T): string {
  let str: string;
  try {
    const result = JSON.stringify(data);
    str = result ?? 'null';
  } catch (error) {
    console.warn('Failed to stringify data for checksum:', error);
    str = 'null';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// 验证数据完整性
function verifyDataIntegrity<T>(data: T, checksum: string): boolean {
  return generateChecksum(data) === checksum;
}

// 检查数据是否有效
function isValidData(data: string | null): boolean {
  if (!data || data === 'undefined' || data === 'null') {
    return false;
  }
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

export interface SystemData {
  cameras: any[];
  orders: any[];
  exportDate: string;
  version: string;
}

// 导出生成校验和函数供其他模块使用
export { generateChecksum, verifyDataIntegrity };
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

// 尝试从所有可能的备份源恢复数据
export function attemptFullDataRecovery(): {
  recovered: boolean;
  data: {
    cameras: any[];
    orders: any[];
    confirmedPickups: string[];
    confirmedReturns: string[];
  };
  source: string;
} {
  const result = {
    recovered: false,
    data: {
      cameras: [],
      orders: [],
      confirmedPickups: [],
      confirmedReturns: []
    },
    source: ''
  };

  // 尝试从各种可能的备份源恢复
  const backupSources = [
    // 主备份
    'cameras_backup',
    'orders_backup', 
    'confirmedPickups_backup',
    'confirmedReturns_backup',
    // 二级备份
    'cameras_backup2',
    'orders_backup2',
    'confirmedPickups_backup2', 
    'confirmedReturns_backup2',
    // 可能的其他备份键名
    'cameras_bak',
    'orders_bak',
    'camera_data',
    'order_data',
    'rental_cameras',
    'rental_orders'
  ];

  let recoveredAny = false;

  // 尝试恢复相机数据
  for (const key of backupSources) {
    if (key.includes('camera')) {
      try {
        const data = localStorage.getItem(key);
        if (data && data !== 'null' && data !== 'undefined') {
          const parsed = JSON.parse(data);
          let cameraData = parsed;
          
          // 如果是备份格式，提取data字段
          if (parsed.data && Array.isArray(parsed.data)) {
            cameraData = parsed.data;
          }
          
          if (Array.isArray(cameraData) && cameraData.length > 0) {
            result.data.cameras = cameraData;
            result.source += `相机数据从 ${key} 恢复; `;
            recoveredAny = true;
            break;
          }
        }
      } catch (error) {
        console.log(`Failed to recover from ${key}:`, error);
      }
    }
  }

  // 尝试恢复订单数据
  for (const key of backupSources) {
    if (key.includes('order')) {
      try {
        const data = localStorage.getItem(key);
        if (data && data !== 'null' && data !== 'undefined') {
          const parsed = JSON.parse(data);
          let orderData = parsed;
          
          // 如果是备份格式，提取data字段
          if (parsed.data && Array.isArray(parsed.data)) {
            orderData = parsed.data;
          }
          
          if (Array.isArray(orderData) && orderData.length > 0) {
            result.data.orders = orderData;
            result.source += `订单数据从 ${key} 恢复; `;
            recoveredAny = true;
            break;
          }
        }
      } catch (error) {
        console.log(`Failed to recover from ${key}:`, error);
      }
    }
  }

  // 尝试恢复确认状态
  for (const key of backupSources) {
    if (key.includes('confirmedPickups') || key.includes('pickup')) {
      try {
        const data = localStorage.getItem(key);
        if (data && data !== 'null' && data !== 'undefined') {
          const parsed = JSON.parse(data);
          let pickupData = parsed;
          
          if (parsed.data && Array.isArray(parsed.data)) {
            pickupData = parsed.data;
          }
          
          if (Array.isArray(pickupData)) {
            result.data.confirmedPickups = pickupData;
            result.source += `取机确认从 ${key} 恢复; `;
            recoveredAny = true;
            break;
          }
        }
      } catch (error) {
        console.log(`Failed to recover pickups from ${key}:`, error);
      }
    }
  }

  for (const key of backupSources) {
    if (key.includes('confirmedReturns') || key.includes('return')) {
      try {
        const data = localStorage.getItem(key);
        if (data && data !== 'null' && data !== 'undefined') {
          const parsed = JSON.parse(data);
          let returnData = parsed;
          
          if (parsed.data && Array.isArray(parsed.data)) {
            returnData = parsed.data;
          }
          
          if (Array.isArray(returnData)) {
            result.data.confirmedReturns = returnData;
            result.source += `还机确认从 ${key} 恢复; `;
            recoveredAny = true;
            break;
          }
        }
      } catch (error) {
        console.log(`Failed to recover returns from ${key}:`, error);
      }
    }
  }

  result.recovered = recoveredAny;
  return result;
}

// 扫描所有localStorage键，寻找可能的数据
export function scanAllLocalStorageKeys(): {
  possibleDataKeys: string[];
  allKeys: string[];
} {
  const allKeys: string[] = [];
  const possibleDataKeys: string[] = [];
  
  // 遍历所有localStorage键
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      allKeys.push(key);
      
      // 检查是否可能包含相机或订单数据
      if (key.toLowerCase().includes('camera') || 
          key.toLowerCase().includes('order') || 
          key.toLowerCase().includes('rental') ||
          key.toLowerCase().includes('confirmed') ||
          key.toLowerCase().includes('pickup') ||
          key.toLowerCase().includes('return') ||
          key.includes('backup')) {
        possibleDataKeys.push(key);
      }
    }
  }
  
  return { possibleDataKeys, allKeys };
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
      
      const isMainDataValid = isValidData(mainData);
      const isBackupDataValid = isValidData(backupData);
      const isSecondaryBackupDataValid = isValidData(secondaryBackupData);
      
      if (!isMainDataValid && (isBackupDataValid || isSecondaryBackupDataValid)) {
        // 主数据丢失，从备份恢复
        let restored = false;
        
        // 优先从主备份恢复
        if (isBackupDataValid) {
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
        if (!restored && isSecondaryBackupDataValid) {
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
      } else if (isMainDataValid && (!isBackupDataValid || !isSecondaryBackupDataValid)) {
        // 备份丢失，重新创建
        try {
          const parsedMainData = JSON.parse(mainData);
          const backupDataObj = {
            data: parsedMainData,
            timestamp: Date.now(),
            version: '1.0',
            checksum: generateChecksum(parsedMainData)
          };
          
          if (!isBackupDataValid) {
            localStorage.setItem(backupKey, JSON.stringify(backupDataObj));
            issues.push(`Recreated primary backup for ${key}`);
            repaired = true;
          }
          
          if (!isSecondaryBackupDataValid) {
            localStorage.setItem(secondaryBackupKey, JSON.stringify(backupDataObj));
            issues.push(`Recreated secondary backup for ${key}`);
            repaired = true;
          }
        } catch (error) {
          console.error(`Failed to recreate backup for ${key}:`, error);
          issues.push(`Failed to recreate backup for ${key}: ${error.message}`);
        }
      } else if (!isMainDataValid && !isBackupDataValid && !isSecondaryBackupDataValid) {
        // 所有数据都损坏或丢失
        issues.push(`All data lost for ${key}, needs reinitialization`);
        // 设置默认值
        const defaultValue = key.includes('confirmed') ? '[]' : (key === 'showOrderModal' ? 'false' : (key === 'activeTab' ? '"pickup"' : '[]'));
        try {
          localStorage.setItem(key, defaultValue);
          const parsedDefault = JSON.parse(defaultValue);
          const backupDataObj = {
            data: parsedDefault,
            timestamp: Date.now(),
            version: '1.0',
            checksum: generateChecksum(parsedDefault)
          };
          localStorage.setItem(backupKey, JSON.stringify(backupDataObj));
          localStorage.setItem(secondaryBackupKey, JSON.stringify(backupDataObj));
          issues.push(`Reinitialized ${key} with default value`);
          repaired = true;
        } catch (error) {
          console.error(`Failed to reinitialize ${key}:`, error);
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