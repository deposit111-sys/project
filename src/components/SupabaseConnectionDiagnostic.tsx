import React, { useState } from 'react';
import { supabase, isSupabaseEnabled, getSupabaseConfig } from '../lib/supabase';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Wifi, Database, Key, Globe } from 'lucide-react';

export function SupabaseConnectionDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    configCheck: { status: 'success' | 'error' | 'warning'; message: string };
    networkCheck: { status: 'success' | 'error' | 'warning'; message: string };
    authCheck: { status: 'success' | 'error' | 'warning'; message: string };
    databaseCheck: { status: 'success' | 'error' | 'warning'; message: string };
    overallStatus: 'success' | 'error' | 'warning';
  } | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults(null);

    const diagnosticResults = {
      configCheck: { status: 'error' as const, message: '' },
      networkCheck: { status: 'error' as const, message: '' },
      authCheck: { status: 'error' as const, message: '' },
      databaseCheck: { status: 'error' as const, message: '' },
      overallStatus: 'error' as const
    };

    try {
      // 1. 配置检查
      console.log('🔍 检查 Supabase 配置...');
      const config = getSupabaseConfig();
      if (config.isConfigured) {
        diagnosticResults.configCheck = {
          status: 'success',
          message: `配置正确 - URL: ${config.url?.substring(0, 30)}...`
        };
      } else {
        diagnosticResults.configCheck = {
          status: 'error',
          message: config.error || '配置错误'
        };
      }

      // 2. 网络连接检查
      if (config.isConfigured && supabase) {
        console.log('🌐 检查网络连接...');
        try {
          const response = await fetch(config.url + '/rest/v1/', {
            method: 'HEAD',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            diagnosticResults.networkCheck = {
              status: 'success',
              message: `网络连接正常 - 响应码: ${response.status}`
            };
          } else {
            diagnosticResults.networkCheck = {
              status: 'error',
              message: `网络连接异常 - HTTP ${response.status}: ${response.statusText}`
            };
          }
        } catch (error) {
          diagnosticResults.networkCheck = {
            status: 'error',
            message: `网络连接失败: ${error instanceof Error ? error.message : '未知错误'}`
          };
        }

        // 3. 认证检查
        console.log('🔑 检查认证配置...');
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            diagnosticResults.authCheck = {
              status: 'warning',
              message: `认证警告: ${error.message}`
            };
          } else {
            diagnosticResults.authCheck = {
              status: 'success',
              message: '认证配置正常'
            };
          }
        } catch (error) {
          diagnosticResults.authCheck = {
            status: 'error',
            message: `认证检查失败: ${error instanceof Error ? error.message : '未知错误'}`
          };
        }

        // 4. 数据库连接检查
        console.log('🗄️ 检查数据库连接...');
        try {
          const { data, error } = await supabase
            .from('cameras')
            .select('count', { count: 'exact', head: true })
            .limit(0);

          if (error) {
            if (error.message.includes('relation') || error.message.includes('does not exist')) {
              diagnosticResults.databaseCheck = {
                status: 'error',
                message: '数据库表不存在，请运行数据库迁移'
              };
            } else {
              diagnosticResults.databaseCheck = {
                status: 'error',
                message: `数据库连接失败: ${error.message}`
              };
            }
          } else {
            diagnosticResults.databaseCheck = {
              status: 'success',
              message: '数据库连接正常'
            };
          }
        } catch (error) {
          diagnosticResults.databaseCheck = {
            status: 'error',
            message: `数据库检查失败: ${error instanceof Error ? error.message : '未知错误'}`
          };
        }
      } else {
        diagnosticResults.networkCheck = { status: 'error', message: '配置错误，跳过网络检查' };
        diagnosticResults.authCheck = { status: 'error', message: '配置错误，跳过认证检查' };
        diagnosticResults.databaseCheck = { status: 'error', message: '配置错误，跳过数据库检查' };
      }

      // 计算总体状态
      const hasError = Object.values(diagnosticResults).some(result => 
        typeof result === 'object' && result.status === 'error'
      );
      const hasWarning = Object.values(diagnosticResults).some(result => 
        typeof result === 'object' && result.status === 'warning'
      );

      if (hasError) {
        diagnosticResults.overallStatus = 'error';
      } else if (hasWarning) {
        diagnosticResults.overallStatus = 'warning';
      } else {
        diagnosticResults.overallStatus = 'success';
      }

    } catch (error) {
      console.error('诊断过程中发生错误:', error);
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Supabase 连接诊断
        </h2>
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRunning ? '诊断中...' : '开始诊断'}
        </button>
      </div>

      {results && (
        <div className="space-y-4">
          {/* 总体状态 */}
          <div className={`p-4 rounded-lg border-2 ${getStatusColor(results.overallStatus)}`}>
            <div className="flex items-center">
              {getStatusIcon(results.overallStatus)}
              <span className="ml-2 font-semibold">
                总体状态: {
                  results.overallStatus === 'success' ? '正常' :
                  results.overallStatus === 'warning' ? '有警告' : '有错误'
                }
              </span>
            </div>
          </div>

          {/* 详细检查结果 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${getStatusColor(results.configCheck.status)}`}>
              <div className="flex items-center mb-2">
                <Key className="h-4 w-4 mr-2" />
                <span className="font-medium">配置检查</span>
                {getStatusIcon(results.configCheck.status)}
              </div>
              <p className="text-sm">{results.configCheck.message}</p>
            </div>

            <div className={`p-4 rounded-lg border ${getStatusColor(results.networkCheck.status)}`}>
              <div className="flex items-center mb-2">
                <Globe className="h-4 w-4 mr-2" />
                <span className="font-medium">网络连接</span>
                {getStatusIcon(results.networkCheck.status)}
              </div>
              <p className="text-sm">{results.networkCheck.message}</p>
            </div>

            <div className={`p-4 rounded-lg border ${getStatusColor(results.authCheck.status)}`}>
              <div className="flex items-center mb-2">
                <Wifi className="h-4 w-4 mr-2" />
                <span className="font-medium">认证检查</span>
                {getStatusIcon(results.authCheck.status)}
              </div>
              <p className="text-sm">{results.authCheck.message}</p>
            </div>

            <div className={`p-4 rounded-lg border ${getStatusColor(results.databaseCheck.status)}`}>
              <div className="flex items-center mb-2">
                <Database className="h-4 w-4 mr-2" />
                <span className="font-medium">数据库连接</span>
                {getStatusIcon(results.databaseCheck.status)}
              </div>
              <p className="text-sm">{results.databaseCheck.message}</p>
            </div>
          </div>

          {/* 解决建议 */}
          {results.overallStatus !== 'success' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">解决建议:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                {results.configCheck.status === 'error' && (
                  <li>• 检查 .env 文件中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 配置</li>
                )}
                {results.networkCheck.status === 'error' && (
                  <li>• 检查网络连接，确保可以访问 Supabase 服务</li>
                )}
                {results.authCheck.status === 'error' && (
                  <li>• 检查 Supabase 项目的 API 密钥是否正确</li>
                )}
                {results.databaseCheck.status === 'error' && (
                  <li>• 确保数据库表已创建，可能需要运行数据库迁移</li>
                )}
                <li>• 如果问题持续，请检查 Supabase 项目状态和配额</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {!results && !isRunning && (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">点击"开始诊断"来检查 Supabase 连接状态</p>
        </div>
      )}
    </div>
  );
}