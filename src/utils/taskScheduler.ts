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

// [核心修正] 判斷某一天是否應該有任務
export function isTaskScheduledForDate(task: any, date: Date): boolean {
  // 1. 每日任務：需考慮頻率數值 (例如每 2 天)
  if (task.frequency_unit === 'daily') {
    const freqValue = task.frequency_value || 1;
    
    // 如果是「每天」，則每天都回傳 true
    if (freqValue === 1) return true;

    // 如果是「每 X 天」，需要一個基準日來計算週期
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    let anchorDate: Date | null = null;

    // [關鍵修正] 優先使用 last_completed_at 作為基準點 (針對未來/未完成的日期)
    // 這確保了如果用戶在 2號 做了(打破規律)，下次會自動變 4號，而不是死板的 3號
    if (task.last_completed_at) {
       const lastCompleted = new Date(task.last_completed_at);
       lastCompleted.setHours(0, 0, 0, 0);
       
       // 只有當目標日期在最後完成日「之後」，才使用它作為基準
       if (targetDate > lastCompleted) {
         anchorDate = lastCompleted;
       }
    }

    // 如果沒有 last_completed_at 或目標日期在它之前 (檢查歷史)，退回使用 created_at
    if (!anchorDate && task.created_at) {
      anchorDate = new Date(task.created_at);
      anchorDate.setHours(0, 0, 0, 0);
    }
    
    if (anchorDate) {
      // 計算相差天數
      const diffTime = targetDate.getTime() - anchorDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // 1. diffDays 必須 >= 0 (不能早於基準日)
      // 2. 能夠被頻率整除
      return diffDays >= 0 && diffDays % freqValue === 0;
    }
    
    return false;
  }
  
  // 2. 每週任務：檢查特定星期
  if (task.frequency_unit === 'weekly') {
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
    return fromDate || new Date(); 
  }

  let nextDueDate = new Date(fromDate || new Date());

  switch (task.frequency_unit) {
    case 'daily':
      nextDueDate.setDate(nextDueDate.getDate() + (task.frequency_value || 1));
      break;
    case 'weekly':
      if (task.specific_days_of_week && task.specific_days_of_week.length > 0) {
        const currentDayOfWeek = nextDueDate.getDay();
        const targetDays = task.specific_days_of_week.map(day => day === 7 ? 0 : day);
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
          nextDueDate.setDate(nextDueDate.getDate() + 7);
        }
      } else {
        nextDueDate.setDate(nextDueDate.getDate() + (task.frequency_value || 1) * 7);
      }
      break;
    case 'monthly':
      if (task.specific_days_of_month && task.specific_days_of_month.length > 0) {
        const currentDate = nextDueDate.getDate();
        const currentMonth = nextDueDate.getMonth();
        const futureTargetDays = task.specific_days_of_month.filter(day => day > currentDate);
        
        if (futureTargetDays.length > 0) {
          const nextTargetDay = Math.min(...futureTargetDays);
          nextDueDate.setDate(nextTargetDay);
        } else {
          nextDueDate.setMonth(currentMonth + (task.frequency_value || 1));
          const nextTargetDay = Math.min(...task.specific_days_of_month);
          nextDueDate.setDate(nextTargetDay);
        }
      } else {
        nextDueDate.setMonth(nextDueDate.getMonth() + (task.frequency_value || 1));
      }
      break;
    case 'yearly':
      nextDueDate.setFullYear(nextDueDate.getFullYear() + (task.frequency_value || 1));
      break;
    default:
      nextDueDate.setDate(nextDueDate.getDate() + 1);
  }

  if (task.specific_times && task.specific_times.length > 0) {
    const timeStr = task.specific_times[0];
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      nextDueDate.setHours(hours, minutes, 0, 0);
    }
  } else if (isMonitoringTask(task.health_record_type)) {
    nextDueDate.setHours(8, 0, 0, 0);
  }

  return nextDueDate;
}

// 補回其他函式以避免錯誤
export function isTaskOverdue(task: PatientHealthTask): boolean {
  if (!task.next_due_at) return false;
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  if (isDocumentTask(task.health_record_type)) {
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    if (dueDateOnly < nowDate) {
      if (!task.last_completed_at) return true;
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) return false;
  }
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDate < todayStart;
}

export function isTaskPendingToday(task: PatientHealthTask): boolean {
  if (!task.next_due_at) return false;
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  if (isDocumentTask(task.health_record_type)) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    if (dueDateOnly.getTime() === todayStart.getTime()) {
      if (!task.last_completed_at) return true;
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) return false;
  }
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return dueDate >= todayStart && dueDate <= todayEnd;
}

export function isTaskDueSoon(task: PatientHealthTask): boolean {
  if (!task.next_due_at) return false;
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  if (isDocumentTask(task.health_record_type)) {
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const twoWeeksLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    if (dueDateOnly >= tomorrowStart && dueDateOnly <= twoWeeksLater) {
      if (!task.last_completed_at) return true;
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) return false;
  }
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return dueDate >= tomorrowStart && dueDate <= next24Hours;
}

export function isTaskScheduled(task: PatientHealthTask): boolean {
  if (!task.next_due_at) return false;
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  if (isDocumentTask(task.health_record_type)) {
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    if (dueDateOnly > nowDate) return true;
    if (task.last_completed_at) {
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate >= dueDateOnly;
    }
    return false;
  }
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) return true;
  }
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dueDate >= tomorrowStart) return true;
  return false;
}

export function getTaskStatus(task: PatientHealthTask): 'overdue' | 'pending' | 'due_soon' | 'scheduled' {
  if (isTaskOverdue(task)) return 'overdue';
  if (isTaskPendingToday(task)) return 'pending';
  if (isTaskDueSoon(task)) return 'due_soon';
  return 'scheduled';
}

export function isRestraintAssessmentOverdue(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return dueDateOnly < todayDate;
}

export function isRestraintAssessmentDueSoon(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const fourWeeksLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28);
  return dueDateOnly >= todayDate && dueDateOnly <= fourWeeksLater;
}

export function isHealthAssessmentOverdue(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return dueDateOnly < todayDate;
}

export function isHealthAssessmentDueSoon(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const oneMonthLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  return dueDateOnly >= todayDate && dueDateOnly <= oneMonthLater;
}

export function getRestraintStatus(assessment: any): 'overdue' | 'due_soon' | 'scheduled' {
  if (isRestraintAssessmentOverdue(assessment)) return 'overdue';
  if (isRestraintAssessmentDueSoon(assessment)) return 'due_soon';
  return 'scheduled';
}

export function getHealthAssessmentStatus(assessment: any): 'overdue' | 'due_soon' | 'scheduled' {
  if (isHealthAssessmentOverdue(assessment)) return 'overdue';
  if (isHealthAssessmentDueSoon(assessment)) return 'due_soon';
  return 'scheduled';
}

export function formatFrequencyDescription(task: PatientHealthTask): string {
  const { frequency_unit, frequency_value, specific_days_of_week, specific_days_of_month } = task;
  switch (frequency_unit) {
    case 'daily':
      return frequency_value === 1 ? '每日' : `每 ${frequency_value} 天`;
    case 'weekly':
      if (specific_days_of_week && specific_days_of_week.length > 0 && !isDocumentTask(task.health_record_type)) {
        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const days = specific_days_of_week.map(day => {
          if (day >= 1 && day <= 7) return dayNames[day === 7 ? 0 : day];
          return null;
        }).filter(Boolean).join(', ');
        return frequency_value === 1 ? `每週 ${days}` : `每 ${frequency_value} 週 ${days}`;
      }
      return frequency_value === 1 ? '每週' : `每 ${frequency_value} 週`;
    case 'monthly':
      if (specific_days_of_month && specific_days_of_month.length > 0 && !isDocumentTask(task.health_record_type)) {
        const dates = specific_days_of_month.join(', ');
        return frequency_value === 1 ? `每月 ${dates} 號` : `每 ${frequency_value} 個月 ${dates} 號`;
      }
      return frequency_value === 1 ? '每月' : `每 ${frequency_value} 個月`;
    case 'yearly':
      return frequency_value === 1 ? '每年' : `每 ${frequency_value} 年`;
    default:
      return '未知頻率';
  }
}