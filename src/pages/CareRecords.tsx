import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  User,
  Baby,
  Shield,
  RotateCcw,
  Droplets,
  GraduationCap
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from '../components/PatientAutocomplete';
import PatrolRoundModal from '../components/PatrolRoundModal';
import DiaperChangeModal from '../components/DiaperChangeModal';
import RestraintObservationModal from '../components/RestraintObservationModal';
import PositionChangeModal from '../components/PositionChangeModal';
import {
  TIME_SLOTS,
  DIAPER_CHANGE_SLOTS,
  generateWeekDates,
  getWeekStartDate,
  formatDate,
  isInHospital,
  isOverdue,
  getPositionSequence
} from '../utils/careRecordHelper';
import type { Patient, PatrolRound, DiaperChangeRecord, RestraintObservationRecord, PositionChangeRecord } from '../lib/database';

type TabType = 'patrol' | 'diaper' | 'intake_output' | 'restraint' | 'position' | 'toilet_training';

const CareRecords: React.FC = () => {
  const {
    patients,
    loading,
    patrolRounds,
    diaperChangeRecords,
    restraintObservationRecords,
    positionChangeRecords,
    createPatrolRound,
    deletePatrolRound,
    createDiaperChangeRecord,
    updateDiaperChangeRecord,
    deleteDiaperChangeRecord,
    createRestraintObservationRecord,
    updateRestraintObservationRecord,
    deleteRestraintObservationRecord,
    createPositionChangeRecord,
    deletePositionChangeRecord,
    patientRestraintAssessments,
    healthAssessments,
    admissionRecords
  } = usePatients();

  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '未知';

  const [activeTab, setActiveTab] = useState<TabType>('patrol');
  const [weekStartDate, setWeekStartDate] = useState(getWeekStartDate());
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [showPatrolModal, setShowPatrolModal] = useState(false);
  const [showDiaperModal, setShowDiaperModal] = useState(false);
  const [showRestraintModal, setShowRestraintModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  const [modalDate, setModalDate] = useState('');
  const [modalTimeSlot, setModalTimeSlot] = useState('');
  const [modalExistingRecord, setModalExistingRecord] = useState<any>(null);

  const weekDates = useMemo(() => generateWeekDates(weekStartDate), [weekStartDate]);

  const sortedActivePatients = useMemo(() => {
    return patients
      .filter(p => p.在住狀態 === '在住')
      .sort((a, b) => a.床號.localeCompare(b.床號, 'zh-Hant', { numeric: true }));
  }, [patients]);

  useEffect(() => {
    if (!selectedPatientId && sortedActivePatients.length > 0) {
      setSelectedPatientId(sortedActivePatients[0].院友id.toString());
    }
  }, [selectedPatientId, sortedActivePatients]);

  const selectedPatient = useMemo(() => {
    const patientIdNum = parseInt(selectedPatientId);
    return patients.find(p => p.院友id === patientIdNum);
  }, [selectedPatientId, patients]);

  const patientPatrolRounds = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    const filtered = patrolRounds.filter(r => r.patient_id === patientIdNum);
    console.log('🔍 巡房記錄過濾:', { patientIdNum, total: patrolRounds.length, filtered: filtered.length, records: filtered });
    return filtered;
  }, [selectedPatientId, patrolRounds]);

  const patientDiaperChanges = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    const filtered = diaperChangeRecords.filter(r => r.patient_id === patientIdNum);
    console.log('🔍 換片記錄過濾:', { patientIdNum, total: diaperChangeRecords.length, filtered: filtered.length, records: filtered });
    return filtered;
  }, [selectedPatientId, diaperChangeRecords]);

  const patientRestraintObservations = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    const filtered = restraintObservationRecords.filter(r => r.patient_id === patientIdNum);
    console.log('🔍 約束觀察記錄過濾:', { patientIdNum, total: restraintObservationRecords.length, filtered: filtered.length, records: filtered });
    return filtered;
  }, [selectedPatientId, restraintObservationRecords]);

  const patientPositionChanges = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    const filtered = positionChangeRecords.filter(r => r.patient_id === patientIdNum);
    console.log('🔍 轉身記錄過濾:', { patientIdNum, total: positionChangeRecords.length, filtered: filtered.length, records: filtered });
    return filtered;
  }, [selectedPatientId, positionChangeRecords]);

  const handlePreviousWeek = () => {
    const prevWeek = new Date(weekStartDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setWeekStartDate(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(weekStartDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setWeekStartDate(nextWeek);
  };

  const handleCurrentWeek = () => {
    setWeekStartDate(getWeekStartDate());
  };

  const goToPreviousPatient = () => {
    const currentIndex = sortedActivePatients.findIndex(p => p.院友id.toString() === selectedPatientId);
    if (currentIndex > 0) {
      setSelectedPatientId(sortedActivePatients[currentIndex - 1].院友id.toString());
    } else if (sortedActivePatients.length > 0) {
      setSelectedPatientId(sortedActivePatients[sortedActivePatients.length - 1].院友id.toString());
    }
  };

  const goToNextPatient = () => {
    const currentIndex = sortedActivePatients.findIndex(p => p.院友id.toString() === selectedPatientId);
    if (currentIndex < sortedActivePatients.length - 1 && currentIndex !== -1) {
      setSelectedPatientId(sortedActivePatients[currentIndex + 1].院友id.toString());
    } else if (sortedActivePatients.length > 0) {
      setSelectedPatientId(sortedActivePatients[0].院友id.toString());
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const handleCellClick = (date: string, timeSlot: string, existingRecord?: any) => {
    if (!selectedPatient) return;

    setModalDate(date);
    setModalTimeSlot(timeSlot);
    setModalExistingRecord(existingRecord || null);

    switch (activeTab) {
      case 'patrol':
        setShowPatrolModal(true);
        break;
      case 'diaper':
        setShowDiaperModal(true);
        break;
      case 'restraint':
        setShowRestraintModal(true);
        break;
      case 'position':
        setShowPositionModal(true);
        break;
    }
  };

  const handlePatrolSubmit = async (data: Omit<PatrolRound, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('📝 提交巡房記錄:', data);
      await createPatrolRound(data);
      console.log('✅ 巡房記錄創建成功');
      setShowPatrolModal(false);
    } catch (error) {
      console.error('❌ 創建巡房記錄失敗:', error);
    }
  };

  const handleDiaperSubmit = async (data: Omit<DiaperChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('📝 提交換片記錄:', data);
      if (modalExistingRecord) {
        await updateDiaperChangeRecord({ ...modalExistingRecord, ...data });
        console.log('✅ 換片記錄更新成功');
      } else {
        await createDiaperChangeRecord(data);
        console.log('✅ 換片記錄創建成功');
      }
      setShowDiaperModal(false);
    } catch (error) {
      console.error('❌ 保存換片記錄失敗:', error);
    }
  };

  const handleRestraintSubmit = async (data: Omit<RestraintObservationRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('📝 提交約束觀察記錄:', data);
      if (modalExistingRecord) {
        await updateRestraintObservationRecord({ ...modalExistingRecord, ...data });
        console.log('✅ 約束觀察記錄更新成功');
      } else {
        await createRestraintObservationRecord(data);
        console.log('✅ 約束觀察記錄創建成功');
      }
      setShowRestraintModal(false);
    } catch (error) {
      console.error('❌ 保存約束觀察記錄失敗:', error);
    }
  };

  const handlePositionSubmit = async (data: Omit<PositionChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('📝 提交轉身記錄:', data);
      await createPositionChangeRecord(data);
      console.log('✅ 轉身記錄創建成功');
      setShowPositionModal(false);
    } catch (error) {
      console.error('❌ 創建轉身記錄失敗:', error);
    }
  };

  const renderPatrolTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                時段
              </th>
              {weekDates.map((date) => {
                const d = new Date(date);
                const month = d.getMonth() + 1;
                const dayOfMonth = d.getDate();
                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                const weekday = weekdays[d.getDay()];
                return (
                  <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                    {month}/{dayOfMonth}<br/>({weekday})
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {TIME_SLOTS.map((timeSlot) => (
              <tr key={timeSlot} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                  {timeSlot}
                </td>
                {weekDates.map((date) => {
                  const record = patientPatrolRounds.find(
                    r => r.patrol_date === date && r.scheduled_time === timeSlot
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient, date, timeSlot, admissionRecords);
                  const overdue = !record && !inHospital && isOverdue(date, timeSlot);

                  return (
                    <td
                      key={date}
                      className={`px-2 py-3 text-center text-sm border cursor-pointer ${
                        inHospital ? 'bg-gray-100' :
                        record ? 'bg-green-50 hover:bg-green-100' :
                        overdue ? 'bg-red-50 hover:bg-red-100' :
                        'hover:bg-blue-50'
                      }`}
                      onClick={() => !inHospital && handleCellClick(date, timeSlot, record)}
                    >
                      {inHospital ? (
                        <span className="text-gray-500">入院</span>
                      ) : record ? (
                        <div>
                          <div className="text-green-600 font-bold">✓</div>
                          <div className="text-xs text-gray-600">{record.recorder}</div>
                        </div>
                      ) : overdue ? (
                        <span className="text-red-600 text-xs">逾期</span>
                      ) : (
                        <span className="text-gray-400 text-xs">待巡</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDiaperTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                時段
              </th>
              {weekDates.map((date) => {
                const d = new Date(date);
                const month = d.getMonth() + 1;
                const dayOfMonth = d.getDate();
                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                const weekday = weekdays[d.getDay()];
                return (
                  <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                    {month}/{dayOfMonth}<br/>({weekday})
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {DIAPER_CHANGE_SLOTS.map((slot) => (
              <tr key={slot.time} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                  <div>{slot.label}</div>
                  <div className="text-xs text-gray-500">{slot.time}</div>
                </td>
                {weekDates.map((date) => {
                  const record = patientDiaperChanges.find(
                    r => r.change_date === date && r.time_slot === slot.time
                  );
                  const timeStr = slot.time.split('-')[0];
                  const inHospital = selectedPatient && isInHospital(selectedPatient, date, timeStr, admissionRecords);

                  return (
                    <td
                      key={date}
                      className={`px-2 py-3 text-center text-sm border cursor-pointer ${
                        inHospital ? 'bg-gray-100' :
                        record ? 'bg-blue-50 hover:bg-blue-100' :
                        'hover:bg-blue-50'
                      }`}
                      onClick={() => !inHospital && handleCellClick(date, slot.time, record)}
                    >
                      {inHospital ? (
                        <span className="text-gray-500">入院</span>
                      ) : record ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {record.has_urine && '尿'}
                            {record.has_urine && record.has_stool && '/'}
                            {record.has_stool && '便'}
                            {record.has_none && '無'}
                          </div>
                          {record.has_urine && record.urine_amount && (
                            <div className="text-xs text-gray-600">尿: {record.urine_amount}</div>
                          )}
                          {record.has_stool && (
                            <div className="text-xs text-gray-600">
                              便: {record.stool_color || ''}{record.stool_texture ? ` ${record.stool_texture}` : ''}{record.stool_amount ? ` ${record.stool_amount}` : ''}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">{record.recorder}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">待記錄</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRestraintTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                時段
              </th>
              {weekDates.map((date) => {
                const d = new Date(date);
                const month = d.getMonth() + 1;
                const dayOfMonth = d.getDate();
                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                const weekday = weekdays[d.getDay()];
                return (
                  <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                    {month}/{dayOfMonth}<br/>({weekday})
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {TIME_SLOTS.map((timeSlot) => (
              <tr key={timeSlot} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                  {timeSlot}
                </td>
                {weekDates.map((date) => {
                  const record = patientRestraintObservations.find(
                    r => r.observation_date === date && r.scheduled_time === timeSlot
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient, date, timeSlot, admissionRecords);
                  const overdue = !record && !inHospital && isOverdue(date, timeSlot);

                  return (
                    <td
                      key={date}
                      className={`px-2 py-3 text-center text-sm border cursor-pointer ${
                        inHospital ? 'bg-gray-100' :
                        record ? (
                          record.observation_status === 'N' ? 'bg-green-50 hover:bg-green-100' :
                          record.observation_status === 'P' ? 'bg-red-50 hover:bg-red-100' :
                          'bg-orange-50 hover:bg-orange-100'
                        ) :
                        overdue ? 'bg-red-50 hover:bg-red-100' :
                        'hover:bg-blue-50'
                      }`}
                      onClick={() => !inHospital && handleCellClick(date, timeSlot, record)}
                    >
                      {inHospital ? (
                        <span className="text-gray-500">入院</span>
                      ) : record ? (
                        <div>
                          <div className={`font-bold ${
                            record.observation_status === 'N' ? 'text-green-600' :
                            record.observation_status === 'P' ? 'text-red-600' :
                            'text-orange-600'
                          }`}>
                            {record.observation_status === 'N' ? '🟢N' :
                             record.observation_status === 'P' ? '🔴P' : '🟠S'}
                          </div>
                          <div className="text-xs text-gray-600">{record.recorder}</div>
                        </div>
                      ) : overdue ? (
                        <span className="text-red-600 text-xs">逾期</span>
                      ) : (
                        <span className="text-gray-400 text-xs">待觀察</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPositionTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                時段
              </th>
              {weekDates.map((date) => {
                const d = new Date(date);
                const month = d.getMonth() + 1;
                const dayOfMonth = d.getDate();
                const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
                const weekday = weekdays[d.getDay()];
                return (
                  <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                    {month}/{dayOfMonth}<br/>({weekday})
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {TIME_SLOTS.map((timeSlot, index) => (
              <tr key={timeSlot} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border">
                  {timeSlot}
                </td>
                {weekDates.map((date) => {
                  const record = patientPositionChanges.find(
                    r => r.change_date === date && r.scheduled_time === timeSlot
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient, date, timeSlot, admissionRecords);
                  const expectedPosition = getPositionSequence(index);

                  return (
                    <td
                      key={date}
                      className={`px-2 py-3 text-center text-sm border cursor-pointer ${
                        inHospital ? 'bg-gray-100' :
                        record ? 'bg-purple-50 hover:bg-purple-100' :
                        'hover:bg-blue-50'
                      }`}
                      onClick={() => !inHospital && handleCellClick(date, timeSlot, record)}
                    >
                      {inHospital ? (
                        <span className="text-gray-500">入院</span>
                      ) : record ? (
                        <div>
                          <div className="font-medium text-purple-600">{record.position}</div>
                          <div className="text-xs text-gray-600">{record.recorder}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">[{expectedPosition}]</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPlaceholder = (tabName: string) => {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <p className="text-lg">{tabName}功能開發中</p>
          <p className="text-sm mt-2">敬請期待</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center space-x-2">
          <ClipboardCheck className="h-8 w-8 text-blue-600" />
          <span>護理記錄</span>
        </h1>
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-700">選擇院友</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousPatient}
                disabled={sortedActivePatients.length <= 1}
                className="btn-secondary flex items-center space-x-1 px-3 py-2 flex-shrink-0"
                title="上一位院友"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>上一位</span>
              </button>
              <div className="flex-1 min-w-0">
                <PatientAutocomplete
                  value={selectedPatientId}
                  onChange={setSelectedPatientId}
                  placeholder="搜尋院友..."
                  showResidencyFilter={true}
                  defaultResidencyStatus="在住"
                />
              </div>
              <button
                onClick={goToNextPatient}
                disabled={sortedActivePatients.length <= 1}
                className="btn-secondary flex items-center space-x-1 px-3 py-2 flex-shrink-0"
                title="下一位院友"
              >
                <span>下一位</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {sortedActivePatients.length > 0 && (
              <div className="text-sm text-gray-600 text-center lg:text-left">
                第 {sortedActivePatients.findIndex(p => p.院友id.toString() === selectedPatientId) + 1} / {sortedActivePatients.length} 位院友
                {selectedPatient && (
                  <span className="ml-2 text-blue-600">
                    (床號: {selectedPatient.床號})
                  </span>
                )}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">院友資訊</label>
              <div className="flex items-start space-x-3">
                {selectedPatient.院友相片 ? (
                  <img
                    src={selectedPatient.院友相片}
                    alt={selectedPatient.中文姓名}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-semibold text-gray-900">
                    {selectedPatient.中文姓名} ({selectedPatient.性別})
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedPatient.出生日期 && (
                      <div>{calculateAge(selectedPatient.出生日期)}歲</div>
                    )}
                    {selectedPatient.出生日期 && (
                      <div>{new Date(selectedPatient.出生日期).toLocaleDateString('zh-TW')}</div>
                    )}
                    <div>{selectedPatient.身份證號碼}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPatientId && (
        <>
          <div className="card">
            <div className="flex flex-wrap lg:flex-nowrap items-start justify-between gap-4 p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                <button
                  onClick={() => setActiveTab('patrol')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
                    activeTab === 'patrol'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>巡房記錄</span>
                </button>
                <button
                  onClick={() => setActiveTab('diaper')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
                    activeTab === 'diaper'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Baby className="h-4 w-4" />
                  <span>換片記錄</span>
                </button>
                <button
                  onClick={() => setActiveTab('intake_output')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
                    activeTab === 'intake_output'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Droplets className="h-4 w-4" />
                  <span>出入量記錄</span>
                </button>
                <button
                  onClick={() => setActiveTab('restraint')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
                    activeTab === 'restraint'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>約束觀察</span>
                </button>
                <button
                  onClick={() => setActiveTab('position')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
                    activeTab === 'position'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>轉身記錄</span>
                </button>
                <button
                  onClick={() => setActiveTab('toilet_training')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-2 ${
                    activeTab === 'toilet_training'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>如廁訓練</span>
                </button>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousWeek}
                    className="btn-secondary flex items-center space-x-1 px-3 py-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>上週</span>
                  </button>
                  <button
                    onClick={handleCurrentWeek}
                    className="btn-primary px-4 py-2"
                  >
                    本週
                  </button>
                  <button
                    onClick={handleNextWeek}
                    className="btn-secondary flex items-center space-x-1 px-3 py-2"
                  >
                    <span>下週</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  📅 {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
                </div>
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'patrol' && renderPatrolTable()}
              {activeTab === 'diaper' && renderDiaperTable()}
              {activeTab === 'intake_output' && renderPlaceholder('出入量記錄')}
              {activeTab === 'restraint' && renderRestraintTable()}
              {activeTab === 'position' && renderPositionTable()}
              {activeTab === 'toilet_training' && renderPlaceholder('如廁訓練記錄')}
            </div>
          </div>
        </>
      )}

      {showPatrolModal && selectedPatient && (
        <PatrolRoundModal
          patient={selectedPatient}
          date={modalDate}
          timeSlot={modalTimeSlot}
          staffName={displayName}
          existingRecord={modalExistingRecord}
          onClose={() => setShowPatrolModal(false)}
          onSubmit={handlePatrolSubmit}
          onDelete={(id) => deletePatrolRound(id).then(() => setShowPatrolModal(false))}
        />
      )}

      {showDiaperModal && selectedPatient && (
        <DiaperChangeModal
          patient={selectedPatient}
          date={modalDate}
          timeSlot={modalTimeSlot}
          staffName={displayName}
          existingRecord={modalExistingRecord}
          onClose={() => setShowDiaperModal(false)}
          onSubmit={handleDiaperSubmit}
          onDelete={(id) => deleteDiaperChangeRecord(id).then(() => setShowDiaperModal(false))}
        />
      )}

      {showRestraintModal && selectedPatient && (
        <RestraintObservationModal
          patient={selectedPatient}
          date={modalDate}
          timeSlot={modalTimeSlot}
          staffName={displayName}
          existingRecord={modalExistingRecord}
          restraintAssessments={patientRestraintAssessments}
          onClose={() => setShowRestraintModal(false)}
          onSubmit={handleRestraintSubmit}
          onDelete={(id) => deleteRestraintObservationRecord(id).then(() => setShowRestraintModal(false))}
        />
      )}

      {showPositionModal && selectedPatient && (
        <PositionChangeModal
          patient={selectedPatient}
          date={modalDate}
          timeSlot={modalTimeSlot}
          staffName={displayName}
          existingRecord={modalExistingRecord}
          onClose={() => setShowPositionModal(false)}
          onSubmit={handlePositionSubmit}
          onDelete={(id) => deletePositionChangeRecord(id).then(() => setShowPositionModal(false))}
        />
      )}
    </div>
  );
};

export default CareRecords;
