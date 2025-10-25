import React, { useState } from 'react';
import { X, MapPin, User, Calendar, Clock, Syringe } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import PatientAutocomplete from './PatientAutocomplete';

interface InjectionSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowRecord?: any;
  onSiteSelected?: (site: string, notes?: string) => void;
}

const InjectionSiteModal: React.FC<InjectionSiteModalProps> = ({
  isOpen,
  onClose,
  workflowRecord,
  onSiteSelected
}) => {
  const { patients, prescriptions } = usePatients();
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const patient = patients.find(p => p.院友id === workflowRecord?.patient_id);
  const prescription = prescriptions.find(p => p.id === workflowRecord?.prescription_id);

  // 注射部位選項
  const injectionSites = [
    { value: '左上臂', label: '左上臂', category: '上肢' },
    { value: '右上臂', label: '右上臂', category: '上肢' },
    { value: '左前臂', label: '左前臂', category: '上肢' },
    { value: '右前臂', label: '右前臂', category: '上肢' },
    { value: '左大腿', label: '左大腿', category: '下肢' },
    { value: '右大腿', label: '右大腿', category: '下肢' },
    { value: '左臀部', label: '左臀部', category: '臀部' },
    { value: '右臀部', label: '右臀部', category: '臀部' },
    { value: '腹部', label: '腹部', category: '軀幹' },
    { value: '其他', label: '其他部位', category: '其他' }
  ];

  // 按類別分組
  const sitesByCategory = injectionSites.reduce((acc, site) => {
    if (!acc[site.category]) {
      acc[site.category] = [];
    }
    acc[site.category].push(site);
    return acc;
  }, {} as Record<string, typeof injectionSites>);

  const handleConfirm = () => {
    if (!selectedSite) {
      alert('請選擇注射部位');
      return;
    }

    if (onSiteSelected) {
      onSiteSelected(selectedSite, notes);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Syringe className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">選擇注射部位</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 院友和藥物資訊 */}
        {workflowRecord && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">
                {patient?.中文姓氏}{patient?.中文名字} ({patient?.床號})
              </div>
              <div className="text-gray-600 mb-1">
                藥物: {prescription?.medication_name}
              </div>
              <div className="text-gray-600 mb-1">
                日期: {new Date(workflowRecord.scheduled_date).toLocaleDateString('zh-TW')}
              </div>
              <div className="text-gray-600">
                時間: {workflowRecord.scheduled_time}
              </div>
            </div>
          </div>
        )}

        {/* 注射部位選擇 */}
        <div className="space-y-4 mb-6">
          <label className="form-label">請選擇注射部位：</label>
          
          {Object.entries(sitesByCategory).map(([category, sites]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {sites.map(site => (
                  <label
                    key={site.value}
                    className={`flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSite === site.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="injection_site"
                      value={site.value}
                      checked={selectedSite === site.value}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{site.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* 其他部位輸入 */}
          {selectedSite === '其他' && (
            <div>
              <label className="form-label">請輸入其他注射部位：</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                placeholder="請輸入具體的注射部位..."
                required
              />
            </div>
          )}
        </div>

        {/* 備註 */}
        <div className="mb-6">
          <label className="form-label">備註（可選）：</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
            rows={2}
            placeholder="注射相關備註或注意事項..."
          />
        </div>

        {/* 確認按鈕 */}
        <div className="flex space-x-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedSite}
            className="btn-primary flex-1 flex items-center justify-center space-x-2"
          >
            <Syringe className="h-4 w-4" />
            <span>確認注射部位</span>
          </button>
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default InjectionSiteModal;