import { supabase } from '../lib/supabase';

export interface AnnualHealthCheckup {
  id: string;
  patient_id: number;
  last_doctor_signature_date: string | null;
  next_due_date: string | null;

  has_serious_illness: boolean;
  serious_illness_details: string | null;
  has_allergy: boolean;
  allergy_details: string | null;
  has_infectious_disease: boolean;
  infectious_disease_details: string | null;
  needs_followup_treatment: boolean;
  followup_treatment_details: string | null;
  has_swallowing_difficulty: boolean;
  swallowing_difficulty_details: string | null;
  has_special_diet: boolean;
  special_diet_details: string | null;
  mental_illness_record: string | null;

  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  pulse: number | null;
  body_weight: number | null;

  vision_assessment: string | null;
  hearing_assessment: string | null;
  speech_assessment: string | null;
  mental_state_assessment: string | null;
  mobility_assessment: string | null;
  continence_assessment: string | null;
  adl_assessment: string | null;

  recommendation: string | null;

  created_at: string;
  updated_at: string;
}

export interface LatestHealthReadings {
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  pulse: number | null;
  body_weight: number | null;
}

export type CheckupStatus = '有效' | '即將到期' | '已逾期' | '未簽署';

export const VISION_OPTIONS = [
  '正常',
  '不能閱讀報紙字體',
  '不能觀看電視',
  '只能見光影'
];

export const HEARING_OPTIONS = [
  '正常',
  '難以正常聲浪溝通',
  '難以話語的情況下也難以溝通',
  '大聲話語情況下也不能溝通'
];

export const SPEECH_OPTIONS = [
  '能正常表達',
  '需慢慢表達',
  '需靠提示表達',
  '不能以語言表達'
];

export const MENTAL_STATE_OPTIONS = [
  '正常警覺穩定',
  '輕度受困擾',
  '中度受困擾',
  '嚴重受困擾',
  '早期認知障礙症',
  '中期認知障礙症',
  '後期認知障礙症'
];

export const MOBILITY_OPTIONS = [
  '獨立行動',
  '可自行用助行器或輪椅移動',
  '經常需要別人幫助',
  '長期臥床'
];

export const CONTINENCE_OPTIONS = [
  '正常',
  '偶然大小便失禁',
  '頻繁大小便失禁',
  '大小便完全失禁'
];

export const ADL_OPTIONS = [
  '完全獨立',
  '偶爾需要協助',
  '經常需要協助',
  '完全需要協助'
];

export const RECOMMENDATION_OPTIONS = [
  '低度照顧安老院',
  '中度照顧安老院',
  '高度照顧安老院',
  '護養院'
];

export function calculateNextDueDate(lastSignatureDate: string): string {
  const date = new Date(lastSignatureDate);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
}

export function getCheckupStatus(checkup: AnnualHealthCheckup): CheckupStatus {
  if (!checkup.last_doctor_signature_date || !checkup.next_due_date) {
    return '未簽署';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDueDate = new Date(checkup.next_due_date);
  nextDueDate.setHours(0, 0, 0, 0);

  const diffTime = nextDueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return '已逾期';
  } else if (diffDays <= 30) {
    return '即將到期';
  } else {
    return '有效';
  }
}

export function isOverdue(checkup: AnnualHealthCheckup): boolean {
  return getCheckupStatus(checkup) === '已逾期';
}

export function isDueSoon(checkup: AnnualHealthCheckup): boolean {
  return getCheckupStatus(checkup) === '即將到期';
}

export function getStatusColor(status: CheckupStatus): string {
  switch (status) {
    case '有效':
      return 'bg-green-100 text-green-800';
    case '即將到期':
      return 'bg-orange-100 text-orange-800';
    case '已逾期':
      return 'bg-red-100 text-red-800';
    case '未簽署':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export async function getLatestHealthReadings(patientId: number): Promise<LatestHealthReadings> {
  const result: LatestHealthReadings = {
    blood_pressure_systolic: null,
    blood_pressure_diastolic: null,
    pulse: null,
    body_weight: null
  };

  try {
    const { data: vitalSignRecords } = await supabase
      .from('health_records')
      .select('blood_pressure, pulse')
      .eq('patient_id', patientId)
      .eq('record_type', '生命表徵')
      .not('blood_pressure', 'is', null)
      .order('record_date', { ascending: false })
      .order('record_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vitalSignRecords) {
      if (vitalSignRecords.blood_pressure) {
        const bpParts = vitalSignRecords.blood_pressure.split('/');
        if (bpParts.length === 2) {
          result.blood_pressure_systolic = parseInt(bpParts[0], 10);
          result.blood_pressure_diastolic = parseInt(bpParts[1], 10);
        }
      }
      if (vitalSignRecords.pulse) {
        result.pulse = vitalSignRecords.pulse;
      }
    }

    const { data: bodyWeightRecord } = await supabase
      .from('health_records')
      .select('body_weight')
      .eq('patient_id', patientId)
      .eq('record_type', '體重控制')
      .not('body_weight', 'is', null)
      .order('record_date', { ascending: false })
      .order('record_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bodyWeightRecord && bodyWeightRecord.body_weight) {
      result.body_weight = bodyWeightRecord.body_weight;
    }
  } catch (error) {
    console.error('Error fetching latest health readings:', error);
  }

  return result;
}
