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
      const newStartDate = newOrder.pickupDate;
      const newEndDate = newOrder.returnDate;
      const newStartTime = newOrder.pickupTime;
      const newEndTime = newOrder.returnTime;
      
      const existingStartDate = order.pickupDate;
      const existingEndDate = order.returnDate;
      const existingStartTime = order.pickupTime;
      const existingEndTime = order.returnTime;
      
      // 时间段优先级：morning=1, afternoon=2, evening=3
      const timeOrder = { morning: 1, afternoon: 2, evening: 3 };
      
      // 如果日期范围完全不重叠，则无冲突
      if (newEndDate < existingStartDate || newStartDate > existingEndDate) {
        return false;
      }
      
      // 如果日期范围有重叠，需要检查具体的时间段
      
      // 情况1：新订单结束日期早于现有订单开始日期
      if (newEndDate < existingStartDate) {
        return false;
      }
      
      // 情况2：新订单开始日期晚于现有订单结束日期
      if (newStartDate > existingEndDate) {
        return false;
      }
      
      // 情况3：新订单结束日期等于现有订单开始日期
      if (newEndDate === existingStartDate) {
        // 只有当新订单的结束时间段晚于或等于现有订单的开始时间段时才冲突
        return timeOrder[newEndTime] >= timeOrder[existingStartTime];
      }
      
      // 情况4：新订单开始日期等于现有订单结束日期
      if (newStartDate === existingEndDate) {
        // 只有当新订单的开始时间段早于或等于现有订单的结束时间段时才冲突
        return timeOrder[newStartTime] <= timeOrder[existingEndTime];
      }
      
      // 情况5：日期范围有真正的重叠（不只是边界相接）
      return true;
    } catch (error) {
      return false;
    }
  });
}