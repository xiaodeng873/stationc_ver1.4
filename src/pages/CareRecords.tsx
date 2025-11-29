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
    return patrolRounds.filter(r => r.patient_id === patientIdNum);
  }, [selectedPatientId, patrolRounds]);

  const patientDiaperChanges = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    return diaperChangeRecords.filter(r => r.patient_id === patientIdNum);
  }, [selectedPatientId, diaperChangeRecords]);

  const patientRestraintObservations = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    return restraintObservationRecords.filter(r => r.patient_id === patientIdNum);
  }, [selectedPatientId, restraintObservationRecords]);

  const patientPositionChanges = useMemo(() => {
    if (!selectedPatientId) return [];
    const patientIdNum = parseInt(selectedPatientId);
    return positionChangeRecords.filter(r => r.patient_id === patientIdNum);
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
      await createPatrolRound(data);
      setShowPatrolModal(false);
    } catch (error) {
      console.error('創建巡房記錄失敗:', error);
    }
  };

  const handleDiaperSubmit = async (data: Omit<DiaperChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (modalExistingRecord) {
        await updateDiaperChangeRecord({ ...modalExistingRecord, ...data });
      } else {
        await createDiaperChangeRecord(data);
      }
      setShowDiaperModal(false);
    } catch (error) {
      console.error('保存換片記錄失敗:', error);
    }
  };

  const handleRestraintSubmit = async (data: Omit<RestraintObservationRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (modalExistingRecord) {
        await updateRestraintObservationRecord({ ...modalExistingRecord, ...data });
      } else {
        await createRestraintObservationRecord(data);
      }
      setShowRestraintModal(false);
    } catch (error) {
      console.error('保存約束觀察記錄失敗:', error);
    }
  };

  const handlePositionSubmit = async (data: Omit<PositionChangeRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await createPositionChangeRecord(data);
      setShowPositionModal(false);
    } catch (error) {
      console.error('創建轉身記錄失敗:', error);
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
                    r => r.record_date === date && r.time_slot === timeSlot
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient.院友id, date, timeSlot, admissionRecords);
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
                      onClick={() => !record && !inHospital && handleCellClick(date, timeSlot)}
                    >
                      {inHospital ? (
                        <span className="text-gray-500">入院</span>
                      ) : record ? (
                        <div>
                          <div className="text-green-600 font-bold">✓</div>
                          <div className="text-xs text-gray-600">{record.staff_name}</div>
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
                    r => r.record_date === date && r.time_slot === slot.time
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient.院友id, date, slot.time.split('-')[0], admissionRecords);

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
                            {record.urine_status && '尿'}
                            {record.urine_status && record.stool_status && '/'}
                            {record.stool_status && '便'}
                          </div>
                          {record.urine_status && (
                            <div className="text-xs text-gray-600">{record.urine_status}</div>
                          )}
                          {record.stool_status && (
                            <div className="text-xs text-gray-600">{record.stool_status}</div>
                          )}
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
                    r => r.observation_date === date && r.time_slot === timeSlot
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient.院友id, date, timeSlot, admissionRecords);
                  const overdue = !record && !inHospital && isOverdue(date, timeSlot);

                  return (
                    <td
                      key={date}
                      className={`px-2 py-3 text-center text-sm border cursor-pointer ${
                        inHospital ? 'bg-gray-100' :
                        record ? (
                          record.status === 'normal' ? 'bg-green-50 hover:bg-green-100' :
                          record.status === 'abnormal' ? 'bg-red-50 hover:bg-red-100' :
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
                            record.status === 'normal' ? 'text-green-600' :
                            record.status === 'abnormal' ? 'text-red-600' :
                            'text-orange-600'
                          }`}>
                            {record.status === 'normal' ? '🟢N' :
                             record.status === 'abnormal' ? '🔴P' : '🟠S'}
                          </div>
                          <div className="text-xs text-gray-600">{record.staff_name}</div>
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
                    r => r.record_date === date && r.time_slot === timeSlot
                  );
                  const inHospital = selectedPatient && isInHospital(selectedPatient.院友id, date, timeSlot, admissionRecords);
                  const expectedPosition = getPositionSequence(index);

                  return (
                    <td
                      key={date}
                      className={`px-2 py-3 text-center text-sm border cursor-pointer ${
                        inHospital ? 'bg-gray-100' :
                        record ? 'bg-purple-50 hover:bg-purple-100' :
                        'hover:bg-blue-50'
                      }`}
                      onClick={() => !record && !inHospital && handleCellClick(date, timeSlot)}
                    >
                      {inHospital ? (
                        <span className="text-gray-500">入院</span>
                      ) : record ? (
                        <div>
                          <div className="font-medium text-purple-600">{record.position}</div>
                          <div className="text-xs text-gray-600">{record.staff_name}</div>
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

      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">選擇院友</label>
            <PatientAutocomplete
              patients={sortedActivePatients}
              selectedPatientId={selectedPatientId}
              onSelect={(id) => setSelectedPatientId(id)}
              placeholder="搜尋院友..."
            />
            {selectedPatient && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>床號: <strong>{selectedPatient.床號}</strong></span>
                <span>姓名: <strong>{selectedPatient.姓名}</strong></span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">選擇週期</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousWeek}
                className="btn-secondary flex items-center space-x-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>上週</span>
              </button>
              <button
                onClick={handleCurrentWeek}
                className="btn-primary flex-1"
              >
                本週
              </button>
              <button
                onClick={handleNextWeek}
                className="btn-secondary flex items-center space-x-1"
              >
                <span>下週</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600 text-center">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </div>
          </div>
        </div>
      </div>

      {selectedPatientId && (
        <>
          <div className="card">
            <div className="border-b border-gray-200">
              <div className="flex space-x-1 p-2 overflow-x-auto">
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
          onClose={() => setShowPatrolModal(false)}
          onSubmit={handlePatrolSubmit}
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
        />
      )}

      {showRestraintModal && selectedPatient && (
        <RestraintObservationModal
          patient={selectedPatient}
          date={modalDate}
          timeSlot={modalTimeSlot}
          staffName={displayName}
          existingRecord={modalExistingRecord}
          onClose={() => setShowRestraintModal(false)}
          onSubmit={handleRestraintSubmit}
        />
      )}

      {showPositionModal && selectedPatient && (
        <PositionChangeModal
          patient={selectedPatient}
          date={modalDate}
          timeSlot={modalTimeSlot}
          staffName={displayName}
          onClose={() => setShowPositionModal(false)}
          onSubmit={handlePositionSubmit}
        />
      )}
    </div>
  );
};

export default CareRecords;
