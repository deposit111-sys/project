/*
  # 相机租赁管理系统数据库架构

  1. 新建表
    - `cameras` (相机表)
      - `id` (uuid, 主键)
      - `model` (text, 相机型号)
      - `serial_number` (text, 相机编号)
      - `created_at` (timestamp, 创建时间)
      - `updated_at` (timestamp, 更新时间)
    
    - `rental_orders` (租赁订单表)
      - `id` (uuid, 主键)
      - `camera_model` (text, 相机型号)
      - `camera_serial_number` (text, 相机编号)
      - `renter_name` (text, 租借人姓名)
      - `customer_service` (text, 客服号)
      - `salesperson` (text, 销售人员)
      - `pickup_date` (date, 取机日期)
      - `pickup_time` (text, 取机时间段)
      - `return_date` (date, 还机日期)
      - `return_time` (text, 还机时间段)
      - `deposit_status` (text, 定金状态)
      - `notes` (text, 备注信息)
      - `created_at` (timestamp, 创建时间)
      - `updated_at` (timestamp, 更新时间)
    
    - `confirmations` (确认状态表)
      - `id` (uuid, 主键)
      - `order_id` (uuid, 订单ID，外键)
      - `pickup_confirmed` (boolean, 取机确认状态)
      - `return_confirmed` (boolean, 还机确认状态)
      - `pickup_confirmed_at` (timestamp, 取机确认时间)
      - `return_confirmed_at` (timestamp, 还机确认时间)
      - `created_at` (timestamp, 创建时间)
      - `updated_at` (timestamp, 更新时间)

  2. 安全设置
    - 启用所有表的行级安全 (RLS)
    - 添加适当的访问策略

  3. 索引优化
    - 为常用查询字段添加索引
*/

-- 创建相机表
CREATE TABLE IF NOT EXISTS cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  serial_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(model, serial_number)
);

-- 创建租赁订单表
CREATE TABLE IF NOT EXISTS rental_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_model text NOT NULL,
  camera_serial_number text NOT NULL,
  renter_name text NOT NULL,
  customer_service text DEFAULT '',
  salesperson text NOT NULL,
  pickup_date date NOT NULL,
  pickup_time text NOT NULL CHECK (pickup_time IN ('morning', 'afternoon', 'evening')),
  return_date date NOT NULL,
  return_time text NOT NULL CHECK (return_time IN ('morning', 'afternoon', 'evening')),
  deposit_status text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建确认状态表
CREATE TABLE IF NOT EXISTS confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES rental_orders(id) ON DELETE CASCADE,
  pickup_confirmed boolean DEFAULT false,
  return_confirmed boolean DEFAULT false,
  pickup_confirmed_at timestamptz,
  return_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id)
);

-- 启用行级安全
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;

-- 创建访问策略（允许所有操作，可根据需要调整）
CREATE POLICY "Allow all operations on cameras"
  ON cameras
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on rental_orders"
  ON rental_orders
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on confirmations"
  ON confirmations
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_cameras_model ON cameras(model);
CREATE INDEX IF NOT EXISTS idx_cameras_serial ON cameras(serial_number);
CREATE INDEX IF NOT EXISTS idx_rental_orders_camera ON rental_orders(camera_model, camera_serial_number);
CREATE INDEX IF NOT EXISTS idx_rental_orders_dates ON rental_orders(pickup_date, return_date);
CREATE INDEX IF NOT EXISTS idx_rental_orders_renter ON rental_orders(renter_name);
CREATE INDEX IF NOT EXISTS idx_confirmations_order_id ON confirmations(order_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_cameras_updated_at
  BEFORE UPDATE ON cameras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_orders_updated_at
  BEFORE UPDATE ON rental_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confirmations_updated_at
  BEFORE UPDATE ON confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();