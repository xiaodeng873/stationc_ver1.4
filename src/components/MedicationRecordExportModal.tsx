import React, { useState, useMemo } from 'react';
import { X, FileDown, Calendar, Users, CheckSquare, Square, AlertCircle, Pill, Syringe, Package } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { getTemplatesMetadata } from '../lib/database';
import { exportMedicationRecordToExcel, categorizePrescriptionsByRoute } from '../utils/medicationRecordExcelGenerator';

interface MedicationRecordExportModalProps {
  onClose: () => void;
}

interface RouteStats {
  oral: number;
  injection: number;
  topical: number;
  noRoute: number;
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

  const routeStats = useMemo(() => {
    const stats: RouteStats = { oral: 0, injection: 0, topical: 0, noRoute: 0 };

    selectedPatientIds.forEach(patientId => {
      const patientPrescriptions = prescriptions.filter(p => p.patient_id === patientId);

      patientPrescriptions.forEach(prescription => {
        if (prescription.status === 'pending_change') return;
        if (prescription.status === 'inactive' && !includeInactive) return;
        if (!prescription.prescription_date) return;
        if (!isInDateRange(prescription.prescription_date, prescription.end_date || null, selectedMonth)) return;

        const route = prescription.administration_route?.trim();

        if (!route) {
          stats.noRoute++;
        } else if (route === '口服') {
          stats.oral++;
        } else if (route === '注射') {
          stats.injection++;
        } else {
          stats.topical++;
        }
      });
    });

    return stats;
  }, [selectedPatientIds, prescriptions, includeInactive, selectedMonth]);

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

      const totalPrescriptions = routeStats.oral + routeStats.injection + routeStats.topical;
      let successMessage = `匯出成功！\n\n`;
      successMessage += `共匯出 ${selectedPatients.length} 位院友的處方記錄\n`;
      successMessage += `總處方數：${totalPrescriptions} 個\n\n`;
      successMessage += `途徑分布：\n`;
      if (routeStats.oral > 0) successMessage += `  口服：${routeStats.oral} 個\n`;
      if (routeStats.injection > 0) successMessage += `  注射：${routeStats.injection} 個\n`;
      if (routeStats.topical > 0) successMessage += `  外用：${routeStats.topical} 個\n`;

      if (routeStats.noRoute > 0) {
        successMessage += `\n⚠️ 注意：有 ${routeStats.noRoute} 個處方因缺少途徑資訊而未被匯出`;
      }

      alert(successMessage);
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
              <li>• <span className="font-semibold">外用</span>包含：外用、滴眼、滴耳、鼻胃管、吸入、舌下、直腸等所有非口服、非注射途徑</li>
            </ul>
          </div>

          {selectedPatientIds.size > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3 flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>途徑分布預覽</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <Pill className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">口服</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{routeStats.oral}</div>
                  <div className="text-xs text-gray-500">個處方</div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <Syringe className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">注射</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{routeStats.injection}</div>
                  <div className="text-xs text-gray-500">個處方</div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <Package className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">外用</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{routeStats.topical}</div>
                  <div className="text-xs text-gray-500">個處方</div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">缺少途徑</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{routeStats.noRoute}</div>
                  <div className="text-xs text-gray-500">個處方</div>
                </div>
              </div>

              {routeStats.noRoute > 0 && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <span className="font-semibold">警告：</span>
                      有 {routeStats.noRoute} 個處方沒有設定途徑，這些處方將不會被匯出。請先在處方管理中補充途徑資訊。
                    </div>
                  </div>
                </div>
              )}

              {routeStats.oral === 0 && routeStats.injection === 0 && routeStats.topical === 0 && routeStats.noRoute === 0 && (
                <div className="mt-3 text-sm text-gray-600 text-center">
                  選擇院友後，這裡會顯示處方的途徑分布統計
                </div>
              )}
            </div>
          )}

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

                    const oralCount = validPrescriptions.filter(p => p.administration_route === '口服').length;
                    const injectionCount = validPrescriptions.filter(p => p.administration_route === '注射').length;
                    const topicalCount = validPrescriptions.filter(p =>
                      p.administration_route && p.administration_route !== '口服' && p.administration_route !== '注射'
                    ).length;
                    const noRouteCount = validPrescriptions.filter(p => !p.administration_route).length;

                    return (
                      <div
                        key={patient.院友id}
                        onClick={() => handleTogglePatient(patient.院友id)}
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {patient.床號} {patient.中文姓氏}{patient.中文名字}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {validPrescriptions.length > 0 ? (
                                <div className="flex items-center space-x-3">
                                  <span className="text-green-600 font-medium">
                                    {validPrescriptions.length} 個處方
                                  </span>
                                  {oralCount > 0 && (
                                    <span className="inline-flex items-center space-x-1 text-blue-600">
                                      <Pill className="h-3 w-3" />
                                      <span>{oralCount}</span>
                                    </span>
                                  )}
                                  {injectionCount > 0 && (
                                    <span className="inline-flex items-center space-x-1 text-red-600">
                                      <Syringe className="h-3 w-3" />
                                      <span>{injectionCount}</span>
                                    </span>
                                  )}
                                  {topicalCount > 0 && (
                                    <span className="inline-flex items-center space-x-1 text-green-600">
                                      <Package className="h-3 w-3" />
                                      <span>{topicalCount}</span>
                                    </span>
                                  )}
                                  {noRouteCount > 0 && (
                                    <span className="inline-flex items-center space-x-1 text-orange-600">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>{noRouteCount}</span>
                                    </span>
                                  )}
                                </div>
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
