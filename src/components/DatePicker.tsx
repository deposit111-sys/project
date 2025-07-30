import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "选择日期", className = "", required = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  // 如果有值，使用该值的年月，否则使用当前年月
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setCurrentYear(date.getFullYear());
      setCurrentMonth(date.getMonth());
    }
  }, [value]);

  // 点击外部关闭日期选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 格式化显示日期
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
    } catch {
      return dateStr;
    }
  };

  // 获取月份的所有日期
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // 添加上个月的空白日期
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    
    // 添加当月的日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const handleDateSelect = (day: number) => {
    const month = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${month}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  const navigateYear = (direction: number) => {
    setCurrentYear(prev => prev + direction);
  };

  const isSelectedDate = (day: number) => {
    if (!value) return false;
    try {
      const [year, month, dayStr] = value.split('-');
      return (
        parseInt(year, 10) === currentYear &&
        parseInt(month, 10) === currentMonth + 1 &&
        parseInt(dayStr, 10) === day
      );
    } catch {
      return false;
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    );
  };

  const days = getDaysInMonth(currentYear, currentMonth);
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 cursor-pointer bg-white flex items-center justify-between ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-[300px]">
          {/* 年份和月份导航 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => navigateYear(-1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-lg min-w-[60px] text-center">
                {currentYear}年
              </span>
              <button
                type="button"
                onClick={() => navigateYear(1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold min-w-[40px] text-center">
                {monthNames[currentMonth]}
              </span>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day && (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`w-full h-full text-sm rounded transition-colors duration-200 flex items-center justify-center ${
                      isSelectedDate(day)
                        ? 'bg-blue-600 text-white font-semibold'
                        : isToday(day)
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 快捷操作 */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${day}`);
                setIsOpen(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}