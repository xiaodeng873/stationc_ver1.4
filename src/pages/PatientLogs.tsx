import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Download,
  User,
  Calendar,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { usePatients, type PatientLog } from '../context/PatientContext';
import PatientLogModal from '../components/PatientLogModal';
import PatientTooltip from '../components/PatientTooltip';
import { getFormattedEnglishName } from '../utils/nameFormatter';

type SortField = '記錄日期' | '院友姓名' | '日誌類型' | '記錄人員' | '創建時間';
type SortDirection = 'asc' | 'desc';

interface AdvancedFilters {
  床號: string;
  中文姓名: string;
  日誌類型: string;
  記錄人員: string;
  內容: string;
  startDate: string;
  endDate: string;
  在住狀態: string;
}

const PatientLogs: React.FC = () => {
  const { patientLogs, patients, deletePatientLog, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PatientLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('記錄日期');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    床號: '',
    中文姓名: '',
    日誌類型: '',
    記錄人員: '',
    內容: '',
    startDate: '',
    endDate: '',
    在住狀態: '在住'
  });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, advancedFilters, sortField, sortDirection]);

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

  const filteredLogs = patientLogs.filter(log => {
    const patient = patients.find(p => p.院友id === log.patient_id);
    
    // 先應用進階篩選
    if (advancedFilters.在住狀態 && advancedFilters.在住狀態 !== '全部' && patient?.在住狀態 !== advancedFilters.在住狀態) {
      return false;
    }
    if (advancedFilters.床號 && !patient?.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) {
      return false;
    }
    if (advancedFilters.中文姓名 && !patient?.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) {
      return false;
    }
    if (advancedFilters.日誌類型 && log.log_type !== advancedFilters.日誌類型) {
      return false;
    }
    if (advancedFilters.記錄人員 && !log.recorder.toLowerCase().includes(advancedFilters.記錄人員.toLowerCase())) {
      return false;
    }
    if (advancedFilters.內容 && !log.content.toLowerCase().includes(advancedFilters.內容.toLowerCase())) {
      return false;
    }
    
    // 日期區間篩選
    if (advancedFilters.startDate || advancedFilters.endDate) {
      const logDate = new Date(log.log_date);
      if (advancedFilters.startDate && logDate < new Date(advancedFilters.startDate)) {
        return false;
      }
      if (advancedFilters.endDate && logDate > new Date(advancedFilters.endDate)) {
        return false;
      }
    }
    
    // 然後應用搜索條件
    let matchesSearch = true;
    if (searchTerm) {
      matchesSearch = patient?.中文姓氏.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.中文名字.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.log_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.recorder.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         new Date(log.log_date).toLocaleDateString('zh-TW').includes(searchTerm.toLowerCase());
    }
    
    return matchesSearch;
  });

  const hasAdvancedFilters = () => {
    return Object.values(advancedFilters).some(value => value !== '');
  };

  const updateAdvancedFilter = (field: keyof AdvancedFilters, value: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAdvancedFilters({
      床號: '',
      中文姓名: '',
      日誌類型: '',
      記錄人員: '',
      內容: '',
      startDate: '',
      endDate: '',
      在住狀態: '在住'
    });
  };

  const getUniqueOptions = (field: string) => {
    const values = new Set<string>();
    patientLogs.forEach(log => {
      let value = '';
      
      switch (field) {
        case '記錄人員':
          value = log.recorder;
          break;
        default:
          return;
      }
      
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const patientA = patients.find(p => p.院友id === a.patient_id);
    const patientB = patients.find(p => p.院友id === b.patient_id);
    
    let valueA: string | number = '';
    let valueB: string | number = '';
    
    switch (sortField) {
      case '記錄日期':
        valueA = new Date(a.log_date).getTime();
        valueB = new Date(b.log_date).getTime();
        break;
      case '院友姓名':
        valueA = `${patientA?.中文姓氏 || ''}${patientA?.中文名字 || ''}`;
        valueB = `${patientB?.中文姓氏 || ''}${patientB?.中文名字 || ''}`;
        break;
      case '日誌類型':
        valueA = a.log_type;
        valueB = b.log_type;
        break;
      case '記錄人員':
        valueA = a.recorder;
        valueB = b.recorder;
        break;
      case '創建時間':
        valueA = new Date(a.created_at).getTime();
        valueB = new Date(b.created_at).getTime();
        break;
    }
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    } else {
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
    }
  });

  // Pagination logic
  const totalItems = sortedLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (log: PatientLog) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const log = patientLogs.find(l => l.id === id);
    const patient = patients.find(p => p.院友id === log?.patient_id);
    
    if (confirm(`確定要刪除 ${patient?.中文姓名} 在 ${log?.log_date} 的日誌記錄嗎？`)) {
      try {
        setDeletingIds(prev => new Set(prev).add(id));
        await deletePatientLog(id);
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (error) {
        alert('刪除日誌失敗，請重試');
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) {
      alert('請先選擇要刪除的記錄');
      return;
    }

    const confirmMessage = `確定要刪除 ${selectedRows.size} 筆日誌記錄嗎？\n\n此操作無法復原。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const deletingArray = Array.from(selectedRows);
    setDeletingIds(new Set(deletingArray));
    
    try {
      for (const logId of deletingArray) {
        await deletePatientLog(logId);
      }
      setSelectedRows(new Set());
      alert(`成功刪除 ${deletingArray.length} 筆日誌記錄`);
    } catch (error) {
      console.error('批量刪除日誌失敗:', error);
      alert('批量刪除日誌失敗，請重試');
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleSelectRow = (logId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedLogs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedLogs.map(l => l.id)));
    }
  };

  const handleInvertSelection = () => {
    const newSelected = new Set<string>();
    paginatedLogs.forEach(log => {
      if (!selectedRows.has(log.id)) {
        newSelected.add(log.id);
      }
    });
    setSelectedRows(newSelected);
  };

  const handleExportSelected = () => {
    const selectedLogs = paginatedLogs.filter(l => selectedRows.has(l.id));
    
    if (selectedLogs.length === 0) {
      alert('請先選擇要匯出的記錄');
      return;
    }

    const exportData = selectedLogs.map(log => {
      const patient = patients.find(p => p.院友id === log.patient_id);
      return {
        床號: patient?.床號 || '',
        中文姓名: patient ? `${patient.中文姓氏}${patient.中文名字}` : '',
        記錄日期: new Date(log.log_date).toLocaleDateString('zh-TW'),
        日誌類型: log.log_type,
        日誌內容: log.content,
        記錄人員: log.recorder,
        創建時間: new Date(log.created_at).toLocaleString('zh-TW')
      };
    });

    const headers = ['床號', '中文姓名', '記錄日期', '日誌類型', '日誌內容', '記錄人員', '創建時間'];
    const csvContent = [
      `"院友日誌記錄"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      `"總記錄數: ${exportData.length}"`,
      '',
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `院友日誌記錄_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case '日常護理': return 'bg-blue-100 text-blue-800';
      case '文件簽署': return 'bg-green-100 text-green-800';
      case '入院/出院': return 'bg-purple-100 text-purple-800';
      case '入住/退住': return 'bg-orange-100 text-orange-800';
      case '醫生到診': return 'bg-red-100 text-red-800';
      case '意外事故': return 'bg-red-100 text-red-800';
      case '覆診返藥': return 'bg-indigo-100 text-indigo-800';
      case '其他': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="sticky top-0 bg-white z-30 py-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">院友日誌</h1>
          <div className="flex items-center space-x-2">
            {selectedRows.size > 0 && (
              <button
                onClick={handleExportSelected}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>匯出選定記錄</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedLog(null);
                setShowModal(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>新增日誌</span>
            </button>
          </div>
        </div>
      </div>

      {/* 搜索和篩選 */}
      <div className="sticky top-16 bg-white z-20 shadow-sm">
        <div className="card p-4">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索院友姓名、床號、日誌類型、內容或記錄人員..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`btn-secondary flex items-center space-x-2 ${
                    showAdvancedFilters ? 'bg-blue-50 text-blue-700' : ''
                  } ${hasAdvancedFilters() ? 'border-blue-300' : ''}`}
                >
                  <Filter className="h-4 w-4" />
                  <span>進階篩選</span>
                  {hasAdvancedFilters() && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      已套用
                    </span>
                  )}
                </button>
                
                {(searchTerm || hasAdvancedFilters()) && (
                  <button
                    onClick={clearFilters}
                    className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    <span>清除</span>
                  </button>
                )}
              </div>
            </div>
          
            {showAdvancedFilters && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">進階篩選</h3>
                
                <div className="mb-4">
                  <label className="form-label">記錄日期區間</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={advancedFilters.startDate}
                      onChange={(e) => updateAdvancedFilter('startDate', e.target.value)}
                      className="form-input"
                      placeholder="開始日期"
                    />
                    <span className="text-gray-500">至</span>
                    <input
                      type="date"
                      value={advancedFilters.endDate}
                      onChange={(e) => updateAdvancedFilter('endDate', e.target.value)}
                      className="form-input"
                      placeholder="結束日期"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">床號</label>
                    <input
                      type="text"
                      value={advancedFilters.床號}
                      onChange={(e) => updateAdvancedFilter('床號', e.target.value)}
                      className="form-input"
                      placeholder="搜索床號..."
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">中文姓名</label>
                    <input
                      type="text"
                      value={advancedFilters.中文姓名}
                      onChange={(e) => updateAdvancedFilter('中文姓名', e.target.value)}
                      className="form-input"
                      placeholder="搜索姓名..."
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">日誌類型</label>
                    <select
                      value={advancedFilters.日誌類型}
                      onChange={(e) => updateAdvancedFilter('日誌類型', e.target.value)}
                      className="form-input"
                    >
                      <option value="">所有類型</option>
                      <option value="日常護理">日常護理</option>
                      <option value="文件簽署">文件簽署</option>
                      <option value="入院/出院">入院/出院</option>
                      <option value="入住/退住">入住/退住</option>
                      <option value="醫生到診">醫生到診</option>
                      <option value="意外事故">意外事故</option>
                      <option value="覆診返藥">覆診返藥</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">記錄人員</label>
                    <input
                      list="recorder-options"
                      value={advancedFilters.記錄人員}
                      onChange={(e) => updateAdvancedFilter('記錄人員', e.target.value)}
                      className="form-input"
                      placeholder="選擇或輸入記錄人員..."
                    />
                    <datalist id="recorder-options">
                      {getUniqueOptions('記錄人員').map(option => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div>
                    <label className="form-label">內容</label>
                    <input
                      type="text"
                      value={advancedFilters.內容}
                      onChange={(e) => updateAdvancedFilter('內容', e.target.value)}
                      className="form-input"
                      placeholder="搜索日誌內容..."
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">在住狀態</label>
                    <select
                      value={advancedFilters.在住狀態}
                      onChange={(e) => updateAdvancedFilter('在住狀態', e.target.value)}
                      className="form-input"
                    >
                      <option value="在住">在住</option>
                     <option value="待入住">待入住</option>
                      <option value="待入住">待入住</option>
                      <option value="已退住">已退住</option>
                      <option value="">全部</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>顯示 {startIndex + 1}-{Math.min(endIndex, totalItems)} / {totalItems} 筆日誌記錄 (共 {patientLogs.length} 筆)</span>
              {(searchTerm || hasAdvancedFilters()) && (
                <span className="text-blue-600">已套用篩選條件</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 選取控制 */}
      {totalItems > 0 && (
        <div className="sticky top-40 bg-white z-10 shadow-sm">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedRows.size === paginatedLogs.length ? '取消全選' : '全選'}
                </button>
                <button
                  onClick={handleInvertSelection}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  反選
                </button>
                {selectedRows.size > 0 && (
                  <button
                    onClick={handleBatchDelete}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                    disabled={deletingIds.size > 0}
                  >
                    刪除選定記錄 ({selectedRows.size})
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-600">
                已選擇 {selectedRows.size} / {totalItems} 筆記錄
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日誌列表 */}
      <div className="card overflow-hidden">
        {paginatedLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedLogs.length && paginatedLogs.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <SortableHeader field="院友姓名">院友</SortableHeader>
                  <SortableHeader field="記錄日期">記錄日期</SortableHeader>
                  <SortableHeader field="日誌類型">日誌類型</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日誌內容
                  </th>
                  <SortableHeader field="記錄人員">記錄人員</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedLogs.map(log => {
                  const patient = patients.find(p => p.院友id === log.patient_id);
                  
                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-gray-50 ${selectedRows.has(log.id) ? 'bg-blue-50' : ''}`}
                      onDoubleClick={() => handleEdit(log)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(log.id)}
                          onChange={() => handleSelectRow(log.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                            {patient?.院友相片 ? (
                              <img 
                                src={patient.院友相片} 
                                alt={patient.中文姓名} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient ? (
                                <PatientTooltip patient={patient}>
                                  <span className="cursor-help hover:text-blue-600 transition-colors">
                                    {patient.中文姓氏}{patient.中文名字}
                                  </span>
                                </PatientTooltip>
                              ) : (
                                '-'
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{patient?.床號}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {new Date(log.log_date).toLocaleDateString('zh-TW')}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLogTypeColor(log.log_type)}`}>
                          {log.log_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-md">
                        <div className="truncate" title={log.content}>
                          {log.content}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1 text-gray-400" />
                          {log.recorder}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(log)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                            disabled={deletingIds.has(log.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-red-600 hover:text-red-900"
                            title="刪除"
                            disabled={deletingIds.has(log.id)}
                          >
                            {deletingIds.has(log.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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
          <div className="text-center py-12">
            <FileText className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || hasAdvancedFilters() ? '找不到符合條件的日誌' : '暫無院友日誌'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || hasAdvancedFilters() ? '請嘗試調整搜索條件' : '開始記錄院友的重要事項'}
            </p>
            {!searchTerm && !hasAdvancedFilters() ? (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                新增日誌
              </button>
            ) : (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                清除所有篩選
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">每頁顯示:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="form-input text-sm w-20"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={999999}>全部</option>
              </select>
              <span className="text-sm text-gray-700">筆記錄</span>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一頁
                </button>
                
                {generatePageNumbers().map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一頁
                </button>
              </div>
            )}
            
            <div className="text-sm text-gray-700">
              第 {currentPage} 頁，共 {totalPages} 頁
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <PatientLogModal
          log={selectedLog}
          onClose={() => {
            setShowModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
};

export default PatientLogs;