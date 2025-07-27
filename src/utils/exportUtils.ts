import { RentalOrder } from '../types';

export function exportToExcel(orders: RentalOrder[]): void {
  const headers = [
    '订单ID',
    '相机型号',
    '相机编号',
    '租借人',
    '客服号',
    '销售人员',
    '取机时间',
    '还机时间',
    '定金状态',
    '备注',
    '创建时间'
  ];

  const timeMap = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚上'
  };

  const csvContent = [
    headers.join(','),
    ...orders.map(order => [
      order.id,
      order.cameraModel,
      order.cameraSerialNumber,
      order.renterName,
      order.customerService,
      order.salesperson,
      `${order.pickupDate} ${timeMap[order.pickupTime]}`,
      `${order.returnDate} ${timeMap[order.returnTime]}`,
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