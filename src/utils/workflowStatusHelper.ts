/**
 * 藥物工作流程狀態輔助函數
 * 用於檢查和計算工作流程的逾期和未完成狀態
 */

interface WorkflowRecord {
  id: string;
  prescription_id: string;
  patient_id: number;
  scheduled_date: string;
  scheduled_time: string;
  preparation_status: 'pending' | 'completed' | 'failed';
  verification_status: 'pending' | 'completed' | 'failed';
  dispensing_status: 'pending' | 'completed' | 'failed';
  [key: string]: any;
}

interface Prescription {
  id: string;
  preparation_method?: string;
  [key: string]: any;
}

/**
 * 檢查單個工作流程記錄是否逾期未完成
 * @param record 工作流程記錄
 * @returns 是否逾期未完成
 */
export const isWorkflowOverdue = (record: WorkflowRecord): boolean => {
  // 只有派藥狀態為 pending 才需要檢查
  if (record.dispensing_status !== 'pending') {
    return false;
  }

  // 組合日期和時間
  const scheduledDateTime = new Date(`${record.scheduled_date}T${record.scheduled_time}`);
  const now = new Date();

  // 如果排程時間已經過去，則視為逾期
  return scheduledDateTime < now;
};

/**
 * 檢查特定日期是否有逾期未完成的流程
 * @param records 所有工作流程記錄
 * @param targetDate 目標日期（格式：YYYY-MM-DD）
 * @returns 是否有逾期未完成的流程
 */
export const hasOverdueWorkflowOnDate = (
  records: WorkflowRecord[],
  targetDate: string
): boolean => {
  const recordsOnDate = records.filter(r => r.scheduled_date === targetDate);
  return recordsOnDate.some(isWorkflowOverdue);
};

/**
 * 計算每個日期的逾期未完成流程數量
 * @param records 所有工作流程記錄
 * @param dates 日期列表
 * @returns 日期到逾期數量的映射
 */
export const calculateOverdueCountByDate = (
  records: WorkflowRecord[],
  dates: string[]
): Map<string, number> => {
  const countMap = new Map<string, number>();

  dates.forEach(date => {
    const recordsOnDate = records.filter(r => r.scheduled_date === date);
    const overdueCount = recordsOnDate.filter(isWorkflowOverdue).length;
    countMap.set(date, overdueCount);
  });

  return countMap;
};

/**
 * 檢查特定備藥方式的處方是否有逾期未完成的流程
 * @param records 所有工作流程記錄
 * @param prescriptions 所有處方
 * @param preparationMethod 備藥方式（'advanced', 'immediate', 或 null 表示所有）
 * @returns 是否有逾期未完成的流程
 */
export const hasOverdueWorkflowByPreparationMethod = (
  records: WorkflowRecord[],
  prescriptions: Prescription[],
  preparationMethod: 'advanced' | 'immediate' | null = null
): boolean => {
  // 如果指定了備藥方式，先過濾處方
  let filteredPrescriptionIds: Set<string>;

  if (preparationMethod) {
    filteredPrescriptionIds = new Set(
      prescriptions
        .filter(p => p.preparation_method === preparationMethod)
        .map(p => p.id)
    );
  } else {
    filteredPrescriptionIds = new Set(prescriptions.map(p => p.id));
  }

  // 過濾相關的工作流程記錄
  const relevantRecords = records.filter(r =>
    filteredPrescriptionIds.has(r.prescription_id)
  );

  // 檢查是否有逾期未完成的記錄
  return relevantRecords.some(isWorkflowOverdue);
};

/**
 * 計算每個備藥方式的逾期未完成流程數量
 * @param records 所有工作流程記錄
 * @param prescriptions 所有處方
 * @returns 備藥方式到逾期數量的映射
 */
export const calculateOverdueCountByPreparationMethod = (
  records: WorkflowRecord[],
  prescriptions: Prescription[]
): {
  all: number;
  advanced: number;
  immediate: number;
} => {
  const prescriptionMap = new Map(prescriptions.map(p => [p.id, p]));

  let allCount = 0;
  let advancedCount = 0;
  let immediateCount = 0;

  records.forEach(record => {
    if (isWorkflowOverdue(record)) {
      allCount++;

      const prescription = prescriptionMap.get(record.prescription_id);
      if (prescription) {
        if (prescription.preparation_method === 'advanced') {
          advancedCount++;
        } else if (prescription.preparation_method === 'immediate') {
          immediateCount++;
        }
      }
    }
  });

  return {
    all: allCount,
    advanced: advancedCount,
    immediate: immediateCount
  };
};

/**
 * 獲取所有有逾期未完成流程的院友列表（用於主面板提醒）
 * @param records 所有工作流程記錄
 * @param patients 所有院友
 * @returns 有逾期流程的院友及其逾期數量
 */
export const getPatientsWithOverdueWorkflow = (
  records: WorkflowRecord[],
  patients: any[]
): Array<{ patient: any; overdueCount: number; overdueRecords: WorkflowRecord[] }> => {
  const patientOverdueMap = new Map<number, WorkflowRecord[]>();

  // 收集每個院友的逾期記錄
  records.forEach(record => {
    if (isWorkflowOverdue(record)) {
      const patientId = record.patient_id;
      if (!patientOverdueMap.has(patientId)) {
        patientOverdueMap.set(patientId, []);
      }
      patientOverdueMap.get(patientId)!.push(record);
    }
  });

  // 轉換為結果數組，並關聯院友資料
  const result: Array<{ patient: any; overdueCount: number; overdueRecords: WorkflowRecord[] }> = [];

  patientOverdueMap.forEach((overdueRecords, patientId) => {
    const patient = patients.find(p => parseInt(p.院友id) === patientId);
    if (patient && patient.在住狀態 === '在住') {
      result.push({
        patient,
        overdueCount: overdueRecords.length,
        overdueRecords
      });
    }
  });

  // 按逾期數量降序排序
  result.sort((a, b) => b.overdueCount - a.overdueCount);

  return result;
};
