import React from 'react';
import { User, AlertTriangle } from 'lucide-react';
import type { Patient } from '../lib/database';
import { supabase } from '../lib/supabase';

interface PatientInfoCardProps {
  patient: Patient | null;
  onToggleCrushMedication?: (patientId: number, needsCrushing: boolean) => void;
}

const PatientInfoCard: React.FC<PatientInfoCardProps> = ({ patient, onToggleCrushMedication }) => {
  if (!patient) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center text-gray-500">
        <User className="w-5 h-5 mr-2" />
        <span>請選擇院友</span>
      </div>
    );
  }

  const handleCrushToggle = async () => {
    const newValue = !patient.needs_medication_crushing;

    try {
      const { error } = await supabase
        .from('院友主表')
        .update({ needs_medication_crushing: newValue })
        .eq('院友id', patient.院友id);

      if (error) throw error;

      if (onToggleCrushMedication) {
        onToggleCrushMedication(patient.院友id, newValue);
      }
    } catch (error) {
      console.error('更新碎藥狀態失敗:', error);
      alert('更新失敗，請稍後再試');
    }
  };

  // 計算年齡
  const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return '未知';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age}歲`;
  };

  // 格式化藥物敏感數據
  const formatAllergies = (): string => {
    if (!patient.藥物敏感 || patient.藥物敏感.length === 0) {
      return '無記錄';
    }
    return patient.藥物敏感.join('、');
  };

  // 格式化不良藥物反應數據
  const formatAdverseReactions = (): string => {
    if (!patient.不良藥物反應 || patient.不良藥物反應.length === 0) {
      return '無記錄';
    }
    return patient.不良藥物反應.join('、');
  };

  const hasAlertInfo = (patient.藥物敏感 && patient.藥物敏感.length > 0) ||
                       (patient.不良藥物反應 && patient.不良藥物反應.length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* 基本資訊行 */}
      <div className="flex items-start space-x-3">
        {/* 相片 */}
        <div className="flex-shrink-0">
          {patient.院友相片 ? (
            <img
              src={patient.院友相片}
              alt={patient.中文姓名}
              className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* 基本資訊 */}
        <div className="flex-1 min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-gray-900 text-base">{patient.中文姓名}</span>
            {patient.英文姓名 && (
              <span className="text-gray-600">{patient.英文姓名}</span>
            )}
            <span className="text-gray-600">
              {patient.性別} | {calculateAge(patient.出生日期)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
            {patient.出生日期 && (
              <span>生日: {patient.出生日期}</span>
            )}
            {patient.身份證號碼 && (
              <span>身份證: {patient.身份證號碼}</span>
            )}
            <span className="font-medium text-blue-600">床號: {patient.床號}</span>
          </div>
        </div>
      </div>

      {/* 藥物安全資訊 */}
      {hasAlertInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-900 mb-1">藥物安全資訊</p>

              {patient.藥物敏感 && patient.藥物敏感.length > 0 && (
                <div className="text-sm mb-1">
                  <span className="text-yellow-800 font-medium">藥物敏感: </span>
                  <span className="text-yellow-700">{formatAllergies()}</span>
                </div>
              )}

              {patient.不良藥物反應 && patient.不良藥物反應.length > 0 && (
                <div className="text-sm">
                  <span className="text-yellow-800 font-medium">不良反應: </span>
                  <span className="text-yellow-700">{formatAdverseReactions()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 碎藥需求 Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-700">特殊需求:</span>
        <button
          onClick={handleCrushToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            patient.needs_medication_crushing ? 'bg-green-600' : 'bg-gray-300'
          }`}
          aria-label="碎藥需求開關"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              patient.needs_medication_crushing ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${
          patient.needs_medication_crushing ? 'text-green-700' : 'text-gray-500'
        }`}>
          {patient.needs_medication_crushing ? '✓ 需要碎藥' : '不需要碎藥'}
        </span>
      </div>
    </div>
  );
};

export default PatientInfoCard;
