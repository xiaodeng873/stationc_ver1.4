import React, { useState, useMemo } from 'react';
import { BarChart3, Download, Calendar, Users, FileText, Activity, Utensils, Stethoscope, AlertCircle } from 'lucide-react';
import { usePatients } from '../context/PatientContext';

type ReportTab = 'daily' | 'monthly' | 'infection' | 'meal' | 'tube' | 'special';
type TimeFilter = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth';
type StationFilter = 'all' | string;

interface StatCardProps {
  title: string;
  value: number;
  bgColor: string;
  textColor: string;
  subtitle?: string;
  patientNames?: string[];
}

const StatCard: React.FC<StatCardProps> = ({ title, value, bgColor, textColor, subtitle, patientNames }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`${bgColor} p-4 rounded-lg relative cursor-pointer`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>

      {showTooltip && patientNames && patientNames.length > 0 && (
        <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl -top-2 left-full ml-2 w-48 max-h-64 overflow-y-auto">
          <div className="font-semibold mb-2">院友名單:</div>
          <ul className="space-y-1">
            {patientNames.map((name, idx) => (
              <li key={idx} className="text-gray-200">{name}</li>
            ))}
          </ul>
          <div className="absolute w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-900 -left-2 top-4"></div>
        </div>
      )}
    </div>
  );
};

const Reports: React.FC = () => {
  const { patients, stations, healthAssessments, woundAssessments, incidentReports, patientHealthTasks, patientRestraintAssessments, prescriptions, healthRecords, loading } = usePatients();
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [stationFilter, setStationFilter] = useState<StationFilter>('all');

  const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return { today, yesterday, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd };
  };

  const { today, yesterday, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd } = getDateRanges();

  const filteredPatients = useMemo(() => {
    if (stationFilter === 'all') return patients || [];
    return (patients || []).filter(p => p.station_id === stationFilter);
  }, [patients, stationFilter]);

  const dailyReportData = useMemo(() => {
    const targetDate = timeFilter === 'today' ? today : yesterday;
    const activePatients = filteredPatients.filter(p => p.在住狀態 === '在住');

    const 買位Patients = activePatients.filter(p => p.入住類型 === '買位');
    const 私位Patients = activePatients.filter(p => p.入住類型 === '私位');
    const 院舍劵Patients = activePatients.filter(p => p.入住類型 === '院舍卷');
    const 暫住Patients = activePatients.filter(p => p.入住類型 === '暫住');

    const admissionTypeStats = {
      買位: { count: 買位Patients.length, names: 買位Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
      私位: { count: 私位Patients.length, names: 私位Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
      院舍劵: { count: 院舍劵Patients.length, names: 院舍劵Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
      暫住: { count: 暫住Patients.length, names: 暫住Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
    };

    const 住在本站男Patients = activePatients.filter(p => p.性別 === '男' && !p.is_hospitalized);
    const 住在本站女Patients = activePatients.filter(p => p.性別 === '女' && !p.is_hospitalized);
    const 入住醫院男Patients = activePatients.filter(p => p.性別 === '男' && p.is_hospitalized);
    const 入住醫院女Patients = activePatients.filter(p => p.性別 === '女' && p.is_hospitalized);

    const residenceStats = {
      住在本站男: 住在本站男Patients.length,
      住在本站女: 住在本站女Patients.length,
      入住醫院男: 入住醫院男Patients.length,
      入住醫院女: 入住醫院女Patients.length,
      暫時回家男: 0,
      暫時回家女: 0,
      住在本站男Names: 住在本站男Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`),
      住在本站女Names: 住在本站女Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`),
      入住醫院男Names: 入住醫院男Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`),
      入住醫院女Names: 入住醫院女Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`),
    };

    const newAdmissionsPatients = filteredPatients.filter(p => {
      if (!p.入住日期) return false;
      const admissionDate = new Date(p.入住日期);
      return admissionDate >= targetDate && admissionDate < new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    });

    const dischargePatients = filteredPatients.filter(p => {
      if (!p.退住日期) return false;
      const dischargeDate = new Date(p.退住日期);
      return dischargeDate.toDateString() === targetDate.toDateString();
    });

    const deathPatients = filteredPatients.filter(p => {
      if (!p.death_date || p.discharge_reason !== '死亡') return false;
      const deathDate = new Date(p.death_date);
      return deathDate >= targetDate && deathDate < new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    });

    const monthStart = timeFilter === 'today' ? thisMonthStart : lastMonthStart;
    const monthEnd = timeFilter === 'today' ? thisMonthEnd : lastMonthEnd;
    const monthlyDeathPatients = (patients || []).filter(p => {
      if (!p.death_date || p.discharge_reason !== '死亡') return false;
      const deathDate = new Date(p.death_date);
      return deathDate >= monthStart && deathDate <= monthEnd;
    });

    const ngTubePatients = activePatients.filter(p => {
      return (patientHealthTasks || []).some(task =>
        task.patient_id === p.院友id &&
        task.health_record_type === '鼻胃飼管更換'
      );
    });

    const catheterPatients = activePatients.filter(p => {
      return (patientHealthTasks || []).some(task =>
        task.patient_id === p.院友id &&
        task.health_record_type === '尿導管更換'
      );
    });

    const woundPatientIds = new Set<number>();
    const pressureUlcerPatientIds = new Set<number>();
    (woundAssessments || []).forEach(assessment => {
      const patient = activePatients.find(p => p.院友id === assessment.patient_id);
      if (!patient) return;

      assessment.wound_details?.forEach(detail => {
        if (detail.wound_status === '未處理' || detail.wound_status === '治療中') {
          woundPatientIds.add(assessment.patient_id);
          if (detail.wound_type === '壓力性') {
            pressureUlcerPatientIds.add(assessment.patient_id);
          }
        }
      });
    });

    const woundPatients = activePatients.filter(p => woundPatientIds.has(p.院友id));
    const pressureUlcerPatients = activePatients.filter(p => pressureUlcerPatientIds.has(p.院友id));

    const dialysisPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.treatment_items?.includes('腹膜/血液透析');
    });

    const oxygenPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.treatment_items?.includes('氧氣治療');
    });

    const stomaPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.bowel_bladder_control?.bowel === '腸造口' || assessment?.bowel_bladder_control?.bladder === '小便造口';
    });

    const infectionControlPatients = activePatients.filter(p =>
      p.感染控制 && p.感染控制.length > 0
    );

    const restraintPatientIds = new Set((patientRestraintAssessments || []).map(r => r.patient_id));
    const restraintPatients = activePatients.filter(p => restraintPatientIds.has(p.院友id));

    const todayIncidents = (incidentReports || []).filter(incident => {
      const incidentDate = new Date(incident.incident_date);
      return incidentDate.toDateString() === targetDate.toDateString();
    });

    const medicationIncidentPatients = todayIncidents.filter(i => i.incident_type === '藥物');
    const fallIncidentPatients = todayIncidents.filter(i => i.incident_nature === '跌倒');

    const fullCare男Patients = activePatients.filter(p => p.護理等級 === '全護理' && p.性別 === '男');
    const fullCare女Patients = activePatients.filter(p => p.護理等級 === '全護理' && p.性別 === '女');
    const semiCare男Patients = activePatients.filter(p => p.護理等級 === '半護理' && p.性別 === '男');
    const semiCare女Patients = activePatients.filter(p => p.護理等級 === '半護理' && p.性別 === '女');
    const convalescent男Patients = activePatients.filter(p => p.護理等級 === '療養級' && p.性別 === '男');
    const convalescent女Patients = activePatients.filter(p => p.護理等級 === '療養級' && p.性別 === '女');

    return {
      admissionTypeStats,
      residenceStats,
      newAdmissions: {
        男: newAdmissionsPatients.filter(p => p.性別 === '男').length,
        女: newAdmissionsPatients.filter(p => p.性別 === '女').length,
        count: newAdmissionsPatients.length,
        names: newAdmissionsPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`)
      },
      discharge: {
        男: dischargePatients.filter(p => p.性別 === '男').length,
        女: dischargePatients.filter(p => p.性別 === '女').length,
        total: dischargePatients.length,
        names: dischargePatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`)
      },
      death: {
        男: deathPatients.filter(p => p.性別 === '男').length,
        女: deathPatients.filter(p => p.性別 === '女').length,
        total: deathPatients.length,
        names: deathPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`)
      },
      monthlyDeaths: {
        count: monthlyDeathPatients.length,
        names: monthlyDeathPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`)
      },
      medical: {
        鼻胃飼: { count: ngTubePatients.length, names: ngTubePatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        導尿管: { count: catheterPatients.length, names: catheterPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        傷口: { count: woundPatients.length, names: woundPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        壓瘡: { count: pressureUlcerPatients.length, names: pressureUlcerPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        腹膜血液透析: { count: dialysisPatients.length, names: dialysisPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        氧氣治療: { count: oxygenPatients.length, names: oxygenPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        造口: { count: stomaPatients.length, names: stomaPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        感染控制: { count: infectionControlPatients.length, names: infectionControlPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        使用約束物品: { count: restraintPatients.length, names: restraintPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
      },
      incidents: {
        藥物: { count: medicationIncidentPatients.length, names: medicationIncidentPatients.map(i => {
          const p = activePatients.find(patient => patient.院友id === i.patient_id);
          return p ? `${p.床號} ${p.中文姓氏}${p.中文名字}` : '未知';
        })},
        跌倒: { count: fallIncidentPatients.length, names: fallIncidentPatients.map(i => {
          const p = activePatients.find(patient => patient.院友id === i.patient_id);
          return p ? `${p.床號} ${p.中文姓氏}${p.中文名字}` : '未知';
        })},
        死亡: { count: deathPatients.length, names: deathPatients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
      },
      careLevel: {
        全護理男: { count: fullCare男Patients.length, names: fullCare男Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        全護理女: { count: fullCare女Patients.length, names: fullCare女Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        半護理男: { count: semiCare男Patients.length, names: semiCare男Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        半護理女: { count: semiCare女Patients.length, names: semiCare女Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        療養級男: { count: convalescent男Patients.length, names: convalescent男Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
        療養級女: { count: convalescent女Patients.length, names: convalescent女Patients.map(p => `${p.床號} ${p.中文姓氏}${p.中文名字}`) },
      },
    };
  }, [filteredPatients, timeFilter, healthAssessments, woundAssessments, incidentReports, patientRestraintAssessments, patientHealthTasks, today, yesterday, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd, patients]);

  const monthlyReportData = useMemo(() => {
    const activePatients = filteredPatients.filter(p => p.在住狀態 === '在住');
    const monthStart = timeFilter === 'today' ? thisMonthStart : lastMonthStart;
    const monthEnd = timeFilter === 'today' ? thisMonthEnd : lastMonthEnd;

    // 半護理
    const semiCarePatients = activePatients.filter(p => p.護理等級 === '半護理');

    // 全護理
    const fullCarePatients = activePatients.filter(p => p.護理等級 === '全護理');

    // 導尿管
    const catheterPatients = activePatients.filter(p => {
      return (patientHealthTasks || []).some(task =>
        task.patient_id === p.院友id &&
        task.health_record_type === '尿導管更換'
      );
    });

    // 遊走
    const wanderingPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.behavior_expression?.includes('遊走');
    });

    // 情緒問題 (抑鬱/激動)
    const emotionalPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.emotional_expression === '抑鬱' || assessment?.emotional_expression === '激動';
    });

    // 長期卧床
    const bedriddenPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.daily_activities?.mobility === '卧床';
    });

    // 長期使用輪椅
    const wheelchairPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.daily_activities?.mobility === '輪椅';
    });

    // 一人協助
    const onePersonAssistPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.daily_activities?.mobility === '一人協助';
    });

    // 二人協助
    const twoPersonAssistPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.daily_activities?.mobility === '二人協助';
    });

    // 需餵食
    const needFeedingPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.daily_activities?.eating === '需要幫助' || assessment?.daily_activities?.eating === '完全依賴';
    });

    // 鼻胃飼
    const ngTubePatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.nutrition_diet?.status === '鼻胃管';
    });

    // 腹膜/血液透析
    const dialysisPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.treatment_items?.includes('腹膜/血液透析');
    });

    // 造口
    const stomaPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.bowel_bladder_control?.bowel === '腸造口' || assessment?.bowel_bladder_control?.bladder === '小便造口';
    });

    // 服藥9種或以上
    const multiMedicationPatients = activePatients.filter(p => {
      const activePrescriptions = (prescriptions || []).filter(rx =>
        rx.patient_id === p.院友id && rx.status === 'active'
      );
      return activePrescriptions.length >= 9;
    });

    // 接受物理治療
    const physioTherapyPatients = activePatients.filter(p => {
      return (patientHealthTasks || []).some(task =>
        task.patient_id === p.院友id &&
        task.notes === '物理治療'
      );
    });

    // 接受職業治療
    const occupationalTherapyPatients = activePatients.filter(p => {
      return (patientHealthTasks || []).some(task =>
        task.patient_id === p.院友id &&
        task.notes === '職業治療'
      );
    });

    // 入院
    const hospitalizedPatients = activePatients.filter(p => p.is_hospitalized);

    // 認知障礙
    const cognitiveImpairmentPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.consciousness_cognition?.includes('認知障礙') || assessment?.consciousness_cognition?.includes('失智');
    });

    // 失禁 (全護理)
    const incontinencePatients = fullCarePatients;

    // 如廁訓練
    const toiletTrainingPatients = activePatients.filter(p => {
      const assessment = (healthAssessments || []).find(a => a.patient_id === p.院友id);
      return assessment?.toilet_training === true;
    });

    // 壓瘡
    const pressureUlcerPatientIds = new Set<number>();
    (woundAssessments || []).forEach(assessment => {
      assessment.wound_details?.forEach(detail => {
        if ((detail.wound_status === '未處理' || detail.wound_status === '治療中') &&
            detail.wound_type === '壓力性') {
          pressureUlcerPatientIds.add(assessment.patient_id);
        }
      });
    });
    const pressureUlcerPatients = activePatients.filter(p => pressureUlcerPatientIds.has(p.院友id));

    // 跌倒 (當月)
    const monthlyFallIncidents = (incidentReports || []).filter(incident => {
      const incidentDate = new Date(incident.incident_date);
      return incident.incident_type === '跌倒' &&
             incidentDate >= monthStart &&
             incidentDate <= monthEnd;
    });
    const monthlyFallPatientIds = new Set(monthlyFallIncidents.map(i => i.patient_id));
    const monthlyFallPatients = activePatients.filter(p => monthlyFallPatientIds.has(p.院友id));

    // 體重下降5% (當月與上月比較)
    const lastMonthDate = new Date(monthStart);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const weightDecreasePatients = activePatients.filter(p => {
      const currentMonthRecords = (healthRecords || []).filter(r =>
        r.院友id === p.院友id &&
        r.記錄類型 === '體重控制' &&
        r.體重 &&
        new Date(r.記錄日期) >= monthStart &&
        new Date(r.記錄日期) <= monthEnd
      );
      const lastMonthRecords = (healthRecords || []).filter(r =>
        r.院友id === p.院友id &&
        r.記錄類型 === '體重控制' &&
        r.體重 &&
        new Date(r.記錄日期) >= lastMonthDate &&
        new Date(r.記錄日期) < monthStart
      );
      if (currentMonthRecords.length === 0 || lastMonthRecords.length === 0) return false;
      const currentWeight = currentMonthRecords[currentMonthRecords.length - 1].體重;
      const lastWeight = lastMonthRecords[lastMonthRecords.length - 1].體重;
      if (!currentWeight || !lastWeight) return false;
      const decrease = ((lastWeight - currentWeight) / lastWeight) * 100;
      return decrease >= 5;
    });

    // 使用約束物品
    const restraintPatientIds = new Set((patientRestraintAssessments || []).map(r => r.patient_id));
    const restraintPatients = activePatients.filter(p => restraintPatientIds.has(p.院友id));

    // 轉身 (卧床)
    const turningPatients = bedriddenPatients;

    // 傳染病
    const infectiousDiseasePatients = activePatients.filter(p =>
      p.感染控制 && p.感染控制.length > 0
    );

    // 尿道炎 - 這需要從健康記錄或備註中判斷,暫時留空
    const utiPatients: typeof activePatients = [];

    const formatPatientName = (p: typeof activePatients[0]) => `${p.床號} ${p.中文姓氏}${p.中文名字}`;

    return {
      半護理: { count: semiCarePatients.length, names: semiCarePatients.map(formatPatientName) },
      全護理: { count: fullCarePatients.length, names: fullCarePatients.map(formatPatientName) },
      導尿管: { count: catheterPatients.length, names: catheterPatients.map(formatPatientName) },
      遊走: { count: wanderingPatients.length, names: wanderingPatients.map(formatPatientName) },
      情緒問題: { count: emotionalPatients.length, names: emotionalPatients.map(formatPatientName) },
      長期卧床: { count: bedriddenPatients.length, names: bedriddenPatients.map(formatPatientName) },
      長期使用輪椅: { count: wheelchairPatients.length, names: wheelchairPatients.map(formatPatientName) },
      一人協助: { count: onePersonAssistPatients.length, names: onePersonAssistPatients.map(formatPatientName) },
      二人協助: { count: twoPersonAssistPatients.length, names: twoPersonAssistPatients.map(formatPatientName) },
      需餵食: { count: needFeedingPatients.length, names: needFeedingPatients.map(formatPatientName) },
      鼻胃飼: { count: ngTubePatients.length, names: ngTubePatients.map(formatPatientName) },
      腹膜血液透析: { count: dialysisPatients.length, names: dialysisPatients.map(formatPatientName) },
      造口: { count: stomaPatients.length, names: stomaPatients.map(formatPatientName) },
      服藥9種或以上: { count: multiMedicationPatients.length, names: multiMedicationPatients.map(formatPatientName) },
      接受物理治療: { count: physioTherapyPatients.length, names: physioTherapyPatients.map(formatPatientName) },
      接受職業治療: { count: occupationalTherapyPatients.length, names: occupationalTherapyPatients.map(formatPatientName) },
      入院: { count: hospitalizedPatients.length, names: hospitalizedPatients.map(formatPatientName) },
      認知障礙: { count: cognitiveImpairmentPatients.length, names: cognitiveImpairmentPatients.map(formatPatientName) },
      失禁: { count: incontinencePatients.length, names: incontinencePatients.map(formatPatientName) },
      如廁訓練: { count: toiletTrainingPatients.length, names: toiletTrainingPatients.map(formatPatientName) },
      壓瘡: { count: pressureUlcerPatients.length, names: pressureUlcerPatients.map(formatPatientName) },
      跌倒: { count: monthlyFallPatients.length, names: monthlyFallPatients.map(formatPatientName) },
      體重下降5: { count: weightDecreasePatients.length, names: weightDecreasePatients.map(formatPatientName) },
      使用約束物品: { count: restraintPatients.length, names: restraintPatients.map(formatPatientName) },
      轉身: { count: turningPatients.length, names: turningPatients.map(formatPatientName) },
      傳染病: { count: infectiousDiseasePatients.length, names: infectiousDiseasePatients.map(formatPatientName) },
      尿道炎: { count: utiPatients.length, names: utiPatients.map(formatPatientName) },
    };
  }, [filteredPatients, timeFilter, healthAssessments, woundAssessments, incidentReports, patientRestraintAssessments, patientHealthTasks, prescriptions, healthRecords, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd]);

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

  const renderDailyReport = () => (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-2 rounded-lg ${timeFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            當日
          </button>
          <button
            onClick={() => setTimeFilter('yesterday')}
            className={`px-4 py-2 rounded-lg ${timeFilter === 'yesterday' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            昨日
          </button>
        </div>
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="form-input"
        >
          <option value="all">全部站點</option>
          {(stations || []).map(station => (
            <option key={station.id} value={station.id}>{station.name}</option>
          ))}
        </select>
      </div>

      {/* 第一行: 在住狀態統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">在住狀態統計</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="在住本區人數"
            value={dailyReportData.residenceStats.住在本站男 + dailyReportData.residenceStats.住在本站女}
            subtitle={`男: ${dailyReportData.residenceStats.住在本站男} | 女: ${dailyReportData.residenceStats.住在本站女}`}
            bgColor="bg-green-50"
            textColor="text-green-600"
            patientNames={[...dailyReportData.residenceStats.住在本站男Names, ...dailyReportData.residenceStats.住在本站女Names]}
          />
          <StatCard
            title="入住醫院人數"
            value={dailyReportData.residenceStats.入住醫院男 + dailyReportData.residenceStats.入住醫院女}
            subtitle={`男: ${dailyReportData.residenceStats.入住醫院男} | 女: ${dailyReportData.residenceStats.入住醫院女}`}
            bgColor="bg-red-50"
            textColor="text-red-600"
            patientNames={[...dailyReportData.residenceStats.入住醫院男Names, ...dailyReportData.residenceStats.入住醫院女Names]}
          />
          <StatCard
            title="暫時回家人數"
            value={0}
            subtitle="男: 0 | 女: 0"
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
            patientNames={[]}
          />
          <StatCard
            title="總人數 (a+b+c)"
            value={dailyReportData.residenceStats.住在本站男 + dailyReportData.residenceStats.住在本站女 + dailyReportData.residenceStats.入住醫院男 + dailyReportData.residenceStats.入住醫院女}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
            patientNames={[]}
          />
        </div>
      </div>

      {/* 第二行: 本區過去24小時 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">本區過去 24 小時</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="過去 24 小時新收" value={dailyReportData.newAdmissions.count} subtitle={`男: ${dailyReportData.newAdmissions.男} | 女: ${dailyReportData.newAdmissions.女}`} bgColor="bg-blue-50" textColor="text-blue-600" patientNames={dailyReportData.newAdmissions.names} />
          <StatCard
            title="過去 24 小時死亡"
            value={dailyReportData.death.total}
            subtitle={`男: ${dailyReportData.death.男} | 女: ${dailyReportData.death.女}`}
            bgColor="bg-red-50"
            textColor="text-red-600"
            patientNames={dailyReportData.death.names}
          />
          <StatCard
            title="當日退住"
            value={dailyReportData.discharge.total}
            subtitle={`男: ${dailyReportData.discharge.男} | 女: ${dailyReportData.discharge.女}`}
            bgColor="bg-orange-50"
            textColor="text-orange-600"
            patientNames={dailyReportData.discharge.names}
          />
          <StatCard
            title="當月累積死亡"
            value={dailyReportData.monthlyDeaths.count}
            bgColor="bg-gray-50"
            textColor="text-gray-600"
            patientNames={dailyReportData.monthlyDeaths.names}
          />
        </div>
      </div>

      {/* 第四行: 買位/長者等統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">入住類型統計</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="買位" value={dailyReportData.admissionTypeStats.買位.count} bgColor="bg-blue-50" textColor="text-blue-600" patientNames={dailyReportData.admissionTypeStats.買位.names} />
          <StatCard title="私位" value={dailyReportData.admissionTypeStats.私位.count} bgColor="bg-green-50" textColor="text-green-600" patientNames={dailyReportData.admissionTypeStats.私位.names} />
          <StatCard title="院舍劵" value={dailyReportData.admissionTypeStats.院舍劵.count} bgColor="bg-purple-50" textColor="text-purple-600" patientNames={dailyReportData.admissionTypeStats.院舍劵.names} />
          <StatCard title="暫住" value={dailyReportData.admissionTypeStats.暫住.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={dailyReportData.admissionTypeStats.暫住.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">醫療項目</h3>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(dailyReportData.medical).map(([key, value]) => (
            <StatCard key={key} title={key} value={value.count} bgColor="bg-indigo-50" textColor="text-indigo-600" patientNames={value.names} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">意外事件</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="藥物" value={dailyReportData.incidents.藥物.count} bgColor="bg-yellow-50" textColor="text-yellow-600" patientNames={dailyReportData.incidents.藥物.names} />
          <StatCard title="跌倒" value={dailyReportData.incidents.跌倒.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={dailyReportData.incidents.跌倒.names} />
          <StatCard title="死亡" value={dailyReportData.incidents.死亡.count} bgColor="bg-red-50" textColor="text-red-600" patientNames={dailyReportData.incidents.死亡.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">護理等級</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="全護理"
            value={dailyReportData.careLevel.全護理男.count + dailyReportData.careLevel.全護理女.count}
            subtitle={`男: ${dailyReportData.careLevel.全護理男.count} | 女: ${dailyReportData.careLevel.全護理女.count}`}
            bgColor="bg-red-50"
            textColor="text-red-600"
            patientNames={[...dailyReportData.careLevel.全護理男.names, ...dailyReportData.careLevel.全護理女.names]}
          />
          <StatCard
            title="半護理"
            value={dailyReportData.careLevel.半護理男.count + dailyReportData.careLevel.半護理女.count}
            subtitle={`男: ${dailyReportData.careLevel.半護理男.count} | 女: ${dailyReportData.careLevel.半護理女.count}`}
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
            patientNames={[...dailyReportData.careLevel.半護理男.names, ...dailyReportData.careLevel.半護理女.names]}
          />
          <StatCard
            title="療養級"
            value={dailyReportData.careLevel.療養級男.count + dailyReportData.careLevel.療養級女.count}
            subtitle={`男: ${dailyReportData.careLevel.療養級男.count} | 女: ${dailyReportData.careLevel.療養級女.count}`}
            bgColor="bg-green-50"
            textColor="text-green-600"
            patientNames={[...dailyReportData.careLevel.療養級男.names, ...dailyReportData.careLevel.療養級女.names]}
          />
        </div>
      </div>
    </div>
  );

  const renderMonthlyReport = () => (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-2 rounded-lg ${timeFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            當月
          </button>
          <button
            onClick={() => setTimeFilter('yesterday')}
            className={`px-4 py-2 rounded-lg ${timeFilter === 'yesterday' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            上月
          </button>
        </div>
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="form-input"
        >
          <option value="all">所有分區</option>
          {stations?.map(station => (
            <option key={station.id} value={station.id}>{station.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">護理等級</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="半護理"
            value={monthlyReportData.半護理.count}
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
            patientNames={monthlyReportData.半護理.names}
          />
          <StatCard
            title="全護理"
            value={monthlyReportData.全護理.count}
            bgColor="bg-red-50"
            textColor="text-red-600"
            patientNames={monthlyReportData.全護理.names}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">醫療項目</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="導尿管" value={monthlyReportData.導尿管.count} bgColor="bg-blue-50" textColor="text-blue-600" patientNames={monthlyReportData.導尿管.names} />
          <StatCard title="鼻胃飼" value={monthlyReportData.鼻胃飼.count} bgColor="bg-green-50" textColor="text-green-600" patientNames={monthlyReportData.鼻胃飼.names} />
          <StatCard title="腹膜/血液透析" value={monthlyReportData.腹膜血液透析.count} bgColor="bg-purple-50" textColor="text-purple-600" patientNames={monthlyReportData.腹膜血液透析.names} />
          <StatCard title="造口" value={monthlyReportData.造口.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={monthlyReportData.造口.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">行為與情緒</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="遊走" value={monthlyReportData.遊走.count} bgColor="bg-yellow-50" textColor="text-yellow-600" patientNames={monthlyReportData.遊走.names} />
          <StatCard title="情緒問題(抑鬱/激動)" value={monthlyReportData.情緒問題.count} bgColor="bg-red-50" textColor="text-red-600" patientNames={monthlyReportData.情緒問題.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">活動能力</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="長期卧床" value={monthlyReportData.長期卧床.count} bgColor="bg-gray-50" textColor="text-gray-600" patientNames={monthlyReportData.長期卧床.names} />
          <StatCard title="長期使用輪椅" value={monthlyReportData.長期使用輪椅.count} bgColor="bg-blue-50" textColor="text-blue-600" patientNames={monthlyReportData.長期使用輪椅.names} />
          <StatCard title="一人協助" value={monthlyReportData.一人協助.count} bgColor="bg-green-50" textColor="text-green-600" patientNames={monthlyReportData.一人協助.names} />
          <StatCard title="二人協助" value={monthlyReportData.二人協助.count} bgColor="bg-yellow-50" textColor="text-yellow-600" patientNames={monthlyReportData.二人協助.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">飲食與營養</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="需餵食" value={monthlyReportData.需餵食.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={monthlyReportData.需餵食.names} />
          <StatCard title="體重下降5%" value={monthlyReportData.體重下降5.count} bgColor="bg-red-50" textColor="text-red-600" patientNames={monthlyReportData.體重下降5.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">藥物管理</h3>
        <div className="grid grid-cols-1 gap-4">
          <StatCard title="服藥9種或以上" value={monthlyReportData.服藥9種或以上.count} bgColor="bg-purple-50" textColor="text-purple-600" patientNames={monthlyReportData.服藥9種或以上.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">治療服務</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="接受物理治療" value={monthlyReportData.接受物理治療.count} bgColor="bg-blue-50" textColor="text-blue-600" patientNames={monthlyReportData.接受物理治療.names} />
          <StatCard title="接受職業治療" value={monthlyReportData.接受職業治療.count} bgColor="bg-green-50" textColor="text-green-600" patientNames={monthlyReportData.接受職業治療.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">健康狀況</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="入院" value={monthlyReportData.入院.count} bgColor="bg-red-50" textColor="text-red-600" patientNames={monthlyReportData.入院.names} />
          <StatCard title="認知障礙" value={monthlyReportData.認知障礙.count} bgColor="bg-yellow-50" textColor="text-yellow-600" patientNames={monthlyReportData.認知障礙.names} />
          <StatCard title="傳染病" value={monthlyReportData.傳染病.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={monthlyReportData.傳染病.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">大小便管理</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="失禁(全護理)" value={monthlyReportData.失禁.count} bgColor="bg-gray-50" textColor="text-gray-600" patientNames={monthlyReportData.失禁.names} />
          <StatCard title="如廁訓練" value={monthlyReportData.如廁訓練.count} bgColor="bg-blue-50" textColor="text-blue-600" patientNames={monthlyReportData.如廁訓練.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">傷口與意外</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="壓瘡" value={monthlyReportData.壓瘡.count} bgColor="bg-red-50" textColor="text-red-600" patientNames={monthlyReportData.壓瘡.names} />
          <StatCard title="跌倒" value={monthlyReportData.跌倒.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={monthlyReportData.跌倒.names} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">約束與護理</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="使用約束物品" value={monthlyReportData.使用約束物品.count} bgColor="bg-yellow-50" textColor="text-yellow-600" patientNames={monthlyReportData.使用約束物品.names} />
          <StatCard title="轉身(卧床)" value={monthlyReportData.轉身.count} bgColor="bg-gray-50" textColor="text-gray-600" patientNames={monthlyReportData.轉身.names} />
          <StatCard title="尿道炎" value={monthlyReportData.尿道炎.count} bgColor="bg-orange-50" textColor="text-orange-600" patientNames={monthlyReportData.尿道炎.names} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">統計報表</h1>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 font-medium ${activeTab === 'daily' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Calendar className="h-4 w-4 inline mr-1" />
            每日報表
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 font-medium ${activeTab === 'monthly' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <FileText className="h-4 w-4 inline mr-1" />
            每月報表
          </button>
          <button
            onClick={() => setActiveTab('infection')}
            className={`px-4 py-2 font-medium ${activeTab === 'infection' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <AlertCircle className="h-4 w-4 inline mr-1" />
            感染控制報表
          </button>
          <button
            onClick={() => setActiveTab('meal')}
            className={`px-4 py-2 font-medium ${activeTab === 'meal' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Utensils className="h-4 w-4 inline mr-1" />
            餐膳報表
          </button>
          <button
            onClick={() => setActiveTab('tube')}
            className={`px-4 py-2 font-medium ${activeTab === 'tube' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Stethoscope className="h-4 w-4 inline mr-1" />
            喉管相關報表
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`px-4 py-2 font-medium ${activeTab === 'special' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Activity className="h-4 w-4 inline mr-1" />
            特別關顧名單
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'daily' && renderDailyReport()}
        {activeTab === 'monthly' && renderMonthlyReport()}
        {activeTab === 'infection' && <div className="text-center text-gray-500 py-12">感染控制報表開發中...</div>}
        {activeTab === 'meal' && <div className="text-center text-gray-500 py-12">餐膳報表開發中...</div>}
        {activeTab === 'tube' && <div className="text-center text-gray-500 py-12">喉管相關報表開發中...</div>}
        {activeTab === 'special' && <div className="text-center text-gray-500 py-12">特別關顧名單開發中...</div>}
      </div>
    </div>
  );
};

export default Reports;
