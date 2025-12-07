import React, { useState } from 'react';
import {
  Heart, Plus, Edit3, Trash2, Search, Filter, Activity, Droplets, Scale,
  TrendingUp, TrendingDown, Minus, Calendar, Clock, User, ChevronUp, ChevronDown,
  Download, Upload, X, Recycle, Copy
} from 'lucide-react';
import { usePatients, DuplicateRecordGroup } from '../context/PatientContext';
import HealthRecordModal from '../components/HealthRecordModal';
import BatchHealthRecordModal from '../components/BatchHealthRecordModal';
import DeduplicateRecordsModal from '../components/DeduplicateRecordsModal';
import RecycleBinModal from '../components/RecycleBinModal';
import { exportVitalSignsToExcel, type VitalSignExportData } from '../utils/vitalsignExcelGenerator';
import { exportBloodSugarToExcel, type BloodSugarExportData } from '../utils/bloodSugarExcelGenerator';
import PatientTooltip from '../components/PatientTooltip';
// [重要] 引入同步函式
import { syncTaskStatus } from '../lib/database';

type RecordType = '生命表徵' | '血糖控制' | '體重控制' | 'all';
type SortField = '記錄日期' | '記錄時間' | '院友姓名' | '記錄類型' | '體重' | '血糖值' | '血壓';
type SortDirection = 'asc' | 'desc';

interface AdvancedFilters {
  床號: string;
  中文姓名: string;
  記錄類型: string;
  記錄人員: string;
  備註: string;
  startDate: string;
  endDate: string;
  在住狀態: string;
}

const HealthAssessment: React.FC = () => {
  const {
    healthRecords,
    patients,
    loading,
    deleteHealthRecord,
    generateRandomTemperaturesForActivePatients,
    recordDailyTemperatureGenerationCompletion,
    checkEligiblePatientsForTemperature,
    findDuplicateHealthRecords,
    batchDeleteDuplicateRecords,
    refreshData 
  } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('記錄日期');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRecordType, setBatchRecordType] = useState<'生命表徵' | '血糖控制' | '體重控制'>('生命表徵');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDeduplicateModal, setShowDeduplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateRecordGroup[]>([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [isAnalyzingDuplicates, setIsAnalyzingDuplicates] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    床號: '', 中文姓名: '', 記錄類型: '', 記錄人員: '', 備註: '', startDate: '', endDate: '', 在住狀態: '在住'
  });
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingTemperature, setIsGeneratingTemperature] = useState(false);

  const hasAdvancedFilters = () => Object.values(advancedFilters).some(value => value !== '');
  const updateAdvancedFilter = (field: keyof AdvancedFilters, value: string) => setAdvancedFilters(prev => ({ ...prev, [field]: value }));
  const clearFilters = () => {
    setSearchTerm('');
    setAdvancedFilters({ 床號: '', 中文姓名: '', 記錄類型: '', 記錄人員: '', 備註: '', startDate: '', endDate: '', 在住狀態: '在住' });
  };
  const getUniqueOptions = (field: string) => {
    const values = new Set<string>();
    healthRecords.forEach(record => {
      if (field === '記錄人員' && record.記錄人員) values.add(record.記錄人員);
    });
    return Array.from(values).sort();
  };

  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, advancedFilters, sortField, sortDirection]);

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

  const filteredRecords = healthRecords.filter(record => {
    const patient = patients.find(p => p.院友id === record.院友id);
    if (!patient) return false;
    
    if (advancedFilters.在住狀態 && advancedFilters.在住狀態 !== '全部' && patient?.在住狀態 !== advancedFilters.在住狀態) return false;
    if (advancedFilters.床號 && !patient?.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) return false;
    if (advancedFilters.中文姓名 && !patient?.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) return false;
    if (advancedFilters.記錄類型 && advancedFilters.記錄類型 !== '' && record.記錄類型.trim() !== advancedFilters.記錄類型.trim()) return false;
    if (advancedFilters.記錄人員 && !record.記錄人員?.toLowerCase().includes(advancedFilters.記錄人員.toLowerCase())) return false;
    if (advancedFilters.備註 && !record.備註?.toLowerCase().includes(advancedFilters.備註.toLowerCase())) return false;
    
    if (advancedFilters.startDate || advancedFilters.endDate) {
      const recordDate = new Date(record.記錄日期);
      if (advancedFilters.startDate && recordDate < new Date(advancedFilters.startDate)) return false;
      if (advancedFilters.endDate && recordDate > new Date(advancedFilters.endDate)) return false;
    }
    
    let matchesSearch = true;
    if (searchTerm) {
      matchesSearch = patient?.中文姓氏.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.中文名字.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.備註?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         new Date(record.記錄日期).toLocaleDateString('zh-TW').includes(searchTerm.toLowerCase()) || false;
    }
    return matchesSearch;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const patientA = patients.find(p => p.院友id === a.院友id);
    const patientB = patients.find(p => p.院友id === b.院友id);
    
    let valueA: string | number = '';
    let valueB: string | number = '';
    
    switch (sortField) {
      case '記錄日期':
        valueA = new Date(`${a.記錄日期} ${a.記錄時間}`).getTime();
        valueB = new Date(`${b.記錄日期} ${b.記錄時間}`).getTime();
        break;
      case '記錄時間':
        valueA = a.記錄時間;
        valueB = b.記錄時間;
        break;
      case '院友姓名':
        valueA = `${patientA?.中文姓氏 || ''}${patientA?.中文名字 || ''}`;
        valueB = `${patientB?.中文姓氏 || ''}${patientB?.中文名字 || ''}`;
        break;
      default:
        return 0;
    }
    
    if (sortDirection === 'asc') return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    else return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
  });

  const totalItems = sortedRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const record = healthRecords.find(r => r.記錄id === id);
    const patient = patients.find(p => p.院友id === record?.院友id);
    
    if (confirm(`確定要刪除 ${patient?.中文姓名} 在 ${record?.記錄日期} ${record?.記錄時間} 的${record?.記錄類型}記錄嗎？`)) {
      try {
        setDeletingIds(prev => new Set(prev).add(id));
        await deleteHealthRecord(id);
        
        // [重要] 刪除記錄後，如果有關聯任務，通知任務同步狀態
        if (record?.task_id) {
          console.log('刪除記錄觸發任務同步:', record.task_id);
          await syncTaskStatus(record.task_id);
          if (refreshData) await refreshData();
        }

        setSelectedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (error) {
        console.error('刪除失敗:', error);
        alert('刪除記錄失敗，請重試');
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  // ... (保留 handleBatchDelete, handleExportSelected 等其他函式)
  // 為節省篇幅，這部分請使用原檔邏輯，因為關鍵修改只在 handleDelete

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="sticky top-0 bg-white z-30 py-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">監測記錄</h1>
            {/* ... 按鈕群組 ... */}
            <button onClick={() => { setSelectedRecord(null); setShowModal(true); }} className="btn-primary flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>新增記錄</span>
            </button>
          </div>
        </div>
      </div>

      <div className="sticky top-16 bg-white z-20 shadow-sm">
        <div className="card p-4">
          <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
             <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="搜索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" />
             </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {paginatedRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader field="院友姓名">院友姓名</SortableHeader>
                  <SortableHeader field="記錄日期">日期時間</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生命表徵</th>
                  <SortableHeader field="血糖值">血糖值</SortableHeader>
                  <SortableHeader field="體重">體重</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRecords.map(record => {
                  const patient = patients.find(p => p.院友id === record.院友id);
                  return (
                    <tr key={record.記錄id} className={`hover:bg-gray-50 ${selectedRows.has(record.記錄id) ? 'bg-blue-50' : ''}`} onDoubleClick={() => handleEdit(record)}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient?.中文姓氏}{patient?.中文名字} ({patient?.床號})
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.記錄日期).toLocaleDateString('zh-TW')} {record.記錄時間}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.血壓收縮壓}/{record.血壓舒張壓}, P:{record.脈搏}, T:{record.體溫}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{record.血糖值}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{record.體重}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{record.備註}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-900"><Edit3 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(record.記錄id)} className="text-red-600 hover:text-red-900" disabled={deletingIds.has(record.記錄id)}>
                            {deletingIds.has(record.記錄id) ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12"><p>暫無記錄</p></div>
        )}
      </div>

      {/* Pagination & Modals */}
      {showModal && <HealthRecordModal record={selectedRecord} onClose={() => { setShowModal(false); setSelectedRecord(null); }} />}
    </div>
  );
};

export default HealthAssessment;