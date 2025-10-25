import React, { useState } from 'react';
import { X, Heart, Activity, Droplets, Scale, User, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import PatientAutocomplete from './PatientAutocomplete';

interface HealthRecordModalProps {
  record?: any;
  initialData?: {
    patient?: { 院友id: number; 中文姓名?: string; 床號?: string };
    task?: { id: string; health_record_type: string; next_due_at: string };
    預設記錄類型?: string;
  };
  onClose: () => void;
  onTaskCompleted?: (recordDateTime: Date) => void;
}

const HealthRecordModal: React.FC<HealthRecordModalProps> = ({ record, initialData, onClose, onTaskCompleted }) => {
  console.log('=== HealthRecordModal 接收到的 initialData ===');
  console.log('record:', record);
  console.log('initialData:', initialData);
  console.log('initialData.patient:', initialData?.patient);
  console.log('initialData.task:', initialData?.task);

  const { addHealthRecord, updateHealthRecord, patients, hospitalEpisodes } = usePatients();
  const { displayName } = useAuth();

  // 香港時區輔助函數 (移到組件內部，確保其作用域)
  const getHongKongDateTime = (dateString?: string) => {
    console.log('getHongKongDateTime 輸入:', dateString);
    const date = dateString ? new Date(dateString) : new Date();
    // 使用 toLocaleString 直接獲取香港時區的時間
    const hongKongTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}));
    
    const year = hongKongTime.getFullYear();
    const month = (hongKongTime.getMonth() + 1).toString().padStart(2, '0');
    const day = hongKongTime.getDate().toString().padStart(2, '0');
    const hours = hongKongTime.getHours().toString().padStart(2, '0');
    const minutes = hongKongTime.getMinutes().toString().padStart(2, '0');
    const result = {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
    console.log('getHongKongDateTime 輸出:', result);
    return result;
  };

  // 生成隨機預設值的函數
  const generateRandomDefaults = (recordType: string) => {
    if (recordType === '生命表徵') {
      return {
        體溫: (Math.random() * 0.9 + 36.0).toFixed(1), // 36.0-36.9
        血含氧量: Math.floor(Math.random() * 5 + 95).toString(), // 95-99
        呼吸頻率: Math.floor(Math.random() * 9 + 14).toString() // 14-22
      };
    }
    return {};
  };

  // 計算初始值 - 在 formData 初始化之前
  const initialPatientId = record?.院友id?.toString() || initialData?.patient?.院友id?.toString() || '';
  const initialRecordTypeForDefaults = initialData?.預設記錄類型 || initialData?.task?.health_record_type || '生命表徵';
  const initialRandomDefaults = record ? {} : generateRandomDefaults(initialRecordTypeForDefaults);
  
  // 檢查院友是否入院中的函數
  const checkPatientHospitalized = (patientId: string): boolean => {
    if (!patientId) return false;
    const patient = patients.find(p => p.院友id.toString() === patientId.toString());
    
    // 檢查是否有 active 狀態的住院事件
    const hasActiveEpisode = hospitalEpisodes.some(episode => 
      episode.patient_id === patient?.院友id && episode.status === 'active'
    );
    
    // 使用住院事件狀態作為主要判斷依據，is_hospitalized 作為備用
    const isHospitalized = hasActiveEpisode || patient?.is_hospitalized || false;
    
    console.log('🏥 檢查院友入院狀態:', {
      patientId,
      foundPatient: !!patient,
      patientName: patient ? `${patient.中文姓氏}${patient.中文名字}` : 'Not found',
      isHospitalizedField: patient?.is_hospitalized,
      hasActiveEpisode,
      finalIsHospitalized: isHospitalized,
      bedNumber: patient?.床號,
      residencyStatus: patient?.在住狀態
    });
    
    return isHospitalized;
  };
  
  const initialIsPatientHospitalized = checkPatientHospitalized(initialPatientId);

  // 初始化表單數據
  console.log('準備解析 next_due_at:', initialData?.task?.next_due_at);
  const { date: defaultRecordDate, time: defaultRecordTime } = record 
    ? { date: record.記錄日期, time: record.記錄時間 }
    : getHongKongDateTime(initialData?.task?.next_due_at);

  console.log('解析後的預設日期時間:', { defaultRecordDate, defaultRecordTime });


  const [formData, setFormData] = useState({
    院友id: initialPatientId,
    記錄類型: record?.記錄類型 || initialRecordTypeForDefaults,
    記錄日期: defaultRecordDate,
    記錄時間: defaultRecordTime,
    血壓收縮壓: record?.血壓收縮壓?.toString() || (initialIsPatientHospitalized ? '' : ''),
    血壓舒張壓: record?.血壓舒張壓?.toString() || (initialIsPatientHospitalized ? '' : ''),
    脈搏: record?.脈搏?.toString() || (initialIsPatientHospitalized ? '' : ''),
    體溫: record?.體溫?.toString() || (initialIsPatientHospitalized ? '' : initialRandomDefaults.體溫 || ''),
    血含氧量: record?.血含氧量?.toString() || (initialIsPatientHospitalized ? '' : initialRandomDefaults.血含氧量 || ''),
    呼吸頻率: record?.呼吸頻率?.toString() || (initialIsPatientHospitalized ? '' : initialRandomDefaults.呼吸頻率 || ''),
    血糖值: record?.血糖值?.toString() || (initialIsPatientHospitalized ? '' : ''),
    體重: record?.體重?.toString() || (initialIsPatientHospitalized ? '' : ''),
    備註: record?.備註 || (initialIsPatientHospitalized && !record ? '無法量度原因: 入院' : ''),
    記錄人員: record?.記錄人員 || displayName || '',
    isAbsent: record ? (record.備註?.includes('無法量度') || false) : initialIsPatientHospitalized,
    absenceReason: record ? '' : (initialIsPatientHospitalized ? '入院' : ''),
   customAbsenceReason: ''
  });

  // 動態檢查當前選中的院友是否入院中
  const currentIsPatientHospitalized = React.useMemo(() => {
    return checkPatientHospitalized(formData.院友id);
  }, [formData.院友id, patients]);
  // 日期警告相關狀態
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [isDateWarningConfirmed, setIsDateWarningConfirmed] = useState(false);

  // 當院友選擇改變時，自動檢查是否入院中並更新表單
  React.useEffect(() => {
    console.log('院友選擇變更 useEffect 觸發:', {
      patientId: formData.院友id,
      isRecord: !!record,
      currentIsPatientHospitalized,
      currentIsAbsent: formData.isAbsent,
      currentAbsenceReason: formData.absenceReason
    });
    
    if (formData.院友id && !record) { // 只在新增模式下自動設定
      const isHospitalized = currentIsPatientHospitalized;
      console.log('新增模式自動設定檢查:', {
        isHospitalized,
        currentIsAbsent: formData.isAbsent,
        shouldAutoSet: isHospitalized && !formData.isAbsent
      });
      
      if (isHospitalized && !formData.isAbsent) {
        // 如果院友入院中且尚未設定為無法量度，自動設定
        console.log('自動設定入院無法量度');
        setFormData(prev => ({
          ...prev,
          isAbsent: true,
          absenceReason: '入院',
          備註: '無法量度原因: 入院',
          // 清空所有監測數值
          血壓收縮壓: '',
          血壓舒張壓: '',
          脈搏: '',
          體溫: '',
          血含氧量: '',
          呼吸頻率: '',
          血糖值: '',
          體重: ''
        }));
      } else if (!isHospitalized && formData.isAbsent && formData.absenceReason === '入院') {
        // 如果院友不再入院中且當前設定為入院無法量度，自動清除
        console.log('自動清除入院無法量度設定');
        setFormData(prev => ({
          ...prev,
          isAbsent: false,
          absenceReason: '',
          備註: ''
        }));
      }
    }
  }, [formData.院友id, record, currentIsPatientHospitalized]);

  // 如果是編輯模式且備註包含無法量度原因，解析原因
  React.useEffect(() => {
    if (record?.備註?.includes('無法量度原因:')) {
      const reasonMatch = record.備註.match(/無法量度原因:\s*(.+)/);
      if (reasonMatch) {
       const reason = reasonMatch[1].trim();
       // 檢查是否為預設原因
       const predefinedReasons = ['入院', '回家', '拒絕'];
       if (predefinedReasons.includes(reason)) {
         setFormData(prev => ({
           ...prev,
           isAbsent: true,
           absenceReason: reason
         }));
       } else {
         // 如果不是預設原因，設為"其他"並填入自定義原因
         setFormData(prev => ({
           ...prev,
           isAbsent: true,
           absenceReason: '其他',
           customAbsenceReason: reason
         }));
       }
      }
    }
  }, [record]);
  console.log('初始化的 formData:', formData);

  // 針對體重控制任務，將記錄時間預設為 00:00
  // 使用 useEffect 確保在記錄類型改變時觸發
  React.useEffect(() => {
    console.log('useEffect 檢查記錄類型:', formData.記錄類型);
    if (formData.記錄類型 === '體重控制') {
      console.log('設定體重控制時間為 00:00');
      setFormData(prev => ({ ...prev, 記錄時間: '00:00' }));
    }
  }, [formData.記錄類型]);

  // 獲取當前香港日期
  const getCurrentHongKongDate = (): string => {
    const now = new Date();
    const hongKongTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}));
    return hongKongTime.toISOString().split('T')[0];
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAbsenceChange = (checked: boolean) => {
    if (checked) {
      // 勾選無法量度：清空所有健康數據
      setFormData(prev => ({
        ...prev,
        isAbsent: true,
        血壓收縮壓: '',
        血壓舒張壓: '',
        脈搏: '',
        體溫: '',
        血含氧量: '',
        呼吸頻率: '',
        血糖值: '',
        體重: '',
        備註: prev.absenceReason ? `無法量度原因: ${prev.absenceReason}` : '無法量度'
      }));
    } else {
      // 取消勾選無法量度：清空備註
      setFormData(prev => ({
        ...prev,
        isAbsent: false,
        absenceReason: '',
        備註: ''
      }));
    }
  };

  const handleAbsenceReasonChange = (reason: string) => {
   if (reason === '其他') {
     // 當選擇"其他"時，不立即設定備註，等待用戶輸入自定義原因
     setFormData(prev => ({
       ...prev,
       absenceReason: reason,
       customAbsenceReason: '',
       備註: '無法量度原因: '
     }));
   } else {
     setFormData(prev => ({
       ...prev,
       absenceReason: reason,
       customAbsenceReason: '',
       備註: reason ? `無法量度原因: ${reason}` : '無法量度'
     }));
   }
 };
 
 // 處理自定義原因變更
 React.useEffect(() => {
   if (formData.absenceReason === '其他' && formData.customAbsenceReason) {
     setFormData(prev => ({
       ...prev,
       備註: `無法量度原因: ${prev.customAbsenceReason}`
     }));
   }
 }, [formData.customAbsenceReason]);
 
 const handleAbsenceReasonChangeOld = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      absenceReason: reason,
      備註: reason ? `無法量度原因: ${reason}` : '無法量度'
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.院友id) errors.push('請選擇院友');
    if (!formData.記錄日期) errors.push('請填寫記錄日期');
    // 體重控制任務的記錄時間可以為空，其他任務必須填寫
    if (formData.記錄類型 !== '體重控制' && !formData.記錄時間) errors.push('請填寫記錄時間');
    
    // 如果不是無法量度，才需要驗證健康數據
    if (!formData.isAbsent) {
      if (formData.記錄類型 === '生命表徵') {
        const hasVitalSign =
          formData.血壓收縮壓 || formData.血壓舒張壓 || formData.脈搏 || formData.體溫 || formData.血含氧量 || formData.呼吸頻率;
        if (!hasVitalSign) errors.push('至少需要填寫一項生命表徵數值');
      } else if (formData.記錄類型 === '血糖控制' && !formData.血糖值) {
        errors.push('請填寫血糖值');
      } else if (formData.記錄類型 === '體重控制' && !formData.體重) {
        errors.push('請填寫體重');
      }
    } else {
      // 無法量度時必須選擇原因
      if (!formData.absenceReason) {
        errors.push('請選擇原因');
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    // 檢查記錄日期是否早於當前日期
    const currentDate = getCurrentHongKongDate();
    const recordDate = formData.記錄日期;
    
    if (recordDate < currentDate && !isDateWarningConfirmed) {
      setShowDateWarningModal(true);
      return;
    }

    // 如果已確認，重設確認狀態以便下次再次檢查
    if (isDateWarningConfirmed) {
      setIsDateWarningConfirmed(false);
    }

    const recordData = {
      院友id: parseInt(formData.院友id),
      記錄日期: formData.記錄日期,
      // 體重控制任務的記錄時間固定為 00:00，其他任務使用表單值
      記錄時間: formData.記錄類型 === '體重控制' ? '00:00' : formData.記錄時間,
      記錄類型: formData.記錄類型,
      血壓收縮壓: formData.血壓收縮壓 ? parseInt(formData.血壓收縮壓) : null,
      血壓舒張壓: formData.血壓舒張壓 ? parseInt(formData.血壓舒張壓) : null,
      脈搏: formData.脈搏 ? parseInt(formData.脈搏) : null,
      體溫: formData.體溫 ? parseFloat(formData.體溫) : null,
      血含氧量: formData.血含氧量 ? parseInt(formData.血含氧量) : null,
      呼吸頻率: formData.呼吸頻率 ? parseInt(formData.呼吸頻率) : null,
      血糖值: formData.血糖值 ? parseFloat(formData.血糖值) : null,
      體重: formData.體重 ? parseFloat(formData.體重) : null,
      備註: formData.備註 || null,
      記錄人員: formData.記錄人員 || null,
    };

    try {
      if (record) {
        // 編輯模式
        await updateHealthRecord({
          記錄id: record.記錄id,
          ...recordData
        });
      } else {
        // 新增模式
        await addHealthRecord(recordData);
        // 傳遞實際記錄的日期時間給 onTaskCompleted
        if (onTaskCompleted) {
          const recordDateTime = new Date(`${formData.記錄日期}T${formData.記錄時間}`);
          onTaskCompleted(recordDateTime);
        }
      }
      onClose();
    } catch (error) {
      alert(`儲存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 處理日期警告確認
  const handleDateWarningConfirm = () => {
    setIsDateWarningConfirmed(true);
    setShowDateWarningModal(false);
    // 重新觸發提交
    const form = document.querySelector('form');
    if (form) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  };

  const handleDateWarningCancel = () => {
    setShowDateWarningModal(false);
    setIsDateWarningConfirmed(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {formData.記錄類型 === '生命表徵' && <Activity className="h-5 w-5 text-blue-600" />}
            {formData.記錄類型 === '血糖控制' && <Droplets className="h-5 w-5 text-red-600" />}
            {formData.記錄類型 === '體重控制' && <Scale className="h-5 w-5 text-green-600" />}
            <h2 className="text-xl font-semibold text-gray-900">
              {record ? '編輯健康記錄' : '新增健康記錄'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">
                <User className="h-4 w-4 inline mr-1" />
                院友 *
              </label>
              <PatientAutocomplete
                value={formData.院友id}
                onChange={(patientId) => updateFormData('院友id', patientId)}
                placeholder="搜索院友..."
              />
            </div>
            <div>
              <label className="form-label">記錄類型 *</label>
              <select
                value={formData.記錄類型}
                onChange={(e) => updateFormData('記錄類型', e.target.value)}
                className="form-input"
                required
              >
                <option value="生命表徵">生命表徵</option>
                <option value="血糖控制">血糖控制</option>
                <option value="體重控制">體重控制</option>
              </select>
            </div>
            <div>
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                記錄日期 *
              </label>
              <input
                type="date"
                value={formData.記錄日期}
                onChange={(e) => updateFormData('記錄日期', e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">
                <Clock className="h-4 w-4 inline mr-1" />
                {formData.記錄類型 === '體重控制' ? '記錄時間' : '記錄時間 *'}
              </label>
              <input
                type="time"
                value={formData.記錄時間}
                onChange={(e) => updateFormData('記錄時間', e.target.value)}
                className="form-input"
                required={formData.記錄類型 !== '體重控制'}
              />
            </div>
          </div>

          <div>
            <label className="form-label">記錄人員</label>
            <input
              type="text"
              value={formData.記錄人員}
              onChange={(e) => updateFormData('記錄人員', e.target.value)}
              className="form-input"
              placeholder="記錄人員姓名"
            />
          </div>

          {/* 無法量度選項 */}
          <div className="col-span-full">
            <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
              currentIsPatientHospitalized 
                ? 'bg-red-50 border-red-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <input
                type="checkbox"
                checked={formData.isAbsent}
                onChange={(e) => handleAbsenceChange(e.target.checked)}
                className={`h-4 w-4 focus:ring-orange-500 border-gray-300 rounded ${
                  currentIsPatientHospitalized 
                    ? 'text-red-600 focus:ring-red-500' 
                    : 'text-orange-600 focus:ring-orange-500'
                }`}
              />
              <label className={`text-sm font-medium ${
                currentIsPatientHospitalized ? 'text-red-800' : 'text-orange-800'
              }`}>
                院友未能進行監測
                {currentIsPatientHospitalized && (
                  <span className="ml-2 text-red-600 font-bold">(院友入院中)</span>
                )}
              </label>
              {formData.isAbsent && (
                <div className="flex items-center space-x-2">
                  <label className={`text-sm ${
                    currentIsPatientHospitalized ? 'text-red-700' : 'text-orange-700'
                  }`}>原因:</label>
                  <select
                    value={formData.absenceReason}
                    onChange={(e) => handleAbsenceReasonChange(e.target.value)}
                    className="form-input text-sm w-24"
                    required={formData.isAbsent}
                    disabled={currentIsPatientHospitalized && formData.absenceReason === '入院'}
                  >
                    <option value="">請選擇</option>
                    <option value="入院">入院</option>
                    <option value="回家">回家</option>
                    <option value="拒絕">拒絕</option>
                    <option value="其他">其他</option>
                  </select>
                  {formData.absenceReason === '其他' && (
                    <input
                      type="text"
                      value={formData.customAbsenceReason || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, customAbsenceReason: e.target.value }))}
                      className="form-input text-sm w-32 ml-2"
                      placeholder="請輸入原因..."
                      required
                    />
                  )}
                </div>
              )}
              
              {/* 入院中院友的提示訊息 */}
              {currentIsPatientHospitalized && (
                <div className="w-full mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                  <div className="flex items-center space-x-1">
                    <span>🏥</span>
                    <span>此院友目前入院中，系統已自動設定為無法量度，原因：入院</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {formData.記錄類型 === '生命表徵' && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">血壓 (mmHg)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={formData.血壓收縮壓}
                      onChange={(e) => updateFormData('血壓收縮壓', e.target.value)}
                      className="form-input"
                      placeholder="120"
                      min="0"
                      max="300"
                      disabled={formData.isAbsent}
                    />
                    <span className="flex items-center text-gray-500">/</span>
                    <input
                      type="number"
                      value={formData.血壓舒張壓}
                      onChange={(e) => updateFormData('血壓舒張壓', e.target.value)}
                      className="form-input"
                      placeholder="80"
                      min="0"
                      max="200"
                      disabled={formData.isAbsent}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">脈搏 (每分鐘)</label>
                  <input
                    type="number"
                    value={formData.脈搏}
                    onChange={(e) => updateFormData('脈搏', e.target.value)}
                    className="form-input"
                    placeholder="72"
                    min="0"
                    max="300"
                    disabled={formData.isAbsent}
                  />
                </div>
                <div>
                  <label className="form-label">體溫 (°C)</label>
                  <input
                    type="number"
                    value={formData.體溫}
                    onChange={(e) => updateFormData('體溫', e.target.value)}
                    className="form-input"
                    placeholder="36.5"
                    min="30"
                    max="45"
                    step="0.1"
                    disabled={formData.isAbsent}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">血含氧量 (%)</label>
                  <input
                    type="number"
                    value={formData.血含氧量}
                    onChange={(e) => updateFormData('血含氧量', e.target.value)}
                    className="form-input"
                    placeholder="98"
                    min="0"
                    max="100"
                    disabled={formData.isAbsent}
                  />
                </div>
                <div>
                  <label className="form-label">呼吸頻率 (每分鐘)</label>
                  <input
                    type="number"
                    value={formData.呼吸頻率}
                    onChange={(e) => updateFormData('呼吸頻率', e.target.value)}
                    className="form-input"
                    placeholder="18"
                    min="0"
                    max="100"
                    disabled={formData.isAbsent}
                  />
                </div>
                <div>
                  <label className="form-label">備註</label>
                  <textarea
                    value={formData.備註}
                    onChange={(e) => updateFormData('備註', e.target.value)}
                    className="form-input"
                    rows={1}
                    placeholder="其他備註資訊..."
                    disabled={formData.isAbsent}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.記錄類型 === '血糖控制' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="form-label">血糖值 (mmol/L) *</label>
                <input
                  type="number"
                  value={formData.血糖值}
                  onChange={(e) => updateFormData('血糖值', e.target.value)}
                  className="form-input"
                  placeholder="5.5"
                  min="0"
                  max="50"
                  step="0.1"
                  required
                  disabled={formData.isAbsent}
                />
              </div>
              <div>
                <label className="form-label">備註</label>
                <textarea
                  value={formData.備註}
                  onChange={(e) => updateFormData('備註', e.target.value)}
                  className="form-input"
                  rows={1}
                  placeholder="血糖測試相關備註..."
                  disabled={formData.isAbsent}
                />
              </div>
            </div>
          )}

          {formData.記錄類型 === '體重控制' && (
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="form-label">體重 (kg) *</label>
                <input
                  type="number"
                  value={formData.體重}
                  onChange={(e) => updateFormData('體重', e.target.value)}
                  className="form-input"
                  placeholder="65.0"
                  min="0"
                  max="300"
                  step="0.1"
                  required
                  disabled={formData.isAbsent}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              {record ? '更新記錄' : '儲存記錄'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* 日期警告確認模態框 */}
      {showDateWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">日期確認</h3>
              </div>
              <button
                onClick={handleDateWarningCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-900 mb-2">記錄日期早於當前日期</h4>
                    <div className="text-sm text-orange-800 space-y-1">
                      <p><strong>記錄日期：</strong>{new Date(formData.記錄日期).toLocaleDateString('zh-TW')}</p>
                      <p><strong>當前日期：</strong>{new Date(getCurrentHongKongDate()).toLocaleDateString('zh-TW')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 text-sm">
                您輸入的記錄日期早於當前系統日期。這可能是補錄過往的記錄，請確認是否要繼續儲存？
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDateWarningConfirm}
                className="btn-primary flex-1"
              >
                確認儲存
              </button>
              <button
                onClick={handleDateWarningCancel}
                className="btn-secondary flex-1"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HealthRecordModal;