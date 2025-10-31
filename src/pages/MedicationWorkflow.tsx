import React, { useState, useEffect, useMemo } from 'react';
import {
  Pill,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Play,
  Zap,
  FastForward,
  CheckSquare,
  Users,
  Syringe
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from '../components/PatientAutocomplete';
import PrescriptionModal from '../components/PrescriptionModal';
import DispenseConfirmModal from '../components/DispenseConfirmModal';
import InspectionCheckModal from '../components/InspectionCheckModal';
import InjectionSiteModal from '../components/InjectionSiteModal';
import RevertConfirmModal from '../components/RevertConfirmModal';
import { generateDailyWorkflowRecords } from '../utils/workflowGenerator';

interface WorkflowCellProps {
  record: any;
  step: 'preparation' | 'verification' | 'dispensing';
  onStepClick: (recordId: string, step: string) => void;
  disabled?: boolean;
  selectedDate: string;
}

const WorkflowCell: React.FC<WorkflowCellProps> = ({ record, step, onStepClick, disabled, selectedDate }) => {
  const { prescriptions } = usePatients();

  // 檢查是否為即時備藥處方
  const prescription = prescriptions.find(p => p.id === record.prescription_id);
  const isImmediatePreparation = prescription?.preparation_method === 'immediate';

  const getStepStatus = () => {
    switch (step) {
      case 'preparation':
        return record.preparation_status;
      case 'verification':
        return record.verification_status;
      case 'dispensing':
        return record.dispensing_status;
      default:
        return 'pending';
    }
  };

  const getStepStaff = () => {
    switch (step) {
      case 'preparation':
        return record.preparation_staff;
      case 'verification':
        return record.verification_staff;
      case 'dispensing':
        return record.dispensing_staff;
      default:
        return null;
    }
  };

  const getStepTime = () => {
    switch (step) {
      case 'preparation':
        return record.preparation_time;
      case 'verification':
        return record.verification_time;
      case 'dispensing':
        return record.dispensing_time;
      default:
        return null;
    }
  };

  const status = getStepStatus();
  const staff = getStepStaff();
  const time = getStepTime();

  // 解析檢測項數值（僅在派藥格子顯示）
  const getInspectionValues = () => {
    if (step !== 'dispensing' || !record.inspection_check_result) {
      return null;
    }

    try {
      const result = typeof record.inspection_check_result === 'string'
        ? JSON.parse(record.inspection_check_result)
        : record.inspection_check_result;

      console.log('[WorkflowCell] 解析檢測結果:', { recordId: record.id, result });

      // 如果是入院狀態，返回特殊標記
      if (result && result.isHospitalized) {
        return { isHospitalized: true };
      }

      // 如果有檢測數據，返回（直接使用 usedVitalSignData）
      if (result && result.usedVitalSignData && Object.keys(result.usedVitalSignData).length > 0) {
        return result.usedVitalSignData;
      }
    } catch (error) {
      console.error('[WorkflowCell] 解析檢測項結果失敗:', error, record.inspection_check_result);
    }

    return null;
  };

  // 獲取檢測不合格的項目（僅在派藥失敗且有檢測結果時顯示）
  const getBlockedRules = () => {
    if (step !== 'dispensing' || status !== 'failed' || !record.inspection_check_result) {
      return null;
    }

    try {
      const result = typeof record.inspection_check_result === 'string'
        ? JSON.parse(record.inspection_check_result)
        : record.inspection_check_result;

      console.log('[WorkflowCell] 檢測不合格規則:', { recordId: record.id, blockedRules: result?.blockedRules });

      if (result && result.blockedRules && result.blockedRules.length > 0) {
        return result.blockedRules;
      }
    } catch (error) {
      console.error('[WorkflowCell] 解析檢測項結果失敗:', error, record.inspection_check_result);
    }

    return null;
  };

  // 提取注射位置（僅在派藥格子顯示）
  const getInjectionSite = () => {
    if (step !== 'dispensing' || !record.notes) {
      return null;
    }

    const match = record.notes.match(/注射位置[：:]\s*([^|]+)/);
    return match ? match[1].trim() : null;
  };

  // 檢查檢測項是否合格
  const isInspectionPassed = () => {
    if (step !== 'dispensing' || !record.inspection_check_result) {
      return null;
    }

    try {
      const result = typeof record.inspection_check_result === 'string'
        ? JSON.parse(record.inspection_check_result)
        : record.inspection_check_result;

      return result?.canDispense;
    } catch (error) {
      return null;
    }
  };

  const inspectionValues = getInspectionValues();
  const blockedRules = getBlockedRules();
  const injectionSite = getInjectionSite();
  const inspectionPassed = isInspectionPassed();

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'failed':
        return <XCircle className="h-3 w-3" />;
      case 'pending':
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStepLabel = () => {
    switch (step) {
      case 'preparation':
        return '執藥';
      case 'verification':
        return '核藥';
      case 'dispensing':
        return '派藥';
      default:
        return step;
    }
  };

  const isClickable = () => {
    if (disabled) return false;
    
    // 移除日期限制，允許所有日期操作
    if (step === 'preparation') {
      return true;
    }
    
    // 核藥：需要執藥完成才能執行，但總是可以撤銷
    if (step === 'verification') {
      return status === 'pending' ? record.preparation_status === 'completed' : true;
    }
    
    // 派藥：需要核藥完成才能執行，但總是可以撤銷
    if (step === 'dispensing') {
      return status === 'pending' ? record.verification_status === 'completed' : true;
    }
    
    return false;
  };

  const handleClick = () => {
    if (!isClickable()) return;
    onStepClick(record.id, step);
  };

  const getClickTooltip = () => {
    if (status === 'completed') {
      return `點擊撤銷${getStepLabel()}（需確認）`;
    } else if (status === 'failed') {
      return `點擊撤銷${getStepLabel()}失敗狀態（需確認）`;
    } else if (status === 'pending') {
      if (step === 'preparation') {
        return `點擊執行${getStepLabel()}`;
      } else if (step === 'verification' && record.preparation_status !== 'completed') {
        return '需要先完成執藥';
      } else if (step === 'dispensing' && record.verification_status !== 'completed') {
        return '需要先完成核藥';
      } else if (step === 'dispensing') {
        return '點擊確認派藥（需選擇執行結果）';
      } else {
        return `點擊執行${getStepLabel()}`;
      }
    }
    return '';
  };

  // 檢測項背景色覆蓋
  let cellClass = `${getStatusColor()} ${isClickable() ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed'} ${isImmediatePreparation && (step === 'preparation' || step === 'verification') ? 'bg-gray-200 text-gray-500' : ''}`;

  // 如果是派藥格子且有檢測項結果，根據是否合格覆蓋背景色
  if (step === 'dispensing' && status === 'completed' && inspectionPassed !== null) {
    if (inspectionPassed) {
      cellClass = `bg-green-50 text-green-800 border-green-200 ${isClickable() ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed'}`;
    } else {
      cellClass = `bg-red-50 text-red-800 border-red-200 ${isClickable() ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed'}`;
    }
  }

  return (
    <div
      className={`px-2 py-2 border rounded text-center text-xs transition-all duration-200 ${cellClass}`}
      onClick={handleClick}
      title={getClickTooltip()}
    >
      <div className="flex items-center justify-center space-x-1">
        {getStatusIcon()}
        <span className="font-medium">{getStepLabel()}</span>
      </div>

      {status === 'completed' && staff && (
        <div className="text-xs text-gray-500 mt-1 truncate">
          {staff}
        </div>
      )}

      {status === 'failed' && record.dispensing_failure_reason && !inspectionValues && !blockedRules && (
        <div className="text-xs text-red-600 mt-1 truncate font-medium">
          {record.dispensing_failure_reason === '其他' && record.custom_failure_reason
            ? record.custom_failure_reason
            : record.dispensing_failure_reason}
        </div>
      )}

      {isImmediatePreparation && (step === 'preparation' || step === 'verification') && (
        <div className="text-xs text-gray-500 mt-1">
          即時備藥
        </div>
      )}

      {/* 顯示入院狀態 */}
      {step === 'dispensing' && status === 'failed' && inspectionValues?.isHospitalized && (
        <div className="mt-1 text-xs text-red-700 font-medium">
          入院中
        </div>
      )}

      {/* 顯示檢測不合格的項目及數值 */}
      {step === 'dispensing' && status === 'failed' && blockedRules && blockedRules.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {blockedRules.map((rule: any, index: number) => (
            <div key={index} className="text-xs text-red-700">
              <span className="font-medium">{rule.vital_sign_type}:</span> {rule.actual_value || rule.actualValue}
            </div>
          ))}
        </div>
      )}

      {/* 顯示檢測合格的項目數值 */}
      {step === 'dispensing' && status === 'completed' && inspectionValues && !inspectionValues.isHospitalized && (
        <div className="mt-1 space-y-0.5">
          {Object.entries(inspectionValues).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="font-medium">{key}:</span> {value}
            </div>
          ))}
        </div>
      )}

      {/* 顯示注射位置 */}
      {step === 'dispensing' && status === 'completed' && injectionSite && (
        <div className="mt-1 flex items-center justify-center space-x-1 text-xs text-orange-700">
          <Syringe className="h-3 w-3" />
          <span>{injectionSite}</span>
        </div>
      )}
    </div>
  );
};

const MedicationWorkflow: React.FC = () => {
  const { 
    patients, 
    prescriptions, 
    prescriptionWorkflowRecords,
    fetchPrescriptionWorkflowRecords,
    prepareMedication,
    revertPrescriptionWorkflowStep,
    verifyMedication,
    dispenseMedication,
    loading 
  } = usePatients();
  const { displayName } = useAuth();

  // 獲取本地今天日期（避免 UTC 時區問題）
  const getTodayLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 狀態管理
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate());
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDispenseConfirmModal, setShowDispenseConfirmModal] = useState(false);
  const [showInspectionCheckModal, setShowInspectionCheckModal] = useState(false);
  const [showInjectionSiteModal, setShowInjectionSiteModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [selectedWorkflowRecord, setSelectedWorkflowRecord] = useState<any>(null);
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [showRevertConfirmModal, setShowRevertConfirmModal] = useState(false);
  const [revertActionRecord, setRevertActionRecord] = useState<any>(null);
  const [revertActionStep, setRevertActionStep] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [oneClickProcessing, setOneClickProcessing] = useState({
    preparation: false,
    verification: false,
    dispensing: false
  });
  const [currentInjectionRecord, setCurrentInjectionRecord] = useState<any>(null);
  const [allWorkflowRecords, setAllWorkflowRecords] = useState<any[]>([]);
  const [preparationFilter, setPreparationFilter] = useState<'all' | 'advanced' | 'immediate'>('all');

  // 計算一週日期（周日開始）
  const computeWeekDates = (dateStr: string): string[] => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date);
    sunday.setDate(diff);
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      week.push(d.toISOString().split('T')[0]);
    }
    return week;
  };

  const weekDates = useMemo(() => computeWeekDates(selectedDate), [selectedDate]);

  // 按床號排序的在住院友列表
  const sortedActivePatients = useMemo(() => {
    return patients
      .filter(p => p.在住狀態 === '在住')
      .sort((a, b) => a.床號.localeCompare(b.床號, 'zh-Hant', { numeric: true }));
  }, [patients]);

  // 預設選擇第一個在住院友
  useEffect(() => {
    if (!selectedPatientId && sortedActivePatients.length > 0) {
      setSelectedPatientId(sortedActivePatients[0].院友id.toString());
    }
  }, [selectedPatientId, sortedActivePatients]);

  // 當 weekDates 或 patient 改變時，清空並重新載入一週記錄
  useEffect(() => {
    if (selectedPatientId && weekDates.length > 0) {
      setAllWorkflowRecords([]);
      const patientIdNum = parseInt(selectedPatientId);
      if (!isNaN(patientIdNum)) {
        (async () => {
          for (const date of weekDates) {
            await fetchPrescriptionWorkflowRecords(patientIdNum, date);
          }
        })();
      }
    }
  }, [selectedPatientId, JSON.stringify(weekDates), fetchPrescriptionWorkflowRecords]);

  // 監聽 context 的 prescriptionWorkflowRecords 改變，合併/替換到本地 allWorkflowRecords
  useEffect(() => {
    if (prescriptionWorkflowRecords.length > 0 && selectedPatientId) {
      setAllWorkflowRecords(prev => {
        const newRecords = prescriptionWorkflowRecords.filter(r => r.patient_id.toString() === selectedPatientId);
        if (newRecords.length === 0) return prev;
        const fetchDate = newRecords[0].scheduled_date; // 假設 fetch 是單日
        const filteredPrev = prev.filter(r => r.scheduled_date !== fetchDate);
        return [...filteredPrev, ...newRecords];
      });
    }
  }, [prescriptionWorkflowRecords, selectedPatientId]);

  // 獲取當前日期的工作流程記錄（用於一鍵操作等）
  const currentDayWorkflowRecords = useMemo(() => 
    allWorkflowRecords.filter(r => 
      r.scheduled_date === selectedDate && r.patient_id.toString() === selectedPatientId
    ),
    [allWorkflowRecords, selectedDate, selectedPatientId]
  );

  // 獲取選中院友的在服處方（基於選取日期）
  const selectedPatient = sortedActivePatients.find(p => p.院友id.toString() === selectedPatientId);

  // 院友導航函數
  const goToPreviousPatient = () => {
    if (sortedActivePatients.length === 0) return;
    
    const currentIndex = sortedActivePatients.findIndex(p => p.院友id.toString() === selectedPatientId);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : sortedActivePatients.length - 1;
    setSelectedPatientId(sortedActivePatients[previousIndex].院友id.toString());
  };

  const goToNextPatient = () => {
    if (sortedActivePatients.length === 0) return;
    
    const currentIndex = sortedActivePatients.findIndex(p => p.院友id.toString() === selectedPatientId);
    const nextIndex = currentIndex < sortedActivePatients.length - 1 ? currentIndex + 1 : 0;
    setSelectedPatientId(sortedActivePatients[nextIndex].院友id.toString());
  };
  
  // 過濾處方：只顯示在選定日期有效的處方
  const activePrescriptions = prescriptions.filter(p => {
    if (p.patient_id.toString() !== selectedPatientId || p.status !== 'active') {
      return false;
    }

    const selectedDateObj = new Date(selectedDate);
    const startDate = new Date(p.start_date);

    // 檢查是否在開始日期之前
    if (selectedDateObj < startDate) {
      return false;
    }

    // 檢查是否在結束日期之後
    if (p.end_date) {
      const endDate = new Date(p.end_date);
      if (selectedDateObj > endDate) {
        return false;
      }
    }

    return true;
  });

  // 根據備藥方式過濾處方
  const filteredPrescriptions = activePrescriptions.filter(p => {
    if (preparationFilter === 'all') {
      return true;
    } else if (preparationFilter === 'advanced') {
      return p.preparation_method === 'advanced';
    } else if (preparationFilter === 'immediate') {
      return p.preparation_method === 'immediate';
    }
    return true;
  });

  // 計算藥物數量統計
  const medicationStats = useMemo(() => {
    const timeSlotStats: { [timeSlot: string]: { [dosageForm: string]: { count: number; totalAmount: number; unit: string } } } = {};
    
    activePrescriptions.forEach(prescription => {
      if (prescription.medication_time_slots && prescription.medication_time_slots.length > 0) {
        prescription.medication_time_slots.forEach((timeSlot: string) => {
          if (!timeSlotStats[timeSlot]) {
            timeSlotStats[timeSlot] = {};
          }
          
          const dosageForm = prescription.dosage_form || '未知劑型';
          const dosageAmount = prescription.dosage_amount || '1';
          const dosageUnit = prescription.dosage_unit || '';
          
          if (!timeSlotStats[timeSlot][dosageForm]) {
            timeSlotStats[timeSlot][dosageForm] = { count: 0, totalAmount: 0, unit: dosageUnit };
          }
          
          timeSlotStats[timeSlot][dosageForm].count++;
          
          // 如果是數值，累加總量
          if (!isNaN(parseFloat(dosageAmount))) {
            timeSlotStats[timeSlot][dosageForm].totalAmount += parseFloat(dosageAmount);
          }
        });
      }
    });
    
    return timeSlotStats;
  }, [activePrescriptions]);

  // 處理步驟點擊
  const handleStepClick = async (recordId: string, step: string) => {
    if (!recordId || recordId === 'undefined') {
      console.error('無效的記錄ID:', recordId);
      return;
    }

    if (!selectedPatientId) {
      console.error('缺少必要的院友ID:', { selectedPatientId });
      alert('請先選擇院友');
      return;
    }

    // 驗證 selectedPatientId 是否為有效數字
    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
      alert('請選擇有效的院友');
      return;
    }

    const record = allWorkflowRecords.find(r => r.id === recordId);
    if (!record) {
      console.error('找不到對應的工作流程記錄:', recordId);
      return;
    }

    // 檢查步驟狀態，決定是執行操作還是撤銷
    const stepStatus = getStepStatus(record, step);

    if (stepStatus === 'pending') {
      // 待處理狀態：直接執行操作
      if (step === 'preparation' || step === 'verification') {
        // 執藥和核藥：直接完成
        await handleCompleteWorkflowStep(recordId, step);
      } else if (step === 'dispensing') {
        // 派藥：保持原有邏輯，檢查特殊情況
        await handleCompleteWorkflowStep(recordId, step);
      }
    } else if (stepStatus === 'completed' || stepStatus === 'failed') {
      // 已完成或失敗狀態：打開撤銷確認對話框
      setRevertActionRecord(record);
      setRevertActionStep(step);
      setShowRevertConfirmModal(true);
    }
  };

  // 處理撤銷步驟
  const handleRevertStep = async (recordId: string, step: string) => {
    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
      alert('請選擇有效的院友');
      return;
    }

    const record = allWorkflowRecords.find(r => r.id === recordId);
    if (!record) return;

    try {
      await revertPrescriptionWorkflowStep(recordId, step as any, patientIdNum, record.scheduled_date);
    } catch (error) {
      console.error(`撤銷${step}失敗:`, error);
      alert(`撤銷失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 處理完成工作流程步驟
  const handleCompleteWorkflowStep = async (recordId: string, step: string) => {
    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
      alert('請選擇有效的院友');
      return;
    }

    const record = allWorkflowRecords.find(r => r.id === recordId);
    if (!record) {
      console.error('找不到對應的工作流程記錄:', recordId);
      return;
    }

    const scheduledDate = record.scheduled_date;

    try {
      if (step === 'preparation') {
        await prepareMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, scheduledDate);
      } else if (step === 'verification') {
        await verifyMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, scheduledDate);
      } else if (step === 'dispensing') {
        const prescription = prescriptions.find(p => p.id === record.prescription_id);
        const patient = patients.find(p => p.院友id === record.patient_id);
        const isHospitalized = patient?.is_hospitalized || false;

        // 如果院友入院中，直接寫入"入院"失敗，不彈出任何對話框
        if (isHospitalized) {
          const inspectionResult = {
            canDispense: false,
            isHospitalized: true,
            blockedRules: [],
            usedVitalSignData: {}
          };

          await dispenseMedication(
            record.id,
            displayName || '未知',
            '入院',
            undefined,
            patientIdNum,
            scheduledDate,
            undefined,
            inspectionResult
          );
          return;
        }

        // 正確流程：優先檢測項 → 注射位置 → 派藥確認
        if (prescription?.inspection_rules && prescription.inspection_rules.length > 0) {
          // 有檢測項要求的藥物需要檢測
          setSelectedWorkflowRecord(record);
          setSelectedStep(step);
          setShowInspectionCheckModal(true);
        } else if (prescription?.administration_route === '注射') {
          // 針劑需要選擇注射位置（無檢測項要求）
          setCurrentInjectionRecord(record);
          setShowInjectionSiteModal(true);
        } else {
          // 普通藥物：顯示派藥確認對話框
          setSelectedWorkflowRecord(record);
          setSelectedStep(step);
          setShowDispenseConfirmModal(true);
        }
      }
    } catch (error) {
      console.error(`執行${step}失敗:`, error);
      alert(`執行失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };


  // 獲取步驟狀態
  const getStepStatus = (record: any, step: string) => {
    switch (step) {
      case 'preparation':
        return record.preparation_status;
      case 'verification':
        return record.verification_status;
      case 'dispensing':
        return record.dispensing_status;
      default:
        return 'pending';
    }
  };

  // 檢查院友是否入院中
  const checkPatientHospitalized = (patientId: number): boolean => {
    const patient = patients.find(p => p.院友id === patientId);
    return patient?.is_hospitalized || false;
  };

  // 一鍵執藥（僅當日）
  const handleOneClickPrepare = async () => {
    if (!selectedPatientId || !selectedDate) {
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      return;
    }

    setOneClickProcessing(prev => ({ ...prev, preparation: true }));

    try {
      // 找到所有待執藥的記錄（排除即時備藥）
      const pendingPreparationRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);
        return r.preparation_status === 'pending' && prescription?.preparation_method !== 'immediate';
      });

      if (pendingPreparationRecords.length === 0) {
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const record of pendingPreparationRecords) {
        try {
          await prepareMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
          successCount++;
        } catch (error) {
          console.error(`執藥失敗 (記錄ID: ${record.id}):`, error);
          failCount++;
        }
      }

      if (failCount > 0) {
        alert(`一鍵執藥部分完成：成功 ${successCount} 筆，失敗 ${failCount} 筆`);
      }
    } catch (error) {
      console.error('一鍵執藥失敗:', error);
      alert(`一鍵執藥失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setOneClickProcessing(prev => ({ ...prev, preparation: false }));
    }
  };

  // 一鍵核藥（僅當日）
  const handleOneClickVerify = async () => {
    if (!selectedPatientId || !selectedDate) {
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      return;
    }

    setOneClickProcessing(prev => ({ ...prev, verification: true }));

    try {
      // 找到所有待核藥且執藥已完成的記錄（排除即時備藥）
      const pendingVerificationRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);
        return r.verification_status === 'pending' && 
               r.preparation_status === 'completed' && 
               prescription?.preparation_method !== 'immediate';
      });

      if (pendingVerificationRecords.length === 0) {
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const record of pendingVerificationRecords) {
        try {
          await verifyMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
          successCount++;
        } catch (error) {
          console.error(`核藥失敗 (記錄ID: ${record.id}):`, error);
          failCount++;
        }
      }

      if (failCount > 0) {
        alert(`一鍵核藥部分完成：成功 ${successCount} 筆，失敗 ${failCount} 筆`);
      }
    } catch (error) {
      console.error('一鍵核藥失敗:', error);
      alert(`一鍵核藥失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally { 
      setOneClickProcessing(prev => ({ ...prev, verification: false }));
    }
  };
  // 檢查是否可以一鍵派藥
  const canOneClickDispense = (prescription: any) => {
    // 必須是即時備藥
    if (prescription?.preparation_method !== 'immediate') {
      return false;
    }
    
    // 必須是口服途徑
    if (prescription?.administration_route !== '口服') {
      return false;
    }
    
    // 不能有檢測項要求
    if (prescription?.inspection_rules && prescription.inspection_rules.length > 0) {
      return false;
    }
    
    return true;
  };

  // 一鍵派藥（即時備藥+口服+無檢測項）
  const handleOneClickDispenseSpecial = async () => {
    if (!selectedPatientId || !selectedDate) {
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      return;
    }

    const isHospitalized = checkPatientHospitalized(patientIdNum);

    setOneClickProcessing(prev => ({ ...prev, dispensing: true }));

    try {
      // 找到符合一鍵派藥條件的記錄
      const eligibleRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);
        return r.dispensing_status === 'pending' && canOneClickDispense(prescription);
      });

      if (eligibleRecords.length === 0) {
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let hospitalizedCount = 0;

      for (const record of eligibleRecords) {
        try {
          // 一鍵完成執藥、核藥、派藥
          await prepareMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
          await verifyMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);

          if (isHospitalized) {
            // 如果院友入院中，自動標記為「入院」失敗原因
            await dispenseMedication(record.id, displayName || '未知', '入院', undefined, patientIdNum, selectedDate);
            hospitalizedCount++;
          } else {
            // 正常派藥
            await dispenseMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
            successCount++;
          }
        } catch (error) {
          console.error(`一鍵全程失敗 (記錄ID: ${record.id}):`, error);
          failCount++;
        }
      }
    } catch (error) {
      console.error('一鍵全程失敗:', error);
      alert(`一鍵全程失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setOneClickProcessing(prev => ({ ...prev, dispensing: false }));
    }
  };

  // 一鍵派藥（僅當日）
  const handleOneClickDispense = async () => {
    if (!selectedPatientId || !selectedDate) {
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      return;
    }

    const isHospitalized = checkPatientHospitalized(patientIdNum);

    setOneClickProcessing(prev => ({ ...prev, dispensing: true }));

    try {
      // 找到所有待派藥的記錄
      const pendingDispensingRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);

        // 排除注射類藥物
        if (prescription?.administration_route === '注射') {
          return false;
        }

        // 如果有檢測項要求且院友未入院，排除（需要手動檢測）
        if (prescription?.inspection_rules && prescription.inspection_rules.length > 0 && !isHospitalized) {
          return false;
        }

        // 包含：無檢測項的藥物，以及有檢測項但入院中的藥物
        return r.dispensing_status === 'pending' && r.verification_status === 'completed';
      });

      if (pendingDispensingRecords.length === 0) {
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let hospitalizedCount = 0;

      for (const record of pendingDispensingRecords) {
        try {
          const prescription = prescriptions.find(p => p.id === record.prescription_id);
          const hasInspectionRules = prescription?.inspection_rules && prescription.inspection_rules.length > 0;

          if (isHospitalized) {
            // 如果院友入院中，自動標記為「入院」失敗原因
            const inspectionResult = hasInspectionRules ? {
              canDispense: false,
              isHospitalized: true,
              blockedRules: [],
              usedVitalSignData: {}
            } : undefined;

            await dispenseMedication(
              record.id,
              displayName || '未知',
              '入院',
              undefined,
              patientIdNum,
              selectedDate,
              undefined,
              inspectionResult
            );
            hospitalizedCount++;
          } else {
            // 正常派藥（無檢測項要求）
            await dispenseMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
            successCount++;
          }
        } catch (error) {
          console.error(`派藥失敗 (記錄ID: ${record.id}):`, error);
          failCount++;
        }
      }
    } catch (error) {
      console.error('一鍵派藥失敗:', error);
      alert(`一鍵派藥失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setOneClickProcessing(prev => ({ ...prev, dispensing: false }));
    }
  };

  // 處理檢測通過後的派藥
  const handleDispenseAfterInspection = async (canDispense: boolean, failureReason?: string, inspectionCheckResult?: any) => {
    if (!selectedWorkflowRecord) return;

    if (!selectedPatientId) {
      console.error('缺少必要的院友ID:', { selectedPatientId });
      return;
    }

    // 驗證 selectedPatientId 是否為有效數字
    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
      alert('請選擇有效的院友');
      return;
    }

    try {
      // 檢測合格時
      // 檢測不合格時，InspectionCheckModal 已經直接處理完成
      if (canDispense) {
        // 將檢測結果保存到 selectedWorkflowRecord
        const updatedRecord = {
          ...selectedWorkflowRecord,
          inspectionCheckResult
        };
        setSelectedWorkflowRecord(updatedRecord);
        setShowInspectionCheckModal(false);

        // 檢查是否為注射類藥物
        const prescription = prescriptions.find(p => p.id === selectedWorkflowRecord.prescription_id);
        if (prescription?.administration_route === '注射') {
          // 是注射類，需要選擇注射位置
          setCurrentInjectionRecord(updatedRecord);
          setShowInjectionSiteModal(true);
        } else {
          // 不是注射類，直接打開派藥確認對話框
          setShowDispenseConfirmModal(true);
        }
      }
    } catch (error) {
      console.error('檢測後處理失敗:', error);
      alert(`處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 處理注射位置確認後的派藥
  const handleInjectionSiteSelected = async (injectionSite: string, notes?: string) => {
    if (!currentInjectionRecord) return;

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      alert('請選擇有效的院友');
      return;
    }

    const scheduledDate = currentInjectionRecord.scheduled_date;

    try {
      const prescription = prescriptions.find(p => p.id === currentInjectionRecord.prescription_id);

      // 針劑派藥時記錄注射位置
      const injectionNotes = `注射位置: ${injectionSite}${notes ? ` | ${notes}` : ''}`;

      // 保存注射位置信息，同時保留之前的檢測結果（如果有）
      setSelectedWorkflowRecord({
        ...currentInjectionRecord,
        injectionSite,
        injectionNotes,
        // 保留檢測結果（如果有）
        inspectionCheckResult: currentInjectionRecord.inspectionCheckResult || selectedWorkflowRecord?.inspectionCheckResult
      });

      // 關閉注射位置對話框，打開派藥確認對話框
      setShowInjectionSiteModal(false);
      setShowDispenseConfirmModal(true);
    } catch (error) {
      console.error('處理注射位置失敗:', error);
      alert(`處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };


  // 處理派藥確認對話框的結果
  const handleDispenseConfirm = async (action: 'success' | 'failure', reason?: string, customReason?: string) => {
    if (!selectedWorkflowRecord) return;

    if (!selectedPatientId) {
      console.error('缺少必要的院友ID:', { selectedPatientId });
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
      alert('請選擇有效的院友');
      return;
    }

    const scheduledDate = selectedWorkflowRecord.scheduled_date;

    try {
      const prescription = prescriptions.find(p => p.id === selectedWorkflowRecord.prescription_id);

      // 如果是即時備藥，需要自動回補執藥和核藥
      if (prescription?.preparation_method === 'immediate') {
        await prepareMedication(
          selectedWorkflowRecord.id,
          displayName || '未知',
          undefined,
          undefined,
          patientIdNum,
          scheduledDate
        );

        await verifyMedication(
          selectedWorkflowRecord.id,
          displayName || '未知',
          undefined,
          undefined,
          patientIdNum,
          scheduledDate
        );
      }

      // 執行派藥
      if (action === 'success') {
        // 如果有注射位置信息，添加到備註中
        const notes = selectedWorkflowRecord.injectionNotes || undefined;

        // 如果有檢測結果（從 InspectionCheckModal 傳來），存儲檢測數據
        const inspectionCheckResult = selectedWorkflowRecord.inspectionCheckResult || undefined;

        await dispenseMedication(
          selectedWorkflowRecord.id,
          displayName || '未知',
          undefined,
          undefined,
          patientIdNum,
          scheduledDate,
          notes,
          inspectionCheckResult
        );
      } else {
        // 派藥失敗，記錄原因
        await dispenseMedication(
          selectedWorkflowRecord.id,
          displayName || '未知',
          reason,
          customReason,
          patientIdNum,
          scheduledDate
        );
      }

      setShowDispenseConfirmModal(false);
      setSelectedWorkflowRecord(null);
      setSelectedStep('');
      setCurrentInjectionRecord(null);
    } catch (error) {
      console.error('派藥確認失敗:', error);
      alert(`派藥失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 刷新數據（僅當日）
  const handleRefresh = async () => {
    const patientIdNum = parseInt(selectedPatientId);
    if (!selectedPatientId || selectedPatientId === '' || isNaN(patientIdNum)) {
      console.warn('無效的院友ID，無法刷新數據:', selectedPatientId);
      return;
    }
    
    setRefreshing(true);
    try {
      await fetchPrescriptionWorkflowRecords(patientIdNum, selectedDate);
    } catch (error) {
      console.error('刷新數據失敗:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 生成今日工作流程記錄
  const handleGenerateWorkflow = async () => {
    const patientIdNum = parseInt(selectedPatientId);
    if (!selectedPatientId || selectedPatientId === '' || isNaN(patientIdNum)) {
      alert('請先選擇院友');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateDailyWorkflowRecords(selectedDate, patientIdNum);
      
      if (result.success) {
        alert(`${result.message}\n\n生成了 ${result.recordsGenerated} 筆工作流程記錄`);
        // 重新載入數據
        await fetchPrescriptionWorkflowRecords(patientIdNum, selectedDate);
      } else {
        alert(`生成失敗: ${result.message}`);
      }
    } catch (error) {
      console.error('生成工作流程記錄失敗:', error);
      alert('生成工作流程記錄失敗，請重試');
    } finally {
      setGenerating(false);
    }
  };

  // 日期導航
  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(getTodayLocalDate());
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

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="sticky top-0 bg-white z-30 py-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">藥物工作流程</h1>
            <p className="text-sm text-gray-600 mt-1">管理院友的執藥、核藥、派藥流程</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || !selectedPatientId}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
            <button
              onClick={handleGenerateWorkflow}
              disabled={generating || !selectedPatientId}
              className="btn-primary flex items-center space-x-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>生成工作流程</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div> 

      {/* 院友選擇和日期控制 */}
      <div className="sticky top-16 bg-white z-20 shadow-sm">
        <div className="card p-4">
          <div className="space-y-4">
            {/* 響應式佈局 */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] xl:grid-cols-2 gap-4">
              {/* 左側區域：日期控制 + 院友選擇（iPad 橫向時垂直排列） */}
              <div className="space-y-4">
                {/* 日期控制 */}
                <div>
                  <label className="form-label">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    選擇日期
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousDay}
                      className="btn-secondary p-2"
                      title="前一日"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="form-input flex-1"
                    />

                    <button
                      onClick={goToNextDay}
                      className="btn-secondary p-2"
                      title="後一日"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      onClick={goToToday}
                      className="btn-secondary text-sm"
                    >
                      今天
                    </button>
                  </div>
                </div>

                {/* 院友選擇 */}
                <div>
                  <label className="form-label">
                    <User className="h-4 w-4 inline mr-1" />
                    選擇院友
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousPatient}
                      disabled={sortedActivePatients.length <= 1}
                      className="btn-secondary flex items-center space-x-1 px-3 py-2 flex-shrink-0"
                      title="上一位院友"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>上一位</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <PatientAutocomplete
                        value={selectedPatientId}
                        onChange={setSelectedPatientId}
                        placeholder="搜索院友..."
                      />
                    </div>
                    <button
                      onClick={goToNextPatient}
                      disabled={sortedActivePatients.length <= 1}
                      className="btn-secondary flex items-center space-x-1 px-3 py-2 flex-shrink-0"
                      title="下一位院友"
                    >
                      <span>下一位</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 院友導航指示器 */}
                  {sortedActivePatients.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600 text-center lg:text-left">
                      第 {sortedActivePatients.findIndex(p => p.院友id.toString() === selectedPatientId) + 1} / {sortedActivePatients.length} 位院友
                      {selectedPatient && (
                        <span className="ml-2 text-blue-600">
                          (床號: {selectedPatient.床號})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 右側區域：一鍵操作按鈕（iPad 橫向時獨立成欄） */}
              <div className="flex lg:flex-col xl:flex-row items-center lg:justify-center xl:justify-end gap-2">
                <button
                  onClick={handleOneClickPrepare}
                  disabled={oneClickProcessing.preparation || !currentDayWorkflowRecords.some(r => {
                    const prescription = prescriptions.find(p => p.id === r.prescription_id);
                    return r.preparation_status === 'pending' && prescription?.preparation_method !== 'immediate';
                  })}
                  className="btn-primary flex items-center space-x-1 text-xs px-2 py-1 lg:w-full xl:w-auto"
                >
                  {oneClickProcessing.preparation ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <FastForward className="h-7 w-7" />
                  )}
                  <span>一鍵執藥</span>
                </button>

                <button
                  onClick={handleOneClickVerify}
                  disabled={oneClickProcessing.verification || !currentDayWorkflowRecords.some(r => {
                    const prescription = prescriptions.find(p => p.id === r.prescription_id);
                    return r.verification_status === 'pending' &&
                           r.preparation_status === 'completed' &&
                           prescription?.preparation_method !== 'immediate';
                  })}
                  className="btn-primary flex items-center space-x-1 text-xs px-2 py-1 lg:w-full xl:w-auto"
                >
                  {oneClickProcessing.verification ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <CheckSquare className="h-7 w-7" />
                  )}
                  <span>一鍵核藥</span>
                </button>

                <button
                  onClick={handleOneClickDispense}
                  disabled={oneClickProcessing.dispensing || !currentDayWorkflowRecords.some(r => {
                    const prescription = prescriptions.find(p => p.id === r.prescription_id);
                    return r.dispensing_status === 'pending' &&
                           r.verification_status === 'completed' &&
                           prescription?.administration_route !== '注射' &&
                           !(prescription?.inspection_rules && prescription.inspection_rules.length > 0);
                  })}
                  className="btn-primary flex items-center space-x-1 text-xs px-2 py-1 lg:w-full xl:w-auto"
                >
                  {oneClickProcessing.dispensing ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <Users className="h-7 w-7" />
                  )}
                  <span>一鍵派藥</span>
                </button>

                <button
                  onClick={handleOneClickDispenseSpecial}
                  disabled={oneClickProcessing.dispensing || !currentDayWorkflowRecords.some(r => {
                    const prescription = prescriptions.find(p => p.id === r.prescription_id);
                    return r.dispensing_status === 'pending' && canOneClickDispense(prescription);
                  })}
                  className="btn-primary flex items-center space-x-1 text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 lg:w-full xl:w-auto"
                >
                  {oneClickProcessing.dispensing ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <Zap className="h-7 w-7" />
                  )}
                  <span>一鍵全程</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 工作流程表格 */}
      {selectedPatientId ? (
        <div className="card overflow-hidden">
          {activePrescriptions.length > 0 ? (
            <>
              {/* 備藥方式分類標籤 */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-1 p-2">
                  <button
                    onClick={() => setPreparationFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preparationFilter === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    全部 ({activePrescriptions.length})
                  </button>
                  <button
                    onClick={() => setPreparationFilter('advanced')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preparationFilter === 'advanced'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    提前備藥 ({activePrescriptions.filter(p => p.preparation_method === 'advanced').length})
                  </button>
                  <button
                    onClick={() => setPreparationFilter('immediate')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      preparationFilter === 'immediate'
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    即時備藥 ({activePrescriptions.filter(p => p.preparation_method === 'immediate').length})
                  </button>
                </div>
              </div>

              {filteredPrescriptions.length > 0 ? (
                <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        行號
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        藥物詳情
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        使用次數
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        劑量
                    </th>
                    {weekDates.map((date) => {
                      const d = new Date(date);
                      const month = d.getMonth() + 1;
                      const dayOfMonth = d.getDate();
                      const weekdayIndex = d.getDay();
                      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                      const weekday = weekdays[weekdayIndex];
                      const isSelectedDate = date === selectedDate;
                      return (
                        <th
                          key={date}
                          className={`px-1 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                            isSelectedDate ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-blue-50'
                          }`}
                          onClick={() => setSelectedDate(date)}
                          title={`點擊跳轉到 ${month}/${dayOfMonth}`}
                        >
                          {month}/{dayOfMonth}<br/>({weekday})
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPrescriptions.map((prescription, index) => {
                    const timeSlots = prescription.medication_time_slots || [];
                    
                    return (
                      <tr 
                        key={prescription.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onDoubleClick={() => {
                          setSelectedPrescription(prescription);
                          setShowModal(true);
                        }}
                        title="雙擊編輯處方"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">{prescription.medication_name}</div>
                            <div className="text-xs text-gray-600">
                              開始: {new Date(prescription.start_date).toLocaleDateString('zh-TW')}
                            </div>
                            {prescription.end_date && (
                              <div className="text-xs text-gray-600">
                                結束: {new Date(prescription.end_date).toLocaleDateString('zh-TW')}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              處方: {new Date(prescription.prescription_date).toLocaleDateString('zh-TW')}
                            </div>
                            <div className="text-xs text-gray-600">
                              來源: {prescription.medication_source || '未指定'}
                            </div>
                            {prescription.notes && (
                              <div className="text-xs text-red-600">
                                注意: {prescription.notes}
                              </div>
                            )}
                            {prescription.inspection_rules && prescription.inspection_rules.length > 0 && (
                              <div className="text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                有檢測項要求
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {prescription.is_prn && (
                              <div className="text-red-600 font-bold">PRN (需要時)</div>
                            )}
                            <div>
                              {(() => {
                                // 根據每日服用次數顯示標準縮寫
                                const getFrequencyAbbreviation = (count: number) => {
                                  switch (count) {
                                    case 1: return 'QD';
                                    case 2: return 'BD';
                                    case 3: return 'TDS';
                                    case 4: return 'QID';
                                    default: return `${count}次/日`;
                                  }
                                };
                                
                                const { frequency_type, frequency_value, specific_weekdays, is_odd_even_day, daily_frequency } = prescription;
                                
                                switch (frequency_type) {
                                  case 'daily':
                                    return getFrequencyAbbreviation(daily_frequency || 1);
                                  case 'every_x_days':
                                    return `每隔${frequency_value}日`;
                                  case 'every_x_months':
                                    return `每隔${frequency_value}月`;
                                  case 'weekly_days':
                                    const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
                                    const days = specific_weekdays?.map((day: number) => dayNames[day - 1]).join('、') || '';
                                    return `逢${days}`;
                                  case 'odd_even_days':
                                    return is_odd_even_day === 'odd' ? '單日服' : is_odd_even_day === 'even' ? '雙日服' : '單雙日服';
                                  case 'hourly':
                                    return `每${frequency_value}小時`;
                                  default:
                                    return getFrequencyAbbreviation(daily_frequency || 1);
                                }
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          每次 {prescription.dosage_amount || '1'}{prescription.dosage_unit || ''}
                        </td>
                        {weekDates.map((date) => {
                          const isSelectedDate = date === selectedDate;
                          return (
                          <td key={date} className={`px-1 py-2 ${
                            isSelectedDate ? 'bg-blue-50' : ''
                          }`}>
                            <div className="space-y-1">
                              {timeSlots.map((timeSlot: string) => {
                                // 查找對應的工作流程記錄
                                const workflowRecord = allWorkflowRecords.find(r => 
                                  r.prescription_id === prescription.id &&
                                  r.scheduled_date === date &&
                                  r.scheduled_time.substring(0, 5) === timeSlot
                                );

                                return (
                                  <div key={timeSlot} className="border border-gray-200 rounded-lg p-1 bg-white">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-medium text-gray-900">{timeSlot}</div>
                                      {prescription.meal_timing && (
                                        <div className="text-xs text-gray-500">{prescription.meal_timing}</div>
                                      )}
                                    </div>
                                    
                                    {workflowRecord ? (
                                      <div className="grid grid-cols-3 gap-1">
                                        <WorkflowCell
                                          record={workflowRecord}
                                          step="preparation"
                                          onStepClick={handleStepClick}
                                          selectedDate={selectedDate}
                                        />
                                        <WorkflowCell
                                          record={workflowRecord}
                                          step="verification"
                                          onStepClick={handleStepClick}
                                          selectedDate={selectedDate}
                                        />
                                        <WorkflowCell
                                          record={workflowRecord}
                                          step="dispensing"
                                          onStepClick={handleStepClick}
                                          selectedDate={selectedDate}
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-center text-xs text-gray-400">
                                        {(() => {
                                          const selectedDateObj = new Date(date);
                                          const startDate = new Date(prescription.start_date);
                                          
                                          // 檢查是否在開始日期之前
                                          if (selectedDateObj < startDate) {
                                            return '無處方';
                                          }
                                          
                                          // 檢查是否在結束日期之後
                                          if (prescription.end_date) {
                                            const endDate = new Date(prescription.end_date);
                                            if (selectedDateObj > endDate) {
                                              return '無處方';
                                            }
                                          }
                                          
                                          // 在處方有效期內但沒有工作流程記錄
                                          return '無記錄';
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              ) : (
                <div className="text-center py-12">
                  <Filter className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">此分類暫無處方</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Pill className="h-24 w-24 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedPatient ? '此院友暫無在服處方' : '請選擇院友'}
              </h3>
              <p className="text-gray-600">
                {selectedPatient ? '請先在處方管理中為此院友新增處方' : '選擇院友後即可查看其藥物工作流程'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8">
          <div className="text-center">
            <User className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">請選擇院友</h3>
            <p className="text-gray-600 mb-6">選擇院友後即可查看其藥物工作流程</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">使用說明</h4>
              </div>
              <div className="text-sm text-blue-800 space-y-2 text-left">
                <p><strong>1. 選擇院友：</strong>在上方下拉選單中選擇要處理的院友</p>
                <p><strong>2. 生成工作流程：</strong>點擊「生成工作流程」按鈕為該院友創建當日的藥物任務</p>
                <p><strong>3. 執行任務：</strong>依序點擊「執藥」→「核藥」→「派藥」完成流程</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 處方編輯模態框 */}
      {showModal && selectedPrescription && (
        <PrescriptionModal
          prescription={selectedPrescription}
          onClose={() => {
            setShowModal(false);
            setSelectedPrescription(null);
          }}
        />
      )}

      {/* 檢測項檢查模態框 */}
      {showInspectionCheckModal && selectedWorkflowRecord && (
        <InspectionCheckModal
          workflowRecord={selectedWorkflowRecord}
          onClose={() => {
            setShowInspectionCheckModal(false);
            setSelectedWorkflowRecord(null);
            setSelectedStep('');
          }}
          onResult={handleDispenseAfterInspection}
        />
      )}

      {/* 派藥確認模態框 */}
      {showDispenseConfirmModal && selectedWorkflowRecord && (
        <DispenseConfirmModal
          workflowRecord={selectedWorkflowRecord}
          prescription={prescriptions.find(p => p.id === selectedWorkflowRecord.prescription_id)}
          onClose={() => {
            setShowDispenseConfirmModal(false);
            setSelectedWorkflowRecord(null);
            setSelectedStep('');
            setCurrentInjectionRecord(null);
          }}
          onConfirm={handleDispenseConfirm}
        />
      )}

      {/* 撤銷確認模態框 */}
      {showRevertConfirmModal && revertActionRecord && (
        <RevertConfirmModal
          isOpen={showRevertConfirmModal}
          onClose={() => {
            setShowRevertConfirmModal(false);
            setRevertActionRecord(null);
            setRevertActionStep('');
          }}
          workflowRecord={revertActionRecord}
          step={revertActionStep as any}
          onConfirm={() => handleRevertStep(revertActionRecord.id, revertActionStep)}
        />
      )}

      {/* 注射位置選擇模態框 */}
      {showInjectionSiteModal && currentInjectionRecord && (
        <InjectionSiteModal
          isOpen={showInjectionSiteModal}
          onClose={() => {
            setShowInjectionSiteModal(false);
            setCurrentInjectionRecord(null);
          }}
          workflowRecord={currentInjectionRecord}
          onSiteSelected={handleInjectionSiteSelected}
        />
      )}
    </div>
  );
};

export default MedicationWorkflow;