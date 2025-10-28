import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock, Guitar as Hospital, MapPin, Bed, User, AlertTriangle, Heart, Building2, FileText, Activity } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import PatientAutocomplete from './PatientAutocomplete';

interface EpisodeEvent {
  id: string;
  event_type: 'admission' | 'transfer' | 'discharge';
  event_date: string;
  event_time: string;
  hospital_name: string;
  hospital_ward?: string;
  hospital_bed_number?: string;
  remarks?: string;
}

interface HospitalEpisodeModalProps {
  episode?: any;
  onClose: () => void;
  defaultPatientId?: string;
  defaultEventType?: 'admission' | 'transfer' | 'discharge';
}

const HospitalEpisodeModal: React.FC<HospitalEpisodeModalProps> = ({
  episode,
  onClose,
  defaultPatientId,
  defaultEventType = 'admission'
}) => {
  const { patients, addHospitalEpisode, updateHospitalEpisode, loading } = usePatients();

  // 香港時區輔助函數
  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return hongKongTime.toISOString().split('T')[0];
  };

  const getHongKongTime = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return hongKongTime.toISOString().split('T')[1].slice(0, 5);
  };

  const [formData, setFormData] = useState(() => {
    console.log('初始化表單資料，episode:', episode);
    console.log('Episode 完整資料:', JSON.stringify(episode, null, 2));
    return {
      patient_id: episode?.patient_id?.toString() || defaultPatientId || '',
      episode_start_date: episode?.episode_start_date || getHongKongDate(),
      episode_end_date: episode?.episode_end_date || '',
      status: episode?.status || 'active',
      primary_hospital: episode?.primary_hospital || '',
      primary_ward: episode?.primary_ward || '',
      primary_bed_number: episode?.primary_bed_number || '',
      discharge_type: episode?.discharge_type || '',
      discharge_destination: episode?.discharge_destination || '',
      date_of_death: episode?.date_of_death || '',
      time_of_death: episode?.time_of_death || '',
      remarks: episode?.remarks || ''
    };
  });

  const [events, setEvents] = useState<EpisodeEvent[]>(() => {
    console.log('初始化事件資料，episode?.episode_events:', episode?.episode_events);
    console.log('Episode events 完整資料:', JSON.stringify(episode?.episode_events, null, 2));
    
    if (episode?.episode_events && Array.isArray(episode.episode_events) && episode.episode_events.length > 0) {
      const processedEvents = episode.episode_events
        .sort((a: any, b: any) => (a.event_order || 0) - (b.event_order || 0))
        .map((event: any, index: number) => {
          console.log(`處理事件 ${index}:`, event);
          return {
            id: event.id || `temp-${Date.now()}-${Math.random()}`,
            event_type: event.event_type,
            event_date: event.event_date,
            event_time: event.event_time || '',
            hospital_name: event.hospital_name || '',
            hospital_ward: event.hospital_ward || '',
            hospital_bed_number: event.hospital_bed_number || '',
            remarks: event.remarks || ''
          };
        });
      console.log('處理後的事件:', processedEvents);
      return processedEvents;
    } else {
      // 新建住院事件時，預設添加一個入院事件
      console.log('新建住院事件，創建預設入院事件');
      return [{
        id: `temp-${Date.now()}`,
        event_type: 'admission',
        event_date: getHongKongDate(),
        event_time: getHongKongTime(),
        hospital_name: '',
        hospital_ward: '',
        hospital_bed_number: '',
        remarks: ''
      }];
    }
  });

  // 當 episode 資料變更時，重新載入表單資料
  useEffect(() => {
    if (episode) {
      console.log('Episode 資料變更，重新載入表單資料:', episode);
      setFormData({
        patient_id: episode.patient_id?.toString() || '',
        episode_start_date: episode.episode_start_date || getHongKongDate(),
        episode_end_date: episode.episode_end_date || '',
        status: episode.status || 'active',
        primary_hospital: episode.primary_hospital || '',
        primary_ward: episode.primary_ward || '',
        primary_bed_number: episode.primary_bed_number || '',
        discharge_type: episode.discharge_type || '',
        discharge_destination: episode.discharge_destination || '',
        date_of_death: episode.date_of_death || '',
        time_of_death: episode.time_of_death || '',
        remarks: episode.remarks || ''
      });

      // 重新載入事件資料
      if (episode.episode_events && Array.isArray(episode.episode_events) && episode.episode_events.length > 0) {
        const processedEvents = episode.episode_events
          .sort((a: any, b: any) => (a.event_order || 0) - (b.event_order || 0))
          .map((event: any) => ({
            id: event.id || `temp-${Date.now()}-${Math.random()}`,
            event_type: event.event_type,
            event_date: event.event_date,
            event_time: event.event_time || '',
            hospital_name: event.hospital_name || '',
            hospital_ward: event.hospital_ward || '',
            hospital_bed_number: event.hospital_bed_number || '',
            remarks: event.remarks || ''
          }));
        console.log('重新載入的事件資料:', processedEvents);
        setEvents(processedEvents);
      }
    }
  }, [episode]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 等待資料載入完成
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700">載入中...</span>
        </div>
      </div>
    );
  }

  // 常用醫院列表
  const commonHospitals = [
    '瑪麗醫院',
    '伊利沙伯醫院', 
    '廣華醫院',
    '東華醫院',
    '律敦治醫院',
    '聯合醫院',
    '威爾斯親王醫院',
    '沙田醫院',
    '屯門醫院',
    '天水圍醫院'
  ];

  // 出院類型選項
  const dischargeTypes = [
    { value: 'return_to_facility', label: '返回院舍', description: '院友康復後返回護老院', icon: <Building2 className="h-5 w-5" /> },
    { value: 'home', label: '回家', description: '院友康復後回到原居住地', icon: <Building2 className="h-5 w-5" /> },
    { value: 'transfer_out', label: '轉至其他機構', description: '轉移至其他醫療或照護機構', icon: <MapPin className="h-5 w-5" /> },
    { value: 'deceased', label: '離世', description: '院友在醫院內離世', icon: <Heart className="h-5 w-5" /> }
  ];

  // 添加事件
  const addEvent = (eventType: 'transfer' | 'discharge') => {
    const newEvent: EpisodeEvent = {
      id: `temp-${Date.now()}-${Math.random()}`,
      event_type: eventType,
      event_date: getHongKongDate(),
      event_time: getHongKongTime(),
      hospital_name: '',
      hospital_ward: '',
      hospital_bed_number: '',
      remarks: ''
    };
    setEvents([...events, newEvent]);
  };

  // 刪除事件
  const removeEvent = (id: string) => {
    // 不能刪除入院事件
    const eventToRemove = events.find(e => e.id === id);
    if (eventToRemove?.event_type === 'admission') {
      alert('不能刪除入院事件');
      return;
    }
    
    // 如果刪除的是出院事件，重置出院相關資料
    if (eventToRemove?.event_type === 'discharge') {
      setFormData(prev => ({
        ...prev,
        discharge_type: '',
        discharge_destination: '',
        date_of_death: '',
        time_of_death: ''
      }));
    }
    
    setEvents(events.filter(e => e.id !== id));
  };

  // 更新事件
  const updateEvent = (id: string, field: keyof EpisodeEvent, value: string) => {
    setEvents(events.map(event => 
      event.id === id ? { ...event, [field]: value } : event
    ));
  };

  // 自動更新主要醫院資訊
  useEffect(() => {
    const admissionEvent = events.find(e => e.event_type === 'admission');
    if (admissionEvent) {
      setFormData(prev => ({
        ...prev,
        episode_start_date: admissionEvent.event_date,
        primary_hospital: admissionEvent.hospital_name,
        primary_ward: admissionEvent.hospital_ward || '',
        primary_bed_number: admissionEvent.hospital_bed_number || ''
      }));
    }
  }, [events]);

  // 自動設定住院結束日期
  useEffect(() => {
    const dischargeEvent = events.find(e => e.event_type === 'discharge');
    if (dischargeEvent) {
      setFormData(prev => ({
        ...prev,
        episode_end_date: dischargeEvent.event_date,
        status: 'completed'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        episode_end_date: '',
        status: 'active'
      }));
    }
  }, [events]);

  // 驗證表單
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 基本必填欄位
    if (!formData.patient_id) {
      newErrors.patient_id = '請選擇院友';
    }
    
    // 檢查是否有入院事件
    const admissionEvent = events.find(e => e.event_type === 'admission');
    if (!admissionEvent) {
      newErrors.admission_event = '必須有入院事件';
    }

    // 驗證事件
    events.forEach((event, index) => {
      if (!event.event_date) {
        newErrors[`event_date_${index}`] = '請選擇事件日期';
      }
      if (!event.hospital_name) {
        newErrors[`hospital_name_${index}`] = '請輸入醫院名稱';
      }
    });

    // 如果有出院事件，驗證相關資訊
    const dischargeEvent = events.find(e => e.event_type === 'discharge');
    if (dischargeEvent) {
      if (formData.discharge_type === 'deceased') {
        if (!formData.date_of_death) {
          newErrors.date_of_death = '請選擇離世日期';
        }
      } else if (formData.discharge_type === 'transfer_out') {
        if (!formData.discharge_destination) {
          newErrors.discharge_destination = '請輸入轉入機構名稱';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 將空字符串轉換為 null（日期和時間欄位）
      const cleanFormData = {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        episode_end_date: formData.episode_end_date || null,
        date_of_death: formData.date_of_death || null,
        time_of_death: formData.time_of_death || null,
        discharge_destination: formData.discharge_destination || null,
        discharge_type: formData.discharge_type || null
      };

      const submitData = {
        ...cleanFormData,
        events: events.map(event => ({
          ...event,
          id: event.id.startsWith('temp-') ? undefined : event.id,
          event_time: event.event_time || null
        }))
      };

      console.log('提交住院事件資料:', submitData);
      console.log('Patient ID 類型:', typeof submitData.patient_id);
      console.log('Events:', submitData.events);

      if (episode) {
        await updateHospitalEpisode({ ...submitData, id: episode.id });
      } else {
        await addHospitalEpisode(submitData);
      }

      onClose();
    } catch (error: any) {
      console.error('提交住院事件失敗:', error);
      console.error('錯誤類型:', typeof error);
      console.error('錯誤物件:', JSON.stringify(error, null, 2));

      let errorMessage = '提交失敗，請重試';
      if (error?.message) {
        errorMessage = `提交失敗：${error.message}`;
      }
      if (error?.details) {
        errorMessage += `\n詳情：${error.details}`;
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 獲取事件類型資訊
  const getEventTypeInfo = (type: string) => {
    switch (type) {
      case 'admission':
        return { label: '入院', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'transfer':
        return { label: '轉院', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'discharge':
        return { label: '出院', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      default:
        return { label: type, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  // 計算住院天數
  const calculateDays = () => {
    if (formData.episode_start_date && formData.episode_end_date) {
      const start = new Date(formData.episode_start_date);
      const end = new Date(formData.episode_end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return null;
  };

  const totalDays = calculateDays();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* 模態框標題 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Hospital className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {episode ? '編輯住院事件' : '新增住院事件'}
              </h2>
              <p className="text-sm text-gray-600">完整記錄從入院到出院的整個過程</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本資訊區塊 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-600" />
              基本資訊
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 院友選擇 */}
              <div>
                <label className="form-label">
                  院友 <span className="text-red-500">*</span>
                </label>
                <PatientAutocomplete
                  value={formData.patient_id}
                  onChange={(patientId) => setFormData({ ...formData, patient_id: patientId })}
                  placeholder="搜索院友..."
                />
                {patients.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    沒有可選擇的院友，請先在院友記錄中新增院友
                  </p>
                )}
                {errors.patient_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.patient_id}</p>
                )}
              </div>

              {/* 住院日期資訊顯示 */}
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">住院日期資訊</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700">住院開始：</span>
                      <span className="font-medium text-blue-900">
                        {(() => {
                          const admissionEvent = events.find(e => e.event_type === 'admission');
                          return admissionEvent 
                            ? `${new Date(admissionEvent.event_date).toLocaleDateString('zh-TW')} ${admissionEvent.event_time || ''}`
                            : '待設定入院事件';
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">住院結束：</span>
                      <span className="font-medium text-blue-900">
                        {(() => {
                          const dischargeEvent = events.find(e => e.event_type === 'discharge');
                          return dischargeEvent 
                            ? `${new Date(dischargeEvent.event_date).toLocaleDateString('zh-TW')} ${dischargeEvent.event_time || ''}`
                            : '入院中';
                        })()}
                      </span>
                    </div>
                    {totalDays && (
                      <div className="md:col-span-2">
                        <span className="text-blue-700">住院天數：</span>
                        <span className="font-medium text-blue-900">{totalDays} 天</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 住院日期自動從入院和出院事件計算
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 事件時間軸 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                事件時間軸
              </h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addEvent('transfer')}
                  className="btn-secondary flex items-center space-x-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>新增轉院</span>
                </button>
                <button
                  type="button"
                  onClick={() => addEvent('discharge')}
                  className="btn-secondary flex items-center space-x-2 text-sm"
                  disabled={events.some(e => e.event_type === 'discharge')}
                >
                  <Plus className="h-4 w-4" />
                  <span>新增出院</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {events.map((event, index) => {
                const eventInfo = getEventTypeInfo(event.event_type);
                
                return (
                  <div key={event.id} className={`${eventInfo.bgColor} ${eventInfo.borderColor} border rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${eventInfo.color} ${eventInfo.bgColor} border ${eventInfo.borderColor}`}>
                          {index + 1}. {eventInfo.label}
                        </span>
                        {event.event_type === 'admission' && (
                          <span className="text-xs text-gray-500">(必要事件)</span>
                        )}
                      </div>
                      {event.event_type !== 'admission' && (
                        <button
                          type="button"
                          onClick={() => removeEvent(event.id)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 事件日期 */}
                      <div>
                        <label className="form-label">
                          事件日期 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="date"
                            value={event.event_date}
                            onChange={(e) => updateEvent(event.id, 'event_date', e.target.value)}
                            className={`form-input pl-10 ${errors[`event_date_${index}`] ? 'border-red-300' : ''}`}
                            required
                          />
                        </div>
                        {errors[`event_date_${index}`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`event_date_${index}`]}</p>
                        )}
                      </div>

                      {/* 事件時間 */}
                      {event.event_type !== 'transfer' && (
                        <div>
                          <label className="form-label">事件時間</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="time"
                              value={event.event_time}
                              onChange={(e) => updateEvent(event.id, 'event_time', e.target.value)}
                              className="form-input pl-10"
                            />
                          </div>
                        </div>
                      )}

                      {/* 醫院名稱 - 調整 grid 佈局 */}
                      <div className={event.event_type === 'transfer' ? 'md:col-span-2' : ''}>
                        <label className="form-label">
                          醫院名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                          list="hospital-list"
                          value={event.hospital_name}
                          onChange={(e) => updateEvent(event.id, 'hospital_name', e.target.value)}
                          className={`form-input ${errors[`hospital_name_${index}`] ? 'border-red-300' : ''}`}
                          placeholder="選擇或輸入醫院名稱"
                          required
                        />
                        <datalist id="hospital-list">
                          {commonHospitals.map(hospital => (
                            <option key={hospital} value={hospital} />
                          ))}
                        </datalist>
                        {errors[`hospital_name_${index}`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`hospital_name_${index}`]}</p>
                        )}
                      </div>

                      {/* 病房 */}
                      <div>
                        <label className="form-label">病房</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={event.hospital_ward || ''}
                            onChange={(e) => updateEvent(event.id, 'hospital_ward', e.target.value)}
                            className="form-input pl-10"
                            placeholder="例：內科病房"
                          />
                        </div>
                      </div>

                      {/* 醫院床號 */}
                      <div>
                        <label className="form-label">醫院床號</label>
                        <div className="relative">
                          <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={event.hospital_bed_number || ''}
                            onChange={(e) => updateEvent(event.id, 'hospital_bed_number', e.target.value)}
                            className="form-input pl-10"
                            placeholder="例：A01"
                          />
                        </div>
                      </div>

                      {/* 事件備註 */}
                      <div className="md:col-span-3">
                        <label className="form-label">事件備註</label>
                        <textarea
                          value={event.remarks || ''}
                          onChange={(e) => updateEvent(event.id, 'remarks', e.target.value)}
                          className="form-input"
                          rows={1}
                          placeholder="此事件的相關備註..."
                        />
                      </div>

                      {/* 出院類型選擇 - 只在出院事件中顯示 */}
                      {event.event_type === 'discharge' && (
                        <div className="md:col-span-3 lg:col-span-4">
                          <label className="form-label">
                            出院類型 <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                            {dischargeTypes.map(type => (
                              <label
                                key={type.value}
                                className={`relative flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                  formData.discharge_type === type.value
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2 mb-1">
                                  <input
                                    type="radio"
                                    name="discharge_type"
                                    value={type.value}
                                    checked={formData.discharge_type === type.value}
                                    onChange={(e) => setFormData(prev => ({ ...prev, discharge_type: e.target.value as any }))}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="flex items-center space-x-1">
                                    {type.icon}
                                    <span className="font-medium text-gray-900 text-sm">{type.label}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 ml-6">{type.description}</p>
                              </label>
                            ))}
                          </div>

                          {/* 離世資訊 */}
                          {formData.discharge_type === 'deceased' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="md:col-span-2">
                                <h5 className="text-sm font-medium text-red-900 mb-2">離世資訊</h5>
                              </div>
                              <div>
                                <label className="form-label">
                                  離世日期 <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={formData.date_of_death}
                                  onChange={(e) => setFormData({ ...formData, date_of_death: e.target.value })}
                                  className={`form-input ${errors.date_of_death ? 'border-red-300' : ''}`}
                                  required
                                />
                                {errors.date_of_death && (
                                  <p className="text-red-500 text-sm mt-1">{errors.date_of_death}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 轉入機構資訊 */}
                          {formData.discharge_type === 'transfer_out' && (
                            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <h5 className="text-sm font-medium text-purple-900 mb-2">轉入機構資訊</h5>
                              <div>
                                <label className="form-label">
                                  轉入機構名稱 <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={formData.discharge_destination}
                                  onChange={(e) => setFormData({ ...formData, discharge_destination: e.target.value })}
                                  className={`form-input ${errors.discharge_destination ? 'border-red-300' : ''}`}
                                  placeholder="輸入轉入機構名稱"
                                  required
                                />
                                {errors.discharge_destination && (
                                  <p className="text-red-500 text-sm mt-1">{errors.discharge_destination}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>處理中...</span>
                </div>
              ) : (
                episode ? '更新住院事件' : '新增住院事件'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HospitalEpisodeModal;