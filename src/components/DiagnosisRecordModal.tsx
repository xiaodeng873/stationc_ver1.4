import React, { useState } from 'react';
import { X, FileText, Calendar, Building2 } from 'lucide-react';
import { usePatients, type DiagnosisRecord } from '../context/PatientContext';
import PatientAutocomplete from './PatientAutocomplete';

interface DiagnosisRecordModalProps {
  record?: DiagnosisRecord;
  onClose: () => void;
}

const DiagnosisRecordModal: React.FC<DiagnosisRecordModalProps> = ({ record, onClose }) => {
  const { patients, addDiagnosisRecord, updateDiagnosisRecord } = usePatients();

  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return hongKongTime.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    patient_id: record?.patient_id?.toString() || '',
    diagnosis_date: record?.diagnosis_date || getHongKongDate(),
    diagnosis_item: record?.diagnosis_item || '',
    diagnosis_unit: record?.diagnosis_unit || '',
    remarks: record?.remarks || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient_id) {
      newErrors.patient_id = '請選擇院友';
    }

    if (!formData.diagnosis_date) {
      newErrors.diagnosis_date = '請選擇診斷日期';
    }

    if (!formData.diagnosis_item.trim()) {
      newErrors.diagnosis_item = '請輸入診斷項目';
    }

    if (!formData.diagnosis_unit.trim()) {
      newErrors.diagnosis_unit = '請輸入診斷單位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const recordData = {
        patient_id: parseInt(formData.patient_id),
        diagnosis_date: formData.diagnosis_date,
        diagnosis_item: formData.diagnosis_item.trim(),
        diagnosis_unit: formData.diagnosis_unit.trim(),
        remarks: formData.remarks.trim()
      };

      if (record) {
        await updateDiagnosisRecord({
          ...recordData,
          id: record.id,
          created_at: record.created_at,
          updated_at: record.updated_at,
          created_by: record.created_by
        });
      } else {
        await addDiagnosisRecord(recordData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving diagnosis record:', error);
      alert('儲存診斷記錄失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {record ? '編輯診斷記錄' : '新增診斷記錄'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="form-label flex items-center space-x-2">
              <span className="text-red-500">*</span>
              <span>院友</span>
            </label>
            <PatientAutocomplete
              patients={patients}
              selectedPatientId={formData.patient_id ? parseInt(formData.patient_id) : undefined}
              onSelect={(patientId) => {
                setFormData(prev => ({ ...prev, patient_id: patientId.toString() }));
                setErrors(prev => ({ ...prev, patient_id: '' }));
              }}
              placeholder="搜索院友姓名或床號..."
              disabled={!!record}
            />
            {errors.patient_id && (
              <p className="mt-1 text-sm text-red-600">{errors.patient_id}</p>
            )}
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-red-500">*</span>
              <span>診斷日期</span>
            </label>
            <input
              type="date"
              value={formData.diagnosis_date}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, diagnosis_date: e.target.value }));
                setErrors(prev => ({ ...prev, diagnosis_date: '' }));
              }}
              className={`form-input ${errors.diagnosis_date ? 'border-red-500' : ''}`}
            />
            {errors.diagnosis_date && (
              <p className="mt-1 text-sm text-red-600">{errors.diagnosis_date}</p>
            )}
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-red-500">*</span>
              <span>診斷項目 / 病名</span>
            </label>
            <input
              type="text"
              value={formData.diagnosis_item}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, diagnosis_item: e.target.value }));
                setErrors(prev => ({ ...prev, diagnosis_item: '' }));
              }}
              className={`form-input ${errors.diagnosis_item ? 'border-red-500' : ''}`}
              placeholder="例如：高血壓、糖尿病、心臟病等"
            />
            {errors.diagnosis_item && (
              <p className="mt-1 text-sm text-red-600">{errors.diagnosis_item}</p>
            )}
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-red-500">*</span>
              <span>診斷單位 / 醫院名稱</span>
            </label>
            <input
              type="text"
              value={formData.diagnosis_unit}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, diagnosis_unit: e.target.value }));
                setErrors(prev => ({ ...prev, diagnosis_unit: '' }));
              }}
              className={`form-input ${errors.diagnosis_unit ? 'border-red-500' : ''}`}
              placeholder="例如：瑪麗醫院、伊利沙伯醫院、私家診所等"
            />
            {errors.diagnosis_unit && (
              <p className="mt-1 text-sm text-red-600">{errors.diagnosis_unit}</p>
            )}
          </div>

          <div>
            <label className="form-label">備註</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              className="form-input"
              rows={3}
              placeholder="其他補充說明..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '儲存中...' : record ? '更新' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiagnosisRecordModal;
