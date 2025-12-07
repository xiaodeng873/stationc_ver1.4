import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, AlertCircle } from 'lucide-react';
import { isMonitoringTask } from '../utils/taskScheduler';

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

  // 取得當月天數
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // 取得當月第一天是星期幾
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // [核心邏輯] 判斷某一天是否應該有任務 (紅點邏輯)
  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const checkDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 檢查是否有記錄 (綠點)
    // 這裡同時比對 task_id (新記錄) 和 patient+type+date (舊兼容)
    const hasRecord = healthRecords.some(r => {
      if (r.task_id === task.id) return r.記錄日期 === dateStr;
      return r.院友id.toString() === task.patient_id && 
             r.記錄類型 === task.health_record_type && 
             r.記錄日期 === dateStr;
    });

    if (hasRecord) return 'completed';

    // 2. 如果是未來日期，顯示空白
    if (checkDate > today) return 'future';

    // 3. 檢查是否"應該"有任務 (紅點)
    let isScheduled = false;

    if (task.frequency_unit === 'daily') {
      isScheduled = true;
    } else if (task.frequency_unit === 'weekly') {
      // 如果有指定星期幾 (DB: 1=Mon...7=Sun)
      if (task.specific_days_of_week && task.specific_days_of_week.length > 0) {
         const jsDay = checkDate.getDay(); // JS: 0=Sun...6=Sat
         const dbDay = jsDay === 0 ? 7 : jsDay;
         isScheduled = task.specific_days_of_week.includes(dbDay);
      } else {
         // [優化] 如果是每週一次但沒指定星期，不顯示紅點，避免"每天都紅"的誤導
         isScheduled = false; 
      }
    } else if (task.frequency_unit === 'monthly') {
       if (task.specific_days_of_month && task.specific_days_of_month.length > 0) {
         isScheduled = task.specific_days_of_month.includes(day);
       }
    }

    // 只有在"應該做"且"未做"且"不是今天"的情況下才顯示缺漏紅點
    // 今天未做顯示為"待辦"
    if (isScheduled) {
      if (checkDate.getTime() === today.getTime()) return 'pending'; // 今天待辦
      return 'missed'; // 過去缺漏
    }

    return 'none';
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // 空白填充 (上個月)
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 sm:h-12"></div>);
    }

    // 當月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const status = getDayStatus(day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let statusStyle = '';
      let icon = null;

      switch (status) {
        case 'completed':
          statusStyle = 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
          icon = <div className="w-1.5 h-1.5 rounded-full bg-green-500 mx-auto mt-1"></div>;
          break;
        case 'missed':
          statusStyle = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-bold';
          icon = <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-auto mt-1"></div>;
          break;
        case 'pending': // 今天待辦
          statusStyle = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
          icon = <div className="w-1.5 h-1.5 rounded-full border border-blue-500 mx-auto mt-1"></div>;
          break;
        case 'future':
          statusStyle = 'text-gray-300 cursor-default';
          break;
        default: // 無排程
          statusStyle = 'text-gray-500 hover:bg-gray-50';
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
          className={`
            h-10 sm:h-12 flex flex-col items-center justify-center rounded-lg border text-sm transition-colors cursor-pointer relative
            ${status === 'future' ? 'border-transparent' : 'border-transparent'}
            ${statusStyle}
          `}
        >
          <span>{day}</span>
          {icon}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {patient.中文姓氏}{patient.中文名字} - {task.health_record_type}
            </h3>
            <p className="text-xs text-gray-500">補錄/歷史記錄</p>
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
            <span className="font-medium text-gray-900">
              {year}年 {month + 1}月
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-center space-x-4">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
            已完成
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>
            缺漏/應做
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full border border-blue-500 mr-1.5"></div>
            今日待辦
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskHistoryModal;