import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskHistoryModalProps {
  task: any;
  patient: any;
  healthRecords: any[];
  onClose: () => void;
  onDateSelect: (date: string) => void;
}

const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ 
  task, 
  patient, 
  healthRecords, 
  onClose, 
  onDateSelect 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // 判斷每一天的狀態
  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const checkDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 檢查是否有記錄 (綠點 - 已完成)
    const hasRecord = healthRecords.some(r => {
      if (r.task_id === task.id) return r.記錄日期 === dateStr;
      return r.院友id.toString() === task.patient_id && 
             r.記錄類型 === task.health_record_type && 
             r.記錄日期 === dateStr;
    });

    if (hasRecord) return 'completed';

    // 2. 未來日期不顯示狀態
    if (checkDate > today) return 'future';

    // 3. 檢查是否應該有任務 (紅點 - 缺漏)
    let isScheduled = false;

    if (task.frequency_unit === 'daily') {
      isScheduled = true;
    } else if (task.frequency_unit === 'weekly') {
      if (task.specific_days_of_week && task.specific_days_of_week.length > 0) {
         const jsDay = checkDate.getDay(); 
         const dbDay = jsDay === 0 ? 7 : jsDay;
         isScheduled = task.specific_days_of_week.includes(dbDay);
      } else {
         // 每週一次但沒指定星期，不顯示缺漏紅點
         isScheduled = false; 
      }
    } else if (task.frequency_unit === 'monthly') {
       if (task.specific_days_of_month && task.specific_days_of_month.length > 0) {
         isScheduled = task.specific_days_of_month.includes(day);
       }
    }

    if (isScheduled) {
      if (checkDate.getTime() === today.getTime()) return 'pending'; // 今天待辦
      return 'missed'; // 過去缺漏
    }

    return 'none';
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // 填充上個月空白
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // 渲染當月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let statusStyle = '';
      let dot = null;

      switch (status) {
        case 'completed':
          statusStyle = 'hover:bg-green-50 cursor-pointer';
          dot = <div className="w-1.5 h-1.5 rounded-full bg-green-500 mx-auto mt-1"></div>;
          break;
        case 'missed':
          statusStyle = 'hover:bg-red-50 cursor-pointer';
          dot = <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-auto mt-1"></div>;
          break;
        case 'pending':
          statusStyle = 'hover:bg-blue-50 cursor-pointer';
          dot = <div className="w-1.5 h-1.5 rounded-full border border-blue-500 mx-auto mt-1"></div>;
          break;
        case 'future':
          statusStyle = 'text-gray-300 cursor-default';
          break;
        default:
          statusStyle = 'text-gray-600 hover:bg-gray-50 cursor-pointer';
          break;
      }

      days.push(
        <div 
          key={day} 
          onClick={() => {
            if (status !== 'future') {
              onDateSelect(dateStr);
            }
          }}
          className={`h-10 flex flex-col items-center justify-center rounded-lg transition-colors ${statusStyle}`}
        >
          <span className="text-sm">{day}</span>
          {dot}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {patient.中文姓氏}{patient.中文名字} - {task.health_record_type}
            </h3>
            <p className="text-xs text-gray-500">點擊日期進行補錄</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar Controls */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="font-medium text-gray-900 text-sm">
              {year}年 {month + 1}月
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-center space-x-4">
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>已做</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>缺漏</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full border border-blue-500 mr-1.5"></div>待辦</div>
        </div>
      </div>
    </div>
  );
};

export default TaskHistoryModal;