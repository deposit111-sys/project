// Electron SQLite 数据库管理类
// 专门为 Electron 桌面应用设计的 SQLite 数据库

import { Camera, RentalOrder } from '../types';

// 检查是否在 Electron 环境中
const isElectron = () => {
  return typeof window !== 'undefined' && window.process && window.process.type;
};

export interface SQLiteCamera {
  id: string;
  model: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export interface SQLiteOrder {
  id: string;
  camera_model: string;
  camera_serial_number: string;
  renter_name: string;
  customer_service: string;
  salesperson: string;
  pickup_date: string;
  pickup_time: 'morning' | 'afternoon' | 'evening';
  return_date: string;
  return_time: 'morning' | 'afternoon' | 'evening';
  deposit_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SQLiteConfirmation {
  id: string;
  order_id: string;
  pickup_confirmed: boolean;
  return_confirmed: boolean;
  pickup_confirmed_at?: string;
  return_confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

class ElectronSQLiteDatabase {
  private db: any = null;
  private dbPath: string = '';
  private isInitialized = false;

  async init(): Promise<void> {
    try {
      console.log('🔄 开始初始化 Electron SQLite 数据库...');
      
      if (!isElectron()) {
        throw new Error('此数据库仅支持 Electron 环境');
      }

      // 动态导入 better-sqlite3（仅在 Electron 环境中）
      const Database = (await import('better-sqlite3')).default;
      const { app } = await import('electron');
      const path = await import('path');
      
      // 获取用户数据目录
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'camera_rental.db');
      
      console.log('📁 数据库文件路径:', this.dbPath);
      
      // 创建数据库连接
      this.db = new Database(this.dbPath);
      
      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      
      // 创建表结构
      await this.createTables();
      
      this.isInitialized = true;
      console.log('✅ Electron SQLite 数据库初始化成功');
    } catch (error) {
      console.error('❌ Electron SQLite 数据库初始化失败:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    console.log('📦 创建数据库表结构...');

    try {
      // 创建相机表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cameras (
          id TEXT PRIMARY KEY,
          model TEXT NOT NULL,
          serial_number TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(model, serial_number)
        )
      `);

      // 创建订单表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          camera_model TEXT NOT NULL,
          camera_serial_number TEXT NOT NULL,
          renter_name TEXT NOT NULL,
          customer_service TEXT,
          salesperson TEXT NOT NULL,
          pickup_date TEXT NOT NULL,
          pickup_time TEXT CHECK (pickup_time IN ('morning', 'afternoon', 'evening')),
          return_date TEXT NOT NULL,
          return_time TEXT CHECK (return_time IN ('morning', 'afternoon', 'evening')),
          deposit_status TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建确认状态表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS confirmations (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL UNIQUE,
          pickup_confirmed INTEGER DEFAULT 0,
          return_confirmed INTEGER DEFAULT 0,
          pickup_confirmed_at TEXT,
          return_confirmed_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
      `);

      // 创建索引
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_cameras_model ON cameras(model)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_cameras_serial ON cameras(serial_number)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_camera ON orders(camera_model, camera_serial_number)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_dates ON orders(pickup_date, return_date)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_renter ON orders(renter_name)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_confirmations_order ON confirmations(order_id)`);

      console.log('✅ 数据库表结构创建完成');
    } catch (error) {
      console.error('❌ 创建数据库表失败:', error);
      throw error;
    }
  }

  // 相机操作
  async addCamera(camera: Omit<SQLiteCamera, 'id' | 'created_at' | 'updated_at'>): Promise<SQLiteCamera> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    const now = new Date().toISOString();
    const newCamera: SQLiteCamera = {
      ...camera,
      id: `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO cameras (id, model, serial_number, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(newCamera.id, newCamera.model, newCamera.serial_number, newCamera.created_at, newCamera.updated_at);

      console.log('✅ 相机已添加到 SQLite 数据库:', newCamera.id);
      return newCamera;
    } catch (error) {
      console.error('❌ 添加相机失败:', error);
      throw error;
    }
  }

  async getAllCameras(): Promise<SQLiteCamera[]> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const stmt = this.db.prepare('SELECT * FROM cameras ORDER BY model, serial_number');
      const cameras = stmt.all() as SQLiteCamera[];
      
      console.log(`📖 从 SQLite 数据库读取 ${cameras.length} 台相机`);
      return cameras;
    } catch (error) {
      console.error('❌ 读取相机失败:', error);
      return [];
    }
  }

  async deleteCamera(id: string): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const stmt = this.db.prepare('DELETE FROM cameras WHERE id = ?');
      stmt.run(id);
      console.log('🗑️ 相机已从 SQLite 数据库删除:', id);
    } catch (error) {
      console.error('❌ 删除相机失败:', error);
      throw error;
    }
  }

  // 订单操作
  async addOrder(order: Omit<SQLiteOrder, 'id' | 'created_at' | 'updated_at'>): Promise<SQLiteOrder> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    const now = new Date().toISOString();
    const newOrder: SQLiteOrder = {
      ...order,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: now,
      updated_at: now
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO orders (
          id, camera_model, camera_serial_number, renter_name, customer_service, 
          salesperson, pickup_date, pickup_time, return_date, return_time, 
          deposit_status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        newOrder.id, newOrder.camera_model, newOrder.camera_serial_number,
        newOrder.renter_name, newOrder.customer_service, newOrder.salesperson,
        newOrder.pickup_date, newOrder.pickup_time, newOrder.return_date,
        newOrder.return_time, newOrder.deposit_status, newOrder.notes,
        newOrder.created_at, newOrder.updated_at
      );

      console.log('✅ 订单已添加到 SQLite 数据库:', newOrder.id);
      return newOrder;
    } catch (error) {
      console.error('❌ 添加订单失败:', error);
      throw error;
    }
  }

  async getAllOrders(): Promise<SQLiteOrder[]> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const stmt = this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
      const orders = stmt.all() as SQLiteOrder[];
      
      console.log(`📖 从 SQLite 数据库读取 ${orders.length} 个订单`);
      return orders;
    } catch (error) {
      console.error('❌ 读取订单失败:', error);
      return [];
    }
  }

  async updateOrder(id: string, updates: Partial<SQLiteOrder>): Promise<SQLiteOrder> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      // 先获取现有订单
      const stmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
      const existing = stmt.get(id) as SQLiteOrder;
      
      if (!existing) {
        throw new Error('订单不存在');
      }

      const updatedOrder: SQLiteOrder = {
        ...existing,
        ...updates,
        id,
        updated_at: new Date().toISOString()
      };

      const updateStmt = this.db.prepare(`
        UPDATE orders SET 
          camera_model = ?, camera_serial_number = ?, renter_name = ?, 
          customer_service = ?, salesperson = ?, pickup_date = ?, pickup_time = ?, 
          return_date = ?, return_time = ?, deposit_status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `);
      
      updateStmt.run(
        updatedOrder.camera_model, updatedOrder.camera_serial_number, updatedOrder.renter_name,
        updatedOrder.customer_service, updatedOrder.salesperson, updatedOrder.pickup_date,
        updatedOrder.pickup_time, updatedOrder.return_date, updatedOrder.return_time,
        updatedOrder.deposit_status, updatedOrder.notes, updatedOrder.updated_at, id
      );

      console.log('✅ 订单已在 SQLite 数据库更新:', id);
      return updatedOrder;
    } catch (error) {
      console.error('❌ 更新订单失败:', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const stmt = this.db.prepare('DELETE FROM orders WHERE id = ?');
      stmt.run(id);
      
      // 删除相关确认状态（外键约束会自动处理）
      console.log('🗑️ 订单已从 SQLite 数据库删除:', id);
    } catch (error) {
      console.error('❌ 删除订单失败:', error);
      throw error;
    }
  }

  // 确认状态操作
  async setConfirmation(orderId: string, type: 'pickup' | 'return', confirmed: boolean): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    const now = new Date().toISOString();

    try {
      // 先尝试获取现有记录
      const stmt = this.db.prepare('SELECT * FROM confirmations WHERE order_id = ?');
      const existing = stmt.get(orderId) as SQLiteConfirmation | undefined;

      if (existing) {
        // 更新现有记录
        const updateData = {
          pickup_confirmed: type === 'pickup' ? (confirmed ? 1 : 0) : existing.pickup_confirmed,
          return_confirmed: type === 'return' ? (confirmed ? 1 : 0) : existing.return_confirmed,
          pickup_confirmed_at: type === 'pickup' && confirmed ? now : existing.pickup_confirmed_at,
          return_confirmed_at: type === 'return' && confirmed ? now : existing.return_confirmed_at,
          updated_at: now
        };

        const updateStmt = this.db.prepare(`
          UPDATE confirmations SET 
            pickup_confirmed = ?, return_confirmed = ?, 
            pickup_confirmed_at = ?, return_confirmed_at = ?, updated_at = ?
          WHERE order_id = ?
        `);
        
        updateStmt.run(
          updateData.pickup_confirmed, updateData.return_confirmed,
          updateData.pickup_confirmed_at, updateData.return_confirmed_at,
          updateData.updated_at, orderId
        );
      } else {
        // 创建新记录
        const newConfirmation: SQLiteConfirmation = {
          id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          order_id: orderId,
          pickup_confirmed: type === 'pickup' ? confirmed : false,
          return_confirmed: type === 'return' ? confirmed : false,
          pickup_confirmed_at: type === 'pickup' && confirmed ? now : undefined,
          return_confirmed_at: type === 'return' && confirmed ? now : undefined,
          created_at: now,
          updated_at: now
        };

        const insertStmt = this.db.prepare(`
          INSERT INTO confirmations (
            id, order_id, pickup_confirmed, return_confirmed, 
            pickup_confirmed_at, return_confirmed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
          newConfirmation.id, newConfirmation.order_id,
          newConfirmation.pickup_confirmed ? 1 : 0, newConfirmation.return_confirmed ? 1 : 0,
          newConfirmation.pickup_confirmed_at, newConfirmation.return_confirmed_at,
          newConfirmation.created_at, newConfirmation.updated_at
        );
      }

      console.log(`✅ ${type === 'pickup' ? '取机' : '还机'}确认状态已保存到 SQLite 数据库:`, orderId, confirmed);
    } catch (error) {
      console.error('❌ 设置确认状态失败:', error);
      throw error;
    }
  }

  async getAllConfirmations(): Promise<{
    confirmedPickups: string[];
    confirmedReturns: string[];
  }> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const stmt = this.db.prepare('SELECT * FROM confirmations');
      const confirmations = stmt.all() as SQLiteConfirmation[];
      
      const confirmedPickups: string[] = [];
      const confirmedReturns: string[] = [];
      
      confirmations.forEach(row => {
        if (row.pickup_confirmed) {
          confirmedPickups.push(row.order_id);
        }
        if (row.return_confirmed) {
          confirmedReturns.push(row.order_id);
        }
      });
      
      console.log(`📖 从 SQLite 数据库读取确认状态: ${confirmedPickups.length} 个取机确认, ${confirmedReturns.length} 个还机确认`);
      
      return { confirmedPickups, confirmedReturns };
    } catch (error) {
      console.error('❌ 读取确认状态失败:', error);
      return { confirmedPickups: [], confirmedReturns: [] };
    }
  }

  // 数据库统计
  async getStats(): Promise<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  }> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const cameraCount = this.db.prepare('SELECT COUNT(*) as count FROM cameras').get().count;
      const orderCount = this.db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
      const confirmationCount = this.db.prepare('SELECT COUNT(*) as count FROM confirmations').get().count;

      // 获取数据库文件大小
      const fs = await import('fs');
      let dbSize = '0 KB';
      try {
        const stats = fs.statSync(this.dbPath);
        dbSize = `${(stats.size / 1024).toFixed(2)} KB`;
      } catch (error) {
        console.warn('无法获取数据库文件大小:', error);
      }

      return {
        cameras: cameraCount,
        orders: orderCount,
        confirmations: confirmationCount,
        dbSize
      };
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
      return {
        cameras: 0,
        orders: 0,
        confirmations: 0,
        dbSize: '0 KB'
      };
    }
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      this.db.exec('DELETE FROM confirmations');
      this.db.exec('DELETE FROM orders');
      this.db.exec('DELETE FROM cameras');
      console.log('🗑️ SQLite 数据库已清空');
    } catch (error) {
      console.error('❌ 清空数据库失败:', error);
      throw error;
    }
  }

  // 导出数据
  async exportData(): Promise<{
    cameras: SQLiteCamera[];
    orders: SQLiteOrder[];
    confirmations: SQLiteConfirmation[];
    exportDate: string;
    version: string;
  }> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const cameras = await this.getAllCameras();
      const orders = await this.getAllOrders();
      
      const confirmationStmt = this.db.prepare('SELECT * FROM confirmations');
      const confirmations = confirmationStmt.all().map((row: any) => ({
        ...row,
        pickup_confirmed: Boolean(row.pickup_confirmed),
        return_confirmed: Boolean(row.return_confirmed)
      })) as SQLiteConfirmation[];

      return {
        cameras,
        orders,
        confirmations,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      console.error('❌ 导出数据失败:', error);
      throw error;
    }
  }

  // 导入数据
  async importData(data: {
    cameras: SQLiteCamera[];
    orders: SQLiteOrder[];
    confirmations?: SQLiteConfirmation[];
  }): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      // 先清空现有数据
      await this.clearAllData();

      // 开始事务
      const transaction = this.db.transaction(() => {
        // 导入相机数据
        const cameraStmt = this.db.prepare(`
          INSERT INTO cameras (id, model, serial_number, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const camera of data.cameras) {
          cameraStmt.run(camera.id, camera.model, camera.serial_number, camera.created_at, camera.updated_at);
        }

        // 导入订单数据
        const orderStmt = this.db.prepare(`
          INSERT INTO orders (
            id, camera_model, camera_serial_number, renter_name, customer_service, 
            salesperson, pickup_date, pickup_time, return_date, return_time, 
            deposit_status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const order of data.orders) {
          orderStmt.run(
            order.id, order.camera_model, order.camera_serial_number,
            order.renter_name, order.customer_service, order.salesperson,
            order.pickup_date, order.pickup_time, order.return_date,
            order.return_time, order.deposit_status, order.notes,
            order.created_at, order.updated_at
          );
        }

        // 导入确认状态数据
        if (data.confirmations) {
          const confirmationStmt = this.db.prepare(`
            INSERT INTO confirmations (
              id, order_id, pickup_confirmed, return_confirmed, 
              pickup_confirmed_at, return_confirmed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const confirmation of data.confirmations) {
            confirmationStmt.run(
              confirmation.id, confirmation.order_id,
              confirmation.pickup_confirmed ? 1 : 0, confirmation.return_confirmed ? 1 : 0,
              confirmation.pickup_confirmed_at, confirmation.return_confirmed_at,
              confirmation.created_at, confirmation.updated_at
            );
          }
        }
      });

      transaction();
      console.log('✅ 数据导入到 SQLite 数据库完成');
    } catch (error) {
      console.error('❌ 导入数据失败:', error);
      throw error;
    }
  }

  // 数据库备份
  async backupDatabase(): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const backupPath = path.join(path.dirname(this.dbPath), `camera_rental_backup_${Date.now()}.db`);
      fs.copyFileSync(this.dbPath, backupPath);
      
      console.log('💾 SQLite 数据库备份完成:', backupPath);
    } catch (error) {
      console.error('❌ 数据库备份失败:', error);
      throw error;
    }
  }

  // 优化数据库
  async optimizeDatabase(): Promise<void> {
    if (!this.isInitialized || !this.db) throw new Error('数据库未初始化');

    try {
      this.db.exec('VACUUM');
      this.db.exec('ANALYZE');
      console.log('🔧 SQLite 数据库优化完成');
    } catch (error) {
      console.error('❌ 数据库优化失败:', error);
      throw error;
    }
  }

  // 获取数据库文件路径
  getDatabasePath(): string {
    return this.dbPath;
  }

  // 关闭数据库连接
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('🔒 SQLite 数据库连接已关闭');
    }
  }
}

// 创建单例实例
export const electronSQLiteDB = new ElectronSQLiteDatabase();

// 初始化数据库
export const initializeElectronSQLiteDB = async (): Promise<void> => {
  try {
    await electronSQLiteDB.init();
    console.log('🚀 Electron SQLite 数据库初始化成功');
  } catch (error) {
    console.error('❌ Electron SQLite 数据库初始化失败:', error);
    throw error;
  }
};