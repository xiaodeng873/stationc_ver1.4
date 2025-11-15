import { useState } from 'react';
import {
  Stethoscope,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  X,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileWarning
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import AnnualHealthCheckupModal from '../components/AnnualHealthCheckupModal';
import PatientTooltip from '../components/PatientTooltip';
import {
  getCheckupStatus,
  getStatusColor,
  type AnnualHealthCheckup,
  type CheckupStatus
} from '../utils/annualHealthCheckupHelper';

type SortField = '院友姓名' | 'last_doctor_signature_date' | 'next_due_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface AdvancedFilters {
  床號: string;
  中文姓名: string;
  status: string;
  startDate: string;
  endDate: string;
  在住狀態: string;
}

export default function AnnualHealthCheckup() {
  const { annualHealthCheckups, patients, deleteAnnualHealthCheckup, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState<AnnualHealthCheckup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('next_due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [filters, setFilters] = useState<AdvancedFilters>({
    床號: '',
    中文姓名: '',
    status: '',
    startDate: '',
    endDate: '',
    在住狀態: '在住'
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const enrichedCheckups = annualHealthCheckups.map(checkup => {
    const patient = patients.find(p => p.院友id === checkup.patient_id);
    return {
      ...checkup,
      院友姓名: patient?.中文姓名 || '未知',
      床號: patient?.床號 || '未知',
      在住狀態: patient?.在住狀態 || '未知'
    };
  });

  const filteredCheckups = enrichedCheckups.filter(checkup => {
    if (filters.在住狀態 && checkup.在住狀態 !== filters.在住狀態) return false;
    if (filters.床號 && !checkup.床號?.includes(filters.床號)) return false;
    if (filters.中文姓名 && !checkup.院友姓名?.includes(filters.中文姓名)) return false;
    if (filters.status) {
      const status = getCheckupStatus(checkup);
      if (status !== filters.status) return false;
    }
    if (filters.startDate && checkup.last_doctor_signature_date) {
      if (checkup.last_doctor_signature_date < filters.startDate) return false;
    }
    if (filters.endDate && checkup.last_doctor_signature_date) {
      if (checkup.last_doctor_signature_date > filters.endDate) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        checkup.院友姓名?.toLowerCase().includes(term) ||
        checkup.床號?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const sortedCheckups = [...filteredCheckups].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case '院友姓名':
        aValue = a.院友姓名 || '';
        bValue = b.院友姓名 || '';
        break;
      case 'last_doctor_signature_date':
        aValue = a.last_doctor_signature_date || '';
        bValue = b.last_doctor_signature_date || '';
        break;
      case 'next_due_date':
        aValue = a.next_due_date || '';
        bValue = b.next_due_date || '';
        break;
      case 'created_at':
        aValue = a.created_at || '';
        bValue = b.created_at || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCheckups.length / (pageSize === -1 ? sortedCheckups.length : pageSize));
  const paginatedCheckups = pageSize === -1 ? sortedCheckups : sortedCheckups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAdd = () => {
    setSelectedCheckup(null);
    setShowModal(true);
  };

  const handleEdit = (checkup: AnnualHealthCheckup) => {
    setSelectedCheckup(checkup);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('確定要刪除此年度體檢記錄嗎？')) {
      try {
        await deleteAnnualHealthCheckup(id);
      } catch (error) {
        console.error('Error deleting checkup:', error);
        alert('刪除失敗');
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedCheckup(null);
  };

  const handleModalSave = () => {
    setShowModal(false);
    setSelectedCheckup(null);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedCheckups.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedCheckups.map(c => c.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleClearFilters = () => {
    setFilters({
      床號: '',
      中文姓名: '',
      status: '',
      startDate: '',
      endDate: '',
      在住狀態: '在住'
    });
    setSearchTerm('');
  };

  const getStatusBadge = (status: CheckupStatus) => {
    const colorClass = getStatusColor(status);
    let icon = null;

    switch (status) {
      case '有效':
        icon = <CheckCircle className="h-4 w-4" />;
        break;
      case '即將到期':
        icon = <Clock className="h-4 w-4" />;
        break;
      case '已逾期':
        icon = <AlertTriangle className="h-4 w-4" />;
        break;
      case '未簽署':
        icon = <FileWarning className="h-4 w-4" />;
        break;
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        <span>{status}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Stethoscope className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">年度體檢管理</h1>
              <p className="text-sm text-gray-600">管理院友年度體格檢驗報告書</p>
            </div>
          </div>
          <button onClick={handleAdd} className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>新增年度體檢</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋院友姓名、床號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`btn-secondary flex items-center space-x-2 ${showAdvancedFilters ? 'bg-blue-100' : ''}`}
          >
            <Filter className="h-5 w-5" />
            <span>進階篩選</span>
          </button>
          {(searchTerm || filters.床號 || filters.中文姓名 || filters.status || filters.startDate || filters.endDate || filters.在住狀態 !== '在住') && (
            <button onClick={handleClearFilters} className="btn-secondary flex items-center space-x-2">
              <X className="h-5 w-5" />
              <span>清除篩選</span>
            </button>
          )}
        </div>

        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">床號</label>
                <input
                  type="text"
                  value={filters.床號}
                  onChange={(e) => setFilters(prev => ({ ...prev, 床號: e.target.value }))}
                  className="form-input"
                  placeholder="輸入床號"
                />
              </div>

              <div>
                <label className="form-label">院友姓名</label>
                <input
                  type="text"
                  value={filters.中文姓名}
                  onChange={(e) => setFilters(prev => ({ ...prev, 中文姓名: e.target.value }))}
                  className="form-input"
                  placeholder="輸入姓名"
                />
              </div>

              <div>
                <label className="form-label">在住狀態</label>
                <select
                  value={filters.在住狀態}
                  onChange={(e) => setFilters(prev => ({ ...prev, 在住狀態: e.target.value }))}
                  className="form-input"
                >
                  <option value="">全部</option>
                  <option value="在住">在住</option>
                  <option value="待入住">待入住</option>
                  <option value="已退住">已退住</option>
                </select>
              </div>

              <div>
                <label className="form-label">簽署狀態</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="form-input"
                >
                  <option value="">全部</option>
                  <option value="有效">有效</option>
                  <option value="即將到期">即將到期</option>
                  <option value="已逾期">已逾期</option>
                  <option value="未簽署">未簽署</option>
                </select>
              </div>

              <div>
                <label className="form-label">簽署開始日期</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">簽署結束日期</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>共 {sortedCheckups.length} 筆記錄</span>
            {selectedRows.size > 0 && (
              <span className="text-blue-600">已選擇 {selectedRows.size} 筆</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>每頁顯示：</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-input py-1"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={-1}>全部</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedCheckups.length && paginatedCheckups.length > 0}
                    onChange={handleSelectAll}
                    className="form-checkbox"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('院友姓名')}
                >
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>床號 / 院友</span>
                    {getSortIcon('院友姓名')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_doctor_signature_date')}
                >
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>上次醫生簽署日期</span>
                    {getSortIcon('last_doctor_signature_date')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('next_due_date')}
                >
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>下次到期日</span>
                    {getSortIcon('next_due_date')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCheckups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Stethoscope className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">暫無年度體檢記錄</p>
                    <p className="text-sm">點擊「新增年度體檢」按鈕開始建立記錄</p>
                  </td>
                </tr>
              ) : (
                paginatedCheckups.map((checkup) => {
                  const status = getCheckupStatus(checkup);
                  return (
                    <tr
                      key={checkup.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedRows.has(checkup.id) ? 'bg-blue-50' : ''}`}
                      onDoubleClick={() => handleEdit(checkup)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(checkup.id)}
                          onChange={() => handleSelectRow(checkup.id)}
                          className="form-checkbox"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PatientTooltip patientId={checkup.patient_id}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-blue-600">{checkup.床號}</span>
                            <span className="text-gray-900">{checkup.院友姓名}</span>
                          </div>
                        </PatientTooltip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {checkup.last_doctor_signature_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {checkup.next_due_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(checkup)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(checkup.id)}
                            className="text-red-600 hover:text-red-900"
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
      </div>

      {pageSize !== -1 && totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-6 py-4 sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              顯示第 {(currentPage - 1) * pageSize + 1} 到 {Math.min(currentPage * pageSize, sortedCheckups.length)} 筆，共 {sortedCheckups.length} 筆記錄
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一頁
              </button>
              <span className="text-sm text-gray-600">
                第 {currentPage} / {totalPages} 頁
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一頁
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <AnnualHealthCheckupModal
          checkup={selectedCheckup}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
