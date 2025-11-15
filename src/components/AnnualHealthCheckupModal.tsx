import { useState, useEffect } from 'react';
import { X, Stethoscope, Download } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import PatientAutocomplete from './PatientAutocomplete';
import {
  AnnualHealthCheckup,
  calculateNextDueDate,
  getLatestHealthReadings,
  VISION_OPTIONS,
  HEARING_OPTIONS,
  SPEECH_OPTIONS,
  MENTAL_STATE_OPTIONS,
  MOBILITY_OPTIONS,
  CONTINENCE_OPTIONS,
  ADL_OPTIONS,
  RECOMMENDATION_OPTIONS,
} from '../utils/annualHealthCheckupHelper';
import * as db from '../lib/database';

interface AnnualHealthCheckupModalProps {
  checkup: AnnualHealthCheckup | null;
  onClose: () => void;
  onSave: () => void;
}

export default function AnnualHealthCheckupModal({ checkup, onClose, onSave }: AnnualHealthCheckupModalProps) {
  const { patients, annualHealthCheckups } = usePatients();
  const [loading, setLoading] = useState(false);
  const [fetchingReadings, setFetchingReadings] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: checkup?.patient_id || null,
    last_doctor_signature_date: checkup?.last_doctor_signature_date || '',
    next_due_date: checkup?.next_due_date || '',

    has_serious_illness: checkup?.has_serious_illness || false,
    serious_illness_details: checkup?.serious_illness_details || '',
    has_allergy: checkup?.has_allergy || false,
    allergy_details: checkup?.allergy_details || '',
    has_infectious_disease: checkup?.has_infectious_disease || false,
    infectious_disease_details: checkup?.infectious_disease_details || '',
    needs_followup_treatment: checkup?.needs_followup_treatment || false,
    followup_treatment_details: checkup?.followup_treatment_details || '',
    has_swallowing_difficulty: checkup?.has_swallowing_difficulty || false,
    swallowing_difficulty_details: checkup?.swallowing_difficulty_details || '',
    has_special_diet: checkup?.has_special_diet || false,
    special_diet_details: checkup?.special_diet_details || '',
    mental_illness_record: checkup?.mental_illness_record || '',

    blood_pressure_systolic: checkup?.blood_pressure_systolic || null,
    blood_pressure_diastolic: checkup?.blood_pressure_diastolic || null,
    pulse: checkup?.pulse || null,
    body_weight: checkup?.body_weight || null,

    vision_assessment: checkup?.vision_assessment || '',
    hearing_assessment: checkup?.hearing_assessment || '',
    speech_assessment: checkup?.speech_assessment || '',
    mental_state_assessment: checkup?.mental_state_assessment || '',
    mobility_assessment: checkup?.mobility_assessment || '',
    continence_assessment: checkup?.continence_assessment || '',
    adl_assessment: checkup?.adl_assessment || '',

    recommendation: checkup?.recommendation || '',
  });

  useEffect(() => {
    if (formData.last_doctor_signature_date) {
      const calculatedDate = calculateNextDueDate(formData.last_doctor_signature_date);
      setFormData(prev => ({ ...prev, next_due_date: calculatedDate }));
    }
  }, [formData.last_doctor_signature_date]);

  const handlePatientSelect = (patientId: string) => {
    setFormData(prev => ({ ...prev, patient_id: parseInt(patientId, 10) || null }));
  };

  const handleFetchLatestReadings = async () => {
    if (!formData.patient_id) {
      alert('請先選擇院友');
      return;
    }

    setFetchingReadings(true);
    try {
      const readings = await getLatestHealthReadings(formData.patient_id);

      if (readings.blood_pressure_systolic !== null) {
        setFormData(prev => ({
          ...prev,
          blood_pressure_systolic: readings.blood_pressure_systolic,
          blood_pressure_diastolic: readings.blood_pressure_diastolic,
          pulse: readings.pulse,
          body_weight: readings.body_weight,
        }));
      }
    } catch (error) {
      console.error('Error fetching latest readings:', error);
    } finally {
      setFetchingReadings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id) {
      alert('請選擇院友');
      return;
    }

    setLoading(true);

    try {
      const existingCheckup = await db.getAnnualHealthCheckupByPatientId(formData.patient_id);

      if (existingCheckup && (!checkup || existingCheckup.id !== checkup.id)) {
        alert('該院友已有年度體檢記錄，請編輯現有記錄');
        setLoading(false);
        return;
      }

      const checkupData = {
        ...formData,
        blood_pressure_systolic: formData.blood_pressure_systolic ? Number(formData.blood_pressure_systolic) : null,
        blood_pressure_diastolic: formData.blood_pressure_diastolic ? Number(formData.blood_pressure_diastolic) : null,
        pulse: formData.pulse ? Number(formData.pulse) : null,
        body_weight: formData.body_weight ? Number(formData.body_weight) : null,
      };

      if (checkup) {
        await db.updateAnnualHealthCheckup({ id: checkup.id, ...checkupData });
      } else {
        await db.createAnnualHealthCheckup(checkupData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving annual health checkup:', error);
      alert('儲存失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p.院友id === formData.patient_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {checkup ? '編輯年度體檢' : '新增年度體檢'}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">院友 *</label>
                {checkup ? (
                  <div className="form-input bg-gray-100 cursor-not-allowed">
                    {selectedPatient ? `${selectedPatient.床號} - ${selectedPatient.中文姓名}` : '未知院友'}
                  </div>
                ) : (
                  <PatientAutocomplete
                    value={formData.patient_id?.toString() || ''}
                    onChange={handlePatientSelect}
                    placeholder="選擇院友"
                  />
                )}
                {selectedPatient && !checkup && (
                  <p className="text-sm text-gray-600 mt-1">
                    床號: {selectedPatient.床號}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">上次醫生簽署日期</label>
                <input
                  type="date"
                  value={formData.last_doctor_signature_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_doctor_signature_date: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">下次到期日</label>
                <input
                  type="date"
                  value={formData.next_due_date}
                  readOnly
                  className="form-input bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Part I - 病歷</h3>
            <div className="space-y-4">
              {[
                { key: 'serious_illness', label: '曾否患嚴重疾病/接受大型手術？' },
                { key: 'allergy', label: '有否食物或藥物過敏？' },
                { key: 'infectious_disease', label: '有否傳染病徵狀？' },
                { key: 'followup_treatment', label: '是否需要接受跟進檢查或治療？' },
                { key: 'swallowing_difficulty', label: '有否吞嚥困難/容易哽塞？' },
                { key: 'special_diet', label: '有否特別膳食需要？' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-start space-x-4">
                  <div className="flex items-center space-x-2 min-w-[300px] pt-2">
                    <label className="text-sm font-medium text-gray-700">{label}</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          checked={formData[`has_${key}` as keyof typeof formData] as boolean}
                          onChange={() => setFormData(prev => ({ ...prev, [`has_${key}`]: true }))}
                          className="form-radio"
                        />
                        <span className="text-sm">是</span>
                      </label>
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          checked={!formData[`has_${key}` as keyof typeof formData]}
                          onChange={() => setFormData(prev => ({ ...prev, [`has_${key}`]: false }))}
                          className="form-radio"
                        />
                        <span className="text-sm">否</span>
                      </label>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData[`${key}_details` as keyof typeof formData] as string || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [`${key}_details`]: e.target.value }))}
                    placeholder="說明"
                    className="form-input flex-1"
                  />
                </div>
              ))}

              <div>
                <label className="form-label">精神病紀錄詳述</label>
                <input
                  type="text"
                  value={formData.mental_illness_record}
                  onChange={(e) => setFormData(prev => ({ ...prev, mental_illness_record: e.target.value }))}
                  className="form-input"
                  placeholder="輸入精神病紀錄詳述"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Part II - 身體檢查</h3>
              <button
                type="button"
                onClick={handleFetchLatestReadings}
                disabled={fetchingReadings || !formData.patient_id}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>{fetchingReadings ? '載入中...' : '取得最近讀數'}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">血壓 (收縮壓/舒張壓)</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={formData.blood_pressure_systolic || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure_systolic: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="收縮壓"
                    className="form-input"
                  />
                  <span className="text-2xl text-gray-400">/</span>
                  <input
                    type="number"
                    value={formData.blood_pressure_diastolic || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, blood_pressure_diastolic: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="舒張壓"
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">脈搏</label>
                <input
                  type="number"
                  value={formData.pulse || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, pulse: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="次/分鐘"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">體重</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.body_weight || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, body_weight: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="公斤"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Part IV 第四部分 - 身體機能評估</h3>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300 w-32">視力</td>
                    <td className="p-3">
                      <div className="grid grid-cols-4 gap-4">
                        {VISION_OPTIONS.map(option => (
                          <label key={option} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.vision_assessment === option}
                              onChange={(e) => setFormData(prev => ({ ...prev, vision_assessment: e.target.checked ? option : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300">聽力</td>
                    <td className="p-3">
                      <div className="grid grid-cols-4 gap-4">
                        {HEARING_OPTIONS.map(option => (
                          <label key={option} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.hearing_assessment === option}
                              onChange={(e) => setFormData(prev => ({ ...prev, hearing_assessment: e.target.checked ? option : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300">語言能力</td>
                    <td className="p-3">
                      <div className="grid grid-cols-4 gap-4">
                        {SPEECH_OPTIONS.map(option => (
                          <label key={option} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.speech_assessment === option}
                              onChange={(e) => setFormData(prev => ({ ...prev, speech_assessment: e.target.checked ? option : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300">精神狀況</td>
                    <td className="p-3">
                      <div className="grid grid-cols-4 gap-4">
                        {MENTAL_STATE_OPTIONS.map(option => (
                          <label key={option} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.mental_state_assessment === option}
                              onChange={(e) => setFormData(prev => ({ ...prev, mental_state_assessment: e.target.checked ? option : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300">活動能力</td>
                    <td className="p-3">
                      <div className="grid grid-cols-4 gap-4">
                        {MOBILITY_OPTIONS.map(option => (
                          <label key={option} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.mobility_assessment === option}
                              onChange={(e) => setFormData(prev => ({ ...prev, mobility_assessment: e.target.checked ? option : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-gray-300">
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300">禁制能力</td>
                    <td className="p-3">
                      <div className="grid grid-cols-4 gap-4">
                        {CONTINENCE_OPTIONS.map(option => (
                          <label key={option} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.continence_assessment === option}
                              onChange={(e) => setFormData(prev => ({ ...prev, continence_assessment: e.target.checked ? option : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="bg-gray-50 p-3 font-semibold border-r border-gray-300">自我照顧能力</td>
                    <td className="p-3">
                      <div className="space-y-3">
                        {ADL_OPTIONS.map(option => (
                          <label key={option.value} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.adl_assessment === option.value}
                              onChange={(e) => setFormData(prev => ({ ...prev, adl_assessment: e.target.checked ? option.value : '' }))}
                              className="form-checkbox mt-1"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{option.value}</div>
                              <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Part V 第五部分 - 建議</h3>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 border-b border-gray-300">
                <p className="text-sm font-medium">申請人適合入住以下類別的安老院：</p>
              </div>

              <div className="p-4 space-y-4">
                {RECOMMENDATION_OPTIONS.map((option, index) => (
                  <label key={option.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.recommendation === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.checked ? option.value : '' }))}
                      className="form-checkbox mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-semibold text-sm">{index + 1}.</span>
                        <span className="font-semibold text-sm">{option.value}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 ml-5">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? '儲存中...' : (checkup ? '更新' : '儲存')}
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
}
