import React, { useState, useMemo } from 'react';
import { usePatients } from '../context/PatientContext';
import TaskModal from '../components/TaskModal';
import { Hop as Home, Users, Calendar, Heart, SquareCheck as CheckSquare, TriangleAlert as AlertTriangle, Clock, TrendingUp, TrendingDown, Activity, Droplets, Scale, FileText, Stethoscope, Shield, CalendarCheck, Utensils, BookOpen, Guitar as Hospital, Pill, Building2, X, User, ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isTaskOverdue, isTaskPendingToday, isTaskDueSoon, getTaskStatus, isDocumentTask, isMonitoringTask, isNursingTask, isRestraintAssessmentOverdue, isRestraintAssessmentDueSoon, isHealthAssessmentOverdue, isHealthAssessmentDueSoon, calculateNextDueDate } from '../utils/taskScheduler';
import { getPatientsWithOverdueWorkflow } from '../utils/workflowStatusHelper';
import HealthRecordModal from '../components/HealthRecordModal';
import MealGuidanceModal from '../components/MealGuidanceModal';
import FollowUpModal from '../components/FollowUpModal';
import DocumentTaskModal from '../components/DocumentTaskModal';
import RestraintAssessmentModal from '../components/RestraintAssessmentModal';
import HealthAssessmentModal from '../components/HealthAssessmentModal';
import AnnualHealthCheckupModal from '../components/AnnualHealthCheckupModal';
import MissingRequirementsCard from '../components/MissingRequirementsCard';
import NotesCard from '../components/NotesCard';
import OverdueWorkflowCard from '../components/OverdueWorkflowCard';
import PendingPrescriptionCard from '../components/PendingPrescriptionCard';
import PatientModal from '../components/PatientModal';
import VaccinationRecordModal from '../components/VaccinationRecordModal';
// [新增] 引入新建立的日曆組件
import TaskHistoryModal from '../components/TaskHistoryModal';
import { syncTaskStatus } from '../lib/database';

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
  specific_days_of_week?: number[];
  specific_days_of_month?: number[];
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
  task_id?: string;
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  血糖值?: number;
  體重?: number;
}

const Dashboard: React.FC = () => {
  const { patients, schedules, prescriptions, followUpAppointments, patientHealthTasks, setPatientHealthTasks, healthRecords, patientRestraintAssessments, healthAssessments, mealGuidances, prescriptionWorkflowRecords, annualHealthCheckups, vaccinationRecords, loading, updatePatientHealthTask, refreshData } = usePatients();
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
  const [showAnnualCheckupModal, setShowAnnualCheckupModal] = useState(false);
  const [selectedAnnualCheckup, setSelectedAnnualCheckup] = useState<any | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<'生命表徵' | null>(null);
  const [prefilledAnnualCheckupPatientId, setPrefilledAnnualCheckupPatientId] = useState<number | null>(null);
  const [selectedPatientForTask, setSelectedPatientForTask] = useState<any>(null);
  const [showMealGuidanceModal, setShowMealGuidanceModal] = useState(false);
  const [selectedPatientForMeal, setSelectedPatientForMeal] = useState<any>(null);
  const [prefilledTaskData, setPrefilledTaskData] = useState<any>(null);
  const [prefilledMealData, setPrefilledMealData] = useState<any>(null);
  const [showDailyTaskModal, setShowDailyTaskModal] = useState(false);
  const [selectedOverdueDate, setSelectedOverdueDate] = useState<string>('');
  const [isGeneratingTemperature, setIsGeneratingTemperature] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<any>(null);
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [selectedPatientForVaccination, setSelectedPatientForVaccination] = useState<any>(null);
  
  // [新增] 控制歷史日曆 Modal 的狀態
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<{ task: HealthTask; patient: Patient } | null>(null);

  const uniquePatientHealthTasks = useMemo(() => {
    const seen = new Map<string, boolean>();
    const uniqueTasks: typeof patientHealthTasks = [];
    patientHealthTasks.forEach(task => {
      if (!seen.has(task.id)) {
        seen.set(task.id, true);
        uniqueTasks.push(task);
      }
    });
    return uniqueTasks;
  }, [patientHealthTasks]);

  const handleTaskClick = (task: HealthTask, date?: string) => {
    const patient = patients.find(p => p.院友id === task.patient_id);
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
      },
      預設日期: date 
    };
    setSelectedHealthRecordInitialData(initialDataForModal);
    setShowHealthRecordModal(true);
  };

  // [新增] 點擊歷史按鈕，打開日曆 Modal
  const handleHistoryClick = (e: React.MouseEvent, task: HealthTask) => {
    e.stopPropagation(); // 防止觸發卡片的點擊事件
    const patient = patients.find(p => p.院友id === task.patient_id);
    if (patient) {
      setSelectedHistoryTask({ task, patient });
      setShowHistoryModal(true);
    }
  };

  const isAnnualCheckupOverdue = (checkup: any): boolean => {
    if (!checkup.next_due_date) return false;
    const today = new Date();
    const dueDate = new Date(checkup.next_due_date);
    return dueDate < today;
  };

  const isAnnualCheckupDueSoon = (checkup: any): boolean => {
    if (!checkup.next_due_date) return false;
    const today = new Date();
    const dueDate = new Date(checkup.next_due_date);
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 14 && daysDiff > 0;
  };

  const missingTasks = useMemo(() => {
    const activePatients = patients.filter(p => p.在住狀態 === '在住');
    const result: { patient: any; missingTaskTypes: string[] }[] = [];
    activePatients.forEach(patient => {
      const patientTasks = patientHealthTasks.filter(task => task.patient_id === patient.院友id);
      const vitalSignTasks = patientTasks.filter(task => task.health_record_type === '生命表徵');
      const missing: string[] = [];
      const hasAnnualCheckup = annualHealthCheckups.some(checkup => checkup.patient_id === patient.院友id);
      if (!hasAnnualCheckup) missing.push('年度體檢');
      if (vitalSignTasks.length === 0) missing.push('生命表徵');
      if (missing.length > 0) result.push({ patient, missingTaskTypes: missing });
    });
    return result;
  }, [patients, patientHealthTasks, annualHealthCheckups]);

  const missingMealGuidance = useMemo(() => {
    const activePatients = patients.filter(p => p.在住狀態 === '在住');
    return activePatients.filter(patient => !mealGuidances.some(guidance => guidance.patient_id === patient.院友id));
  }, [patients, mealGuidances]);

  const missingDeathDate = useMemo(() => {
    return patients.filter(p => p.在住狀態 === '已退住' && p.discharge_reason === '死亡' && (!p.death_date || p.death_date === '')).map(patient => ({ patient, missingInfo: '死亡日期' }));
  }, [patients]);

  const missingVaccination = useMemo(() => {
    return patients.filter(patient => !vaccinationRecords.some(record => record.patient_id === patient.院友id)).map(patient => ({ patient, missingInfo: '疫苗記錄' }));
  }, [patients, vaccinationRecords]);

  const overdueWorkflows = useMemo(() => {
    const result = getPatientsWithOverdueWorkflow(prescriptionWorkflowRecords, patients);
    return result.map(({ patient, overdueCount, overdueDates }) => {
      const dates: { [date: string]: number } = {};
      overdueDates.forEach(date => {
        const count = prescriptionWorkflowRecords.filter(r => r.patient_id === patient.院友id && r.scheduled_date === date && (r.preparation_status === 'pending' || r.verification_status === 'pending' || r.dispensing_status === 'pending')).length;
        dates[date] = count;
      });
      return { patient, overdueCount, dates };
    });
  }, [prescriptionWorkflowRecords, patients]);

  const pendingPrescriptions = useMemo(() => {
    return patients.filter(p => p.在住狀態 === '在住').map(patient => {
        const count = prescriptions.filter(pr => pr.patient_id === patient.院友id && pr.status === 'pending_change').length;
        return { patient, count };
      }).filter(item => item.count > 0);
  }, [patients, prescriptions]);

  const patientsMap = useMemo(() => new Map(patients.map(p => [p.院友id, p])), [patients]);

  const recentSchedules = useMemo(() => schedules.filter(s => new Date(s.到診日期) >= new Date(new Date().toDateString())).sort((a, b) => new Date(a.到診日期).getTime() - new Date(b.到診日期).getTime()).slice(0, 5), [schedules]);
  const upcomingFollowUps = useMemo(() => followUpAppointments.filter(a => { if (new Date(a.覆診日期) < new Date()) return false; const patient = patientsMap.get(a.院友id); return patient && patient.在住狀態 === '在住'; }).sort((a, b) => new Date(a.覆診日期).getTime() - new Date(b.覆診日期).getTime()).slice(0, 10), [followUpAppointments, patientsMap]);

  const monitoringTasks = useMemo(() => patientHealthTasks.filter(task => isMonitoringTask(task.health_record_type)), [patientHealthTasks]);
  const documentTasks = useMemo(() => patientHealthTasks.filter(task => isDocumentTask(task.health_record_type)), [patientHealthTasks]);

  const urgentMonitoringTasks = useMemo(() => {
    const urgent: typeof monitoringTasks = [];
    monitoringTasks.forEach(task => {
      const patient = patientsMap.get(task.patient_id);
      if (patient && patient.在住狀態 === '在住') {
        if (isTaskOverdue(task) || isTaskPendingToday(task)) urgent.push(task);
      }
    });
    return urgent.sort((a, b) => {
      const timeA = new Date(a.next_due_at).getTime();
      const timeB = new Date(b.next_due_at).getTime();
      if (timeA === timeB) return 0;
      return timeA - timeB;
    }).slice(0, 100);
  }, [monitoringTasks, patientsMap]);

  const { breakfastTasks, lunchTasks, dinnerTasks, snackTasks } = useMemo(() => {
    const breakfast: typeof urgentMonitoringTasks = [];
    const lunch: typeof urgentMonitoringTasks = [];
    const dinner: typeof urgentMonitoringTasks = [];
    const snack: typeof urgentMonitoringTasks = [];
    urgentMonitoringTasks.forEach(task => {
      const hour = new Date(task.next_due_at).getHours();
      if (hour >= 7 && hour < 10) breakfast.push(task);
      else if (hour >= 10 && hour < 13) lunch.push(task);
      else if (hour >= 13 && hour < 18) dinner.push(task);
      else if (hour >= 18 && hour <= 20) snack.push(task);
    });
    return { breakfastTasks, lunchTasks, dinnerTasks, snackTasks };
  }, [urgentMonitoringTasks]);

  const { overdueDocumentTasks, pendingDocumentTasks, dueSoonDocumentTasks } = useMemo(() => {
    const overdue: typeof documentTasks = [];
    const pending: typeof documentTasks = [];
    const dueSoon: typeof documentTasks = [];
    documentTasks.forEach(task => {
      const patient = patientsMap.get(task.patient_id);
      if (patient && patient.在住狀態 === '在住') {
        if (isTaskOverdue(task)) overdue.push(task);
        else if (isTaskPendingToday(task)) pending.push(task);
        else if (isTaskDueSoon(task)) dueSoon.push(task);
      }
    });
    return { overdueDocumentTasks: overdue, pendingDocumentTasks: pending, dueSoonDocumentTasks: dueSoon };
  }, [documentTasks, patientsMap]);
  const urgentDocumentTasks = [...overdueDocumentTasks, ...pendingDocumentTasks, ...dueSoonDocumentTasks].slice(0, 10);

  const nursingTasks = useMemo(() => patientHealthTasks.filter(task => { const patient = patientsMap.get(task.patient_id); return patient && patient.在住狀態 === '在住' && isNursingTask(task.health_record_type); }), [patientHealthTasks, patientsMap]);
  const overdueNursingTasks = useMemo(() => nursingTasks.filter(task => isTaskOverdue(task)), [nursingTasks]);
  const pendingNursingTasks = useMemo(() => nursingTasks.filter(task => isTaskPendingToday(task)), [nursingTasks]);
  const dueSoonNursingTasks = useMemo(() => nursingTasks.filter(task => { const now = new Date(); const dueDate = new Date(task.next_due_at); const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()); const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1); if (dueDateOnly.getTime() === tomorrowDate.getTime()) { if (!task.last_completed_at) return true; const lastCompleted = new Date(task.last_completed_at); const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate()); return lastCompletedDate < dueDateOnly; } return false; }), [nursingTasks]);
  const urgentNursingTasks = [...overdueNursingTasks, ...pendingNursingTasks, ...dueSoonNursingTasks].slice(0, 10);

  const { overdueRestraintAssessments, dueSoonRestraintAssessments } = useMemo(() => {
    const overdue = patientRestraintAssessments.filter(assessment => { const patient = patientsMap.get(assessment.patient_id); return patient && patient.在住狀態 === '在住' && isRestraintAssessmentOverdue(assessment); });
    const dueSoon = patientRestraintAssessments.filter(assessment => { const patient = patientsMap.get(assessment.patient_id); return patient && patient.在住狀態 === '在住' && isRestraintAssessmentDueSoon(assessment); });
    return { overdueRestraintAssessments: overdue, dueSoonRestraintAssessments: dueSoon };
  }, [patientRestraintAssessments, patientsMap]);
  const urgentRestraintAssessments = [...overdueRestraintAssessments, ...dueSoonRestraintAssessments];

  const { overdueHealthAssessments, dueSoonHealthAssessments } = useMemo(() => {
    const overdue = healthAssessments.filter(assessment => { const patient = patientsMap.get(assessment.patient_id); return patient && patient.在住狀態 === '在住' && isHealthAssessmentOverdue(assessment); });
    const dueSoon = healthAssessments.filter(assessment => { const patient = patientsMap.get(assessment.patient_id); return patient && patient.在住狀態 === '在住' && isHealthAssessmentDueSoon(assessment); });
    return { overdueHealthAssessments: overdue, dueSoonHealthAssessments: dueSoon };
  }, [healthAssessments, patientsMap]);
  const urgentHealthAssessments = [...overdueHealthAssessments, ...dueSoonHealthAssessments];

  const { overdueAnnualCheckups, dueSoonAnnualCheckups } = useMemo(() => {
    const overdue = annualHealthCheckups.filter(checkup => { const patient = patientsMap.get(checkup.patient_id); return patient && patient.在住狀態 === '在住' && isAnnualCheckupOverdue(checkup); });
    const dueSoon = annualHealthCheckups.filter(checkup => { const patient = patientsMap.get(checkup.patient_id); return patient && patient.在住狀態 === '在住' && isAnnualCheckupDueSoon(checkup); });
    return { overdueAnnualCheckups: overdue, dueSoonAnnualCheckups: dueSoon };
  }, [annualHealthCheckups, patientsMap]);
  const urgentAnnualCheckups = [...overdueAnnualCheckups, ...dueSoonAnnualCheckups];

  const filteredUrgentDocumentTasks = urgentDocumentTasks.filter(task => task.health_record_type !== '年度體檢');
  const combinedUrgentTasks = [
    ...filteredUrgentDocumentTasks.map(task => ({ type: 'document', data: task })),
    ...urgentNursingTasks.map(task => ({ type: 'nursing', data: task })),
    ...urgentRestraintAssessments.map(assessment => ({ type: 'restraint', data: assessment })),
    ...urgentHealthAssessments.map(assessment => ({ type: 'health-assessment', data: assessment })),
    ...urgentAnnualCheckups.map(checkup => ({ type: 'annual-checkup', data: checkup }))
  ].sort((a, b) => {
    const dateA = (a.type === 'document' || a.type === 'nursing') ? new Date(a.data.next_due_at) : new Date(a.data.next_due_date || '');
    const dateB = (b.type === 'document' || b.type === 'nursing') ? new Date(b.data.next_due_at) : new Date(b.data.next_due_date || '');
    return dateA.getTime() - dateB.getTime();
  });

  const handleCreateMissingTask = (patient: any, taskType: '年度體檢' | '生命表徵') => {
    if (taskType === '年度體檢') {
      setPrefilledAnnualCheckupPatientId(patient.院友id);
      setSelectedAnnualCheckup(null);
      setShowAnnualCheckupModal(true);
    } else {
      const defaultFrequency = { unit: 'daily', value: 1 };
      const prefilledData = {
        patient_id: patient.院友id,
        health_record_type: taskType,
        frequency_unit: defaultFrequency.unit,
        frequency_value: defaultFrequency.value,
        specific_times: '08:00',
        notes: '定期',
        is_recurring: true
      };
      setPrefilledTaskData(prefilledData);
      setShowTaskModal(true);
    }
  };

  const handleAddMealGuidance = (patient: any) => {
    const prefilledData = { patient_id: patient.院友id, meal_combination: '正飯+正餸' };
    setPrefilledMealData(prefilledData);
    setShowMealGuidanceModal(true);
  };

  const handleEditPatientForDeathDate = (patient: any) => {
    const fullPatient = patients.find(p => p.院友id === patient.院友id);
    setSelectedPatientForEdit(fullPatient);
    setShowPatientModal(true);
  };

  const handleAddVaccinationRecord = (patient: any) => {
    setSelectedPatientForVaccination(patient);
    setShowVaccinationModal(true);
  };

  const handleTaskCompleted = async (taskId: string, recordDateTime: Date) => {
    setShowHealthRecordModal(false);
    try {
      console.log('正在同步任務狀態...');
      await syncTaskStatus(taskId);
      await refreshData();
    } catch (error) {
      console.error('任務完成處理失敗:', error);
      alert(`任務完成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      await refreshData();
    }
  };

  const handleDocumentTaskCompleted = async (taskId: string, completionDate: string, nextDueDate: string, tubeType?: string, tubeSize?: string) => {
    try {
      const task = patientHealthTasks.find(t => t.id === taskId);
      if (!task) throw new Error('未找到對應任務');
      const updatedTask = {
        ...task,
        last_completed_at: completionDate,
        next_due_at: nextDueDate ? new Date(nextDueDate).toISOString() : null,
        tube_type: tubeType || task.tube_type,
        tube_size: tubeSize || task.tube_size
      };
      setShowDocumentTaskModal(false);
      setSelectedDocumentTask(null);
      setPatientHealthTasks(prev => {
        if (updatedTask.next_due_at === null) return prev.filter(t => t.id !== taskId);
        return prev.map(t => t.id === taskId ? updatedTask : t);
      });
      updatePatientHealthTask(updatedTask).then(() => refreshData()).catch(err => {
        console.error('文件任務更新失敗:', err);
        alert(`文件任務失敗: ${err.message}`);
        return refreshData();
      });
    } catch (error) {
      console.error('文件任務失敗:', error);
      alert(`文件任務失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      setShowDocumentTaskModal(false);
      setSelectedDocumentTask(null);
      await refreshData();
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
      case '晚晴計劃': return <Heart className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="col-span-1"><NotesCard /></div>
        <div className="col-span-1">
          <MissingRequirementsCard
            missingTasks={missingTasks}
            missingMealGuidance={missingMealGuidance}
            missingDeathDate={missingDeathDate}
            missingVaccination={missingVaccination}
            onCreateTask={handleCreateMissingTask}
            onAddMealGuidance={handleAddMealGuidance}
            onEditPatient={handleEditPatientForDeathDate}
            onAddVaccinationRecord={handleAddVaccinationRecord}
          />
        </div>
        <div className="col-span-1"><OverdueWorkflowCard overdueWorkflows={overdueWorkflows} /></div>
        <div className="col-span-1"><PendingPrescriptionCard pendingPrescriptions={pendingPrescriptions} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="card p-6 lg:p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 section-title">監測任務</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">查看全部</Link>
          </div>
          <div className="space-y-6 lg:space-y-3">
            {[
              { title: "早餐 (07:00 - 09:59)", tasks: breakfastTasks },
              { title: "午餐 (10:00 - 12:59)", tasks: lunchTasks },
              { title: "晚餐 (13:00 - 17:59)", tasks: dinnerTasks },
              { title: "夜宵 (18:00 - 20:00)", tasks: snackTasks }
            ].map((slot, idx) => (
              slot.tasks.length > 0 && (
                <div key={idx}>
                  <h3 className="text-md font-medium text-gray-700 mb-2 time-slot-title">{slot.title}</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2">
                    {slot.tasks.map((task) => {
                      const patient = patients.find(p => p.院友id === task.patient_id);
                      const status = getTaskStatus(task);
                      return (
                        <div 
                          key={task.id} 
                          className={`relative flex items-center justify-between p-3 ${getTaskTimeBackgroundClass(task.next_due_at)} rounded-lg cursor-pointer transition-colors dashboard-task-card`}
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
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
                              {task.notes && <p className="text-xs text-gray-500 mt-1">{task.notes}</p>}
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
                              {status === 'overdue' ? '逾期' : status === 'pending' ? '未完成' : status === 'due_soon' ? '即將到期' : '排程中'}
                            </span>
                          </div>
                          
                          {/* [新增] 獨立的日曆按鈕 (只針對監測任務) */}
                          {isMonitoringTask(task.health_record_type) && (
                            <button
                              onClick={(e) => handleHistoryClick(e, task)}
                              className="ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-full transition-all"
                              title="查看歷史/補錄"
                            >
                              <CalendarDays className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ))}
            {breakfastTasks.length === 0 && lunchTasks.length === 0 && dinnerTasks.length === 0 && snackTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無待處理任務</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 section-title">待辦事項</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">查看全部</Link>
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
                        if (isTaskOverdue(task)) {
                          if (!confirm(`⚠️ 注意：此任務已經逾期！\n\n任務類型：${task.health_record_type}\n原定到期時間：${new Date(task.next_due_at).toLocaleString('zh-TW')}\n目前時間：${new Date().toLocaleString('zh-TW')}\n\n請輸入實際完成的日期和時間。\n確定要繼續嗎？`)) return;
                        }
                        handleDocumentTaskClick(task);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${item.type === 'nursing' ? 'bg-teal-100' : 'bg-blue-100'}`}>
                        {patient?.院友相片 ? <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" /> : <User className={`h-5 w-5 ${item.type === 'nursing' ? 'text-teal-600' : 'text-blue-600'}`} />}
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
                        {task.notes && <p className="text-xs text-gray-500 mt-1">{task.notes}</p>}
                        <p className="text-xs text-gray-500">到期: {new Date(task.next_due_at).toLocaleDateString('zh-TW')}</p>
                      </div>
                      <span className={`status-badge ${status === 'overdue' ? 'bg-red-100 text-red-800' : status === 'pending' ? 'bg-green-100 text-green-800' : status === 'due_soon' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}`}>
                        {status === 'overdue' ? '逾期' : status === 'pending' ? '未完成' : status === 'due_soon' ? '即將到期' : '排程中'}
                      </span>
                    </div>
                  );
                } else {
                  const assessment = item.data;
                  const patient = patients.find(p => p.院友id === assessment.patient_id);
                  // ... (評估類代碼保持不變) ...
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
                  } else if (item.type === 'health-assessment') {
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
                  } else {
                    const checkup = item.data;
                    const isOverdue = isAnnualCheckupOverdue(checkup);
                    const isDueSoon = isAnnualCheckupDueSoon(checkup);
                    return (
                      <div
                        key={`annual-checkup-${checkup.id}`}
                        className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                        onClick={() => handleAnnualCheckupClick(checkup)}
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
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
                            <CalendarCheck className="h-4 w-4 text-blue-600" />
                            <p className="text-sm text-gray-600">年度體檢</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            到期: {checkup.next_due_date ? new Date(checkup.next_due_date).toLocaleDateString('zh-TW') : '未設定'}
                          </p>
                        </div>
                        <span className={`status-badge ${
                          isOverdue ? 'bg-red-100 text-red-800' :
                          isDueSoon ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
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

        <div className="card p-6 lg:p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 section-title">近期覆診</h2>
            <Link to="/follow-up" className="text-sm text-blue-600 hover:text-blue-700 font-medium">查看全部</Link>
          </div>
          <div className="space-y-3">
            {upcomingFollowUps.length > 0 ? upcomingFollowUps.map(appointment => {
              const patient = patients.find(p => p.院友id === appointment.院友id);
              return (
                <div key={appointment.覆診id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleFollowUpClick(appointment)}>
                  <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center task-avatar">
                    {patient?.院友相片 ? <img src={patient.院友相片} alt={patient.中文姓名} className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-blue-600" />}
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
                    <p className="text-xs text-gray-500">{new Date(appointment.覆診日期).toLocaleDateString('zh-TW')} - {appointment.覆診地點}</p>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(appointment.狀態)}`}>{appointment.狀態}</span>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無近期覆診</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          task={prefilledTaskData}
          onClose={() => { setShowTaskModal(false); setPrefilledTaskData(null); }}
          onUpdate={refreshData}
        />
      )}
      {showMealGuidanceModal && (
        <MealGuidanceModal
          guidance={prefilledMealData}
          onClose={() => { setShowMealGuidanceModal(false); setPrefilledMealData(null); }}
          onUpdate={refreshData}
        />
      )}
      {showHealthRecordModal && (
        <HealthRecordModal
          initialData={selectedHealthRecordInitialData}
          onClose={() => {
            console.log('關閉 HealthRecordModal');
            setShowHealthRecordModal(false);
            setTimeout(() => { setSelectedHealthRecordInitialData({}); }, 150);
          }}
          onTaskCompleted={(recordDateTime) => handleTaskCompleted(selectedHealthRecordInitialData.task.id, recordDateTime)}
        />
      )}
      {/* [新增] 歷史日曆 Modal */}
      {showHistoryModal && selectedHistoryTask && (
        <TaskHistoryModal
          task={selectedHistoryTask.task}
          patient={selectedHistoryTask.patient}
          healthRecords={healthRecords}
          onClose={() => setShowHistoryModal(false)}
          onDateSelect={(date) => {
            handleTaskClick(selectedHistoryTask.task, date);
            // 選擇日期後不關閉日曆，讓用戶可以看到更新後的狀態，或連續補錄
            // 也可以選擇在這裡 setShowHistoryModal(false) 關閉它
          }}
        />
      )}
      {showDocumentTaskModal && selectedDocumentTask && (
        <DocumentTaskModal
          isOpen={showDocumentTaskModal}
          onClose={() => { setShowDocumentTaskModal(false); setSelectedDocumentTask(null); }}
          task={selectedDocumentTask.task}
          patient={selectedDocumentTask.patient}
          onTaskCompleted={handleDocumentTaskCompleted}
        />
      )}
      {/* 其他 Modal 保留 */}
      {showFollowUpModal && selectedFollowUp && <FollowUpModal isOpen={showFollowUpModal} onClose={() => { setShowFollowUpModal(false); setSelectedFollowUp(null); }} appointment={selectedFollowUp} onUpdate={refreshData} />}
      {showRestraintAssessmentModal && selectedRestraintAssessment && <RestraintAssessmentModal isOpen={showRestraintAssessmentModal} onClose={() => { setShowRestraintAssessmentModal(false); setSelectedRestraintAssessment(null); }} assessment={selectedRestraintAssessment} onUpdate={refreshData} />}
      {showHealthAssessmentModal && selectedHealthAssessment && <HealthAssessmentModal isOpen={showHealthAssessmentModal} onClose={() => { setShowHealthAssessmentModal(false); setSelectedHealthAssessment(null); }} assessment={selectedHealthAssessment} onUpdate={refreshData} />}
      {showTaskModal && selectedPatientForTask && selectedTaskType && <TaskModal isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setSelectedPatientForTask(null); setSelectedTaskType(null); }} patient={selectedPatientForTask} defaultTaskType={selectedTaskType} defaultTaskData={{ health_record_type: selectedTaskType, notes: selectedTaskType === '生命表徵' ? '定期' : '', is_recurring: selectedTaskType === '生命表徵' }} onUpdate={refreshData} />}
      {showMealGuidanceModal && selectedPatientForMeal && <MealGuidanceModal isOpen={showMealGuidanceModal} onClose={() => { setShowMealGuidanceModal(false); setSelectedPatientForMeal(null); }} patient={selectedPatientForMeal} defaultGuidanceData={{ meal_combination: '正飯+正餸', special_diets: [], needs_thickener: false, thickener_amount: '', egg_quantity: undefined, remarks: '', guidance_date: '', guidance_source: '' }} onUpdate={refreshData} />}
      {showAnnualCheckupModal && <AnnualHealthCheckupModal checkup={selectedAnnualCheckup} onClose={() => { setShowAnnualCheckupModal(false); setSelectedAnnualCheckup(null); setPrefilledAnnualCheckupPatientId(null); }} onSave={refreshData} prefilledPatientId={prefilledAnnualCheckupPatientId} />}
      {showPatientModal && <PatientModal patient={selectedPatientForEdit} onClose={() => { setShowPatientModal(false); setSelectedPatientForEdit(null); refreshData(); }} />}
      {showVaccinationModal && <VaccinationRecordModal patientId={selectedPatientForVaccination?.院友id} onClose={() => { setShowVaccinationModal(false); setSelectedPatientForVaccination(null); }} />}
    </div>
  );
};

export default Dashboard;