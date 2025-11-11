import React, { useState, useMemo } from 'react';
import { X, Clock, CheckCircle, Pill } from 'lucide-react';

interface TimeSlotSummary {
  time: string;
  records: any[];
  medicationSummary: {
    [unit: string]: number;
  };
  totalRecords: number;
}

interface BatchDispenseConfirmModalProps {
  workflowRecords: any[];
  prescriptions: any[];
  selectedDate: string;
  onConfirm: (selectedTimeSlots: string[]) => Promise<void>;
  onClose: () => void;
}

const BatchDispenseConfirmModal: React.FC<BatchDispenseConfirmModalProps> = ({
  workflowRecords,
  prescriptions,
  selectedDate,
  onConfirm,
  onClose,
}) => {
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

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
          medicationSummary: {},
          totalRecords: 0,
        });
      }

      const summary = summaryMap.get(time)!;
      summary.records.push(record);
      summary.totalRecords++;

      const unit = prescription.dosage_unit || '單位';
      const amount = parseFloat(prescription.dosage_amount) || 1;

      if (!summary.medicationSummary[unit]) {
        summary.medicationSummary[unit] = 0;
      }
      summary.medicationSummary[unit] += amount;
    });

    return Array.from(summaryMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time)
    );
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
      .reduce((sum, s) => sum + s.totalRecords, 0);
  }, [timeSlotSummaries, selectedTimeSlots]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600">
          <div>
            <h2 className="text-xl font-bold text-white">批量派藥確認</h2>
            <p className="text-sm text-blue-100 mt-1">選擇要派藥的時間點</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {timeSlotSummaries.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">沒有可派藥的記錄</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedTimeSlots.size === timeSlotSummaries.length ? '取消全選' : '全選'}
                </button>
                {selectedTimeSlots.size > 0 && (
                  <div className="text-sm text-gray-600">
                    已選擇 <span className="font-bold text-blue-600">{selectedTimeSlots.size}</span> 個時間點，
                    共 <span className="font-bold text-blue-600">{selectedRecordsCount}</span> 筆記錄
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
                        relative p-4 rounded-lg border-2 transition-all text-left
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mb-3">
                        <Clock className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-lg font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          {summary.time}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          共 <span className="font-semibold text-gray-900">{summary.totalRecords}</span> 筆處方
                        </div>

                        <div className="border-t border-gray-200 pt-2 space-y-1">
                          {Object.entries(summary.medicationSummary).map(([unit, amount]) => (
                            <div
                              key={unit}
                              className={`flex items-center justify-between text-sm ${
                                isSelected ? 'text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              <span className="font-medium">藥物總量:</span>
                              <span className="font-bold">
                                {amount} {unit}
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
            className="btn-secondary"
            disabled={isProcessing}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedTimeSlots.size === 0 || isProcessing}
            className="btn-primary flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>派藥中...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
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
