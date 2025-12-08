import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ReactNode } from 'react';
import * as db from '../lib/database';
import { supabase } from '../lib/supabase';
import { generateDailyWorkflowRecords } from '../utils/workflowGenerator';
import { useAuth } from './AuthContext';

// Re-export types from database module
export type { Patient, HealthRecord, PatientHealthTask, HealthTaskType, FrequencyUnit, FollowUpAppointment, MealGuidance, MealCombinationType, SpecialDietType, PatientLog, PatientRestraintAssessment, WoundAssessment, PatientAdmissionRecord, AdmissionEventType, DailySystemTask, DeletedHealthRecord, DuplicateRecordGroup, IncidentReport, DiagnosisRecord, VaccinationRecord, PatientNote } from '../lib/database';

// Wound photo interface
export interface WoundPhoto {
  id: string;
  base64: string;
  filename: string;
  uploadDate: string;
  description?: string;
}

// Extended schedule interface for UI
export interface ScheduleWithDetails extends db.Schedule {
  院友列表: db.ScheduleDetail[];
}

// 處方工作流程記錄類型
export interface PrescriptionWorkflowRecord {
  id: string;
  prescription_id: string;
  patient_id: number;
  scheduled_date: string;
  scheduled_time: string;
  meal_timing?: string;
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
  created_at: string;
  updated_at: string;
}

// 檢測項檢查結果類型
export interface InspectionCheckResult {
  canDispense: boolean;
  blockedRules: Array<{
    vital_sign_type: string;
    condition_operator: string;
    condition_value: number;
    actual_value: number;
    action_if_met: string;
  }>;
  usedVitalSignData: {
    [key: string]: number;
  };
  message?: string;
}

// 處方時段定義類型
export interface PrescriptionTimeSlotDefinition {
  id: string;
  slot_name: string;
  start_time?: string;
  end_time?: string;
  is_meal_related: boolean;
  meal_type?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface PatientContextType {
  patients: db.Patient[];
  stations: db.Station[];
  beds: db.Bed[];
  schedules: ScheduleWithDetails[];
  prescriptions: db.Prescription[];
  drugDatabase: any[];
  serviceReasons: db.ServiceReason[];
  healthRecords: db.HealthRecord[];
  followUpAppointments: db.FollowUpAppointment[];
  mealGuidances: db.MealGuidance[];
  patientLogs: db.PatientLog[];
  patientHealthTasks: db.PatientHealthTask[];
  patientRestraintAssessments: db.PatientRestraintAssessment[];
  healthAssessments: db.HealthAssessment[];
  woundAssessments: db.WoundAssessment[];
  patientAdmissionRecords: db.PatientAdmissionRecord[];
  hospitalEpisodes: any[];
  annualHealthCheckups: any[];
  incidentReports: db.IncidentReport[];
  diagnosisRecords: db.DiagnosisRecord[];
  vaccinationRecords: db.VaccinationRecord[];
  patientNotes: db.PatientNote[];
  patrolRounds: db.PatrolRound[];
  diaperChangeRecords: db.DiaperChangeRecord[];
  restraintObservationRecords: db.RestraintObservationRecord[];
  positionChangeRecords: db.PositionChangeRecord[];
  admissionRecords: db.PatientAdmissionRecord[];
  loading: boolean;
  
  // 新增的處方工作流程相關屬性
  prescriptionWorkflowRecords: PrescriptionWorkflowRecord[];
  prescriptionTimeSlotDefinitions: PrescriptionTimeSlotDefinition[];
  checkEligiblePatientsForTemperature: (targetDate?: string) => {
    eligiblePatients: db.Patient[];
    excludedPatients: { patient: db.Patient; reason: string }[];
    targetDate: string;
  };
  
  // Hospital Outreach Records
  hospitalOutreachRecords: any[];
  hospitalOutreachRecordHistory: any[];
  doctorVisitSchedule: any[];
  fetchHospitalOutreachRecords: () => Promise<void>;
  fetchHospitalOutreachRecordHistory: (patientId: number) => Promise<void>;
  addHospitalOutreachRecord: (recordData: any) => Promise<void>;
  updateHospitalOutreachRecord: (recordData: any) => Promise<void>;
  deleteHospitalOutreachRecord: (recordId: string) => Promise<void>;
  addDoctorVisitSchedule: (scheduleData: any) => Promise<void>;
  updateDoctorVisitSchedule: (scheduleData: any) => Promise<void>;
  deleteDoctorVisitSchedule: (scheduleId: string) => Promise<void>;
  fetchDoctorVisitSchedule: () => Promise<void>;
  
  dailySystemTasks: db.DailySystemTask[];
  addDrug: (drug: Omit<any, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDrug: (drug: any) => Promise<void>;
  deleteDrug: (id: string) => Promise<void>;
  addPatient: (patient: Omit<db.Patient, '院友id'>) => Promise<void>;
  updatePatient: (patient: db.Patient) => Promise<void>;
  deletePatient: (id: number) => Promise<void>;
  addStation: (station: Omit<db.Station, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStation: (station: db.Station) => Promise<void>;
  deleteStation: (id: string) => Promise<void>;
  addBed: (bed: Omit<db.Bed, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateBed: (bed: db.Bed) => Promise<void>;
  deleteBed: (id: string) => Promise<void>;
  assignPatientToBed: (patientId: number, bedId: string) => Promise<void>;
  swapPatientBeds: (patientId1: number, patientId2: number) => Promise<void>;
  moveBedToStation: (bedId: string, newStationId: string) => Promise<void>;
  addSchedule: (schedule: Omit<db.Schedule, '排程id'>) => Promise<void>;
  updateSchedule: (schedule: ScheduleWithDetails) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
  addPatientToSchedule: (scheduleId: number, patientId: number, symptoms: string, notes: string, reasons: string[]) => Promise<void>;
  updateScheduleDetail: (detail: any) => Promise<void>;
  deleteScheduleDetail: (detailId: number) => Promise<void>;
  addPrescription: (prescription: Omit<db.Prescription, '處方id'>) => Promise<void>;
  updatePrescription: (prescription: db.Prescription) => Promise<void>;
  deletePrescription: (id: number) => Promise<void>;
  addHealthRecord: (record: Omit<db.HealthRecord, '記錄id'>) => Promise<void>;
  updateHealthRecord: (record: db.HealthRecord) => Promise<void>;
  deleteHealthRecord: (id: number) => Promise<void>;
  addFollowUpAppointment: (appointment: Omit<db.FollowUpAppointment, '覆診id' | '創建時間' | '更新時間'>) => Promise<void>;
  updateFollowUpAppointment: (appointment: db.FollowUpAppointment) => Promise<void>;
  deleteFollowUpAppointment: (id: string) => Promise<void>;
  addMealGuidance: (guidance: Omit<db.MealGuidance, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateMealGuidance: (guidance: db.MealGuidance) => Promise<void>;
  deleteMealGuidance: (id: string) => Promise<void>;
  addPatientLog: (log: Omit<db.PatientLog, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatientLog: (log: db.PatientLog) => Promise<void>;
  deletePatientLog: (id: string) => Promise<void>;
  addPatientHealthTask: (task: Omit<db.PatientHealthTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatientHealthTask: (task: db.PatientHealthTask) => Promise<void>;
  deletePatientHealthTask: (id: string) => Promise<void>;
  setPatientHealthTasks: React.Dispatch<React.SetStateAction<db.PatientHealthTask[]>>;
  addPatientRestraintAssessment: (assessment: Omit<db.PatientRestraintAssessment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatientRestraintAssessment: (assessment: db.PatientRestraintAssessment) => Promise<void>;
  deletePatientRestraintAssessment: (id: string) => Promise<void>;
  addHealthAssessment: (assessment: Omit<db.HealthAssessment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateHealthAssessment: (assessment: db.HealthAssessment) => Promise<void>;
  deleteHealthAssessment: (id: string) => Promise<void>;
  addWoundAssessment: (assessment: Omit<db.WoundAssessment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateWoundAssessment: (assessment: db.WoundAssessment) => Promise<void>;
  deleteWoundAssessment: (id: string) => Promise<void>;
  addAnnualHealthCheckup: (checkup: any) => Promise<void>;
  updateAnnualHealthCheckup: (checkup: any) => Promise<void>;
  deleteAnnualHealthCheckup: (id: string) => Promise<void>;
  addIncidentReport: (report: Omit<db.IncidentReport, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateIncidentReport: (report: db.IncidentReport) => Promise<void>;
  deleteIncidentReport: (id: string) => Promise<void>;
  addDiagnosisRecord: (record: Omit<db.DiagnosisRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDiagnosisRecord: (record: db.DiagnosisRecord) => Promise<void>;
  deleteDiagnosisRecord: (id: string) => Promise<void>;
  addVaccinationRecord: (record: Omit<db.VaccinationRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateVaccinationRecord: (record: db.VaccinationRecord) => Promise<void>;
  deleteVaccinationRecord: (id: string) => Promise<void>;
  addPatientNote: (note: Omit<db.PatientNote, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatientNote: (note: db.PatientNote) => Promise<void>;
  deletePatientNote: (id: string) => Promise<void>;
  completePatientNote: (id: string) => Promise<void>;
  createPatrolRound: (round: Omit<db.PatrolRound, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deletePatrolRound: (id: string) => Promise<void>;
  createDiaperChangeRecord: (record: Omit<db.DiaperChangeRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDiaperChangeRecord: (record: db.DiaperChangeRecord) => Promise<void>;
  deleteDiaperChangeRecord: (id: string) => Promise<void>;
  createRestraintObservationRecord: (record: Omit<db.RestraintObservationRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateRestraintObservationRecord: (record: db.RestraintObservationRecord) => Promise<void>;
  deleteRestraintObservationRecord: (id: string) => Promise<void>;
  createPositionChangeRecord: (record: Omit<db.PositionChangeRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deletePositionChangeRecord: (id: string) => Promise<void>;
  addPatientAdmissionRecord: (record: Omit<db.PatientAdmissionRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatientAdmissionRecord: (record: db.PatientAdmissionRecord) => Promise<void>;
  deletePatientAdmissionRecord: (id: string) => Promise<void>;
  addHospitalEpisode: (episodeData: any) => Promise<void>;
  updateHospitalEpisode: (episodeData: any) => Promise<void>;
  deleteHospitalEpisode: (id: string) => Promise<void>;
  generateRandomTemperaturesForActivePatients: () => Promise<void>;
  recordDailyTemperatureGenerationCompletion: () => Promise<void>;
  getOverdueDailySystemTasks: () => Promise<db.DailySystemTask[]>;
  recordPatientAdmissionEvent: (eventData: {
    patient_id: number;
    event_type: db.AdmissionEventType;
    event_date: string;
    hospital_name?: string;
    hospital_ward?: string;
    hospital_bed_number?: string;
    remarks?: string;
  }) => Promise<void>;
  refreshData: () => Promise<void>;
  refreshHealthData: () => Promise<void>;
  
  // 新增的處方工作流程相關函數
  fetchPrescriptionWorkflowRecords: (patientId?: number, date?: string) => Promise<PrescriptionWorkflowRecord[]>;
  createPrescriptionWorkflowRecord: (recordData: Omit<PrescriptionWorkflowRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePrescriptionWorkflowRecord: (recordId: string, updateData: Partial<PrescriptionWorkflowRecord>) => Promise<void>;
  prepareMedication: (recordId: string, staffId: string) => Promise<void>;
  verifyMedication: (recordId: string, staffId: string) => Promise<void>;
  dispenseMedication: (recordId: string, staffId: string, failureReason?: string, customReason?: string, newVitalSignData?: Omit<db.HealthRecord, '記錄id'>) => Promise<void>;
  checkPrescriptionInspectionRules: (prescriptionId: string, patientId: number, newVitalSignData?: Omit<db.HealthRecord, '記錄id'>) => Promise<InspectionCheckResult>;
  fetchLatestVitalSigns: (patientId: number, vitalSignType: string) => Promise<db.HealthRecord | null>;
  batchSetDispenseFailure: (patientId: number, scheduledDate: string, scheduledTime: string, reason: string) => Promise<void>;
  
  // 撤銷工作流程步驟
  revertPrescriptionWorkflowStep: (recordId: string, step: 'preparation' | 'verification' | 'dispensing', patientId?: number, scheduledDate?: string) => Promise<void>;
  
  // 處方時段定義相關函數
  fetchPrescriptionTimeSlotDefinitions: () => Promise<PrescriptionTimeSlotDefinition[]>;
  addPrescriptionTimeSlotDefinition: (definition: Omit<PrescriptionTimeSlotDefinition, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePrescriptionTimeSlotDefinition: (definition: PrescriptionTimeSlotDefinition) => Promise<void>;
  deletePrescriptionTimeSlotDefinition: (id: string) => Promise<void>;

  // 健康记录回收筒相关函数
  deletedHealthRecords: db.DeletedHealthRecord[];
  fetchDeletedHealthRecords: () => Promise<void>;
  restoreHealthRecord: (deletedRecordId: string) => Promise<void>;
  permanentlyDeleteHealthRecord: (deletedRecordId: string) => Promise<void>;

  // 健康记录去重相关函数
  findDuplicateHealthRecords: () => Promise<db.DuplicateRecordGroup[]>;
  batchDeleteDuplicateRecords: (duplicateRecordIds: number[], deletedBy?: string) => Promise<void>;

  // [新增] 載入所有歷史記錄
  loadFullHealthRecords: () => Promise<void>;
}

interface PatientProviderProps {
  children: ReactNode;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<PatientProviderProps> = ({ children }) => {
  const { user, authReady } = useAuth();
  
  // 1. 狀態 State 定義 (Loading 放在這裡)
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isAllHealthRecordsLoaded, setIsAllHealthRecordsLoaded] = useState(false);

  // 資料狀態
  const [patients, setPatients] = useState<db.Patient[]>([]);
  const [stations, setStations] = useState<db.Station[]>([]);
  const [beds, setBeds] = useState<db.Bed[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [serviceReasons, setServiceReasons] = useState<db.ServiceReason[]>([]);
  const [healthRecords, setHealthRecords] = useState<db.HealthRecord[]>([]);
  const [deletedHealthRecords, setDeletedHealthRecords] = useState<db.DeletedHealthRecord[]>([]);
  const [followUpAppointments, setFollowUpAppointments] = useState<db.FollowUpAppointment[]>([]);
  const [mealGuidances, setMealGuidances] = useState<db.MealGuidance[]>([]);
  const [patientHealthTasks, setPatientHealthTasks] = useState<db.PatientHealthTask[]>([]);
  const [patientLogs, setPatientLogs] = useState<db.PatientLog[]>([]);
  const [patientRestraintAssessments, setPatientRestraintAssessments] = useState<db.PatientRestraintAssessment[]>([]);
  const [healthAssessments, setHealthAssessments] = useState<db.HealthAssessment[]>([]);
  const [woundAssessments, setWoundAssessments] = useState<db.WoundAssessment[]>([]);
  const [annualHealthCheckups, setAnnualHealthCheckups] = useState<any[]>([]);
  const [incidentReports, setIncidentReports] = useState<db.IncidentReport[]>([]);
  const [diagnosisRecords, setDiagnosisRecords] = useState<db.DiagnosisRecord[]>([]);
  const [vaccinationRecords, setVaccinationRecords] = useState<db.VaccinationRecord[]>([]);
  const [patientNotes, setPatientNotes] = useState<db.PatientNote[]>([]);
  const [patrolRounds, setPatrolRounds] = useState<db.PatrolRound[]>([]);
  const [diaperChangeRecords, setDiaperChangeRecords] = useState<db.DiaperChangeRecord[]>([]);
  const [restraintObservationRecords, setRestraintObservationRecords] = useState<db.RestraintObservationRecord[]>([]);
  const [positionChangeRecords, setPositionChangeRecords] = useState<db.PositionChangeRecord[]>([]);
  const [patientAdmissionRecords, setPatientAdmissionRecords] = useState<db.PatientAdmissionRecord[]>([]);
  const [hospitalEpisodes, setHospitalEpisodes] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [drugDatabase, setDrugDatabase] = useState<any[]>([]);
  const [hospitalOutreachRecords, setHospitalOutreachRecords] = useState<any[]>([]);
  const [hospitalOutreachRecordHistory, setHospitalOutreachRecordHistory] = useState<any[]>([]);
  const [doctorVisitSchedule, setDoctorVisitSchedule] = useState<any[]>([]);
  const [prescriptionWorkflowRecords, setPrescriptionWorkflowRecords] = useState<any[]>([]);
  const [prescriptionTimeSlotDefinitions, setPrescriptionTimeSlotDefinitions] = useState<PrescriptionTimeSlotDefinition[]>([]);
  const [dailySystemTasks, setDailySystemTasks] = useState<db.DailySystemTask[]>([]);

  // 2. 輔助函式定義
  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return hongKongTime.toISOString().split('T')[0];
  };

  const getFixedMorningTime = () => {
    return '08:00';
  };

  const generateRandomTemperature = () => {
    return (Math.random() * 0.9 + 36.0).toFixed(1);
  };

  const checkEligiblePatientsForTemperature = (targetDate?: string) => {
    const today = targetDate || getHongKongDate();
    const eligiblePatients: db.Patient[] = [];
    const excludedPatients: { patient: db.Patient; reason: string }[] = [];

    patients.forEach(patient => {
      if (patient.在住狀態 !== '在住') {
        excludedPatients.push({ patient, reason: '不在住狀態' });
        return;
      }
      
      if (patient.is_hospitalized) {
        excludedPatients.push({ patient, reason: '住院中' });
        return;
      }
      
      const hasTemperatureRecord = healthRecords.some(record => 
        record.院友id === patient.院友id && 
        record.記錄日期 === today && 
        record.記錄類型 === '生命表徵' && 
        record.體溫 !== null
      );

      if (hasTemperatureRecord) {
        excludedPatients.push({ patient, reason: '已量度體溫' });
        return;
      }
      
      eligiblePatients.push(patient);
    });

    return {
      eligiblePatients,
      excludedPatients,
      targetDate: today
    };
  };

  // Fetch functions using useCallback
  const fetchHospitalOutreachRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('hospital_outreach_records').select('*').order('medication_bag_date', { ascending: false });
      if (error) throw error;
      setHospitalOutreachRecords(data || []);
    } catch (error) {
      console.error('載入醫院外展記錄失敗:', error);
      throw error;
    }
  }, []);

  const fetchDoctorVisitSchedule = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('doctor_visit_schedule').select('*').order('visit_date', { ascending: true });
      if (error) throw error;
      setDoctorVisitSchedule(data || []);
    } catch (error) {
      console.error('載入醫生到診排程失敗:', error);
      throw error;
    }
  }, []);

  const addDoctorVisitSchedule = useCallback(async (scheduleData: any) => {
    try {
      const { data, error } = await supabase.from('doctor_visit_schedule').insert([scheduleData]).select().single();
      if (error) throw error;
      await fetchDoctorVisitSchedule();
      return data;
    } catch (error) {
      console.error('新增醫生到診排程失敗:', error);
      throw error;
    }
  }, [fetchDoctorVisitSchedule]);

  const updateDoctorVisitSchedule = useCallback(async (scheduleData: any) => {
    try {
      const { data, error } = await supabase.from('doctor_visit_schedule').update(scheduleData).eq('id', scheduleData.id).select().single();
      if (error) throw error;
      await fetchDoctorVisitSchedule();
      return data;
    } catch (error) {
      console.error('更新醫生到診排程失敗:', error);
      throw error;
    }
  }, [fetchDoctorVisitSchedule]);

  const deleteDoctorVisitSchedule = useCallback(async (scheduleId: string) => {
    try {
      const { error } = await supabase.from('doctor_visit_schedule').delete().eq('id', scheduleId);
      if (error) throw error;
      await fetchDoctorVisitSchedule();
    } catch (error) {
      console.error('刪除醫生到診排程失敗:', error);
      throw error;
    }
  }, [fetchDoctorVisitSchedule]);

  const fetchHospitalOutreachRecordHistory = async (patientId: number) => {
    try {
      const { data, error } = await supabase.from('hospital_outreach_record_history').select('*').eq('patient_id', patientId).order('archived_at', { ascending: false });
      if (error) throw error;
      setHospitalOutreachRecordHistory(data || []);
      return data || [];
    } catch (error) {
      console.error('載入醫院外展記錄歷史失敗:', error);
      setHospitalOutreachRecordHistory([]);
      return [];
    }
  };

  const addHospitalOutreachRecord = useCallback(async (recordData: any) => {
    try {
      const { data: existingRecord, error: checkError } = await supabase.from('hospital_outreach_records').select('id').eq('patient_id', recordData.patient_id).single();
      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existingRecord) {
        const patient = patients.find(p => p.院友id === recordData.patient_id);
        const patientName = patient ? `${patient.中文姓氏}${patient.中文名字}` : '該院友';
        alert(`${patientName} 已有醫院外展記錄，每位院友只能有一筆記錄。\n\n如需更新記錄，請使用編輯功能。`);
        return null;
      }
      const { data, error } = await supabase.from('hospital_outreach_records').insert([recordData]).select().single();
      if (error) throw error;
      await fetchHospitalOutreachRecords();
      return data;
    } catch (error) {
      console.error('新增醫院外展記錄失敗:', error);
      throw error;
    }
  }, [patients, fetchHospitalOutreachRecords]);

  const updateHospitalOutreachRecord = useCallback(async (recordData: any) => {
    try {
      const { data, error } = await supabase.from('hospital_outreach_records').update(recordData).eq('id', recordData.id).select().single();
      if (error) throw error;
      await fetchHospitalOutreachRecords();
      return data;
    } catch (error) {
      console.error('更新醫院外展記錄失敗:', error);
      throw error;
    }
  }, [fetchHospitalOutreachRecords]);

  const deleteHospitalOutreachRecord = useCallback(async (recordId: string) => {
    try {
      const { error } = await supabase.from('hospital_outreach_records').delete().eq('id', recordId);
      if (error) throw error;
      await fetchHospitalOutreachRecords();
    } catch (error) {
      console.error('刪除醫院外展記錄失敗:', error);
      throw error;
    }
  }, [fetchHospitalOutreachRecords]);

  // 新增的處方工作流程相關函數
  const fetchPrescriptionWorkflowRecords = async (patientId?: number, scheduledDate?: string): Promise<PrescriptionWorkflowRecord[]> => {
    try {
      const validPatientId = (patientId !== undefined && patientId !== null && !isNaN(patientId) && patientId > 0) ? patientId : null;
      const validScheduledDate = (scheduledDate && typeof scheduledDate === 'string' && scheduledDate.trim() !== '' && scheduledDate !== 'undefined') ? scheduledDate.trim() : null;

      let query = supabase.from('medication_workflow_records').select('*');

      if (validPatientId !== null) {
        query = query.eq('patient_id', validPatientId);
      }

      if (validScheduledDate !== null) {
        query = query.eq('scheduled_date', validScheduledDate);
      }

      const { data: queryData, error: queryError } = await query.order('scheduled_time');

      if (queryError) {
        throw new Error(`查詢工作流程記錄失敗: ${queryError.message}`);
      }

      setPrescriptionWorkflowRecords(queryData || []);
      return queryData || [];
    } catch (error) {
      console.error('獲取處方工作流程記錄失敗:', error);
      setPrescriptionWorkflowRecords([]);
      return [];
    }
  };

  const memoizedFetchPrescriptionWorkflowRecords = useCallback(fetchPrescriptionWorkflowRecords, []);

  // 3. 數據刷新邏輯
  const refreshData = async () => {
    try {
      let startDateStr: string | undefined = undefined;
      if (!isAllHealthRecordsLoaded) {
        const today = new Date();
        today.setDate(today.getDate() - 60);
        startDateStr = today.toISOString().split('T')[0];
        console.log(`🚀 優化模式：只載入 ${startDateStr} 之後的記錄`);
      } else {
        console.log('📦 完整模式：載入所有歷史記錄');
      }

      const [
        patientsData,
        stationsData,
        bedsData,
        schedulesData,
        serviceReasonsData,
        healthRecordsData,
        followUpAppointmentsData,
        patientHealthTasksData,
        mealGuidancesData,
        patientLogsData,
        patientRestraintAssessmentsData,
        healthAssessmentsData,
        woundAssessmentsData,
        patientAdmissionRecordsData,
        hospitalEpisodesData,
        prescriptionsData,
        drugDatabaseData,
        workflowRecordsData,
        timeSlotDefinitionsData,
        annualHealthCheckupsData,
        incidentReportsData,
        diagnosisRecordsData,
        vaccinationRecordsData,
        patientNotesData,
        patrolRoundsData,
        diaperChangeRecordsData,
        restraintObservationRecordsData,
        positionChangeRecordsData
      ] = await Promise.all([
        db.getPatients(),
        db.getStations(),
        db.getBeds(),
        db.getSchedules(),
        db.getReasons(),
        db.getHealthRecords(undefined, startDateStr),
        db.getFollowUps(),
        db.getHealthTasks(),
        db.getMealGuidances(),
        db.getPatientLogs(),
        db.getRestraintAssessments(),
        db.getHealthAssessments(),
        db.getWoundAssessments(),
        db.getPatientAdmissionRecords(),
        db.getHospitalEpisodes(),
        db.getPrescriptions(),
        db.getDrugDatabase(),
        fetchPrescriptionWorkflowRecords(),
        db.getPrescriptionTimeSlotDefinitions(),
        db.getAnnualHealthCheckups(),
        db.getIncidentReports(),
        db.getDiagnosisRecords(),
        db.getVaccinationRecords(),
        db.getPatientNotes(),
        db.getPatrolRounds(),
        db.getDiaperChangeRecords(),
        db.getRestraintObservationRecords(),
        db.getPositionChangeRecords()
      ]);

      
      // 對 patientHealthTasksData 進行去重處理
      const uniqueTasksMap = new Map<string, any>();
      patientHealthTasksData.forEach(task => {
        if (!uniqueTasksMap.has(task.id)) {
          uniqueTasksMap.set(task.id, task);
        }
      });
      const uniquePatientHealthTasksData = Array.from(uniqueTasksMap.values());
      
      setPatients(patientsData);
      setStations(stationsData);
      setBeds(bedsData);
      setServiceReasons(serviceReasonsData);
      setHealthRecords(healthRecordsData);
      setFollowUpAppointments(followUpAppointmentsData);
      setMealGuidances(mealGuidancesData);
      setPatientHealthTasks(uniquePatientHealthTasksData);
      setPatientLogs(patientLogsData);
      setPatientRestraintAssessments(patientRestraintAssessmentsData);
      setHealthAssessments(healthAssessmentsData);
      setWoundAssessments(woundAssessmentsData);
      setHospitalEpisodes(hospitalEpisodesData);
      setPrescriptions(prescriptionsData);
      setDrugDatabase(drugDatabaseData);
      setPrescriptionWorkflowRecords(workflowRecordsData || []);
      setPrescriptionTimeSlotDefinitions(timeSlotDefinitionsData || []);
      setAnnualHealthCheckups(annualHealthCheckupsData || []);
      setIncidentReports(incidentReportsData || []);
      setDiagnosisRecords(diagnosisRecordsData || []);
      setVaccinationRecords(vaccinationRecordsData || []);
      setPatientNotes(patientNotesData || []);
      setPatrolRounds(patrolRoundsData || []);
      setDiaperChangeRecords(diaperChangeRecordsData || []);
      setRestraintObservationRecords(restraintObservationRecordsData || []);
      setPositionChangeRecords(positionChangeRecordsData || []);

      try {
        const overdueTasks = await db.getOverdueDailySystemTasks();
        setDailySystemTasks(overdueTasks);
      } catch (error) {
        setDailySystemTasks([]);
      }
      
      try {
        const patientAdmissionRecordsData = await db.getPatientAdmissionRecords();
        setPatientAdmissionRecords(patientAdmissionRecordsData);
      } catch (admissionError) {
        setPatientAdmissionRecords([]);
      }

      const schedulesWithDetails: ScheduleWithDetails[] = await Promise.all(
        schedulesData.map(async (schedule) => {
          const details = await db.getScheduleDetails(schedule.排程id);
          return {
            ...schedule,
            院友列表: details
          };
        })
      );

      setSchedules(schedulesWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('刷新數據失敗:', error);
      setLoading(false);
    }
  };

  const initializeAndLoadData = async () => {
    try {
      await generateDailyWorkflowRecords(new Date().toISOString().split('T')[0]);
      await refreshData();
      setDataLoaded(true);
    } catch (error) {
      console.error('Error initializing data:', error);
      try {
        await refreshData();
        setDataLoaded(true);
      } catch (refreshError) {
        console.error('Refresh data also failed:', refreshError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFullHealthRecords = useCallback(async () => {
    if (isAllHealthRecordsLoaded) return;
    try {
      console.log('📥 觸發：載入完整健康記錄 (歷史模式)...');
      const allRecords = await db.getHealthRecords();
      setHealthRecords(allRecords);
      setIsAllHealthRecordsLoaded(true);
      console.log('✅ 完整健康記錄載入完成，共', allRecords.length, '筆');
    } catch (error) {
      console.error('載入完整記錄失敗:', error);
    }
  }, [isAllHealthRecordsLoaded]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setPatients([]);
      setStations([]);
      setBeds([]);
      setSchedules([]);
      setServiceReasons([]);
      setHealthRecords([]);
      setFollowUpAppointments([]);
      setMealGuidances([]);
      setPatientHealthTasks([]);
      setPatientLogs([]);
      setPatientRestraintAssessments([]);
      setHealthAssessments([]);
      setWoundAssessments([]);
      setPatientAdmissionRecords([]);
      setHospitalEpisodes([]);
      setPrescriptions([]);
      setDrugDatabase([]);
      setLoading(false);
      setDataLoaded(false);
      return;
    }
    if (dataLoaded) return;
    
    const loadData = async () => {
      try {
        await initializeAndLoadData();
      } catch (error) {
        console.error('資料載入失敗:', error);
      }
    };
    loadData();
  }, [authReady, user, dataLoaded]);

  // 輕量級刷新
  const refreshHealthData = async () => {
    try {
      let startDateStr: string | undefined = undefined;
      if (!isAllHealthRecordsLoaded) {
        const today = new Date();
        today.setDate(today.getDate() - 60);
        startDateStr = today.toISOString().split('T')[0];
      }

      const [healthRecordsData, patientHealthTasksData] = await Promise.all([
        db.getHealthRecords(undefined, startDateStr),
        db.getHealthTasks()
      ]);

      const uniqueTasksMap = new Map<string, any>();
      patientHealthTasksData.forEach(task => {
        if (!uniqueTasksMap.has(task.id)) uniqueTasksMap.set(task.id, task);
      });

      setHealthRecords(healthRecordsData);
      setPatientHealthTasks(Array.from(uniqueTasksMap.values()));
    } catch (error) {
      console.error('刷新健康數據失敗:', error);
      throw error;
    }
  };

  // CRUD Functions defined here
  const addPatient = async (patient: Omit<db.Patient, '院友id'>) => {
    try {
      await db.createPatient(patient);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  };

  const updatePatient = async (patient: db.Patient) => {
    try {
      await db.updatePatient(patient);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  };

  const deletePatient = async (id: number) => {
    try {
      await db.deletePatient(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const addPatientHealthTask = async (task: Omit<db.PatientHealthTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTask = await db.createPatientHealthTask(task);
      setPatientHealthTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (error) {
      console.error('Error adding patient health task:', error);
      throw error;
    }
  };

  const updatePatientHealthTask = async (task: db.PatientHealthTask) => {
    try {
      setPatientHealthTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
      await db.updatePatientHealthTask(task);
    } catch (error) {
      console.error('Error updating patient health task:', error);
      await refreshData();
      throw error;
    }
  };

  const deletePatientHealthTask = async (id: string) => {
    try {
      setPatientHealthTasks(prev => prev.filter(t => t.id !== id));
      await db.deletePatientHealthTask(id);
    } catch (error) {
      console.error('Error deleting patient health task:', error);
      await refreshData();
      throw error;
    }
  };

  const addHealthRecord = async (record: Omit<db.HealthRecord, '記錄id'>) => {
    try {
      const newRecord = await db.createHealthRecord(record);
      setHealthRecords(prev => [newRecord, ...prev]); 
      return newRecord;
    } catch (error) {
      console.error('Error adding health record:', error);
      throw error;
    }
  };
  
  const updateHealthRecord = async (record: db.HealthRecord) => {
    try {
      await db.updateHealthRecord(record);
      setHealthRecords(prev => prev.map(r => r.記錄id === record.記錄id ? record : r));
    } catch (error) {
      console.error('Error updating health record:', error);
      throw error;
    }
  };

  const deleteHealthRecord = async (id: number) => {
    try {
      await db.deleteHealthRecord(id);
      setHealthRecords(prev => prev.filter(r => r.記錄id !== id));
    } catch (error) {
      console.error('Error deleting health record:', error);
      throw error;
    }
  };

  const addSchedule = async (schedule: Omit<db.Schedule, '排程id'>) => {
    try {
      await db.createSchedule(schedule);
      await refreshData();
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const updateSchedule = async (schedule: ScheduleWithDetails) => {
    try {
      await db.updateSchedule(schedule);
      await refreshData();
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await db.deleteSchedule(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const addPatientToSchedule = async (scheduleId: number, patientId: number, symptoms: string, notes: string, reasons: string[]) => {
    try {
      await db.addPatientToSchedule(scheduleId, patientId, symptoms, notes, reasons);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient to schedule:', error);
    }
  };

  const updateScheduleDetail = async (detailData: { 細項id: number; 症狀說明: string; 備註: string; reasonIds: number[] }) => {
    try {
      const result = await db.updateScheduleDetail(detailData);
      if (result?.error) throw new Error(result.error.message);
      await refreshData();
      return result;
    } catch (error) {
      console.error('Error updating schedule detail:', error);
      throw error;
    }
  };

  const deleteScheduleDetail = async (detailId: number) => {
    try {
      await db.deleteScheduleDetail(detailId);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule detail:', error);
    }
  };

  const addPrescription = async (prescription: Omit<db.Prescription, '處方id'>) => {
    try {
      await db.createPrescription(prescription);
      await refreshData();
    } catch (error) {
      console.error('Error adding prescription:', error);
      throw error;
    }
  };

  const updatePrescription = async (prescription: any) => {
    try {
      await db.updatePrescription(prescription);
      await refreshData();
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  };

  const deletePrescription = async (id: number) => {
    try {
      await db.deletePrescription(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  };

  const addFollowUpAppointment = async (appointment: Omit<db.FollowUpAppointment, '覆診id' | '創建時間' | '更新時間'>) => {
    try {
      await db.createFollowUp(appointment);
      await refreshData();
    } catch (error) {
      console.error('Error adding follow-up appointment:', error);
      throw error;
    }
  };

  const updateFollowUpAppointment = async (appointment: db.FollowUpAppointment) => {
    try {
      await db.updateFollowUp(appointment);
      await refreshData();
    } catch (error) {
      console.error('Error updating follow-up appointment:', error);
      throw error;
    }
  };

  const deleteFollowUpAppointment = async (id: string) => {
    try {
      await db.deleteFollowUp(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting follow-up appointment:', error);
      throw error;
    }
  };

  const addMealGuidance = async (guidance: Omit<db.MealGuidance, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createMealGuidance(guidance);
      await refreshData();
    } catch (error) {
      console.error('Error adding meal guidance:', error);
      throw error;
    }
  };

  const updateMealGuidance = async (guidance: db.MealGuidance) => {
    try {
      await db.updateMealGuidance(guidance);
      await refreshData();
    } catch (error) {
      console.error('Error updating meal guidance:', error);
      throw error;
    }
  };

  const deleteMealGuidance = async (id: string) => {
    try {
      await db.deleteMealGuidance(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting meal guidance:', error);
      throw error;
    }
  };

  const addPatientLog = async (log: Omit<db.PatientLog, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createPatientLog(log);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient log:', error);
      throw error;
    }
  };

  const updatePatientLog = async (log: db.PatientLog) => {
    try {
      await db.updatePatientLog(log);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient log:', error);
      throw error;
    }
  };

  const deletePatientLog = async (id: string) => {
    try {
      await db.deletePatientLog(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient log:', error);
      throw error;
    }
  };

  const addPatientRestraintAssessment = async (assessment: Omit<db.PatientRestraintAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createRestraintAssessment(assessment);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient restraint assessment:', error);
      throw error;
    }
  };

  const updatePatientRestraintAssessment = async (assessment: db.PatientRestraintAssessment) => {
    try {
      await db.updateRestraintAssessment(assessment);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient restraint assessment:', error);
      throw error;
    }
  };

  const deletePatientRestraintAssessment = async (id: string) => {
    try {
      await db.deleteRestraintAssessment(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient restraint assessment:', error);
      throw error;
    }
  };

  const addHealthAssessment = async (assessment: Omit<db.HealthAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createHealthAssessment(assessment);
      await refreshData();
    } catch (error) {
      console.error('Error adding health assessment:', error);
      throw error;
    }
  };

  const updateHealthAssessment = async (assessment: db.HealthAssessment) => {
    try {
      await db.updateHealthAssessment(assessment);
      await refreshData();
    } catch (error) {
      console.error('Error updating health assessment:', error);
      throw error;
    }
  };

  const deleteHealthAssessment = async (id: string) => {
    try {
      await db.deleteHealthAssessment(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting health assessment:', error);
      throw error;
    }
  };

  const addWoundAssessment = async (assessment: Omit<db.WoundAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createWoundAssessment(assessment);
      await refreshData();
    } catch (error) {
      console.error('Error adding wound assessment:', error);
      throw error;
    }
  };

  const updateWoundAssessment = async (assessment: db.WoundAssessment) => {
    try {
      await db.updateWoundAssessment(assessment);
      await refreshData();
    } catch (error) {
      console.error('Error updating wound assessment:', error);
      throw error;
    }
  };

  const deleteWoundAssessment = async (id: string) => {
    try {
      await db.deleteWoundAssessment(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting wound assessment:', error);
      throw error;
    }
  };

  const addAnnualHealthCheckup = async (checkup: any) => {
    try {
      await db.createAnnualHealthCheckup(checkup);
      await refreshData();
    } catch (error) {
      console.error('Error adding annual health checkup:', error);
      throw error;
    }
  };

  const updateAnnualHealthCheckup = async (checkup: any) => {
    try {
      await db.updateAnnualHealthCheckup(checkup);
      await refreshData();
    } catch (error) {
      console.error('Error updating annual health checkup:', error);
      throw error;
    }
  };

  const deleteAnnualHealthCheckup = async (id: string) => {
    try {
      await db.deleteAnnualHealthCheckup(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting annual health checkup:', error);
      throw error;
    }
  };

  const addIncidentReport = async (report: Omit<db.IncidentReport, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createIncidentReport(report);
      await refreshData();
    } catch (error) {
      console.error('Error adding incident report:', error);
      throw error;
    }
  };

  const updateIncidentReport = async (report: db.IncidentReport) => {
    try {
      await db.updateIncidentReport(report);
      await refreshData();
    } catch (error) {
      console.error('Error updating incident report:', error);
      throw error;
    }
  };

  const deleteIncidentReport = async (id: string) => {
    try {
      await db.deleteIncidentReport(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting incident report:', error);
      throw error;
    }
  };

  const addDiagnosisRecord = async (record: Omit<db.DiagnosisRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createDiagnosisRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error adding diagnosis record:', error);
      throw error;
    }
  };

  const updateDiagnosisRecord = async (record: db.DiagnosisRecord) => {
    try {
      await db.updateDiagnosisRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error updating diagnosis record:', error);
      throw error;
    }
  };

  const deleteDiagnosisRecord = async (id: string) => {
    try {
      await db.deleteDiagnosisRecord(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting diagnosis record:', error);
      throw error;
    }
  };

  const addVaccinationRecord = async (record: Omit<db.VaccinationRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createVaccinationRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error adding vaccination record:', error);
      throw error;
    }
  };

  const updateVaccinationRecord = async (record: db.VaccinationRecord) => {
    try {
      await db.updateVaccinationRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error updating vaccination record:', error);
      throw error;
    }
  };

  const deleteVaccinationRecord = async (id: string) => {
    try {
      await db.deleteVaccinationRecord(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting vaccination record:', error);
      throw error;
    }
  };

  const addPatientNote = async (note: Omit<db.PatientNote, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createPatientNote(note);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient note:', error);
      throw error;
    }
  };

  const updatePatientNote = async (note: db.PatientNote) => {
    try {
      await db.updatePatientNote(note);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient note:', error);
      throw error;
    }
  };

  const deletePatientNote = async (id: string) => {
    try {
      await db.deletePatientNote(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient note:', error);
      throw error;
    }
  };

  const completePatientNote = async (id: string) => {
    try {
      await db.completePatientNote(id);
      await refreshData();
    } catch (error) {
      console.error('Error completing patient note:', error);
      throw error;
    }
  };

  const createPatrolRound = async (round: Omit<db.PatrolRound, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createPatrolRound(round);
      await refreshData();
    } catch (error) {
      console.error('Error creating patrol round:', error);
      throw error;
    }
  };

  const deletePatrolRound = async (id: string) => {
    try {
      await db.deletePatrolRound(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patrol round:', error);
      throw error;
    }
  };

  const createDiaperChangeRecord = async (record: Omit<db.DiaperChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createDiaperChangeRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error creating diaper change record:', error);
      throw error;
    }
  };

  const updateDiaperChangeRecord = async (record: db.DiaperChangeRecord) => {
    try {
      await db.updateDiaperChangeRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error updating diaper change record:', error);
      throw error;
    }
  };

  const deleteDiaperChangeRecord = async (id: string) => {
    try {
      await db.deleteDiaperChangeRecord(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting diaper change record:', error);
      throw error;
    }
  };

  const createRestraintObservationRecord = async (record: Omit<db.RestraintObservationRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createRestraintObservationRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error creating restraint observation record:', error);
      throw error;
    }
  };

  const updateRestraintObservationRecord = async (record: db.RestraintObservationRecord) => {
    try {
      await db.updateRestraintObservationRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error updating restraint observation record:', error);
      throw error;
    }
  };

  const deleteRestraintObservationRecord = async (id: string) => {
    try {
      await db.deleteRestraintObservationRecord(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting restraint observation record:', error);
      throw error;
    }
  };

  const createPositionChangeRecord = async (record: Omit<db.PositionChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createPositionChangeRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error creating position change record:', error);
      throw error;
    }
  };

  const deletePositionChangeRecord = async (id: string) => {
    try {
      await db.deletePositionChangeRecord(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting position change record:', error);
      throw error;
    }
  };

  const addPatientAdmissionRecord = async (record: Omit<db.PatientAdmissionRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createPatientAdmissionRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient admission record:', error);
      throw error;
    }
  };

  const updatePatientAdmissionRecord = async (record: db.PatientAdmissionRecord) => {
    try {
      await db.updatePatientAdmissionRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient admission record:', error);
      throw error;
    }
  };

  const deletePatientAdmissionRecord = async (id: string) => {
    try {
      await db.deletePatientAdmissionRecord(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient admission record:', error);
      throw error;
    }
  };

  const addHospitalEpisode = async (episodeData: any) => {
    try {
      await db.createHospitalEpisode(episodeData);
      await refreshData();
    } catch (error) {
      console.error('Error adding hospital episode:', error);
      throw error;
    }
  };

  const updateHospitalEpisode = async (episodeData: any) => {
    try {
      await db.updateHospitalEpisode(episodeData);
      await refreshData();
    } catch (error) {
      console.error('Error updating hospital episode:', error);
      throw error;
    }
  };

  const deleteHospitalEpisode = async (id: string) => {
    try {
      await db.deleteHospitalEpisode(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting hospital episode:', error);
      throw error;
    }
  };

  const generateRandomTemperaturesForActivePatients = async () => {
    try {
      await db.generateRandomTemperaturesForActivePatients();
      await refreshData();
    } catch (error) {
      console.error('Error generating random temperatures:', error);
      throw error;
    }
  };

  const recordDailyTemperatureGenerationCompletion = async () => {
    try {
      await db.recordDailyTemperatureGenerationCompletion();
      await refreshData();
    } catch (error) {
      console.error('Error recording daily temperature generation completion:', error);
      throw error;
    }
  };

  const getOverdueDailySystemTasks = async () => {
    try {
      return await db.getOverdueDailySystemTasks();
    } catch (error) {
      console.error('Error getting overdue daily system tasks:', error);
      return [];
    }
  };

  const recordPatientAdmissionEvent = async (eventData: any) => {
    try {
      await db.recordPatientAdmissionEvent(eventData);
      await refreshData();
    } catch (error) {
      console.error('Error recording patient admission event:', error);
      throw error;
    }
  };

  const createPrescriptionWorkflowRecord = async (recordData: Omit<PrescriptionWorkflowRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createMedicationWorkflowRecord(recordData);
    } catch (error) {
      console.error('Error creating prescription workflow record:', error);
      throw error;
    }
  };

  const updatePrescriptionWorkflowRecord = async (recordId: string, updateData: Partial<PrescriptionWorkflowRecord>) => {
    try {
      await db.updateMedicationWorkflowRecord({ id: recordId, ...updateData } as any);
      await fetchPrescriptionWorkflowRecords();
    } catch (error) {
      console.error('Error updating prescription workflow record:', error);
      throw error;
    }
  };

  const prepareMedication = async (
    recordId: string,
    staffId: string,
    _unused1?: any,
    _unused2?: any,
    patientId?: number,
    scheduledDate?: string
  ) => {
    try {
      const updateData = {
        preparation_status: 'completed' as const,
        preparation_staff: staffId,
        preparation_time: new Date().toISOString()
      };

      await db.updateMedicationWorkflowRecord({ id: recordId, ...updateData } as any);

      // 直接更新內存中的記錄，避免重新查詢引入週外記錄
      setPrescriptionWorkflowRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, ...updateData } : r)
      );
    } catch (error) {
      console.error('執藥操作失敗:', error);
      throw error;
    }
  };

  const verifyMedication = async (
    recordId: string,
    staffId: string,
    _unused1?: any,
    _unused2?: any,
    patientId?: number,
    scheduledDate?: string
  ) => {
    try {
      const updateData = {
        verification_status: 'completed' as const,
        verification_staff: staffId,
        verification_time: new Date().toISOString()
      };

      await db.updateMedicationWorkflowRecord({ id: recordId, ...updateData } as any);

      // 直接更新內存中的記錄，避免重新查詢引入週外記錄
      setPrescriptionWorkflowRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, ...updateData } : r)
      );
    } catch (error) {
      console.error('核藥操作失敗:', error);
      throw error;
    }
  };

  const dispenseMedication = async (
    recordId: string,
    staffId: string,
    failureReason?: string,
    customReason?: string,
    patientId?: number,
    scheduledDate?: string,
    notes?: string,
    inspectionCheckResult?: any
  ) => {
    try {
      const updateData: any = {
        dispensing_staff: staffId,
        dispensing_time: new Date().toISOString()
      };

      if (failureReason) {
        updateData.dispensing_status = 'failed';
        updateData.dispensing_failure_reason = failureReason;
        if (customReason) {
          updateData.custom_failure_reason = customReason;
        }
      } else {
        updateData.dispensing_status = 'completed';
        updateData.dispensing_failure_reason = null;
        updateData.custom_failure_reason = null;
      }

      if (notes) {
        updateData.notes = notes;
      }

      if (inspectionCheckResult) {
        updateData.inspection_check_result = inspectionCheckResult;
      }

      await db.updateMedicationWorkflowRecord({ id: recordId, ...updateData } as any);

      // 直接更新內存中的記錄，避免重新查詢引入週外記錄
      setPrescriptionWorkflowRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, ...updateData } : r)
      );
    } catch (error) {
      console.error('派藥操作失敗:', error);
      throw error;
    }
  };

  const checkPrescriptionInspectionRules = async (prescriptionId: string, patientId: number) => {
    try {
      const prescription = prescriptions.find(p => p.id === prescriptionId);
      if (!prescription || !prescription.inspection_rules || prescription.inspection_rules.length === 0) {
        return { canDispense: true, blockedRules: [], usedVitalSignData: {} };
      }

      const latestVitalSigns = await db.getHealthRecords(patientId);
      if (!latestVitalSigns || latestVitalSigns.length === 0) {
        return { canDispense: false, blockedRules: [], usedVitalSignData: {} };
      }

      const blockedRules: any[] = [];
      const usedVitalSignData: any = {};

      for (const rule of prescription.inspection_rules) {
        const vitalSign = latestVitalSigns.find(vs => vs.生命表徵類型 === rule.vital_sign_type);
        if (vitalSign) {
          usedVitalSignData[rule.vital_sign_type] = vitalSign.數值;

          const value = parseFloat(vitalSign.數值 || '0');
          const min = rule.min_value !== null ? parseFloat(rule.min_value) : null;
          const max = rule.max_value !== null ? parseFloat(rule.max_value) : null;

          if ((min !== null && value < min) || (max !== null && value > max)) {
            blockedRules.push({
              vital_sign_type: rule.vital_sign_type,
              actual_value: vitalSign.數值,
              min_value: rule.min_value,
              max_value: rule.max_value
            });
          }
        }
      }

      return {
        canDispense: blockedRules.length === 0,
        blockedRules,
        usedVitalSignData
      };
    } catch (error) {
      console.error('檢查檢測規則失敗:', error);
      return { canDispense: false, blockedRules: [], usedVitalSignData: {} };
    }
  };

  const fetchLatestVitalSigns = async (patientId: number, vitalSignType: string) => {
    try {
      const records = await db.getHealthRecords(patientId);
      const filtered = records.filter(r => r.生命表徵類型 === vitalSignType);
      if (filtered.length === 0) return null;

      filtered.sort((a, b) => {
        const dateA = new Date(`${a.量度日期}T${a.量度時間 || '00:00:00'}`);
        const dateB = new Date(`${b.量度日期}T${b.量度時間 || '00:00:00'}`);
        return dateB.getTime() - dateA.getTime();
      });

      return filtered[0];
    } catch (error) {
      console.error('獲取最新生命表徵失敗:', error);
      return null;
    }
  };

  const batchSetDispenseFailure = async (
    patientId: number,
    date: string,
    time: string,
    reason: string,
    customReason?: string
  ) => {
    try {
      const records = prescriptionWorkflowRecords.filter(
        r => r.patient_id === patientId &&
        r.scheduled_date === date &&
        r.scheduled_time === time &&
        r.dispensing_status === 'pending'
      );

      await Promise.all(
        records.map(record =>
          dispenseMedication(
            record.id,
            displayName || '未知',
            reason,
            customReason,
            patientId,
            date
          )
        )
      );
    } catch (error) {
      console.error('批量設定派藥失敗:', error);
      throw error;
    }
  };

  const revertPrescriptionWorkflowStep = async (
    recordId: string,
    step: 'preparation' | 'verification' | 'dispensing',
    patientId?: number,
    scheduledDate?: string
  ) => {
    try {
      const updateData: any = {};

      if (step === 'preparation') {
        updateData.preparation_status = 'pending';
        updateData.preparation_staff = null;
        updateData.preparation_time = null;
      } else if (step === 'verification') {
        updateData.verification_status = 'pending';
        updateData.verification_staff = null;
        updateData.verification_time = null;
      } else if (step === 'dispensing') {
        updateData.dispensing_status = 'pending';
        updateData.dispensing_staff = null;
        updateData.dispensing_time = null;
        updateData.dispensing_failure_reason = null;
        updateData.custom_failure_reason = null;
        updateData.notes = null;
        updateData.inspection_check_result = null;
      }

      await db.updateMedicationWorkflowRecord({ id: recordId, ...updateData } as any);

      // 直接更新內存中的記錄，避免重新查詢引入週外記錄
      setPrescriptionWorkflowRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, ...updateData } : r)
      );
    } catch (error) {
      console.error('撤銷步驟失敗:', error);
      throw error;
    }
  };

  const loadPrescriptionTimeSlotDefinitions = async () => {
    try {
      const definitions = await db.getPrescriptionTimeSlotDefinitions();
      setPrescriptionTimeSlotDefinitions(definitions);
    } catch (error) {
      console.error('Error loading prescription time slot definitions:', error);
      throw error;
    }
  };

  const fetchPrescriptionTimeSlotDefinitions = async (): Promise<PrescriptionTimeSlotDefinition[]> => {
    try {
      return await db.getPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('Error fetching prescription time slot definitions:', error);
      throw error;
    }
  };

  const addPrescriptionTimeSlotDefinition = async (definition: Omit<PrescriptionTimeSlotDefinition, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.addPrescriptionTimeSlotDefinition(definition);
      await loadPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('Error adding prescription time slot definition:', error);
      throw error;
    }
  };

  const updatePrescriptionTimeSlotDefinition = async (definition: PrescriptionTimeSlotDefinition) => {
    try {
      await db.updatePrescriptionTimeSlotDefinition(definition);
      await loadPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('Error updating prescription time slot definition:', error);
      throw error;
    }
  };

  const deletePrescriptionTimeSlotDefinition = async (id: string) => {
    try {
      await db.deletePrescriptionTimeSlotDefinition(id);
      await loadPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('Error deleting prescription time slot definition:', error);
      throw error;
    }
  };

  const findDuplicateHealthRecords = async (): Promise<db.DuplicateRecordGroup[]> => {
    try {
      return await db.findDuplicateHealthRecords();
    } catch (error) {
      console.error('Error finding duplicate health records:', error);
      throw error;
    }
  };

  const batchDeleteDuplicateRecords = async (duplicateRecordIds: number[], deletedBy?: string) => {
    try {
      await db.batchMoveDuplicatesToRecycleBin(duplicateRecordIds, deletedBy);
      await refreshData();
    } catch (error) {
      console.error('Error batch deleting duplicate records:', error);
      throw error;
    }
  };

  const fetchDeletedHealthRecords = async () => {
    try {
      const records = await db.getDeletedHealthRecords();
      setDeletedHealthRecords(records);
    } catch (error) {
      console.warn('回收筒暫時不可用:', error);
      setDeletedHealthRecords([]);
    }
  };

  const restoreHealthRecord = async (deletedRecordId: string) => {
    try {
      await db.restoreHealthRecordFromRecycleBin(deletedRecordId);
      await fetchDeletedHealthRecords(); // 刷新回收筒列表
      await refreshData(); // 刷新主列表
    } catch (error) {
      console.error('Error restoring health record:', error);
      throw error;
    }
  };

  const permanentlyDeleteHealthRecord = async (deletedRecordId: string) => {
    try {
      await db.permanentlyDeleteHealthRecord(deletedRecordId);
      await fetchDeletedHealthRecords(); // 刷新回收筒列表
    } catch (error) {
      console.error('Error permanently deleting health record:', error);
      throw error;
    }
  };

  const addDrug = async (drug: Omit<any, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createDrug(drug);
      await refreshData();
    } catch (error) {
      console.error('Error adding drug:', error);
      throw error;
    }
  };

  const updateDrug = async (drug: any) => {
    try {
      await db.updateDrug(drug);
      await refreshData();
    } catch (error) {
      console.error('Error updating drug:', error);
      throw error;
    }
  };

  const deleteDrug = async (id: string) => {
    try {
      await db.deleteDrug(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting drug:', error);
      throw error;
    }
  };

  const addStation = async (station: Omit<db.Station, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createStation(station);
      await refreshData();
    } catch (error) {
      console.error('Error adding station:', error);
      throw error;
    }
  };

  const updateStation = async (station: db.Station) => {
    try {
      await db.updateStation(station);
      await refreshData();
    } catch (error) {
      console.error('Error updating station:', error);
      throw error;
    }
  };

  const deleteStation = async (id: string) => {
    try {
      await db.deleteStation(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting station:', error);
      throw error;
    }
  };

  const addBed = async (bed: Omit<db.Bed, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createBed(bed);
      await refreshData();
    } catch (error) {
      console.error('Error adding bed:', error);
      throw error;
    }
  };

  const updateBed = async (bed: db.Bed) => {
    try {
      await db.updateBed(bed);
      await refreshData();
    } catch (error) {
      console.error('Error updating bed:', error);
      throw error;
    }
  };

  const deleteBed = async (id: string) => {
    try {
      await db.deleteBed(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting bed:', error);
      throw error;
    }
  };

  const assignPatientToBed = async (patientId: number, bedId: string) => {
    try {
      await db.assignPatientToBed(patientId, bedId);
      await refreshData();
    } catch (error) {
      console.error('Error assigning patient to bed:', error);
      throw error;
    }
  };

  const swapPatientBeds = async (patientId1: number, patientId2: number) => {
    try {
      await db.swapPatientBeds(patientId1, patientId2);
      await refreshData();
    } catch (error) {
      console.error('Error swapping patient beds:', error);
      throw error;
    }
  };

  const moveBedToStation = async (bedId: string, newStationId: string) => {
    try {
      await db.moveBedToStation(bedId, newStationId);
      await refreshData();
    } catch (error) {
      console.error('Error moving bed to station:', error);
      throw error;
    }
  };

  return (
    <PatientContext.Provider value={{
      patients,
      stations,
      beds,
      schedules,
      prescriptions,
      drugDatabase,
      serviceReasons,
      healthRecords,
      followUpAppointments,
      mealGuidances,
      patientLogs,
      patientHealthTasks,
      patientRestraintAssessments,
      healthAssessments,
      woundAssessments,
      patientAdmissionRecords,
      hospitalEpisodes,
      annualHealthCheckups,
      dailySystemTasks,
      loading,
      prescriptionWorkflowRecords,
      prescriptionTimeSlotDefinitions,
      checkEligiblePatientsForTemperature,
      addPatient,
      updatePatient,
      deletePatient,
      addStation,
      updateStation,
      deleteStation,
      addBed,
      updateBed,
      deleteBed,
      assignPatientToBed,
      swapPatientBeds,
      moveBedToStation,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      addPatientToSchedule,
      updateScheduleDetail,
      deleteScheduleDetail,
      addHealthRecord,
      updateHealthRecord,
      deleteHealthRecord,
      addFollowUpAppointment,
      updateFollowUpAppointment,
      deleteFollowUpAppointment,
      addMealGuidance,
      updateMealGuidance,
      deleteMealGuidance,
      addPatientLog,
      updatePatientLog,
      deletePatientLog,
      addPatientHealthTask,
      updatePatientHealthTask,
      deletePatientHealthTask,
      setPatientHealthTasks,
      addPatientRestraintAssessment,
      updatePatientRestraintAssessment,
      deletePatientRestraintAssessment,
      addHealthAssessment,
      updateHealthAssessment,
      deleteHealthAssessment,
      addWoundAssessment,
      updateWoundAssessment,
      deleteWoundAssessment,
      addAnnualHealthCheckup,
      updateAnnualHealthCheckup,
      deleteAnnualHealthCheckup,
      incidentReports,
      addIncidentReport,
      updateIncidentReport,
      deleteIncidentReport,
      diagnosisRecords,
      addDiagnosisRecord,
      updateDiagnosisRecord,
      deleteDiagnosisRecord,
      vaccinationRecords,
      addVaccinationRecord,
      updateVaccinationRecord,
      deleteVaccinationRecord,
      patientNotes,
      addPatientNote,
      updatePatientNote,
      deletePatientNote,
      completePatientNote,
      patrolRounds,
      diaperChangeRecords,
      restraintObservationRecords,
      positionChangeRecords,
      admissionRecords: patientAdmissionRecords,
      createPatrolRound,
      deletePatrolRound,
      createDiaperChangeRecord,
      updateDiaperChangeRecord,
      deleteDiaperChangeRecord,
      createRestraintObservationRecord,
      updateRestraintObservationRecord,
      deleteRestraintObservationRecord,
      createPositionChangeRecord,
      deletePositionChangeRecord,
      addPatientAdmissionRecord,
      updatePatientAdmissionRecord,
      deletePatientAdmissionRecord,
      recordPatientAdmissionEvent,
      addHospitalEpisode,
      updateHospitalEpisode,
      deleteHospitalEpisode,
      addPrescription,
      updatePrescription,
      deletePrescription,
      addDrug,
      updateDrug,
      deleteDrug,
      generateRandomTemperaturesForActivePatients,
      recordDailyTemperatureGenerationCompletion,
      getOverdueDailySystemTasks,
      refreshData,
      refreshHealthData,
      fetchPrescriptionWorkflowRecords: memoizedFetchPrescriptionWorkflowRecords,
      createPrescriptionWorkflowRecord,
      updatePrescriptionWorkflowRecord,
      prepareMedication,
      verifyMedication,
      dispenseMedication,
      checkPrescriptionInspectionRules,
      fetchLatestVitalSigns,
      batchSetDispenseFailure,
      revertPrescriptionWorkflowStep,
      
      // Hospital Outreach Records
      hospitalOutreachRecords,
      hospitalOutreachRecordHistory,
      doctorVisitSchedule,
      fetchHospitalOutreachRecords,
      fetchHospitalOutreachRecordHistory,
      addHospitalOutreachRecord,
      updateHospitalOutreachRecord,
      deleteHospitalOutreachRecord,
      addDoctorVisitSchedule,
      updateDoctorVisitSchedule,
      deleteDoctorVisitSchedule,
      fetchPrescriptionTimeSlotDefinitions,
      addPrescriptionTimeSlotDefinition,
      updatePrescriptionTimeSlotDefinition,
      deletePrescriptionTimeSlotDefinition,
      fetchDoctorVisitSchedule,

      // 健康记录回收筒相关
      deletedHealthRecords,
      fetchDeletedHealthRecords,
      restoreHealthRecord,
      permanentlyDeleteHealthRecord,

      // 健康记录去重相关
      findDuplicateHealthRecords,
      batchDeleteDuplicateRecords,

      // [新增] 載入完整記錄
      loadFullHealthRecords
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};