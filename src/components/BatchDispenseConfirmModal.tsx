import React, { useState, useMemo } from 'react';
import { X, Clock, CheckCircle, Pill, AlertTriangle, User } from 'lucide-react';

interface TimeSlotSummary {
  time: string;
  records: any[];
  uniquePrescriptions: Set<string>;
  medicationSummary: {
    [unit: string]: number;
  };
}

interface BatchDispenseConfirmModalProps {
  workflowRecords: any[];
  prescriptions: any[];
  patients: any[];
  selectedPatientId: string;
  selectedDate: string;
  onConfirm: (selectedTimeSlots: string[]) => Promise<void>;
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

  const currentPatient = useMemo(() => {
    return patients.find(p => p.院友id === parseInt(selectedPatientId));
  }, [patients, selectedPatientId]);

  const timeSlotSummaries = useMemo(() => {
    const summaryMap = new Map<string, TimeSlotSummary>();

    workflowRecords.forEach(record => {
      const time = record.scheduled_time;
      const prescription = prescriptions.find(p => p.id === record.prescription_id);

      if (!prescription) return;

      if (!summaryMap.has(time)) {
        summaryMap.set(time, {
          time,
          records: [],
          uniquePrescriptions: new Set(),
          medicationSummary: {},
        });
      }

      const summary = summaryMap.get(time)!;
      summary.records.push(record);
      summary.uniquePrescriptions.add(record.prescription_id);

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
  }, [workflowRecords, prescriptions]);

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

    setIsProcessing(true);
    try {
      await onConfirm(Array.from(selectedTimeSlots));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {currentPatient?.院友相片 ? (
                <img
                  src={currentPatient.院友相片}
                  alt={currentPatient.中文姓氏 + currentPatient.中文名字}
                  className="w-20 h-20 rounded-lg object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-blue-400 flex items-center justify-center border-2 border-white shadow-md">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}

              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">
                  {currentPatient?.中文姓氏}{currentPatient?.中文名字}
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  性別: {currentPatient?.性別} | 出生日期: {currentPatient?.出生日期 || '未設定'}
                </p>

                {(hasAllergyWarning || hasAdverseReaction) && (
                  <div className="mt-2 space-y-1">
                    {hasAllergyWarning && (
                      <div className="flex items-start space-x-2 bg-orange-500 bg-opacity-90 rounded px-3 py-1.5">
                        <AlertTriangle className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-white">
                          <span className="font-semibold">藥物敏感: </span>
                          <span>{currentPatient.藥物敏感.join('、')}</span>
                        </div>
                      </div>
                    )}
                    {hasAdverseReaction && (
                      <div className="flex items-start space-x-2 bg-red-500 bg-opacity-90 rounded px-3 py-1.5">
                        <AlertTriangle className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-white">
                          <span className="font-semibold">不良藥物反應: </span>
                          <span>{currentPatient.不良藥物反應.join('、')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors ml-4"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-400">
            <p className="text-sm text-blue-100">選擇要派藥的時間點 - {selectedDate}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {timeSlotSummaries.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">沒有可派藥的記錄</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 bg-gray-50 p-4 rounded-lg">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  {selectedTimeSlots.size === timeSlotSummaries.length ? '取消全選' : '全選時間點'}
                </button>
                {selectedTimeSlots.size > 0 && (
                  <div className="text-sm font-medium">
                    已選擇 <span className="text-lg text-blue-600">{selectedTimeSlots.size}</span> 個時間點，
                    共 <span className="text-lg text-blue-600">{selectedRecordsCount}</span> 筆派藥記錄
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timeSlotSummaries.map((summary) => {
                  const isSelected = selectedTimeSlots.has(summary.time);
                  return (
                    <button
                      key={summary.time}
                      onClick={() => handleTimeSlotToggle(summary.time)}
                      className={`
                        relative p-5 rounded-xl border-2 transition-all text-left
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-1 shadow-lg">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                      )}

                      <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-200">
                        <Clock className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-2xl font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          {summary.time}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className={`text-base ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          <span className="font-semibold">處方數量: </span>
                          <span className="text-xl font-bold">{summary.uniquePrescriptionCount}</span>
                          <span className="text-sm ml-1">筆</span>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="text-sm font-medium text-gray-600 mb-2">藥物總量</div>
                          {Object.entries(summary.medicationSummary).map(([unit, amount]) => (
                            <div
                              key={unit}
                              className={`flex items-center justify-between ${
                                isSelected ? 'text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              <span className="text-2xl font-bold">
                                {amount}
                              </span>
                              <span className="text-lg font-medium">
                                {unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
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
  );
};

export default BatchDispenseConfirmModal;
