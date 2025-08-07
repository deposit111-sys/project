import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface DatabaseStatusProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function DatabaseStatus({ onConnectionChange }: DatabaseStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = async () => {
    // 如果 Supabase 未配置，直接设置为未连接状态，不显示错误
    if (!isSupabaseEnabled || !supabase) {
      setIsConnected(false);
      setLastChecked(new Date());
      onConnectionChange?.(false);
      return;
    }

    setIsChecking(true);
    try {
      // 使用更简单的连接测试
      console.log('Testing Supabase connection...');
      
      // 首先测试基本连接
      const { data, error } = await supabase
        .from('cameras')
        .select('count', { count: 'exact', head: true })
        .limit(0);
      
      const connected = !error;
      
      if (error) {
        console.warn('Supabase connection test failed:', error.message);
        // 检查是否是网络问题
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('fetch')) {
          console.log('Network connectivity issue detected');
        }
        // 检查是否是认证问题
        else if (error.message.includes('JWT') || 
                 error.message.includes('auth') ||
                 error.message.includes('unauthorized')) {
          console.log('Authentication issue detected');
        }
        // 检查是否是配置问题
        else if (error.message.includes('relation') || 
                 error.message.includes('does not exist')) {
          console.log('Database schema issue detected');
        }
      } else {
        console.log('Supabase connection successful');
      }
      
      setIsConnected(connected);
      setLastChecked(new Date());
      
      // 只有当连接状态发生变化时才通知父组件
      if (connected !== isConnected) {
        onConnectionChange?.(connected);
      }
    } catch (error) {
      console.error('Supabase connection error:', error);
      const wasConnected = isConnected;
      setIsConnected(false);
      setLastChecked(new Date());
      
      // 只有当连接状态发生变化时才通知父组件
      if (wasConnected !== false) {
        onConnectionChange?.(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // 每30秒检查一次连接状态
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isConnected === null || isChecking) return 'text-gray-500';
    return isConnected ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = () => {
    if (isConnected === null || isChecking) return 'bg-gray-100';
    return isConnected ? 'bg-green-100' : 'bg-red-100';
  };

  const getStatusText = () => {
    if (isChecking) return '检查中...';
    if (isConnected === null) return '未知';
    return isConnected ? '已连接' : '连接失败';
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <Database className="h-4 w-4 animate-pulse" />;
    }
    if (isConnected === null) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return isConnected ? <CheckCircle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />;
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${getStatusBg()}`}>
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      <div className="text-sm">
        <div className={`font-medium ${getStatusColor()}`}>
          数据库: {getStatusText()}
        </div>
        {lastChecked && (
          <div className="text-xs text-gray-500">
            最后检查: {lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>
      {!isConnected && !isChecking && (
        <button
          onClick={checkConnection}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          重试
        </button>
      )}
    </div>
  );
}