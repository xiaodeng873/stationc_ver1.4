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
}

interface PatientProviderProps {
  children: ReactNode;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<PatientProviderProps> = ({ children }) => {
  const { user, authReady } = useAuth();
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

  // ... (省略未修改的初始化與資料載入函數，請保持原樣) ...
  // 注意：實際實作時這裡需要包含所有初始化邏輯，與原始檔案一致

  // Fetch hospital outreach records - 使用 useCallback 記憶化
  const fetchHospitalOutreachRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_outreach_records')
        .select('*')
        .order('medication_bag_date', { ascending: false });

      if (error) throw error;
      setHospitalOutreachRecords(data || []);
    } catch (error) {
      console.error('載入醫院外展記錄失敗:', error);
      throw error;
    }
  }, []);

  // Fetch doctor visit schedule - 使用 useCallback 記憶化
  const fetchDoctorVisitSchedule = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_visit_schedule')
        .select('*')
        .order('visit_date', { ascending: true });

      if (error) throw error;
      setDoctorVisitSchedule(data || []);
    } catch (error) {
      console.error('載入醫生到診排程失敗:', error);
      throw error;
    }
  }, []);

  // Add doctor visit schedule
  const addDoctorVisitSchedule = useCallback(async (scheduleData: any) => {
    try {
      const { data, error } = await supabase
        .from('doctor_visit_schedule')
        .insert([scheduleData])
        .select()
        .single();

      if (error) throw error;

      console.log('新增醫生到診排程成功:', data);
      await fetchDoctorVisitSchedule();
      return data;
    } catch (error) {
      console.error('新增醫生到診排程失敗:', error);
      throw error;
    }
  }, [fetchDoctorVisitSchedule]);

  // Update doctor visit schedule
  const updateDoctorVisitSchedule = useCallback(async (scheduleData: any) => {
    try {
      const { data, error } = await supabase
        .from('doctor_visit_schedule')
        .update(scheduleData)
        .eq('id', scheduleData.id)
        .select()
        .single();

      if (error) throw error;

      console.log('更新醫生到診排程成功:', data);
      await fetchDoctorVisitSchedule();
      return data;
    } catch (error) {
      console.error('更新醫生到診排程失敗:', error);
      throw error;
    }
  }, [fetchDoctorVisitSchedule]);

  // Delete doctor visit schedule
  const deleteDoctorVisitSchedule = useCallback(async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_visit_schedule')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      console.log('刪除醫生到診排程成功:', scheduleId);
      await fetchDoctorVisitSchedule();
    } catch (error) {
      console.error('刪除醫生到診排程失敗:', error);
      throw error;
    }
  }, [fetchDoctorVisitSchedule]);

  const fetchHospitalOutreachRecordHistory = async (patientId: number) => {
    try {
      console.log('載入醫院外展記錄歷史，院友ID:', patientId);
      
      const { data, error } = await supabase
        .from('hospital_outreach_record_history')
        .select('*')
        .eq('patient_id', patientId)
        .order('archived_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('成功載入醫院外展記錄歷史:', data?.length || 0, '筆記錄');
      setHospitalOutreachRecordHistory(data || []);
      return data || [];
    } catch (error) {
      console.error('載入醫院外展記錄歷史失敗:', error);
      setHospitalOutreachRecordHistory([]);
      return [];
    }
  };

  // 新增醫院外展記錄
  const addHospitalOutreachRecord = useCallback(async (recordData: any) => {
    try {
      // 檢查是否已存在相同院友的記錄
      const { data: existingRecord, error: checkError } = await supabase
        .from('hospital_outreach_records')
        .select('id')
        .eq('patient_id', recordData.patient_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRecord) {
        const patient = patients.find(p => p.院友id === recordData.patient_id);
        const patientName = patient ? `${patient.中文姓氏}${patient.中文名字}` : '該院友';
        alert(`${patientName} 已有醫院外展記錄，每位院友只能有一筆記錄。\n\n如需更新記錄，請使用編輯功能。`);
        return null;
      }

      const { data, error } = await supabase
        .from('hospital_outreach_records')
        .insert([recordData])
        .select()
        .single();

      if (error) throw error;

      console.log('新增醫院外展記錄成功:', data);
      await fetchHospitalOutreachRecords();
      return data;
    } catch (error) {
      console.error('新增醫院外展記錄失敗:', error);
      throw error;
    }
  }, [patients, fetchHospitalOutreachRecords]);

  // 更新醫院外展記錄
  const updateHospitalOutreachRecord = useCallback(async (recordData: any) => {
    try {
      const { data, error } = await supabase
        .from('hospital_outreach_records')
        .update(recordData)
        .eq('id', recordData.id)
        .select()
        .single();

      if (error) throw error;

      console.log('更新醫院外展記錄成功:', data);
      await fetchHospitalOutreachRecords();
      return data;
    } catch (error) {
      console.error('更新醫院外展記錄失敗:', error);
      throw error;
    }
  }, [fetchHospitalOutreachRecords]);

  // 刪除醫院外展記錄
  const deleteHospitalOutreachRecord = useCallback(async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('hospital_outreach_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      console.log('刪除醫院外展記錄成功:', recordId);
      await fetchHospitalOutreachRecords();
    } catch (error) {
      console.error('刪除醫院外展記錄失敗:', error);
      throw error;
    }
  }, [fetchHospitalOutreachRecords]);

  const [prescriptionWorkflowRecords, setPrescriptionWorkflowRecords] = useState<any[]>([]);
  
  // 新增的處方工作流程相關狀態
  const [prescriptionTimeSlotDefinitions, setPrescriptionTimeSlotDefinitions] = useState<PrescriptionTimeSlotDefinition[]>([]);
  const [dailySystemTasks, setDailySystemTasks] = useState<db.DailySystemTask[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!authReady) {
      console.log('Auth not ready yet, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user, clearing data...');
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
    
    if (dataLoaded) {
      console.log('Data already loaded, skipping...');
      return;
    }
    
    console.log('Auth ready and user exists, loading data...');
    const loadData = async () => {
      try {
        await initializeAndLoadData();
      } catch (error) {
        console.error('資料載入失敗:', error);
      }
    };
    loadData();
  }, [authReady, user, dataLoaded]);

  const initializeAndLoadData = async () => {
    try {
      console.log('Starting data initialization...');
      await generateDailyWorkflowRecords(new Date().toISOString().split('T')[0]);
      await refreshData();
      setDataLoaded(true);
      console.log('Data initialization completed successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
      try {
        console.log('Attempting to refresh data despite initialization error...');
        await refreshData();
        alert(`生成失敗: ${error.message}`);
        setDataLoaded(true);
      } catch (refreshError) {
        console.error('Refresh data also failed:', refreshError);
      }
    } finally {
      setLoading(false);
    }
  };

  // 輕量級刷新，只重新載入關鍵數據
  const refreshHealthData = async () => {
    try {
      const [healthRecordsData, patientHealthTasksData] = await Promise.all([
        db.getHealthRecords(),  // 載入全部記錄
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

  const refreshData = async () => {
    try {
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
        db.getHealthRecords(),  // 載入全部記錄
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
      console.log('PatientContext: 開始處理任務去重，原始任務數量:', patientHealthTasksData.length);
      
      const uniqueTasksMap = new Map<string, any>();
      const duplicateTaskIds: string[] = [];
      
      patientHealthTasksData.forEach(task => {
        if (uniqueTasksMap.has(task.id)) {
          duplicateTaskIds.push(task.id);
          console.warn('PatientContext: 發現重複任務 ID:', task.id, '任務詳情:', {
            patient_id: task.patient_id,
            health_record_type: task.health_record_type,
            next_due_at: task.next_due_at,
            created_at: task.created_at
          });
        } else {
          uniqueTasksMap.set(task.id, task);
        }
      });
      
      const uniquePatientHealthTasksData = Array.from(uniqueTasksMap.values());
      
      if (duplicateTaskIds.length > 0) {
        console.warn('PatientContext: 發現並移除重複任務，重複 ID 列表:', duplicateTaskIds);
        console.warn('PatientContext: 去重前任務數量:', patientHealthTasksData.length, '去重後任務數量:', uniquePatientHealthTasksData.length);
      } else {
        console.log('PatientContext: 任務去重完成，沒有發現重複任務，任務數量:', uniquePatientHealthTasksData.length);
      }
      
      console.log('Data loaded:', {
        patients: patientsData.length,
        stations: stationsData.length,
        beds: bedsData.length,
        schedules: schedulesData.length,
        prescriptions: prescriptionsData.length,
        serviceReasons: serviceReasonsData.length,
        healthRecords: healthRecordsData.length,
        followUpAppointments: followUpAppointmentsData.length,
        patientHealthTasks: uniquePatientHealthTasksData.length,
        mealGuidances: mealGuidancesData.length,
        patientLogs: patientLogsData.length,
        patientRestraintAssessments: patientRestraintAssessmentsData.length,
        healthAssessments: healthAssessmentsData.length,
        woundAssessments: woundAssessmentsData.length,
        patientAdmissionRecords: patientAdmissionRecordsData.length,
        drugDatabase: drugDatabaseData.length
      });

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
      setAnnualHealthCheckups(annualHealthCheckupsData || []);
      setIncidentReports(incidentReportsData || []);
      setDiagnosisRecords(diagnosisRecordsData || []);
      setVaccinationRecords(vaccinationRecordsData || []);
      setPatientNotes(patientNotesData || []);
      setPatrolRounds(patrolRoundsData || []);
      setDiaperChangeRecords(diaperChangeRecordsData || []);
      setRestraintObservationRecords(restraintObservationRecordsData || []);
      setPositionChangeRecords(positionChangeRecordsData || []);

      // 載入每日系統任務
      try {
        const overdueTasks = await db.getOverdueDailySystemTasks();
        setDailySystemTasks(overdueTasks);
      } catch (error) {
        console.warn('載入每日系統任務失敗:', error);
        setDailySystemTasks([]);
      }
      
      // 單獨載入缺席記錄，如果表不存在則設為空陣列
      try {
        const patientAdmissionRecordsData = await db.getPatientAdmissionRecords();
        setPatientAdmissionRecords(patientAdmissionRecordsData);
      } catch (admissionError) {
        console.warn('載入缺席記錄失敗，可能是表尚未建立:', admissionError);
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

  // ... (省略未修改的 addPatient, updatePatient, deletePatient 等函式) ...

  // Patient health task functions - Optimistic Updates
  const addPatientHealthTask = async (task: Omit<db.PatientHealthTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Optimistic update: wait for DB return to get ID, then update local state
      // This is "Fast Update"
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
      // Optimistic update: Update local state immediately
      setPatientHealthTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
      
      await db.updatePatientHealthTask(task);
    } catch (error) {
      console.error('Error updating patient health task:', error);
      // Revert on error
      await refreshData();
      throw error;
    }
  };

  const deletePatientHealthTask = async (id: string) => {
    try {
      // Optimistic update
      setPatientHealthTasks(prev => prev.filter(t => t.id !== id));
      
      await db.deletePatientHealthTask(id);
    } catch (error) {
      console.error('Error deleting patient health task:', error);
      // Revert on error
      await refreshData();
      throw error;
    }
  };

  // ... (其他函式保持不變，請確保包含完整的 PatientContext 內容) ...
  // 為確保完整性，我將只展示修改的部分，請保留您原本的其他函式
  // 若您需要完整的檔案內容（包含所有未修改的函式），請讓我知道。
  // (由於篇幅限制，這裡假設您會將上述三個函式替換掉原本的實現)
  
  // 為了讓代碼能運作，這裡必須補上 return 部分
  return (
    <PatientContext.Provider value={{
      // ... (其他狀態)
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
      // ... (其他所有函式)
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
      batchDeleteDuplicateRecords
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