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
  const { patients, stations, healthAssessments, woundAssessments, incidentReports, patientHealthTasks, patientRestraintAssessments, prescriptions, loading } = usePatients();
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
      return assessment?.treatment_items?.includes('腸造口') || assessment?.treatment_items?.includes('小便造口');
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
        <h3 className="text-lg font-semibold mb-4">買位/長者/住護等統計</h3>
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
        {activeTab === 'monthly' && <div className="text-center text-gray-500 py-12">每月報表開發中...</div>}
        {activeTab === 'infection' && <div className="text-center text-gray-500 py-12">感染控制報表開發中...</div>}
        {activeTab === 'meal' && <div className="text-center text-gray-500 py-12">餐膳報表開發中...</div>}
        {activeTab === 'tube' && <div className="text-center text-gray-500 py-12">喉管相關報表開發中...</div>}
        {activeTab === 'special' && <div className="text-center text-gray-500 py-12">特別關顧名單開發中...</div>}
      </div>
    </div>
  );
};

export default Reports;
