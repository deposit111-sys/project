import { useState, useEffect } from 'react';

// 备份键名映射
const BACKUP_KEYS = {
  'confirmedPickups': 'confirmedPickups_backup',
  'confirmedReturns': 'confirmedReturns_backup',
  'cameras': 'cameras_backup',
  'orders': 'orders_backup',
  'showOrderModal': 'showOrderModal_backup',
  'activeTab': 'activeTab_backup'
};

// 多重备份键名（用于更高级别的保护）
const SECONDARY_BACKUP_KEYS = {
  'confirmedPickups': 'confirmedPickups_backup2',
  'confirmedReturns': 'confirmedReturns_backup2',
  'cameras': 'cameras_backup2',
  'orders': 'orders_backup2',
  'showOrderModal': 'showOrderModal_backup2',
  'activeTab': 'activeTab_backup2'
};

// 创建备份
function createBackup<T>(key: string, value: T): void {
  try {
    const backupKey = BACKUP_KEYS[key as keyof typeof BACKUP_KEYS];
    if (backupKey) {
      const backupData = {
        data: value,
        timestamp: Date.now(),
        version: '1.0',
        checksum: generateChecksum(value)
      };
      window.localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`Backup created for key [${key}] -> [${backupKey}]`);
      
      // 创建二级备份
      const secondaryBackupKey = SECONDARY_BACKUP_KEYS[key as keyof typeof SECONDARY_BACKUP_KEYS];
      if (secondaryBackupKey) {
        window.localStorage.setItem(secondaryBackupKey, JSON.stringify(backupData));
        console.log(`Secondary backup created for key [${key}] -> [${secondaryBackupKey}]`);
      }
    }
  } catch (error) {
    console.error(`Failed to create backup for key "${key}":`, error);
  }
}

// 生成简单的校验和
function generateChecksum<T>(data: T): string {
  const str = JSON.stringify(data);
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

// 从备份恢复
function restoreFromBackup<T>(key: string, initialValue: T): T {
  try {
    const backupKey = BACKUP_KEYS[key as keyof typeof BACKUP_KEYS];
    if (backupKey) {
      const backupItem = window.localStorage.getItem(backupKey);
      if (backupItem) {
        const backupData = JSON.parse(backupItem);
        if (backupData.data !== undefined && 
            (!backupData.checksum || verifyDataIntegrity(backupData.data, backupData.checksum))) {
          console.log(`Restored from backup for key [${key}]:`, backupData.data);
          return backupData.data;
        }
      }
      
      // 尝试从二级备份恢复
      const secondaryBackupKey = SECONDARY_BACKUP_KEYS[key as keyof typeof SECONDARY_BACKUP_KEYS];
      if (secondaryBackupKey) {
        const secondaryBackupItem = window.localStorage.getItem(secondaryBackupKey);
        if (secondaryBackupItem) {
          const secondaryBackupData = JSON.parse(secondaryBackupItem);
          if (secondaryBackupData.data !== undefined &&
              (!secondaryBackupData.checksum || verifyDataIntegrity(secondaryBackupData.data, secondaryBackupData.checksum))) {
            console.log(`Restored from secondary backup for key [${key}]:`, secondaryBackupData.data);
            return secondaryBackupData.data;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to restore from backup for key "${key}":`, error);
  }
  return initialValue;
}

// 定期保存机制
let periodicSaveInterval: number | null = null;
const pendingSaves = new Map<string, any>();

function startPeriodicSave() {
  if (periodicSaveInterval) return;
  
  periodicSaveInterval = window.setInterval(() => {
    if (pendingSaves.size > 0) {
      console.log('Performing periodic save for', pendingSaves.size, 'items');
      for (const [key, value] of pendingSaves.entries()) {
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
          createBackup(key, value);
          console.log(`Periodic save completed for key [${key}]`);
        } catch (error) {
          console.error(`Periodic save failed for key "${key}":`, error);
        }
      }
      pendingSaves.clear();
    }
  }, 5000); // 每5秒保存一次
}

function stopPeriodicSave() {
  if (periodicSaveInterval) {
    clearInterval(periodicSaveInterval);
    periodicSaveInterval = null;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // 启动定期保存
  React.useEffect(() => {
    startPeriodicSave();
    return () => {
      // 组件卸载时不停止定期保存，因为其他组件可能还在使用
    };
  }, []);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      console.log(`Loading from localStorage [${key}]:`, item);
      if (item === null || item === "undefined") {
        console.log(`No data found for key [${key}], trying backup...`);
        const restoredValue = restoreFromBackup(key, initialValue);
        if (restoredValue !== initialValue) {
          // 如果从备份恢复了数据，立即保存到主存储
          window.localStorage.setItem(key, JSON.stringify(restoredValue));
          console.log(`Restored and saved to main storage [${key}]:`, restoredValue);
        }
        return restoredValue;
      }
      const parsed = JSON.parse(item);
      console.log(`Parsed data for key [${key}]:`, parsed);
      
      // 每次读取时都创建备份
      createBackup(key, parsed);
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      console.log(`Trying to restore from backup for key [${key}]...`);
      return restoreFromBackup(key, initialValue);
    }
  });

  const setValue = (value: T) => {
    try {
      console.log(`Saving to localStorage [${key}]:`, value);
      setStoredValue(value);
      
      // 保存到主存储
      const serializedValue = JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
      console.log(`Successfully saved to localStorage [${key}]`);
      
      // 创建备份
      createBackup(key, value);
      
      // 添加到定期保存队列
      pendingSaves.set(key, value);
      
      // 验证保存是否成功
      const verification = window.localStorage.getItem(key);
      if (verification !== serializedValue) {
        console.error(`Verification failed for key "${key}". Attempting recovery...`);
        // 尝试重新保存
        setTimeout(() => {
          try {
            window.localStorage.setItem(key, serializedValue);
            createBackup(key, value);
            console.log(`Recovery save attempted for key [${key}]`);
          } catch (recoveryError) {
            console.error(`Recovery save failed for key "${key}":`, recoveryError);
          }
        }, 100);
        
        // 再次尝试保存
        setTimeout(() => {
          try {
            window.localStorage.setItem(key, serializedValue);
            createBackup(key, value);
            console.log(`Second recovery save attempted for key [${key}]`);
          } catch (recoveryError) {
            console.error(`Second recovery save failed for key "${key}":`, recoveryError);
          }
        }, 1000);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      // 如果主存储失败，至少确保备份存在
      createBackup(key, value);
      // 添加到定期保存队列进行重试
      pendingSaves.set(key, value);
    }
  };

  return [storedValue, setValue];
}