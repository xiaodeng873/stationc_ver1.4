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
  Syringe,
  Trash2
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from '../components/PatientAutocomplete';
import PrescriptionModal from '../components/PrescriptionModal';
import DispenseConfirmModal from '../components/DispenseConfirmModal';
import InspectionCheckModal from '../components/InspectionCheckModal';
import InjectionSiteModal from '../components/InjectionSiteModal';
import RevertConfirmModal from '../components/RevertConfirmModal';
import WorkflowDeduplicateModal from '../components/WorkflowDeduplicateModal';
import { generateDailyWorkflowRecords, generateBatchWorkflowRecords } from '../utils/workflowGenerator';
import { diagnoseWorkflowDisplayIssue } from '../utils/diagnoseTool';
import { supabase } from '../lib/supabase';

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

  // 判斷是否為自理處方
  const isSelfCare = prescription?.preparation_method === 'custom';

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
    if (isSelfCare) return false;

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
    if (!isClickable() || isSelfCare) return;
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

  // 自理處方：淡藍色背景，不可點擊（優先級最高）
  let cellClass = '';
  if (isSelfCare) {
    cellClass = 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed';
  }
  // 檢測項背景色覆蓋
  else {
    cellClass = `${getStatusColor()} ${isClickable() ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed'} ${isImmediatePreparation && (step === 'preparation' || step === 'verification') ? 'bg-gray-200 text-gray-500' : ''}`;

    // 如果是派藥格子且有檢測項結果，根據是否合格覆蓋背景色
    if (step === 'dispensing' && status === 'completed' && inspectionPassed !== null) {
      if (inspectionPassed) {
        cellClass = `bg-green-50 text-green-800 border-green-200 ${isClickable() ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed'}`;
      } else {
        cellClass = `bg-red-50 text-red-800 border-red-200 ${isClickable() ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed'}`;
      }
    }
  }

  // 自理處方：只顯示「自理」文字
  if (isSelfCare) {
    return (
      <div
        className={`px-2 py-2 border rounded text-center text-xs transition-all duration-200 ${cellClass}`}
        title="自理處方，無需執核派操作"
      >
        <div className="font-medium text-sm">自理</div>
      </div>
    );
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
    hospitalEpisodes,
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
  const [autoGenerationChecked, setAutoGenerationChecked] = useState(false);
  const [showDeduplicateModal, setShowDeduplicateModal] = useState(false);

  // 防抖控制：使用 ref 追蹤生成狀態，防止併發
  const isGeneratingRef = React.useRef(false);
  const generationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 計算一週日期（周日開始）
  const computeWeekDates = (dateStr: string): string[] => {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0=週日, 1=週一, ..., 6=週六
    const diff = date.getDate() - day;
    const sunday = new Date(date);
    sunday.setDate(diff);
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      week.push(d.toISOString().split('T')[0]);
    }

    // 調試日誌：顯示週期計算詳情
    console.log(`📅 週期計算: 輸入日期 ${dateStr} (星期${['日','一','二','三','四','五','六'][day]})`);
    console.log(`   週日起始: ${week[0]}`);
    console.log(`   週期範圍: ${week[0]} ~ ${week[6]}`);

    return week;
  };

  const weekDates = useMemo(() => computeWeekDates(selectedDate), [selectedDate]);

  // 檢查處方是否應在指定日期服藥（與 Edge Function 邏輯一致）
  const shouldTakeMedicationOnDate = (prescription: any, targetDate: Date): boolean => {
    const { frequency_type, frequency_value, specific_weekdays, is_odd_even_day } = prescription;
    const startDate = new Date(prescription.start_date);

    switch (frequency_type) {
      case 'daily':
        return true; // 每日服

      case 'every_x_days':
        // 隔X日服
        const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const daysDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
        const interval = frequency_value || 1;
        return daysDiff % interval === 0;

      case 'weekly_days':
        // 逢星期X服
        const dayOfWeek = targetDate.getDay(); // 0=週日, 1=週一, ..., 6=週六
        const targetDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 轉換為 1-7 格式
        return specific_weekdays?.includes(targetDay) || false;

      case 'odd_even_days':
        // 單日/雙日服
        const dateNumber = targetDate.getDate();
        if (is_odd_even_day === 'odd') {
          return dateNumber % 2 === 1; // 單日
        } else if (is_odd_even_day === 'even') {
          return dateNumber % 2 === 0; // 雙日
        }
        return false;

      case 'every_x_months':
        // 隔X月服
        const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
                          (targetDate.getMonth() - startDate.getMonth());
        const monthInterval = frequency_value || 1;
        return monthsDiff % monthInterval === 0 &&
               targetDate.getDate() === startDate.getDate();

      default:
        return true; // 預設為需要服藥
    }
  };

  // 檢查當周工作流程記錄是否完整
  const checkWeekWorkflowCompleteness = async (patientIdNum: number, weekDates: string[]) => {
    try {
      console.log('=== 檢查當周工作流程完整性 ===');
      console.log('院友ID:', patientIdNum);
      console.log('檢查週期:', weekDates[0], '至', weekDates[6]);

      // 查詢該院友的所有在服處方
      const activePrescriptionsForPatient = prescriptions.filter(p => {
        if (p.patient_id.toString() !== patientIdNum.toString() || p.status !== 'active') {
          return false;
        }
        return true;
      });

      console.log('在服處方數量:', activePrescriptionsForPatient.length);

      if (activePrescriptionsForPatient.length === 0) {
        console.log('此院友無在服處方，無需生成工作流程');
        return { complete: true, shouldGenerate: false };
      }

      // 計算當周應該生成的記錄總數（考慮頻率規則）
      let expectedRecordsCount = 0;
      const expectedDetails: string[] = [];

      weekDates.forEach(date => {
        activePrescriptionsForPatient.forEach(prescription => {
          const dateObj = new Date(date);
          const startDate = new Date(prescription.start_date);
          const endDate = prescription.end_date ? new Date(prescription.end_date) : null;

          // 檢查日期是否在處方有效期內
          if (dateObj >= startDate && (!endDate || dateObj <= endDate)) {
            // 檢查是否根據頻率規則需要服藥
            if (shouldTakeMedicationOnDate(prescription, dateObj)) {
              const timeSlots = prescription.medication_time_slots || [];
              expectedRecordsCount += timeSlots.length;
              expectedDetails.push(`${date}: ${prescription.medication_name} x${timeSlots.length}`);
            }
          }
        });
      });

      console.log('預期記錄數量:', expectedRecordsCount);
      console.log('預期記錄明細:', expectedDetails);

      // 查詢當周實際存在的記錄數量
      const { data: existingRecords, error } = await supabase
        .from('medication_workflow_records')
        .select('id, scheduled_date, prescription_id', { count: 'exact' })
        .eq('patient_id', patientIdNum)
        .gte('scheduled_date', weekDates[0])
        .lte('scheduled_date', weekDates[6]);

      if (error) {
        console.error('查詢現有記錄失敗:', error);
        return { complete: false, shouldGenerate: false };
      }

      const actualRecordsCount = existingRecords?.length || 0;
      console.log('實際記錄數量:', actualRecordsCount);

      // 如果記錄數量差距過大，輸出詳細信息
      if (actualRecordsCount < expectedRecordsCount) {
        const existingByDate: { [date: string]: number } = {};
        existingRecords?.forEach(record => {
          existingByDate[record.scheduled_date] = (existingByDate[record.scheduled_date] || 0) + 1;
        });
        console.log('實際記錄按日期分布:', existingByDate);
        console.log('缺少記錄數:', expectedRecordsCount - actualRecordsCount);
      }

      const isComplete = actualRecordsCount >= expectedRecordsCount;
      console.log('完整性檢查結果:', isComplete ? '完整' : '不完整');

      return { complete: isComplete, shouldGenerate: !isComplete && expectedRecordsCount > 0 };
    } catch (error) {
      console.error('檢查工作流程完整性失敗:', error);
      return { complete: false, shouldGenerate: false };
    }
  };

  // 自動生成當周工作流程記錄（添加防抖鎖定）
  const autoGenerateWeekWorkflow = async (patientIdNum: number, weekDates: string[]) => {
    // 檢查是否正在生成，防止併發
    if (isGeneratingRef.current) {
      console.log('⚠️ 已有生成任務進行中，跳過此次請求');
      return { success: false, message: '生成任務進行中', totalRecords: 0, failedDates: [] };
    }

    try {
      // 設置生成鎖定
      isGeneratingRef.current = true;

      console.log('=== 開始自動生成當周工作流程 ===');
      console.log('院友ID:', patientIdNum);
      console.log('生成週期:', weekDates[0], '至', weekDates[6]);

      const startDate = weekDates[0];
      const endDate = weekDates[6];

      const result = await generateBatchWorkflowRecords(startDate, endDate, patientIdNum);

      if (result.success) {
        console.log('✓ 自動生成完成:', result.message);
        console.log('生成記錄數:', result.totalRecords);

        // 等待 500ms 確保 Supabase 數據一致性
        await new Promise(resolve => setTimeout(resolve, 500));

        // 直接查詢 Supabase 重新載入數據
        const { data, error } = await supabase
          .from('medication_workflow_records')
          .select('*')
          .eq('patient_id', patientIdNum)
          .gte('scheduled_date', weekDates[0])
          .lte('scheduled_date', weekDates[6])
          .order('scheduled_date')
          .order('scheduled_time');

        if (!error && data) {
          setAllWorkflowRecords(data);
          console.log(`✅ 自動載入完成: ${data.length} 筆記錄`);
        } else {
          console.error('❌ 自動載入失敗:', error);
        }
      } else {
        console.warn('⚠️ 自動生成部分失敗:', result.message);
        if (result.failedDates && result.failedDates.length > 0) {
          console.warn('失敗的日期:', result.failedDates);
        }

        // 即使部分失敗，也嘗試重新載入已成功生成的數據
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data } = await supabase
          .from('medication_workflow_records')
          .select('*')
          .eq('patient_id', patientIdNum)
          .gte('scheduled_date', weekDates[0])
          .lte('scheduled_date', weekDates[6])
          .order('scheduled_date')
          .order('scheduled_time');

        if (data) {
          setAllWorkflowRecords(data);
          console.log(`✅ 部分成功載入: ${data.length} 筆記錄`);
        }
      }

      return result;
    } catch (error) {
      console.error('自動生成工作流程失敗:', error);
      return { success: false, message: '自動生成失敗', totalRecords: 0, failedDates: [] };
    } finally {
      // 釋放生成鎖定
      isGeneratingRef.current = false;
    }
  };

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

  // 自動檢測並生成當周工作流程（添加防抖延遲）
  useEffect(() => {
    // 清除之前的定時器
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }

    const checkAndGenerateWorkflow = async () => {
      if (!selectedPatientId || autoGenerationChecked || weekDates.length === 0) {
        return;
      }

      const patientIdNum = parseInt(selectedPatientId);
      if (isNaN(patientIdNum)) {
        return;
      }

      // 等待處方數據載入完成
      if (prescriptions.length === 0) {
        return;
      }

      // 檢查是否正在生成
      if (isGeneratingRef.current) {
        console.log('⚠️ 生成任務進行中，延後檢查');
        return;
      }

      console.log('\n====================================');
      console.log('自動檢測當周工作流程記錄');
      console.log('====================================');

      const { complete, shouldGenerate } = await checkWeekWorkflowCompleteness(patientIdNum, weekDates);

      if (shouldGenerate) {
        console.log('檢測到當周工作流程不完整，開始自動生成...');
        await autoGenerateWeekWorkflow(patientIdNum, weekDates);
      } else if (complete) {
        console.log('當周工作流程記錄已完整，無需生成');
      }

      setAutoGenerationChecked(true);
      console.log('====================================\n');
    };

    // 添加 300ms 防抖延遲，避免快速切換時重複觸發
    generationTimeoutRef.current = setTimeout(() => {
      checkAndGenerateWorkflow();
    }, 300);

    // 清理函數
    return () => {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
    };
  }, [selectedPatientId, weekDates, prescriptions, autoGenerationChecked]);

  // 當院友或日期改變時，重置自動生成標記
  useEffect(() => {
    setAutoGenerationChecked(false);
  }, [selectedPatientId, selectedDate]);

  // 當 weekDates 或 patient 改變時，清空並重新載入一週記錄
  useEffect(() => {
    if (selectedPatientId && weekDates.length > 0) {
      console.log('\n🔄 重新載入當周工作流程記錄');
      console.log('院友ID:', selectedPatientId);
      console.log('週期:', weekDates[0], '至', weekDates[6]);

      setAllWorkflowRecords([]);
      const patientIdNum = parseInt(selectedPatientId);
      if (!isNaN(patientIdNum)) {
        (async () => {
          console.log('🔍 開始查詢 Supabase...');
          // 一次性載入整週的記錄（更高效）
          const { data, error } = await supabase
            .from('medication_workflow_records')
            .select('*')
            .eq('patient_id', patientIdNum)
            .gte('scheduled_date', weekDates[0])
            .lte('scheduled_date', weekDates[6])
            .order('scheduled_date')
            .order('scheduled_time');

          if (error) {
            console.error('❌ 載入當周記錄失敗:', error);
          } else {
            console.log(`✅ 成功載入當周記錄: ${data?.length || 0} 筆`);

            // 按日期統計記錄
            const byDate: Record<string, number> = {};
            const byPrescription: Record<string, number> = {};
            data?.forEach(record => {
              byDate[record.scheduled_date] = (byDate[record.scheduled_date] || 0) + 1;
              byPrescription[record.prescription_id] = (byPrescription[record.prescription_id] || 0) + 1;
            });

            console.log('📊 按日期分布:');
            weekDates.forEach(date => {
              const count = byDate[date] || 0;
              console.log(`  ${date}: ${count} 筆${count === 0 ? ' ⚠️' : ''}`);
            });

            console.log('📊 按處方分布:');
            Object.entries(byPrescription).forEach(([prescId, count]) => {
              console.log(`  ${prescId.substring(0, 8)}...: ${count} 筆`);
            });

            // 直接設置到 allWorkflowRecords，跳過 context
            console.log(`📝 設置 allWorkflowRecords: ${data?.length || 0} 筆`);
            setAllWorkflowRecords(data || []);
          }
        })();
      }
    }
  }, [selectedPatientId, JSON.stringify(weekDates)]);

  // 監聽 context 的 prescriptionWorkflowRecords 改變，合併/替換到本地 allWorkflowRecords
  useEffect(() => {
    if (selectedPatientId) {
      setAllWorkflowRecords(prev => {
        const newRecords = prescriptionWorkflowRecords.filter(r => r.patient_id.toString() === selectedPatientId);

        if (newRecords.length === 0) {
          console.log('⚠️ Context 中沒有新記錄，保持現有記錄');
          return prev;
        }

        console.log(`🔄 Context 更新: 收到 ${newRecords.length} 筆新記錄`);

        // 獲取這次更新涉及的所有日期
        const updatedDates = [...new Set(newRecords.map(r => r.scheduled_date))];
        console.log(`📅 更新涉及日期:`, updatedDates);

        // 移除這些日期的舊記錄
        const filteredPrev = prev.filter(r => !updatedDates.includes(r.scheduled_date));
        const merged = [...filteredPrev, ...newRecords];

        console.log(`📝 合併後記錄數: ${prev.length} -> ${merged.length}`);
        return merged;
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
  
  // 獲取當周所有工作流程記錄涉及的處方ID
  const weekPrescriptionIds = useMemo(() => {
    const ids = new Set<string>();
    allWorkflowRecords.forEach(record => {
      ids.add(record.prescription_id);
    });
    console.log(`📋 當周工作流程記錄數: ${allWorkflowRecords.length}`);
    console.log(`📋 涉及的處方ID數: ${ids.size}`);
    if (ids.size > 0) {
      console.log(`📋 處方ID列表:`, Array.from(ids));
    }
    return ids;
  }, [allWorkflowRecords]);

  // 過濾處方：顯示在服處方 + 停用但在當周有工作流程記錄的處方
  const activePrescriptions = useMemo(() => {
    console.log(`\n🔍 開始過濾處方 (院友ID: ${selectedPatientId}, 週期: ${weekDates[0]} ~ ${weekDates[6]})`);

    const filtered = prescriptions.filter(p => {
      if (p.patient_id.toString() !== selectedPatientId) {
        return false;
      }

      // 如果是在服處方，檢查日期有效性（使用週範圍而非單一日期）
      if (p.status === 'active') {
        // 使用週範圍的開始和結束日期進行檢查
        const weekStart = new Date(weekDates[0]);
        const weekEnd = new Date(weekDates[6]);
        const startDate = new Date(p.start_date);

        // 處方必須在週結束日期之前或當天開始
        if (startDate > weekEnd) {
          console.log(`  ❌ ${p.medication_name}: start_date(${p.start_date}) > weekEnd(${weekDates[6]})`);
          return false;
        }

        // 如果有結束日期，處方必須在週開始日期之後或當天結束
        if (p.end_date) {
          const endDate = new Date(p.end_date);
          if (endDate < weekStart) {
            console.log(`  ❌ ${p.medication_name}: end_date(${p.end_date}) < weekStart(${weekDates[0]})`);
            return false;
          }
        }

        console.log(`  ✅ ${p.medication_name} (active): 通過日期檢查`);
        return true;
    }

      // 如果是停用處方，檢查當周是否有相關工作流程記錄
      if (p.status === 'inactive') {
        const hasRecords = weekPrescriptionIds.has(p.id);
        console.log(`  ${hasRecords ? '✅' : '❌'} ${p.medication_name} (inactive): ${hasRecords ? '有' : '無'}工作流程記錄`);
        return hasRecords;
      }

      // 其他狀態（如 pending_change）不顯示
      console.log(`  ⏭️  ${p.medication_name} (${p.status}): 跳過`);
      return false;
    });

    console.log(`🔍 過濾結果: ${filtered.length} 個處方通過`);
    return filtered;
  }, [prescriptions, selectedPatientId, weekDates, weekPrescriptionIds]);

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
      return;
    }

    // 驗證 selectedPatientId 是否為有效數字
    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
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
      return;
    }

    const record = allWorkflowRecords.find(r => r.id === recordId);
    if (!record) return;

    try {
      await revertPrescriptionWorkflowStep(recordId, step as any, patientIdNum, record.scheduled_date);
    } catch (error) {
      console.error(`撤銷${step}失敗:`, error);
    }
  };

  // 檢查服藥時間點是否在入院期間
  const isInHospitalizationPeriod = (patientId: number, scheduledDate: string, scheduledTime: string): boolean => {
    console.log('🔍 檢查入院期間:', { patientId, scheduledDate, scheduledTime });
    console.log('📋 所有住院事件:', hospitalEpisodes);

    // 不限制狀態，檢查所有住院事件（active 和 completed 都要）
    const patientEpisodes = hospitalEpisodes.filter(ep => ep.patient_id === patientId);
    console.log('👤 病人的所有住院事件:', patientEpisodes);

    if (patientEpisodes.length === 0) {
      console.log('❌ 沒有住院事件');
      return false;
    }

    // 服藥時間點
    const medicationDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    console.log('⏰ 服藥時間:', medicationDateTime.toISOString());

    // 檢查所有住院事件，看服藥時間是否落在任何一個入院期間
    for (const episode of patientEpisodes) {
      console.log('📌 檢查住院事件:', episode);

      if (!episode.episode_events || episode.episode_events.length === 0) {
        console.log('  ⚠️ 此事件沒有事件記錄，跳過');
        continue;
      }

      // 找出該住院事件的所有入院和出院事件
      const admissionEvents = episode.episode_events
        .filter((e: any) => e.event_type === 'admission')
        .sort((a: any, b: any) => {
          const dateA = new Date(`${a.event_date}T${a.event_time || '00:00:00'}`);
          const dateB = new Date(`${b.event_date}T${b.event_time || '00:00:00'}`);
          return dateA.getTime() - dateB.getTime(); // 按時間順序排序
        });

      const dischargeEvents = episode.episode_events
        .filter((e: any) => e.event_type === 'discharge')
        .sort((a: any, b: any) => {
          const dateA = new Date(`${a.event_date}T${a.event_time || '00:00:00'}`);
          const dateB = new Date(`${b.event_date}T${b.event_time || '00:00:00'}`);
          return dateA.getTime() - dateB.getTime(); // 按時間順序排序
        });

      console.log('  🏥 入院事件:', admissionEvents);
      console.log('  🚪 出院事件:', dischargeEvents);

      // 檢查每個入院事件
      for (const admission of admissionEvents) {
        console.log('  🔍 入院事件原始資料:', admission);
        console.log('  📅 event_date:', admission.event_date, '類型:', typeof admission.event_date);
        console.log('  ⏰ event_time:', admission.event_time, '類型:', typeof admission.event_time);

        const admissionDateTime = new Date(`${admission.event_date}T${admission.event_time || '00:00:00'}`);
        console.log('  🏥 入院時間:', admissionDateTime.toISOString(), 'isValid:', !isNaN(admissionDateTime.getTime()));

        // 如果服藥時間早於入院時間，跳過此入院事件
        if (medicationDateTime < admissionDateTime) {
          console.log('  ❌ 服藥時間在此入院之前，跳過');
          continue;
        }

        // 找出此入院後的第一個出院事件
        const nextDischarge = dischargeEvents.find((discharge: any) => {
          const dischargeDateTime = new Date(`${discharge.event_date}T${discharge.event_time || '00:00:00'}`);
          return dischargeDateTime > admissionDateTime;
        });

        if (nextDischarge) {
          console.log('  🔍 出院事件原始資料:', nextDischarge);
          console.log('  📅 event_date:', nextDischarge.event_date, '類型:', typeof nextDischarge.event_date);
          console.log('  ⏰ event_time:', nextDischarge.event_time, '類型:', typeof nextDischarge.event_time);

          const dischargeDateTime = new Date(`${nextDischarge.event_date}T${nextDischarge.event_time || '00:00:00'}`);
          console.log('  🚪 對應出院時間:', dischargeDateTime.toISOString(), 'isValid:', !isNaN(dischargeDateTime.getTime()));

          // 檢查服藥時間是否在入院和出院之間
          if (medicationDateTime >= admissionDateTime && medicationDateTime < dischargeDateTime) {
            console.log('  ✅ 服藥時間在此入院期間內！');
            return true;
          } else {
            console.log('  ❌ 服藥時間不在此入院期間內');
          }
        } else {
          // 沒有對應的出院事件，表示仍在住院中
          console.log('  📌 此入院尚未出院');
          if (medicationDateTime >= admissionDateTime) {
            console.log('  ✅ 服藥時間在入院之後（尚未出院）！');
            return true;
          }
        }
      }
    }

    console.log('❌ 服藥時間不在任何入院期間內');
    return false;
  };

  // 處理完成工作流程步驟
  const handleCompleteWorkflowStep = async (recordId: string, step: string) => {
    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
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

        // 檢查服藥時間點是否在入院期間
        const inHospitalizationPeriod = isInHospitalizationPeriod(
          patientIdNum,
          record.scheduled_date,
          record.scheduled_time
        );

        // 如果在入院期間，直接寫入"入院"失敗，不彈出任何對話框
        if (inHospitalizationPeriod) {
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

  // 一鍵執藥（僅當日）- 優化並行處理
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
      console.log('=== 一鍵執藥開始 ===');
      // 找到所有待執藥的記錄（排除即時備藥）
      const pendingPreparationRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);
        return r.preparation_status === 'pending' && prescription?.preparation_method !== 'immediate';
      });

      if (pendingPreparationRecords.length === 0) {
        console.log('沒有需要執藥的記錄');
        return;
      }

      console.log(`找到 ${pendingPreparationRecords.length} 筆待執藥記錄`);

      // 並行處理所有執藥操作
      const results = await Promise.allSettled(
        pendingPreparationRecords.map(record =>
          prepareMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate)
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      console.log(`一鍵執藥完成: 成功 ${successCount} 筆, 失敗 ${failCount} 筆`);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`執藥失敗 (記錄ID: ${pendingPreparationRecords[index].id}):`, result.reason);
        }
      });
    } catch (error) {
      console.error('一鍵執藥失敗:', error);
    } finally {
      setOneClickProcessing(prev => ({ ...prev, preparation: false }));
    }
  };

  // 一鍵核藥（僅當日）- 優化並行處理
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
      console.log('=== 一鍵核藥開始 ===');
      // 找到所有待核藥且執藥已完成的記錄（排除即時備藥）
      const pendingVerificationRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);
        return r.verification_status === 'pending' &&
               r.preparation_status === 'completed' &&
               prescription?.preparation_method !== 'immediate';
      });

      if (pendingVerificationRecords.length === 0) {
        console.log('沒有需要核藥的記錄');
        return;
      }

      console.log(`找到 ${pendingVerificationRecords.length} 筆待核藥記錄`);

      // 並行處理所有核藥操作
      const results = await Promise.allSettled(
        pendingVerificationRecords.map(record =>
          verifyMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate)
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      console.log(`一鍵核藥完成: 成功 ${successCount} 筆, 失敗 ${failCount} 筆`);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`核藥失敗 (記錄ID: ${pendingVerificationRecords[index].id}):`, result.reason);
        }
      });
    } catch (error) {
      console.error('一鍵核藥失敗:', error);
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

  // 一鍵派藥（即時備藥+口服+無檢測項）- 優化並行處理
  const handleOneClickDispenseSpecial = async () => {
    if (!selectedPatientId || !selectedDate) {
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      return;
    }

    setOneClickProcessing(prev => ({ ...prev, dispensing: true }));

    try {
      console.log('=== 一鍵全程開始 ===');
      // 找到符合一鍵派藥條件的記錄
      const eligibleRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);
        return r.dispensing_status === 'pending' && canOneClickDispense(prescription);
      });

      if (eligibleRecords.length === 0) {
        console.log('沒有符合一鍵全程條件的記錄');
        return;
      }

      console.log(`找到 ${eligibleRecords.length} 筆符合條件的記錄`);

      // 並行處理所有記錄
      const results = await Promise.allSettled(
        eligibleRecords.map(async (record) => {
          // 檢查此筆記錄的服藥時間是否在入院期間
          const inHospitalizationPeriod = isInHospitalizationPeriod(
            patientIdNum,
            record.scheduled_date,
            record.scheduled_time
          );

          // 一鍵完成執藥、核藥、派藥
          await prepareMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
          await verifyMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);

          if (inHospitalizationPeriod) {
            // 如果服藥時間在入院期間，自動標記為「入院」失敗原因
            await dispenseMedication(record.id, displayName || '未知', '入院', undefined, patientIdNum, selectedDate);
            return { type: 'hospitalized' };
          } else {
            // 正常派藥
            await dispenseMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
            return { type: 'success' };
          }
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.type === 'success').length;
      const hospitalizedCount = results.filter(r => r.status === 'fulfilled' && r.value.type === 'hospitalized').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      console.log(`一鍵全程完成: 成功 ${successCount} 筆, 入院 ${hospitalizedCount} 筆, 失敗 ${failCount} 筆`);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`一鍵全程失敗 (記錄ID: ${eligibleRecords[index].id}):`, result.reason);
        }
      });
    } catch (error) {
      console.error('一鍵全程失敗:', error);
    } finally {
      setOneClickProcessing(prev => ({ ...prev, dispensing: false }));
    }
  };

  // 一鍵派藥（僅當日）- 優化並行處理
  const handleOneClickDispense = async () => {
    if (!selectedPatientId || !selectedDate) {
      return;
    }

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      return;
    }

    setOneClickProcessing(prev => ({ ...prev, dispensing: true }));

    try {
      console.log('=== 一鍵派藥開始 ===');
      // 找到所有待派藥的記錄
      const pendingDispensingRecords = currentDayWorkflowRecords.filter(r => {
        const prescription = prescriptions.find(p => p.id === r.prescription_id);

        // 排除注射類藥物
        if (prescription?.administration_route === '注射') {
          return false;
        }

        // 檢查此筆記錄的服藥時間是否在入院期間
        const inHospitalizationPeriod = isInHospitalizationPeriod(
          patientIdNum,
          r.scheduled_date,
          r.scheduled_time
        );

        // 如果有檢測項要求且院友未入院，排除（需要手動檢測）
        if (prescription?.inspection_rules && prescription.inspection_rules.length > 0 && !inHospitalizationPeriod) {
          return false;
        }

        // 包含：無檢測項的藥物，以及有檢測項但入院中的藥物
        return r.dispensing_status === 'pending' && r.verification_status === 'completed';
      });

      if (pendingDispensingRecords.length === 0) {
        console.log('沒有需要派藥的記錄');
        return;
      }

      console.log(`找到 ${pendingDispensingRecords.length} 筆待派藥記錄`);

      // 並行處理所有派藥操作
      const results = await Promise.allSettled(
        pendingDispensingRecords.map(async (record) => {
          const prescription = prescriptions.find(p => p.id === record.prescription_id);
          const hasInspectionRules = prescription?.inspection_rules && prescription.inspection_rules.length > 0;

          // 檢查此筆記錄的服藥時間是否在入院期間
          const inHospitalizationPeriod = isInHospitalizationPeriod(
            patientIdNum,
            record.scheduled_date,
            record.scheduled_time
          );

          if (inHospitalizationPeriod) {
            // 如果服藥時間在入院期間，自動標記為「入院」失敗原因
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
            return { type: 'hospitalized' };
          } else {
            // 正常派藥（無檢測項要求）
            await dispenseMedication(record.id, displayName || '未知', undefined, undefined, patientIdNum, selectedDate);
            return { type: 'success' };
          }
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.type === 'success').length;
      const hospitalizedCount = results.filter(r => r.status === 'fulfilled' && r.value.type === 'hospitalized').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      console.log(`一鍵派藥完成: 成功 ${successCount} 筆, 入院 ${hospitalizedCount} 筆, 失敗 ${failCount} 筆`);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`派藥失敗 (記錄ID: ${pendingDispensingRecords[index].id}):`, result.reason);
        }
      });
    } catch (error) {
      console.error('一鍵派藥失敗:', error);
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
    }
  };

  // 處理注射位置確認後的派藥
  const handleInjectionSiteSelected = async (injectionSite: string, notes?: string) => {
    if (!currentInjectionRecord) return;

    const patientIdNum = parseInt(selectedPatientId);
    if (isNaN(patientIdNum)) {
      console.error('無效的院友ID:', selectedPatientId);
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
    }
  };

  // 刷新數據（整週）
  const handleRefresh = async () => {
    const patientIdNum = parseInt(selectedPatientId);
    if (!selectedPatientId || selectedPatientId === '' || isNaN(patientIdNum)) {
      console.warn('無效的院友ID，無法刷新數據:', selectedPatientId);
      return;
    }

    setRefreshing(true);
    try {
      console.log('🔄 刷新當週工作流程記錄...');
      console.log('院友ID:', patientIdNum);
      console.log('週期:', weekDates[0], '至', weekDates[6]);

      // 直接查詢 Supabase，載入整週的記錄
      const { data, error } = await supabase
        .from('medication_workflow_records')
        .select('*')
        .eq('patient_id', patientIdNum)
        .gte('scheduled_date', weekDates[0])
        .lte('scheduled_date', weekDates[6])
        .order('scheduled_date')
        .order('scheduled_time');

      if (error) {
        console.error('❌ 刷新失敗:', error);
        throw error;
      }

      console.log(`✅ 刷新成功: 載入 ${data?.length || 0} 筆記錄`);
      // 直接更新 allWorkflowRecords
      setAllWorkflowRecords(data || []);
    } catch (error) {
      console.error('刷新數據失敗:', error);
      alert('刷新數據失敗，請稍後再試');
    } finally {
      setRefreshing(false);
    }
  };

  // 生成本週工作流程記錄（手動觸發）
  const handleGenerateWorkflow = async () => {
    const patientIdNum = parseInt(selectedPatientId);
    if (!selectedPatientId || selectedPatientId === '' || isNaN(patientIdNum)) {
      console.warn('請先選擇院友');
      alert('請先選擇院友');
      return;
    }

    setGenerating(true);
    try {
      console.log('=== 手動生成本週工作流程 ===');
      console.log('生成前記錄數:', allWorkflowRecords.length);

      // 生成整週的工作流程（從週日到週六，共7天）
      const startDate = weekDates[0];
      const endDate = weekDates[6];

      const result = await generateBatchWorkflowRecords(startDate, endDate, patientIdNum);

      if (result.success) {
        console.log('✓ 生成成功:', result.message);
        console.log('生成記錄數:', result.totalRecords);

        // 等待 500ms 確保 Supabase 數據一致性
        await new Promise(resolve => setTimeout(resolve, 500));

        // 重新載入數據 - 使用重試機制
        let retryCount = 0;
        const maxRetries = 3;
        let loadedSuccessfully = false;

        while (retryCount < maxRetries && !loadedSuccessfully) {
          try {
            console.log(`🔄 嘗試重新載入數據 (第 ${retryCount + 1} 次)...`);

            const { data, error } = await supabase
              .from('medication_workflow_records')
              .select('*')
              .eq('patient_id', patientIdNum)
              .gte('scheduled_date', weekDates[0])
              .lte('scheduled_date', weekDates[6])
              .order('scheduled_date')
              .order('scheduled_time');

            if (error) {
              console.error('❌ 查詢失敗:', error);
              throw error;
            }

            console.log(`✅ 查詢成功: 載入 ${data?.length || 0} 筆記錄`);

            // 驗證是否載入到新生成的記錄
            if (data && data.length > 0) {
              setAllWorkflowRecords(data);
              loadedSuccessfully = true;
              console.log('✅ 數據已更新到界面');
              console.log('更新後記錄數:', data.length);

              alert(`✅ 成功生成並載入 ${data.length} 筆工作流程記錄！`);
            } else if (result.totalRecords > 0) {
              // 生成了記錄但查詢不到，需要重試
              console.warn('⚠️ 生成了記錄但查詢不到，等待後重試...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              retryCount++;
            } else {
              // 沒有生成記錄（可能該院友無在服處方）
              setAllWorkflowRecords([]);
              loadedSuccessfully = true;
              alert('此院友目前無在服處方，無工作流程記錄需要生成');
            }
          } catch (error) {
            console.error(`❌ 第 ${retryCount + 1} 次載入失敗:`, error);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!loadedSuccessfully) {
          console.error('❌ 多次重試後仍無法載入數據');
          alert('生成成功，但載入數據失敗。請點擊「刷新」按鈕手動重新載入。');
        }
      } else {
        console.error('⚠️ 生成部分失敗:', result.message);
        if (result.failedDates && result.failedDates.length > 0) {
          console.error('失敗的日期:', result.failedDates);
        }

        // 即使部分失敗，也嘗試重新載入已成功生成的數據
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data } = await supabase
          .from('medication_workflow_records')
          .select('*')
          .eq('patient_id', patientIdNum)
          .gte('scheduled_date', weekDates[0])
          .lte('scheduled_date', weekDates[6])
          .order('scheduled_date')
          .order('scheduled_time');

        if (data) {
          setAllWorkflowRecords(data);
          console.log(`✅ 部分成功: 載入 ${data.length} 筆記錄`);
        }

        alert(`⚠️ ${result.message}\n已載入 ${data?.length || 0} 筆記錄`);
      }
    } catch (error) {
      console.error('生成工作流程記錄失敗:', error);
      alert(`❌ 生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
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

  // 診斷工作流程顯示問題
  const handleDiagnose = async () => {
    const patientIdNum = parseInt(selectedPatientId);
    if (!selectedPatientId || isNaN(patientIdNum)) {
      alert('請先選擇院友');
      return;
    }

    console.log('\n🔍 開始診斷工作流程顯示問題...');
    console.log('當前選擇院友ID:', patientIdNum);
    console.log('當前週期:', weekDates[0], '至', weekDates[6]);
    console.log('本地記錄數量:', allWorkflowRecords.length);

    try {
      const result = await diagnoseWorkflowDisplayIssue(
        patientIdNum,
        weekDates[0],
        weekDates[6]
      );

      if (result) {
        console.log('\n📊 診斷結果摘要:');
        console.log('處方總數:', result.prescriptions.length);
        console.log('  - 在服處方:', result.activePrescCount);
        console.log('  - 停用處方:', result.inactivePrescCount);
        console.log('數據庫記錄數:', result.actualTotal);
        console.log('預期記錄數:', result.expectedTotal);
        console.log('本地記錄數:', allWorkflowRecords.length);
        console.log('匹配狀態:', result.isMatched ? '✅ 完全匹配' : '❌ 不匹配');

        // 如果本地記錄與數據庫不一致，提示刷新
        if (allWorkflowRecords.length !== result.actualTotal) {
          console.warn('⚠️ 本地記錄與數據庫不同步！');
          console.warn(`本地: ${allWorkflowRecords.length} 筆, 數據庫: ${result.actualTotal} 筆`);
          alert(`診斷完成！\n\n發現數據不同步:\n本地記錄: ${allWorkflowRecords.length} 筆\n數據庫記錄: ${result.actualTotal} 筆\n\n建議點擊「刷新」按鈕重新載入數據。\n\n詳細診斷結果請查看瀏覽器控制台（F12）。`);
        } else if (result.actualTotal > result.expectedTotal && result.inactivePrescCount > 0) {
          // 記錄數多於預期，且有停用處方
          alert(`診斷完成！\n\n處方統計:\n- 在服處方: ${result.activePrescCount} 個\n- 停用處方: ${result.inactivePrescCount} 個\n\n記錄統計:\n- 預期記錄: ${result.expectedTotal} 筆\n- 實際記錄: ${result.actualTotal} 筆\n\n⚠️ 記錄數多於預期，可能包含停用處方在停用前生成的記錄。\n這是正常情況，停用處方的歷史記錄會繼續顯示。\n\n詳細診斷結果請查看瀏覽器控制台（F12）。`);
        } else if (!result.isMatched) {
          alert(`診斷完成！\n\n處方統計:\n- 在服處方: ${result.activePrescCount} 個\n- 停用處方: ${result.inactivePrescCount} 個\n\n記錄統計:\n- 預期記錄: ${result.expectedTotal} 筆\n- 實際記錄: ${result.actualTotal} 筆\n\n記錄數不匹配，可能需要重新生成工作流程。\n\n詳細診斷結果請查看瀏覽器控制台（F12）。`);
        } else {
          alert(`診斷完成！\n\n✅ 數據正常\n\n處方統計:\n- 在服處方: ${result.activePrescCount} 個\n- 停用處方: ${result.inactivePrescCount} 個\n\n記錄數: ${result.actualTotal} 筆\n\n詳細診斷結果請查看瀏覽器控制台（F12）。`);
        }
      }
    } catch (error) {
      console.error('❌ 診斷失敗:', error);
      alert('診斷失敗，請查看瀏覽器控制台獲取詳細錯誤信息。');
    }
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
              onClick={handleDiagnose}
              disabled={!selectedPatientId}
              className="btn-secondary flex items-center space-x-2"
              title="診斷工作流程記錄顯示問題"
            >
              <Settings className="h-4 w-4" />
              <span>診斷</span>
            </button>
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
              title="為選定院友生成本週（7天）的藥物工作流程"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>生成本週工作流程</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowDeduplicateModal(true)}
              className="btn-secondary flex items-center space-x-2"
              title="檢測並清理重複的工作流程記錄"
            >
              <Trash2 className="h-4 w-4" />
              <span>清理重複記錄</span>
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
                                // 標準化時間格式進行比對
                                const normalizeTime = (time: string) => {
                                  if (!time) return '';
                                  // 移除所有空格和秒數，只保留 HH:MM
                                  return time.trim().substring(0, 5);
                                };

                                // 查找對應的工作流程記錄
                                const workflowRecord = allWorkflowRecords.find(r =>
                                  r.prescription_id === prescription.id &&
                                  r.scheduled_date === date &&
                                  normalizeTime(r.scheduled_time) === normalizeTime(timeSlot)
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
                <p><strong>2. 生成工作流程：</strong>點擊「生成本週工作流程」按鈕為該院友創建整週（7天）的藥物任務</p>
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

      {/* 工作流程記錄去重模態框 */}
      {showDeduplicateModal && (
        <WorkflowDeduplicateModal
          onClose={() => setShowDeduplicateModal(false)}
          patients={patients}
          prescriptions={prescriptions}
          onSuccess={() => {
            setShowDeduplicateModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

export default MedicationWorkflow;