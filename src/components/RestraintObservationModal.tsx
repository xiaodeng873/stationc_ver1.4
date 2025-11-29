import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, User, FileText, AlertTriangle, CheckCircle, PauseCircle, Trash2, Info } from 'lucide-react';
import type { Patient, RestraintObservationRecord, PatientRestraintAssessment } from '../lib/database';
import { addRandomOffset } from '../utils/careRecordHelper';

interface RestraintObservationModalProps {
  patient: Patient;
  date: string;
  timeSlot: string;
  staffName: string;
  existingRecord?: RestraintObservationRecord | null;
  restraintAssessments: PatientRestraintAssessment[];
  onClose: () => void;
  onSubmit: (data: Omit<RestraintObservationRecord, 'id' | 'created_at' | 'updated_at'>) => void;
  onDelete?: (recordId: string) => void;
}

const RestraintObservationModal: React.FC<RestraintObservationModalProps> = ({
  patient,
  date,
  timeSlot,
  staffName,
  existingRecord,
  restraintAssessments,
  onClose,
  onSubmit,
  onDelete
}) => {
  const [observationTime, setObservationTime] = useState('');
  const [observationStatus, setObservationStatus] = useState<'N' | 'P' | 'S'>('N');
  const [recorder, setRecorder] = useState('');
  const [notes, setNotes] = useState('');

  // 獲取最新的約束評估
  const latestAssessment = useMemo(() => {
    const patientAssessments = restraintAssessments
      .filter(a => a.patient_id === patient.院友id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return patientAssessments[0] || null;
  }, [restraintAssessments, patient.院友id]);

  // 解析建議的約束物品
  const suggestedRestraints = useMemo(() => {
    if (!latestAssessment || !latestAssessment.suggested_restraints) return [];

    const restraints = latestAssessment.suggested_restraints;
    const items: string[] = [];

    if (typeof restraints === 'object') {
      // 檢查各種可能的約束物品
      if (restraints.bed_rail) items.push('床欄');
      if (restraints.wheelchair_belt) items.push('輪椅安全帶');
      if (restraints.wheelchair_table) items.push('輪椅餐桌板');
      if (restraints.vest) items.push('約束背心');
      if (restraints.wrist_restraint) items.push('手部約束帶');
      if (restraints.ankle_restraint) items.push('腳部約束帶');
      if (restraints.mitt) items.push('手套');
      if (restraints.others && restraints.others_specify) {
        items.push(restraints.others_specify);
      }
    }

    return items;
  }, [latestAssessment]);

  useEffect(() => {
    if (existingRecord) {
      setObservationTime(existingRecord.observation_time);
      setObservationStatus(existingRecord.observation_status);
      setRecorder(existingRecord.recorder);
      setNotes(existingRecord.notes || '');
    } else {
      const randomTime = addRandomOffset(timeSlot);
      setObservationTime(randomTime);
      setObservationStatus('N');
      setRecorder(staffName);
      setNotes('');
    }
  }, [existingRecord, timeSlot, staffName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Omit<RestraintObservationRecord, 'id' | 'created_at' | 'updated_at'> = {
      patient_id: patient.院友id,
      observation_date: date,
      observation_time: observationTime,
      scheduled_time: timeSlot,
      observation_status: observationStatus,
      recorder: recorder,
      notes: notes.trim() || undefined
    };

    onSubmit(data);
  };

  const handleDelete = () => {
    if (existingRecord && onDelete && window.confirm('確定要刪除此約束觀察記錄嗎？')) {
      onDelete(existingRecord.id);
    }
  };

  const getStatusButtonClass = (status: 'N' | 'P' | 'S') => {
    const baseClass = "flex-1 py-4 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2";
    if (observationStatus === status) {
      if (status === 'N') return `${baseClass} bg-green-600 text-white shadow-lg`;
      if (status === 'P') return `${baseClass} bg-red-600 text-white shadow-lg`;
      if (status === 'S') return `${baseClass} bg-gray-600 text-white shadow-lg`;
    }
    return `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingRecord ? '查看/編輯約束觀察記錄' : '新增約束觀察記錄'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                床號
              </label>
              <input
                type="text"
                value={patient.床號}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
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
              value={timeSlot}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* 約束物品建議 */}
          {suggestedRestraints.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">院友約束物品建議</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedRestraints.map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  {latestAssessment?.other_restraint_notes && (
                    <p className="text-sm text-blue-700 mt-2">
                      備註：{latestAssessment.other_restraint_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
                <span>正常 (N)</span>
              </button>
              <button
                type="button"
                onClick={() => setObservationStatus('P')}
                className={getStatusButtonClass('P')}
              >
                <AlertTriangle className="w-5 h-5" />
                <span>異常 (P)</span>
              </button>
              <button
                type="button"
                onClick={() => setObservationStatus('S')}
                className={getStatusButtonClass('S')}
              >
                <PauseCircle className="w-5 h-5" />
                <span>暫停 (S)</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              N = 正常，P = 異常（需要注意或處理），S = 暫停約束
            </p>
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
                {existingRecord ? '更新記錄' : '確認觀察'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestraintObservationModal;
