import { RentalOrder } from '../types';

export function exportToExcel(
  orders: RentalOrder[], 
  confirmedPickups: string[] = [], 
  confirmedReturns: string[] = []
): void {
  const headers = [
    '订单ID',
    '相机型号',
    '相机编号',
    '租借人',
    '客服号',
    '销售人员',
    '取机时间',
    '还机时间',
    '取机状态',
    '还机状态',
    '逾期天数',
    '实际还机日期',
    '定金状态',
    '备注',
    '创建时间'
  ];

  const timeMap = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚上'
  };

  // 获取当前日期用于判断状态
  const today = new Date().toISOString().split('T')[0];

  // 计算逾期天数
  const getOverdueDays = (order: RentalOrder): string => {
    if (confirmedReturns.includes(order.id)) {
      return ''; // 已还机，无逾期
    }
    if (!confirmedPickups.includes(order.id)) {
      return ''; // 未取机，无逾期
    }
    if (order.returnDate >= today) {
      return ''; // 未到还机日期，无逾期
    }
    
    const returnDate = new Date(order.returnDate);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - returnDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays}天` : '';
  };

  // 获取实际还机日期
  const getActualReturnDate = (order: RentalOrder): string => {
    if (confirmedReturns.includes(order.id)) {
      // 已还机，返回实际还机日期（今天）
      return today;
    }
    return ''; // 未还机
  };

  // 获取取机状态
  const getPickupStatus = (order: RentalOrder): string => {
    if (confirmedPickups.includes(order.id)) {
      return '已取机';
    }
    if (order.pickupDate < today) {
      return '未取机';
    } else if (order.pickupDate === today) {
      return '今日应取';
    }
    return '待取机';
  };

  // 获取还机状态
  const getReturnStatus = (order: RentalOrder): string => {
    // 如果还没有取机，还机状态应该是"未开始"
    if (!confirmedPickups.includes(order.id)) {
      return '未开始';
    }
    
    if (confirmedReturns.includes(order.id)) {
      return '已还机';
    }
    if (order.returnDate < today) {
      return '逾期未还';
    }
    if (order.returnDate === today) {
      return '今日应还';
    }
    return '租赁中';
  };
  const csvContent = [
    headers.join(','),
    ...orders.map((order, index) => [
      order.id,
      order.cameraModel,
      order.cameraSerialNumber,
      order.renterName,
      order.customerService,
      order.salesperson,
      `${order.pickupDate} ${timeMap[order.pickupTime]}`,
      `${order.returnDate} ${timeMap[order.returnTime]}`,
      getPickupStatus(order),
      getReturnStatus(order),
      getOverdueDays(order),
      getActualReturnDate(order),
      order.depositStatus,
      order.notes,
      new Date(order.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `相机租赁订单_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}