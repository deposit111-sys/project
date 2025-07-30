import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className={`relative bg-gradient-to-br ${color} rounded-2xl shadow-xl p-6 border-l-4 ${color.split(' ')[0]} transform hover:scale-105 transition-all duration-300 overflow-hidden group hover:shadow-2xl`}>
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-125 transition-transform duration-700"></div>
      
      <div className="flex items-center justify-between">
        <div className="relative z-10">
          <p className="text-sm text-gray-600 mb-2 font-medium">{title}</p>
          <p className="text-4xl font-bold text-gray-800 group-hover:scale-110 transition-transform duration-300">{value}</p>
        </div>
        <div className={`relative z-10 p-4 rounded-2xl ${color.replace('border-', 'bg-').replace('-500', '-100')} shadow-lg group-hover:rotate-12 group-hover:scale-110 transition-all duration-300`}>
          <Icon className={`h-8 w-8 ${color.replace('border-', 'text-')} group-hover:animate-pulse`} />
        </div>
      </div>
    </div>
  );
}