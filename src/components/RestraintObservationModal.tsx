import React, { useState, useEffect } from 'react';
import { X, Clock, User, FileText, AlertTriangle, CheckCircle, PauseCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addRandomOffset } from '../utils/careRecordHelper';

interface RestraintObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    observation_time: string;
    observation_status: 'N' | 'P' | 'S';
    recorder: string;
    notes?: string;
  }) => void;
  patientName: string;
  scheduledTime: string;
  date: string;
  existingRecord?: any;
}

const RestraintObservationModal: React.FC<RestraintObservationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  patientName,
  scheduledTime,
  date,
  existingRecord
}) => {
  const { displayName, user } = useAuth();
  const [observationTime, setObservationTime] = useState('');
  const [observationStatus, setObservationStatus] = useState<'N' | 'P' | 'S' | ''>('');
  const [recorder, setRecorder] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingRecord) {
        setObservationTime(existingRecord.observation_time);
        setObservationStatus(existingRecord.observation_status);
        setRecorder(existingRecord.recorder);
        setNotes(existingRecord.notes || '');
      } else {
        const randomTime = addRandomOffset(scheduledTime);
        setObservationTime(randomTime);
        setObservationStatus('');
        setRecorder(displayName || user?.email || '');
        setNotes('');
      }
    }
  }, [isOpen, existingRecord, scheduledTime, displayName, user]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!observationStatus) {
      alert('請選擇觀察狀態');
      return;
    }

    onConfirm({
      observation_time: observationTime,
      observation_status: observationStatus as 'N' | 'P' | 'S',
      recorder,
      notes: notes.trim() || undefined
    });
  };

  const getStatusButtonClass = (status: 'N' | 'P' | 'S') => {
    const baseClass = "flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2";
    if (observationStatus === status) {
      switch (status) {
        case 'N':
          return `${baseClass} bg-green-600 text-white shadow-lg`;
        case 'P':
          return `${baseClass} bg-red-600 text-white shadow-lg`;
        case 'S':
          return `${baseClass} bg-orange-600 text-white shadow-lg`;
      }
    }
    return `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">約束物品觀察記錄</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              院友姓名
            </label>
            <input
              type="text"
              value={patientName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              觀察日期
            </label>
            <input
              type="text"
              value={date}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              預定時段
            </label>
            <input
              type="text"
              value={scheduledTime}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              實際觀察時間 *
            </label>
            <input
              type="time"
              value={observationTime}
              onChange={(e) => setObservationTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              觀察狀態 *
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setObservationStatus('N')}
                className={getStatusButtonClass('N')}
              >
                <CheckCircle className="w-5 h-5" />
                <span>N - 正常</span>
              </button>
              <button
                type="button"
                onClick={() => setObservationStatus('P')}
                className={getStatusButtonClass('P')}
              >
                <AlertTriangle className="w-5 h-5" />
                <span>P - 異常</span>
              </button>
              <button
                type="button"
                onClick={() => setObservationStatus('S')}
                className={getStatusButtonClass('S')}
              >
                <PauseCircle className="w-5 h-5" />
                <span>S - 暫停</span>
              </button>
            </div>
          </div>

          {observationStatus === 'P' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">重要提示</p>
                  <p className="text-sm text-red-700 mt-1">
                    發現異常狀況，應立即向主管報告！
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              記錄者 *
            </label>
            <input
              type="text"
              value={recorder}
              onChange={(e) => setRecorder(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              備註
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={observationStatus === 'P' ? '請詳細描述異常情況' : '選填'}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              確認記錄
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestraintObservationModal;
