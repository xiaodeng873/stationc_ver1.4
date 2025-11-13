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

  // 注射區域定義 - 使用內聯樣式避免 Tailwind 動態類名問題
  const injectionAreas = [
    { label: '左上臂區', prefix: 'A', bgColor: '#3b82f6' },
    { label: '右上臂區', prefix: 'B', bgColor: '#10b981' },
    { label: '腹部左區', prefix: 'C', bgColor: '#eab308' },
    { label: '腹部右區', prefix: 'D', bgColor: '#f97316' },
    { label: '左大腿區', prefix: 'E', bgColor: '#a855f7' },
    { label: '右大腿區', prefix: 'F', bgColor: '#ec4899' }
  ];

  // 生成所有8個位置（1-8）
  const positions = Array.from({ length: 8 }, (_, i) => i + 1);

  // 生成所有6區域的48個位置
  const allSites = injectionAreas.flatMap(area =>
    positions.map(pos => ({
      code: `${area.prefix}${pos}`,
      label: `${area.label} ${area.prefix}${pos}`,
      area: area.label,
      prefix: area.prefix,
      position: pos,
      bgColor: area.bgColor
    }))
  );

  const handleConfirm = () => {
    if (!selectedSite) {
      alert('請選擇注射部位');
      return;
    }

    const siteInfo = allSites.find(s => s.code === selectedSite);
    if (onSiteSelected && siteInfo) {
      onSiteSelected(siteInfo.label, notes);
    }

    // 重置狀態
    setSelectedSite('');
    setNotes('');
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

        {/* 選擇注射部位（所有48個位置） */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          <label className="form-label">請選擇注射部位：</label>

          {injectionAreas.map(area => (
            <div key={area.prefix} className="space-y-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: area.bgColor }}
                >
                  {area.prefix}
                </div>
                <h4 className="text-sm font-medium text-gray-700">{area.label}</h4>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {positions.map(pos => {
                  const siteCode = `${area.prefix}${pos}`;
                  const isSelected = selectedSite === siteCode;
                  return (
                    <button
                      key={siteCode}
                      onClick={() => setSelectedSite(siteCode)}
                      className={`p-2 border-2 rounded-lg transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {siteCode}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 已選擇的注射部位顯示 */}
        {selectedSite && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">已選擇注射部位：</div>
                <div className="text-lg font-bold text-green-900">
                  {allSites.find(s => s.code === selectedSite)?.label}
                </div>
              </div>
            </div>
          </div>
        )}

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
            className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
