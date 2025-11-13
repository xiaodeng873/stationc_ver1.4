import React, { useState, useMemo } from 'react';
import { usePatients } from '../context/PatientContext';
import TaskModal from '../components/TaskModal';
import { Home, Users, Calendar, Heart, CheckSquare, AlertTriangle, Clock, TrendingUp, TrendingDown, Activity, Droplets, Scale, FileText, Stethoscope, Shield, CalendarCheck, Utensils, BookOpen, Guitar as Hospital, Pill, Building2, X, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isTaskOverdue, isTaskPendingToday, isTaskDueSoon, getTaskStatus, isDocumentTask, isMonitoringTask, isNursingTask, isRestraintAssessmentOverdue, isRestraintAssessmentDueSoon, isHealthAssessmentOverdue, isHealthAssessmentDueSoon, calculateNextDueDate } from '../utils/taskScheduler';
import { getPatientsWithOverdueWorkflow } from '../utils/workflowStatusHelper';
import HealthRecordModal from '../components/HealthRecordModal';
import MealGuidanceModal from '../components/MealGuidanceModal';
import FollowUpModal from '../components/FollowUpModal';
import DocumentTaskModal from '../components/DocumentTaskModal';
import RestraintAssessmentModal from '../components/RestraintAssessmentModal';
import HealthAssessmentModal from '../components/HealthAssessmentModal';

// 定義任務和病人的接口
interface Patient {
  院友id: string;
  中文姓名: string;
  床號: string;
  院友相片?: string;
  在住狀態: string;
  中文姓氏?: string;
  中文名字?: string;
}

interface HealthTask {
  id: string;
  patient_id: string;
  health_record_type: string;
  notes?: string;
  next_due_at: string;
  last_completed_at?: string;
  is_recurring: boolean;
  frequency_unit?: string;
  frequency_value?: number;
  end_date?: string;
  end_time?: string;
}

interface FollowUpAppointment {
  覆診id: string;
  院友id: string;
  覆診日期: string;
  覆診地點: string;
  覆診專科: string;
  狀態: string;
}

interface HealthRecord {
  記錄id: string;
  院友id: string;
  記錄類型: string;
  記錄日期: string;
  記錄時間: string;
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  血糖值?: number;
  體重?: number;
}

const Dashboard: React.FC = () => {
  const { patients, schedules, prescriptions, followUpAppointments, patientHealthTasks, healthRecords, patientRestraintAssessments, healthAssessments, mealGuidances, prescriptionWorkflowRecords, loading, updatePatientHealthTask, refreshData } = usePatients();
  const [showHealthRecordModal, setShowHealthRecordModal] = useState(false);
  const [selectedHealthRecordInitialData, setSelectedHealthRecordInitialData] = useState<any>({});
  const [showDocumentTaskModal, setShowDocumentTaskModal] = useState(false);
  const [selectedDocumentTask, setSelectedDocumentTask] = useState<{ task: HealthTask; patient: Patient } | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpAppointment | null>(null);
  const [showRestraintAssessmentModal, setShowRestraintAssessmentModal] = useState(false);
  const [selectedRestraintAssessment, setSelectedRestraintAssessment] = useState<any | null>(null);
  const [showHealthAssessmentModal, setShowHealthAssessmentModal] = useState(false);
  const [selectedHealthAssessment, setSelectedHealthAssessment] = useState<any | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<'年度體檢' | '生命表徵' | null>(null);
  const [selectedPatientForTask, setSelectedPatientForTask] = useState<any>(null);
  const [showMealGuidanceModal, setShowMealGuidanceModal] = useState(false);
  const [selectedPatientForMeal, setSelectedPatientForMeal] = useState<any>(null);
  const [prefilledTaskData, setPrefilledTaskData] = useState<any>(null);
  const [prefilledMealData, setPrefilledMealData] = useState<any>(null);
  const [showDailyTaskModal, setShowDailyTaskModal] = useState(false);
  const [selectedOverdueDate, setSelectedOverdueDate] = useState<string>('');
  const [isGeneratingTemperature, setIsGeneratingTemperature] = useState(false);

  // 使用 useMemo 來確保任務去重邏輯只執行一次，避免重複處理
  const uniquePatientHealthTasks = useMemo(() => {
    console.log('Dashboard: 開始處理任務去重，原始任務數量:', patientHealthTasks.length);

    // 創建一個 Map 來追蹤已見過的任務
    const seen = new Map<string, boolean>();
    const uniqueTasks: typeof patientHealthTasks = [];

    patientHealthTasks.forEach(task => {
      // 使用任務的 ID 作為唯一識別符
      if (!seen.has(task.id)) {
        seen.set(task.id, true);
        uniqueTasks.push(task);
      } else {
        console.log('Dashboard: 發現重複任務，已跳過:', task.id, task.health_record_type, task.patient_id);
      }
    });

    console.log('Dashboard: 任務去重完成，唯一任務數量:', uniqueTasks.length);
    return uniqueTasks;
  }, [patientHealthTasks]);

  // 香港時區輔助函數
  const getStartOfDayHK = (date?: Date): Date => {
    const targetDate = date || new Date();
    const hkTime = new Date(targetDate.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}));
    hkTime.setHours(0, 0, 0, 0);
    return hkTime;
  };

  const getEndOfDayHK = (date?: Date): Date => {
    const targetDate = date || new Date();
    const hkTime = new Date(targetDate.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}));
    hkTime.setHours(23, 59, 59, 999);
    return hkTime;
  };

  const handleTaskClick = (task: HealthTask) => {
    console.log('=== Dashboard handleTaskClick 開始 ===');
    console.log('點擊的任務:', task);
    
    const patient = patients.find(p => p.院友id === task.patient_id);
    console.log('找到的院友:', patient);
    
    const initialDataForModal = {
      patient: patient ? {
        院友id: patient.院友id,
        中文姓名: patient.中文姓名,
        床號: patient.床號
      } : undefined,
      task: {
        id: task.id,
        health_record_type: task.health_record_type,
        next_due_at: task.next_due_at
      }
    };
    
    console.log('準備傳遞給 HealthRecordModal 的數據:', initialDataForModal);
    
    setSelectedHealthRecordInitialData(initialDataForModal);
    setShowHealthRecordModal(true);
    console.log('設置 showHealthRecordModal 為 true');
    console.log('=== Dashboard handleTaskClick 結束 ===');
  };

  // 計算欠缺任務的院友
  const missingTasks = useMemo(() => {
    const activePatients = patients.filter(p => p.在住狀態 === '在住');
    const result: { patient: any; missingTaskTypes: string[] }[] = [];
    
    activePatients.forEach(patient => {
      const patientTasks = patientHealthTasks.filter(task => task.patient_id === patient.院友id);
      const annualCheckupTasks = patientTasks.filter(task => task.health_record_type === '年度體檢');
      const vitalSignTasks = patientTasks.filter(task => task.health_record_type === '生命表徵');
      const missing: string[] = [];
      
      if (annualCheckupTasks.length === 0) missing.push('年度體檢');
      if (vitalSignTasks.length === 0) missing.push('生命表徵');
      
      if (missing.length > 0) {
        result.push({ patient, missingTaskTypes: missing });
      }
    });
    
    return result;
  }, [patients, patientHealthTasks]);

  // 計算欠缺餐膳指引的院友
  const missingMealGuidance = useMemo(() => {
    const activePatients = patients.filter(p => p.在住狀態 === '在住');
    return activePatients.filter(patient => !mealGuidances.some(guidance => guidance.patient_id === patient.院友id));
  }, [patients, mealGuidances]);

  // 處理文件或護理任務點擊
  const handleDocumentTaskClick = (task: HealthTask) => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    if (patient && (isDocumentTask(task.health_record_type) || isNursingTask(task.health_record_type))) {
      setSelectedDocumentTask({ task, patient });
      setShowDocumentTaskModal(true);
    }
  };

  // 處理約束物品評估點擊
  const handleRestraintAssessmentClick = (assessment: any) => {
    setSelectedRestraintAssessment(assessment);
    setShowRestraintAssessmentModal(true);
  };

  // 處理健康評估點擊
  const handleHealthAssessmentClick = (assessment: any) => {
    setSelectedHealthAssessment(assessment);
    setShowHealthAssessmentModal(true);
  };

  // 處理覆診點擊
  const handleFollowUpClick = (appointment: FollowUpAppointment) => {
    setSelectedFollowUp(appointment);
    setShowFollowUpModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 最近排程：今天及未來最多5個排程
  const recentSchedules = schedules
    .filter(s => new Date(s.到診日期) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.到診日期).getTime() - new Date(b.到診日期).getTime())
    .slice(0, 5);

  // 近期監測：最近30個健康記錄
  const recentHealthRecords = healthRecords
    .sort((a, b) => new Date(`${b.記錄日期} ${b.記錄時間}`).getTime() - new Date(`${a.記錄日期} ${a.記錄時間}`).getTime())
    .slice(0, 30);

  const recentPrescriptions = prescriptions
    .sort((a, b) => new Date(b.處方日期).getTime() - new Date(a.處方日期).getTime())
    .slice(0, 5);

  const upcomingFollowUps = followUpAppointments
    .filter(a => {
      if (new Date(a.覆診日期) < new Date()) return false;
      const patient = patients.find(p => p.院友id === a.院友id);
      return patient && patient.在住狀態 === '在住';
    })
    .sort((a, b) => new Date(a.覆診日期).getTime() - new Date(b.覆診日期).getTime())
    .slice(0, 10);

  // 計算有逾期執核派藥流程的院友
  const patientsWithOverdueWorkflow = useMemo(() => {
    return getPatientsWithOverdueWorkflow(prescriptionWorkflowRecords, patients);
  }, [prescriptionWorkflowRecords, patients]);

  // 任務統計
  const monitoringTasks = patientHealthTasks.filter(task => isMonitoringTask(task.health_record_type));
  const documentTasks = patientHealthTasks.filter(task => isDocumentTask(task.health_record_type));

  // 監測任務：僅顯示逾期和未完成，且院友必須在住
  const overdueMonitoringTasks = monitoringTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    return patient && patient.在住狀態 === '在住' && isTaskOverdue(task);
  });
  const pendingMonitoringTasks = monitoringTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    return patient && patient.在住狀態 === '在住' && isTaskPendingToday(task);
  });
  const urgentMonitoringTasks = [...overdueMonitoringTasks, ...pendingMonitoringTasks].sort((a, b) => {
    const timeA = new Date(a.next_due_at).getTime();
    const timeB = new Date(b.next_due_at).getTime();
    if (timeA === timeB) {
      const priority = { '注射前': 1, '服藥前': 2, '社康': 3, '特別關顧': 4, '定期': 5 };
      const priorityA = a.notes ? priority[a.notes] || 5 : 5;
      const priorityB = b.notes ? priority[b.notes] || 5 : 5;
      return priorityA - priorityB;
    }
    return timeA - timeB;
  }).slice(0, 100);

  // 按任務時間分類監測任務
  const categorizeTaskByTime = (task: HealthTask) => {
    const hour = new Date(task.next_due_at).getHours();
    if (hour >= 7 && hour < 10) return '早餐';
    if (hour >= 10 && hour < 13) return '午餐';
    if (hour >= 13 && hour < 18) return '晚餐';
    if (hour >= 18 && hour <= 20) return '夜宵';
    return '其他';
  };

  const breakfastTasks = urgentMonitoringTasks.filter(task => categorizeTaskByTime(task) === '早餐');
  const lunchTasks = urgentMonitoringTasks.filter(task => categorizeTaskByTime(task) === '午餐');
  const dinnerTasks = urgentMonitoringTasks.filter(task => categorizeTaskByTime(task) === '晚餐');
  const snackTasks = urgentMonitoringTasks.filter(task => categorizeTaskByTime(task) === '夜宵');

  // 文件任務：包含逾期、未完成和即將到期，且院友必須在住
  const overdueDocumentTasks = documentTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    return patient && patient.在住狀態 === '在住' && isTaskOverdue(task);
  });
  const pendingDocumentTasks = documentTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    return patient && patient.在住狀態 === '在住' && isTaskPendingToday(task);
  });
  const dueSoonDocumentTasks = documentTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    return patient && patient.在住狀態 === '在住' && isTaskDueSoon(task);
  });
  const urgentDocumentTasks = [...overdueDocumentTasks, ...pendingDocumentTasks, ...dueSoonDocumentTasks].slice(0, 10);

  // 護理任務：包含逾期、未完成和即將到期（1天前），且院友必須在住
  const nursingTasks = patientHealthTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    return patient && patient.在住狀態 === '在住' && isNursingTask(task.health_record_type);
  });
  const overdueNursingTasks = nursingTasks.filter(task => isTaskOverdue(task));
  const pendingNursingTasks = nursingTasks.filter(task => isTaskPendingToday(task));
  
  const dueSoonNursingTasks = nursingTasks.filter(task => {
    const now = new Date();
    const dueDate = new Date(task.next_due_at);
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    if (dueDateOnly.getTime() === tomorrowDate.getTime()) {
      if (!task.last_completed_at) return true;
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  });
  
  const urgentNursingTasks = [...overdueNursingTasks, ...pendingNursingTasks, ...dueSoonNursingTasks].slice(0, 10);

  // 約束物品評估：包含逾期和即將到期（2週內），且院友必須在住
  const overdueRestraintAssessments = patientRestraintAssessments.filter(assessment => {
    const patient = patients.find(p => p.院友id === assessment.patient_id);
    return patient && patient.在住狀態 === '在住' && isRestraintAssessmentOverdue(assessment);
  });
  const dueSoonRestraintAssessments = patientRestraintAssessments.filter(assessment => {
    const patient = patients.find(p => p.院友id === assessment.patient_id);
    return patient && patient.在住狀態 === '在住' && isRestraintAssessmentDueSoon(assessment);
  });
  const urgentRestraintAssessments = [...overdueRestraintAssessments, ...dueSoonRestraintAssessments];

  // 健康評估：包含逾期和即將到期（1個月內），且院友必須在住
  const overdueHealthAssessments = healthAssessments.filter(assessment => {
    const patient = patients.find(p => p.院友id === assessment.patient_id);
    return patient && patient.在住狀態 === '在住' && isHealthAssessmentOverdue(assessment);
  });
  const dueSoonHealthAssessments = healthAssessments.filter(assessment => {
    const patient = patients.find(p => p.院友id === assessment.patient_id);
    return patient && patient.在住狀態 === '在住' && isHealthAssessmentDueSoon(assessment);
  });
  const urgentHealthAssessments = [...overdueHealthAssessments, ...dueSoonHealthAssessments];

  // 合併文件任務、約束物品評估和健康評估
  const combinedUrgentTasks = [
    ...urgentDocumentTasks.map(task => ({ type: 'document', data: task })),
    ...urgentNursingTasks.map(task => ({ type: 'nursing', data: task })),
    ...urgentRestraintAssessments.map(assessment => ({ type: 'restraint', data: assessment })),
    ...urgentHealthAssessments.map(assessment => ({ type: 'health-assessment', data: assessment }))
  ].sort((a, b) => {
    const dateA = (a.type === 'document' || a.type === 'nursing') ? new Date(a.data.next_due_at) : new Date(a.data.next_due_date || '');
    const dateB = (b.type === 'document' || b.type === 'nursing') ? new Date(b.data.next_due_at) : new Date(b.data.next_due_date || '');
    return dateA.getTime() - dateB.getTime();
  });

  // 驗證院友任務配置
  const validatePatientTasks = () => {
    const activePatients = patients.filter(p => p.在住狀態 === '在住');
    const missingTasksLocal: { patient: any; missingTaskTypes: string[] }[] = [];
    
    activePatients.forEach(patient => {
      const patientTasks = patientHealthTasks.filter(task => task.patient_id === patient.院友id);
      const annualCheckupTasks = patientTasks.filter(task => task.health_record_type === '年度體檢');
      const vitalSignTasks = patientTasks.filter(task => task.health_record_type === '生命表徵');
      const missing: string[] = [];
      
      if (annualCheckupTasks.length === 0) missing.push('年度體檢');
      if (vitalSignTasks.length === 0) missing.push('生命表徵');
      
      if (missing.length > 0) {
        missingTasksLocal.push({ patient, missingTaskTypes: missing });
      }
    });
    
    return missingTasksLocal;
  };

  // 使用 Set 來追蹤已經被分配到其他時間段的任務，避免重複顯示
  const getTasksInTimeRange = (startHour: number, endHour: number) => {
    const usedTaskIds = new Set<string>();
    
    return uniquePatientHealthTasks.filter(task => {
      // 如果任務已經被其他時間段使用，跳過
      if (usedTaskIds.has(task.id)) {
        return false;
      }
      
      const taskHour = new Date(task.next_due_at).getHours();
      const isInTimeRange = taskHour >= startHour && taskHour < endHour;
      
      // 如果任務在此時間段內，標記為已使用
      if (isInTimeRange) {
        usedTaskIds.add(task.id);
      }
      
      return isInTimeRange;
    });
  };

  const handleCreateMissingTask = (patient: any, taskType: '年度體檢' | '生命表徵') => {
    const defaultFrequency = taskType === '年度體檢' 
      ? { unit: 'yearly', value: 1 }
      : { unit: 'daily', value: 1 };
    
    const prefilledData = {
      patient_id: patient.院友id,
      health_record_type: taskType,
      frequency_unit: defaultFrequency.unit,
      frequency_value: defaultFrequency.value,
      specific_times: taskType === '生命表徵' ? '08:00' : '',
      notes: taskType === '生命表徵' ? '定期' : '',
      is_recurring: taskType === '生命表徵' // 假設生命表徵任務為循環任務
    };
    
    setPrefilledTaskData(prefilledData);
    setShowTaskModal(true);
  };

  const handleAddMealGuidance = (patient: any) => {
    const prefilledData = {
      patient_id: patient.院友id,
      meal_combination: '正飯+正餸'
    };
    
    setPrefilledMealData(prefilledData);
    setShowMealGuidanceModal(true);
  };

  const handleTaskCompleted = async (taskId: string, recordDateTime: Date) => {
    console.log('=== 任務完成處理開始 ===');
    console.log('記錄時間:', recordDateTime);
    
    try {
      const task = patientHealthTasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('未找到對應任務');
      }

      console.log('找到的任務:', task);
      
      let nextDueAt: string | null = null;
      
      if (task.is_recurring) {
        console.log('這是循環任務，計算下次到期時間');
        const calculatedNextDueAt = calculateNextDueDate(task, recordDateTime);
        nextDueAt = calculatedNextDueAt.toISOString();
        console.log('計算出的下次到期時間:', nextDueAt);
      } else {
        console.log('這是非循環任務，檢查是否已完成');
        if (task.end_date && task.end_time) {
          const endDateTime = new Date(`${task.end_date}T${task.end_time}:00`);
          console.log('結束時間:', endDateTime);
          console.log('記錄時間:', recordDateTime);
          
          if (recordDateTime >= endDateTime) {
            console.log('非循環任務已完成，設為 null');
            nextDueAt = null;
          } else {
            console.log('非循環任務尚未完成，計算下次到期時間');
            const calculatedNextDueAt = calculateNextDueDate(task, recordDateTime);
            nextDueAt = calculatedNextDueAt.toISOString();
            console.log('計算出的下次到期時間:', nextDueAt);
          }
        } else {
          console.log('非循環任務無結束時間，標記為完成');
          nextDueAt = null;
        }
      }
      
      const updatedTask = {
        ...task,
        last_completed_at: recordDateTime.toISOString(),
        next_due_at: nextDueAt
      };
      
      console.log('最終任務資料:', updatedTask);
      
      // 更新資料庫
      await updatePatientHealthTask(updatedTask);
      console.log('資料庫更新成功');
      
      // 重新載入資料以更新 UI
      await refreshData();
      console.log('資料重新載入完成');
      
    } catch (error) {
      console.error('任務完成處理失敗:', error);
      alert(`任務完成處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      // 關閉模態框
      setShowHealthRecordModal(false);
      setSelectedHealthRecordInitialData({});
      console.log('關閉 HealthRecordModal');
    }
  };

  const handleDocumentTaskCompleted = async (taskId: string, completionDate: string, nextDueDate: string, tubeType?: string, tubeSize?: string) => {
    try {
      const task = patientHealthTasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('未找到對應任務');
      }
      
      const updatedTask = {
        ...task,
        last_completed_at: completionDate,
        next_due_at: new Date(nextDueDate).toISOString(),
        tube_type: tubeType || task.tube_type,
        tube_size: tubeSize || task.tube_size
      };

      await updatePatientHealthTask(updatedTask);
      await refreshData();
    } catch (error) {
      console.error('文件任務完成處理失敗:', error);
      alert(`文件任務完成處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setShowDocumentTaskModal(false);
      setSelectedDocumentTask(null);
    }
  };

  const getNotesBadgeClass = (notes: string) => {
    switch (notes) {
      case '服藥前': return 'bg-blue-500 text-white';
      case '注射前': return 'bg-red-500 text-white';
      case '定期': return 'bg-green-500 text-white';
      case '特別關顧': return 'bg-orange-500 text-white';
      case '社康': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      case '約束物品同意書': return <FileText className="h-4 w-4" />;
      case '年度體檢': return <Stethoscope className="h-4 w-4" />;
      case '尿導管更換': return <FileText className="h-4 w-4" />;
      case '鼻胃飼管更換': return <FileText className="h-4 w-4" />;
      case '傷口換症': return <FileText className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getHealthRecordIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4 text-blue-600" />;
      case '血糖控制': return <Droplets className="h-4 w-4 text-red-600" />;
      case '體重控制': return <Scale className="h-4 w-4 text-green-600" />;
      default: return <CheckSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTaskTimeBackgroundClass = (nextDueAt: string) => {
    const hour = new Date(nextDueAt).getHours();
    if (hour >= 7 && hour < 10) return 'bg-red-50 hover:bg-red-100';
    if (hour >= 10 && hour < 13) return 'bg-yellow-50 hover:bg-yellow-100';
    if (hour >= 13 && hour < 18) return 'bg-green-50 hover:bg-green-100';
    if (hour >= 18 && hour <= 20) return 'bg-purple-50 hover:bg-purple-100';
    return 'bg-gray-50 hover:bg-gray-100';
  };

  const stats = []; // 根據需求填充 stats 資料

  const getHealthRecordData = (record: HealthRecord) => {
    switch (record.記錄類型) {
      case '生命表徵':
        const vitals = [];
        if (record.血壓收縮壓 && record.血壓舒張壓) vitals.push(`血壓 ${record.血壓收縮壓}/${record.血壓舒張壓}`);
        if (record.脈搏) vitals.push(`脈搏 ${record.脈搏}`);
        if (record.體溫) vitals.push(`體溫 ${record.體溫}°C`);
        if (record.血含氧量) vitals.push(`血氧 ${record.血含氧量}%`);
        return vitals.join(', ') || '無數據';
      case '血糖控制':
        return record.血糖值 ? `${record.血糖值} mmol/L` : '無數據';
      case '體重控制':
        return record.體重 ? `${record.體重} kg` : '無數據';
      default:
        return '無數據';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '尚未安排': return 'bg-red-100 text-red-800';
      case '已安排': return 'bg-blue-100 text-blue-800';
      case '已完成': return 'bg-green-100 text-green-800';
      case '改期': return 'bg-orange-100 text-orange-800';
      case '取消': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 lg:space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          最後更新: {new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Hong_Kong' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 lg:gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card p-6 hover-scale stats-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 stat-title">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 stat-value">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1 stat-change">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} text-white stat-icon-wrapper`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-3">
        {/* 任務配置注意事項 */}
        {(missingTasks.length > 0 || missingMealGuidance.length > 0) && (
          <div className="lg:col-span-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-red-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                任務配置注意事項
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 欠缺任務卡片 */}
              {missingTasks.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-medium text-red-900 flex items-center">
                      <X className="h-4 w-4 mr-2" />
                      欠缺必要任務 ({missingTasks.length} 位院友)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {missingTasks.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-red-800">
                            {item.patient.床號} {item.patient.中文姓氏}{item.patient.中文名字}
                          </span>
                          <span className="text-red-600">
                            欠缺: {item.missingTaskTypes.join(', ')}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          {item.missingTaskTypes.map(taskType => (
                            <button
                              key={taskType}
                              onClick={() => handleCreateMissingTask(item.patient, taskType as '年度體檢' | '生命表徵')}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                              title={`新增${taskType}任務`}
                            >
                              +{taskType}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {missingTasks.length > 5 && (
                      <div className="text-xs text-red-600 text-center">
                        還有 {missingTasks.length - 5} 位院友...
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-700">
                      每位在住院友都應該有年度體檢和生命表徵任務
                    </p>
                  </div>
                </div>
              )}

              {/* 欠缺餐膳指引卡片 */}
              {missingMealGuidance.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-medium text-orange-900 flex items-center">
                      <Utensils className="h-4 w-4 mr-2" />
                      欠缺餐膳指引 ({missingMealGuidance.length} 位院友)
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {missingMealGuidance.slice(0, 5).map((patient, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-orange-800">
                            {patient.床號} {patient.中文姓氏}{patient.中文名字}
                          </span>
                          <span className="text-orange-600">
                            尚未設定餐膳指引
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddMealGuidance(patient)}
                          className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700"
                          title="新增餐膳指引"
                        >
                          +餐膳指引
                        </button>
                      </div>
                    ))}
                    {missingMealGuidance.length > 5 && (
                      <div className="text-xs text-orange-600 text-center">
                        還有 {missingMealGuidance.length - 5} 位院友...
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <p className="text-xs text-orange-700">
                      每位在住院友都應該有餐膳指引
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 待變更處方提醒 */}
        {(() => {
          const patientsWithPendingPrescriptions = patients.filter(patient => {
            if (patient.在住狀態 !== '在住') return false;
            return prescriptions.some(prescription =>
              prescription.patient_id === patient.院友id &&
              prescription.status === 'pending_change'
            );
          });

          return patientsWithPendingPrescriptions.length > 0 && (
            <div className="lg:col-span-5 mb-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <Pill className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">待變更處方提醒</h2>
                      <p className="text-sm text-gray-600">
                        {patientsWithPendingPrescriptions.length} 位院友有待變更的處方需要處理
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {patientsWithPendingPrescriptions.slice(0, 5).map(patient => {
                    const pendingPrescriptions = prescriptions.filter(p =>
                      p.patient_id === patient.院友id && p.status === 'pending_change'
                    );

                    return (
                      <div key={patient.院友id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                            {patient.院友相片 ? (
                              <img
                                src={patient.院友相片}
                                alt={patient.中文姓名}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {patient.床號} - {patient.中文姓氏}{patient.中文名字}
                            </div>
                            <div className="text-sm text-yellow-700">
                              {pendingPrescriptions.length} 個待變更處方：
                              {pendingPrescriptions.slice(0, 2).map(p => p.medication_name).join('、')}
                              {pendingPrescriptions.length > 2 && '...'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {pendingPrescriptions.length} 個待變更
                          </span>
                          <Link
                            to="/prescriptions"
                            className="text-yellow-600 hover:text-yellow-700 p-1 rounded"
                            title="前往處理"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {patientsWithPendingPrescriptions.length > 5 && (
                    <div className="text-center pt-2">
                      <Link
                        to="/prescriptions"
                        className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                      >
                        查看全部 {patientsWithPendingPrescriptions.length} 位院友的待變更處方
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 執核派藥逾期提醒 */}
        {patientsWithOverdueWorkflow.length > 0 && (
          <div className="lg:col-span-5 mb-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">執核派藥逾期提醒</h2>
                    <p className="text-sm text-gray-600">
                      {patientsWithOverdueWorkflow.length} 位院友有逾期未完成的執核派藥流程
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {patientsWithOverdueWorkflow.slice(0, 5).map(({ patient, overdueCount, overdueRecords }) => {
                  // 計算最早逾期的時間
                  const earliestOverdue = overdueRecords.reduce((earliest, record) => {
                    const recordTime = new Date(`${record.scheduled_date}T${record.scheduled_time}`);
                    return recordTime < earliest ? recordTime : earliest;
                  }, new Date(`${overdueRecords[0].scheduled_date}T${overdueRecords[0].scheduled_time}`));

                  return (
                    <div key={patient.院友id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                          {patient.院友相片 ? (
                            <img
                              src={patient.院友相片}
                              alt={patient.中文姓名}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {patient.床號} - {patient.中文姓氏}{patient.中文名字}
                          </div>
                          <div className="text-sm text-red-700">
                            {overdueCount} 個逾期流程
                            {overdueRecords.length > 0 && (
                              <span className="text-red-600 ml-2">
                                • 最早逾期: {earliestOverdue.toLocaleDateString('zh-TW')} {earliestOverdue.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {overdueCount} 個逾期
                        </span>
                        <Link
                          to="/medication-workflow"
                          className="text-red-600 hover:text-red-700 p-1 rounded"
                          title="前往處理"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {patientsWithOverdueWorkflow.length > 5 && (
                  <div className="text-center pt-2">
                    <Link
                      to="/medication-workflow"
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      查看全部 {patientsWithOverdueWorkflow.length} 位院友的逾期流程
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 每日任務補填模態框 */}
        {showDailyTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <Activity className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">補填體溫生成記錄</h3>
                </div>
                <button
                  onClick={() => setShowDailyTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  以下日期尚未完成體溫生成任務，請選擇要補填的日期：
                </p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* overdueTemperatureDates.map(date => (
                    <div key={date} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-red-900">
                          {new Date(date).toLocaleDateString('zh-TW', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </span>
                        <p className="text-xs text-red-600">逾期未完成</p>
                      </div>
                      <button
                        onClick={() => handleBackfillTemperature(date)}
                        disabled={isGeneratingTemperature}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {isGeneratingTemperature ? '處理中...' : '標記完成'}
                      </button>
                    </div>
                  )) */}
                </div>
                
                {/* {overdueTemperatureDates.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-gray-600">沒有逾期的體溫生成任務</p>
                  </div>
                )} */}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>注意：</strong>補填記錄將標記該日期的體溫生成任務為已完成，
                    但不會實際生成體溫記錄。請確保該日期的體溫記錄已手動補充。
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowDailyTaskModal(false)}
                  className="btn-secondary flex-1"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 監測任務 */}
        <div className="card p-6 lg:p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 section-title">監測任務</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </Link>
          </div>
          <div className="space-y-6 lg:space-y-3">
            {breakfastTasks.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2 time-slot-title">早餐 (07:00 - 09:59)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2">
                  {breakfastTasks.map((task) => {
                    const patient = patients.find(p => p.院友id === task.patient_id);
                    const status = getTaskStatus(task);
                    return (
                      <div 
                        key={task.id} 
                        className={`relative flex items-center space-x-3 p-3 ${getTaskTimeBackgroundClass(task.next_due_at)} rounded-lg cursor-pointer transition-colors dashboard-task-card`}
                        onClick={() => handleTaskClick(task)}
                      >
                        {task.notes && isMonitoringTask(task.health_record_type) && (
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium task-note-badge ${getNotesBadgeClass(task.notes)}`}>
                            {task.notes}
                          </div>
                        )}
                        <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                          {patient?.院友相片 ? (
                            <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                            <span className="text-xs text-gray-500">({patient?.床號})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getTaskTypeIcon(task.health_record_type)}
                            <p className="text-sm text-gray-600">{task.health_record_type}</p>
                          </div>
                          {task.notes && (
                            <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {isDocumentTask(task.health_record_type)
                              ? new Date(task.next_due_at).toLocaleDateString('zh-TW') 
                              : new Date(task.next_due_at).toLocaleDateString('zh-TW') + ' ' + new Date(task.next_due_at).toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <span className={`status-badge flex-shrink-0 ${
                          status === 'overdue' ? 'bg-red-100 text-red-800' : 
                          status === 'pending' ? 'bg-green-100 text-green-800' :
                          status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {status === 'overdue' ? '逾期' : 
                           status === 'pending' ? '未完成' :
                           status === 'due_soon' ? '即將到期' :
                           '排程中'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {lunchTasks.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2 time-slot-title">午餐 (10:00 - 12:59)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {lunchTasks.map((task) => {
                    const patient = patients.find(p => p.院友id === task.patient_id);
                    const status = getTaskStatus(task);
                    return (
                      <div 
                        key={task.id} 
                        className={`relative flex items-center space-x-3 p-3 ${getTaskTimeBackgroundClass(task.next_due_at)} rounded-lg cursor-pointer transition-colors dashboard-task-card`}
                        onClick={() => handleTaskClick(task)}
                      >
                        {task.notes && isMonitoringTask(task.health_record_type) && (
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium task-note-badge ${getNotesBadgeClass(task.notes)}`}>
                            {task.notes}
                          </div>
                        )}
                        <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                          {patient?.院友相片 ? (
                            <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                            <span className="text-xs text-gray-500">({patient?.床號})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getTaskTypeIcon(task.health_record_type)}
                            <p className="text-sm text-gray-600">{task.health_record_type}</p>
                          </div>
                          {task.notes && (
                            <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {isDocumentTask(task.health_record_type)
                              ? new Date(task.next_due_at).toLocaleDateString('zh-TW') 
                              : new Date(task.next_due_at).toLocaleDateString('zh-TW') + ' ' + new Date(task.next_due_at).toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <span className={`status-badge flex-shrink-0 ${
                          status === 'overdue' ? 'bg-red-100 text-red-800' : 
                          status === 'pending' ? 'bg-green-100 text-green-800' :
                          status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {status === 'overdue' ? '逾期' : 
                           status === 'pending' ? '未完成' :
                           status === 'due_soon' ? '即將到期' :
                           '排程中'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {dinnerTasks.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2 time-slot-title">晚餐 (13:00 - 17:59)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {dinnerTasks.map((task) => {
                    const patient = patients.find(p => p.院友id === task.patient_id);
                    const status = getTaskStatus(task);
                    return (
                      <div 
                        key={task.id} 
                        className={`relative flex items-center space-x-3 p-3 ${getTaskTimeBackgroundClass(task.next_due_at)} rounded-lg cursor-pointer transition-colors dashboard-task-card`}
                        onClick={() => handleTaskClick(task)}
                      >
                        {task.notes && isMonitoringTask(task.health_record_type) && (
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium task-note-badge ${getNotesBadgeClass(task.notes)}`}>
                            {task.notes}
                          </div>
                        )}
                        <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                          {patient?.院友相片 ? (
                            <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                            <span className="text-xs text-gray-500">({patient?.床號})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getTaskTypeIcon(task.health_record_type)}
                            <p className="text-sm text-gray-600">{task.health_record_type}</p>
                          </div>
                          {task.notes && (
                            <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {isDocumentTask(task.health_record_type)
                              ? new Date(task.next_due_at).toLocaleDateString('zh-TW') 
                              : new Date(task.next_due_at).toLocaleDateString('zh-TW') + ' ' + new Date(task.next_due_at).toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <span className={`status-badge flex-shrink-0 ${
                          status === 'overdue' ? 'bg-red-100 text-red-800' : 
                          status === 'pending' ? 'bg-green-100 text-green-800' :
                          status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {status === 'overdue' ? '逾期' : 
                           status === 'pending' ? '未完成' :
                           status === 'due_soon' ? '即將到期' :
                           '排程中'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {snackTasks.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2 time-slot-title">夜宵 (18:00 - 20:00)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {snackTasks.map((task) => {
                    const patient = patients.find(p => p.院友id === task.patient_id);
                    const status = getTaskStatus(task);
                    return (
                      <div 
                        key={task.id} 
                        className={`relative flex items-center space-x-3 p-3 ${getTaskTimeBackgroundClass(task.next_due_at)} rounded-lg cursor-pointer transition-colors dashboard-task-card`}
                        onClick={() => handleTaskClick(task)}
                      >
                        {task.notes && isMonitoringTask(task.health_record_type) && (
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium task-note-badge ${getNotesBadgeClass(task.notes)}`}>
                            {task.notes}
                          </div>
                        )}
                        <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                          {patient?.院友相片 ? (
                            <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                            <span className="text-xs text-gray-500">({patient?.床號})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getTaskTypeIcon(task.health_record_type)}
                            <p className="text-sm text-gray-600">{task.health_record_type}</p>
                          </div>
                          {task.notes && (
                            <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {isDocumentTask(task.health_record_type)
                              ? new Date(task.next_due_at).toLocaleDateString('zh-TW') 
                              : new Date(task.next_due_at).toLocaleDateString('zh-TW') + ' ' + new Date(task.next_due_at).toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        <span className={`status-badge flex-shrink-0 ${
                          status === 'overdue' ? 'bg-red-100 text-red-800' : 
                          status === 'pending' ? 'bg-green-100 text-green-800' :
                          status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {status === 'overdue' ? '逾期' : 
                           status === 'pending' ? '未完成' :
                           status === 'due_soon' ? '即將到期' :
                           '排程中'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {breakfastTasks.length === 0 && lunchTasks.length === 0 && dinnerTasks.length === 0 && snackTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無待處理任務</p>
              </div>
            )}
          </div>
        </div>

        {/* 文件任務 */}
        <div className="card p-6 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 section-title">待辦事項</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {combinedUrgentTasks.length > 0 ? (
              combinedUrgentTasks.map((item, index) => {
                if (item.type === 'document' || item.type === 'nursing') {
                  const task = item.data;
                  const patient = patients.find(p => p.院友id === task.patient_id);
                  const status = getTaskStatus(task);
                  return (
                    <div 
                      key={`${item.type}-${task.id}`} 
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        item.type === 'nursing' ? 'bg-teal-50 hover:bg-teal-100 border border-teal-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        // 檢查任務是否逾期並顯示警告
                        if (isTaskOverdue(task)) {
                          const confirmMessage = `⚠️ 注意：此任務已經逾期！\n\n` +
                            `任務類型：${task.health_record_type}\n` +
                            `原定到期時間：${new Date(task.next_due_at).toLocaleString('zh-TW')}\n` +
                            `目前時間：${new Date().toLocaleString('zh-TW')}\n\n` +
                            `請注意：\n` +
                            `• 請輸入實際完成的日期和時間\n` +
                            `• 不要使用原定的到期時間\n` +
                            `• 確保資料準確無誤\n\n` +
                            `確定要繼續完成此任務嗎？`;
                          
                          if (!confirm(confirmMessage)) {
                            return;
                          }
                        }
                        
                        handleDocumentTaskClick(task);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                        item.type === 'nursing' ? 'bg-teal-100' : 'bg-blue-100'
                      }`}>
                        {patient?.院友相片 ? (
                          <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                        ) : (
                          <User className={`h-5 w-5 ${item.type === 'nursing' ? 'text-teal-600' : 'text-blue-600'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                          <span className="text-xs text-gray-500">({patient?.床號})</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {getTaskTypeIcon(task.health_record_type)}
                          <p className="text-sm text-gray-600">{task.health_record_type}</p>
                        </div>
                        {task.notes && (
                          <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          到期: {new Date(task.next_due_at).toLocaleDateString('zh-TW')}
                        </p>
                      </div>
                      <span className={`status-badge ${
                        status === 'overdue' ? 'bg-red-100 text-red-800' : 
                        status === 'pending' ? 'bg-green-100 text-green-800' :
                        status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {status === 'overdue' ? '逾期' : 
                         status === 'pending' ? '未完成' :
                         status === 'due_soon' ? '即將到期' :
                         '排程中'}
                      </span>
                    </div>
                  );
                } else {
                  const assessment = item.data;
                  const patient = patients.find(p => p.院友id === assessment.patient_id);
                  
                  if (item.type === 'restraint') {
                    const isOverdue = isRestraintAssessmentOverdue(assessment);
                    const isDueSoon = isRestraintAssessmentDueSoon(assessment);
                    return (
                      <div 
                        key={`restraint-${assessment.id}`} 
                        className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors border border-yellow-200"
                        onClick={() => handleRestraintAssessmentClick(assessment)}
                      >
                        <div className="w-10 h-10 bg-yellow-100 rounded-full overflow-hidden flex items-center justify-center">
                          {patient?.院友相片 ? (
                            <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                            <span className="text-xs text-gray-500">({patient?.床號})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Shield className="h-4 w-4 text-yellow-600" />
                            <p className="text-sm text-gray-600">約束物品評估</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            到期: {assessment.next_due_date ? new Date(assessment.next_due_date).toLocaleDateString('zh-TW') : '未設定'}
                          </p>
                        </div>
                        <span className={`status-badge ${
                          isOverdue ? 'bg-red-100 text-red-800' : 
                          isDueSoon ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isOverdue ? '逾期' : 
                           isDueSoon ? '即將到期' :
                           '排程中'}
                        </span>
                      </div>
                    );
                  } else {
                    const isOverdue = isHealthAssessmentOverdue(assessment);
                    const isDueSoon = isHealthAssessmentDueSoon(assessment);
                    return (
                      <div 
                        key={`health-assessment-${assessment.id}`} 
                        className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors border border-red-200"
                        onClick={() => handleHealthAssessmentClick(assessment)}
                      >
                        <div className="w-10 h-10 bg-red-100 rounded-full overflow-hidden flex items-center justify-center">
                          {patient?.院友相片 ? (
                            <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                            <span className="text-xs text-gray-500">({patient?.床號})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Stethoscope className="h-4 w-4 text-red-600" />
                            <p className="text-sm text-gray-600">健康評估</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            到期: {assessment.next_due_date ? new Date(assessment.next_due_date).toLocaleDateString('zh-TW') : '未設定'}
                          </p>
                        </div>
                        <span className={`status-badge ${
                          isOverdue ? 'bg-red-100 text-red-800' : 
                          isDueSoon ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {isOverdue ? '逾期' : 
                           isDueSoon ? '即將到期' :
                           '排程中'}
                        </span>
                      </div>
                    );
                  }
                }
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無待辦事項</p>
              </div>
            )}
          </div>
        </div>

        {/* 近期覆診 */}
        <div className="card p-6 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 section-title">近期覆診</h2>
            <Link to="/follow-up" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingFollowUps.length > 0 ? (
              upcomingFollowUps.map(appointment => {
                const patient = patients.find(p => p.院友id === appointment.院友id);
                return (
                  <div 
                    key={appointment.覆診id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleFollowUpClick(appointment)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                      {patient?.院友相片 ? (
                        <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{patient ? `${patient.中文姓氏}${patient.中文名字}` : ''}</p>
                        <span className="text-xs text-gray-500">({patient?.床號})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-gray-600">{appointment.覆診專科}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(appointment.覆診日期).toLocaleDateString('zh-TW')} - {appointment.覆診地點}
                      </p>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(appointment.狀態)}`}>
                      {appointment.狀態}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無近期覆診</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 任務模態框 */}
      {showTaskModal && (
        <TaskModal
          task={prefilledTaskData}
          onClose={() => {
            setShowTaskModal(false);
            setPrefilledTaskData(null);
          }}
          onUpdate={refreshData}
        />
      )}

      {/* 餐膳指引模態框 */}
      {showMealGuidanceModal && (
        <MealGuidanceModal
          guidance={prefilledMealData}
          onClose={() => {
            setShowMealGuidanceModal(false);
            setPrefilledMealData(null);
          }}
          onUpdate={refreshData}
        />
      )}
      
      {/* 監測記錄模態框 */}
      {showHealthRecordModal && (
        <HealthRecordModal
          initialData={selectedHealthRecordInitialData}
          onClose={() => {
            console.log('關閉 HealthRecordModal');
            setShowHealthRecordModal(false);
            setSelectedHealthRecordInitialData({});
          }}
          onTaskCompleted={(recordDateTime) => handleTaskCompleted(selectedHealthRecordInitialData.task.id, recordDateTime)}
        />
      )}

      {showDocumentTaskModal && selectedDocumentTask && (
        <DocumentTaskModal
          isOpen={showDocumentTaskModal}
          onClose={() => {
            setShowDocumentTaskModal(false);
            setSelectedDocumentTask(null);
          }}
          task={selectedDocumentTask.task}
          patient={selectedDocumentTask.patient}
          onTaskCompleted={handleDocumentTaskCompleted}
        />
      )}

      {showFollowUpModal && selectedFollowUp && (
        <FollowUpModal
          isOpen={showFollowUpModal}
          onClose={() => {
            setShowFollowUpModal(false);
            setSelectedFollowUp(null);
          }}
          appointment={selectedFollowUp}
          onUpdate={refreshData}
        />
      )}

      {showRestraintAssessmentModal && selectedRestraintAssessment && (
        <RestraintAssessmentModal
          isOpen={showRestraintAssessmentModal}
          onClose={() => {
            setShowRestraintAssessmentModal(false);
            setSelectedRestraintAssessment(null);
          }}
          assessment={selectedRestraintAssessment}
          onUpdate={refreshData}
        />
      )}

      {showHealthAssessmentModal && selectedHealthAssessment && (
        <HealthAssessmentModal
          isOpen={showHealthAssessmentModal}
          onClose={() => {
            setShowHealthAssessmentModal(false);
            setSelectedHealthAssessment(null);
          }}
          assessment={selectedHealthAssessment}
          onUpdate={refreshData}
        />
      )}

      {showTaskModal && selectedPatientForTask && selectedTaskType && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedPatientForTask(null);
            setSelectedTaskType(null);
          }}
          patient={selectedPatientForTask}
          defaultTaskType={selectedTaskType}
          defaultTaskData={{
            health_record_type: selectedTaskType,
            notes: selectedTaskType === '生命表徵' ? '定期' : '',
            is_recurring: selectedTaskType === '生命表徵'
          }}
          onUpdate={refreshData}
        />
      )}

      {showMealGuidanceModal && selectedPatientForMeal && (
        <MealGuidanceModal
          isOpen={showMealGuidanceModal}
          onClose={() => {
            setShowMealGuidanceModal(false);
            setSelectedPatientForMeal(null);
          }}
          patient={selectedPatientForMeal}
          defaultGuidanceData={{
            meal_combination: '正飯+正餸',
            special_diets: [],
            needs_thickener: false,
            thickener_amount: '',
            egg_quantity: undefined,
            remarks: '',
            guidance_date: '',
            guidance_source: ''
          }}
          onUpdate={refreshData}
        />
      )}
    </div>
  );
};

export default Dashboard;