/**
 * VMO 排程到期檢查工具
 * 用於檢查年度體檢和約束物品評估的到期狀態
 */

import type { Patient, PatientRestraintAssessment, ScheduleWithDetails } from '../lib/database';

export interface DueItem {
  patient: Patient;
  dueDate: string;
  lastCheckDate: string | null;
  daysUntilDue: number;
  isScheduled: boolean;
  type: 'annual_health_checkup' | 'restraint_assessment';
  displayText: string;
}

/**
 * 檢查年度體檢是否即將到期
 * @param patient 院友資料
 * @param lastCheckupDate 最後一次年度體檢日期
 * @param schedules 現有排程列表
 * @param reminderDays 提醒閾值（天數），預設 14 天
 * @returns DueItem 或 null
 */
export const checkAnnualHealthCheckupDue = (
  patient: Patient,
  lastCheckupDate: string | null,
  schedules: ScheduleWithDetails[],
  reminderDays: number = 14
): DueItem | null => {
  // 如果沒有上次體檢記錄，預設從入住日期起算
  let baseDate: Date;
  if (lastCheckupDate) {
    baseDate = new Date(lastCheckupDate);
  } else if (patient.入住日期) {
    baseDate = new Date(patient.入住日期);
  } else {
    // 沒有任何參考日期，無法計算
    return null;
  }

  // 計算到期日（12 個月後）
  const dueDate = new Date(baseDate);
  dueDate.setMonth(dueDate.getMonth() + 12);

  // 計算距離到期的天數
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 只在提醒閾值內才返回
  if (daysUntilDue > reminderDays || daysUntilDue < 0) {
    return null;
  }

  // 檢查是否已在排程中安排
  const isScheduled = isScheduledInUpcomingSchedules(
    patient.院友id,
    '年度體檢',
    schedules,
    dueDateOnly
  );

  const displayText = `[${patient.床號}] ${patient.中文姓氏}${patient.中文名字} - 年度體檢即將到期 (到期日: ${formatDate(dueDate)}, 剩餘 ${daysUntilDue} 天)`;

  return {
    patient,
    dueDate: dueDate.toISOString().split('T')[0],
    lastCheckDate: lastCheckupDate,
    daysUntilDue,
    isScheduled,
    type: 'annual_health_checkup',
    displayText
  };
};

/**
 * 檢查約束物品評估是否即將到期
 * @param patient 院友資料
 * @param lastAssessment 最後一次約束評估記錄
 * @param schedules 現有排程列表
 * @param reminderDays 提醒閾值（天數），預設 14 天
 * @returns DueItem 或 null
 */
export const checkRestraintAssessmentDue = (
  patient: Patient,
  lastAssessment: PatientRestraintAssessment | null,
  schedules: ScheduleWithDetails[],
  reminderDays: number = 14
): DueItem | null => {
  if (!lastAssessment) {
    return null;
  }

  // 使用 next_due_date 欄位，如果沒有則從 doctor_signature_date 計算 6 個月後
  let dueDate: Date;
  if (lastAssessment.next_due_date) {
    dueDate = new Date(lastAssessment.next_due_date);
  } else if (lastAssessment.doctor_signature_date) {
    const signatureDate = new Date(lastAssessment.doctor_signature_date);
    dueDate = new Date(signatureDate);
    dueDate.setMonth(dueDate.getMonth() + 6);
  } else {
    // 沒有足夠資訊計算到期日
    return null;
  }

  // 計算距離到期的天數
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateOnly = new Date(dueDate);
  dueDateOnly.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 只在提醒閾值內才返回
  if (daysUntilDue > reminderDays || daysUntilDue < 0) {
    return null;
  }

  // 檢查是否已在排程中安排
  const isScheduled = isScheduledInUpcomingSchedules(
    patient.院友id,
    '約束物品評估',
    schedules,
    dueDateOnly
  );

  const lastCheckDate = lastAssessment.doctor_signature_date || lastAssessment.created_at;
  const displayText = `[${patient.床號}] ${patient.中文姓氏}${patient.中文名字} - 約束物品評估即將到期 (到期日: ${formatDate(dueDate)}, 剩餘 ${daysUntilDue} 天)`;

  return {
    patient,
    dueDate: dueDate.toISOString().split('T')[0],
    lastCheckDate,
    daysUntilDue,
    isScheduled,
    type: 'restraint_assessment',
    displayText
  };
};

/**
 * 檢查某院友的某項目是否已在到期日或之前的排程中安排
 * @param patientId 院友 ID
 * @param reason 看診原因
 * @param schedules 排程列表
 * @param dueDate 到期日
 * @returns 是否已安排
 */
const isScheduledInUpcomingSchedules = (
  patientId: number,
  reason: string,
  schedules: ScheduleWithDetails[],
  dueDate: Date
): boolean => {
  // 過濾出到期日或之前的排程
  const relevantSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.到診日期);
    scheduleDate.setHours(0, 0, 0, 0);
    return scheduleDate <= dueDate;
  });

  // 檢查這些排程中是否有該院友的該項目
  for (const schedule of relevantSchedules) {
    const patientInSchedule = schedule.院友列表.find(item => item.院友id === patientId);
    if (patientInSchedule && patientInSchedule.reasons) {
      const hasReason = patientInSchedule.reasons.some(r => r.原因名稱 === reason);
      if (hasReason) {
        return true;
      }
    }
  }

  return false;
};

/**
 * 格式化日期為 YYYY-MM-DD
 * @param date 日期對象
 * @returns 格式化的日期字串
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
