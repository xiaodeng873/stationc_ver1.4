import React, { useState, useMemo } from 'react';
import { X, Clock, CheckCircle, Pill, AlertTriangle, User, Activity } from 'lucide-react';
import InspectionCheckModal from './InspectionCheckModal';

interface TimeSlotSummary {
  time: string;
  records: any[];
  uniquePrescriptions: Set<string>;
  medicationSummary: {
    [unit: string]: number;
  };
  hasInspectionRequired: boolean;
}

interface BatchDispenseConfirmModalProps {
  workflowRecords: any[];
  prescriptions: any[];
  patients: any[];
  selectedPatientId: string;
  selectedDate: string;
  onConfirm: (selectedTimeSlots: string[], recordsToProcess: any[], inspectionResults?: Map<string, any>) => Promise<void>;
  onClose: () => void;
}

const BatchDispenseConfirmModal: React.FC<BatchDispenseConfirmModalProps> = ({
  workflowRecords,
  prescriptions,
  patients,
  selectedPatientId,
  selectedDate,
  onConfirm,
  onClose,
}) => {
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [currentInspectionRecords, setCurrentInspectionRecords] = useState<any[]>([]);
  const [currentInspectionIndex, setCurrentInspectionIndex] = useState(0);
  const [inspectionResults, setInspectionResults] = useState<Map<string, any>>(new Map());
  const [recordsToProcess, setRecordsToProcess] = useState<any[]>([]);

  const currentPatient = useMemo(() => {
    return patients.find(p => p.院友id === parseInt(selectedPatientId));
  }, [patients, selectedPatientId]);

  // 過濾只包含在服處方或有效期內的停用處方
  const activeWorkflowRecords = useMemo(() => {
    return workflowRecords.filter(record => {
      const prescription = prescriptions.find(p => p.id === record.prescription_id);

      if (!prescription) return false;

      // 在服處方：正常包含
      if (prescription.status === 'active') {
        return true;
      }

      // 停用處方：需要檢查記錄日期是否在處方有效期內
      if (prescription.status === 'inactive') {
        const recordDate = new Date(record.scheduled_date);
        const startDate = new Date(prescription.start_date);
        const endDate = prescription.end_date ? new Date(prescription.end_date) : null;

        // 如果記錄日期在處方有效期內，包含該記錄
        return recordDate >= startDate && (!endDate || recordDate <= endDate);
      }

      // 其他狀態（如 pending_change）：跳過
      return false;
    });
  }, [workflowRecords, prescriptions]);

  // 格式化時間為 HH:MM
  const formatTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  };

  const timeSlotSummaries = useMemo(() => {
    const summaryMap = new Map<string, TimeSlotSummary>();

    activeWorkflowRecords.forEach(record => {
      const time = record.scheduled_time;
      const prescription = prescriptions.find(p => p.id === record.prescription_id);

      if (!prescription) return;

      if (!summaryMap.has(time)) {
        summaryMap.set(time, {
          time,
          records: [],
          uniquePrescriptions: new Set(),
          medicationSummary: {},
          hasInspectionRequired: false,
        });
      }

      const summary = summaryMap.get(time)!;
      summary.records.push(record);
      summary.uniquePrescriptions.add(record.prescription_id);

      // 檢查是否有檢測項要求
      if (prescription.inspection_rules && prescription.inspection_rules.length > 0) {
        summary.hasInspectionRequired = true;
      }

      const unit = prescription.dosage_unit || '單位';
      const amount = parseFloat(prescription.dosage_amount) || 1;

      if (!summary.medicationSummary[unit]) {
        summary.medicationSummary[unit] = 0;
      }
      summary.medicationSummary[unit] += amount;
    });

    return Array.from(summaryMap.values())
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(s => ({
        ...s,
        uniquePrescriptionCount: s.uniquePrescriptions.size
      }));
  }, [activeWorkflowRecords, prescriptions]);

  const handleTimeSlotToggle = (time: string) => {
    const newSelected = new Set(selectedTimeSlots);
    if (newSelected.has(time)) {
      newSelected.delete(time);
    } else {
      newSelected.add(time);
    }
    setSelectedTimeSlots(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTimeSlots.size === timeSlotSummaries.length) {
      setSelectedTimeSlots(new Set());
    } else {
      setSelectedTimeSlots(new Set(timeSlotSummaries.map(s => s.time)));
    }
  };

  const handleConfirm = async () => {
    if (selectedTimeSlots.size === 0) return;

    console.log('=== 批量派藥確認開始 ===');

    // 找出所有選定時間點的記錄
    const selectedRecords = activeWorkflowRecords.filter(r =>
      selectedTimeSlots.has(r.scheduled_time)
    );

    console.log('選定記錄總數:', selectedRecords.length);

    // 找出需要檢測的記錄
    const recordsNeedingInspection = selectedRecords.filter(record => {
      const prescription = prescriptions.find(p => p.id === record.prescription_id);
      return prescription?.inspection_rules && prescription.inspection_rules.length > 0;
    });

    console.log('需要檢測的記錄數:', recordsNeedingInspection.length);
    console.log('無需檢測的記錄數:', selectedRecords.length - recordsNeedingInspection.length);

    // 保存要處理的所有記錄
    setRecordsToProcess(selectedRecords);

    if (recordsNeedingInspection.length > 0) {
      // 有檢測項要求，逐個打開檢測模態框
      console.log('開始逐個檢測流程...');
      setCurrentInspectionRecords(recordsNeedingInspection);
      setCurrentInspectionIndex(0);
      setInspectionResults(new Map()); // 重置檢測結果
      setShowInspectionModal(true);
    } else {
      // 沒有檢測項要求，直接派藥
      console.log('無需檢測，直接派藥');
      console.log('  選定時間點:', Array.from(selectedTimeSlots));
      console.log('  記錄詳情:', selectedRecords.map(r => ({
        id: r.id.substring(0, 8),
        prescription_id: r.prescription_id,
        scheduled_time: r.scheduled_time
      })));
      setIsProcessing(true);
      try {
        await onConfirm(Array.from(selectedTimeSlots), selectedRecords, new Map());
        console.log('✅ 派藥成功，關閉對話框');
        onClose();
      } catch (error) {
        console.error('❌ 批量派藥失敗:', error);
        alert(`派藥失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleInspectionResult = (canDispense: boolean, failureReason?: string, inspectionCheckResult?: any) => {
    const currentRecord = currentInspectionRecords[currentInspectionIndex];

    console.log('=== 檢測結果處理 ===');
    console.log('當前索引:', currentInspectionIndex);
    console.log('總記錄數:', currentInspectionRecords.length);
    console.log('記錄ID:', currentRecord.id);
    console.log('canDispense:', canDispense);
    console.log('failureReason:', failureReason);
    console.log('inspectionCheckResult:', inspectionCheckResult);

    // 保存檢測結果
    const newResults = new Map(inspectionResults);
    newResults.set(currentRecord.id, {
      canDispense,
      failureReason,
      inspectionCheckResult
    });

    console.log('保存後的檢測結果 Map 大小:', newResults.size);
    console.log('保存的內容:', Array.from(newResults.entries()));

    // 更新檢測結果狀態
    setInspectionResults(newResults);

    // 檢查是否還有更多記錄需要檢測
    if (currentInspectionIndex < currentInspectionRecords.length - 1) {
      // 繼續下一個檢測
      console.log('繼續下一個檢測，索引從', currentInspectionIndex, '到', currentInspectionIndex + 1);
      setCurrentInspectionIndex(currentInspectionIndex + 1);
    } else {
      // 所有檢測完成，關閉檢測模態框並執行派藥
      console.log('✅ 所有檢測完成，準備執行派藥');
      setShowInspectionModal(false);
      // 使用 setTimeout 確保狀態更新和模態框關閉後再執行
      setTimeout(() => {
        proceedWithDispensing(newResults);
      }, 150);
    }
  };

  const proceedWithDispensing = async (finalResults: Map<string, any>) => {
    setIsProcessing(true);
    try {
      console.log('=== 批量派藥：傳遞檢測結果 ===');
      console.log('檢測結果數量:', finalResults.size);
      finalResults.forEach((result, recordId) => {
        console.log(`  記錄 ${recordId}:`, result);
      });
      await onConfirm(Array.from(selectedTimeSlots), recordsToProcess, finalResults);
      onClose();
    } catch (error) {
      console.error('批量派藥失敗:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRecordsCount = useMemo(() => {
    return timeSlotSummaries
      .filter(s => selectedTimeSlots.has(s.time))
      .reduce((sum, s) => sum + s.records.length, 0);
  }, [timeSlotSummaries, selectedTimeSlots]);

  const hasAllergyWarning = currentPatient?.藥物敏感?.length > 0;
  const hasAdverseReaction = currentPatient?.不良藥物反應?.length > 0;

  // 格式化藥物總量顯示
  const formatMedicationSummary = (medicationSummary: { [unit: string]: number }) => {
    const parts = Object.entries(medicationSummary).map(([unit, amount]) => `${amount}${unit}`);
    return parts.join('、');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* 標題欄 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Pill className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">一鍵派藥確認</h2>
                  <p className="text-sm text-gray-600">
                    選擇要派藥的時間點 - {selectedDate}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* 院友資訊區 */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start space-x-4">
              {currentPatient?.院友相片 ? (
                <img
                  src={currentPatient.院友相片}
                  alt={currentPatient.中文姓氏 + currentPatient.中文名字}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-300 flex items-center justify-center border-2 border-gray-400">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentPatient?.中文姓氏}{currentPatient?.中文名字}
                </h3>
                <p className="text-sm text-gray-600">
                  性別: {currentPatient?.性別} | 出生日期: {currentPatient?.出生日期 || '未設定'}
                </p>

                {/* 用藥安全警示 */}
                {(hasAllergyWarning || hasAdverseReaction) && (
                  <div className="mt-3 space-y-2">
                    {hasAllergyWarning && (
                      <div className="flex items-start space-x-2 bg-orange-100 border border-orange-300 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-semibold text-orange-900">藥物敏感: </span>
                          <span className="text-orange-800">{currentPatient.藥物敏感.join('、')}</span>
                        </div>
                      </div>
                    )}
                    {hasAdverseReaction && (
                      <div className="flex items-start space-x-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-semibold text-red-900">不良藥物反應: </span>
                          <span className="text-red-800">{currentPatient.不良藥物反應.join('、')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 時間點列表 */}
          <div className="flex-1 overflow-y-auto p-6">
            {timeSlotSummaries.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">沒有可派藥的記錄</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                  >
                    {selectedTimeSlots.size === timeSlotSummaries.length ? '取消全選時間點' : '全選時間點'}
                  </button>
                  {selectedTimeSlots.size > 0 && (
                    <div className="text-sm font-medium text-gray-700">
                      已選擇 <span className="text-blue-700 font-bold">{selectedTimeSlots.size}</span> 個時間點，
                      共 <span className="text-blue-700 font-bold">{selectedRecordsCount}</span> 筆派藥記錄
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {timeSlotSummaries.map((summary) => {
                    const isSelected = selectedTimeSlots.has(summary.time);
                    return (
                      <button
                        key={summary.time}
                        onClick={() => handleTimeSlotToggle(summary.time)}
                        className={`
                          w-full text-left border-2 rounded-lg p-4 transition-all
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <Clock className={`h-6 w-6 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <div className="flex-1">
                              <div className={`text-2xl font-bold mb-2 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                {formatTime(summary.time)}
                              </div>

                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="text-gray-600">處方數量: </span>
                                  <span className={`font-bold text-lg ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                    {summary.uniquePrescriptionCount}
                                  </span>
                                  <span className="text-gray-600 ml-1">筆</span>
                                </div>

                                <div>
                                  <span className="text-gray-600">藥物總量: </span>
                                  <span className={`font-bold text-lg ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                    {formatMedicationSummary(summary.medicationSummary)}
                                  </span>
                                </div>
                              </div>

                              {summary.hasInspectionRequired && (
                                <div className="mt-2 flex items-center space-x-2 text-orange-700">
                                  <Activity className="h-4 w-4" />
                                  <span className="text-sm font-medium">含檢測項要求</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 ml-3" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-6"
              disabled={isProcessing}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedTimeSlots.size === 0 || isProcessing}
              className="btn-primary flex items-center space-x-2 px-6"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>派藥中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>確認派藥 ({selectedTimeSlots.size} 個時間點)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 檢測模態框 */}
      {showInspectionModal && currentInspectionRecords[currentInspectionIndex] && (
        <InspectionCheckModal
          workflowRecord={currentInspectionRecords[currentInspectionIndex]}
          onClose={() => {
            setShowInspectionModal(false);
            setCurrentInspectionRecords([]);
            setCurrentInspectionIndex(0);
          }}
          onResult={handleInspectionResult}
          isBatchMode={true}
        />
      )}
    </>
  );
};

export default BatchDispenseConfirmModal;
