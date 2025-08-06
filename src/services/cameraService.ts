import { supabase, TABLES, transformDatabaseCamera, transformToDatabase, isSupabaseEnabled } from '../lib/supabase';
import { Camera } from '../types';

export class CameraService {
  // 获取所有相机
  static async getAll(): Promise<Camera[]> {
    if (!isSupabaseEnabled || !supabase) {
      console.log('Supabase not configured, returning empty cameras');
      return [];
    }

    try {
      console.log('Fetching cameras from Supabase...');
      const { data, error } = await supabase
        .from(TABLES.CAMERAS)
        .select('*')
        .order('model', { ascending: true })
        .order('serial_number', { ascending: true });

      if (error) throw error;

      console.log('Cameras fetched:', data?.length || 0);
      return data?.map(transformDatabaseCamera) || [];
    } catch (error) {
      // 网络错误时返回空数组而不是抛出错误
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.name === 'TypeError'
      )) {
        console.log('Network error detected, returning empty cameras');
        return [];
      }
      
      console.error('Error fetching cameras:', error);
      throw new Error('获取相机列表失败');
    }
  }

  // 添加相机
  static async create(camera: Omit<Camera, 'id'>): Promise<Camera> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CAMERAS)
        .insert([transformToDatabase.camera(camera)])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // 唯一约束违反
          throw new Error('该相机型号和编号已存在');
        }
        throw error;
      }

      return transformDatabaseCamera(data);
    } catch (error) {
      if (error instanceof Error) {
        // Don't log expected validation errors to console
        if (error.message !== '该相机型号和编号已存在') {
          console.error('Error creating camera:', error);
        }
        throw error;
      }
      console.error('Error creating camera:', error);
      throw new Error('添加相机失败');
    }
  }

  // 删除相机
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.CAMERAS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting camera:', error);
      throw new Error('删除相机失败');
    }
  }

  // 检查相机是否存在
  static async exists(model: string, serialNumber: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(TABLES.CAMERAS)
        .select('id')
        .eq('model', model)
        .eq('serial_number', serialNumber)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking camera existence:', error);
      return false;
    }
  }
}