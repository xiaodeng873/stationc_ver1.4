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
}

const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<db.Patient[]>([]);
  const [stations, setStations] = useState<db.Station[]>([]);
  const [beds, setBeds] = useState<db.Bed[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [serviceReasons, setServiceReasons] = useState<db.ServiceReason[]>([]);
  const [healthRecords, setHealthRecords] = useState<db.HealthRecord[]>([]);
  const [followUpAppointments, setFollowUpAppointments] = useState<db.FollowUpAppointment[]>([]);
  const [mealGuidances, setMealGuidances] = useState<db.MealGuidance[]>([]);
  const [patientHealthTasks, setPatientHealthTasks] = useState<db.PatientHealthTask[]>([]);
  const [patientLogs, setPatientLogs] = useState<db.PatientLog[]>([]);
  const [patientRestraintAssessments, setPatientRestraintAssessments] = useState<db.PatientRestraintAssessment[]>([]);
  const [healthAssessments, setHealthAssessments] = useState<db.HealthAssessment[]>([]);
  const [woundAssessments, setWoundAssessments] = useState<db.WoundAssessment[]>([]);
  const [hospitalEpisodes, setHospitalEpisodes] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<db.Prescription[]>([]);
  const [drugDatabase, setDrugDatabase] = useState<db.DrugDatabaseItem[]>([]);
  const [patientAdmissionRecords, setPatientAdmissionRecords] = useState<any[]>([]);
  const [annualHealthCheckups, setAnnualHealthCheckups] = useState<db.AnnualHealthCheckup[]>([]);
  const [incidentReports, setIncidentReports] = useState<db.IncidentReport[]>([]);
  const [diagnosisRecords, setDiagnosisRecords] = useState<db.DiagnosisRecord[]>([]);
  const [vaccinationRecords, setVaccinationRecords] = useState<db.VaccinationRecord[]>([]);
  const [deletedHealthRecords, setDeletedHealthRecords] = useState<db.DeletedHealthRecord[]>([]);
  const [hospitalOutreachRecords, setHospitalOutreachRecords] = useState<any[]>([]);
  const [hospitalOutreachRecordHistory, setHospitalOutreachRecordHistory] = useState<any[]>([]);
  const [doctorVisitSchedule, setDoctorVisitSchedule] = useState<any[]>([]);

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
        mealGuidancesData,
        patientHealthTasksData,
        patientLogsData,
        patientRestraintAssessmentsData,
        healthAssessmentsData,
        woundAssessmentsData,
        hospitalEpisodesData,
        prescriptionsData,
        patientAdmissionRecordsData,
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
        db.getServiceReasons(),
        db.getHealthRecords(),
        db.getFollowUpAppointments(),
        db.getMealGuidances(),
        db.getPatientHealthTasks(),
        db.getPatientLogs(),
        db.getPatientRestraintAssessments(),
        db.getHealthAssessments(),
        db.getWoundAssessments(),
        db.getHospitalEpisodes(),
        db.getPrescriptions(),
        db.getPatientAdmissionRecords(),
        db.getDrugDatabase(),
        fetchPrescriptionWorkflowRecords(),
        db.getAnnualHealthCheckups(),
        db.getIncidentReports(),
        db.getDiagnosisRecords(),
        db.getVaccinationRecords()
      ]);

      // 對 patientHealthTasksData 進行去重處理
      const uniqueTasksMap = new Map<string, any>();
      const duplicateTaskIds: string[] = [];

      patientHealthTasksData.forEach(task => {
        if (uniqueTasksMap.has(task.id)) {
          duplicateTaskIds.push(task.id);
          console.warn('PatientContext: 發現重複任務 ID:', task.id, '任務詳情:', {
            patient_id: task.patient_id,
            health_record_type: task.health_record_type,
            next_due_at: task.next_due_at
          });
        } else {
          uniqueTasksMap.set(task.id, task);
        }
      });

      const uniquePatientHealthTasksData = Array.from(uniqueTasksMap.values());

      if (duplicateTaskIds.length > 0) {
        console.warn('PatientContext: 發現並移除重複任務，重複 ID 列表:', duplicateTaskIds);
        console.warn('PatientContext: 去重前任務數量:', patientHealthTasksData.length, '去重後任務數量:', uniquePatientHealthTasksData.length);
      }

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
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  };

  const addPatient = async (patient: Omit<db.Patient, '院友id'>) => {
    try {
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
      const newPatient = await db.createPatient(patientWithFullName);
      await refreshData();
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
      const result = await db.updateScheduleDetail(detailData);
      if (result?.error) {
        throw new Error(result.error.message || '更新失敗');
      }
          
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

  const addHealthRecord = async (record: Omit<db.HealthRecord, '記錄id'>, skipRefresh = false) => {
    try {
      const newRecord = await db.createHealthRecord(record);
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
        體溫: parseFloat((Math.random() * 0.9 + 36.0).toFixed(1)),
        血含氧量: null,
        血糖值: null,
        體重: null,
        呼吸頻率: null
      }));

      await Promise.all(newHealthRecords.map(record => addHealthRecord(record, true)));
      await refreshData();
      return newHealthRecords.length;
    } catch (error) {
      console.error('批量生成體溫記錄失敗:', error);
      throw error;
    }
  };

  const fetchPrescriptionWorkflowRecords = async (patientId?: number, scheduledDate?: string): Promise<PrescriptionWorkflowRecord[]> => {
    try {
      const validPatientId = (patientId !== undefined && patientId !== null && !isNaN(patientId) && patientId > 0) ? patientId : null;
      const validScheduledDate = (scheduledDate && typeof scheduledDate === 'string' && scheduledDate.trim() !== '' && scheduledDate !== 'undefined') ? scheduledDate.trim() : null;

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

      setPrescriptionWorkflowRecords(queryData || []);
      return queryData || [];
    } catch (error) {
      console.error('獲取處方工作流程記錄失敗:', error);
      setPrescriptionWorkflowRecords([]);
      return [];
    }
  };

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
        }
      }

      return result;
    } catch (error) {
      console.error('檢查處方檢測規則失敗:', error);
      throw error;
    }
  };
  
  const fetchLatestVitalSigns = async (patientId: number, vitalSignType: string): Promise<db.HealthRecord | null> => {
    try {
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
      } else {
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
      await db.deleteHealthRecord(id);

      // 只刷新監測記錄，不需要刷新所有數據
      const healthRecordsData = await db.getHealthRecords();
      setHealthRecords(healthRecordsData);

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
      const updatedTask = await db.updatePatientHealthTask(task);
      setPatientHealthTasks(prev =>
        prev.map(t => t.id === updatedTask.id ? updatedTask : t)
      );
    } catch (error) {
      console.error('Error updating patient health task:', error);
      throw error;
    }
  };

  const deletePatientHealthTask = async (id: string) => {
    try {
      await db.deletePatientHealthTask(id);
      setPatientHealthTasks(prev => prev.filter(t => t.id !== id));
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