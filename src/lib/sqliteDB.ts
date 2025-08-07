import Database from 'better-sqlite3';
import { Camera, RentalOrder } from '../types';

export interface DBSchema {
  cameras: {
    id: string;
    model: string;
    serial_number: string;
    created_at: string;
    updated_at: string;
  };
  orders: {
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
  };
  confirmations: {
    id: string;
    order_id: string;
    pickup_confirmed: boolean;
    return_confirmed: boolean;
    pickup_confirmed_at?: string;
    return_confirmed_at?: string;
    created_at: string;
    updated_at: string;
  };
}

class SQLiteDatabase {
  private db: Database.Database;
  private dbPath = './camera_rental.db';

  constructor() {
    this.db = new Database(this.dbPath);
    this.init();
  }

  private init(): void {
    try {
      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      
      // 设置WAL模式以提高并发性能
      this.db.pragma('journal_mode = WAL');
      
      // 创建相机表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cameras (
          id TEXT PRIMARY KEY,
          model TEXT NOT NULL,
          serial_number TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
          pickup_time TEXT NOT NULL CHECK (pickup_time IN ('morning', 'afternoon', 'evening')),
          return_date TEXT NOT NULL,
          return_time TEXT NOT NULL CHECK (return_time IN ('morning', 'afternoon', 'evening')),
          deposit_status TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建确认状态表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS confirmations (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL UNIQUE,
          pickup_confirmed BOOLEAN NOT NULL DEFAULT 0,
          return_confirmed BOOLEAN NOT NULL DEFAULT 0,
          pickup_confirmed_at TEXT,
          return_confirmed_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
      `);

      // 创建索引以提高查询性能
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_cameras_model ON cameras(model);
        CREATE INDEX IF NOT EXISTS idx_cameras_serial ON cameras(serial_number);
        CREATE INDEX IF NOT EXISTS idx_cameras_model_serial ON cameras(model, serial_number);
        
        CREATE INDEX IF NOT EXISTS idx_orders_camera ON orders(camera_model, camera_serial_number);
        CREATE INDEX IF NOT EXISTS idx_orders_dates ON orders(pickup_date, return_date);
        CREATE INDEX IF NOT EXISTS idx_orders_renter ON orders(renter_name);
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_confirmations_order ON confirmations(order_id);
        CREATE INDEX IF NOT EXISTS idx_confirmations_pickup ON confirmations(pickup_confirmed);
        CREATE INDEX IF NOT EXISTS idx_confirmations_return ON confirmations(return_confirmed);
      `);

      // 创建触发器自动更新 updated_at 字段
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_cameras_updated_at
        AFTER UPDATE ON cameras
        BEGIN
          UPDATE cameras SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_orders_updated_at
        AFTER UPDATE ON orders
        BEGIN
          UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_confirmations_updated_at
        AFTER UPDATE ON confirmations
        BEGIN
          UPDATE confirmations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      console.log('✅ SQLite 数据库初始化成功');
    } catch (error) {
      console.error('❌ SQLite 数据库初始化失败:', error);
      throw error;
    }
  }

  // 相机操作
  async addCamera(camera: Omit<DBSchema['cameras'], 'id' | 'created_at' | 'updated_at'>): Promise<DBSchema['cameras']> {
    const now = new Date().toISOString();
    const newCamera: DBSchema['cameras'] = {
      id: `camera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      model: camera.model,
      serial_number: camera.serial_number,
      created_at: now,
      updated_at: now
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO cameras (id, model, serial_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(newCamera.id, newCamera.model, newCamera.serial_number, newCamera.created_at, newCamera.updated_at);
      
      console.log('✅ 相机已保存到SQLite数据库:', newCamera.id);
      return newCamera;
    } catch (error) {
      console.error('❌ 添加相机失败:', error);
      throw error;
    }
  }

  async getAllCameras(): Promise<DBSchema['cameras'][]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM cameras ORDER BY model, serial_number');
      const cameras = stmt.all() as DBSchema['cameras'][];
      
      console.log(`📖 从SQLite数据库读取 ${cameras.length} 台相机`);
      return cameras;
    } catch (error) {
      console.error('❌ 获取相机列表失败:', error);
      throw error;
    }
  }

  async deleteCamera(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM cameras WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('相机不存在');
      }
      
      console.log('🗑️ 相机已从SQLite数据库删除:', id);
    } catch (error) {
      console.error('❌ 删除相机失败:', error);
      throw error;
    }
  }

  // 订单操作
  async addOrder(order: Omit<DBSchema['orders'], 'id' | 'created_at' | 'updated_at'>): Promise<DBSchema['orders']> {
    const now = new Date().toISOString();
    const newOrder: DBSchema['orders'] = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...order,
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
      
      console.log('✅ 订单已保存到SQLite数据库:', newOrder.id);
      return newOrder;
    } catch (error) {
      console.error('❌ 添加订单失败:', error);
      throw error;
    }
  }

  async getAllOrders(): Promise<DBSchema['orders'][]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC');
      const orders = stmt.all() as DBSchema['orders'][];
      
      console.log(`📖 从SQLite数据库读取 ${orders.length} 个订单`);
      return orders;
    } catch (error) {
      console.error('❌ 获取订单列表失败:', error);
      throw error;
    }
  }

  async updateOrder(id: string, updates: Partial<DBSchema['orders']>): Promise<DBSchema['orders']> {
    try {
      // 首先获取现有订单
      const getStmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
      const existing = getStmt.get(id) as DBSchema['orders'];
      
      if (!existing) {
        throw new Error('订单不存在');
      }

      // 构建更新语句
      const updateFields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at');
      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field as keyof DBSchema['orders']]);
      
      const updateStmt = this.db.prepare(`
        UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `);
      
      updateStmt.run(...values, id);
      
      // 返回更新后的订单
      const updatedOrder = getStmt.get(id) as DBSchema['orders'];
      
      console.log('✅ 订单已在SQLite数据库更新:', id);
      return updatedOrder;
    } catch (error) {
      console.error('❌ 更新订单失败:', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM orders WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('订单不存在');
      }
      
      console.log('🗑️ 订单已从SQLite数据库删除:', id);
    } catch (error) {
      console.error('❌ 删除订单失败:', error);
      throw error;
    }
  }

  // 确认状态操作
  async setConfirmation(orderId: string, type: 'pickup' | 'return', confirmed: boolean): Promise<void> {
    const now = new Date().toISOString();
    
    try {
      // 使用 UPSERT 操作
      const stmt = this.db.prepare(`
        INSERT INTO confirmations (
          id, order_id, pickup_confirmed, return_confirmed, 
          pickup_confirmed_at, return_confirmed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(order_id) DO UPDATE SET
          ${type === 'pickup' ? 'pickup_confirmed' : 'return_confirmed'} = ?,
          ${type === 'pickup' ? 'pickup_confirmed_at' : 'return_confirmed_at'} = ?,
          updated_at = CURRENT_TIMESTAMP
      `);
      
      const confirmationId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const pickupConfirmed = type === 'pickup' ? confirmed : false;
      const returnConfirmed = type === 'return' ? confirmed : false;
      const pickupConfirmedAt = type === 'pickup' && confirmed ? now : null;
      const returnConfirmedAt = type === 'return' && confirmed ? now : null;
      
      stmt.run(
        confirmationId, orderId, pickupConfirmed, returnConfirmed,
        pickupConfirmedAt, returnConfirmedAt, now, now,
        confirmed, confirmed ? now : null
      );
      
      console.log(`✅ ${type === 'pickup' ? '取机' : '还机'}确认状态已保存到SQLite数据库:`, orderId, confirmed);
    } catch (error) {
      console.error('❌ 设置确认状态失败:', error);
      throw error;
    }
  }

  async getAllConfirmations(): Promise<{
    confirmedPickups: string[];
    confirmedReturns: string[];
  }> {
    try {
      const stmt = this.db.prepare('SELECT * FROM confirmations');
      const confirmations = stmt.all() as DBSchema['confirmations'][];

      const confirmedPickups = confirmations
        .filter(c => c.pickup_confirmed)
        .map(c => c.order_id);

      const confirmedReturns = confirmations
        .filter(c => c.return_confirmed)
        .map(c => c.order_id);

      console.log(`📖 从SQLite数据库读取确认状态: ${confirmedPickups.length} 个取机确认, ${confirmedReturns.length} 个还机确认`);
      
      return { confirmedPickups, confirmedReturns };
    } catch (error) {
      console.error('❌ 获取确认状态失败:', error);
      throw error;
    }
  }

  // 数据库统计
  async getStats(): Promise<{
    cameras: number;
    orders: number;
    confirmations: number;
    dbSize: string;
  }> {
    try {
      const cameraStmt = this.db.prepare('SELECT COUNT(*) as count FROM cameras');
      const orderStmt = this.db.prepare('SELECT COUNT(*) as count FROM orders');
      const confirmationStmt = this.db.prepare('SELECT COUNT(*) as count FROM confirmations');
      
      const cameraCount = (cameraStmt.get() as any).count;
      const orderCount = (orderStmt.get() as any).count;
      const confirmationCount = (confirmationStmt.get() as any).count;
      
      // 获取数据库文件大小
      const fs = require('fs');
      let dbSize = '未知';
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
      console.error('❌ 获取数据库统计失败:', error);
      throw error;
    }
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    try {
      this.db.exec(`
        DELETE FROM confirmations;
        DELETE FROM orders;
        DELETE FROM cameras;
        VACUUM;
      `);
      
      console.log('🗑️ SQLite数据库已清空');
    } catch (error) {
      console.error('❌ 清空数据库失败:', error);
      throw error;
    }
  }

  // 导出数据
  async exportData(): Promise<{
    cameras: DBSchema['cameras'][];
    orders: DBSchema['orders'][];
    confirmations: DBSchema['confirmations'][];
    exportDate: string;
    version: string;
  }> {
    try {
      const cameras = await this.getAllCameras();
      const orders = await this.getAllOrders();
      const confirmationStmt = this.db.prepare('SELECT * FROM confirmations');
      const confirmations = confirmationStmt.all() as DBSchema['confirmations'][];

      return {
        cameras,
        orders,
        confirmations,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };
    } catch (error) {
      console.error('❌ 导出数据失败:', error);
      throw error;
    }
  }

  // 导入数据
  async importData(data: {
    cameras: DBSchema['cameras'][];
    orders: DBSchema['orders'][];
    confirmations?: DBSchema['confirmations'][];
  }): Promise<void> {
    try {
      // 使用事务确保数据一致性
      const transaction = this.db.transaction(() => {
        // 清空现有数据
        this.db.exec(`
          DELETE FROM confirmations;
          DELETE FROM orders;
          DELETE FROM cameras;
        `);

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
              confirmation.id, confirmation.order_id, confirmation.pickup_confirmed,
              confirmation.return_confirmed, confirmation.pickup_confirmed_at,
              confirmation.return_confirmed_at, confirmation.created_at, confirmation.updated_at
            );
          }
        }
      });

      transaction();
      console.log('✅ 数据导入到SQLite数据库完成');
    } catch (error) {
      console.error('❌ 导入数据失败:', error);
      throw error;
    }
  }

  // 关闭数据库连接
  close(): void {
    try {
      this.db.close();
      console.log('✅ SQLite数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }

  // 数据库备份
  async backup(backupPath: string): Promise<void> {
    try {
      this.db.backup(backupPath);
      console.log('✅ 数据库备份完成:', backupPath);
    } catch (error) {
      console.error('❌ 数据库备份失败:', error);
      throw error;
    }
  }

  // 数据库优化
  async optimize(): Promise<void> {
    try {
      this.db.exec('VACUUM');
      this.db.exec('ANALYZE');
      console.log('✅ 数据库优化完成');
    } catch (error) {
      console.error('❌ 数据库优化失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const sqliteDB = new SQLiteDatabase();

// 初始化数据库
export const initializeSQLiteDB = async (): Promise<void> => {
  try {
    console.log('🚀 SQLite数据库已准备就绪');
  } catch (error) {
    console.error('❌ SQLite数据库初始化失败:', error);
    throw error;
  }
};