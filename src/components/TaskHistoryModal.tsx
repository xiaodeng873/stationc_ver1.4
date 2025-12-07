import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { isTaskScheduledForDate } from '../utils/taskScheduler';

interface TaskHistoryModalProps {
  task: any;
  patient: any;
  healthRecords: any[];
  initialDate?: Date | null;
  cutoffDateStr?: string;
  onClose: () => void;
  onDateSelect: (date: string) => void;
}

const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ 
  task, 
  patient, 
  healthRecords, 
  initialDate,
  cutoffDateStr,
  onClose, 
  onDateSelect 
}) => {
  // [安全檢查] 確保資料存在，防止崩潰
  if (!task || !patient) {
    return null;
  }

  const [currentDate, setCurrentDate] = useState(initialDate || new Date());

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

  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const checkDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasRecord = healthRecords.some(r => {
      if (r.task_id && r.task_id === task.id) return r.記錄日期 === dateStr;
      return r.院友id.toString() == task.patient_id.toString() && 
             r.記錄類型 === task.health_record_type && 
             r.記錄日期 === dateStr;
    });

    if (hasRecord) return 'completed';

    if (cutoffDateStr && dateStr <= cutoffDateStr) return 'none';
    if (checkDate > today) return 'future';

    const isScheduled = isTaskScheduledForDate(task, checkDate);

    if (isScheduled) {
      if (checkDate.getTime() === today.getTime()) return 'pending';
      return 'missed';
    }

    return 'none';
  };

  const renderCalendarDays = () => {
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let statusStyle = '';
      let dot = null;
      let isClickable = false;

      switch (status) {
        case 'completed':
          statusStyle = 'text-gray-400 cursor-default opacity-60';
          dot = <div className="w-1.5 h-1.5 rounded-full bg-green-500 mx-auto mt-1"></div>;
          break;
        case 'missed':
          statusStyle = 'hover:bg-red-50 cursor-pointer font-medium text-red-700 bg-red-50/30';
          dot = <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-auto mt-1"></div>;
          isClickable = true;
          break;
        case 'pending':
          statusStyle = 'hover:bg-blue-50 cursor-pointer font-medium text-blue-700';
          dot = <div className="w-1.5 h-1.5 rounded-full border border-blue-500 mx-auto mt-1"></div>;
          isClickable = true;
          break;
        case 'future':
        case 'none':
        default:
          statusStyle = 'text-gray-300 cursor-default';
          break;
      }

      days.push(
        <div 
          key={day} 
          onClick={() => {
            if (isClickable) {
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {patient?.中文姓氏}{patient?.中文名字} - {task?.health_record_type}
            </h3>
            <p className="text-xs text-gray-500">點擊紅色日期進行補錄</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

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

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-center space-x-4">
          <div className="flex items-center opacity-60"><div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>已完成</div>
          <div className="flex items-center text-red-600 font-medium"><div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>缺漏(可點)</div>
          <div className="flex items-center text-blue-600"><div className="w-2 h-2 rounded-full border border-blue-500 mr-1.5"></div>待辦</div>
        </div>
      </div>
    </div>
  );
};

export default TaskHistoryModal;