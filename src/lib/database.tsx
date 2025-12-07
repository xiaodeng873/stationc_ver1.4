import { supabase } from './supabase';
import { calculateNextDueDate } from '../utils/taskScheduler';

// Core data types
export interface Patient {
  院友id: number;
  床號: string;
  中文姓名: string;
  中文姓氏: string;
  中文名字: string;
  英文姓名?: string;
  英文姓氏?: string;
  英文名字?: string;
  性別: '男' | '女';
  身份證號碼: string;
  出生日期?: string;
  院友相片?: string;
  藥物敏感?: string[];
  不良藥物反應?: string[];
  感染控制?: string[];
  入住日期?: string;
  退住日期?: string;
  護理等級?: '全護理' | '半護理' | '自理';
  入住類型?: '私位' | '買位' | '院舍卷' | '暫住';
  社會福利?: { type: string; subtype?: string };
  在住狀態?: '在住' | '待入住' | '已退住';
  station_id?: string;
  bed_id?: string;
  is_hospitalized?: boolean;
  discharge_reason?: '死亡' | '回家' | '留醫' | '轉往其他機構';
  death_date?: string;
  transfer_facility_name?: string;
  needs_medication_crushing?: boolean;
}

export interface Station {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Bed {
  id: string;
  station_id: string;
  bed_number: string;
  bed_name?: string;
  is_occupied: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  排程id: number;
  到診日期: string;
}

export interface ScheduleDetail {
  細項id: number;
  排程id: number;
  院友id: number;
  症狀說明?: string;
  備註?: string;
  reasons?: ServiceReason[];
}

export interface ServiceReason {
  原因id: number;
  原因名稱: string;
}

export interface Prescription {
  處方id: number;
  院友id: number;
  藥物來源: string;
  處方日期: string;
  藥物名稱: string;
  劑型?: string;
  服用途徑?: string;
  服用份量?: string;
  服用次數?: string;
  服用日數?: string;
  需要時: boolean;
  服用時間: string[];
}

// [修改] 這裡加入了 task_id 欄位，用於雙向綁定
export interface HealthRecord {
  記錄id: number;
  院友id: number;
  task_id?: string; // 新增：關聯的任務ID
  記錄日期: string;
  記錄時間: string;
  記錄類型: '生命表徵' | '血糖控制' | '體重控制';
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  呼吸頻率?: number;
  血糖值?: number;
  體重?: number;
  備註?: string;
  記錄人員?: string;
  created_at?: string;
}

export interface DeletedHealthRecord {
  id: string;
  original_record_id: number;
  院友id: number;
  記錄日期: string;
  記錄時間: string;
  記錄類型: '生命表徵' | '血糖控制' | '體重控制';
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  呼吸頻率?: number;
  血糖值?: number;
  體重?: number;
  備註?: string;
  記錄人員?: string;
  created_at?: string;
  deleted_at: string;
  deleted_by?: string;
  deletion_reason: string;
}

export interface DuplicateRecordGroup {
  key: string;
  records: HealthRecord[];
  keepRecord: HealthRecord;
  duplicateRecords: HealthRecord[];
}

export interface FollowUpAppointment {
  覆診id: string;
  院友id: number;
  覆診日期: string;
  出發時間?: string;
  覆診時間?: string;
  覆診地點?: string;
  覆診專科?: string;
  交通安排?: string;
  陪診人員?: string;
  備註?: string;
  狀態: '尚未安排' | '已安排' | '已完成' | '改期' | '取消';
  創建時間: string;
  更新時間: string;
}

export type MealCombinationType = '正飯+正餸' | '正飯+碎餸' | '正飯+糊餸' | '軟飯+正餸' | '軟飯+碎餸' | '軟飯+糊餸' | '糊飯+糊餸';
export type SpecialDietType = '糖尿餐' | '痛風餐' | '低鹽餐' | '鼻胃飼' | '雞蛋';

export interface MealGuidance {
  id: string;
  patient_id: number;
  meal_combination: MealCombinationType;
  special_diets: SpecialDietType[];
  needs_thickener: boolean;
  thickener_amount?: string;
  egg_quantity?: number;
  remarks?: string;
  guidance_date?: string;
  guidance_source?: string;
  created_at: string;
  updated_at: string;
}

export type HealthTaskType = '生命表徵' | '血糖控制' | '體重控制' | '約束物品同意書' | '年度體檢' | '導尿管更換' | '鼻胃飼管更換' | '傷口換症' | '藥物自存同意書' | '晚晴計劃' | '氧氣喉管清洗/更換';
export type FrequencyUnit = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PatientHealthTask {
  id: string;
  patient_id: number;
  health_record_type: HealthTaskType;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  specific_times?: string[];
  specific_days_of_week?: number[];
  specific_days_of_month?: number[];
  last_completed_at?: string;
  next_due_at: string;
  notes?: string;
  is_recurring?: boolean;
  end_date?: string;
  end_time?: string;
  tube_type?: string;
  tube_size?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientLog {
  id: string;
  patient_id: number;
  log_date: string;
  log_type: '日常護理' | '文件簽署' | '入院/出院' | '入住/退住' | '醫生到診' | '意外事故' | '覆診返藥' | '其他';
  content: string;
  recorder: string;
  created_at: string;
  updated_at: string;
}

export interface PatientRestraintAssessment {
  id: string;
  patient_id: number;
  doctor_signature_date?: string;
  next_due_date?: string;
  risk_factors: any;
  alternatives: any;
  suggested_restraints: any;
  other_restraint_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthAssessment {
  id: string;
  patient_id: number;
  smoking_habit?: string;
  drinking_habit?: string;
  daily_activities?: any;
  nutrition_diet?: any;
  vision_hearing?: any;
  communication_ability?: string;
  consciousness_cognition?: string;
  bowel_bladder_control?: any;
  emotional_expression?: string;
  remarks?: string;
  assessment_date: string;
  assessor?: string;
  next_due_date?: string;
  smoking_years_quit?: string;
  smoking_quantity?: string;
  drinking_years_quit?: string;
  drinking_quantity?: string;
  communication_other?: string;
  consciousness_other?: string;
  emotional_other?: string;
  treatment_items?: string[];
  toilet_training?: boolean;
  behavior_expression?: string;
  created_at: string;
  updated_at: string;
}

export interface WoundAssessment {
  id: string;
  patient_id: number;
  assessment_date: string;
  next_assessment_date?: string;
  assessor?: string;
  wound_details?: any[];
  created_at: string;
  updated_at: string;
}

export type AdmissionEventType = 'hospital_admission' | 'hospital_discharge' | 'transfer_out';

export interface PatientAdmissionRecord {
  id: string;
  patient_id: number;
  event_type: AdmissionEventType;
  event_date: string;
  event_time?: string;
  hospital_name?: string;
  hospital_ward?: string;
  hospital_bed_number?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface DailySystemTask {
  id: string;
  task_name: string;
  task_date: string;
  completed_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentReport {
  id: string;
  patient_id: number;
  incident_date: string;
  incident_time?: string;
  incident_type: string;
  other_incident_type?: string;
  location?: string;
  other_location?: string;
  patient_activity?: string;
  other_patient_activity?: string;
  physical_discomfort?: any;
  unsafe_behavior?: any;
  environmental_factors?: any;
  incident_details?: string;
  treatment_date?: string;
  treatment_time?: string;
  vital_signs?: any;
  consciousness_level?: string;
  limb_movement?: any;
  injury_situation?: any;
  patient_complaint?: string;
  immediate_treatment?: any;
  medical_arrangement?: string;
  ambulance_call_time?: string;
  ambulance_arrival_time?: string;
  ambulance_departure_time?: string;
  hospital_destination?: string;
  family_notification_date?: string;
  family_notification_time?: string;
  family_name?: string;
  family_relationship?: string;
  other_family_relationship?: string;
  contact_phone?: string;
  notifying_staff_name?: string;
  notifying_staff_position?: string;
  hospital_treatment?: any;
  hospital_admission?: any;
  return_time?: string;
  submit_to_social_welfare?: boolean;
  submit_to_headquarters?: boolean;
  immediate_improvement_actions?: string;
  prevention_methods?: string;
  reporter_signature?: string;
  reporter_position?: string;
  report_date?: string;
  director_review_date?: string;
  submit_to_headquarters_flag?: boolean;
  submit_to_social_welfare_flag?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiagnosisRecord {
  id: string;
  patient_id: number;
  diagnosis_date: string;
  diagnosis_item: string;
  diagnosis_unit: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VaccinationRecord {
  id: string;
  patient_id: number;
  vaccination_date: string;
  vaccine_item: string;
  vaccination_unit: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Care Records types
export interface PatrolRound {
  id: string;
  patient_id: number;
  patrol_date: string;
  patrol_time: string;
  scheduled_time: string;
  recorder: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DiaperChangeRecord {
  id: string;
  patient_id: number;
  change_date: string;
  time_slot: string;
  has_urine: boolean;
  has_stool: boolean;
  has_none: boolean;
  urine_amount?: string;
  stool_color?: string;
  stool_texture?: string;
  stool_amount?: string;
  recorder: string;
  created_at: string;
  updated_at: string;
}

export interface RestraintObservationRecord {
  id: string;
  patient_id: number;
  observation_date: string;
  observation_time: string;
  scheduled_time: string;
  observation_status: 'N' | 'P' | 'S';
  recorder: string;
  notes?: string;
  used_restraints?: any;
  created_at: string;
  updated_at: string;
}

export interface PositionChangeRecord {
  id: string;
  patient_id: number;
  change_date: string;
  scheduled_time: string;
  position: '左' | '平' | '右';
  recorder: string;
  created_at: string;
  updated_at: string;
}

export interface PatientCareTab {
  id: string;
  patient_id: number;
  tab_type: 'patrol' | 'diaper' | 'intake_output' | 'restraint' | 'position' | 'toilet_training';
  is_manually_added: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

// Drug Database types
export interface DrugData {
  id: string;
  drug_name: string;
  drug_code?: string;
  drug_type?: string;
  administration_route?: string;
  unit?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Medication Inspection Rule types
export type VitalSignType = '上壓' | '下壓' | '脈搏' | '血糖值' | '呼吸' | '血含氧量' | '體溫';
export type ConditionOperatorType = 'gt' | 'lt' | 'gte' | 'lte';

export interface MedicationInspectionRule {
  id: string;
  prescription_id: string;
  vital_sign_type: VitalSignType;
  condition_operator: ConditionOperatorType;
  condition_value: number;
  action_if_met?: string;
  created_at: string;
  updated_at: string;
}

// Medication Prescription types
export type MedicationFrequencyType = 'daily' | 'every_x_days' | 'every_x_months' | 'weekly_days' | 'odd_even_days';
export type OddEvenDayType = 'odd' | 'even' | 'none';
export type PreparationMethodType = 'immediate' | 'advanced' | 'custom';
export type PrescriptionStatusType = 'active' | 'inactive' | 'pending_change';

export interface MedicationPrescription {
  id: string;
  patient_id: number;
  medication_name: string;
  prescription_date: string;
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  dosage_form?: string;
  administration_route?: string;
  dosage_amount?: string;
  frequency_type: MedicationFrequencyType;
  frequency_value?: number;
  specific_weekdays?: number[];
  is_odd_even_day: OddEvenDayType;
  is_prn: boolean;
  medication_time_slots?: string[];
  notes?: string;
  preparation_method: PreparationMethodType;
  status: PrescriptionStatusType;
  medication_source: string;
  created_at: string;
  updated_at: string;
}

// Medication Workflow Record types
export type WorkflowStatusEnum = 'pending' | 'completed' | 'failed';
export type DispensingFailureReasonEnum = '回家' | '入院' | '拒服' | '略去' | '藥物不足' | '其他';

export interface MedicationWorkflowRecord {
  id: string;
  prescription_id: string;
  patient_id: number;
  scheduled_date: string;
  scheduled_time: string;
  preparation_status: WorkflowStatusEnum;
  verification_status: WorkflowStatusEnum;
  dispensing_status: WorkflowStatusEnum;
  preparation_staff?: string;
  verification_staff?: string;
  dispensing_staff?: string;
  preparation_time?: string;
  verification_time?: string;
  dispensing_time?: string;
  dispensing_failure_reason?: DispensingFailureReasonEnum;
  custom_failure_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Core database functions
export const getPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase.from('院友主表').select('*').order('床號', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createPatient = async (patient: Omit<Patient, '院友id'>): Promise<Patient> => {
  const { data, error } = await supabase.from('院友主表').insert(patient).select('*').single();
  if (error) throw error;
  return data;
};

export const updatePatient = async (patient: Patient): Promise<Patient> => {
  const cleanedPatient = { ...patient };
  Object.keys(cleanedPatient).forEach(key => {
    if (cleanedPatient[key] === '') cleanedPatient[key] = null;
  });
  const { data, error } = await supabase.from('院友主表').update(cleanedPatient).eq('院友id', patient.院友id).select().single();
  if (error) throw error;
  return data;
};

export const deletePatient = async (patientId: number): Promise<void> => {
  const { error } = await supabase.from('院友主表').delete().eq('院友id', patientId);
  if (error) throw error;
};

export const getStations = async (): Promise<Station[]> => {
  const { data, error } = await supabase.from('stations').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createStation = async (station: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> => {
  const { data, error } = await supabase.from('stations').insert([station]).select().single();
  if (error) throw error;
  return data;
};

export const updateStation = async (station: Station): Promise<Station> => {
  const { data, error } = await supabase.from('stations').update(station).eq('id', station.id).select().single();
  if (error) throw error;
  return data;
};

export const deleteStation = async (stationId: string): Promise<void> => {
  const { error } = await supabase.from('stations').delete().eq('id', stationId);
  if (error) throw error;
};

export const getBeds = async (): Promise<Bed[]> => {
  const { data, error } = await supabase.from('beds').select('*').order('bed_number', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createBed = async (bed: Omit<Bed, 'id' | 'created_at' | 'updated_at'>): Promise<Bed> => {
  const { data, error } = await supabase.from('beds').insert([bed]).select().single();
  if (error) throw error;
  return data;
};

export const updateBed = async (bed: Bed): Promise<Bed> => {
  const { data, error } = await supabase.from('beds').update(bed).eq('id', bed.id).select().single();
  if (error) throw error;
  return data;
};

export const deleteBed = async (bedId: string): Promise<void> => {
  const { error } = await supabase.from('beds').delete().eq('id', bedId);
  if (error) throw error;
};

export const assignPatientToBed = async (patientId: number, bedId: string): Promise<void> => {
  const { error } = await supabase.from('院友主表').update({ bed_id: bedId }).eq('院友id', patientId);
  if (error) throw error;
};

export const swapPatientBeds = async (patientId1: number, patientId2: number): Promise<void> => {
  const { data: patients, error: fetchError } = await supabase.from('院友主表').select('院友id, bed_id').in('院友id', [patientId1, patientId2]);
  if (fetchError) throw fetchError;
  const patient1 = patients?.find(p => p.院友id === patientId1);
  const patient2 = patients?.find(p => p.院友id === patientId2);
  if (!patient1 || !patient2) throw new Error('找不到院友資料');
  const { error: updateError1 } = await supabase.from('院友主表').update({ bed_id: patient2.bed_id }).eq('院友id', patientId1);
  if (updateError1) throw updateError1;
  const { error: updateError2 } = await supabase.from('院友主表').update({ bed_id: patient1.bed_id }).eq('院友id', patientId2);
  if (updateError2) throw updateError2;
};

export const moveBedToStation = async (bedId: string, newStationId: string): Promise<void> => {
  const { error } = await supabase.from('beds').update({ station_id: newStationId }).eq('id', bedId);
  if (error) throw error;
};

export const getSchedules = async (): Promise<Schedule[]> => {
  const { data, error } = await supabase.from('到診排程主表').select('*').order('到診日期', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createSchedule = async (schedule: Omit<Schedule, '排程id'>): Promise<Schedule> => {
  const { data, error } = await supabase.from('到診排程主表').insert([schedule]).select().single();
  if (error) throw error;
  return data;
};

export const updateSchedule = async (schedule: Schedule): Promise<Schedule> => {
  const { data, error } = await supabase.from('到診排程主表').update(schedule).eq('排程id', schedule.排程id).select().single();
  if (error) throw error;
  return data;
};

export const deleteSchedule = async (scheduleId: number): Promise<void> => {
  const { error } = await supabase.from('到診排程主表').delete().eq('排程id', scheduleId);
  if (error) throw error;
};

export const getScheduleDetails = async (scheduleId: number): Promise<ScheduleDetail[]> => {
  const { data, error } = await supabase.from('看診院友細項').select(`*, 到診院友_看診原因(看診原因選項(原因id, 原因名稱))`).eq('排程id', scheduleId);
  if (error) throw error;
  return (data || []).map(item => ({ ...item, reasons: item.到診院友_看診原因?.map((r: any) => r.看診原因選項) || [] }));
};

export const addPatientToSchedule = async (scheduleId: number, patientId: number, symptoms: string, notes: string, reasons: string[]): Promise<void> => {
  const { data: detail, error: detailError } = await supabase.from('看診院友細項').insert([{ 排程id: scheduleId, 院友id: patientId, 症狀說明: symptoms, 備註: notes }]).select().single();
  if (detailError) throw detailError;
  if (reasons.length > 0) {
    const reasonInserts = reasons.map(reason => ({ 細項id: detail.細項id, 原因id: parseInt(reason) }));
    const { error: reasonError } = await supabase.from('到診院友_看診原因').insert(reasonInserts);
    if (reasonError) throw reasonError;
  }
};

export const updateScheduleDetail = async (detailData: { 細項id: number; 症狀說明: string; 備註: string; reasonIds: number[]; }): Promise<any> => {
  try {
    const { error: updateError } = await supabase.from('看診院友細項').update({ 症狀說明: detailData.症狀說明, 備註: detailData.備註 }).eq('細項id', detailData.細項id);
    if (updateError) throw updateError;
    const { error: deleteError } = await supabase.from('到診院友_看診原因').delete().eq('細項id', detailData.細項id);
    if (deleteError) throw deleteError;
    if (detailData.reasonIds.length > 0) {
      const reasonInserts = detailData.reasonIds.map(reasonId => ({ 細項id: detailData.細項id, 原因id: reasonId }));
      const { error: insertError } = await supabase.from('到診院友_看診原因').insert(reasonInserts);
      if (insertError) throw insertError;
    }
    return { success: true };
  } catch (error) { return { error }; }
};

export const deleteScheduleDetail = async (detailId: number): Promise<void> => {
  const { error } = await supabase.from('看診院友細項').delete().eq('細項id', detailId);
  if (error) throw error;
};

export const getReasons = async (): Promise<ServiceReason[]> => {
  const { data, error } = await supabase.from('看診原因選項').select('*').order('原因名稱', { ascending: true });
  if (error) throw error;
  return data || [];
};

// Health Records
export const getHealthRecords = async (limit?: number): Promise<HealthRecord[]> => {
  const pageSize = 1000;
  let allRecords: HealthRecord[] = [];
  let page = 0;
  let hasMore = true;

  if (limit !== undefined) {
    const { data, error } = await supabase.from('健康記錄主表').select('*').order('記錄日期', { ascending: false }).order('記錄時間', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  while (hasMore) {
    const { data, error } = await supabase.from('健康記錄主表').select('*').order('記錄日期', { ascending: false }).order('記錄時間', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  return allRecords;
};

export const createHealthRecord = async (record: Omit<HealthRecord, '記錄id'>): Promise<HealthRecord> => {
  const { data, error } = await supabase
    .from('健康記錄主表')
    .insert([record])
    .select('記錄id')
    .single();

  if (error) {
    console.error('Error creating health record:', error);
    throw error;
  }

  return { ...record, ...data } as HealthRecord;
};

export const updateHealthRecord = async (record: HealthRecord): Promise<HealthRecord> => {
  const { error } = await supabase
    .from('健康記錄主表')
    .update(record)
    .eq('記錄id', record.記錄id);

  if (error) {
    console.error('Error updating health record:', error);
    throw error;
  }

  return record;
};

export const deleteHealthRecord = async (recordId: number): Promise<void> => {
  const { error } = await supabase
    .from('健康記錄主表')
    .delete()
    .eq('記錄id', recordId);

  if (error) {
    console.error('Error deleting health record:', error);
    throw error;
  }
};

// ... (Other standard functions omitted for brevity, but assume they exist) ...
export const getHealthTasks = async (): Promise<PatientHealthTask[]> => {
  const { data, error } = await supabase.from('patient_health_tasks').select('*').order('next_due_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const updatePatientHealthTask = async (task: PatientHealthTask): Promise<PatientHealthTask> => {
  const { error } = await supabase.from('patient_health_tasks').update(task).eq('id', task.id);
  if (error) throw error;
  return task;
};

// [新增] 核心功能：根據最新的有效記錄，重新計算任務狀態
export const syncTaskStatus = async (taskId: string) => {
  console.log('🔄 開始同步任務狀態:', taskId);
  
  // [分界線設定] 早於此日期的記錄不參與同步計算，避免舊數據干擾
  // 請根據您的實際上線日期或數據遷移日期進行調整
  const SYNC_CUTOFF_DATE = new Date('2025-01-01');

  // 1. 獲取任務設定
  const { data: task, error: taskError } = await supabase
    .from('patient_health_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    console.error('無法找到任務:', taskId);
    return;
  }

  // 2. 找出這個任務「最新」的一筆有效記錄 (依照記錄日期排序)
  // 注意：我們使用 task_id 來精確匹配，如果舊數據沒有 task_id，它們就不會影響計算 (這符合"斷層"邏輯)
  const { data: latestRecord } = await supabase
    .from('健康記錄主表')
    .select('記錄日期, 記錄時間')
    .eq('task_id', taskId)
    .order('記錄日期', { ascending: false })
    .order('記錄時間', { ascending: false })
    .limit(1)
    .maybeSingle();

  let updates = {};

  if (latestRecord) {
    const recordDate = new Date(latestRecord.記錄日期);
    
    // 如果最新記錄早於分界線，則不進行同步
    if (recordDate < SYNC_CUTOFF_DATE) {
      console.log('⚠️ 最新記錄早於分界線，跳過同步:', latestRecord.記錄日期);
      return;
    }

    // A. 如果有記錄：最後完成時間 = 最新那筆記錄的時間
    const lastCompletedAt = new Date(`${latestRecord.記錄日期}T${latestRecord.記錄時間}`);
    
    // 重新計算下一次到期日 (基於最新的記錄往後推)
    // 注意：對於監測任務，calculateNextDueDate 內部的邏輯會將時間重置為 8:00 (或任務設定的 specific_times)
    // 這樣即使你在晚上補錄，下一次任務仍會是「正確日期的早上 8:00」，不會造成時間點的永久漂移
    const nextDueAt = calculateNextDueDate(task, lastCompletedAt);
    
    console.log(`✅ 找到最新記錄 (${latestRecord.記錄日期})，更新下次到期日為:`, nextDueAt);

    updates = {
      last_completed_at: lastCompletedAt.toISOString(),
      next_due_at: nextDueAt.toISOString()
    };
  } else {
    // B. 如果記錄被刪光了：重置任務
    console.log('⚠️ 該任務已無任何記錄，重置為初始狀態');
    
    // 如果沒有記錄，將「最後完成時間」清空
    // 「下次到期日」設為今天，讓任務重新浮現
    const resetDate = new Date();
    resetDate.setHours(8, 0, 0, 0); // 預設早上 8 點

    updates = {
      last_completed_at: null,
      next_due_at: resetDate.toISOString()
    };
  }

  // 3. 更新資料庫
  const { error: updateError } = await supabase
    .from('patient_health_tasks')
    .update(updates)
    .eq('id', taskId);

  if (updateError) console.error('更新任務狀態失敗:', updateError);
};

// ... (其他原有導出保持不變) ...
export const getPatientNotes = async (): Promise<PatientNote[]> => {
  const { data, error } = await supabase.from('patient_notes').select('*').order('is_completed', { ascending: true }).order('note_date', { ascending: false });
  if (error) throw error;
  return data || [];
};
// ... (請確保保留檔案末尾的所有函數) ...