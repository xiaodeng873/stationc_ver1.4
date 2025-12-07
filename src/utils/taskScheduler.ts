import type { PatientHealthTask, FrequencyUnit } from '../lib/database';

// 判斷是否為文件任務
export function isDocumentTask(taskType: string): boolean {
  return taskType === '藥物自存同意書' || taskType === '晚晴計劃';
}

// 判斷是否為監測任務
export function isMonitoringTask(taskType: string): boolean {
  return taskType === '生命表徵' || taskType === '血糖控制' || taskType === '體重控制';
}

// 判斷是否為護理任務
export function isNursingTask(taskType: string): boolean {
  return taskType === '尿導管更換' || taskType === '鼻胃飼管更換' || taskType === '傷口換症';
}

// 判斷是否為晚晴計劃任務
export function isEveningCarePlanTask(taskType: string): boolean {
  return taskType === '晚晴計劃';
}

// [新增] 判斷某一天是否應該有任務 (共用邏輯)
export function isTaskScheduledForDate(task: any, date: Date): boolean {
  // 1. 每日任務：每天都要做
  if (task.frequency_unit === 'daily') return true;
  
  // 2. 每週任務：檢查特定星期
  if (task.frequency_unit === 'weekly') {
    // 如果有指定星期幾 (DB: 1=Mon...7=Sun)
    if (task.specific_days_of_week && task.specific_days_of_week.length > 0) {
       const day = date.getDay(); // JS: 0=Sun...6=Sat
       const dbDay = day === 0 ? 7 : day;
       return task.specific_days_of_week.includes(dbDay);
    }
    return false; 
  }

  // 3. 每月任務：檢查特定日期
  if (task.frequency_unit === 'monthly') {
     if (task.specific_days_of_month && task.specific_days_of_month.length > 0) {
       return task.specific_days_of_month.includes(date.getDate());
     }
  }

  return false;
}

export function calculateNextDueDate(task: PatientHealthTask, fromDate?: Date): Date {
  if (!task.is_recurring) {
    return fromDate || new Date(); // 非循環任務，返回記錄時間
  }

  let nextDueDate = new Date(fromDate || new Date());

  switch (task.frequency_unit) {
    case 'daily':
      nextDueDate.setDate(nextDueDate.getDate() + (task.frequency_value || 1));
      break;
    case 'weekly':
      // 處理週期任務：找到最近的未來指定星期幾
      if (task.specific_days_of_week && task.specific_days_of_week.length > 0) {
        // 獲取當前星期幾 (0=週日, 1=週一, ..., 6=週六)
        const currentDayOfWeek = nextDueDate.getDay();
        
        // 將資料庫中的星期值 (1-7) 轉換為 JavaScript 的星期值 (0-6)
        // 資料庫：1=週一, 2=週二, ..., 6=週六, 7=週日
        // JavaScript：0=週日, 1=週一, ..., 6=週六
        const targetDays = task.specific_days_of_week.map(day => day === 7 ? 0 : day);
        
        // 找到最近的未來目標星期幾
        let daysToAdd = null;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDayOfWeek + i) % 7;
          if (targetDays.includes(checkDay)) {
            daysToAdd = i;
            break;
          }
        }
        
        if (daysToAdd !== null) {
          nextDueDate.setDate(nextDueDate.getDate() + daysToAdd);
        } else {
          // 如果找不到目標星期幾，預設加7天
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        }
      } else {
        // 如果沒有指定星期幾，按頻率值加週數
        nextDueDate.setDate(nextDueDate.getDate() + (task.frequency_value || 1) * 7);
      }
      break;
    case 'monthly':
      // 處理月期任務
      if (task.specific_days_of_month && task.specific_days_of_month.length > 0) {
        // 找到最近的未來指定日期
        const currentDate = nextDueDate.getDate();
        const currentMonth = nextDueDate.getMonth();
        const currentYear = nextDueDate.getFullYear();
        
        // 在當前月份中找到最近的未來日期
        const futureTargetDays = task.specific_days_of_month.filter(day => day > currentDate);
        
        if (futureTargetDays.length > 0) {
          // 在當前月份中有未來的目標日期
          const nextTargetDay = Math.min(...futureTargetDays);
          nextDueDate.setDate(nextTargetDay);
        } else {
          // 當前月份沒有未來的目標日期，移到下個月
          nextDueDate.setMonth(currentMonth + (task.frequency_value || 1));
          const nextTargetDay = Math.min(...task.specific_days_of_month);
          nextDueDate.setDate(nextTargetDay);
        }
      } else {
        // 如果沒有指定日期，按頻率值加月數
        nextDueDate.setMonth(nextDueDate.getMonth() + (task.frequency_value || 1));
      }
      break;
    case 'yearly':
      nextDueDate.setFullYear(nextDueDate.getFullYear() + (task.frequency_value || 1));
      break;
    default:
      console.warn('未知的頻率單位:', task.frequency_unit);
      nextDueDate.setDate(nextDueDate.getDate() + 1); // 預設加一天
  }

  // 如果有特定時間，設置到下次到期時間
  if (task.specific_times && task.specific_times.length > 0) {
    const timeStr = task.specific_times[0];
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      nextDueDate.setHours(hours, minutes, 0, 0);
    }
  } else if (isMonitoringTask(task.health_record_type)) {
    // 監測任務預設時間為 08:00
    nextDueDate.setHours(8, 0, 0, 0);
  }

  return nextDueDate;
}