import { useState, useEffect } from 'react';

// 备份键名映射
const BACKUP_KEYS = {
  'confirmedPickups': 'confirmedPickups_backup',
  'confirmedReturns': 'confirmedReturns_backup',
  'cameras': 'cameras_backup',
  'orders': 'orders_backup'
};

// 创建备份
function createBackup<T>(key: string, value: T): void {
  try {
    const backupKey = BACKUP_KEYS[key as keyof typeof BACKUP_KEYS];
    if (backupKey) {
      const backupData = {
        data: value,
        timestamp: Date.now(),
        version: '1.0'
      };
      window.localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`Backup created for key [${key}] -> [${backupKey}]`);
    }
  } catch (error) {
    console.error(`Failed to create backup for key "${key}":`, error);
  }
}

// 从备份恢复
function restoreFromBackup<T>(key: string, initialValue: T): T {
  try {
    const backupKey = BACKUP_KEYS[key as keyof typeof BACKUP_KEYS];
    if (backupKey) {
      const backupItem = window.localStorage.getItem(backupKey);
      if (backupItem) {
        const backupData = JSON.parse(backupItem);
        if (backupData.data !== undefined) {
          console.log(`Restored from backup for key [${key}]:`, backupData.data);
          return backupData.data;
        }
      }
    }
  } catch (error) {
    console.error(`Failed to restore from backup for key "${key}":`, error);
  }
  return initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
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
      
      // 验证保存是否成功
      const verification = window.localStorage.getItem(key);
      if (verification !== serializedValue) {
        console.error(`Verification failed for key "${key}". Attempting recovery...`);
        // 尝试重新保存
        setTimeout(() => {
          try {
            window.localStorage.setItem(key, serializedValue);
            console.log(`Recovery save attempted for key [${key}]`);
          } catch (recoveryError) {
            console.error(`Recovery save failed for key "${key}":`, recoveryError);
          }
        }, 100);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      // 如果主存储失败，至少确保备份存在
      createBackup(key, value);
    }
  };

  return [storedValue, setValue];
}