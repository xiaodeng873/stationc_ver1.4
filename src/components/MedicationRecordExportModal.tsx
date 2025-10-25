import React, { useState, useMemo } from 'react';
import { X, FileDown, Calendar, Users, CheckSquare, Square } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { getTemplatesMetadata } from '../lib/database';
import { exportMedicationRecordToExcel } from '../utils/medicationRecordExcelGenerator';

interface MedicationRecordExportModalProps {
  onClose: () => void;
}

const MedicationRecordExportModal: React.FC<MedicationRecordExportModalProps> = ({ onClose }) => {
  const { patients, prescriptions } = usePatients();
  
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  });
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activePatients = useMemo(() => {
    return patients.filter(p => p.在住狀態 === '在住')
      .sort((a, b) => a.床號.localeCompare(b.床號, 'zh-Hant', { numeric: true }));
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return activePatients;
    
    const term = searchTerm.toLowerCase();
    return activePatients.filter(p => {
      const name = (p.中文姓氏 + p.中文名字).toLowerCase();
      const bed = p.床號.toLowerCase();
      return name.includes(term) || bed.includes(term);
    });
  }, [activePatients, searchTerm]);

  const handleTogglePatient = (patientId: string) => {
    const newSet = new Set(selectedPatientIds);
    if (newSet.has(patientId)) {
      newSet.delete(patientId);
    } else {
      newSet.add(patientId);
    }
    setSelectedPatientIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedPatientIds.size === filteredPatients.length) {
      setSelectedPatientIds(new Set());
    } else {
      setSelectedPatientIds(new Set(filteredPatients.map(p => p.院友id)));
    }
  };

  const isInDateRange = (prescriptionDate: string, endDate: string | null, targetMonth: string): boolean => {
    const [year, month] = targetMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const prescDate = new Date(prescriptionDate);
    
    if (endDate) {
      const prescEndDate = new Date(endDate);
      return prescDate <= monthEnd && prescEndDate >= monthStart;
    } else {
      return prescDate <= monthEnd;
    }
  };

  const handleExport = async () => {
    if (selectedPatientIds.size === 0) {
      alert('請選擇至少一位院友');
      return;
    }

    setIsExporting(true);

    try {
      const templates = await getTemplatesMetadata();
      const medicationTemplate = templates.find(t => t.type === 'medication-record');

      if (!medicationTemplate) {
        alert('找不到個人備藥及給藥記錄範本，請先在範本管理上傳範本');
        setIsExporting(false);
        return;
      }

      const selectedPatients = activePatients
        .filter(p => selectedPatientIds.has(p.院友id))
        .map(patient => {
          const allPrescriptions = prescriptions.filter(p => p.patient_id === patient.院友id);
          
          const validPrescriptions = allPrescriptions.filter(prescription => {
            if (prescription.status === 'pending_change') {
              return false;
            }
            
            if (prescription.status === 'inactive' && !includeInactive) {
              return false;
            }
            
            if (!prescription.prescription_date) {
              return false;
            }
            
            return isInDateRange(
              prescription.prescription_date,
              prescription.end_date || null,
              selectedMonth
            );
          });

          return {
            ...patient,
            prescriptions: validPrescriptions
          };
        })
        .filter(p => p.prescriptions.length > 0);

      if (selectedPatients.length === 0) {
        alert('所選院友在指定月份沒有符合條件的處方記錄');
        setIsExporting(false);
        return;
      }

      await exportMedicationRecordToExcel(selectedPatients, medicationTemplate, selectedMonth);

      alert('匯出成功！');
      onClose();
    } catch (error: any) {
      console.error('匯出失敗:', error);
      alert('匯出失敗: ' + (error.message || '未知錯誤'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileDown className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">匯出個人備藥及給藥記錄</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>選擇月份</span>
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">匯出停用處方</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">匯出說明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 只會匯出處方日期在選定月份範圍內的處方</li>
              <li>• 待變更處方不會匯出</li>
              <li>• 停用處方預設不匯出，可勾選「匯出停用處方」來包含</li>
              <li>• 每位院友會根據途徑（口服/注射/外用）生成獨立工作表</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="form-label flex items-center space-x-2 mb-0">
                <Users className="h-4 w-4" />
                <span>選擇院友 ({selectedPatientIds.size}/{filteredPatients.length})</span>
              </label>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedPatientIds.size === filteredPatients.length ? '取消全選' : '全選'}
              </button>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋院友姓名或床號..."
              className="form-input mb-3"
            />

            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>沒有找到符合條件的院友</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredPatients.map(patient => {
                    const isSelected = selectedPatientIds.has(patient.院友id);
                    const patientPrescriptions = prescriptions.filter(p => p.patient_id === patient.院友id);
                    const validPrescriptions = patientPrescriptions.filter(prescription => {
                      if (prescription.status === 'pending_change') return false;
                      if (prescription.status === 'inactive' && !includeInactive) return false;
                      if (!prescription.prescription_date) return false;
                      return isInDateRange(
                        prescription.prescription_date,
                        prescription.end_date || null,
                        selectedMonth
                      );
                    });

                    return (
                      <div
                        key={patient.院友id}
                        onClick={() => handleTogglePatient(patient.院友id)}
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {patient.床號} {patient.中文姓氏}{patient.中文名字}
                            </div>
                            <div className="text-sm text-gray-600">
                              {validPrescriptions.length > 0 ? (
                                <span className="text-green-600">
                                  {validPrescriptions.length} 個符合條件的處方
                                </span>
                              ) : (
                                <span className="text-gray-400">該月份沒有處方</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            已選擇 <span className="font-semibold text-gray-900">{selectedPatientIds.size}</span> 位院友
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isExporting}
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedPatientIds.size === 0}
              className="btn-primary flex items-center space-x-2"
            >
              <FileDown className="h-4 w-4" />
              <span>{isExporting ? '匯出中...' : '匯出記錄'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationRecordExportModal;
