import React, { useState } from 'react';
import { BarChart3, Download, Calendar, Users, FileText, Filter, Guitar as Hospital } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { exportWaitingListToExcel } from '../utils/waitingListExcelGenerator';
import { getFormattedEnglishName } from '../utils/nameFormatter';

const Reports: React.FC = () => {
  const { patients, schedules, loading } = usePatients();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedReport, setSelectedReport] = useState('overview');

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
  const handleDownloadReport = (reportType: string) => {
    handleExportReportToExcel(reportType);
  };

  const handleExportReportToExcel = async (reportType: string) => {
    try {
      const reportData = getReportData(reportType);
      let exportData: any[] = [];
      let title = '';
      let filename = '';

      if (reportType === 'schedules') {
        title = `排程報表 (${dateRange.start} 至 ${dateRange.end})`;
        filename = `排程報表_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        exportData = (reportData as any[]).flatMap(schedule => 
          schedule.院友列表.map((item: any) => ({
            床號: item.院友主表.床號,
            中文姓名: `${item.院友主表.中文姓氏}${item.院友主表.中文名字}`,
            英文姓名: getFormattedEnglishName(item.院友主表.英文姓氏, item.院友主表.英文名字) || item.院友主表.英文姓名,
            性別: item.院友主表.性別 || '',
            身份證號碼: item.院友主表.身份證號碼 || '',
            出生日期: item.院友主表.出生日期 ? new Date(item.院友主表.出生日期).toLocaleDateString('zh-TW') : '',
            看診原因: item.看診原因.join(', ') || '',
            症狀說明: item.症狀說明 || '',
            藥物敏感: item.院友主表.藥物敏感 || '無',
            不良藥物反應: item.院友主表.不良藥物反應 || '無',
            備註: item.備註 || '',
            到診日期: schedule.到診日期
          }))
        );
        
        await exportWaitingListToExcel(exportData, filename, title);
        
      } else {
        // 院友報表或總覽報表
        title = reportType === 'patients' ? '院友報表' : '總覽報表';
        filename = `${title}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        exportData = patients.map(patient => ({
          床號: patient.床號,
          中文姓名: `${patient.中文姓氏}${patient.中文名字}`,
          英文姓名: getFormattedEnglishName(patient.英文姓氏, patient.英文名字) || patient.英文姓名,
          性別: patient.性別 || '',
          身份證號碼: patient.身份證號碼 || '',
          出生日期: patient.出生日期 ? new Date(patient.出生日期).toLocaleDateString('zh-TW') : '',
          看診原因: '',
          症狀說明: '',
          藥物敏感: patient.藥物敏感 || '無',
          不良藥物反應: patient.不良藥物反應 || '無',
          備註: ''
        }));
        
        await exportWaitingListToExcel(exportData, filename, title);
      }


    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請重試');
    }
  };

  const getReportData = (reportType: string) => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    switch (reportType) {
      case 'schedules':
        return schedules.filter(s => {
          const scheduleDate = new Date(s.到診日期);
          return scheduleDate >= startDate && scheduleDate <= endDate;
        });
      case 'patients':
        return patients;
      default:
        return { patients, schedules };
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const scheduleDate = new Date(s.到診日期);
    return scheduleDate >= new Date(dateRange.start) && scheduleDate <= new Date(dateRange.end);
  });


  const stats = {
    totalPatients: patients.length,
    hospitalizedPatients: patients.filter(p => p.is_hospitalized).length,
    totalSchedules: filteredSchedules.length,
    patientsWithSchedules: filteredSchedules.reduce((sum, s) => sum + s.院友列表.length, 0),
    activePatients: patients.filter(p => p.在住狀態 === '在住').length,
    dischargedPatients: patients.filter(p => p.在住狀態 === '已退住').length,
    // 在住院友的護理等級和性別統計
    在住全護理男: patients.filter(p => p.在住狀態 === '在住' && p.護理等級 === '全護理' && p.性別 === '男').length,
    在住全護理女: patients.filter(p => p.在住狀態 === '在住' && p.護理等級 === '全護理' && p.性別 === '女').length,
    在住半護理男: patients.filter(p => p.在住狀態 === '在住' && p.護理等級 === '半護理' && p.性別 === '男').length,
    在住半護理女: patients.filter(p => p.在住狀態 === '在住' && p.護理等級 === '半護理' && p.性別 === '女').length,
    在住自理男: patients.filter(p => p.在住狀態 === '在住' && p.護理等級 === '自理' && p.性別 === '男').length,
    在住自理女: patients.filter(p => p.在住狀態 === '在住' && p.護理等級 === '自理' && p.性別 === '女').length,
    // 入院留醫統計（在住且入院中）
    入院留醫男: patients.filter(p => p.在住狀態 === '在住' && p.is_hospitalized && p.性別 === '男').length,
    入院留醫女: patients.filter(p => p.在住狀態 === '在住' && p.is_hospitalized && p.性別 === '女').length,
    // 暫住統計（在住且入住類型為暫住）
    暫住男: patients.filter(p => p.在住狀態 === '在住' && p.入住類型 === '暫住' && p.性別 === '男').length,
    暫住女: patients.filter(p => p.在住狀態 === '在住' && p.入住類型 === '暫住' && p.性別 === '女').length,
    // 入住類型統計（僅在住院友）
    在住私位: patients.filter(p => p.在住狀態 === '在住' && p.入住類型 === '私位').length,
    在住買位: patients.filter(p => p.在住狀態 === '在住' && p.入住類型 === '買位').length,
    在住院舍卷: patients.filter(p => p.在住狀態 === '在住' && p.入住類型 === '院舍卷').length,
    nursingLevels: {
      全護理: patients.filter(p => p.護理等級 === '全護理').length,
      半護理: patients.filter(p => p.護理等級 === '半護理').length,
      自理: patients.filter(p => p.護理等級 === '自理').length
    },
    admissionTypes: {
      私位: patients.filter(p => p.入住類型 === '私位').length,
      買位: patients.filter(p => p.入住類型 === '買位').length,
      院舍卷: patients.filter(p => p.入住類型 === '院舍卷').length,
      暫住: patients.filter(p => p.入住類型 === '暫住').length
    },
    socialWelfare: {
      綜合社會保障援助: patients.filter(p => p.社會福利?.type === '綜合社會保障援助').length,
      公共福利金計劃: patients.filter(p => p.社會福利?.type === '公共福利金計劃').length
    }
  };

  const reportTypes = [
    { id: 'overview', name: '總覽報表', icon: BarChart3 },
    { id: 'schedules', name: '排程報表', icon: Calendar },
    { id: 'patients', name: '院友報表', icon: Users }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">報表查詢</h1>
        <button
          onClick={() => handleDownloadReport(selectedReport)}
          className="btn-primary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>匯出報表</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">日期範圍:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="form-input"
          />
          <span className="text-gray-500">至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="form-input"
          />
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedReport === type.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總院友數</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              <p className="text-xs text-gray-500">在住: {stats.activePatients} | 已退住: {stats.dischargedPatients} | 入院中: {stats.hospitalizedPatients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">入院中院友</p>
              <p className="text-2xl font-bold text-gray-900">{stats.hospitalizedPatients}</p>
              <p className="text-xs text-gray-500">目前在醫院接受治療</p>
            </div>
            <Hospital className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">排程數量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSchedules}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">預約院友</p>
              <p className="text-2xl font-bold text-gray-900">{stats.patientsWithSchedules}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">在住院友護理等級分布</h3>
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">全護理</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-red-600">男性</span>
                  <span className="font-medium text-red-700">{stats.在住全護理男}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600">女性</span>
                  <span className="font-medium text-red-700">{stats.在住全護理女}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">半護理</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-600">男性</span>
                  <span className="font-medium text-yellow-700">{stats.在住半護理男}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-600">女性</span>
                  <span className="font-medium text-yellow-700">{stats.在住半護理女}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-800 mb-2">自理</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-600">男性</span>
                  <span className="font-medium text-green-700">{stats.在住自理男}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600">女性</span>
                  <span className="font-medium text-green-700">{stats.在住自理女}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">在住院友入住類型分布</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">私位</span>
              <span className="text-sm font-medium text-purple-600">{stats.在住私位}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">買位</span>
              <span className="text-sm font-medium text-blue-600">{stats.在住買位}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">院舍卷</span>
              <span className="text-sm font-medium text-green-600">{stats.在住院舍卷}</span>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-orange-800 mb-2">暫住</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-orange-600">男性</span>
                  <span className="font-medium text-orange-700">{stats.暫住男}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-orange-600">女性</span>
                  <span className="font-medium text-orange-700">{stats.暫住女}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">入院留醫統計</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-red-600">男性</span>
                <span className="font-medium text-red-700">{stats.入院留醫男}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600">女性</span>
                <span className="font-medium text-red-700">{stats.入院留醫女}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-red-200 pt-2 mt-2">
              <span className="text-sm text-red-600 font-medium">總計</span>
              <span className="text-sm font-bold text-red-700">{stats.入院留醫男 + stats.入院留醫女}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">社會福利分布</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">綜合社會保障援助</span>
              <span className="text-sm font-medium text-blue-600">{stats.socialWelfare.綜合社會保障援助}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">公共福利金計劃</span>
              <span className="text-sm font-medium text-green-600">{stats.socialWelfare.公共福利金計劃}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {reportTypes.find(t => t.id === selectedReport)?.name}
        </h2>
        
        {selectedReport === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">性別分布</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">男性</span>
                    <span className="text-sm font-medium">{patients.filter(p => p.性別 === '男').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">女性</span>
                    <span className="text-sm font-medium">{patients.filter(p => p.性別 === '女').length}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">看診原因統計</h3>
                <div className="space-y-2">
                  {['申訴不適', '約束物品同意書', '年度體檢', '其他'].map(reason => {
                    const count = filteredSchedules.reduce((sum, s) => 
                      sum + s.院友列表.filter(p => p.看診原因 && p.看診原因.includes(reason)).length, 0
                    );
                    return (
                      <div key={reason} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{reason}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'schedules' && (
          <div className="space-y-4">
            {filteredSchedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">日期</th>
                      <th className="px-4 py-2 text-left">院友數量</th>
                      <th className="px-4 py-2 text-left">主要原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSchedules.map(schedule => (
                      <tr key={schedule.排程id}>
                        <td className="px-4 py-2">{new Date(schedule.到診日期).toLocaleDateString('zh-TW')}</td>
                        <td className="px-4 py-2">{schedule.院友列表.length}</td>
                        <td className="px-4 py-2">
                          {schedule.院友列表.map(p => p.看診原因).flat().join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">選定期間內無排程記錄</p>
            )}
          </div>
        )}


        {selectedReport === 'patients' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">床號</th>
                    <th className="px-4 py-2 text-left">姓名</th>
                    <th className="px-4 py-2 text-left">性別</th>
                    <th className="px-4 py-2 text-left">年齡</th>
                    <th className="px-4 py-2 text-left">藥物敏感</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map(patient => {
                    const age = Math.floor((new Date().getTime() - new Date(patient.出生日期).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    return (
                      <tr key={patient.院友ID}>
                        <td className="px-4 py-2">{patient.床號}</td>
                        <td className="px-4 py-2">{patient.中文姓名}</td>
                        <td className="px-4 py-2">{patient.性別}</td>
                        <td className="px-4 py-2">{age}歲</td>
                        <td className="px-4 py-2">{patient.藥物敏感 || '無'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;