import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  User,
  Calendar,
  MapPin,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { usePatients, type IncidentReport } from '../context/PatientContext';
import IncidentReportModal from '../components/IncidentReportModal';
import PatientTooltip from '../components/PatientTooltip';

type SortField = '院友姓名' | 'incident_date' | 'location' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface AdvancedFilters {
  床號: string;
  中文姓名: string;
  incident_type: string;
  location: string;
  startDate: string;
  endDate: string;
  在住狀態: string;
}

const IncidentReports: React.FC = () => {
  const { incidentReports, patients, deleteIncidentReport, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('incident_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    床號: '',
    中文姓名: '',
    incident_type: '',
    location: '',
    startDate: '',
    endDate: '',
    在住狀態: '在住'
  });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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

  const filteredReports = incidentReports.filter(report => {
    const patient = patients.find(p => p.院友id === report.patient_id);

    if (advancedFilters.在住狀態 && advancedFilters.在住狀態 !== '全部' && patient?.在住狀態 !== advancedFilters.在住狀態) {
      return false;
    }
    if (advancedFilters.床號 && !patient?.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) {
      return false;
    }
    if (advancedFilters.中文姓名 && !patient?.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) {
      return false;
    }
    if (advancedFilters.incident_type && report.incident_type !== advancedFilters.incident_type) {
      return false;
    }
    if (advancedFilters.location && report.location !== advancedFilters.location) {
      return false;
    }

    if (advancedFilters.startDate || advancedFilters.endDate) {
      const incidentDate = report.incident_date ? new Date(report.incident_date) : null;
      if (incidentDate) {
        if (advancedFilters.startDate && incidentDate < new Date(advancedFilters.startDate)) {
          return false;
        }
        if (advancedFilters.endDate && incidentDate > new Date(advancedFilters.endDate)) {
          return false;
        }
      }
    }

    let matchesSearch = true;
    if (searchTerm) {
      matchesSearch = patient?.中文姓氏.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.中文名字.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    }

    return matchesSearch;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case '院友姓名':
        aValue = patients.find(p => p.院友id === a.patient_id)?.中文姓名 || '';
        bValue = patients.find(p => p.院友id === b.patient_id)?.中文姓名 || '';
        break;
      case 'incident_date':
        aValue = a.incident_date || '';
        bValue = b.incident_date || '';
        break;
      case 'location':
        aValue = a.location || '';
        bValue = b.location || '';
        break;
      case 'created_at':
        aValue = a.created_at || '';
        bValue = b.created_at || '';
        break;
      default:
        aValue = a.incident_date || '';
        bValue = b.incident_date || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedReports.length / pageSize);
  const paginatedReports = pageSize === 999999
    ? sortedReports
    : sortedReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAdd = () => {
    setSelectedReport(null);
    setShowModal(true);
  };

  const handleEdit = (report: IncidentReport) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除此意外事件報告嗎？')) {
      setDeletingIds(prev => new Set(prev).add(id));
      try {
        await deleteIncidentReport(id);
      } catch (error) {
        console.error('刪除意外事件報告失敗:', error);
        alert('刪除失敗，請重試');
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedReports.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedReports.map(r => r.id)));
    }
  };

  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleClearFilters = () => {
    setAdvancedFilters({
      床號: '',
      中文姓名: '',
      incident_type: '',
      location: '',
      startDate: '',
      endDate: '',
      在住狀態: '在住'
    });
    setSearchTerm('');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 inline ml-1" /> :
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">意外事件報告</h1>
              <p className="text-sm text-gray-500 mt-1">
                共 {filteredReports.length} 個報告
                {selectedRows.size > 0 && ` • 已選擇 ${selectedRows.size} 個`}
              </p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新增意外事件報告</span>
          </button>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索院友姓名、床號、地點..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              showAdvancedFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>進階篩選</span>
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">床號</label>
                <input
                  type="text"
                  value={advancedFilters.床號}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 床號: e.target.value }))}
                  className="form-input text-sm"
                  placeholder="輸入床號..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">院友姓名</label>
                <input
                  type="text"
                  value={advancedFilters.中文姓名}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 中文姓名: e.target.value }))}
                  className="form-input text-sm"
                  placeholder="輸入姓名..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事故性質</label>
                <select
                  value={advancedFilters.incident_type}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, incident_type: e.target.value }))}
                  className="form-input text-sm"
                >
                  <option value="">全部</option>
                  <option value="跌倒">跌倒</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地點</label>
                <select
                  value={advancedFilters.location}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="form-input text-sm"
                >
                  <option value="">全部</option>
                  <option value="客廳/飯廳">客廳/飯廳</option>
                  <option value="走廊">走廊</option>
                  <option value="廁所">廁所</option>
                  <option value="浴室">浴室</option>
                  <option value="床邊">床邊</option>
                  <option value="其他地方">其他地方</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                <input
                  type="date"
                  value={advancedFilters.startDate}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                <input
                  type="date"
                  value={advancedFilters.endDate}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="form-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">在住狀態</label>
                <select
                  value={advancedFilters.在住狀態}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 在住狀態: e.target.value }))}
                  className="form-input text-sm"
                >
                  <option value="全部">全部</option>
                  <option value="在住">在住</option>
                  <option value="待入住">待入住</option>
                  <option value="已退住">已退住</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="btn-secondary text-sm w-full flex items-center justify-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>清除篩選</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedReports.length && paginatedReports.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('院友姓名')}
                >
                  院友
                  {renderSortIcon('院友姓名')}
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('incident_date')}
                >
                  意外日期
                  {renderSortIcon('incident_date')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  意外時間
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  事故性質
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('location')}
                >
                  地點
                  {renderSortIcon('location')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  填報人
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>暫無意外事件報告</p>
                  </td>
                </tr>
              ) : (
                paginatedReports.map(report => {
                  const patient = patients.find(p => p.院友id === report.patient_id);
                  const isDeleting = deletingIds.has(report.id);

                  return (
                    <tr
                      key={report.id}
                      className={`hover:bg-gray-50 transition-colors ${isDeleting ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(report.id)}
                          onChange={() => handleRowSelect(report.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {patient ? (
                          <PatientTooltip patient={patient}>
                            <div className="flex items-center space-x-2 cursor-pointer">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{patient.中文姓名}</div>
                                <div className="text-sm text-gray-500">{patient.床號}</div>
                              </div>
                            </div>
                          </PatientTooltip>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{report.incident_date || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{report.incident_time || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {report.incident_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{report.location || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{report.reporter_signature || '-'}</div>
                        <div className="text-xs text-gray-500">{report.reporter_position || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(report)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="編輯"
                            disabled={isDeleting}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="刪除"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">每頁顯示</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-input text-sm py-1"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={999999}>全部</option>
              </select>
              <span className="text-sm text-gray-700">筆</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                上一頁
              </button>
              <span className="text-sm text-gray-700">
                第 {currentPage} / {totalPages} 頁
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <IncidentReportModal
          report={selectedReport || undefined}
          onClose={() => {
            setShowModal(false);
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};

export default IncidentReports;
