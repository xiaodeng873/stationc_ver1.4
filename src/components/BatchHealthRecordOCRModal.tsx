import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Loader, CheckCircle, AlertTriangle, Save, RotateCcw, Trash2, Edit2 } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { processImageAndExtract, validateImageFile } from '../utils/ocrProcessor';
import { supabase } from '../lib/supabase';

interface BatchHealthRecordOCRModalProps {
  onClose: () => void;
}

interface ExtractedRecord {
  id: string;
  imageFile: File;
  imagePreview: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  rawData?: any;
  parsedRecords?: ParsedHealthRecord[];
}

interface ParsedHealthRecord {
  tempId: string;
  院友id: number | null;
  院友姓名: string;
  床號: string;
  記錄類型: '生命表徵' | '血糖控制' | '體重控制';
  記錄日期: string;
  記錄時間: string;
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  呼吸頻率?: number;
  血糖值?: number;
  體重?: number;
  備註?: string;
  task_id?: string | null;
  matchedPatient?: any;
  matchedTask?: any;
  區域?: string;
}

const DEFAULT_PROMPT = `你是醫療記錄數據提取專家。請從手寫健康記錄表圖片中提取所有院友的健康監測數據。

**時間標記解析規則：**
- 7A 或 7a → 07:00
- 12N 或 12n → 12:00
- 4P 或 4p → 16:00
- 其他時間直接轉換為 HH:MM 格式

**提取規則：**
1. 識別所有院友的床號和姓名
2. 提取每位院友的監測數據（生命表徵、血糖、體重）
3. 每位院友的每個時間點都是一條獨立記錄
4. 如果某個數值缺失或無法辨識，設為null
5. 記錄日期從表格標題提取（格式：YYYY-MM-DD）

**返回JSON格式：**
{
  "記錄日期": "2025-01-15",
  "records": [
    {
      "床號": "A01",
      "院友姓名": "陳大文",
      "記錄時間": "07:00",
      "記錄類型": "生命表徵",
      "血壓收縮壓": 120,
      "血壓舒張壓": 80,
      "脈搏": 72,
      "體溫": 36.5,
      "血含氧量": 98,
      "呼吸頻率": 18,
      "備註": ""
    },
    {
      "床號": "A01",
      "院友姓名": "陳大文",
      "記錄時間": "12:00",
      "血糖值": 5.5,
      "記錄類型": "血糖控制"
    }
  ]
}

請確保所有數值都是數字類型，時間都轉換為標準格式。`;

const BatchHealthRecordOCRModal: React.FC<BatchHealthRecordOCRModalProps> = ({ onClose }) => {
  const { patients, patientHealthTasks, healthRecords, addHealthRecord } = usePatients();
  const { displayName } = useAuth();

  const [images, setImages] = useState<ExtractedRecord[]>([]);
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [allParsedRecords, setAllParsedRecords] = useState<ParsedHealthRecord[]>([]);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserPrompt();
  }, []);

  const loadUserPrompt = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_ocr_prompts')
        .select('batch_health_record_prompt')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data?.batch_health_record_prompt) {
        setPrompt(data.batch_health_record_prompt);
      }
    } catch (error) {
      console.error('載入Prompt失敗:', error);
    }
  };

  const saveUserPrompt = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_ocr_prompts')
        .update({ is_active: false })
        .eq('user_id', user.id);

      await supabase
        .from('user_ocr_prompts')
        .insert({
          user_id: user.id,
          prompt_content: '',
          batch_health_record_prompt: prompt,
          is_active: true
        });

      alert('Prompt已儲存');
    } catch (error) {
      console.error('儲存Prompt失敗:', error);
      alert('儲存失敗');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => validateImageFile(file).valid);

    const newImages: ExtractedRecord[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const parseTimeMarker = (timeStr: string): string => {
    const time = timeStr.trim().toLowerCase();

    if (time.match(/^7[ap]?$/i)) return '07:00';
    if (time.match(/^12[np]?$/i)) return '12:00';
    if (time.match(/^4p?$/i)) return '16:00';

    const match = time.match(/^(\d{1,2}):?(\d{2})?$/);
    if (match) {
      const hour = match[1].padStart(2, '0');
      const minute = match[2] || '00';
      return `${hour}:${minute}`;
    }

    return time;
  };

  const matchPatient = (床號: string, 院友姓名: string): any => {
    return patients.find(p =>
      p.床號 === 床號 ||
      p.中文姓名 === 院友姓名 ||
      (p.中文姓名 && 院友姓名 && p.中文姓名.includes(院友姓名))
    );
  };

  const matchTask = (patientId: number, recordType: string, recordDate: string, recordTime: string): any => {
    const patientTasks = patientHealthTasks.filter(t =>
      t.patient_id === patientId.toString() &&
      t.health_record_type === recordType
    );

    if (patientTasks.length === 0) return null;

    const targetDateTime = new Date(`${recordDate}T${recordTime}`);

    for (const task of patientTasks) {
      if (!task.specific_times || task.specific_times.length === 0) continue;

      for (const taskTime of task.specific_times) {
        const taskDateTime = new Date(`${recordDate}T${taskTime}`);
        const diffMinutes = Math.abs((targetDateTime.getTime() - taskDateTime.getTime()) / 60000);

        if (diffMinutes <= 30) {
          return { task, matchType: 'exact' };
        }
      }
    }

    for (const task of patientTasks) {
      if (!task.specific_times || task.specific_times.length === 0) continue;

      for (const taskTime of task.specific_times) {
        const taskDateTime = new Date(`${recordDate}T${taskTime}`);
        const diffMinutes = Math.abs((targetDateTime.getTime() - taskDateTime.getTime()) / 60000);

        if (diffMinutes <= 60) {
          return { task, matchType: 'fuzzy' };
        }
      }
    }

    return null;
  };

  const handleStartOCR = async () => {
    if (images.length === 0) {
      alert('請先上傳圖片');
      return;
    }

    setIsProcessing(true);
    const allRecords: ParsedHealthRecord[] = [];

    for (const image of images) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? { ...img, status: 'processing' } : img
      ));

      try {
        const result = await processImageAndExtract(image.imageFile, prompt);

        if (result.success && result.extractedData) {
          const { 記錄日期, records } = result.extractedData;

          if (!記錄日期 || !records || !Array.isArray(records)) {
            setImages(prev => prev.map(img =>
              img.id === image.id
                ? { ...img, status: 'error', error: 'AI返回的數據格式不正確，請檢查Prompt' }
                : img
            ));
            continue;
          }

          const parsedRecords: ParsedHealthRecord[] = records.map((record: any) => {
            const recordTime = parseTimeMarker(record.記錄時間);
            const matchedPatient = matchPatient(record.床號, record.院友姓名);

            let matchedTask = null;
            if (matchedPatient) {
              const taskMatch = matchTask(
                matchedPatient.院友id,
                record.記錄類型,
                記錄日期,
                recordTime
              );
              matchedTask = taskMatch?.task || null;
            }

            return {
              tempId: Math.random().toString(36).substr(2, 9),
              院友id: matchedPatient?.院友id || null,
              院友姓名: record.院友姓名,
              床號: record.床號,
              記錄類型: record.記錄類型,
              記錄日期,
              記錄時間: recordTime,
              血壓收縮壓: record.血壓收縮壓,
              血壓舒張壓: record.血壓舒張壓,
              脈搏: record.脈搏,
              體溫: record.體溫,
              血含氧量: record.血含氧量,
              呼吸頻率: record.呼吸頻率,
              血糖值: record.血糖值,
              體重: record.體重,
              備註: record.備註,
              task_id: matchedTask?.id || null,
              matchedPatient,
              matchedTask,
              區域: matchedPatient?.床號?.match(/^[A-Z]+/)?.[0] || '未知'
            };
          });

          allRecords.push(...parsedRecords);

          setImages(prev => prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'success', rawData: result.extractedData, parsedRecords }
              : img
          ));
        } else {
          const errorMsg = result.error || '識別失敗';
          console.error(`[BatchOCR] 圖片 ${image.imageFile.name} 識別失敗:`, errorMsg);
          setImages(prev => prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'error', error: errorMsg }
              : img
          ));
        }
      } catch (error: any) {
        const errorMsg = error.message || '處理過程發生錯誤';
        console.error(`[BatchOCR] 圖片 ${image.imageFile.name} 處理異常:`, error);
        setImages(prev => prev.map(img =>
          img.id === image.id
            ? { ...img, status: 'error', error: errorMsg }
            : img
        ));
      }
    }

    setAllParsedRecords(allRecords);
    setIsProcessing(false);
  };

  const updateRecord = (tempId: string, field: string, value: any) => {
    setAllParsedRecords(prev => prev.map(record =>
      record.tempId === tempId ? { ...record, [field]: value } : record
    ));
  };

  const deleteRecord = (tempId: string) => {
    setAllParsedRecords(prev => prev.filter(record => record.tempId !== tempId));
  };

  const handleBatchSave = async () => {
    if (allParsedRecords.length === 0) {
      alert('沒有可儲存的記錄');
      return;
    }

    const invalidRecords = allParsedRecords.filter(r => !r.院友id);
    if (invalidRecords.length > 0) {
      if (!confirm(`有 ${invalidRecords.length} 筆記錄無法匹配院友，是否跳過這些記錄並儲存其他記錄？`)) {
        return;
      }
    }

    setIsSaving(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const record of allParsedRecords) {
        if (!record.院友id) {
          errorCount++;
          continue;
        }

        const recordData = {
          院友id: record.院友id,
          task_id: record.task_id || null,
          記錄日期: record.記錄日期,
          記錄時間: record.記錄時間,
          記錄類型: record.記錄類型,
          血壓收縮壓: record.血壓收縮壓 || null,
          血壓舒張壓: record.血壓舒張壓 || null,
          脈搏: record.脈搏 || null,
          體溫: record.體溫 || null,
          血含氧量: record.血含氧量 || null,
          呼吸頻率: record.呼吸頻率 || null,
          血糖值: record.血糖值 || null,
          體重: record.體重 || null,
          備註: record.備註 || null,
          記錄人員: displayName || null,
        };

        try {
          await addHealthRecord(recordData);
          successCount++;
        } catch (error) {
          console.error('儲存記錄失敗:', error);
          errorCount++;
        }
      }

      alert(`批量儲存完成\n成功：${successCount} 筆\n失敗：${errorCount} 筆`);

      if (successCount > 0) {
        onClose();
      }
    } catch (error) {
      console.error('批量儲存失敗:', error);
      alert('批量儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const groupedRecords = allParsedRecords.reduce((acc, record) => {
    const area = record.區域 || '未知';
    if (!acc[area]) acc[area] = [];
    acc[area].push(record);
    return acc;
  }, {} as Record<string, ParsedHealthRecord[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Camera className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">批量健康記錄OCR上傳</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">使用說明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 上傳手寫健康記錄表照片（支援多張）</li>
              <li>• 系統自動識別所有院友的數據並匹配相關任務</li>
              <li>• 時間標記：7A→07:00, 12N→12:00, 4P→16:00</li>
              <li>• 可編輯Prompt以提高識別準確度</li>
              <li>• 結果按區域分組顯示，可逐條檢查和修改</li>
            </ul>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="batch-file-input"
            />
            <label
              htmlFor="batch-file-input"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-700 font-medium mb-1">點擊選擇或拖放圖片</p>
              <p className="text-sm text-gray-500">支援 JPG、PNG、WEBP 格式，可上傳多張</p>
            </label>
          </div>

          {images.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">已上傳圖片 ({images.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map(img => (
                  <div key={img.id} className="relative border rounded-lg overflow-hidden bg-white">
                    <img src={img.imagePreview} alt="" className="w-full h-32 object-cover" />
                    <div className="absolute top-2 right-2">
                      {img.status === 'pending' && (
                        <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded">待處理</div>
                      )}
                      {img.status === 'processing' && (
                        <Loader className="h-5 w-5 text-blue-600 animate-spin" />
                      )}
                      {img.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {img.status === 'error' && (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    {img.status === 'error' && img.error && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 bg-opacity-90 text-white text-xs p-2">
                        {img.error}
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute bottom-2 right-2 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-900">AI識別指令 (Prompt)</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPrompt(DEFAULT_PROMPT)}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>恢復預設</span>
                </button>
                <button
                  onClick={saveUserPrompt}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  disabled={isProcessing}
                >
                  <Save className="h-3 w-3" />
                  <span>儲存為預設</span>
                </button>
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>{showPromptEditor ? '收起' : '編輯'}</span>
                </button>
              </div>
            </div>
            {showPromptEditor && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="form-input font-mono text-sm w-full"
                rows={12}
                disabled={isProcessing}
              />
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleStartOCR}
              disabled={images.length === 0 || isProcessing}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>識別中...</span>
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  <span>開始批量識別</span>
                </>
              )}
            </button>
            <button
              onClick={handleBatchSave}
              disabled={allParsedRecords.length === 0 || isSaving}
              className="btn-primary flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>儲存中...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>批量儲存 ({allParsedRecords.length})</span>
                </>
              )}
            </button>
          </div>

          {Object.keys(groupedRecords).length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">識別結果（按區域分組）</h3>
              {Object.entries(groupedRecords).map(([area, records]) => (
                <div key={area} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-medium text-gray-700 flex items-center justify-between">
                    <span>{area}區 ({records.length} 筆)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">床號</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">姓名</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">時間</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">類型</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">數值</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">狀態</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(record => (
                          <tr key={record.tempId} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{record.床號}</td>
                            <td className="px-3 py-2">{record.院友姓名}</td>
                            <td className="px-3 py-2">{record.記錄日期}</td>
                            <td className="px-3 py-2">{record.記錄時間}</td>
                            <td className="px-3 py-2">
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                {record.記錄類型}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {record.記錄類型 === '生命表徵' && (
                                <div className="space-y-0.5">
                                  {record.血壓收縮壓 && <div>BP: {record.血壓收縮壓}/{record.血壓舒張壓}</div>}
                                  {record.脈搏 && <div>P: {record.脈搏}</div>}
                                  {record.體溫 && <div>T: {record.體溫}°C</div>}
                                  {record.血含氧量 && <div>SpO2: {record.血含氧量}%</div>}
                                </div>
                              )}
                              {record.記錄類型 === '血糖控制' && record.血糖值 && `${record.血糖值} mmol/L`}
                              {record.記錄類型 === '體重控制' && record.體重 && `${record.體重} kg`}
                            </td>
                            <td className="px-3 py-2">
                              {record.院友id ? (
                                <span className="text-green-600 text-xs flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  已匹配
                                </span>
                              ) : (
                                <span className="text-red-600 text-xs flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  未匹配
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => deleteRecord(record.tempId)}
                                className="text-red-600 hover:text-red-700"
                                title="刪除此記錄"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchHealthRecordOCRModal;
