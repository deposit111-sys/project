import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Camera, RentalOrder } from '../types';
import { getDaysInMonth } from '../utils/dateUtils';
import { Filter, ChevronLeft, ChevronRight, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ScheduleCalendarProps {
  cameras: Camera[];
  orders: RentalOrder[];
  confirmedReturns?: string[];
}

export function ScheduleCalendar({ cameras, orders, confirmedReturns = [] }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedModel, setSelectedModel] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLTableElement>(null);
  const scrollPositionRef = useRef({ x: 0, y: 0 });
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number>();
  const tooltipUpdateRef = useRef<number | null>(null);

  // 使用 ref 直接操作 DOM，避免状态更新导致的重新渲染
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipDataRef = useRef<{
    visible: boolean;
    date: string;
    orders: RentalOrder[];
  }>({
    visible: false,
    date: '',
    orders: []
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);


  


  // 直接操作 DOM 显示/隐藏 tooltip
  const showTooltip = useCallback((date: Date, event: React.MouseEvent, orders: RentalOrder[]) => {
    if (!tooltipRef.current) return;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 更新 tooltip 数据
    tooltipDataRef.current = {
      visible: true,
      date: dateStr,
      orders
    };

    // 更新 tooltip 内容
    updateTooltipContent();

    // 设置位置
    const tooltip = tooltipRef.current;
    tooltip.style.left = `${Math.min(event.clientX + 10, window.innerWidth - 250)}px`;
    tooltip.style.top = `${Math.max(event.clientY - 10, 10)}px`;
    tooltip.style.display = 'block';
  }, []);

  const hideTooltip = useCallback(() => {
    if (!tooltipRef.current) return;

    tooltipDataRef.current.visible = false;
    tooltipRef.current.style.display = 'none';
  }, []);

  const updateTooltipContent = useCallback(() => {
    if (!tooltipRef.current || !tooltipDataRef.current.visible) return;

    const { date, orders } = tooltipDataRef.current;
    const formattedDate = formatDate(date);

    tooltipRef.current.innerHTML = `
      <div class="text-sm font-semibold text-gray-800 mb-2">
        ${formattedDate}
      </div>
      ${orders.length === 0 ?
        '<div class="text-xs text-gray-500">无租赁订单</div>' :
        `<div class="space-y-2">
          ${orders.map(order => `
            <div class="text-xs">
              <div class="font-medium text-gray-700">${order.renterName}</div>
              <div class="text-gray-600">${order.cameraModel} - ${order.cameraSerialNumber}</div>
              ${order.notes ? `<div class="text-gray-500 mt-1">${order.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>`
      }
    `;
  }, []);

  // 添加全局鼠标追踪效果
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!tooltipDataRef.current.visible || !calendarRef.current) return;

      const rect = calendarRef.current.getBoundingClientRect();
      const isOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;

      if (isOutside) {
        hideTooltip();
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [hideTooltip]);

  const uniqueModels = useMemo(() =>
    [...new Set(cameras.map(cam => cam.model))],
    [cameras]
  );

  const filteredCameras = useMemo(() =>
    selectedModel
      ? cameras.filter(cam => cam.model === selectedModel)
      : cameras,
    [cameras, selectedModel]
  );

  // 对相机进行排序，与相机管理组件保持一致
  const sortedCameras = useMemo(() => {
    // 按型号分组
    const groupedCameras = filteredCameras.reduce((acc, camera) => {
      if (!acc[camera.model]) {
        acc[camera.model] = [];
      }
      acc[camera.model].push(camera);
      return acc;
    }, {} as Record<string, CameraType[]>);

    // 对每个型号的相机按编号降序排列
    Object.keys(groupedCameras).forEach(model => {
      groupedCameras[model].sort((a, b) => {
        // 尝试按数字排序，如果不是数字则按字符串排序
        const aNum = parseInt(a.serialNumber, 10);
        const bNum = parseInt(b.serialNumber, 10);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum; // 数字升序
        } else {
          return a.serialNumber.localeCompare(b.serialNumber); // 字符串升序
        }
      });
    });

    // 将分组后的相机重新组合成一个数组
    const sortedCameraList: CameraType[] = [];
    Object.keys(groupedCameras).sort().forEach(model => {
      sortedCameraList.push(...groupedCameras[model]);
    });

    return sortedCameraList;
  }, [filteredCameras]);

  // 检查某个相机在某个日期的状态
  const getScheduleStatus = useCallback((camera: Camera, date: Date, timeSlot: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // 获取当前日期用于判断逾期
    const today = new Date().toISOString().split('T')[0];
    
    const conflictingOrder = orders.find(order => {
      // 检查相机是否匹配
      if (order.cameraModel !== camera.model || order.cameraSerialNumber !== camera.serialNumber) {
        return false;
      }
      
      // 检查日期是否在租赁范围内
      if (dateStr < order.pickupDate || dateStr > order.returnDate) {
        return false;
      }

      const timeOrder = { morning: 1, afternoon: 2, evening: 3 };
      const currentSlot = timeOrder[timeSlot as keyof typeof timeOrder];
      const pickupSlot = timeOrder[order.pickupTime];
      const returnSlot = timeOrder[order.returnTime];

      // 如果是取机当天
      if (dateStr === order.pickupDate) {
        // 如果取机和还机是同一天
        if (order.pickupDate === order.returnDate) {
          // 只有在取机时间段和还机时间段之间的时间段才被占用
          return currentSlot >= pickupSlot && currentSlot <= returnSlot;
        } else {
          // 取机当天：从取机时间段开始的所有时间段都被占用
          return currentSlot >= pickupSlot;
        }
      }
      
      // 如果是还机当天
      if (dateStr === order.returnDate) {
        // 还机当天：到还机时间段为止的所有时间段都被占用
        return currentSlot <= returnSlot;
      }
      
      // 如果是中间的日期，整天都被占用
      return true;
    });
    
    if (!conflictingOrder) {
      return 'available';
    }
    
    // 检查是否逾期未还 - 只有在还机日期已过且未确认还机的情况下才算逾期
    const isOverdue = conflictingOrder.returnDate < today && !confirmedReturns.includes(conflictingOrder.id);
    return isOverdue ? 'overdue' : 'occupied';
  }, [orders, confirmedReturns]);

  // 获取某日期的所有订单
  const getOrdersForDate = useCallback((dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return orders.filter(order =>
      dateStr >= order.pickupDate && dateStr <= order.returnDate
    ).map(order => ({
      ...order,
      isOverdue: order.returnDate < today && !confirmedReturns.includes(order.id)
    }));
  }, [orders, confirmedReturns]);

  // 保存滚动位置
  const saveScrollPosition = useCallback(() => {
    if (containerRef.current && !isScrollingRef.current) {
      scrollPositionRef.current = {
        x: containerRef.current.scrollLeft,
        y: containerRef.current.scrollTop
      };
    }
  }, []);

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    if (containerRef.current && scrollPositionRef.current) {
      const container = containerRef.current;
      const targetPosition = scrollPositionRef.current;

      // 立即尝试设置一次
      container.scrollLeft = targetPosition.x;
      container.scrollTop = targetPosition.y;

      // 使用多重检查确保设置成功
      const checkAndRestore = () => {
        if (container.scrollLeft !== targetPosition.x || container.scrollTop !== targetPosition.y) {
          container.scrollLeft = targetPosition.x;
          container.scrollTop = targetPosition.y;
        }
      };

      // 多次检查确保设置成功
      requestAnimationFrame(() => {
        checkAndRestore();
        requestAnimationFrame(() => {
          checkAndRestore();
          setTimeout(checkAndRestore, 10);
        });
      });
    }
  }, []);



  // 处理滚动事件
  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    saveScrollPosition();

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      saveScrollPosition();
      scrollTimeoutRef.current = undefined;
    }, 100);

    // 滚动时隐藏 tooltip
    if (tooltipDataRef.current.visible) {
      hideTooltip();
    }
  }, [saveScrollPosition, hideTooltip]);

  // 处理鼠标进入
  const handleMouseEnter = useCallback((date: Date, event: React.MouseEvent) => {
    if (isScrollingRef.current || scrollTimeoutRef.current) return;

    // 在显示 tooltip 前保存滚动位置
    saveScrollPosition();

    const dayOrders = getOrdersForDate(date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0'));

    // 使用 DOM 操作显示 tooltip，不触发重新渲染
    showTooltip(date, event, dayOrders);
  }, [saveScrollPosition, getOrdersForDate, showTooltip]);

  // 处理鼠标移动 - 直接更新 DOM 位置
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isScrollingRef.current || !tooltipDataRef.current.visible || !tooltipRef.current) return;

    // 直接更新 tooltip 位置，不触发重新渲染
    const tooltip = tooltipRef.current;
    tooltip.style.left = `${Math.min(event.clientX + 10, window.innerWidth - 250)}px`;
    tooltip.style.top = `${Math.max(event.clientY - 10, 10)}px`;
  }, []);


  // 在依赖项变化时恢复滚动位置
  useEffect(() => {
    // 只在非用户交互状态下恢复滚动位置
    const timer = setTimeout(() => {
      if (!isScrollingRef.current && !scrollTimeoutRef.current) {
        restoreScrollPosition();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedModel, zoomLevel, currentDate, restoreScrollPosition]);

  // 清理定时器和动画帧
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (tooltipUpdateRef.current) {
        cancelAnimationFrame(tooltipUpdateRef.current);
      }
    };
  }, []);

  const navigateMonth = (direction: number) => {
    if (!isScrollingRef.current) {
      saveScrollPosition();
    }
    setCurrentDate(new Date(year, month + direction, 1));
  };

  const selectMonth = (monthIndex: number) => {
    if (!isScrollingRef.current) {
      saveScrollPosition();
    }
    setCurrentDate(new Date(year, monthIndex, 1));
  };

  const navigateYear = (direction: number) => {
    if (!isScrollingRef.current) {
      saveScrollPosition();
    }
    setCurrentDate(new Date(year + direction, month, 1));
  };
  const handleZoom = (direction: 'in' | 'out') => {
    if (!isScrollingRef.current) {
      saveScrollPosition();
    }
    setZoomLevel(prev => {
      if (direction === 'in') {
        return Math.min(prev + 10, 150);
      } else {
        return Math.max(prev - 10, 10);
      }
    });
  };

  const handleFullscreenToggle = () => {
    if (isFullscreen) {
      // 退出全屏时重置缩放比例
      setZoomLevel(100);
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleModelChange = (model: string) => {
    if (!isScrollingRef.current) {
      saveScrollPosition();
    }
    setSelectedModel(model);
  };

  const timeSlots = [
    { key: 'morning', label: '上午' },
    { key: 'afternoon', label: '下午' },
    { key: 'evening', label: '晚上' }
  ];

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
    } catch {
      return dateStr;
    }
  };

  // 创建 tooltip DOM 元素
  useEffect(() => {
    const tooltip = document.createElement('div');
    tooltip.className = 'fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // 直接赋值给 ref
    if (tooltipRef.current !== tooltip) {
      tooltipRef.current = tooltip;
    }

    return () => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
      tooltipRef.current = null;
    };
  }, []);

  const CalendarContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm"
            >
              <option value="">全部型号</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleFullscreenToggle}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
            title={isFullscreen ? "退出全屏" : "全屏显示"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="text-sm">{isFullscreen ? "退出全屏" : "全屏显示"}</span>
          </button>

          {isFullscreen && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleZoom('out')}
                disabled={zoomLevel <= 10}
                className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="缩小"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-[50px] text-center">{zoomLevel}%</span>
              <button
                onClick={() => handleZoom('in')}
                disabled={zoomLevel >= 150}
                className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="放大"
              >
                <ZoomIn className="h-4 w-4" />
              ${order.isOverdue ? `<div class="text-yellow-600 text-xs">应还: ${formatDate(order.returnDate)}</div>` : ''}
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateYear(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              title="上一年"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-lg min-w-[80px] text-center">
              {year}年
            </span>
            <button
              onClick={() => navigateYear(1)}
              className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              title="下一年"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 mb-4">
        {monthNames.map((monthName, index) => (
          <button
            key={index}
            onClick={() => selectMonth(index)}
            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-200 ${
              month === index
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {monthName}
          </button>
        ))}
      </div>

      <div
        key="calendar-container"
        ref={containerRef}
        className="overflow-auto"
        style={{
          fontSize: `${zoomLevel}%`,
          maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px',
          minHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px',
        }}
        onScroll={handleScroll}
      >
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoomLevel / 100)}%`,
            height: `${100 / (zoomLevel / 100)}%`,
          }}
        >
          <table 
            ref={calendarRef}
            className={`w-full border-collapse border border-gray-300 ${isFullscreen ? 'table-fixed' : ''}`}
          >
          <thead>
            <tr>
              <th className={`border border-gray-300 py-2 px-3 bg-gray-50 sticky left-0 font-semibold ${isFullscreen ? 'top-0 z-20' : 'top-0 z-20'}`}>日期/编号</th>
              {daysInMonth.map(date => (
                <th 
                  key={date.toISOString()} 
                  className={`border border-gray-300 py-2 px-3 bg-gray-50 min-w-[80px] font-semibold cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${isFullscreen ? 'sticky top-0 z-10' : 'sticky top-0 z-10'}`}
                  onMouseEnter={(e) => handleMouseEnter(date, e)}
                  title="悬停查看当日订单详情"
                >
                  {date.getDate()}日
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCameras.map(camera => (
              <tr key={camera.id}>
                <td className={`border border-gray-300 p-3 bg-gray-50 sticky left-0 ${isFullscreen ? 'z-10' : 'z-10'}`}>
                  <div className="text-sm">
                    <div className="font-medium">{camera.model}</div>
                    <div className="text-gray-600">{camera.serialNumber}</div>
                  </div>
                </td>
                {daysInMonth.map(date => (
                  <td 
                    key={date.toISOString()} 
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onMouseEnter={(e) => handleMouseEnter(date, e)}
                    title="悬停查看当日订单详情"
                  >
                    <div className="space-y-1">
                      {timeSlots.map(slot => (
                        <div
                          key={slot.key}
                          className={`text-xs p-1 rounded text-center transition-colors duration-200 ${
                            getScheduleStatus(camera, date, slot.key) === 'overdue'
                              ? 'bg-yellow-500 text-white border border-yellow-600'
                              : getScheduleStatus(camera, date, slot.key) === 'occupied'
                              ? 'bg-red-500 text-white border border-red-600'
                              : 'bg-green-100 text-green-800 border border-green-200'
                          }`}
                        >
                          {slot.label}
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
          <span className="text-gray-600">已租赁</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 border border-yellow-600 rounded"></div>
          <span className="text-gray-600">逾期未还</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
          <span className="text-gray-600">可租赁</span>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-40 overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">相机档期日历 - 全屏模式</h2>
            <button
              onClick={handleFullscreenToggle}
              className="p-2 hover:bg-gray-100 rounded-lg focus:ring-2 focus:ring-gray-200 transition-all duration-200"
              title="退出全屏"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CalendarContent />
          </div>
        </div>
      </div>
    );
  }

  return <CalendarContent />;
}