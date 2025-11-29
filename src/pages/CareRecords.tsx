import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Users,
  Baby,
  Shield,
  RotateCcw,
  Droplets,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
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
  filterPatientsByNursingLevel,
  filterPatientsWithRestraints,
  filterBedriddenPatients,
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

  const [activeTab, setActiveTab] = useState<TabType>('patrol');
  const [weekStartDate, setWeekStartDate] = useState(getWeekStartDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const [showPatrolModal, setShowPatrolModal] = useState(false);
  const [showDiaperModal, setShowDiaperModal] = useState(false);
  const [showRestraintModal, setShowRestraintModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  const [modalPatient, setModalPatient] = useState<Patient | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalTimeSlot, setModalTimeSlot] = useState('');
  const [modalExistingRecord, setModalExistingRecord] = useState<any>(null);

  const weekDates = useMemo(() => generateWeekDates(weekStartDate), [weekStartDate]);

  const filteredPatients = useMemo(() => {
    let filtered = patients.filter(p => p.在住狀態 === '在住');

    switch (activeTab) {
      case 'patrol':
        break;
      case 'diaper':
        filtered = filterPatientsByNursingLevel(filtered, '全護理');
        break;
      case 'restraint':
        filtered = filterPatientsWithRestraints(filtered, patientRestraintAssessments);
        break;
      case 'position':
        filtered = filterBedriddenPatients(filtered, healthAssessments);
        break;
      default:
        break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.中文姓名?.toLowerCase().includes(term) ||
        p.床號?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => {
      const bedA = a.床號 || '';
      const bedB = b.床號 || '';
      return bedA.localeCompare(bedB, 'zh-TW', { numeric: true });
    });
  }, [patients, activeTab, searchTerm, patientRestraintAssessments, healthAssessments]);

  const getPatrolRoundRecord = (patientId: number, date: string, scheduledTime: string): PatrolRound | undefined => {
    return patrolRounds.find(r =>
      r.patient_id === patientId &&
      r.patrol_date === date &&
      r.scheduled_time === scheduledTime
    );
  };

  const getDiaperChangeRecord = (patientId: number, date: string, timeSlot: string): DiaperChangeRecord | undefined => {
    return diaperChangeRecords.find(r =>
      r.patient_id === patientId &&
      r.change_date === date &&
      r.time_slot === timeSlot
    );
  };

  const getRestraintObservationRecord = (patientId: number, date: string, scheduledTime: string): RestraintObservationRecord | undefined => {
    return restraintObservationRecords.find(r =>
      r.patient_id === patientId &&
      r.observation_date === date &&
      r.scheduled_time === scheduledTime
    );
  };

  const getPositionChangeRecord = (patientId: number, date: string, scheduledTime: string): PositionChangeRecord | undefined => {
    return positionChangeRecords.find(r =>
      r.patient_id === patientId &&
      r.change_date === date &&
      r.scheduled_time === scheduledTime
    );
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStartDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStartDate(newDate);
  };

  const handleThisWeek = () => {
    setWeekStartDate(getWeekStartDate());
  };

  const handlePatrolClick = (patient: Patient, date: Date, scheduledTime: string) => {
    const dateStr = formatDate(date);
    const existingRecord = getPatrolRoundRecord(patient.院友id, dateStr, scheduledTime);

    if (existingRecord) {
      if (confirm('此記錄已存在，是否要刪除？')) {
        deletePatrolRound(existingRecord.id);
      }
    } else {
      setModalPatient(patient);
      setModalDate(dateStr);
      setModalTimeSlot(scheduledTime);
      setShowPatrolModal(true);
    }
  };

  const handlePatrolConfirm = async (data: { patrol_time: string; recorder: string; notes?: string }) => {
    if (!modalPatient) return;

    await createPatrolRound({
      patient_id: modalPatient.院友id,
      patrol_date: modalDate,
      patrol_time: data.patrol_time,
      scheduled_time: modalTimeSlot,
      recorder: data.recorder,
      notes: data.notes
    });

    setShowPatrolModal(false);
    setModalPatient(null);
  };

  const handleDiaperClick = (patient: Patient, date: Date, timeSlot: string) => {
    const dateStr = formatDate(date);
    const existingRecord = getDiaperChangeRecord(patient.院友id, dateStr, timeSlot);

    setModalPatient(patient);
    setModalDate(dateStr);
    setModalTimeSlot(timeSlot);
    setModalExistingRecord(existingRecord || null);
    setShowDiaperModal(true);
  };

  const handleDiaperConfirm = async (data: any) => {
    if (!modalPatient) return;

    if (modalExistingRecord) {
      await updateDiaperChangeRecord({
        ...modalExistingRecord,
        ...data
      });
    } else {
      await createDiaperChangeRecord({
        patient_id: modalPatient.院友id,
        change_date: modalDate,
        time_slot: modalTimeSlot,
        ...data
      });
    }

    setShowDiaperModal(false);
    setModalPatient(null);
    setModalExistingRecord(null);
  };

  const handleRestraintClick = (patient: Patient, date: Date, scheduledTime: string) => {
    const dateStr = formatDate(date);
    const existingRecord = getRestraintObservationRecord(patient.院友id, dateStr, scheduledTime);

    setModalPatient(patient);
    setModalDate(dateStr);
    setModalTimeSlot(scheduledTime);
    setModalExistingRecord(existingRecord || null);
    setShowRestraintModal(true);
  };

  const handleRestraintConfirm = async (data: any) => {
    if (!modalPatient) return;

    if (modalExistingRecord) {
      await updateRestraintObservationRecord({
        ...modalExistingRecord,
        ...data
      });
    } else {
      await createRestraintObservationRecord({
        patient_id: modalPatient.院友id,
        observation_date: modalDate,
        observation_time: data.observation_time,
        scheduled_time: modalTimeSlot,
        observation_status: data.observation_status,
        recorder: data.recorder,
        notes: data.notes
      });
    }

    setShowRestraintModal(false);
    setModalPatient(null);
    setModalExistingRecord(null);
  };

  const handlePositionClick = (patient: Patient, date: Date, scheduledTime: string) => {
    const dateStr = formatDate(date);
    const existingRecord = getPositionChangeRecord(patient.院友id, dateStr, scheduledTime);

    if (existingRecord) {
      if (confirm('此記錄已存在，是否要刪除？')) {
        deletePositionChangeRecord(existingRecord.id);
      }
    } else {
      setModalPatient(patient);
      setModalDate(dateStr);
      setModalTimeSlot(scheduledTime);
      setShowPositionModal(true);
    }
  };

  const handlePositionConfirm = async (data: { position: '左' | '平' | '右'; recorder: string }) => {
    if (!modalPatient) return;

    await createPositionChangeRecord({
      patient_id: modalPatient.院友id,
      change_date: modalDate,
      scheduled_time: modalTimeSlot,
      position: data.position,
      recorder: data.recorder
    });

    setShowPositionModal(false);
    setModalPatient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'patrol' as TabType, name: '巡房記錄', icon: ClipboardCheck },
    { id: 'diaper' as TabType, name: '換片記錄', icon: Baby },
    { id: 'intake_output' as TabType, name: '出入量記錄', icon: Droplets },
    { id: 'restraint' as TabType, name: '約束物品觀察', icon: Shield },
    { id: 'position' as TabType, name: '轉身記錄', icon: RotateCcw },
    { id: 'toilet_training' as TabType, name: '如廁訓練記錄', icon: GraduationCap }
  ];

  const renderCellButton = (
    patient: Patient,
    date: Date,
    timeSlot: string,
    onClick: () => void
  ) => {
    const dateStr = formatDate(date);
    const inHospital = isInHospital(patient, dateStr, timeSlot, admissionRecords);

    let record: any = null;
    let hasRecord = false;
    let buttonClass = 'w-full h-10 rounded text-xs font-medium transition-colors ';
    let displayText = '';
    let isOverdueStatus = false;

    if (inHospital) {
      buttonClass += 'bg-gray-200 text-gray-400 cursor-not-allowed';
      displayText = '入院';
      return (
        <button
          disabled
          className={buttonClass}
          title="院友入院中，無法操作"
        >
          {displayText}
        </button>
      );
    }

    if (activeTab === 'patrol') {
      record = getPatrolRoundRecord(patient.院友id, dateStr, timeSlot);
      hasRecord = !!record;
      if (hasRecord) {
        buttonClass += 'bg-green-500 text-white hover:bg-green-600';
        displayText = '✓';
      } else {
        const scheduledDateTime = new Date(`${dateStr}T${timeSlot}:00`);
        isOverdueStatus = isOverdue(scheduledDateTime, new Date());
        if (isOverdueStatus) {
          buttonClass += 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300';
          displayText = '逾期';
        } else {
          buttonClass += 'bg-gray-100 text-gray-600 hover:bg-gray-200';
          displayText = '待巡房';
        }
      }
    } else if (activeTab === 'diaper') {
      record = getDiaperChangeRecord(patient.院友id, dateStr, timeSlot);
      hasRecord = !!record;
      if (hasRecord) {
        buttonClass += 'bg-green-500 text-white hover:bg-green-600';
        const types = [];
        if (record.has_urine) types.push('尿');
        if (record.has_stool) types.push('便');
        if (record.has_none) types.push('無');
        displayText = types.join('/');
      } else {
        buttonClass += 'bg-gray-100 text-gray-600 hover:bg-gray-200';
        displayText = '待記錄';
      }
    } else if (activeTab === 'restraint') {
      record = getRestraintObservationRecord(patient.院友id, dateStr, timeSlot);
      hasRecord = !!record;
      if (hasRecord) {
        if (record.observation_status === 'N') {
          buttonClass += 'bg-green-500 text-white hover:bg-green-600';
          displayText = 'N';
        } else if (record.observation_status === 'P') {
          buttonClass += 'bg-red-500 text-white hover:bg-red-600';
          displayText = 'P';
        } else {
          buttonClass += 'bg-orange-500 text-white hover:bg-orange-600';
          displayText = 'S';
        }
      } else {
        const scheduledDateTime = new Date(`${dateStr}T${timeSlot}:00`);
        isOverdueStatus = isOverdue(scheduledDateTime, new Date());
        if (isOverdueStatus) {
          buttonClass += 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300';
          displayText = '逾期';
        } else {
          buttonClass += 'bg-gray-100 text-gray-600 hover:bg-gray-200';
          displayText = '待觀察';
        }
      }
    } else if (activeTab === 'position') {
      record = getPositionChangeRecord(patient.院友id, dateStr, timeSlot);
      hasRecord = !!record;
      if (hasRecord) {
        buttonClass += 'bg-green-500 text-white hover:bg-green-600';
        displayText = record.position;
      } else {
        buttonClass += 'bg-gray-100 text-gray-600 hover:bg-gray-200';
        const suggestedPos = getPositionSequence(timeSlot);
        displayText = suggestedPos;
      }
    }

    return (
      <button
        onClick={onClick}
        className={buttonClass}
        title={hasRecord ? '點擊修改或刪除' : '點擊新增記錄'}
      >
        {displayText}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">巡房記錄</h1>
              <p className="text-sm text-gray-600 mt-1">護理記錄管理系統</p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {(activeTab === 'intake_output' || activeTab === 'toilet_training') ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">功能開發中</h3>
            <p className="text-gray-600">此功能尚在開發中，敬請期待</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePreviousWeek}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="上一週"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-lg font-medium text-gray-900">
                    {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
                  </span>
                </div>
                <button
                  onClick={handleNextWeek}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="下一週"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleThisWeek}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  本週
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜尋院友或床號"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{filteredPatients.length}</span>
                  <span className="text-sm text-gray-600">位院友</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                      院友
                    </th>
                    {weekDates.map((date, index) => (
                      <th key={index} colSpan={activeTab === 'diaper' ? DIAPER_CHANGE_SLOTS.length : TIME_SLOTS.length} className="px-2 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                        <div>{date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', weekday: 'short' })}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-10 bg-gray-100 px-4 py-2 text-left text-xs text-gray-600 border-r border-gray-200">
                      床號 / 姓名
                    </th>
                    {weekDates.map((date, dateIndex) => (
                      <React.Fragment key={dateIndex}>
                        {(activeTab === 'diaper' ? DIAPER_CHANGE_SLOTS : TIME_SLOTS).map((slot, slotIndex) => (
                          <th key={`${dateIndex}-${slotIndex}`} className="px-1 py-2 text-xs text-gray-600 border-r border-gray-200 min-w-[60px]">
                            {slot}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.院友id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{patient.床號}</div>
                          <div className="text-gray-600">{patient.中文姓名}</div>
                        </div>
                      </td>
                      {weekDates.map((date, dateIndex) => (
                        <React.Fragment key={dateIndex}>
                          {(activeTab === 'diaper' ? DIAPER_CHANGE_SLOTS : TIME_SLOTS).map((slot, slotIndex) => (
                            <td key={`${dateIndex}-${slotIndex}`} className="px-1 py-2 border-r border-gray-200">
                              {renderCellButton(
                                patient,
                                date,
                                slot,
                                () => {
                                  if (activeTab === 'patrol') {
                                    handlePatrolClick(patient, date, slot);
                                  } else if (activeTab === 'diaper') {
                                    handleDiaperClick(patient, date, slot);
                                  } else if (activeTab === 'restraint') {
                                    handleRestraintClick(patient, date, slot);
                                  } else if (activeTab === 'position') {
                                    handlePositionClick(patient, date, slot);
                                  }
                                }
                              )}
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={1 + weekDates.length * (activeTab === 'diaper' ? DIAPER_CHANGE_SLOTS.length : TIME_SLOTS.length)} className="px-4 py-8 text-center text-gray-500">
                        無符合條件的院友
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showPatrolModal && modalPatient && (
        <PatrolRoundModal
          isOpen={showPatrolModal}
          onClose={() => {
            setShowPatrolModal(false);
            setModalPatient(null);
          }}
          onConfirm={handlePatrolConfirm}
          patientName={modalPatient.中文姓名}
          scheduledTime={modalTimeSlot}
          date={modalDate}
        />
      )}

      {showDiaperModal && modalPatient && (
        <DiaperChangeModal
          isOpen={showDiaperModal}
          onClose={() => {
            setShowDiaperModal(false);
            setModalPatient(null);
            setModalExistingRecord(null);
          }}
          onConfirm={handleDiaperConfirm}
          patientName={modalPatient.中文姓名}
          timeSlot={modalTimeSlot}
          date={modalDate}
          existingRecord={modalExistingRecord}
        />
      )}

      {showRestraintModal && modalPatient && (
        <RestraintObservationModal
          isOpen={showRestraintModal}
          onClose={() => {
            setShowRestraintModal(false);
            setModalPatient(null);
            setModalExistingRecord(null);
          }}
          onConfirm={handleRestraintConfirm}
          patientName={modalPatient.中文姓名}
          scheduledTime={modalTimeSlot}
          date={modalDate}
          existingRecord={modalExistingRecord}
        />
      )}

      {showPositionModal && modalPatient && (
        <PositionChangeModal
          isOpen={showPositionModal}
          onClose={() => {
            setShowPositionModal(false);
            setModalPatient(null);
          }}
          onConfirm={handlePositionConfirm}
          patientName={modalPatient.中文姓名}
          scheduledTime={modalTimeSlot}
          date={modalDate}
        />
      )}
    </div>
  );
};

export default CareRecords;
