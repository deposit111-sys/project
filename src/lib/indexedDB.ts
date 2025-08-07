// IndexedDB 本地数据库管理
export interface DBSchema {
  cameras: {
    key: string;
    value: {
      id: string;
      model: string;
      serialNumber: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  orders: {
    key: string;
    value: {
      id: string;
      cameraModel: string;
      cameraSerialNumber: string;
      renterName: string;
      customerService: string;
      salesperson: string;
      pickupDate: string;
      pickupTime: 'morning' | 'afternoon' | 'evening';
      returnDate: string;
      returnTime: 'morning' | 'afternoon' | 'evening';
      depositStatus: string;
      notes: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  confirmations: {
    key: string;
    value: {
      id: string;
      orderId: string;
      pickupConfirmed: boolean;
      returnConfirmed: boolean;
      pickupConfirmedAt?: string;
      returnConfirmedAt?: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

class LocalDatabase {
  private dbName = 'CameraRentalDB';
  private version = 21;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB 本地数据库连接成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建相机表
        if (!db.objectStoreNames.contains('cameras')) {
          const cameraStore = db.createObjectStore('cameras', { keyPath: 'id' });
          cameraStore.createIndex('model', 'model', { unique: false });
          cameraStore.createIndex('serialNumber', 'serialNumber', { unique: false });
          cameraStore.createIndex('model_serial', ['model', 'serialNumber'], { unique: true });
          console.log('📦 创建相机数据表');
        }

        // 创建订单表
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('cameraModel', 'cameraModel', { unique: false });
          orderStore.createIndex('cameraSerialNumber', 'cameraSerialNumber', { unique: false });
          orderStore.createIndex('renterName', 'renterName', { unique: false });
          orderStore.createIndex('pickupDate', 'pickupDate', { unique: false });
          orderStore.createIndex('returnDate', 'returnDate', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('📦 创建订单数据表');
        }

        // 创建确认状态表
        if (!db.objectStoreNames.contains('confirmations')) {
          const confirmationStore = db.createObjectStore('confirmations', { keyPath: 'id' });
          confirmationStore.createIndex('orderId', 'orderId', { unique: true });
          confirmationStore.createIndex('pickupConfirmed', 'pickupConfirmed', { unique: false });
          confirmationStore.createIndex('returnConfirmed', 'returnConfirmed', { unique: false });
          console.log('📦 创建确认状态数据表');
        }

        console.log('🔧 IndexedDB 数据库结构初始化完成');
      };
    });
  }

  private async ensureConnection(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('无法连接到本地数据库');
    }
    return this.db;
  }

  // 通用的数据库操作方法
  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.ensureConnection();
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = operation(store);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // 相机操作
  async addCamera(camera: Omit<DBSchema['cameras']['value'], 'id' | 'createdAt' | 'updatedAt'>): Promise<DBSchema['cameras']['value']> {
    const now = new Date().toISOString();
    const newCamera: DBSchema['cameras']['value'] = {
      ...camera,
      id: `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };

    await this.performTransaction('cameras', 'readwrite', (store) => 
      store.add(newCamera)
    );

    console.log('✅ 相机已保存到本地数据库:', newCamera.id);
    return newCamera;
  }

  async getAllCameras(): Promise<DBSchema['cameras']['value'][]> {
    const cameras = await this.performTransaction('cameras', 'readonly', (store) => 
      store.getAll()
    );
    console.log(`📖 从本地数据库读取 ${cameras.length} 台相机`);
    return cameras;
  }

  async deleteCamera(id: string): Promise<void> {
    await this.performTransaction('cameras', 'readwrite', (store) => 
      store.delete(id)
    );
    console.log('🗑️ 相机已从本地数据库删除:', id);
  }

  // 订单操作
  async addOrder(order: Omit<DBSchema['orders']['value'], 'id' | 'createdAt' | 'updatedAt'>): Promise<DBSchema['orders']['value']> {
    const now = new Date().toISOString();
    const newOrder: DBSchema['orders']['value'] = {
      ...order,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };

    await this.performTransaction('orders', 'readwrite', (store) => 
      store.add(newOrder)
    );

    console.log('✅ 订单已保存到本地数据库:', newOrder.id);
    return newOrder;
  }

  async getAllOrders(): Promise<DBSchema['orders']['value'][]> {
    const orders = await this.performTransaction('orders', 'readonly', (store) => 
      store.getAll()
    );
    console.log(`📖 从本地数据库读取 ${orders.length} 个订单`);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateOrder(id: string, updates: Partial<DBSchema['orders']['value']>): Promise<DBSchema['orders']['value']> {
    const existing = await this.performTransaction('orders', 'readonly', (store) => 
      store.get(id)
    );

    if (!existing) {
      throw new Error('订单不存在');
    }

    const updatedOrder: DBSchema['orders']['value'] = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    await this.performTransaction('orders', 'readwrite', (store) => 
      store.put(updatedOrder)
    );

    console.log('✅ 订单已在本地数据库更新:', id);
    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<void> {
    await this.performTransaction('orders', 'readwrite', (store) => 
      store.delete(id)
    );
    
    // 同时删除相关的确认状态
    await this.deleteConfirmationByOrderId(id);
    
    console.log('🗑️ 订单已从本地数据库删除:', id);
  }

  // 确认状态操作
  async setConfirmation(orderId: string, type: 'pickup' | 'return', confirmed: boolean): Promise<void> {
    const now = new Date().toISOString();
    
    // 先尝试获取现有记录
    let existing: DBSchema['confirmations']['value'] | undefined;
    try {
      const index = await this.performTransaction('confirmations', 'readonly', (store) => 
        store.index('orderId').get(orderId)
      );
      existing = index;
    } catch (error) {
      // 记录不存在，将创建新记录
    }

    const confirmation: DBSchema['confirmations']['value'] = existing ? {
      ...existing,
      [type === 'pickup' ? 'pickupConfirmed' : 'returnConfirmed']: confirmed,
      [type === 'pickup' ? 'pickupConfirmedAt' : 'returnConfirmedAt']: confirmed ? now : undefined,
      updatedAt: now
    } : {
      id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      pickupConfirmed: type === 'pickup' ? confirmed : false,
      returnConfirmed: type === 'return' ? confirmed : false,
      pickupConfirmedAt: type === 'pickup' && confirmed ? now : undefined,
      returnConfirmedAt: type === 'return' && confirmed ? now : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    await this.performTransaction('confirmations', 'readwrite', (store) => 
      store.put(confirmation)
    );

    console.log(`✅ ${type === 'pickup' ? '取机' : '还机'}确认状态已保存到本地数据库:`, orderId, confirmed);
  }

  async getAllConfirmations(): Promise<{
    confirmedPickups: string[];
    confirmedReturns: string[];
  }> {
    const confirmations = await this.performTransaction('confirmations', 'readonly', (store) => 
      store.getAll()
    );

    const confirmedPickups = confirmations
      .filter(c => c.pickupConfirmed)
      .map(c => c.orderId);

    const confirmedReturns = confirmations
      .filter(c => c.returnConfirmed)
      .map(c => c.orderId);

    console.log(`📖 从本地数据库读取确认状态: ${confirmedPickups.length} 个取机确认, ${confirmedReturns.length} 个还机确认`);
    
    return { confirmedPickups, confirmedReturns };
  }

  private async deleteConfirmationByOrderId(orderId: string): Promise<void> {
    try {
      const existing = await this.performTransaction('confirmations', 'readonly', (store) => 
        store.index('orderId').get(orderId)
      );
      
      if (existing) {
        await this.performTransaction('confirmations', 'readwrite', (store) => 
          store.delete(existing.id)
        );
        console.log('🗑️ 确认状态已从本地数据库删除:', orderId);
      }
    } catch (error) {
      // 确认状态不存在，忽略错误
    }
  }

  // 数据库统计
  async getStats(): Promise<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  }> {
    const [cameras, orders, confirmations] = await Promise.all([
      this.getAllCameras(),
      this.getAllOrders(),
      this.performTransaction('confirmations', 'readonly', (store) => store.getAll())
    ]);

    // 估算数据库大小
    const dataSize = JSON.stringify({ cameras, orders, confirmations }).length;
    const dbSize = `${(dataSize / 1024).toFixed(2)} KB`;

    return {
      cameras: cameras.length,
      orders: orders.length,
      confirmations: confirmations.length,
      dbSize
    };
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    const db = await this.ensureConnection();
    const transaction = db.transaction(['cameras', 'orders', 'confirmations'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('cameras').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('orders').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('confirmations').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);

    console.log('🗑️ 本地数据库已清空');
  }

  // 导出数据
  async exportData(): Promise<{
    cameras: DBSchema['cameras']['value'][];
    orders: DBSchema['orders']['value'][];
    confirmations: DBSchema['confirmations']['value'][];
    exportDate: string;
    version: string;
  }> {
    const [cameras, orders, confirmations] = await Promise.all([
      this.getAllCameras(),
      this.getAllOrders(),
      this.performTransaction('confirmations', 'readonly', (store) => store.getAll())
    ]);

    return {
      cameras,
      orders,
      confirmations,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  // 导入数据
  async importData(data: {
    cameras: DBSchema['cameras']['value'][];
    orders: DBSchema['orders']['value'][];
    confirmations?: DBSchema['confirmations']['value'][];
  }): Promise<void> {
    // 先清空现有数据
    await this.clearAllData();

    const db = await this.ensureConnection();
    const transaction = db.transaction(['cameras', 'orders', 'confirmations'], 'readwrite');

    // 导入相机数据
    const cameraStore = transaction.objectStore('cameras');
    for (const camera of data.cameras) {
      cameraStore.add(camera);
    }

    // 导入订单数据
    const orderStore = transaction.objectStore('orders');
    for (const order of data.orders) {
      orderStore.add(order);
    }

    // 导入确认状态数据
    if (data.confirmations) {
      const confirmationStore = transaction.objectStore('confirmations');
      for (const confirmation of data.confirmations) {
        confirmationStore.add(confirmation);
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ 数据导入到本地数据库完成');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// 创建单例实例
export const localDB = new LocalDatabase();

// 初始化数据库
export const initializeLocalDB = async (): Promise<void> => {
  try {
    await localDB.init();
    console.log('🚀 本地数据库初始化成功');
  } catch (error) {
    console.error('❌ 本地数据库初始化失败:', error);
    throw error;
  }
};