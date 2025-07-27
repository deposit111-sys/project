export function formatDate(date: string): string {
  if (!date) return '';
  try {
    // 直接使用 YYYY-MM-DD 格式，不进行时区转换
    const [year, month, day] = date.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    return date;
  }
}

export function formatDateTime(date: string, time: string): string {
  if (!date) return '';
  
  const timeMap = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚上'
  };
  
  try {
    // 直接解析日期字符串，避免时区问题
    const [year, month, day] = date.split('-');
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    return `${monthNum}月${dayNum}日 ${timeMap[time as keyof typeof timeMap] || time}`;
  } catch (error) {
    return `${date} ${timeMap[time as keyof typeof timeMap] || time}`;
  }
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  if (!date || !startDate || !endDate) return false;
  
  try {
    // 直接比较日期字符串，避免时区转换
    const checkDate = date;
    const start = startDate;
    const end = endDate;
    
    return checkDate >= start && checkDate <= end;
  } catch (error) {
    return false;
  }
}

export function checkScheduleConflict(
  newOrder: any,
  existingOrders: any[],
  cameraModel: string,
  cameraSerial: string
): boolean {
  return existingOrders.some(order => {
    if (order.cameraModel !== cameraModel || order.cameraSerialNumber !== cameraSerial) {
      return false;
    }
    
    try {
      // 直接比较日期字符串
      const newStart = newOrder.pickupDate;
      const newEnd = newOrder.returnDate;
      const existingStart = order.pickupDate;
      const existingEnd = order.returnDate;
      
      // 检查日期范围是否重叠
      return newStart <= existingEnd && newEnd >= existingStart;
    } catch (error) {
      return false;
    }
  });
}