// 强化的数据持久化系统
// 结合多种存储策略确保数据安全和性能

export interface DatabaseConfig {
  enableAutoSave: boolean;
  autoSaveInterval: number; // 毫秒
  enableBackgroundSync: boolean;
  maxRetries: number;
  batchSize: number;
}

export interface DataOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class RobustDatabase {
  private config: DatabaseConfig;
  private pendingOperations: Map<string, DataOperation> = new Map();
  private isProcessing = false;
  private autoSaveTimer: number | null = null;
  private db: IDBDatabase | null = null;
  private dbName = 'CameraRentalRobustDB';
  private version = 1;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      enableAutoSave: true,
      autoSaveInterval: 2000, // 2秒自动保存
      enableBackgroundSync: true,
      maxRetries: 5,
      batchSize: 50,
      ...config
    };
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ 强化数据库初始化失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ 强化数据库初始化成功');
        
        // 启动自动保存
        if (this.config.enableAutoSave) {
          this.startAutoSave();
        }
        
        // 启动后台同步
        if (this.config.enableBackgroundSync) {
          this.startBackgroundSync();
        }
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建主数据表
        if (!db.objectStoreNames.contains('cameras')) {
          const cameraStore = db.createObjectStore('cameras', { keyPath: 'id' });
          cameraStore.createIndex('model', 'model', { unique: false });
          cameraStore.createIndex('serialNumber', 'serialNumber', { unique: false });
          cameraStore.createIndex('model_serial', ['model', 'serialNumber'], { unique: true });
        }

        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('cameraModel', 'cameraModel', { unique: false });
          orderStore.createIndex('cameraSerialNumber', 'cameraSerialNumber', { unique: false });
          orderStore.createIndex('renterName', 'renterName', { unique: false });
          orderStore.createIndex('pickupDate', 'pickupDate', { unique: false });
          orderStore.createIndex('returnDate', 'returnDate', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('confirmations')) {
          const confirmationStore = db.createObjectStore('confirmations', { keyPath: 'id' });
          confirmationStore.createIndex('orderId', 'orderId', { unique: true });
          confirmationStore.createIndex('pickupConfirmed', 'pickupConfirmed', { unique: false });
          confirmationStore.createIndex('returnConfirmed', 'returnConfirmed', { unique: false });
        }

        // 创建操作日志表（用于数据恢复）
        if (!db.objectStoreNames.contains('operation_log')) {
          const logStore = db.createObjectStore('operation_log', { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('table', 'table', { unique: false });
          logStore.createIndex('type', 'type', { unique: false });
        }

        // 创建数据快照表（定期备份）
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
          snapshotStore.createIndex('type', 'type', { unique: false });
        }

        console.log('🔧 强化数据库结构创建完成');
      };
    });
  }

  // 强化的写入操作
  async performOperation(operation: Omit<DataOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: DataOperation = {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      retryCount: 0
    };

    // 添加到待处理队列
    this.pendingOperations.set(operationId, fullOperation);

    // 记录操作日志
    await this.logOperation(fullOperation);

    // 立即尝试执行
    await this.processOperation(fullOperation);
  }

  private async processOperation(operation: DataOperation): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    try {
      const transaction = this.db.transaction([operation.table, 'operation_log'], 'readwrite');
      const store = transaction.objectStore(operation.table);

      switch (operation.type) {
        case 'create':
        case 'update':
          await new Promise<void>((resolve, reject) => {
            const request = store.put(operation.data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          break;
        case 'delete':
          await new Promise<void>((resolve, reject) => {
            const request = store.delete(operation.data.id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          break;
      }

      // 操作成功，从待处理队列中移除
      this.pendingOperations.delete(operation.id);
      console.log(`✅ 操作成功执行: ${operation.type} ${operation.table} ${operation.data.id || 'unknown'}`);

    } catch (error) {
      console.error(`❌ 操作执行失败: ${operation.type} ${operation.table}`, error);
      
      // 增加重试次数
      operation.retryCount++;
      
      if (operation.retryCount < this.config.maxRetries) {
        console.log(`🔄 准备重试操作 (${operation.retryCount}/${this.config.maxRetries}): ${operation.id}`);
        // 延迟重试
        setTimeout(() => {
          this.processOperation(operation);
        }, Math.pow(2, operation.retryCount) * 1000); // 指数退避
      } else {
        console.error(`💥 操作最终失败，已达到最大重试次数: ${operation.id}`);
        // 可以考虑将失败的操作保存到特殊的错误日志中
      }
    }
  }

  private async logOperation(operation: DataOperation): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['operation_log'], 'readwrite');
      const store = transaction.objectStore('operation_log');
      
      const logEntry = {
        id: `log_${operation.id}`,
        operationId: operation.id,
        type: operation.type,
        table: operation.table,
        timestamp: operation.timestamp,
        dataSnapshot: JSON.stringify(operation.data)
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.add(logEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('记录操作日志失败:', error);
    }
  }

  // 自动保存机制
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = window.setInterval(() => {
      this.processPendingOperations();
    }, this.config.autoSaveInterval);

    console.log(`🔄 自动保存已启动，间隔: ${this.config.autoSaveInterval}ms`);
  }

  private async processPendingOperations(): Promise<void> {
    if (this.isProcessing || this.pendingOperations.size === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 处理待处理操作: ${this.pendingOperations.size} 个`);

    try {
      const operations = Array.from(this.pendingOperations.values());
      const batches = this.chunkArray(operations, this.config.batchSize);

      for (const batch of batches) {
        await Promise.all(batch.map(op => this.processOperation(op)));
        // 批次间短暂延迟，避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error('批量处理操作失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // 后台同步机制
  private startBackgroundSync(): void {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 页面重新可见，检查待处理操作');
        this.processPendingOperations();
      }
    });

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      console.log('🔄 页面即将卸载，强制保存待处理操作');
      // 同步执行剩余操作
      this.forceSyncPendingOperations();
    });

    // 定期创建数据快照
    setInterval(() => {
      this.createDataSnapshot();
    }, 5 * 60 * 1000); // 每5分钟创建一次快照
  }

  private forceSyncPendingOperations(): void {
    // 使用 sendBeacon 或同步 XMLHttpRequest 确保数据保存
    if (this.pendingOperations.size > 0) {
      const operations = Array.from(this.pendingOperations.values());
      const data = JSON.stringify(operations);
      
      // 保存到 localStorage 作为最后的备份
      try {
        localStorage.setItem('emergency_operations_backup', data);
        console.log('💾 紧急备份已保存到 localStorage');
      } catch (error) {
        console.error('紧急备份失败:', error);
      }
    }
  }

  private async createDataSnapshot(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('📸 创建数据快照...');
      const transaction = this.db.transaction(['cameras', 'orders', 'confirmations', 'snapshots'], 'readwrite');
      
      // 读取所有数据
      const cameras = await this.getAllFromStore(transaction.objectStore('cameras'));
      const orders = await this.getAllFromStore(transaction.objectStore('orders'));
      const confirmations = await this.getAllFromStore(transaction.objectStore('confirmations'));

      // 创建快照
      const snapshot = {
        id: `snapshot_${Date.now()}`,
        timestamp: Date.now(),
        type: 'auto',
        data: {
          cameras,
          orders,
          confirmations
        },
        size: JSON.stringify({ cameras, orders, confirmations }).length
      };

      const snapshotStore = transaction.objectStore('snapshots');
      await new Promise<void>((resolve, reject) => {
        const request = snapshotStore.add(snapshot);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // 清理旧快照（保留最近10个）
      await this.cleanupOldSnapshots();

      console.log(`✅ 数据快照创建成功: ${snapshot.id}, 大小: ${(snapshot.size / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error('创建数据快照失败:', error);
    }
  }

  private async getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupOldSnapshots(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');
      const index = store.index('timestamp');
      
      const snapshots = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // 按时间戳排序，保留最新的10个
      snapshots.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = snapshots.slice(10);

      for (const snapshot of toDelete) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(snapshot.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      if (toDelete.length > 0) {
        console.log(`🗑️ 清理了 ${toDelete.length} 个旧快照`);
      }
    } catch (error) {
      console.error('清理旧快照失败:', error);
    }
  }

  // 数据恢复功能
  async recoverFromSnapshot(snapshotId?: string): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    try {
      const transaction = this.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      
      let snapshot;
      if (snapshotId) {
        snapshot = await new Promise((resolve, reject) => {
          const request = store.get(snapshotId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } else {
        // 获取最新快照
        const index = store.index('timestamp');
        snapshot = await new Promise((resolve, reject) => {
          const request = index.openCursor(null, 'prev');
          request.onsuccess = () => {
            const cursor = request.result;
            resolve(cursor ? cursor.value : null);
          };
          request.onerror = () => reject(request.error);
        });
      }

      if (!snapshot) {
        throw new Error('未找到可用的数据快照');
      }

      console.log(`🔄 从快照恢复数据: ${snapshot.id}`);
      
      // 恢复数据
      const writeTransaction = this.db.transaction(['cameras', 'orders', 'confirmations'], 'readwrite');
      
      // 清空现有数据
      await Promise.all([
        this.clearStore(writeTransaction.objectStore('cameras')),
        this.clearStore(writeTransaction.objectStore('orders')),
        this.clearStore(writeTransaction.objectStore('confirmations'))
      ]);

      // 恢复快照数据
      const { cameras, orders, confirmations } = snapshot.data;
      
      await Promise.all([
        this.restoreToStore(writeTransaction.objectStore('cameras'), cameras),
        this.restoreToStore(writeTransaction.objectStore('orders'), orders),
        this.restoreToStore(writeTransaction.objectStore('confirmations'), confirmations)
      ]);

      console.log('✅ 数据恢复完成');
    } catch (error) {
      console.error('数据恢复失败:', error);
      throw error;
    }
  }

  private async clearStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async restoreToStore(store: IDBObjectStore, data: any[]): Promise<void> {
    for (const item of data) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // 工具方法
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 获取系统状态
  async getSystemStatus(): Promise<{
    pendingOperations: number;
    lastSnapshot: string | null;
    dbSize: string;
    isHealthy: boolean;
  }> {
    const pendingOperations = this.pendingOperations.size;
    
    let lastSnapshot = null;
    let dbSize = '未知';
    let isHealthy = true;

    try {
      if (this.db) {
        // 获取最新快照信息
        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const store = transaction.objectStore('snapshots');
        const index = store.index('timestamp');
        
        const latestSnapshot = await new Promise<any>((resolve, reject) => {
          const request = index.openCursor(null, 'prev');
          request.onsuccess = () => {
            const cursor = request.result;
            resolve(cursor ? cursor.value : null);
          };
          request.onerror = () => reject(request.error);
        });

        if (latestSnapshot) {
          lastSnapshot = new Date(latestSnapshot.timestamp).toLocaleString();
          dbSize = `${(latestSnapshot.size / 1024).toFixed(2)} KB`;
        }
      }

      // 健康检查
      isHealthy = pendingOperations < 100; // 如果待处理操作过多，认为不健康

    } catch (error) {
      console.error('获取系统状态失败:', error);
      isHealthy = false;
    }

    return {
      pendingOperations,
      lastSnapshot,
      dbSize,
      isHealthy
    };
  }

  // 清理资源
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // 强制保存剩余操作
    this.forceSyncPendingOperations();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('🔄 强化数据库已清理');
  }
}

export const robustDB = new RobustDatabase({
  enableAutoSave: true,
  autoSaveInterval: 1000, // 1秒自动保存
  enableBackgroundSync: true,
  maxRetries: 3,
  batchSize: 20
});