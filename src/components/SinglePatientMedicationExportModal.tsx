import React, { useState, useMemo } from 'react';
import { X, FileDown, Calendar, AlertCircle, Pill, Syringe, Package } from 'lucide-react';
import { getTemplatesMetadata } from '../lib/database';
import { exportSelectedMedicationRecordToExcel, categorizePrescriptionsByRoute } from '../utils/medicationRecordExcelGenerator';

interface SinglePatientMedicationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: any;
  selectedPrescriptionIds: Set<string>;
  allPrescriptions: any[];
}

interface RouteStats {
  oral: number;
  injection: number;
  topical: number;
  noRoute: number;
}

const SinglePatientMedicationExportModal: React.FC<SinglePatientMedicationExportModalProps> = ({
  isOpen,
  onClose,
  currentPatient,
  selectedPrescriptionIds,
  allPrescriptions
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  });
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const isExportAll = selectedPrescriptionIds.size === 0;

  const prescriptionsToExport = useMemo(() => {
    if (isExportAll) {
      return allPrescriptions.filter(p => {
        if (p.patient_id !== currentPatient.patient.院友id) return false;
        if (p.status === 'pending_change') return false;
        if (p.status === 'inactive' && !includeInactive) return false;
        return true;
      });
    } else {
      return allPrescriptions.filter(p =>
        selectedPrescriptionIds.has(p.id) &&
        p.patient_id === currentPatient.patient.院友id
      );
    }
  }, [isExportAll, selectedPrescriptionIds, allPrescriptions, currentPatient, includeInactive]);

  const routeStats = useMemo((): RouteStats => {
    const categorized = categorizePrescriptionsByRoute(prescriptionsToExport);
    return {
      oral: categorized.oral.length,
      injection: categorized.injection.length,
      topical: categorized.topical.length,
      noRoute: categorized.noRoute.length
    };
  }, [prescriptionsToExport]);

  const totalPrescriptions = routeStats.oral + routeStats.injection + routeStats.topical;

  const handleExport = async () => {
    if (prescriptionsToExport.length === 0) {
      alert('沒有可匯出的處方');
      return;
    }

    if (totalPrescriptions === 0) {
      alert('所有處方都缺少途徑資訊，無法匯出。請先在處方管理中補充途徑資訊。');
      return;
    }

    setIsExporting(true);

    try {
      const templates = await getTemplatesMetadata();
      const medicationTemplate = templates.find(t => t.type === 'medication-record');

      if (!medicationTemplate) {
        alert('找不到個人備藥及給藥記錄範本，請先在範本管理中上傳範本');
        setIsExporting(false);
        return;
      }

      await exportSelectedMedicationRecordToExcel(
        Array.from(selectedPrescriptionIds),
        currentPatient.patient,
        allPrescriptions,
        medicationTemplate,
        selectedMonth,
        includeInactive
      );

      let successMessage = `匯出成功！\n\n`;
      successMessage += `共匯出 ${totalPrescriptions} 個處方\n\n`;
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileDown className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              匯出 {currentPatient.patient.中文姓氏}{currentPatient.patient.中文名字} 的備藥記錄
              {!isExportAll && ` (已選 ${selectedPrescriptionIds.size} 個處方)`}
            </h2>
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

            {isExportAll && (
              <div className="flex items-center space-x-2 pt-8">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">包含停用處方</span>
                </label>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">匯出範圍</h4>
            <div className="text-sm text-blue-800">
              {isExportAll ? (
                <div>
                  <p className="mb-1">將匯出該院友的所有在服處方（共 {prescriptionsToExport.length} 個）</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>不包含待變更處方</li>
                    <li>停用處方 {includeInactive ? '包含' : '不包含'}</li>
                  </ul>
                </div>
              ) : (
                <p>將只匯出您選中的處方（共 {prescriptionsToExport.length} 個）</p>
              )}
            </div>
          </div>

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

            {totalPrescriptions === 0 && routeStats.noRoute > 0 && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <span className="font-semibold">錯誤：</span>
                    所有處方都缺少途徑資訊，無法匯出任何記錄。
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {isExportAll ? (
              <span>將匯出 <span className="font-semibold text-gray-900">{prescriptionsToExport.length}</span> 個處方（全部）</span>
            ) : (
              <span>將匯出 <span className="font-semibold text-gray-900">{prescriptionsToExport.length}</span> 個處方（已選）</span>
            )}
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
              disabled={isExporting || prescriptionsToExport.length === 0 || totalPrescriptions === 0}
              className="btn-primary flex items-center space-x-2"
            >
              <FileDown className="h-4 w-4" />
              <span>{isExporting ? '匯出中...' : '確認匯出'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePatientMedicationExportModal;
