import React, { useState } from 'react';
import { X, LogOut, Calendar } from 'lucide-react';

interface DischargeModalProps {
  patient: any;
  onClose: () => void;
  onConfirm: (patient: any, dischargeDate: string) => void;
}

const DischargeModal: React.FC<DischargeModalProps> = ({ patient, onClose, onConfirm }) => {
  const [dischargeDate, setDischargeDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeDate) {
      alert('請選擇退住日期');
      return;
    }
    // 退住時清除床位資訊
    const updatedPatient = {
      ...patient,
      退住日期: dischargeDate,
      在住狀態: '已退住',
      station_id: null,
      bed_id: null
    };
    onConfirm(updatedPatient, dischargeDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <LogOut className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">院友退住</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
              {patient.院友相片 ? (
                <img 
                  src={patient.院友相片} 
                  alt={patient.中文姓名} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-blue-600 font-medium">{patient.床號}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{patient.中文姓氏}{patient.中文名字}</p>
              <p className="text-sm text-gray-600">床號: {patient.床號}</p>
              {patient.入住日期 && (
                <p className="text-sm text-gray-600">
                  入住日期: {new Date(patient.入住日期).toLocaleDateString('zh-TW')}
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">
              <Calendar className="h-4 w-4 inline mr-1" />
              退住日期 *
            </label>
            <input
              type="date"
              value={dischargeDate}
              onChange={(e) => setDischargeDate(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-800">
              <strong>注意：</strong>退住後，此院友的狀態將變更為「已退住」，
              相關的任務和記錄將不會在預設檢視中顯示。
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="btn-danger flex-1"
            >
              確認退住
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DischargeModal;