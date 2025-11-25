import React, { useState } from 'react';
import { X, Syringe, Calendar, Building2 } from 'lucide-react';
import { usePatients, type VaccinationRecord } from '../context/PatientContext';
import PatientAutocomplete from './PatientAutocomplete';

interface VaccinationRecordModalProps {
  record?: VaccinationRecord;
  onClose: () => void;
}

const VaccinationRecordModal: React.FC<VaccinationRecordModalProps> = ({ record, onClose }) => {
  const { patients, addVaccinationRecord, updateVaccinationRecord } = usePatients();

  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return hongKongTime.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    patient_id: record?.patient_id?.toString() || '',
    vaccination_date: record?.vaccination_date || getHongKongDate(),
    vaccine_item: record?.vaccine_item || '',
    vaccination_unit: record?.vaccination_unit || '',
    remarks: record?.remarks || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient_id) {
      newErrors.patient_id = '請選擇院友';
    }

    if (!formData.vaccination_date) {
      newErrors.vaccination_date = '請選擇注射日期';
    }

    if (!formData.vaccine_item.trim()) {
      newErrors.vaccine_item = '請輸入疫苗項目';
    }

    if (!formData.vaccination_unit.trim()) {
      newErrors.vaccination_unit = '請輸入注射單位';
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
        vaccination_date: formData.vaccination_date,
        vaccine_item: formData.vaccine_item.trim(),
        vaccination_unit: formData.vaccination_unit.trim(),
        remarks: formData.remarks.trim()
      };

      if (record) {
        await updateVaccinationRecord({
          ...recordData,
          id: record.id,
          created_at: record.created_at,
          updated_at: record.updated_at,
          created_by: record.created_by
        });
      } else {
        await addVaccinationRecord(recordData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving vaccination record:', error);
      alert('儲存疫苗記錄失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Syringe className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {record ? '編輯疫苗記錄' : '新增疫苗記錄'}
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
              <span>注射日期</span>
            </label>
            <input
              type="date"
              value={formData.vaccination_date}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, vaccination_date: e.target.value }));
                setErrors(prev => ({ ...prev, vaccination_date: '' }));
              }}
              className={`form-input ${errors.vaccination_date ? 'border-red-500' : ''}`}
            />
            {errors.vaccination_date && (
              <p className="mt-1 text-sm text-red-600">{errors.vaccination_date}</p>
            )}
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <Syringe className="h-4 w-4 text-gray-400" />
              <span className="text-red-500">*</span>
              <span>疫苗項目 / 疫苗名稱</span>
            </label>
            <input
              type="text"
              value={formData.vaccine_item}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, vaccine_item: e.target.value }));
                setErrors(prev => ({ ...prev, vaccine_item: '' }));
              }}
              className={`form-input ${errors.vaccine_item ? 'border-red-500' : ''}`}
              placeholder="例如：流感疫苗、肺炎疫苗、新冠疫苗等"
            />
            {errors.vaccine_item && (
              <p className="mt-1 text-sm text-red-600">{errors.vaccine_item}</p>
            )}
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-red-500">*</span>
              <span>注射單位 / 醫院/診所名稱</span>
            </label>
            <input
              type="text"
              value={formData.vaccination_unit}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, vaccination_unit: e.target.value }));
                setErrors(prev => ({ ...prev, vaccination_unit: '' }));
              }}
              className={`form-input ${errors.vaccination_unit ? 'border-red-500' : ''}`}
              placeholder="例如：衛生署、社區疫苗接種中心、私家診所等"
            />
            {errors.vaccination_unit && (
              <p className="mt-1 text-sm text-red-600">{errors.vaccination_unit}</p>
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

export default VaccinationRecordModal;
