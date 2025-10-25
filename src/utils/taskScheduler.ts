import type { PatientHealthTask, FrequencyUnit } from '../lib/database';

// 判斷是否為文件任務
export function isDocumentTask(taskType: string): boolean {
  return taskType === '年度體檢' || taskType === '藥物自存同意書';
}

// 判斷是否為監測任務
export function isMonitoringTask(taskType: string): boolean {
  return taskType === '生命表徵' || taskType === '血糖控制' || taskType === '體重控制';
}

// 判斷是否為護理任務
export function isNursingTask(taskType: string): boolean {
  return taskType === '尿導管更換' || taskType === '鼻胃飼管更換' || taskType === '傷口換症';
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

// 解析時間字串（支援 HH:MM 和 藥物時間格式如 7A, 12N, 6P）
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  console.log('解析時間字串:', timeStr);
  
  // 先嘗試標準 HH:MM 格式
  const standardMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (standardMatch) {
    const result = {
      hours: parseInt(standardMatch[1]),
      minutes: parseInt(standardMatch[2])
    };
    console.log('標準格式解析結果:', result);
    return result;
  }
  
  // 嘗試藥物時間格式 (如 7A, 12N, 6P)
  const medicationMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([APN])$/);
  if (medicationMatch) {
    let hours = parseInt(medicationMatch[1]);
    const minutes = parseInt(medicationMatch[2] || '0');
    const period = medicationMatch[3];
    
    // 轉換為24小時制
    if (period === 'A' && hours === 12) hours = 0; // 12A = 00:xx
    if (period === 'P' && hours !== 12) hours += 12; // xP = (x+12):xx (除了12P)
    if (period === 'N') hours = 12; // 12N = 12:xx
    
    const result = { hours, minutes };
    console.log('藥物格式解析結果:', result);
    return result;
  }
  
  // 如果都無法解析，返回預設時間 08:00
  console.warn(`無法解析時間格式: ${timeStr}，使用預設時間 08:00`);
  return { hours: 8, minutes: 0 };
}

// 檢查任務是否逾期
export function isTaskOverdue(task: PatientHealthTask): boolean {
  // 如果任務沒有下次到期時間，表示已完成（非循環任務）
  if (!task.next_due_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    // 如果到期日期早於今天（不包括今天），且沒有完成記錄或完成時間早於到期時間，則為逾期
    if (dueDateOnly < nowDate) {
      if (!task.last_completed_at) {
        return true;
      }
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  
  // 監測任務：如果已完成且完成時間晚於或等於到期時間，則不算逾期
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) {
      return false;
    }
  }
  
  // 監測任務：只有當到期時間早於今天開始時間才算逾期（當天內的任務不算逾期）
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDate < todayStart;
}

// 檢查任務是否為未完成
export function isTaskPendingToday(task: PatientHealthTask): boolean {
  // 如果任務沒有下次到期時間，表示已完成（非循環任務）
  if (!task.next_due_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    // 如果到期日期是今天
    if (dueDateOnly.getTime() === todayStart.getTime()) {
      if (!task.last_completed_at) {
        return true;
      }
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  
  // 監測任務：如果已完成且完成時間晚於或等於到期時間，則不算待辦
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) {
      return false;
    }
  }
  
  // 檢查是否在今天到期（包括已過時間但仍在今天內的任務）
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  return dueDate >= todayStart && dueDate <= todayEnd;
}

// 檢查任務是否即將到期（文件任務：未來14天內；監測任務：未來24小時內，不包括今日）
export function isTaskDueSoon(task: PatientHealthTask): boolean {
  // 如果任務沒有下次到期時間，表示已完成（非循環任務）
  if (!task.next_due_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：檢查未來14天內（不包括今天，今天的任務歸類為"未完成"）
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const twoWeeksLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    if (dueDateOnly >= tomorrowStart && dueDateOnly <= twoWeeksLater) {
      if (!task.last_completed_at) {
        return true;
      }
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  
  // 監測任務：檢查是否即將到期
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    // 如果最後完成時間晚於或等於到期時間，則不算即將到期
    if (lastCompleted >= dueDate) {
      return false;
    }
  }
  
  // 檢查是否在未來24小時內到期（不包括今天和已逾期的）
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return dueDate >= tomorrowStart && dueDate <= next24Hours;
}

// 檢查任務是否為排程中（已完成或未來的任務）
export function isTaskScheduled(task: PatientHealthTask): boolean {
  // 如果任務沒有下次到期時間，表示已完成（非循環任務）
  if (!task.next_due_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    // 如果到期日期是未來（明天之後），則為排程中
    if (dueDateOnly > nowDate) {
      return true;
    }
    
    // 如果已完成且完成日期不早於到期日期，則為排程中
    if (task.last_completed_at) {
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate >= dueDateOnly;
    }
    
    return false;
  }
  
  // 監測任務：如果已完成且完成時間晚於或等於到期時間，則為排程中
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) {
      return true;
    }
  }
  
  // 未來的任務（明天之後）
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  // 如果是明天之後的任務，則為排程中
  if (dueDate >= tomorrowStart) {
    return true;
  }
  
  return false;
}

// 獲取任務狀態
export function getTaskStatus(task: PatientHealthTask): 'overdue' | 'pending' | 'due_soon' | 'scheduled' {
  if (isTaskOverdue(task)) {
    return 'overdue';
  } else if (isTaskPendingToday(task)) {
    return 'pending';
  } else if (isTaskDueSoon(task)) {
    return 'due_soon';
  } else {
    return 'scheduled';
  }
}

// 檢查約束物品評估是否逾期
export function isRestraintAssessmentOverdue(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  
  // 僅比較日期
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  return dueDateOnly < todayDate;
}

// 檢查約束物品評估是否即將到期（2週內）
export function isRestraintAssessmentDueSoon(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  
  // 僅比較日期
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const fourWeeksLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28);
  
  return dueDateOnly >= todayDate && dueDateOnly <= fourWeeksLater;
}

// 檢查健康評估是否逾期
export function isHealthAssessmentOverdue(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  
  // 僅比較日期
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  return dueDateOnly < todayDate;
}

// 檢查健康評估是否即將到期（1個月內）
export function isHealthAssessmentDueSoon(assessment: any): boolean {
  if (!assessment.next_due_date) return false;
  const today = new Date();
  const dueDate = new Date(assessment.next_due_date);
  
  // 僅比較日期
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const oneMonthLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  
  return dueDateOnly >= todayDate && dueDateOnly <= oneMonthLater;
}

// 獲取約束物品評估狀態
export function getRestraintStatus(assessment: any): 'overdue' | 'due_soon' | 'scheduled' {
  if (isRestraintAssessmentOverdue(assessment)) {
    return 'overdue';
  } else if (isRestraintAssessmentDueSoon(assessment)) {
    return 'due_soon';
  } else {
    return 'scheduled';
  }
}

// 獲取健康評估狀態
export function getHealthAssessmentStatus(assessment: any): 'overdue' | 'due_soon' | 'scheduled' {
  if (isHealthAssessmentOverdue(assessment)) {
    return 'overdue';
  } else if (isHealthAssessmentDueSoon(assessment)) {
    return 'due_soon';
  } else {
    return 'scheduled';
  }
}

// 格式化頻率描述
export function formatFrequencyDescription(task: PatientHealthTask): string {
  const { frequency_unit, frequency_value, specific_times, specific_days_of_week, specific_days_of_month } = task;

  switch (frequency_unit) {
    case 'daily':
      return frequency_value === 1 ? '每日' : `每 ${frequency_value} 天`;

    case 'weekly':
      if (specific_days_of_week.length > 0 && !isDocumentTask(task.health_record_type)) {
        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const days = specific_days_of_week.map(day => {
          // 確保 day 是有效的數字且在 1-7 範圍內
          if (day >= 1 && day <= 7) {
            // 資料庫中：1=週一, 2=週二, ..., 6=週六, 7=週日
            // dayNames 陣列：0=週日, 1=週一, ..., 6=週六
            return dayNames[day === 7 ? 0 : day];
          }
          return null;
        }).filter(Boolean).join(', ');
        return frequency_value === 1 ? `每週 ${days}` : `每 ${frequency_value} 週 ${days}`;
      }
      return frequency_value === 1 ? '每週' : `每 ${frequency_value} 週`;

    case 'monthly':
      if (specific_days_of_month.length > 0 && !isDocumentTask(task.health_record_type)) {
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