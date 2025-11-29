import React, { useState, useEffect } from 'react';
import { X, Clock, User, FileText, Trash2 } from 'lucide-react';
import type { Patient, PatrolRound } from '../lib/database';
import { addRandomOffset } from '../utils/careRecordHelper';

interface PatrolRoundModalProps {
  patient: Patient;
  date: string;
  timeSlot: string;
  staffName: string;
  existingRecord?: PatrolRound | null;
  onClose: () => void;
  onSubmit: (data: Omit<PatrolRound, 'id' | 'created_at' | 'updated_at'>) => void;
  onDelete?: (recordId: string) => void;
}

const PatrolRoundModal: React.FC<PatrolRoundModalProps> = ({
  patient,
  date,
  timeSlot,
  staffName,
  existingRecord,
  onClose,
  onSubmit,
  onDelete
}) => {
  const [patrolTime, setPatrolTime] = useState('');
  const [recorder, setRecorder] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingRecord) {
      setPatrolTime(existingRecord.patrol_time || '');
      setRecorder(existingRecord.staff_name || '');
      setNotes(existingRecord.notes || '');
    } else {
      const randomTime = addRandomOffset(timeSlot);
      setPatrolTime(randomTime);
      setRecorder(staffName);
      setNotes('');
    }
  }, [existingRecord, timeSlot, staffName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Omit<PatrolRound, 'id' | 'created_at' | 'updated_at'> = {
      patient_id: patient.院友id,
      record_date: date,
      time_slot: timeSlot,
      patrol_time: patrolTime,
      staff_name: recorder,
      notes: notes.trim() || undefined
    };

    onSubmit(data);
  };

  const handleDelete = () => {
    if (existingRecord && onDelete && window.confirm('確定要刪除此巡房記錄嗎？')) {
      onDelete(existingRecord.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingRecord ? '查看/編輯巡房記錄' : '新增巡房記錄'}
          </h2>
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
              value={patient.中文姓名}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              巡房日期
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
              value={timeSlot}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              實際巡房時間 *
            </label>
            <input
              type="time"
              value={patrolTime}
              onChange={(e) => setPatrolTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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
              placeholder="選填，如有特殊情況請記錄"
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            {existingRecord && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center space-x-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>刪除</span>
              </button>
            )}
            <div className="flex justify-end space-x-3 ml-auto">
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
                {existingRecord ? '更新記錄' : '確認巡房'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatrolRoundModal;
