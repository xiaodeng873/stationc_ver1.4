import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ReactNode } from 'react';
import * as db from '../lib/database';
import { supabase } from '../lib/supabase';
import { generateDailyWorkflowRecords } from '../utils/workflowGenerator';
import { useAuth } from './AuthContext';

// Re-export types from database module
export type { Patient, HealthRecord, PatientHealthTask, HealthTaskType, FrequencyUnit, FollowUpAppointment, MealGuidance, MealCombinationType, SpecialDietType, PatientLog, PatientRestraintAssessment, WoundAssessment, PatientAdmissionRecord, AdmissionEventType, DailySystemTask, DeletedHealthRecord, DuplicateRecordGroup, IncidentReport, DiagnosisRecord, VaccinationRecord } from '../lib/database';

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
  const [patientAdmissionRecords, setPatientAdmissionRecords] = useState<db.PatientAdmissionRecord[]>([]);
  const [hospitalEpisodes, setHospitalEpisodes] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [drugDatabase, setDrugDatabase] = useState<any[]>([]);
  const [hospitalOutreachRecords, setHospitalOutreachRecords] = useState<any[]>([]);
  const [hospitalOutreachRecordHistory, setHospitalOutreachRecordHistory] = useState<any[]>([]);
  const [doctorVisitSchedule, setDoctorVisitSchedule] = useState<any[]>([]);

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
  const [loading, setLoading] = useState(true);
  
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
        vaccinationRecordsData
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
        db.getVaccinationRecords()
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

      // 載入每日系統任務
      try {
        const overdueTasks = await db.getOverdueDailySystemTasks();
        setDailySystemTasks(overdueTasks);
      } catch (error) {
        console.warn('載入每日系統任務失敗:', error);
        setDailySystemTasks([]);
      }
      
      // 單獨載入出入院記錄，如果表不存在則設為空陣列
      try {
        const patientAdmissionRecordsData = await db.getPatientAdmissionRecords();
        setPatientAdmissionRecords(patientAdmissionRecordsData);
      } catch (admissionError) {
        console.warn('載入出入院記錄失敗，可能是表尚未建立:', admissionError);
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

  const addPatient = async (patient: Omit<db.Patient, '院友id'>) => {
    try {
      console.log('Adding patient:', patient);
      const { 中文姓氏, 中文名字, 床號, ...rest } = patient;
      if (!中文姓氏 || !中文名字) {
        throw new Error('中文姓氏和中文名字為必填欄位');
      }
      const 中文姓名 = `${中文姓氏}${中文名字}`;

      const patientWithFullName: Omit<db.Patient, '院友id'> = {
        ...rest,
        中文姓氏,
        中文名字,
        中文姓名,
        床號: 床號 || '待分配'
      };
      console.log('Generated patient with full name:', patientWithFullName);
      const newPatient = await db.createPatient(patientWithFullName);
      console.log('Patient added successfully:', newPatient);
      await refreshData();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  };

  const updatePatient = async (patient: db.Patient) => {
    try {
      // 如果更新了床位，同步更新床號
      if (patient.bed_id) {
        const bed = beds.find(b => b.id === patient.bed_id);
        if (bed) {
          patient.床號 = bed.bed_number;
        }
      }

      await db.updatePatient(patient);

      // 當院友狀態更新時，檢查是否需要更新 is_hospitalized 狀態
      // 如果有 active 的住院事件，設為 true；否則設為 false
      const activeEpisode = hospitalEpisodes.find(episode =>
        episode.patient_id === patient.院友id && episode.status === 'active'
      );

      if (activeEpisode && !patient.is_hospitalized) {
        // 有 active 住院事件但 is_hospitalized 為 false，需要更新
        await db.updatePatient({
          ...patient,
          is_hospitalized: true
        });
      } else if (!activeEpisode && patient.is_hospitalized) {
        // 沒有 active 住院事件但 is_hospitalized 為 true，需要更新
        await db.updatePatient({
          ...patient,
          is_hospitalized: false
        });
      }

      // 如果院友退住，刪除健康任務
      // 資料庫觸發器會自動處理床位釋放
      if (patient.在住狀態 === '已退住') {
        const patientTasks = patientHealthTasks.filter(task => task.patient_id === patient.院友id);
        for (const task of patientTasks) {
          await db.deletePatientHealthTask(task.id);
        }
      }

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
      console.log('PatientContext updateScheduleDetail 調用:', detailData);
      const result = await db.updateScheduleDetail(detailData);
      console.log('PatientContext updateScheduleDetail 結果:', result);
      
      if (result?.error) {
        throw new Error(result.error.message || '更新失敗');
      }
          
      console.log('PatientContext 數據刷新完成');
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

  const deleteSchedule = async (id: number) => {
    try {
      await db.deleteSchedule(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const addPrescription = async (prescription: Omit<db.Prescription, '處方id'>) => {
    try {
      console.log('Adding prescription:', prescription);
      await db.createPrescription(prescription);
      console.log('Prescription added successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error adding prescription:', error);
      throw error;
    }
  };

  const updatePrescription = async (prescription: any) => {
    try {
      console.log('Updating prescription:', prescription);
      await db.updatePrescription(prescription);
      console.log('Prescription updated successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  };

  const deletePrescription = async (id: number) => {
    try {
      console.log('Deleting prescription:', id);
      await db.deletePrescription(id);
      console.log('Prescription deleted successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  };

  const addHealthRecord = async (record: Omit<db.HealthRecord, '記錄id'>, skipRefresh = false) => {
    try {
      console.log('Adding health record:', record);
      const newRecord = await db.createHealthRecord(record);
      console.log('Health record added successfully');

      if (!skipRefresh) {
        // 只更新健康記錄，不重新載入所有數據
        setHealthRecords(prev => [...prev, newRecord]);
      }

      return newRecord;
    } catch (error) {
      console.error('Error adding health record:', error);
      throw error;
    }
  };

  // 新增的載入函數
  const loadPrescriptionWorkflowRecords = async (patientId?: number, date?: string) => {
    try {
      // 首先檢查表是否存在，如果不存在則創建工作流程記錄
      const { data: existingRecords, error: fetchError } = await supabase
        .from('medication_workflow_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('scheduled_date', date);
      
      if (fetchError) throw fetchError;
      setPrescriptionWorkflowRecords(existingRecords || []);
    } catch (error) {
      console.error('載入處方工作流程記錄失敗:', error);
      throw error;
    }
  };
  
  const loadPrescriptionTimeSlotDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('prescription_time_slot_definitions')
        .select('*')
        .order('slot_name');
      
      if (error) throw error;
      setPrescriptionTimeSlotDefinitions(data || []);
    } catch (error) {
      console.error('載入處方時段定義失敗:', error);
      throw error;
    }
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
      
      // 符合條件的院友
      eligiblePatients.push(patient);
    });

    return {
      eligiblePatients,
      excludedPatients,
      targetDate: today
    };
  };

  // 一鍵為所有符合條件的院友生成隨機體溫（支援指定日期）
  const generateRandomTemperaturesForActivePatients = async (targetDate?: string) => {
    try {
      const { eligiblePatients, targetDate: today } = checkEligiblePatientsForTemperature(targetDate);

      // 為每位符合條件的院友建立監測記錄
      const newHealthRecords = eligiblePatients.map(patient => ({
        院友id: patient.院友id,
        記錄日期: today,
        記錄時間: getFixedMorningTime(),
        記錄類型: '生命表徵',
        血壓收縮壓: null,
        血壓舒張壓: null,
        脈搏: null,
        體溫: patient.is_hospitalized ? null : generateRandomTemperature(),
        血含氧量: null,
        呼吸頻率: null,
        血糖值: null,
        體重: null,
        備註: patient.is_hospitalized ? '無法量度原因: 入院' : null,
        記錄人員: null
      }));

      // 批量插入監測記錄
      await db.createBatchHealthRecords(newHealthRecords);
      
      // 刷新資料
      await refreshData();
      
      return eligiblePatients.length;
    } catch (error) {
      console.error('生成隨機體溫失敗:', error);
      throw error;
    }
  };

  // 記錄每日體溫生成任務完成
  const recordDailyTemperatureGenerationCompletion = async () => {
    try {
      const today = getHongKongDate();
      await db.recordDailySystemTaskCompletion('Daily Temperature Generation', today);
      
      // 刷新每日系統任務狀態
      const overdueTasks = await db.getOverdueDailySystemTasks();
      setDailySystemTasks(overdueTasks);
    } catch (error) {
      console.error('記錄每日體溫生成任務完成失敗:', error);
      throw error;
    }
  };

  // 獲取逾期的每日系統任務
  const getOverdueDailySystemTasks = async (): Promise<db.DailySystemTask[]> => {
    try {
      return await db.getOverdueDailySystemTasks();
    } catch (error) {
      console.error('獲取逾期每日系統任務失敗:', error);
      return [];
    }
  };
  
  // 新增的處方工作流程相關函數
  const fetchPrescriptionWorkflowRecords = async (patientId?: number, scheduledDate?: string): Promise<PrescriptionWorkflowRecord[]> => {
    try {
      // 嚴格的參數驗證和轉換
      const validPatientId = (patientId !== undefined && patientId !== null && !isNaN(patientId) && patientId > 0) ? patientId : null;
      const validScheduledDate = (scheduledDate && typeof scheduledDate === 'string' && scheduledDate.trim() !== '' && scheduledDate !== 'undefined') ? scheduledDate.trim() : null;

      console.log('🔍 fetchPrescriptionWorkflowRecords 被調用:', {
        原始patientId: patientId,
        原始scheduledDate: scheduledDate,
        有效patientId: validPatientId,
        有效scheduledDate: validScheduledDate,
        將查詢所有記錄: validPatientId === null && validScheduledDate === null
      });

      let query = supabase
        .from('medication_workflow_records')
        .select('*');

      if (validPatientId !== null) {
        query = query.eq('patient_id', validPatientId);
      }

      if (validScheduledDate !== null) {
        query = query.eq('scheduled_date', validScheduledDate);
      }

      const { data: queryData, error: queryError } = await query.order('scheduled_time');

      if (queryError) {
        console.error('Supabase 查詢錯誤:', queryError);
        throw new Error(`查詢工作流程記錄失敗: ${queryError.message}`);
      }

      console.log('查詢成功，返回記錄數量:', queryData?.length || 0);
      setPrescriptionWorkflowRecords(queryData || []);
      return queryData || [];
    } catch (error) {
      console.error('錯誤詳情:', {
        message: error instanceof Error ? error.message : '未知錯誤',
        originalParams: { patientId, scheduledDate }
      });
      console.error('獲取處方工作流程記錄失敗:', error);
      
      // 嚴格的參數正規化
      const normalizedPatientId = (() => {
        if (patientId === null || patientId === undefined) return null;
        if (typeof patientId === 'string') {
          const parsed = parseInt(patientId, 10);
          return !isNaN(parsed) && parsed > 0 ? parsed : null;
        }
        if (typeof patientId === 'number') {
          return !isNaN(patientId) && patientId > 0 ? patientId : null;
        }
        return null;
      })();

      const normalizedScheduledDate = (() => {
        if (scheduledDate === null || scheduledDate === undefined) return null;
        if (typeof scheduledDate === 'string' && scheduledDate.trim() !== '' && scheduledDate !== 'undefined') {
          return scheduledDate.trim();
        }
        return null;
      })();

      console.log('正規化後的參數:', { 
        normalizedPatientId, 
        normalizedScheduledDate 
      });

      // 如果所有參數都無效，直接返回空結果
      if (normalizedPatientId === null && normalizedScheduledDate === null) {
        console.log('所有參數都無效，返回空結果');
        setPrescriptionWorkflowRecords([]);
        return [];
      }

      throw error;
    }
  };

  // 使用 useCallback 穩定化 fetchPrescriptionWorkflowRecords 函數（移到定義之後）
  const memoizedFetchPrescriptionWorkflowRecords = useCallback(fetchPrescriptionWorkflowRecords, []);

  const createPrescriptionWorkflowRecord = async (recordData: Omit<PrescriptionWorkflowRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('medication_workflow_records')
        .insert([recordData])
        .select()
        .single();
      
      if (error) throw error;
    } catch (error) {
      console.error('建立處方工作流程記錄失敗:', error);
      throw error;
    }
  };
  
  const updatePrescriptionWorkflowRecord = async (recordId: string, updateData: Partial<PrescriptionWorkflowRecord>) => {
    try {
      const { error } = await supabase
        .from('medication_workflow_records')
        .update(updateData)
        .eq('id', recordId);
      
      if (error) throw error;
      await loadPrescriptionWorkflowRecords();
    } catch (error) {
      console.error('更新處方工作流程記錄失敗:', error);
      throw error;
    }
  };
  
  const prepareMedication = async (
    recordId: string, 
    staffName: string,
    failureReason?: string,
    failureCustomReason?: string,
    patientId?: number,
    scheduledDate?: string
  ) => {
    // 參數驗證和正規化
    const normalizedPatientId = patientId && !isNaN(patientId) && patientId > 0 ? patientId : null;
    const normalizedScheduledDate = scheduledDate && scheduledDate.trim() !== '' ? scheduledDate.trim() : null;
    
    console.log('=== prepareMedication 參數檢查 ===', {
      recordId,
      staffName,
      originalPatientId: patientId,
      originalScheduledDate: scheduledDate,
      normalizedPatientId,
      normalizedScheduledDate
    });
    
    if (!normalizedPatientId || !normalizedScheduledDate) {
      console.error('prepareMedication 參數無效:', { normalizedPatientId, normalizedScheduledDate });
      throw new Error('院友ID和排程日期為必填項目');
    }

    try {
      console.log('執行執藥操作:', { recordId, staffName });
      
      const updateData: any = {
        preparation_staff: staffName,
        preparation_time: new Date().toISOString()
      };

      if (failureReason) {
        updateData.preparation_status = 'failed';
        updateData.dispensing_failure_reason = failureReason;
        updateData.custom_failure_reason = failureCustomReason || null;
      } else {
        updateData.preparation_status = 'completed';
        updateData.dispensing_failure_reason = null;
        updateData.custom_failure_reason = null;
      }
      
      const { data: updatedRecord, error } = await supabase
        .from('medication_workflow_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Supabase 更新錯誤:', error);
        throw error;
      }

      console.log('執藥操作完成');

      // 使用樂觀更新：直接更新本地狀態
      setPrescriptionWorkflowRecords(prev =>
        prev.map(rec => rec.id === recordId ? updatedRecord : rec)
      );
    } catch (error) {
      console.error('執行preparation失敗:', error);
      throw error;
    }
  };
  
  const verifyMedication = async (
    recordId: string, 
    staffName: string,
    failureReason?: string,
    failureCustomReason?: string,
    patientId?: number,
    scheduledDate?: string
  ) => {
    // 參數驗證和正規化
    const normalizedPatientId = patientId && !isNaN(patientId) && patientId > 0 ? patientId : null;
    const normalizedScheduledDate = scheduledDate && scheduledDate.trim() !== '' ? scheduledDate.trim() : null;
    
    console.log('=== verifyMedication 參數檢查 ===', {
      recordId,
      staffName,
      originalPatientId: patientId,
      originalScheduledDate: scheduledDate,
      normalizedPatientId,
      normalizedScheduledDate
    });
    
    if (!normalizedPatientId || !normalizedScheduledDate) {
      console.error('verifyMedication 參數無效:', { normalizedPatientId, normalizedScheduledDate });
      throw new Error('院友ID和排程日期為必填項目');
    }

    try {
      console.log('執行核藥操作:', { recordId, staffName });
      
      // 檢查執藥是否已完成
      const { data: record, error: fetchError } = await supabase
        .from('medication_workflow_records')
        .select('preparation_status')
        .eq('id', recordId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (record.preparation_status !== 'completed') {
        throw new Error('必須先完成執藥步驟才能進行核藥');
      }
      
      const updateData: any = {
        verification_staff: staffName,
        verification_time: new Date().toISOString()
      };

      if (failureReason) {
        updateData.verification_status = 'failed';
        updateData.dispensing_failure_reason = failureReason;
        updateData.custom_failure_reason = failureCustomReason || null;
      } else {
        updateData.verification_status = 'completed';
        updateData.dispensing_failure_reason = null;
        updateData.custom_failure_reason = null;
      }
      
      const { data: updatedRecord, error } = await supabase
        .from('medication_workflow_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Supabase 更新錯誤:', error);
        throw error;
      }

      console.log('核藥操作完成');

      // 使用樂觀更新：直接更新本地狀態
      setPrescriptionWorkflowRecords(prev =>
        prev.map(rec => rec.id === recordId ? updatedRecord : rec)
      );
    } catch (error) {
      console.error('執行verification失敗:', error);
      throw error;
    }
  };
  
  const dispenseMedication = async (
    recordId: string,
    staffName: string,
    failureReason?: string,
    failureCustomReason?: string,
    patientId?: number,
    scheduledDate?: string,
    notes?: string,
    inspectionCheckResult?: any
  ) => {
    // 參數驗證和正規化
    const normalizedPatientId = patientId && !isNaN(patientId) && patientId > 0 ? patientId : null;
    const normalizedScheduledDate = scheduledDate && scheduledDate.trim() !== '' ? scheduledDate.trim() : null;

    console.log('=== dispenseMedication 參數檢查 ===', {
      recordId,
      staffName,
      failureReason,
      failureCustomReason,
      originalPatientId: patientId,
      originalScheduledDate: scheduledDate,
      normalizedPatientId,
      normalizedScheduledDate,
      notes,
      inspectionCheckResult
    });

    if (!normalizedPatientId || !normalizedScheduledDate) {
      console.error('dispenseMedication 參數無效:', { normalizedPatientId, normalizedScheduledDate });
      throw new Error('院友ID和排程日期為必填項目');
    }

    try {
      console.log('執行派藥操作:', { recordId, staffName, failureReason, failureCustomReason });

      // 檢查核藥是否已完成（僅在成功派藥時需要檢查）
      const { data: record, error: fetchError } = await supabase
        .from('medication_workflow_records')
        .select('verification_status, prescription_id, patient_id')
        .eq('id', recordId)
        .single();

      if (fetchError) throw fetchError;

      // 只有在沒有失敗原因時（即正常派藥），才需要檢查核藥是否完成
      if (!failureReason && record.verification_status !== 'completed') {
        throw new Error('必須先完成核藥步驟才能進行派藥');
      }

      // 正常派藥或手動設定失敗
      const updateData: any = {
        dispensing_staff: staffName,
        dispensing_time: new Date().toISOString()
      };

      if (failureReason) {
        updateData.dispensing_status = 'failed';
        updateData.dispensing_failure_reason = failureReason;
        updateData.custom_failure_reason = failureCustomReason || null;
      } else {
        updateData.dispensing_status = 'completed';
        updateData.dispensing_failure_reason = null;
        updateData.custom_failure_reason = null;
      }

      // 如果有備註（如注射位置），添加到更新數據中
      if (notes) {
        updateData.notes = notes;
      }

      // 如果有檢測結果，存儲到 inspection_check_result 字段
      if (inspectionCheckResult) {
        console.log('[dispenseMedication] 儲存檢測結果:', inspectionCheckResult);
        updateData.inspection_check_result = inspectionCheckResult;
      }

      console.log('[dispenseMedication] 更新數據:', updateData);

      const { data: updatedRecord, error } = await supabase
        .from('medication_workflow_records')
        .update(updateData)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('[dispenseMedication] Supabase 更新錯誤:', error);
        throw error;
      }

      console.log('[dispenseMedication] 派藥記錄更新成功');

      // 使用樂觀更新：直接更新本地狀態，不需要重新載入
      setPrescriptionWorkflowRecords(prev =>
        prev.map(rec => rec.id === recordId ? updatedRecord : rec)
      );
    } catch (error) {
      console.error('執行dispensing失敗:', error);
      throw error;
    }
  };
  
  const checkPrescriptionInspectionRules = async (
    prescriptionId: string,
    patientId: number,
    newVitalSignData?: Omit<db.HealthRecord, '記錄id'>
  ): Promise<InspectionCheckResult> => {
    try {
      console.log('[checkPrescriptionInspectionRules] 開始檢查，處方ID:', prescriptionId, '院友ID:', patientId);

      // 獲取處方的檢測規則
      const { data: prescription, error: prescriptionError } = await supabase
        .from('new_medication_prescriptions')
        .select('inspection_rules')
        .eq('id', prescriptionId)
        .single();

      if (prescriptionError) {
        console.error('[checkPrescriptionInspectionRules] 獲取處方失敗:', prescriptionError);
        throw prescriptionError;
      }

      const inspectionRules = prescription.inspection_rules || [];
      console.log('[checkPrescriptionInspectionRules] 檢測規則:', inspectionRules);

      if (inspectionRules.length === 0) {
        console.log('[checkPrescriptionInspectionRules] 無檢測規則，允許派藥');
        return {
          canDispense: true,
          blockedRules: [],
          usedVitalSignData: {}
        };
      }

      const result: InspectionCheckResult = {
        canDispense: true,
        blockedRules: [],
        usedVitalSignData: {}
      };

      // 檢查每個檢測規則
      for (const rule of inspectionRules) {
        console.log('[checkPrescriptionInspectionRules] 檢查規則:', rule);
        const latestVitalSign = await fetchLatestVitalSigns(patientId, rule.vital_sign_type);
        
        if (!latestVitalSign) {
          // 沒有相關的監測記錄，跳過此規則
          continue;
        }
        
        let actualValue: number = 0;
        
        // 根據檢測項類型獲取實際值
        switch (rule.vital_sign_type) {
          case '上壓':
            actualValue = latestVitalSign.血壓收縮壓 || 0;
            break;
          case '下壓':
            actualValue = latestVitalSign.血壓舒張壓 || 0;
            break;
          case '脈搏':
            actualValue = latestVitalSign.脈搏 || 0;
            break;
          case '血糖值':
            actualValue = latestVitalSign.血糖值 || 0;
            break;
          case '呼吸':
            actualValue = latestVitalSign.呼吸頻率 || 0;
            break;
          case '血含氧量':
            actualValue = latestVitalSign.血含氧量 || 0;
            break;
          case '體溫':
            actualValue = latestVitalSign.體溫 || 0;
            break;
          default:
            continue;
        }
        
        // 記錄使用的監測數據
        result.usedVitalSignData[rule.vital_sign_type] = actualValue;

        // 檢查條件
        let conditionMet = false;

        switch (rule.condition_operator) {
          case 'gt':
            conditionMet = actualValue > rule.condition_value;
            break;
          case 'lt':
            conditionMet = actualValue < rule.condition_value;
            break;
          case 'gte':
            conditionMet = actualValue >= rule.condition_value;
            break;
          case 'lte':
            conditionMet = actualValue <= rule.condition_value;
            break;
        }

        if (conditionMet) {
          result.canDispense = false;
          result.blockedRules.push({
            vital_sign_type: rule.vital_sign_type,
            condition_operator: rule.condition_operator,
            condition_value: rule.condition_value,
            actual_value: actualValue,
            action_if_met: rule.action_if_met || 'block_dispensing'
          });
        }
      }

      console.log('[checkPrescriptionInspectionRules] 檢測結果:', result);

      return result;
    } catch (error) {
      console.error('檢查處方檢測規則失敗:', error);
      throw error;
    }
  };
  
  const fetchLatestVitalSigns = async (patientId: number, vitalSignType: string): Promise<db.HealthRecord | null> => {
    try {
      console.log(`[fetchLatestVitalSigns] 開始查詢，院友ID: ${patientId}, 檢測類型: ${vitalSignType}`);

      // 根據檢測項類型決定要查詢的記錄類型和字段名
      let recordType = '';
      let fieldName = '';

      if (vitalSignType === '上壓') {
        recordType = '生命表徵';
        fieldName = '血壓收縮壓';
      } else if (vitalSignType === '下壓') {
        recordType = '生命表徵';
        fieldName = '血壓舒張壓';
      } else if (vitalSignType === '脈搏') {
        recordType = '生命表徵';
        fieldName = '脈搏';
      } else if (vitalSignType === '呼吸') {
        recordType = '生命表徵';
        fieldName = '呼吸頻率';
      } else if (vitalSignType === '血含氧量') {
        recordType = '生命表徵';
        fieldName = '血含氧量';
      } else if (vitalSignType === '體溫') {
        recordType = '生命表徵';
        fieldName = '體溫';
      } else if (vitalSignType === '血糖值') {
        recordType = '血糖控制';
        fieldName = '血糖值';
      } else {
        console.warn(`[fetchLatestVitalSigns] 未知的檢測類型: ${vitalSignType}`);
        return null;
      }

      console.log(`[fetchLatestVitalSigns] 查詢記錄類型: ${recordType}, 字段名: ${fieldName}`);

      // 查詢該記錄類型的多條記錄，然後找到第一條包含該字段數據的記錄
      const { data, error } = await supabase
        .from('健康記錄主表')
        .select('*')
        .eq('院友id', patientId)
        .eq('記錄類型', recordType)
        .not(fieldName, 'is', null)
        .order('記錄日期', { ascending: false })
        .order('記錄時間', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[fetchLatestVitalSigns] 查詢失敗:', error);
        throw new Error(`查詢${recordType}記錄失敗: ${error.message}`);
      }

      const result = data && data.length > 0 ? data[0] : null;

      if (result) {
        console.log(`[fetchLatestVitalSigns] 查詢結果: 找到記錄ID ${result.記錄id}, ${fieldName}=${result[fieldName]}, 日期=${result.記錄日期}, 時間=${result.記錄時間}`);
      } else {
        console.log(`[fetchLatestVitalSigns] 查詢結果: 無包含${fieldName}的${recordType}記錄`);
      }

      return result;
    } catch (error) {
      console.error('[fetchLatestVitalSigns] 獲取最新監測記錄失敗:', error);
      throw error;
    }
  };
  
  const batchSetDispenseFailure = async (patientId: number, scheduledDate: string, scheduledTime: string, reason: string) => {
    try {
      // 獲取該院友在指定日期時間的所有在服處方工作流程記錄
      const { data: records, error: fetchError } = await supabase
        .from('medication_workflow_records')
        .select('id')
        .eq('patient_id', patientId)
        .eq('scheduled_date', scheduledDate)
        .eq('scheduled_time', scheduledTime)
        .eq('dispensing_status', 'pending');
      
      if (fetchError) throw fetchError;
      
      if (records && records.length > 0) {
        const updateData = {
          dispensing_status: 'failed' as const,
          dispensing_failure_reason: reason,
          dispensing_time: new Date().toISOString()
        };
        
        const { error: updateError } = await supabase
          .from('medication_workflow_records')
          .update(updateData)
          .in('id', records.map(r => r.id));
        
        if (updateError) throw updateError;
        
        await loadPrescriptionWorkflowRecords();
      }
    } catch (error) {
      console.error('批量設定派藥失敗失敗:', error);
      throw error;
    }
  };
  
  // 撤銷工作流程步驟
  const revertPrescriptionWorkflowStep = async (
    recordId: string, 
    step: 'preparation' | 'verification' | 'dispensing',
    patientId?: number,
    scheduledDate?: string
  ) => {
    if (!recordId || recordId === 'undefined') {
      throw new Error('無效的記錄ID');
    }

    try {
      const updateData: any = {};

      switch (step) {
        case 'preparation':
          updateData.preparation_status = 'pending';
          updateData.preparation_staff = null;
          updateData.preparation_time = null;
          // 如果撤銷執藥，也要撤銷後續步驟
          updateData.verification_status = 'pending';
          updateData.verification_staff = null;
          updateData.verification_time = null;
          updateData.dispensing_status = 'pending';
          updateData.dispensing_staff = null;
          updateData.dispensing_time = null;
          updateData.dispensing_failure_reason = null;
          updateData.custom_failure_reason = null;
          break;
        case 'verification':
          updateData.verification_status = 'pending';
          updateData.verification_staff = null;
          updateData.verification_time = null;
          // 如果撤銷核藥，也要撤銷派藥步驟
          updateData.dispensing_status = 'pending';
          updateData.dispensing_staff = null;
          updateData.dispensing_time = null;
          updateData.dispensing_failure_reason = null;
          updateData.custom_failure_reason = null;
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
        throw new Error(`撤銷${step}失敗: ${error.message}`);
      }

      // 重新載入數據
      if (patientId && scheduledDate) {
        await fetchPrescriptionWorkflowRecords(patientId, scheduledDate);
      }
    } catch (error) {
      console.error(`撤銷${step}失敗:`, error);
      throw error;
    }
  };
  
  // 處方時段定義相關函數
  const fetchPrescriptionTimeSlotDefinitions = async (): Promise<PrescriptionTimeSlotDefinition[]> => {
    try {
      const { data, error } = await supabase
        .from('prescription_time_slot_definitions')
        .select('*')
        .order('slot_name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('獲取處方時段定義失敗:', error);
      throw error;
    }
  };
  
  const addPrescriptionTimeSlotDefinition = async (definition: Omit<PrescriptionTimeSlotDefinition, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('prescription_time_slot_definitions')
        .insert([definition])
        .select()
        .single();
      
      if (error) throw error;
      await loadPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('新增處方時段定義失敗:', error);
      throw error;
    }
  };
  
  const updatePrescriptionTimeSlotDefinition = async (definition: PrescriptionTimeSlotDefinition) => {
    try {
      const { error } = await supabase
        .from('prescription_time_slot_definitions')
        .update(definition)
        .eq('id', definition.id);
      
      if (error) throw error;
      await loadPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('更新處方時段定義失敗:', error);
      throw error;
    }
  };
  
  const deletePrescriptionTimeSlotDefinition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prescription_time_slot_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadPrescriptionTimeSlotDefinitions();
    } catch (error) {
      console.error('刪除處方時段定義失敗:', error);
      throw error;
    }
  };

  // Station management functions
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

  // Bed management functions
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
      const patient = patients.find(p => p.院友id === patientId);
      const bed = beds.find(b => b.id === bedId);

      if (!patient) {
        throw new Error('找不到指定的院友');
      }

      if (!bed) {
        throw new Error('找不到指定的床位');
      }

      // 從資料庫檢查床位的實際佔用狀態
      const { data: occupiedCheck, error: checkError } = await supabase
        .from('院友主表')
        .select('院友id, 中文姓名')
        .eq('bed_id', bedId)
        .eq('在住狀態', '在住')
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // 如果床位已有在住院友,拋出錯誤但不重新載入資料
      if (occupiedCheck) {
        throw new Error(`此床位已被院友「${occupiedCheck.中文姓名}」佔用`);
      }

      // 更新院友的床位和床號
      // 資料庫觸發器會自動處理床位的 is_occupied 狀態
      const { error } = await supabase
        .from('院友主表')
        .update({
          bed_id: bedId,
          station_id: bed.station_id,
          床號: bed.bed_number,
          在住狀態: '在住'
        })
        .eq('院友id', patientId);

      if (error) {
        throw error;
      }

      // 重新載入資料以確保所有頁面同步
      await refreshData();
    } catch (error) {
      console.error('指派床位失敗:', error);
      throw error;
    }
  };

  const swapPatientBeds = async (patientId1: number, patientId2: number) => {
    try {
      const patient1 = patients.find(p => p.院友id === patientId1);
      const patient2 = patients.find(p => p.院友id === patientId2);

      if (!patient1 || !patient2) {
        throw new Error('找不到指定的院友');
      }

      const bed1 = beds.find(b => b.id === patient1.bed_id);
      const bed2 = beds.find(b => b.id === patient2.bed_id);

      if (!bed1 || !bed2) {
        throw new Error('找不到院友的床位資訊');
      }

      // 交換床位
      const { error } = await supabase.rpc('swap_patient_beds', {
        patient_id_1: patientId1,
        patient_id_2: patientId2
      });

      if (error) {
        throw error;
      }

      // 重新載入資料以確保所有頁面同步
      await refreshData();
    } catch (error) {
      console.error('交換床位失敗:', error);
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

  // Drug database functions
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

  // Health record functions
  const updateHealthRecord = async (record: db.HealthRecord) => {
    try {
      await db.updateHealthRecord(record);
      await refreshData();
    } catch (error) {
      console.error('Error updating health record:', error);
      throw error;
    }
  };

  const deleteHealthRecord = async (id: number) => {
    try {
      console.log('[deleteHealthRecord] 刪除監測記錄 ID:', id);
      await db.deleteHealthRecord(id);

      // 只刷新監測記錄，不需要刷新所有數據
      console.log('[deleteHealthRecord] 刷新監測記錄列表');
      const healthRecordsData = await db.getHealthRecords();
      setHealthRecords(healthRecordsData);

      console.log('[deleteHealthRecord] 刪除成功');
    } catch (error) {
      console.error('[deleteHealthRecord] 刪除失敗:', error);
      throw error;
    }
  };

  // 回收筒相关函数
  const fetchDeletedHealthRecords = async () => {
    try {
      const records = await db.getDeletedHealthRecords();
      setDeletedHealthRecords(records);
    } catch (error) {
      console.warn('回收筒暂时不可用，跳过获取已删除记录:', error);
      // 不抛出错误，允许程序继续执行
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

  // 去重相关函数
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
      await refreshData(); // 刷新主列表
      // 尝试刷新回收筒列表，但即使失败也不影响主流程
      await fetchDeletedHealthRecords().catch(err => {
        console.warn('刷新回收筒列表失败，但记录已成功删除:', err);
      });
    } catch (error) {
      console.error('Error batch deleting duplicate records:', error);
      throw error;
    }
  };

  // Follow-up appointment functions
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

  // Meal guidance functions
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

  // Patient log functions
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

  // Patient health task functions
  const addPatientHealthTask = async (task: Omit<db.PatientHealthTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await db.createPatientHealthTask(task);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient health task:', error);
      throw error;
    }
  };

  const updatePatientHealthTask = async (task: db.PatientHealthTask) => {
    try {
      await db.updatePatientHealthTask(task);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient health task:', error);
      throw error;
    }
  };

  const deletePatientHealthTask = async (id: string) => {
    try {
      await db.deletePatientHealthTask(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient health task:', error);
      throw error;
    }
  };

  // Patient restraint assessment functions
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

  // Health assessment functions
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

  // Wound assessment functions
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

  // Incident report functions
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

  // Patient admission record functions
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

  // Hospital episode functions
  const addHospitalEpisode = async (episodeData: any) => {
    try {
      const { events, ...mainEpisodeData } = episodeData;

      console.log('準備插入住院事件:', mainEpisodeData);

      // 插入主要住院事件
      const { data: episode, error: episodeError } = await supabase
        .from('hospital_episodes')
        .insert([mainEpisodeData])
        .select()
        .single();

      if (episodeError) {
        console.error('插入住院事件錯誤詳情:', episodeError);
        console.error('錯誤代碼:', episodeError.code);
        console.error('錯誤訊息:', episodeError.message);
        console.error('錯誤詳情:', episodeError.details);
        throw episodeError;
      }

      // 插入事件記錄
      if (events && events.length > 0) {
        const eventsWithEpisodeId = events.map((event: any, index: number) => {
          // 移除 id 字段，讓資料庫自動生成
          const { id, ...eventWithoutId } = event;
          return {
            ...eventWithoutId,
            episode_id: episode.id,
            event_order: index + 1
          };
        });

        console.log('準備插入事件記錄:', eventsWithEpisodeId);

        const { error: eventsError } = await supabase
          .from('episode_events')
          .insert(eventsWithEpisodeId);

        if (eventsError) {
          console.error('插入事件記錄錯誤詳情:', eventsError);
          console.error('錯誤代碼:', eventsError.code);
          console.error('錯誤訊息:', eventsError.message);
          console.error('錯誤詳情:', eventsError.details);
          throw eventsError;
        }
      }

      console.log('新增住院事件成功:', episode);
      await fetchHospitalEpisodes();
      return episode;
    } catch (error) {
      console.error('新增住院事件失敗:', error);
      throw error;
    }
  };

  // 更新住院事件
  const updateHospitalEpisode = async (episodeData: any) => {
    try {
      const { events, ...mainEpisodeData } = episodeData;
      
      // 更新主要住院事件
      const { data: episode, error: episodeError } = await supabase
        .from('hospital_episodes')
        .update(mainEpisodeData)
        .eq('id', episodeData.id)
        .select()
        .single();

      if (episodeError) throw episodeError;

      // 刪除現有事件記錄
      const { error: deleteError } = await supabase
        .from('episode_events')
        .delete()
        .eq('episode_id', episodeData.id);

      if (deleteError) throw deleteError;

      // 重新插入事件記錄
      if (events && events.length > 0) {
        const eventsWithEpisodeId = events.map((event: any, index: number) => {
          // 移除 id 字段，讓資料庫自動生成
          const { id, ...eventWithoutId } = event;
          return {
            ...eventWithoutId,
            episode_id: episodeData.id,
            event_order: index + 1
          };
        });

        const { error: eventsError } = await supabase
          .from('episode_events')
          .insert(eventsWithEpisodeId);

        if (eventsError) throw eventsError;
      }

      console.log('更新住院事件成功:', episode);
      await fetchHospitalEpisodes();
      return episode;
    } catch (error) {
      console.error('更新住院事件失敗:', error);
      throw error;
    }
  };

  // 刪除住院事件
  const deleteHospitalEpisode = async (episodeId: string) => {
    try {
      const { error } = await supabase
        .from('hospital_episodes')
        .delete()
        .eq('id', episodeId);

      if (error) throw error;

      console.log('刪除住院事件成功:', episodeId);
      await fetchHospitalEpisodes();
    } catch (error) {
      console.error('刪除住院事件失敗:', error);
      throw error;
    }
  };

  // 獲取住院事件列表
  const fetchHospitalEpisodes = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_episodes')
        .select(`
          *,
          episode_events (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('查詢住院事件成功，返回記錄數量:', data?.length || 0);
      setHospitalEpisodes(data || []);
      return data || [];
    } catch (error) {
      console.error('查詢住院事件失敗:', error);
      setHospitalEpisodes([]);
      return [];
    }
  };

  const recordPatientAdmissionEvent = async (eventData: {
    patient_id: number;
    event_type: db.AdmissionEventType;
    event_date: string;
    hospital_name?: string;
    hospital_ward?: string;
    hospital_bed_number?: string;
    remarks?: string;
  }) => {
    try {
      await db.recordPatientAdmissionEvent(eventData);
      await refreshData();
    } catch (error) {
      console.error('Error recording patient admission event:', error);
      throw error;
    }
  };

  // Helper functions
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