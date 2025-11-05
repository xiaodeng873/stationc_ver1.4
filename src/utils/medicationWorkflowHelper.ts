import { supabase } from '../lib/supabase';

export interface WorkflowRecord {
  id: string;
  prescription_id: string;
  patient_id: number;
  scheduled_date: string;
  scheduled_time: string;
  preparation_status: 'pending' | 'completed' | 'failed';
  verification_status: 'pending' | 'completed' | 'failed';
  dispensing_status: 'pending' | 'completed' | 'failed';
  preparation_staff?: string;
  verification_staff?: string;
  dispensing_staff?: string;
  preparation_time?: string;
  verification_time?: string;
  dispensing_time?: string;
  dispensing_failure_reason?: string;
  custom_failure_reason?: string;
  inspection_check_result?: any;
  notes?: string;
}

export interface StaffCodeMapping {
  [staffName: string]: string;
}

const RESERVED_CODES = ['A', 'S', 'R', 'O'];

export const getAvailableStaffCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 66; i <= 90; i++) {
    const code = String.fromCharCode(i);
    if (!RESERVED_CODES.includes(code)) {
      codes.push(code);
    }
  }
  return codes;
};

export const generateStaffCodeMapping = (staffNames: string[]): StaffCodeMapping => {
  const uniqueStaffNames = [...new Set(staffNames)].filter(name => name && name.trim());
  const availableCodes = getAvailableStaffCodes();
  const mapping: StaffCodeMapping = {};

  console.log('[generateStaffCodeMapping] 輸入人員姓名數量:', staffNames.length);
  console.log('[generateStaffCodeMapping] 去重後人員數量:', uniqueStaffNames.length);
  console.log('[generateStaffCodeMapping] 可用代號數量:', availableCodes.length);

  uniqueStaffNames.forEach((name, index) => {
    if (index < availableCodes.length) {
      mapping[name] = availableCodes[index];
      console.log(`  [映射] ${name} → ${availableCodes[index]}`);
    } else {
      console.warn(`  [警告] 人員 "${name}" 超出可用代號範圍 (index=${index})`);
    }
  });

  console.log('[generateStaffCodeMapping] 生成映射完成，共', Object.keys(mapping).length, '個人員');

  return mapping;
};

export const formatStaffCodeNotation = (staffCodeMapping: StaffCodeMapping): { line1: string; line2: string } => {
  const entries = Object.entries(staffCodeMapping);
  const formatted = entries.map(([name, code]) => `${name}=${code}`);

  const maxLine1Length = 5;
  const line1Items = formatted.slice(0, maxLine1Length);
  const line2Items = formatted.slice(maxLine1Length);

  return {
    line1: line1Items.join(', '),
    line2: line2Items.join(', ')
  };
};

export const fetchWorkflowRecordsForMonth = async (
  patientId: number,
  prescriptionIds: string[],
  yearMonth: string
): Promise<WorkflowRecord[]> => {
  try {
    const [year, month] = yearMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

    console.log(`查詢執核派記錄: 院友 ${patientId}, 處方 ${prescriptionIds.length} 個, 日期範圍 ${startDate} ~ ${endDate}`);

    const { data, error } = await supabase
      .from('medication_workflow_records')
      .select('*')
      .eq('patient_id', patientId)
      .in('prescription_id', prescriptionIds)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('查詢執核派記錄失敗:', error);
      throw error;
    }

    console.log(`查詢到 ${data?.length || 0} 條執核派記錄`);
    return data || [];
  } catch (error) {
    console.error('fetchWorkflowRecordsForMonth 錯誤:', error);
    return [];
  }
};

export const getWorkflowRecordForPrescriptionDateTimeSlot = (
  workflowRecords: WorkflowRecord[],
  prescriptionId: string,
  date: string,
  timeSlot: string
): WorkflowRecord | null => {
  // 標準化時間格式為 HH:MM
  const normalizeTime = (time: string): string => {
    if (!time) return '';
    return time.substring(0, 5); // 只取前5個字符 "HH:MM"
  };

  const normalizedTimeSlot = normalizeTime(timeSlot);

  console.log('[getWorkflowRecord] 查找條件:', {
    prescriptionId,
    date,
    timeSlot,
    normalizedTimeSlot,
    recordsCount: workflowRecords.length
  });

  const record = workflowRecords.find(
    r => {
      const matches =
        r.prescription_id === prescriptionId &&
        r.scheduled_date === date &&
        normalizeTime(r.scheduled_time) === normalizedTimeSlot;

      if (matches) {
        console.log('[getWorkflowRecord] 找到匹配記錄:', {
          recordId: r.id.substring(0, 8),
          prescription_id: r.prescription_id,
          scheduled_date: r.scheduled_date,
          scheduled_time: r.scheduled_time
        });
      }

      return matches;
    }
  );

  if (!record) {
    console.log('[getWorkflowRecord] 未找到記錄，檢查前3條記錄:',
      workflowRecords.slice(0, 3).map(r => ({
        prescription_id: r.prescription_id,
        scheduled_date: r.scheduled_date,
        scheduled_time: r.scheduled_time
      }))
    );
  }

  return record || null;
};

export const extractStaffNamesFromWorkflowRecords = (workflowRecords: WorkflowRecord[]): string[] => {
  const staffNames: string[] = [];
  let prepCount = 0, verifyCount = 0, dispenseCount = 0;
  let prepCompletedCount = 0, verifyCompletedCount = 0, dispenseCompletedCount = 0;

  workflowRecords.forEach(record => {
    if (record.preparation_staff) {
      prepCount++;
      if (record.preparation_status === 'completed') {
        prepCompletedCount++;
        staffNames.push(record.preparation_staff);
      }
    }
    if (record.verification_staff) {
      verifyCount++;
      if (record.verification_status === 'completed') {
        verifyCompletedCount++;
        staffNames.push(record.verification_staff);
      }
    }
    if (record.dispensing_staff) {
      dispenseCount++;
      if (record.dispensing_status === 'completed') {
        dispenseCompletedCount++;
        staffNames.push(record.dispensing_staff);
      }
    }
  });

  console.log('[extractStaffNamesFromWorkflowRecords] 統計:');
  console.log(`  執藥: ${prepCompletedCount}/${prepCount} 已完成`);
  console.log(`  核藥: ${verifyCompletedCount}/${verifyCount} 已完成`);
  console.log(`  派藥: ${dispenseCompletedCount}/${dispenseCount} 已完成`);
  console.log(`  提取到 ${staffNames.length} 個人員姓名 (含重複)`);

  return staffNames;
};

export const formatWorkflowCellContent = (
  workflowRecord: WorkflowRecord | null,
  staffCodeMapping: StaffCodeMapping
): string => {
  if (!workflowRecord) {
    return '';
  }

  if (workflowRecord.preparation_status === 'failed' ||
      workflowRecord.verification_status === 'failed' ||
      workflowRecord.dispensing_status === 'failed') {

    const reason = workflowRecord.dispensing_failure_reason;
    if (reason === '入院') return 'A';
    if (reason === '拒服') return 'R';
    if (reason === '其他' && workflowRecord.custom_failure_reason === '暫停') return 'O';
  }

  const prepStaffName = workflowRecord.preparation_staff;
  const verifyStaffName = workflowRecord.verification_staff;

  const isPrepCompleted = workflowRecord.preparation_status === 'completed';
  const isVerifyCompleted = workflowRecord.verification_status === 'completed';

  const prepStaff = isPrepCompleted && prepStaffName
    ? staffCodeMapping[prepStaffName] || ''
    : '';

  const verifyStaff = isVerifyCompleted && verifyStaffName
    ? staffCodeMapping[verifyStaffName] || ''
    : '';

  const prepStaffInMapping = prepStaffName ? (prepStaffName in staffCodeMapping) : false;
  const verifyStaffInMapping = verifyStaffName ? (verifyStaffName in staffCodeMapping) : false;

  console.log('[formatWorkflowCellContent]', {
    recordId: workflowRecord.id.substring(0, 8),
    prepStatus: workflowRecord.preparation_status,
    verifyStatus: workflowRecord.verification_status,
    prepStaffOriginal: prepStaffName,
    verifyStaffOriginal: verifyStaffName,
    prepStaffInMapping: prepStaffInMapping,
    verifyStaffInMapping: verifyStaffInMapping,
    prepStaffCode: prepStaff,
    verifyStaffCode: verifyStaff,
    finalResult: prepStaff && verifyStaff ? `${prepStaff}  ${verifyStaff}` : (prepStaff || verifyStaff || '')
  });

  if (prepStaff && verifyStaff) {
    return `${prepStaff}  ${verifyStaff}`;
  } else if (prepStaff) {
    return prepStaff;
  } else if (verifyStaff) {
    return verifyStaff;
  }

  return '';
};

export const formatDispenseCellContent = (
  workflowRecord: WorkflowRecord | null,
  staffCodeMapping: StaffCodeMapping
): string => {
  if (!workflowRecord) {
    return '';
  }

  if (workflowRecord.dispensing_status === 'failed') {
    const reason = workflowRecord.dispensing_failure_reason;
    if (reason === '入院') return 'A';
    if (reason === '拒服') return 'R';
    if (reason === '其他' && workflowRecord.custom_failure_reason === '暫停') return 'O';
  }

  const dispenseStaffName = workflowRecord.dispensing_staff;
  const isDispenseCompleted = workflowRecord.dispensing_status === 'completed';

  const dispenseStaff = isDispenseCompleted && dispenseStaffName
    ? staffCodeMapping[dispenseStaffName] || ''
    : '';

  const dispenseStaffInMapping = dispenseStaffName ? (dispenseStaffName in staffCodeMapping) : false;

  console.log('[formatDispenseCellContent]', {
    recordId: workflowRecord.id.substring(0, 8),
    dispenseStatus: workflowRecord.dispensing_status,
    dispenseStaffOriginal: dispenseStaffName,
    dispenseStaffInMapping: dispenseStaffInMapping,
    dispenseStaffCode: dispenseStaff,
    finalResult: dispenseStaff
  });

  return dispenseStaff;
};
