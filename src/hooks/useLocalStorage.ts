import { useState, useEffect } from 'react';
import { generateChecksum, verifyDataIntegrity } from '../utils/dataUtils';

// 增加备份层级，提供更强的数据保护
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

// 三级备份键名（最高级别保护）
const TERTIARY_BACKUP_KEYS = {
  'confirmedPickups': 'confirmedPickups_backup3',
  'confirmedReturns': 'confirmedReturns_backup3',
  'cameras': 'cameras_backup3',
  'orders': 'orders_backup3',
  'showOrderModal': 'showOrderModal_backup3',
  'activeTab': 'activeTab_backup3'
};

// 时间戳备份键名（基于时间的备份）
const createTimestampBackupKey = (key: string) => `${key}_backup_${Date.now()}`;

// 清理旧的时间戳备份（保留最近的5个）
const cleanupTimestampBackups = (key: string) => {
  try {
    const allKeys = Object.keys(localStorage);
    const timestampBackups = allKeys
      .filter(k => k.startsWith(`${key}_backup_`) && k !== `${key}_backup` && k !== `${key}_backup2` && k !== `${key}_backup3`)
      .sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampB - timestampA; // 降序，最新的在前
      });
    
    // 保留最近的5个，删除其余的
    if (timestampBackups.length > 5) {
      const toDelete = timestampBackups.slice(5);
      toDelete.forEach(backupKey => {
        try {
          localStorage.removeItem(backupKey);
          console.log(`Cleaned up old backup: ${backupKey}`);
        } catch (error) {
          console.warn(`Failed to cleanup backup ${backupKey}:`, error);
        }
      });
    }
  } catch (error) {
    console.warn(`Failed to cleanup timestamp backups for ${key}:`, error);
  }
};

// 创建备份
function createBackup<T>(key: string, value: T): void {
  try {
    const timestamp = Date.now();
    const backupKey = BACKUP_KEYS[key as keyof typeof BACKUP_KEYS];
    const secondaryBackupKey = SECONDARY_BACKUP_KEYS[key as keyof typeof SECONDARY_BACKUP_KEYS];
    const tertiaryBackupKey = TERTIARY_BACKUP_KEYS[key as keyof typeof TERTIARY_BACKUP_KEYS];
    
    if (backupKey) {
      const backupData = {
        data: value,
        timestamp,
        version: '1.0',
        checksum: generateChecksum(value),
        originalKey: key,
        backupLevel: 'primary'
      };
      
      // 主备份
      window.localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`Backup created for key [${key}] -> [${backupKey}]`);
      
      // 二级备份
      if (secondaryBackupKey) {
        const secondaryBackupData = { ...backupData, backupLevel: 'secondary' };
        window.localStorage.setItem(secondaryBackupKey, JSON.stringify(secondaryBackupData));
        console.log(`Secondary backup created for key [${key}] -> [${secondaryBackupKey}]`);
      }
      
      // 三级备份
      if (tertiaryBackupKey) {
        const tertiaryBackupData = { ...backupData, backupLevel: 'tertiary' };
        window.localStorage.setItem(tertiaryBackupKey, JSON.stringify(tertiaryBackupData));
        console.log(`Tertiary backup created for key [${key}] -> [${tertiaryBackupKey}]`);
      }
      
      // 时间戳备份（每小时创建一次）
      const lastTimestampBackup = localStorage.getItem(`${key}_last_timestamp_backup`);
      const lastTimestamp = lastTimestampBackup ? parseInt(lastTimestampBackup) : 0;
      const oneHour = 60 * 60 * 1000;
      
      if (timestamp - lastTimestamp > oneHour) {
        const timestampBackupKey = createTimestampBackupKey(key);
        const timestampBackupData = { ...backupData, backupLevel: 'timestamp' };
        window.localStorage.setItem(timestampBackupKey, JSON.stringify(timestampBackupData));
        window.localStorage.setItem(`${key}_last_timestamp_backup`, timestamp.toString());
        console.log(`Timestamp backup created for key [${key}] -> [${timestampBackupKey}]`);
        
        // 清理旧的时间戳备份
        cleanupTimestampBackups(key);
      }
    }
  } catch (error) {
    console.error(`Failed to create backup for key "${key}":`, error);
    // 即使备份失败，也要尝试创建紧急备份
    try {
      const emergencyKey = `${key}_emergency_${Date.now()}`;
      window.localStorage.setItem(emergencyKey, JSON.stringify(value));
      console.log(`Emergency backup created: ${emergencyKey}`);
    } catch (emergencyError) {
      console.error(`Emergency backup also failed for key "${key}":`, emergencyError);
    }
  }
}

// 从备份恢复
function restoreFromBackup<T>(key: string, initialValue: T): T {
  try {
    // 尝试从主备份恢复
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
      
      // 尝试从三级备份恢复
      const tertiaryBackupKey = TERTIARY_BACKUP_KEYS[key as keyof typeof TERTIARY_BACKUP_KEYS];
      if (tertiaryBackupKey) {
        const tertiaryBackupItem = window.localStorage.getItem(tertiaryBackupKey);
        if (tertiaryBackupItem) {
          const tertiaryBackupData = JSON.parse(tertiaryBackupItem);
          if (tertiaryBackupData.data !== undefined &&
              (!tertiaryBackupData.checksum || verifyDataIntegrity(tertiaryBackupData.data, tertiaryBackupData.checksum))) {
            console.log(`Restored from tertiary backup for key [${key}]:`, tertiaryBackupData.data);
            return tertiaryBackupData.data;
          }
        }
      }
      
      // 尝试从时间戳备份恢复（选择最新的）
      const allKeys = Object.keys(localStorage);
      const timestampBackups = allKeys
        .filter(k => k.startsWith(`${key}_backup_`) && k !== `${key}_backup` && k !== `${key}_backup2` && k !== `${key}_backup3`)
        .sort((a, b) => {
          const timestampA = parseInt(a.split('_').pop() || '0');
          const timestampB = parseInt(b.split('_').pop() || '0');
          return timestampB - timestampA; // 最新的在前
        });
      
      for (const timestampBackupKey of timestampBackups) {
        try {
          const timestampBackupItem = window.localStorage.getItem(timestampBackupKey);
          if (timestampBackupItem) {
            const timestampBackupData = JSON.parse(timestampBackupItem);
            if (timestampBackupData.data !== undefined &&
                (!timestampBackupData.checksum || verifyDataIntegrity(timestampBackupData.data, timestampBackupData.checksum))) {
              console.log(`Restored from timestamp backup for key [${key}]:`, timestampBackupData.data);
              return timestampBackupData.data;
            }
          }
        } catch (error) {
          console.warn(`Failed to restore from timestamp backup ${timestampBackupKey}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to restore from backup for key "${key}":`, error);
  }
  return initialValue;
}

// 定期保存机制 - 缩短间隔以提高数据安全性
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
          // 尝试紧急保存
          try {
            const emergencyKey = `${key}_emergency_save_${Date.now()}`;
            window.localStorage.setItem(emergencyKey, JSON.stringify(value));
            console.log(`Emergency save created: ${emergencyKey}`);
          } catch (emergencyError) {
            console.error(`Emergency save also failed for key "${key}":`, emergencyError);
          }
        }
      }
      pendingSaves.clear();
    }
  }, 2000); // 每2秒保存一次，提高数据安全性
}

function stopPeriodicSave() {
  if (periodicSaveInterval) {
    clearInterval(periodicSaveInterval);
    periodicSaveInterval = null;
  }
}

// 页面卸载前的紧急保存
let emergencySaveSetup = false;

function setupEmergencySave() {
  if (emergencySaveSetup) return;
  emergencySaveSetup = true;
  
  const emergencySave = () => {
    console.log('Emergency save triggered');
    for (const [key, value] of pendingSaves.entries()) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        createBackup(key, value);
        console.log(`Emergency save completed for key [${key}]`);
      } catch (error) {
        console.error(`Emergency save failed for key "${key}":`, error);
      }
    }
  };
  
  // 监听页面卸载事件
  window.addEventListener('beforeunload', emergencySave);
  window.addEventListener('pagehide', emergencySave);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      emergencySave();
    }
  });
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // 启动定期保存
  useEffect(() => {
    startPeriodicSave();
    setupEmergencySave();
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
      
      // 立即验证保存是否成功
      // 验证保存是否成功
      const verification = window.localStorage.getItem(key);
      const normalizedSerializedValue = serializedValue === undefined ? 'undefined' : serializedValue;
      if (verification !== normalizedSerializedValue) {
        console.error(`Verification failed for key "${key}". Attempting recovery...`);
        
        // 多次重试保存
        let retryCount = 0;
        const maxRetries = 5;
        
        const retrySave = () => {
          if (retryCount >= maxRetries) {
            console.error(`Max retries reached for key "${key}". Creating emergency backup.`);
            try {
              const emergencyKey = `${key}_emergency_failed_save_${Date.now()}`;
              window.localStorage.setItem(emergencyKey, normalizedSerializedValue);
              console.log(`Emergency backup created: ${emergencyKey}`);
            } catch (emergencyError) {
              console.error(`Emergency backup also failed for key "${key}":`, emergencyError);
            }
            return;
          }
          
          retryCount++;
          console.log(`Retry ${retryCount}/${maxRetries} for key "${key}"`);
          
          try {
            window.localStorage.setItem(key, normalizedSerializedValue);
            createBackup(key, value);
            
            // 验证重试是否成功
            const retryVerification = window.localStorage.getItem(key);
            if (retryVerification === normalizedSerializedValue) {
              console.log(`Retry ${retryCount} successful for key [${key}]`);
            } else {
              setTimeout(retrySave, 100 * retryCount); // 递增延迟
            }
          } catch (retryError) {
            console.error(`Retry ${retryCount} failed for key "${key}":`, retryError);
            setTimeout(retrySave, 100 * retryCount);
          }
        };
        
        setTimeout(() => {
          retrySave();
        }, 100);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      // 如果主存储失败，至少确保备份存在
      createBackup(key, value);
      // 添加到定期保存队列进行重试
      pendingSaves.set(key, value);
      
      // 创建紧急备份
      try {
        const emergencyKey = `${key}_emergency_main_save_failed_${Date.now()}`;
        window.localStorage.setItem(emergencyKey, JSON.stringify(value));
        console.log(`Emergency backup created due to main save failure: ${emergencyKey}`);
      } catch (emergencyError) {
        console.error(`Emergency backup also failed for key "${key}":`, emergencyError);
      }
    }
  };

  return [storedValue, setValue];
}