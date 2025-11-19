import React, { useState, useRef } from 'react';
import { X, Pill, Upload, Camera, Trash2, Code, Tag, Route, Hash, FileText } from 'lucide-react';
import { supabase } from './supabase';

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

export interface HealthRecord {
  記錄id: number;
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

export type HealthTaskType = '生命表徵' | '血糖控制' | '體重控制' | '約束物品同意書' | '年度體檢' | '尿導管更換' | '鼻胃飼管更換' | '傷口換症' | '藥物自存同意書';
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
  const { data, error } = await supabase
    .from('院友主表')
    .select('*')
    .order('床號', { ascending: true });

  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }

  return data || [];
};

export const createPatient = async (patient: Omit<Patient, '院友id'>): Promise<Patient> => {
  console.log('[createPatient] 準備新增院友，資料內容:', JSON.stringify(patient, null, 2));

  if (!patient.床號) {
    console.warn('[createPatient] 床號欄位為空，設定為「待分配」');
    patient.床號 = '待分配';
  }

  if (!patient.中文姓名) {
    const error = new Error('中文姓名為必填欄位');
    console.error('[createPatient] 資料驗證失敗:', error);
    throw error;
  }

  const { data, error } = await supabase
    .from('院友主表')
    .insert(patient)
    .select('*')
    .single();

  if (error) {
    console.error('[createPatient] Supabase 錯誤詳情:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error
    });
    console.error('[createPatient] 完整錯誤物件:', error);
    throw error;
  }

  console.log('[createPatient] 成功新增院友:', data.院友id);
  return data;
};

export const updatePatient = async (patient: Patient): Promise<Patient> => {
  const { data, error } = await supabase
    .from('院友主表')
    .update(patient)
    .eq('院友id', patient.院友id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient:', error);
    throw error;
  }

  return data;
};

export const deletePatient = async (patientId: number): Promise<void> => {
  const { error } = await supabase
    .from('院友主表')
    .delete()
    .eq('院友id', patientId);

  if (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
};

export const getStations = async (): Promise<Station[]> => {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching stations:', error);
    throw error;
  }

  return data || [];
};

export const createStation = async (station: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> => {
  const { data, error } = await supabase
    .from('stations')
    .insert([station])
    .select()
    .single();

  if (error) {
    console.error('Error creating station:', error);
    throw error;
  }

  return data;
};

export const updateStation = async (station: Station): Promise<Station> => {
  const { data, error } = await supabase
    .from('stations')
    .update(station)
    .eq('id', station.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating station:', error);
    throw error;
  }

  return data;
};

export const deleteStation = async (stationId: string): Promise<void> => {
  const { error } = await supabase
    .from('stations')
    .delete()
    .eq('id', stationId);

  if (error) {
    console.error('Error deleting station:', error);
    throw error;
  }
};

export const getBeds = async (): Promise<Bed[]> => {
  const { data, error } = await supabase
    .from('beds')
    .select('*')
    .order('bed_number', { ascending: true });

  if (error) {
    console.error('Error fetching beds:', error);
    throw error;
  }

  return data || [];
};

export const createBed = async (bed: Omit<Bed, 'id' | 'created_at' | 'updated_at'>): Promise<Bed> => {
  const { data, error } = await supabase
    .from('beds')
    .insert([bed])
    .select()
    .single();

  if (error) {
    console.error('Error creating bed:', error);
    throw error;
  }

  return data;
};

export const updateBed = async (bed: Bed): Promise<Bed> => {
  const { data, error } = await supabase
    .from('beds')
    .update(bed)
    .eq('id', bed.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bed:', error);
    throw error;
  }

  return data;
};

export const deleteBed = async (bedId: string): Promise<void> => {
  const { error } = await supabase
    .from('beds')
    .delete()
    .eq('id', bedId);

  if (error) {
    console.error('Error deleting bed:', error);
    throw error;
  }
};

export const assignPatientToBed = async (patientId: number, bedId: string): Promise<void> => {
  const { error } = await supabase
    .from('院友主表')
    .update({ bed_id: bedId })
    .eq('院友id', patientId);

  if (error) {
    console.error('Error assigning patient to bed:', error);
    throw error;
  }
};

export const swapPatientBeds = async (patientId1: number, patientId2: number): Promise<void> => {
  // Get current bed assignments
  const { data: patients, error: fetchError } = await supabase
    .from('院友主表')
    .select('院友id, bed_id')
    .in('院友id', [patientId1, patientId2]);

  if (fetchError) {
    console.error('Error fetching patient bed assignments:', fetchError);
    throw fetchError;
  }

  const patient1 = patients?.find(p => p.院友id === patientId1);
  const patient2 = patients?.find(p => p.院友id === patientId2);

  if (!patient1 || !patient2) {
    throw new Error('找不到院友資料');
  }

  // Swap bed assignments
  const { error: updateError1 } = await supabase
    .from('院友主表')
    .update({ bed_id: patient2.bed_id })
    .eq('院友id', patientId1);

  if (updateError1) {
    console.error('Error updating patient 1 bed:', updateError1);
    throw updateError1;
  }

  const { error: updateError2 } = await supabase
    .from('院友主表')
    .update({ bed_id: patient1.bed_id })
    .eq('院友id', patientId2);

  if (updateError2) {
    console.error('Error updating patient 2 bed:', updateError2);
    throw updateError2;
  }
};

export const moveBedToStation = async (bedId: string, newStationId: string): Promise<void> => {
  const { error } = await supabase
    .from('beds')
    .update({ station_id: newStationId })
    .eq('id', bedId);

  if (error) {
    console.error('Error moving bed to station:', error);
    throw error;
  }
};

export const getSchedules = async (): Promise<Schedule[]> => {
  const { data, error } = await supabase
    .from('到診排程主表')
    .select('*')
    .order('到診日期', { ascending: false });

  if (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }

  return data || [];
};

export const createSchedule = async (schedule: Omit<Schedule, '排程id'>): Promise<Schedule> => {
  const { data, error } = await supabase
    .from('到診排程主表')
    .insert([schedule])
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }

  return data;
};

export const updateSchedule = async (schedule: Schedule): Promise<Schedule> => {
  const { data, error } = await supabase
    .from('到診排程主表')
    .update(schedule)
    .eq('排程id', schedule.排程id)
    .select()
    .single();

  if (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }

  return data;
};

export const deleteSchedule = async (scheduleId: number): Promise<void> => {
  const { error } = await supabase
    .from('到診排程主表')
    .delete()
    .eq('排程id', scheduleId);

  if (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

export const getScheduleDetails = async (scheduleId: number): Promise<ScheduleDetail[]> => {
  const { data, error } = await supabase
    .from('看診院友細項')
    .select(`
      *,
      到診院友_看診原因(
        看診原因選項(原因id, 原因名稱)
      )
    `)
    .eq('排程id', scheduleId);

  if (error) {
    console.error('Error fetching schedule details:', error);
    throw error;
  }

  return (data || []).map(item => ({
    ...item,
    reasons: item.到診院友_看診原因?.map((r: any) => r.看診原因選項) || []
  }));
};

export const addPatientToSchedule = async (
  scheduleId: number, 
  patientId: number, 
  symptoms: string, 
  notes: string, 
  reasons: string[]
): Promise<void> => {
  // Create schedule detail
  const { data: detail, error: detailError } = await supabase
    .from('看診院友細項')
    .insert([{
      排程id: scheduleId,
      院友id: patientId,
      症狀說明: symptoms,
      備註: notes
    }])
    .select()
    .single();

  if (detailError) {
    console.error('Error adding patient to schedule:', detailError);
    throw detailError;
  }

  // Add reasons if provided
  if (reasons.length > 0) {
    const reasonInserts = reasons.map(reason => ({
      細項id: detail.細項id,
      原因id: parseInt(reason)
    }));

    const { error: reasonError } = await supabase
      .from('到診院友_看診原因')
      .insert(reasonInserts);

    if (reasonError) {
      console.error('Error adding reasons:', reasonError);
      throw reasonError;
    }
  }
};

export const updateScheduleDetail = async (detailData: {
  細項id: number;
  症狀說明: string;
  備註: string;
  reasonIds: number[];
}): Promise<any> => {
  try {
    // Update schedule detail
    const { error: updateError } = await supabase
      .from('看診院友細項')
      .update({
        症狀說明: detailData.症狀說明,
        備註: detailData.備註
      })
      .eq('細項id', detailData.細項id);

    if (updateError) {
      console.error('Error updating schedule detail:', updateError);
      throw updateError;
    }

    // Delete existing reasons
    const { error: deleteError } = await supabase
      .from('到診院友_看診原因')
      .delete()
      .eq('細項id', detailData.細項id);

    if (deleteError) {
      console.error('Error deleting existing reasons:', deleteError);
      throw deleteError;
    }

    // Insert new reasons
    if (detailData.reasonIds.length > 0) {
      const reasonInserts = detailData.reasonIds.map(reasonId => ({
        細項id: detailData.細項id,
        原因id: reasonId
      }));

      const { error: insertError } = await supabase
        .from('到診院友_看診原因')
        .insert(reasonInserts);

      if (insertError) {
        console.error('Error inserting new reasons:', insertError);
        throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateScheduleDetail:', error);
    return { error };
  }
};

export const deleteScheduleDetail = async (detailId: number): Promise<void> => {
  const { error } = await supabase
    .from('看診院友細項')
    .delete()
    .eq('細項id', detailId);

  if (error) {
    console.error('Error deleting schedule detail:', error);
    throw error;
  }
};

export const getReasons = async (): Promise<ServiceReason[]> => {
  const { data, error } = await supabase
    .from('看診原因選項')
    .select('*')
    .order('原因名稱', { ascending: true });

  if (error) {
    console.error('Error fetching reasons:', error);
    throw error;
  }

  return data || [];
};

// Drug Database functions
export async function getDrugDatabase() {
  try {
    console.log('🔍 Fetching drug database from medication_drug_database...');
    const { data, error } = await supabase
      .from('medication_drug_database')
      .select('*')
      .order('drug_name');
    
    if (error) {
      console.error('❌ Error fetching drug database:', error);
      throw error;
    }
    
    console.log('✅ Successfully fetched drug database:', {
      count: data?.length || 0,
      firstItem: data?.[0] || null
    });
    
    return data || [];
  } catch (error) {
    console.error('❌ getDrugDatabase failed:', error);
    return [];
  }
}

export async function createDrug(drug: any) {
  try {
    console.log('🔍 Creating drug:', drug);
    const { data, error } = await supabase
      .from('medication_drug_database')
      .insert([drug])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating drug:', error);
      throw error;
    }
    
    console.log('✅ Successfully created drug:', data);
    return data;
  } catch (error) {
    console.error('❌ createDrug failed:', error);
    throw error;
  }
}

export async function updateDrug(drug: any) {
  try {
    console.log('🔍 Updating drug:', drug);
    const { data, error } = await supabase
      .from('medication_drug_database')
      .update(drug)
      .eq('id', drug.id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating drug:', error);
      throw error;
    }
    
    console.log('✅ Successfully updated drug:', data);
    return data;
  } catch (error) {
    console.error('❌ updateDrug failed:', error);
    throw error;
  }
}

export async function deleteDrug(id: string) {
  try {
    console.log('🔍 Deleting drug with id:', id);
    const { error } = await supabase
      .from('medication_drug_database')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Error deleting drug:', error);
      throw error;
    }
    
    console.log('✅ Successfully deleted drug');
  } catch (error) {
    console.error('❌ deleteDrug failed:', error);
    throw error;
  }
}

// Helper function to get current user info
async function getCurrentUserInfo(): Promise<string> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.warn('⚠️ Unable to get current user:', error);
      return '系統';
    }

    if (!user) {
      console.warn('⚠️ No user logged in');
      return '系統';
    }

    // Use email if available, otherwise use user ID
    const userIdentifier = user.email || user.id || '系統';
    console.log('👤 Current user:', userIdentifier);

    return userIdentifier;
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return '系統';
  }
}

// Prescription functions
export async function getPrescriptions() {
  try {
    console.log('🔍 Fetching prescriptions from new_medication_prescriptions...');
    const { data, error } = await supabase
      .from('new_medication_prescriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching prescriptions:', error);
      throw error;
    }

    console.log('✅ Successfully fetched prescriptions:', {
      count: data?.length || 0
    });

    return data || [];
  } catch (error) {
    console.error('❌ getPrescriptions failed:', error);
    return [];
  }
}

export async function createPrescription(prescription: any) {
  try {
    console.log('🔍 Creating prescription:', prescription);

    // Get current user info and add to prescription
    const currentUser = await getCurrentUserInfo();
    const prescriptionWithUser = {
      ...prescription,
      created_by: currentUser,
      last_modified_by: currentUser
    };

    console.log('👤 Adding user tracking:', {
      created_by: currentUser,
      last_modified_by: currentUser
    });

    const { data, error } = await supabase
      .from('new_medication_prescriptions')
      .insert([prescriptionWithUser])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating prescription:', error);
      throw error;
    }

    console.log('✅ Successfully created prescription:', data);
    return data;
  } catch (error) {
    console.error('❌ createPrescription failed:', error);
    throw error;
  }
}

export async function updatePrescription(prescription: any) {
  try {
    console.log('🔍 Updating prescription - ALL FIELDS:', prescription);
    console.log('🔍 Prescription keys:', Object.keys(prescription));

    // Check for Chinese field names
    const chineseFields = Object.keys(prescription).filter(key => /[\u4e00-\u9fa5]/.test(key));
    if (chineseFields.length > 0) {
      console.error('❌ FOUND CHINESE FIELD NAMES:', chineseFields);
      console.error('❌ This will cause update to fail!');
    }

    // Get current user info and update last_modified_by
    const currentUser = await getCurrentUserInfo();

    // Define allowed fields for new_medication_prescriptions table
    const allowedFields = [
      'id', 'patient_id', 'medication_name', 'medication_source', 'medication_quantity',
      'prescription_date', 'start_date', 'start_time', 'end_date', 'end_time',
      'duration_days', 'dosage_form', 'administration_route', 'dosage_amount',
      'dosage_unit', 'special_dosage_instruction', 'daily_frequency', 'frequency_type',
      'frequency_value', 'specific_weekdays', 'is_odd_even_day', 'medication_time_slots',
      'meal_timing', 'is_prn', 'preparation_method', 'status', 'notes',
      'inspection_rules', 'created_at', 'updated_at', 'created_by', 'last_modified_by'
    ];

    // Filter prescription to only include allowed fields
    const filteredPrescription = {};
    allowedFields.forEach(field => {
      if (prescription.hasOwnProperty(field) && prescription[field] !== undefined) {
        filteredPrescription[field] = prescription[field];
      }
    });

    console.log('✅ Filtered prescription (English fields only):', filteredPrescription);
    console.log('✅ Filtered prescription keys:', Object.keys(filteredPrescription));

    const prescriptionWithUser = {
      ...filteredPrescription,
      last_modified_by: currentUser,
      updated_at: new Date().toISOString()
    };

    console.log('👤 Updating last_modified_by:', currentUser);
    console.log('📤 Final data being sent to Supabase:', prescriptionWithUser);

    const { data, error } = await supabase
      .from('new_medication_prescriptions')
      .update(prescriptionWithUser)
      .eq('id', prescription.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating prescription:', error);
      throw error;
    }

    console.log('✅ Successfully updated prescription:', data);
    return data;
  } catch (error) {
    console.error('❌ updatePrescription failed:', error);
    throw error;
  }
}

export async function deletePrescription(id: string) {
  try {
    console.log('🔍 Deleting prescription with id:', id);

    // 先刪除該處方的所有工作流程記錄
    console.log('🔍 Deleting related workflow records for prescription:', id);
    const { error: workflowError } = await supabase
      .from('medication_workflow_records')
      .delete()
      .eq('prescription_id', id);

    if (workflowError) {
      console.error('❌ Error deleting workflow records:', workflowError);
      throw workflowError;
    }

    console.log('✅ Successfully deleted workflow records');

    // 再刪除處方
    const { error } = await supabase
      .from('new_medication_prescriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting prescription:', error);
      throw error;
    }

    console.log('✅ Successfully deleted prescription');
  } catch (error) {
    console.error('❌ deletePrescription failed:', error);
    throw error;
  }
}

function handleSupabaseError(error: any, operation: string): void {
  console.error(`Error ${operation}:`, error);
}

export const getHealthRecords = async (): Promise<HealthRecord[]> => {
  const pageSize = 1000;
  let allRecords: HealthRecord[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('健康記錄主表')
      .select('*')
      .order('記錄日期', { ascending: false })
      .order('記錄時間', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching health records:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      hasMore = data.length === pageSize;
      page++;
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
    .select()
    .single();

  if (error) {
    console.error('Error creating health record:', error);
    throw error;
  }

  return data;
};

export const updateHealthRecord = async (record: HealthRecord): Promise<HealthRecord> => {
  const { data, error } = await supabase
    .from('健康記錄主表')
    .update(record)
    .eq('記錄id', record.記錄id)
    .select()
    .single();

  if (error) {
    console.error('Error updating health record:', error);
    throw error;
  }

  return data;
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

// 回收筒相关函数

// 将健康记录移至回收筒
export const moveHealthRecordToRecycleBin = async (
  record: HealthRecord,
  deletedBy?: string,
  deletionReason: string = '记录去重'
): Promise<void> => {
  // 插入到回收筒
  const { error: insertError } = await supabase
    .from('deleted_health_records')
    .insert({
      original_record_id: record.記錄id,
      院友id: record.院友id,
      記錄日期: record.記錄日期,
      記錄時間: record.記錄時間,
      記錄類型: record.記錄類型,
      血壓收縮壓: record.血壓收縮壓,
      血壓舒張壓: record.血壓舒張壓,
      脈搏: record.脈搏,
      體溫: record.體溫,
      血含氧量: record.血含氧量,
      呼吸頻率: record.呼吸頻率,
      血糖值: record.血糖值,
      體重: record.體重,
      備註: record.備註,
      記錄人員: record.記錄人員,
      created_at: record.created_at,
      deleted_by: deletedBy,
      deletion_reason: deletionReason
    });

  if (insertError) {
    console.error('Error moving record to recycle bin:', insertError);
    console.warn('Recycle bin is not available. Record will be permanently deleted instead.');
    // 如果回收筒不可用，直接删除记录
    console.log('Falling back to direct deletion for record:', record.記錄id);
  }

  // 从原表删除
  const { error: deleteError } = await supabase
    .from('健康記錄主表')
    .delete()
    .eq('記錄id', record.記錄id);

  if (deleteError) {
    console.error('Error deleting original record:', deleteError);
    throw deleteError;
  }
};

// 获取回收筒中的记录
export const getDeletedHealthRecords = async (): Promise<DeletedHealthRecord[]> => {
  const { data, error } = await supabase
    .from('deleted_health_records')
    .select('*')
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted health records:', error);
    throw error;
  }

  return data || [];
};

// 从回收筒恢复记录
export const restoreHealthRecordFromRecycleBin = async (deletedRecordId: string): Promise<void> => {
  // 获取回收筒中的记录
  const { data: deletedRecord, error: fetchError } = await supabase
    .from('deleted_health_records')
    .select('*')
    .eq('id', deletedRecordId)
    .single();

  if (fetchError || !deletedRecord) {
    console.error('Error fetching deleted record:', fetchError);
    throw fetchError || new Error('Record not found');
  }

  // 恢复到原表
  const { error: insertError } = await supabase
    .from('健康記錄主表')
    .insert({
      院友id: deletedRecord.院友id,
      記錄日期: deletedRecord.記錄日期,
      記錄時間: deletedRecord.記錄時間,
      記錄類型: deletedRecord.記錄類型,
      血壓收縮壓: deletedRecord.血壓收縮壓,
      血壓舒張壓: deletedRecord.血壓舒張壓,
      脈搏: deletedRecord.脈搏,
      體溫: deletedRecord.體溫,
      血含氧量: deletedRecord.血含氧量,
      呼吸頻率: deletedRecord.呼吸頻率,
      血糖值: deletedRecord.血糖值,
      體重: deletedRecord.體重,
      備註: deletedRecord.備註,
      記錄人員: deletedRecord.記錄人員
    });

  if (insertError) {
    console.error('Error restoring record:', insertError);
    throw insertError;
  }

  // 从回收筒删除
  const { error: deleteError } = await supabase
    .from('deleted_health_records')
    .delete()
    .eq('id', deletedRecordId);

  if (deleteError) {
    console.error('Error removing record from recycle bin:', deleteError);
    throw deleteError;
  }
};

// 永久删除回收筒中的记录
export const permanentlyDeleteHealthRecord = async (deletedRecordId: string): Promise<void> => {
  const { error } = await supabase
    .from('deleted_health_records')
    .delete()
    .eq('id', deletedRecordId);

  if (error) {
    console.error('Error permanently deleting record:', error);
    throw error;
  }
};

// 去重相关函数

// 分析最近1000笔记录中的重复记录
export const findDuplicateHealthRecords = async (): Promise<DuplicateRecordGroup[]> => {
  // 先尝试按 記錄id 排序（如果没有 created_at 字段）
  let records: any[] = [];
  let error: any = null;

  // 尝试按 created_at 排序
  const result1 = await supabase
    .from('健康記錄主表')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (result1.error && result1.error.code === '42703') {
    // 如果 created_at 不存在（错误代码 42703），改用 記錄id 排序
    console.warn('created_at column not found, using 記錄id ordering instead');
    const result2 = await supabase
      .from('健康記錄主表')
      .select('*')
      .order('記錄id', { ascending: false })
      .limit(1000);

    records = result2.data || [];
    error = result2.error;
  } else {
    records = result1.data || [];
    error = result1.error;
  }

  if (error) {
    console.error('Error fetching health records:', error);
    throw error;
  }

  if (!records || records.length === 0) {
    return [];
  }

  // 按院友id、记录日期、记录时间分组
  const recordGroups = new Map<string, HealthRecord[]>();

  records.forEach((record) => {
    const key = `${record.院友id}_${record.記錄日期}_${record.記錄時間}`;
    if (!recordGroups.has(key)) {
      recordGroups.set(key, []);
    }
    recordGroups.get(key)!.push(record);
  });

  // 找出每组中的重复记录
  const duplicateGroups: DuplicateRecordGroup[] = [];

  recordGroups.forEach((groupRecords, key) => {
    if (groupRecords.length < 2) {
      return; // 只有一条记录，没有重复
    }

    // 进一步按有效数值字段分组（忽略null值）
    const valueGroups = new Map<string, HealthRecord[]>();

    groupRecords.forEach((record) => {
      // 构建包含所有有效字段的key
      const values = [];
      if (record.血壓收縮壓 != null) values.push(`bp_sys:${record.血壓收縮壓}`);
      if (record.血壓舒張壓 != null) values.push(`bp_dia:${record.血壓舒張壓}`);
      if (record.脈搏 != null) values.push(`pulse:${record.脈搏}`);
      if (record.體溫 != null) values.push(`temp:${record.體溫}`);
      if (record.呼吸頻率 != null) values.push(`resp:${record.呼吸頻率}`);
      if (record.血含氧量 != null) values.push(`spo2:${record.血含氧量}`);
      if (record.血糖值 != null) values.push(`glucose:${record.血糖值}`);
      if (record.體重 != null) values.push(`weight:${record.體重}`);

      const valueKey = values.sort().join('|') || 'no_values';

      if (!valueGroups.has(valueKey)) {
        valueGroups.set(valueKey, []);
      }
      valueGroups.get(valueKey)!.push(record);
    });

    // 对于每个有效字段组合，如果有多条记录，则认为是重复
    valueGroups.forEach((valueGroupRecords, valueKey) => {
      if (valueGroupRecords.length >= 2) {
        // 按created_at或記錄id排序，保留最旧的记录
        const sortedRecords = valueGroupRecords.sort((a, b) => {
          // 如果有 created_at 字段，按照 created_at 排序（时间早的在前）
          if (a.created_at && b.created_at) {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return timeA - timeB;
          }
          // 否则按照 記錄id 排序（id小的是更旧的，在前）
          return a.記錄id - b.記錄id;
        });

        const keepRecord = sortedRecords[0]; // 保留最旧的（第一个）
        const duplicateRecords = sortedRecords.slice(1); // 其余的都是重复

        duplicateGroups.push({
          key: `${key}_${valueKey}`,
          records: sortedRecords,
          keepRecord,
          duplicateRecords
        });
      }
    });
  });

  return duplicateGroups;
};

// 批量将重复记录移至回收筒
export const batchMoveDuplicatesToRecycleBin = async (
  duplicateRecordIds: number[],
  deletedBy?: string
): Promise<void> => {
  for (const recordId of duplicateRecordIds) {
    // 获取完整记录
    const { data: record, error: fetchError } = await supabase
      .from('健康記錄主表')
      .select('*')
      .eq('記錄id', recordId)
      .maybeSingle();

    if (fetchError || !record) {
      console.error(`Error fetching record ${recordId}:`, fetchError);
      continue; // 跳过这条，继续处理其他记录
    }

    try {
      await moveHealthRecordToRecycleBin(record, deletedBy, '记录去重');
    } catch (error) {
      console.error(`Error moving record ${recordId} to recycle bin:`, error);
      // 不中断操作，继续处理下一条记录
      // 记录已经在 moveHealthRecordToRecycleBin 中被删除了
    }
  }
};

export const createBatchHealthRecords = async (records: Omit<HealthRecord, '記錄id'>[]): Promise<HealthRecord[]> => {
  const { data, error } = await supabase
    .from('健康記錄主表')
    .insert(records)
    .select();

  if (error) {
    console.error('Error creating batch health records:', error);
    throw error;
  }

  return data || [];
};

export const getFollowUps = async (): Promise<FollowUpAppointment[]> => {
  const { data, error } = await supabase
    .from('覆診安排主表')
    .select('*')
    .order('覆診日期', { ascending: true });

  if (error) {
    console.error('Error fetching follow-ups:', error);
    throw error;
  }

  return data || [];
};

export const createFollowUp = async (appointment: Omit<FollowUpAppointment, '覆診id' | '創建時間' | '更新時間'>): Promise<FollowUpAppointment> => {
  const { data, error } = await supabase
    .from('覆診安排主表')
    .insert([appointment])
    .select()
    .single();

  if (error) {
    console.error('Error creating follow-up:', error);
    throw error;
  }

  return data;
};

export const updateFollowUp = async (appointment: FollowUpAppointment): Promise<FollowUpAppointment> => {
  const { data, error } = await supabase
    .from('覆診安排主表')
    .update(appointment)
    .eq('覆診id', appointment.覆診id)
    .select()
    .single();

  if (error) {
    console.error('Error updating follow-up:', error);
    throw error;
  }

  return data;
};

export const deleteFollowUp = async (appointmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('覆診安排主表')
    .delete()
    .eq('覆診id', appointmentId);

  if (error) {
    console.error('Error deleting follow-up:', error);
    throw error;
  }
};

export const getHealthTasks = async (): Promise<PatientHealthTask[]> => {
  const { data, error } = await supabase
    .from('patient_health_tasks')
    .select('*')
    .order('next_due_at', { ascending: true });

  if (error) {
    console.error('Error fetching health tasks:', error);
    throw error;
  }

  return data || [];
};

export const createPatientHealthTask = async (task: Omit<PatientHealthTask, 'id' | 'created_at' | 'updated_at'>): Promise<PatientHealthTask> => {
  const { data, error } = await supabase
    .from('patient_health_tasks')
    .insert([task])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient health task:', error);
    throw error;
  }

  return data;
};

export const updatePatientHealthTask = async (task: PatientHealthTask): Promise<PatientHealthTask> => {
  const { data, error } = await supabase
    .from('patient_health_tasks')
    .update(task)
    .eq('id', task.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient health task:', error);
    throw error;
  }

  return data;
};

export const deletePatientHealthTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('patient_health_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting patient health task:', error);
    throw error;
  }
};

export const getMealGuidances = async (): Promise<MealGuidance[]> => {
  const { data, error } = await supabase
    .from('meal_guidance')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching meal guidances:', error);
    throw error;
  }

  return data || [];
};

export const createMealGuidance = async (guidance: Omit<MealGuidance, 'id' | 'created_at' | 'updated_at'>): Promise<MealGuidance> => {
  const { data, error } = await supabase
    .from('meal_guidance')
    .insert([guidance])
    .select()
    .single();

  if (error) {
    console.error('Error creating meal guidance:', error);
    throw error;
  }

  return data;
};

export const updateMealGuidance = async (guidance: MealGuidance): Promise<MealGuidance> => {
  const { data, error } = await supabase
    .from('meal_guidance')
    .update(guidance)
    .eq('id', guidance.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating meal guidance:', error);
    throw error;
  }

  return data;
};

export const deleteMealGuidance = async (guidanceId: string): Promise<void> => {
  const { error } = await supabase
    .from('meal_guidance')
    .delete()
    .eq('id', guidanceId);

  if (error) {
    console.error('Error deleting meal guidance:', error);
    throw error;
  }
};

export const getPatientLogs = async (): Promise<PatientLog[]> => {
  const { data, error } = await supabase
    .from('patient_logs')
    .select('*')
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient logs:', error);
    throw error;
  }

  return data || [];
};

export const createPatientLog = async (log: Omit<PatientLog, 'id' | 'created_at' | 'updated_at'>): Promise<PatientLog> => {
  const { data, error } = await supabase
    .from('patient_logs')
    .insert([log])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient log:', error);
    throw error;
  }

  return data;
};

export const updatePatientLog = async (log: PatientLog): Promise<PatientLog> => {
  const { data, error } = await supabase
    .from('patient_logs')
    .update(log)
    .eq('id', log.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient log:', error);
    throw error;
  }

  return data;
};

export const deletePatientLog = async (logId: string): Promise<void> => {
  const { error } = await supabase
    .from('patient_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting patient log:', error);
    throw error;
  }
};

export const getRestraintAssessments = async (): Promise<PatientRestraintAssessment[]> => {
  const { data, error } = await supabase
    .from('patient_restraint_assessments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching restraint assessments:', error);
    throw error;
  }

  return data || [];
};

export const createRestraintAssessment = async (assessment: Omit<PatientRestraintAssessment, 'id' | 'created_at' | 'updated_at'>): Promise<PatientRestraintAssessment> => {
  const { data, error } = await supabase
    .from('patient_restraint_assessments')
    .insert([assessment])
    .select()
    .single();

  if (error) {
    console.error('Error creating restraint assessment:', error);
    throw error;
  }

  return data;
};

export const updateRestraintAssessment = async (assessment: PatientRestraintAssessment): Promise<PatientRestraintAssessment> => {
  const { data, error } = await supabase
    .from('patient_restraint_assessments')
    .update(assessment)
    .eq('id', assessment.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating restraint assessment:', error);
    throw error;
  }

  return data;
};

export const deleteRestraintAssessment = async (assessmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('patient_restraint_assessments')
    .delete()
    .eq('id', assessmentId);

  if (error) {
    console.error('Error deleting restraint assessment:', error);
    throw error;
  }
};

export const getHealthAssessments = async (): Promise<HealthAssessment[]> => {
  const { data, error } = await supabase
    .from('health_assessments')
    .select('*')
    .order('assessment_date', { ascending: false });

  if (error) {
    console.error('Error fetching health assessments:', error);
    throw error;
  }

  return data || [];
};

export const createHealthAssessment = async (assessment: Omit<HealthAssessment, 'id' | 'created_at' | 'updated_at'>): Promise<HealthAssessment> => {
  const { data, error } = await supabase
    .from('health_assessments')
    .insert([assessment])
    .select()
    .single();

  if (error) {
    console.error('Error creating health assessment:', error);
    throw error;
  }

  return data;
};

export const updateHealthAssessment = async (assessment: HealthAssessment): Promise<HealthAssessment> => {
  const { data, error } = await supabase
    .from('health_assessments')
    .update(assessment)
    .eq('id', assessment.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating health assessment:', error);
    throw error;
  }

  return data;
};

export const deleteHealthAssessment = async (assessmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('health_assessments')
    .delete()
    .eq('id', assessmentId);

  if (error) {
    console.error('Error deleting health assessment:', error);
    throw error;
  }
};

export const getWoundAssessments = async (): Promise<WoundAssessment[]> => {
  const { data, error } = await supabase
    .from('wound_assessments')
    .select(`
      *,
      wound_details(*)
    `)
    .order('assessment_date', { ascending: false });

  if (error) {
    console.error('Error fetching wound assessments:', error);
    throw error;
  }

  return data || [];
};

export const createWoundAssessment = async (assessment: Omit<WoundAssessment, 'id' | 'created_at' | 'updated_at'>): Promise<WoundAssessment> => {
  const { wound_details, ...assessmentData } = assessment as any;

  const { data: assessmentRecord, error: assessmentError } = await supabase
    .from('wound_assessments')
    .insert([{
      patient_id: assessmentData.patient_id,
      assessment_date: assessmentData.assessment_date,
      next_assessment_date: assessmentData.next_assessment_date,
      assessor: assessmentData.assessor
    }])
    .select()
    .single();

  if (assessmentError) {
    console.error('Error creating wound assessment:', assessmentError);
    throw assessmentError;
  }

  if (wound_details && wound_details.length > 0) {
    const detailsToInsert = wound_details.map((detail: any) => ({
      wound_assessment_id: assessmentRecord.id,
      wound_location: detail.wound_location,
      wound_photos: detail.wound_photos || [],
      area_length: detail.area_length,
      area_width: detail.area_width,
      area_depth: detail.area_depth,
      stage: detail.stage,
      wound_status: detail.wound_status,
      responsible_unit: detail.responsible_unit,
      exudate_present: detail.exudate_present,
      exudate_amount: detail.exudate_amount,
      exudate_color: detail.exudate_color,
      exudate_type: detail.exudate_type,
      odor: detail.odor,
      granulation: detail.granulation,
      necrosis: detail.necrosis,
      infection: detail.infection,
      temperature: detail.temperature,
      surrounding_skin_condition: detail.surrounding_skin_condition,
      surrounding_skin_color: detail.surrounding_skin_color,
      cleanser: detail.cleanser,
      cleanser_other: detail.cleanser_other,
      dressings: detail.dressings || [],
      dressing_other: detail.dressing_other,
      remarks: detail.remarks
    }));

    const { error: detailsError } = await supabase
      .from('wound_details')
      .insert(detailsToInsert);

    if (detailsError) {
      await supabase.from('wound_assessments').delete().eq('id', assessmentRecord.id);
      console.error('Error creating wound details:', detailsError);
      throw detailsError;
    }
  }

  const { data: completeData, error: fetchError } = await supabase
    .from('wound_assessments')
    .select('*, wound_details(*)')
    .eq('id', assessmentRecord.id)
    .single();

  if (fetchError) {
    console.error('Error fetching complete wound assessment:', fetchError);
    throw fetchError;
  }

  return completeData;
};

export const updateWoundAssessment = async (assessment: WoundAssessment): Promise<WoundAssessment> => {
  const { wound_details, ...assessmentData } = assessment as any;

  const { data, error } = await supabase
    .from('wound_assessments')
    .update({
      patient_id: assessmentData.patient_id,
      assessment_date: assessmentData.assessment_date,
      next_assessment_date: assessmentData.next_assessment_date,
      assessor: assessmentData.assessor
    })
    .eq('id', assessment.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating wound assessment:', error);
    throw error;
  }

  if (wound_details) {
    await supabase
      .from('wound_details')
      .delete()
      .eq('wound_assessment_id', assessment.id);

    if (wound_details.length > 0) {
      const detailsToInsert = wound_details.map((detail: any) => ({
        wound_assessment_id: assessment.id,
        wound_location: detail.wound_location,
        wound_photos: detail.wound_photos || [],
        area_length: detail.area_length,
        area_width: detail.area_width,
        area_depth: detail.area_depth,
        stage: detail.stage,
        wound_status: detail.wound_status,
        responsible_unit: detail.responsible_unit,
        exudate_present: detail.exudate_present,
        exudate_amount: detail.exudate_amount,
        exudate_color: detail.exudate_color,
        exudate_type: detail.exudate_type,
        odor: detail.odor,
        granulation: detail.granulation,
        necrosis: detail.necrosis,
        infection: detail.infection,
        temperature: detail.temperature,
        surrounding_skin_condition: detail.surrounding_skin_condition,
        surrounding_skin_color: detail.surrounding_skin_color,
        cleanser: detail.cleanser,
        cleanser_other: detail.cleanser_other,
        dressings: detail.dressings || [],
        dressing_other: detail.dressing_other,
        remarks: detail.remarks
      }));

      const { error: detailsError } = await supabase
        .from('wound_details')
        .insert(detailsToInsert);

      if (detailsError) {
        console.error('Error updating wound details:', detailsError);
        throw detailsError;
      }
    }
  }

  const { data: completeData, error: fetchError } = await supabase
    .from('wound_assessments')
    .select('*, wound_details(*)')
    .eq('id', assessment.id)
    .single();

  if (fetchError) {
    console.error('Error fetching complete wound assessment:', fetchError);
    throw fetchError;
  }

  return completeData;
};

export const deleteWoundAssessment = async (assessmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('wound_assessments')
    .delete()
    .eq('id', assessmentId);

  if (error) {
    console.error('Error deleting wound assessment:', error);
    throw error;
  }
};

export const getPatientAdmissionRecords = async (): Promise<PatientAdmissionRecord[]> => {
  const { data, error } = await supabase
    .from('patient_admission_records')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    console.error('Error fetching patient admission records:', error);
    throw error;
  }

  return data || [];
};

export const createPatientAdmissionRecord = async (record: Omit<PatientAdmissionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PatientAdmissionRecord> => {
  const { data, error } = await supabase
    .from('patient_admission_records')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient admission record:', error);
    throw error;
  }

  return data;
};

export const updatePatientAdmissionRecord = async (record: PatientAdmissionRecord): Promise<PatientAdmissionRecord> => {
  const { data, error } = await supabase
    .from('patient_admission_records')
    .update(record)
    .eq('id', record.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient admission record:', error);
    throw error;
  }

  return data;
};

export const deletePatientAdmissionRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase
    .from('patient_admission_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('Error deleting patient admission record:', error);
    throw error;
  }
};

export const recordPatientAdmissionEvent = async (eventData: {
  patient_id: number;
  event_type: AdmissionEventType;
  event_date: string;
  hospital_name?: string;
  hospital_ward?: string;
  hospital_bed_number?: string;
  remarks?: string;
}): Promise<void> => {
  const { error } = await supabase
    .from('patient_admission_records')
    .insert([eventData]);

  if (error) {
    console.error('Error recording patient admission event:', error);
    throw error;
  }
};

export const getHospitalEpisodes = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('hospital_episodes')
    .select(`
      *,
      episode_events(*)
    `)
    .order('episode_start_date', { ascending: false });

  if (error) {
    console.error('Error fetching hospital episodes:', error);
    throw error;
  }

  return data || [];
};

export const createHospitalEpisode = async (episode: any): Promise<any> => {
  const { data, error } = await supabase
    .from('hospital_episodes')
    .insert([episode])
    .select()
    .single();

  if (error) {
    console.error('Error creating hospital episode:', error);
    throw error;
  }

  return data;
};

export const updateHospitalEpisode = async (episode: any): Promise<any> => {
  const { data, error } = await supabase
    .from('hospital_episodes')
    .update(episode)
    .eq('id', episode.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating hospital episode:', error);
    throw error;
  }

  return data;
};

export const deleteHospitalEpisode = async (episodeId: string): Promise<void> => {
  const { error } = await supabase
    .from('hospital_episodes')
    .delete()
    .eq('id', episodeId);

  if (error) {
    console.error('Error deleting hospital episode:', error);
    throw error;
  }
};

export const createEpisodeEvent = async (event: any): Promise<any> => {
  const { data, error } = await supabase
    .from('episode_events')
    .insert([event])
    .select()
    .single();

  if (error) {
    console.error('Error creating episode event:', error);
    throw error;
  }

  return data;
};

export const deleteEpisodeEventsByEpisodeId = async (episodeId: string): Promise<void> => {
  const { error } = await supabase
    .from('episode_events')
    .delete()
    .eq('episode_id', episodeId);

  if (error) {
    console.error('Error deleting episode events:', error);
    throw error;
  }
};

export const getOverdueDailySystemTasks = async (): Promise<DailySystemTask[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_system_tasks')
    .select('*')
    .lt('task_date', today)
    .eq('status', 'pending')
    .order('task_date', { ascending: true });

  if (error) {
    console.error('Error fetching overdue daily system tasks:', error);
    throw error;
  }

  return data || [];
};

export const recordDailySystemTaskCompletion = async (taskName: string, taskDate: string): Promise<void> => {
  const { error } = await supabase
    .from('daily_system_tasks')
    .upsert([{
      task_name: taskName,
      task_date: taskDate,
      status: 'completed',
      completed_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error recording daily system task completion:', error);
    throw error;
  }
};

// Drug Database functions
export const searchDrugs = async (searchTerm: string): Promise<DrugData[]> => {
  let query = supabase
    .from('medication_drug_database')
    .select('*')
    .order('drug_name', { ascending: true });

  if (searchTerm.trim()) {
    query = query.or(`drug_name.ilike.%${searchTerm}%,drug_code.ilike.%${searchTerm}%,drug_type.ilike.%${searchTerm}%,administration_route.ilike.%${searchTerm}%,unit.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching drugs:', error);
    throw error;
  }

  return data || [];
};

// Medication Inspection Rule functions
export const getMedicationInspectionRules = async (prescriptionId?: string): Promise<MedicationInspectionRule[]> => {
  let query = supabase
    .from('medication_inspection_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (prescriptionId) {
    query = query.eq('prescription_id', prescriptionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching medication inspection rules:', error);
    throw error;
  }

  return data || [];
};

export const createMedicationInspectionRule = async (ruleData: {
  prescription_id: string;
  vital_sign_type: VitalSignType;
  condition_operator: ConditionOperatorType;
  condition_value: number;
  action_if_met?: string;
}): Promise<MedicationInspectionRule> => {
  const { data, error } = await supabase
    .from('medication_inspection_rules')
    .insert([ruleData])
    .select()
    .single();

  if (error) {
    console.error('Error creating medication inspection rule:', error);
    throw error;
  }

  return data;
};

export const updateMedicationInspectionRule = async (ruleData: {
  id: string;
  prescription_id: string;
  vital_sign_type: VitalSignType;
  condition_operator: ConditionOperatorType;
  condition_value: number;
  action_if_met?: string;
}): Promise<MedicationInspectionRule> => {
  const { data, error } = await supabase
    .from('medication_inspection_rules')
    .update(ruleData)
    .eq('id', ruleData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating medication inspection rule:', error);
    throw error;
  }

  return data;
};

export const deleteMedicationInspectionRule = async (ruleId: string): Promise<void> => {
  const { error } = await supabase
    .from('medication_inspection_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting medication inspection rule:', error);
    throw error;
  }
};

// Medication Prescription functions
export const getMedicationPrescriptions = async (patientId?: number): Promise<MedicationPrescription[]> => {
  let query = supabase
    .from('new_medication_prescriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching medication prescriptions:', error);
    throw error;
  }

  return data || [];
};

export const createMedicationPrescription = async (prescriptionData: {
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
}): Promise<MedicationPrescription> => {
  const { data, error } = await supabase
    .from('new_medication_prescriptions')
    .insert([prescriptionData])
    .select()
    .single();

  if (error) {
    console.error('Error creating medication prescription:', error);
    throw error;
  }

  return data;
};

export const updateMedicationPrescription = async (prescriptionData: {
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
}): Promise<MedicationPrescription> => {
  const { data, error } = await supabase
    .from('new_medication_prescriptions')
    .update(prescriptionData)
    .eq('id', prescriptionData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating medication prescription:', error);
    throw error;
  }

  return data;
};

export const deleteMedicationPrescription = async (prescriptionId: string): Promise<void> => {
  const { error } = await supabase
    .from('new_medication_prescriptions')
    .delete()
    .eq('id', prescriptionId);

  if (error) {
    console.error('Error deleting medication prescription:', error);
    throw error;
  }
};

export const createMedicationPrescriptionWithRules = async (
  prescriptionData: {
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
  },
  inspectionRules?: {
    vital_sign_type: VitalSignType;
    condition_operator: ConditionOperatorType;
    condition_value: number;
    action_if_met?: string;
  }[]
): Promise<{ prescription: MedicationPrescription; rules: MedicationInspectionRule[] }> => {
  // Create prescription first
  const prescription = await createMedicationPrescription(prescriptionData);
  
  // Create inspection rules if provided
  const rules: MedicationInspectionRule[] = [];
  if (inspectionRules && inspectionRules.length > 0) {
    for (const ruleData of inspectionRules) {
      const rule = await createMedicationInspectionRule({
        prescription_id: prescription.id,
        ...ruleData
      });
      rules.push(rule);
    }
  }
  
  return { prescription, rules };
};

// Medication Workflow Settings types and functions
export interface MedicationWorkflowSettings {
  id: string;
  user_id: string;
  enable_one_click_functions: boolean;
  enable_immediate_preparation_alerts: boolean;
  auto_jump_to_next_patient: boolean;
  default_preparation_lead_time: number;
}

export const getMedicationWorkflowSettings = async (userId: string): Promise<MedicationWorkflowSettings | null> => {
  const { data, error } = await supabase
    .from('medication_workflow_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No settings found, return null
      return null;
    }
    console.error('Error fetching medication workflow settings:', error);
    throw error;
  }

  return data;
};

export const updateMedicationWorkflowSettings = async (
  userId: string, 
  settings: Partial<MedicationWorkflowSettings>
): Promise<MedicationWorkflowSettings> => {
  // First try to update existing settings
  const { data: existingData, error: fetchError } = await supabase
    .from('medication_workflow_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching existing settings:', fetchError);
    throw fetchError;
  }

  if (existingData) {
    // Update existing settings
    const { data, error } = await supabase
      .from('medication_workflow_settings')
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating medication workflow settings:', error);
      throw error;
    }

    return data;
  } else {
    // Create new settings
    const { data, error } = await supabase
      .from('medication_workflow_settings')
      .insert([{
        user_id: userId,
        enable_one_click_functions: settings.enable_one_click_functions ?? true,
        enable_immediate_preparation_alerts: settings.enable_immediate_preparation_alerts ?? true,
        auto_jump_to_next_patient: settings.auto_jump_to_next_patient ?? false,
        default_preparation_lead_time: settings.default_preparation_lead_time ?? 60
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating medication workflow settings:', error);
      throw error;
    }

    return data;
  }
};

// Medication Workflow Record functions
export const getMedicationWorkflowRecords = async (filters?: {
  patient_id?: number;
  scheduled_date?: string;
  preparation_status?: string;
  verification_status?: string;
  dispensing_status?: string;
}): Promise<MedicationWorkflowRecord[]> => {
  let query = supabase.from('medication_workflow_records').select('*');

  if (filters) {
    if (filters.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters.scheduled_date) {
      query = query.eq('scheduled_date', filters.scheduled_date);
    }
    if (filters.preparation_status) {
      query = query.eq('preparation_status', filters.preparation_status);
    }
    if (filters.verification_status) {
      query = query.eq('verification_status', filters.verification_status);
    }
    if (filters.dispensing_status) {
      query = query.eq('dispensing_status', filters.dispensing_status);
    }
  }

  query = query.order('scheduled_date', { ascending: true })
              .order('scheduled_time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching medication workflow records:', error);
    throw error;
  }

  return data || [];
};

export const createMedicationWorkflowRecord = async (
  record: Omit<MedicationWorkflowRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<MedicationWorkflowRecord> => {
  const { data, error } = await supabase
    .from('medication_workflow_records')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Error creating medication workflow record:', error);
    throw error;
  }

  return data;
};

export const updateMedicationWorkflowRecord = async (
  record: MedicationWorkflowRecord
): Promise<MedicationWorkflowRecord> => {
  const { data, error } = await supabase
    .from('medication_workflow_records')
    .update(record)
    .eq('id', record.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating medication workflow record:', error);
    throw error;
  }

  return data;
};

export const deleteMedicationWorkflowRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase
    .from('medication_workflow_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('Error deleting medication workflow record:', error);
    throw error;
  }
};

export const updateWorkflowRecordStatus = async (
  recordId: string,
  statusType: 'preparation' | 'verification' | 'dispensing',
  status: 'pending' | 'completed' | 'failed',
  staff?: string,
  failureReason?: string,
  customFailureReason?: string
): Promise<void> => {
  const updateData: any = {
    [`${statusType}_status`]: status,
    [`${statusType}_time`]: new Date().toISOString()
  };

  if (staff) {
    updateData[`${statusType}_staff`] = staff;
  }

  if (status === 'failed' && statusType === 'dispensing') {
    if (failureReason) {
      updateData.dispensing_failure_reason = failureReason;
    }
    if (customFailureReason) {
      updateData.custom_failure_reason = customFailureReason;
    }
  }

  const { error } = await supabase
    .from('medication_workflow_records')
    .update(updateData)
    .eq('id', recordId);

  if (error) {
    console.error('Error updating workflow record status:', error);
    throw error;
  }
};

export const batchUpdateWorkflowRecords = async (
  recordIds: string[],
  updates: Partial<MedicationWorkflowRecord>
): Promise<void> => {
  const { error } = await supabase
    .from('medication_workflow_records')
    .update(updates)
    .in('id', recordIds);

  if (error) {
    console.error('Error batch updating workflow records:', error);
    throw error;
  }
};

export const getWorkflowRecordsByDateRange = async (
  startDate: string,
  endDate: string,
  patientId?: number
): Promise<MedicationWorkflowRecord[]> => {
  let query = supabase.from('medication_workflow_records')
    .select('*')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching workflow records by date range:', error);
    throw error;
  }

  return data || [];
};

export const getWorkflowRecordsByStatus = async (
  statusType: 'preparation' | 'verification' | 'dispensing',
  status: 'pending' | 'completed' | 'failed'
): Promise<MedicationWorkflowRecord[]> => {
  const { data, error } = await supabase
    .from('medication_workflow_records')
    .select('*')
    .eq(`${statusType}_status`, status)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching workflow records by status:', error);
    throw error;
  }

  return data || [];
};

export const generateWorkflowRecordsForPrescription = async (
  prescriptionId: string,
  startDate: string,
  endDate: string
): Promise<MedicationWorkflowRecord[]> => {
  // Get prescription details
  const { data: prescription, error: prescError } = await supabase
    .from('new_medication_prescriptions')
    .select('*')
    .eq('id', prescriptionId)
    .single();

  if (prescError) {
    console.error('Error fetching prescription:', prescError);
    throw prescError;
  }

  if (!prescription) {
    throw new Error('Prescription not found');
  }

  // Generate workflow records based on prescription schedule
  const records: Omit<MedicationWorkflowRecord, 'id' | 'created_at' | 'updated_at'>[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate records based on medication time slots
    if (prescription.medication_time_slots && Array.isArray(prescription.medication_time_slots)) {
      for (const timeSlot of prescription.medication_time_slots) {
        records.push({
          prescription_id: prescriptionId,
          patient_id: prescription.patient_id,
          scheduled_date: dateStr,
          scheduled_time: timeSlot,
          preparation_status: 'pending',
          verification_status: 'pending',
          dispensing_status: 'pending'
        });
      }
    }
  }

  if (records.length === 0) {
    return [];
  }

  // Insert records
  const { data, error } = await supabase
    .from('medication_workflow_records')
    .insert(records)
    .select();

  if (error) {
    console.error('Error generating workflow records:', error);
    throw error;
  }

  return data || [];
};

export const batchUpdateWorkflowStatus = async (recordIds: string[], updates: {
  preparation_status?: WorkflowStatusEnum;
  verification_status?: WorkflowStatusEnum;
  dispensing_status?: WorkflowStatusEnum;
  staff?: string;
}): Promise<void> => {
  const updateData: any = {};
  
  if (updates.preparation_status) {
    updateData.preparation_status = updates.preparation_status;
    updateData.preparation_staff = updates.staff;
    updateData.preparation_time = new Date().toISOString();
  }
  
  if (updates.verification_status) {
    updateData.verification_status = updates.verification_status;
    updateData.verification_staff = updates.staff;
    updateData.verification_time = new Date().toISOString();
  }
  
  if (updates.dispensing_status) {
    updateData.dispensing_status = updates.dispensing_status;
    updateData.dispensing_staff = updates.staff;
    updateData.dispensing_time = new Date().toISOString();
  }

  const { error } = await supabase
    .from('medication_workflow_records')
    .update(updateData)
    .in('id', recordIds);

  if (error) {
    console.error('Error batch updating workflow status:', error);
    throw error;
  }
};

export const resetMedicationWorkflowStep = async (recordId: string, step: 'preparation' | 'verification' | 'dispensing'): Promise<void> => {
  const updateData: any = {};
  
  switch (step) {
    case 'preparation':
      updateData.preparation_status = 'pending';
      updateData.preparation_staff = null;
      updateData.preparation_time = null;
      break;
    case 'verification':
      updateData.verification_status = 'pending';
      updateData.verification_staff = null;
      updateData.verification_time = null;
      break;
    case 'dispensing':
      updateData.dispensing_status = 'pending';
      updateData.dispensing_staff = null;
      updateData.dispensing_time = null;
      updateData.dispensing_failure_reason = null;
      updateData.custom_failure_reason = null;
      break;
  }

  const { error } = await supabase
    .from('medication_workflow_records')
    .update(updateData)
    .eq('id', recordId);

  if (error) {
    console.error('Error resetting medication workflow step:', error);
    throw error;
  }
};

// Vital sign and condition options for medication inspection rules
export const vitalSignOptions = [
  { value: '上壓', label: '收縮壓', unit: 'mmHg' },
  { value: '下壓', label: '舒張壓', unit: 'mmHg' },
  { value: '脈搏', label: '脈搏', unit: 'bpm' },
  { value: '血糖值', label: '血糖值', unit: 'mmol/L' },
  { value: '呼吸', label: '呼吸頻率', unit: '/min' },
  { value: '血含氧量', label: '血含氧量', unit: '%' },
  { value: '體溫', label: '體溫', unit: '°C' }
];

export const conditionOptions = [
  { value: 'gt', label: '大於', symbol: '>' },
  { value: 'lt', label: '小於', symbol: '<' },
  { value: 'gte', label: '大於等於', symbol: '≥' },
  { value: 'lte', label: '小於等於', symbol: '≤' }
];

// Template management functions
export const getTemplatesMetadata = async () => {
  const { data, error } = await supabase
    .from('templates_metadata')
    .select('*')
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }

  return data || [];
};

export const uploadTemplateFile = async (file: File, storagePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('templates')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  return data.path;
};

export const createTemplateMetadata = async (metadata: {
  name: string;
  type: string;
  original_name: string;
  storage_path: string;
  file_size: number;
  description?: string;
  extracted_format: any;
}) => {
  const { data, error } = await supabase
    .from('templates_metadata')
    .insert([metadata])
    .select()
    .single();

  if (error) {
    console.error('Error creating template metadata:', error);
    throw error;
  }

  return data;
};

export const deleteTemplateMetadata = async (templateId: number): Promise<void> => {
  const { error } = await supabase
    .from('templates_metadata')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting template metadata:', error);
    throw error;
  }
};

export const deleteFileFromStorage = async (storagePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('templates')
    .remove([storagePath]);

  if (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
};

export const downloadTemplateFile = async (storagePath: string, originalName: string): Promise<void> => {
  const { data, error } = await supabase.storage
    .from('templates')
    .download(storagePath);

  if (error) {
    console.error('Error downloading file:', error);
    throw error;
  }

  // Create download link
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// DrugModal component interface
interface DrugModalProps {
  drug?: DrugData | null;
  onClose: () => void;
  onSave: () => void;
}

const DrugModal: React.FC<DrugModalProps> = ({ drug, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    drug_name: drug?.drug_name || '',
    drug_code: drug?.drug_code || '',
    drug_type: drug?.drug_type || '',
    administration_route: drug?.administration_route || '',
    unit: drug?.unit || '',
    photo_url: drug?.photo_url || '',
    notes: drug?.notes || ''
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(drug?.photo_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 常用選項
  const drugTypeOptions = [
    '止痛藥', '抗生素', '降血壓藥', '糖尿病藥', '心臟病藥', '胃藥', 
    '利尿劑', '降膽固醇藥', '抗凝血藥', '維他命', '外用藥', '眼藥水', '其他'
  ];

  const administrationRouteOptions = [
    '口服', '外用', '注射', '滴眼', '滴耳', '鼻噴', '舌下', '直腸', '其他'
  ];

  const unitOptions = [
    '粒', '片', '膠囊', 'ml', 'mg', '滴', '支', '瓶', '包', '貼', '其他'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('圖片大小不能超過 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setPhotoPreview(base64String);
        setFormData(prev => ({
          ...prev,
          photo_url: base64String
        }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('上傳照片失敗:', error);
      alert('上傳照片失敗，請重試');
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData(prev => ({
      ...prev,
      photo_url: ''
    }));
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create a simple camera capture modal
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">拍攝藥物照片</h3>
            <button id="close-camera" class="text-gray-400 hover:text-gray-600">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div id="video-container" class="w-full h-64 bg-gray-100 rounded-lg overflow-hidden"></div>
            <div class="flex space-x-3">
              <button id="capture-btn" class="btn-primary flex-1">拍照</button>
              <button id="cancel-btn" class="btn-secondary flex-1">取消</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.getElementById('video-container')?.appendChild(video);
      
      const closeCamera = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };
      
      document.getElementById('close-camera')?.addEventListener('click', closeCamera);
      document.getElementById('cancel-btn')?.addEventListener('click', closeCamera);
      
      document.getElementById('capture-btn')?.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          
          setPhotoPreview(dataURL);
          setFormData(prev => ({
            ...prev,
            photo_url: dataURL
          }));
        }
        
        closeCamera();
      });
      
    } catch (error) {
      console.error('無法開啟攝影機:', error);
      alert('無法開啟攝影機，請檢查權限設定');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.drug_name.trim()) {
      alert('請輸入藥物名稱');
      return;
    }

    try {
      const drugData = {
        drug_name: formData.drug_name.trim(),
        drug_code: formData.drug_code.trim() || null,
        drug_type: formData.drug_type.trim() || null,
        administration_route: formData.administration_route.trim() || null,
        unit: formData.unit.trim() || null,
        photo_url: formData.photo_url.trim() || null,
        notes: formData.notes.trim() || null
      };

      if (drug) {
        await updateDrug({
          ...drug,
          ...drugData
        });
      } else {
        await createDrug(drugData);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('儲存藥物失敗:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        alert('藥物編號已存在，請使用不同的編號');
      } else {
        alert('儲存藥物失敗，請重試');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Pill className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {drug ? '編輯藥物' : '新增藥物'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 藥物相片上傳 */}
          <div>
            <label className="form-label">藥物相片</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="藥物照片" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Pill className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <label className="btn-secondary cursor-pointer flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>上傳照片</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>拍攝照片</span>
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="btn-danger flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>移除照片</span>
                  </button>
                )}
              </div>
            </div>
            {isUploading && (
              <p className="text-sm text-blue-600 mt-2">上傳中...</p>
            )}
          </div>

          {/* 基本資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                <Pill className="h-4 w-4 inline mr-1" />
                藥物名稱 *
              </label>
              <input
                type="text"
                name="drug_name"
                value={formData.drug_name}
                onChange={handleChange}
                className="form-input"
                placeholder="輸入藥物名稱"
                required
              />
            </div>

            <div>
              <label className="form-label">
                <Code className="h-4 w-4 inline mr-1" />
                藥物編號
              </label>
              <input
                type="text"
                name="drug_code"
                value={formData.drug_code}
                onChange={handleChange}
                className="form-input"
                placeholder="輸入藥物編號（可選）"
              />
              <p className="text-xs text-gray-500 mt-1">
                藥物編號必須唯一，如果填寫的話
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                <Tag className="h-4 w-4 inline mr-1" />
                藥物類型
              </label>
              <input
                list="drug-type-options"
                name="drug_type"
                value={formData.drug_type}
                onChange={handleChange}
                className="form-input"
                placeholder="選擇或輸入藥物類型"
              />
              <datalist id="drug-type-options">
                {drugTypeOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="form-label">
                <Route className="h-4 w-4 inline mr-1" />
                使用途徑
              </label>
              <input
                list="administration-route-options"
                name="administration_route"
                value={formData.administration_route}
                onChange={handleChange}
                className="form-input"
                placeholder="選擇或輸入使用途徑"
              />
              <datalist id="administration-route-options">
                {administrationRouteOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="form-label">
              <Hash className="h-4 w-4 inline mr-1" />
              藥物單位
            </label>
            <input
              list="unit-options"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="form-input"
              placeholder="選擇或輸入藥物單位"
            />
            <datalist id="unit-options">
              {unitOptions.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="form-label">
              <FileText className="h-4 w-4 inline mr-1" />
              藥物備註
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
              rows={3}
              placeholder="輸入藥物相關備註、注意事項或使用說明..."
            />
          </div>

          {/* 預覽區域 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">藥物資訊預覽</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">藥物名稱:</span>
                <span className="font-medium text-gray-900">{formData.drug_name || '未填寫'}</span>
              </div>
              
              {formData.drug_code && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">藥物編號:</span>
                  <span className="font-medium text-blue-600">{formData.drug_code}</span>
                </div>
              )}
              
              {formData.drug_type && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">藥物類型:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {formData.drug_type}
                  </span>
                </div>
              )}
              
              {formData.administration_route && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">使用途徑:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {formData.administration_route}
                  </span>
                </div>
              )}
              
              {formData.unit && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">藥物單位:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formData.unit}
                  </span>
                </div>
              )}
              
              {formData.notes && (
                <div className="flex items-start space-x-2">
                  <span className="text-gray-600">備註:</span>
                  <span className="font-medium">{formData.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* 提交按鈕 */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {drug ? '更新藥物' : '新增藥物'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const getAnnualHealthCheckups = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('annual_health_checkups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching annual health checkups:', error);
    throw error;
  }

  return data || [];
};

export const createAnnualHealthCheckup = async (checkup: any): Promise<any> => {
  const { data, error } = await supabase
    .from('annual_health_checkups')
    .insert([checkup])
    .select()
    .single();

  if (error) {
    console.error('Error creating annual health checkup:', error);
    throw error;
  }

  return data;
};

export const updateAnnualHealthCheckup = async (checkup: any): Promise<any> => {
  const { id, ...updateData } = checkup;

  const { data, error } = await supabase
    .from('annual_health_checkups')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating annual health checkup:', error);
    throw error;
  }

  return data;
};

export const deleteAnnualHealthCheckup = async (checkupId: string): Promise<void> => {
  const { error } = await supabase
    .from('annual_health_checkups')
    .delete()
    .eq('id', checkupId);

  if (error) {
    console.error('Error deleting annual health checkup:', error);
    throw error;
  }
};

export const getAnnualHealthCheckupByPatientId = async (patientId: number): Promise<any | null> => {
  const { data, error } = await supabase
    .from('annual_health_checkups')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching annual health checkup by patient ID:', error);
    throw error;
  }

  return data;
};

export const getIncidentReports = async (): Promise<IncidentReport[]> => {
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .order('incident_date', { ascending: false });

  if (error) {
    console.error('Error fetching incident reports:', error);
    throw error;
  }

  return data || [];
};

export const createIncidentReport = async (report: Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>): Promise<IncidentReport> => {
  const { data, error } = await supabase
    .from('incident_reports')
    .insert([report])
    .select()
    .single();

  if (error) {
    console.error('Error creating incident report:', error);
    throw error;
  }

  return data;
};

export const updateIncidentReport = async (report: IncidentReport): Promise<IncidentReport> => {
  const { id, created_at, updated_at, ...updateData } = report;

  const { data, error } = await supabase
    .from('incident_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating incident report:', error);
    throw error;
  }

  return data;
};

export const deleteIncidentReport = async (reportId: string): Promise<void> => {
  const { error } = await supabase
    .from('incident_reports')
    .delete()
    .eq('id', reportId);

  if (error) {
    console.error('Error deleting incident report:', error);
    throw error;
  }
};

export default DrugModal;