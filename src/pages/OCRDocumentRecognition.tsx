import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, Loader, CheckCircle, AlertTriangle, RefreshCw, Save, RotateCcw, ChevronDown, ChevronUp, User, FileText, Syringe, CalendarCheck, Shield, Pill } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { processImageAndExtract, validateImageFile } from '../utils/ocrProcessor';
import { getPromptTemplates, getUserActivePrompt, saveUserPrompt, getDefaultPrompt, type PromptTemplate } from '../utils/promptManager';
import VaccinationRecordModal from '../components/VaccinationRecordModal';
import FollowUpModal from '../components/FollowUpModal';
import DiagnosisRecordModal from '../components/DiagnosisRecordModal';
import PrescriptionModal from '../components/PrescriptionModal';

type DocumentType = 'vaccination' | 'followup' | 'allergy' | 'diagnosis' | 'prescription' | 'unknown';

interface PatientMatch {
  patient: any;
  matchedFields: string[];
  confidence: number;
}

interface DocumentClassification {
  type: DocumentType;
  confidence: number;
  extractedData: any;
}

const OCRDocumentRecognition: React.FC = () => {
  const { patients } = usePatients();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // 階段性結果
  const [patientMatches, setPatientMatches] = useState<PatientMatch[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [documentClassification, setDocumentClassification] = useState<DocumentClassification | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);

  // 模態框控制
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [showManualTypeSelector, setShowManualTypeSelector] = useState(false);

  useEffect(() => {
    loadPromptData();
  }, []);

  const loadPromptData = async () => {
    const templates = await getPromptTemplates();
    setPromptTemplates(templates);

    if (templates.length > 0) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
    }

    const userPrompt = await getUserActivePrompt();
    if (userPrompt) {
      setPrompt(userPrompt);
    } else {
      const defaultPrompt = await getDefaultPrompt();
      setPrompt(defaultPrompt);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = promptTemplates.find(t => t.id === templateId);
    if (template) {
      setPrompt(template.prompt_content);
    }
  };

  const handleSavePrompt = async () => {
    const success = await saveUserPrompt(prompt);
    if (success) {
      alert('Prompt已儲存為您的預設設定');
    } else {
      alert('儲存Prompt失敗，請重試');
    }
  };

  const handleRestoreDefault = async () => {
    const defaultPrompt = await getDefaultPrompt();
    setPrompt(defaultPrompt);
    const defaultTemplate = promptTemplates.find(t => t.is_default);
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      alert('無法讀取圖片檔案');
      setSelectedFile(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      alert('無法讀取圖片檔案');
      setSelectedFile(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setPatientMatches([]);
    setSelectedPatient(null);
    setDocumentClassification(null);
    setOcrText('');
    const fileInput = document.getElementById('ocr-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const findMatchingPatients = (extractedData: any, documentType?: DocumentType): PatientMatch[] => {
    const matches: PatientMatch[] = [];
    const isPrescription = documentType === 'prescription';

    patients.forEach(patient => {
      const matchedFields: string[] = [];
      let score = 0;

      // 中文姓名匹配
      if (extractedData.中文姓名 || extractedData.院友姓名) {
        const nameToMatch = (extractedData.中文姓名 || extractedData.院友姓名).trim();
        const patientFullName = `${patient.中文姓氏}${patient.中文名字}`.trim();
        if (patientFullName === nameToMatch || patientFullName.includes(nameToMatch) || nameToMatch.includes(patientFullName)) {
          matchedFields.push('中文姓名');
          score += 40;
        }
      }

      // 英文姓名匹配
      if (extractedData.英文姓名 || extractedData.English_Name) {
        const englishName = (extractedData.英文姓名 || extractedData.English_Name).toLowerCase().trim();
        const patientEnglishName = `${patient.英文姓氏 || ''} ${patient.英文名字 || ''}`.toLowerCase().trim();
        if (patientEnglishName && (patientEnglishName === englishName || patientEnglishName.includes(englishName) || englishName.includes(patientEnglishName))) {
          matchedFields.push('英文姓名');
          score += 35;
        }
      }

      // 身份證號碼匹配
      if (extractedData.身份證號碼 || extractedData.HKID) {
        const idToMatch = (extractedData.身份證號碼 || extractedData.HKID).replace(/\s+/g, '').toUpperCase();
        const patientId = patient.身份證號碼?.replace(/\s+/g, '').toUpperCase();
        if (patientId && patientId === idToMatch) {
          matchedFields.push('身份證號碼');
          score += 50;
        }
      }

      // 出生日期匹配
      if (extractedData.出生日期 || extractedData.Birth_Date) {
        const birthDate = extractedData.出生日期 || extractedData.Birth_Date;
        if (patient.出生日期 && patient.出生日期 === birthDate) {
          matchedFields.push('出生日期');
          score += 30;
        }
      }

      // 年齡匹配（模糊匹配，±1歲）
      if (extractedData.年齡 || extractedData.Age) {
        const age = parseInt(extractedData.年齡 || extractedData.Age);
        if (!isNaN(age) && patient.出生日期) {
          const patientAge = new Date().getFullYear() - new Date(patient.出生日期).getFullYear();
          if (Math.abs(patientAge - age) <= 1) {
            matchedFields.push('年齡');
            score += 15;
          }
        }
      }

      // 處方類型：只需1個線索（通常只有姓名），其他類型需要2個線索
      const minMatchRequired = isPrescription ? 1 : 2;
      if (matchedFields.length >= minMatchRequired) {
        // 如果是處方且只有姓名匹配，降低信心度
        let finalConfidence = Math.min(score, 100);
        if (isPrescription && matchedFields.length === 1 && matchedFields[0] === '中文姓名') {
          finalConfidence = Math.min(finalConfidence, 65);
        }

        matches.push({
          patient,
          matchedFields,
          confidence: finalConfidence
        });
      }
    });

    // 按信心度排序
    return matches.sort((a, b) => b.confidence - a.confidence);
  };

  const classifyDocument = (extractedData: any, ocrText: string): DocumentClassification => {
    let maxScore = 0;
    let bestType: DocumentType = 'unknown';
    const scores: Record<DocumentType, number> = {
      vaccination: 0,
      followup: 0,
      allergy: 0,
      diagnosis: 0,
      prescription: 0,
      unknown: 0
    };

    const lowerText = ocrText.toLowerCase();
    const hasData = (field: string) => extractedData[field] !== undefined && extractedData[field] !== null && extractedData[field] !== '';

    // 疫苗記錄特徵
    if (lowerText.includes('vaccine') || lowerText.includes('vaccination') || lowerText.includes('immunization') ||
        lowerText.includes('疫苗') || lowerText.includes('注射') || hasData('疫苗名稱') || hasData('vaccine_item')) {
      scores.vaccination += 40;
    }
    if (hasData('注射日期') || hasData('vaccination_date')) {
      scores.vaccination += 30;
    }
    if (hasData('注射單位') || hasData('vaccination_unit')) {
      scores.vaccination += 20;
    }

    // 覆診資料特徵
    if (lowerText.includes('appointment') || lowerText.includes('follow') || lowerText.includes('覆診') ||
        lowerText.includes('門診') || lowerText.includes('專科') || hasData('覆診日期')) {
      scores.followup += 40;
    }
    if (hasData('覆診地點') || hasData('醫院') || hasData('診所')) {
      scores.followup += 30;
    }
    if (hasData('覆診時間') || hasData('專科')) {
      scores.followup += 20;
    }

    // 藥物敏感特徵
    if (lowerText.includes('allergy') || lowerText.includes('adverse') || lowerText.includes('reaction') ||
        lowerText.includes('敏感') || lowerText.includes('過敏') || lowerText.includes('不良反應')) {
      scores.allergy += 60;
    }
    if (hasData('藥物敏感') || hasData('allergies')) {
      scores.allergy += 30;
    }

    // 診斷記錄特徵
    if (lowerText.includes('diagnosis') || lowerText.includes('diagnosed') || lowerText.includes('condition') ||
        lowerText.includes('診斷') || hasData('診斷項目') || hasData('diagnosis_item')) {
      scores.diagnosis += 50;
    }
    if (hasData('診斷日期') || hasData('diagnosis_date')) {
      scores.diagnosis += 30;
    }

    // 處方特徵
    if (hasData('藥物名稱') || hasData('medication_name') || hasData('藥物')) {
      scores.prescription += 40;
    }
    if (hasData('劑量') || hasData('dosage') || hasData('服用次數') || hasData('頻率')) {
      scores.prescription += 30;
    }
    if (hasData('處方日期') || hasData('prescription_date') || lowerText.includes('prescription')) {
      scores.prescription += 20;
    }

    // 找出最高分
    Object.entries(scores).forEach(([type, score]) => {
      if (score > maxScore) {
        maxScore = score;
        bestType = type as DocumentType;
      }
    });

    // 信心度閾值
    const confidence = maxScore > 50 ? Math.min(maxScore, 100) : 0;

    return {
      type: bestType,
      confidence,
      extractedData
    };
  };

  const handleStartOCR = async () => {
    if (!selectedFile) {
      alert('請先選擇圖片');
      return;
    }

    if (!prompt.trim()) {
      alert('請輸入或選擇Prompt');
      return;
    }

    setIsProcessing(true);
    setPatientMatches([]);
    setSelectedPatient(null);
    setDocumentClassification(null);
    setOcrText('');

    try {
      setProcessingStage('正在壓縮圖片...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setProcessingStage('正在識別文字...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setProcessingStage('正在擷取資料...');
      const result = await processImageAndExtract(selectedFile, prompt);

      if (result.success && result.extractedData && result.text) {
        setOcrText(result.text);

        // 階段1: 先分類文件類型
        setProcessingStage('正在分類文件類型...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const classification = classifyDocument(result.extractedData, result.text);
        setDocumentClassification(classification);

        // 階段2: 根據文件類型匹配院友（處方只需姓名匹配）
        setProcessingStage('正在匹配院友資料...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const matches = findMatchingPatients(result.extractedData, classification.type);
        setPatientMatches(matches);

        if (matches.length > 0) {
          setSelectedPatient(matches[0].patient);
        }

        setIsProcessing(false);
        setProcessingStage('');

        // 階段3: 自動開啟模態框（延遲500ms讓用戶看到結果）
        if (matches.length > 0 && classification.type !== 'unknown' && classification.type !== 'allergy') {
          await new Promise(resolve => setTimeout(resolve, 500));
          handleOpenModalWithType(classification.type, matches[0].patient, result.extractedData);
        }
      } else {
        setIsProcessing(false);
        setProcessingStage('');
        alert(result.error || 'OCR識別失敗');
      }
    } catch (error: any) {
      setIsProcessing(false);
      setProcessingStage('');
      alert(error.message || '處理過程發生錯誤');
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
  };

  const handleOpenModalWithType = (type: DocumentType, patient: any, extractedData: any) => {
    const data = {
      patient_id: patient.院友id,
      院友id: patient.院友id,
      ...extractedData
    };
    setPrefilledData(data);

    switch (type) {
      case 'vaccination':
        setShowVaccinationModal(true);
        break;
      case 'followup':
        setShowFollowUpModal(true);
        break;
      case 'diagnosis':
        setShowDiagnosisModal(true);
        break;
      case 'prescription':
        setShowPrescriptionModal(true);
        break;
      case 'allergy':
        alert('藥物敏感資料需要在院友資料頁面手動更新');
        break;
      default:
        alert('無法判斷文件類型，請手動選擇');
    }
  };

  const handleOpenModal = () => {
    if (!selectedPatient) {
      alert('請先選擇院友');
      return;
    }

    if (!documentClassification) {
      alert('尚未分類文件類型');
      return;
    }

    handleOpenModalWithType(documentClassification.type, selectedPatient, documentClassification.extractedData);
  };

  const handleManualSelectType = (type: DocumentType) => {
    if (!selectedPatient) {
      alert('請先選擇院友');
      return;
    }

    if (!documentClassification) {
      alert('尚未識別資料');
      return;
    }

    handleOpenModalWithType(type, selectedPatient, documentClassification.extractedData);
  };

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      vaccination: '疫苗注射記錄',
      followup: '覆診資料',
      allergy: '藥物敏感資料',
      diagnosis: '診斷記錄',
      prescription: '藥物處方',
      unknown: '未知類型'
    };
    return labels[type];
  };

  const getDocumentTypeIcon = (type: DocumentType) => {
    const icons: Record<DocumentType, any> = {
      vaccination: Syringe,
      followup: CalendarCheck,
      allergy: Shield,
      diagnosis: FileText,
      prescription: Pill,
      unknown: AlertTriangle
    };
    return icons[type];
  };

  const getDocumentTypeColor = (type: DocumentType): string => {
    const colors: Record<DocumentType, string> = {
      vaccination: 'bg-green-50 border-green-300 text-green-800',
      followup: 'bg-blue-50 border-blue-300 text-blue-800',
      allergy: 'bg-orange-50 border-orange-300 text-orange-800',
      diagnosis: 'bg-purple-50 border-purple-300 text-purple-800',
      prescription: 'bg-pink-50 border-pink-300 text-pink-800',
      unknown: 'bg-gray-50 border-gray-300 text-gray-800'
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 bg-white z-30 py-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OCR 智能文件識別</h1>
            <p className="text-sm text-gray-600 mt-1">上傳文件圖片，自動識別院友資料並分類文件類型</p>
          </div>
        </div>
      </div>

      {/* 上傳區域 */}
      <div className="card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：圖片上傳 */}
          <div className="space-y-4">
            <div>
              <label className="form-label flex items-center space-x-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span>圖片上傳</span>
                {selectedFile && (
                  <span className="text-xs text-green-600">✓ 已選擇檔案</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="ocr-file-input"
                  disabled={isProcessing}
                />
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!imagePreview) {
                      document.getElementById('ocr-file-input')?.click();
                    }
                  }}
                  className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors ${
                    imagePreview
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50 cursor-pointer'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full p-2">
                      <img
                        src={imagePreview}
                        alt="預覽"
                        className="w-full h-full object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearImage();
                        }}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 mb-2">點擊選擇或拖放圖片</p>
                      <p className="text-xs text-gray-500 mb-3">支援 JPG、PNG、WEBP 格式</p>
                      <div className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                        選擇檔案
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {selectedFile && (
                <p className="text-xs text-gray-600 mt-2">
                  檔案: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleStartOCR}
              disabled={!selectedFile || isProcessing || !prompt.trim()}
              className="btn-primary w-full flex items-center justify-center space-x-2 py-3"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>{processingStage}</span>
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  <span>開始識別</span>
                </>
              )}
            </button>
          </div>

          {/* 右側：Prompt 編輯 */}
          <div className="space-y-4">
            <div>
              <button
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="form-label flex items-center justify-between w-full hover:text-blue-600 transition-colors"
              >
                <span>AI 識別指令 (Prompt)</span>
                {showPromptEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showPromptEditor && (
                <div className="space-y-3 mt-2">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Prompt模板</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="form-input text-sm"
                      disabled={isProcessing}
                    >
                      <option value="">選擇模板...</option>
                      {promptTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.is_default ? '(預設)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="form-input font-mono text-xs"
                    rows={10}
                    placeholder="輸入AI識別指令..."
                    disabled={isProcessing}
                  />

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      自訂prompt可提高識別準確度
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleRestoreDefault}
                        className="text-xs text-gray-600 hover:text-gray-800 flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100"
                        disabled={isProcessing}
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>恢復預設</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePrompt}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 px-2 py-1 rounded hover:bg-blue-50"
                        disabled={isProcessing}
                      >
                        <Save className="h-3 w-3" />
                        <span>儲存為預設</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!showPromptEditor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">使用提示：</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>請確保圖片清晰，文字可辨識</li>
                      <li>系統會自動識別院友並分類文件類型</li>
                      <li>一般需匹配至少 2 個院友線索（處方標籤例外：只需姓名）</li>
                      <li>識別後會自動開啟對應功能模組填入資料</li>
                      <li>如 AI 判斷錯誤，可手動選擇正確的文件類型</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 識別結果 */}
      {(patientMatches.length > 0 || documentClassification) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 院友匹配結果 */}
          {patientMatches.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span>院友匹配結果</span>
                <span className="text-sm font-normal text-gray-500">({patientMatches.length} 位)</span>
              </h3>

              <div className="space-y-3">
                {patientMatches.map((match, index) => (
                  <div
                    key={match.patient.院友id}
                    onClick={() => handleSelectPatient(match.patient)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPatient?.院友id === match.patient.院友id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                          {match.patient.院友相片 ? (
                            <img
                              src={match.patient.院友相片}
                              alt={match.patient.中文姓名}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {match.patient.中文姓氏}{match.patient.中文名字}
                          </p>
                          <p className="text-sm text-gray-600">床號: {match.patient.床號}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          match.confidence >= 80 ? 'bg-green-100 text-green-800' :
                          match.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {match.confidence}% 信心度
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {match.matchedFields.map(field => (
                        <span key={field} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {field}
                        </span>
                      ))}
                      {documentClassification?.type === 'prescription' && match.matchedFields.length === 1 && match.matchedFields[0] === '中文姓名' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          僅姓名匹配（處方標籤）
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文件分類結果 */}
          {documentClassification && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>文件分類結果</span>
              </h3>

              <div className={`p-4 border-2 rounded-lg ${getDocumentTypeColor(documentClassification.type)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getDocumentTypeIcon(documentClassification.type), { className: 'h-6 w-6' })}
                    <span className="text-lg font-medium">{getDocumentTypeLabel(documentClassification.type)}</span>
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    documentClassification.confidence >= 70 ? 'bg-green-100 text-green-800' :
                    documentClassification.confidence >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {documentClassification.confidence}% 信心度
                  </div>
                </div>

                {documentClassification.type !== 'unknown' && selectedPatient && (
                  <button
                    onClick={handleOpenModal}
                    className="btn-primary w-full mt-3 flex items-center justify-center space-x-2"
                  >
                    <span>開啟 {getDocumentTypeLabel(documentClassification.type)} 模態框</span>
                    <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                  </button>
                )}

                {documentClassification.type === 'unknown' && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>無法判斷文件類型，建議：</p>
                    <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                      <li>檢查圖片是否清晰</li>
                      <li>調整 Prompt 內容</li>
                      <li>手動選擇功能模組輸入</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* 手動選擇文件類型 */}
              <div className="mt-4">
                <button
                  onClick={() => setShowManualTypeSelector(!showManualTypeSelector)}
                  className="w-full text-sm text-gray-700 hover:text-blue-600 flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>AI 判斷錯誤？手動選擇正確的文件類型</span>
                  </span>
                  {showManualTypeSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showManualTypeSelector && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleManualSelectType('vaccination')}
                      disabled={!selectedPatient}
                      className="flex items-center space-x-2 p-3 border-2 border-green-300 bg-green-50 text-green-800 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Syringe className="h-5 w-5" />
                      <span className="text-sm font-medium">疫苗注射記錄</span>
                    </button>

                    <button
                      onClick={() => handleManualSelectType('followup')}
                      disabled={!selectedPatient}
                      className="flex items-center space-x-2 p-3 border-2 border-blue-300 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CalendarCheck className="h-5 w-5" />
                      <span className="text-sm font-medium">覆診資料</span>
                    </button>

                    <button
                      onClick={() => handleManualSelectType('diagnosis')}
                      disabled={!selectedPatient}
                      className="flex items-center space-x-2 p-3 border-2 border-purple-300 bg-purple-50 text-purple-800 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-sm font-medium">診斷記錄</span>
                    </button>

                    <button
                      onClick={() => handleManualSelectType('prescription')}
                      disabled={!selectedPatient}
                      className="flex items-center space-x-2 p-3 border-2 border-pink-300 bg-pink-50 text-pink-800 rounded-lg hover:bg-pink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pill className="h-5 w-5" />
                      <span className="text-sm font-medium">藥物處方</span>
                    </button>

                    <button
                      onClick={() => {
                        alert('藥物敏感資料請在院友資料頁面手動更新');
                      }}
                      disabled={!selectedPatient}
                      className="flex items-center space-x-2 p-3 border-2 border-orange-300 bg-orange-50 text-orange-800 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                    >
                      <Shield className="h-5 w-5" />
                      <span className="text-sm font-medium">藥物敏感資料</span>
                    </button>

                    {!selectedPatient && (
                      <div className="col-span-2 text-xs text-center text-gray-500 py-2">
                        請先選擇院友才能開啟功能模組
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 重新識別按鈕 */}
              <div className="mt-3">
                <button
                  onClick={handleStartOCR}
                  disabled={isProcessing || !selectedFile}
                  className="w-full text-sm text-gray-600 hover:text-blue-600 flex items-center justify-center space-x-2 p-2 border border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>重新識別（可先修改 Prompt）</span>
                </button>
              </div>

              {ocrText && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <span>{showRawText ? '隱藏' : '顯示'}原始識別文字</span>
                    {showRawText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showRawText && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                      {ocrText}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 模態框 */}
      {showVaccinationModal && selectedPatient && (
        <VaccinationRecordModal
          patientId={selectedPatient.院友id}
          existingRecords={[]}
          onClose={() => {
            setShowVaccinationModal(false);
            setPrefilledData(null);
          }}
        />
      )}

      {showFollowUpModal && selectedPatient && prefilledData && (
        <FollowUpModal
          appointment={prefilledData}
          onClose={() => {
            setShowFollowUpModal(false);
            setPrefilledData(null);
          }}
        />
      )}

      {showDiagnosisModal && selectedPatient && (
        <DiagnosisRecordModal
          patientId={selectedPatient.院友id}
          existingRecords={[]}
          onClose={() => {
            setShowDiagnosisModal(false);
            setPrefilledData(null);
          }}
        />
      )}

      {showPrescriptionModal && selectedPatient && prefilledData && (
        <PrescriptionModal
          prescription={prefilledData}
          onClose={() => {
            setShowPrescriptionModal(false);
            setPrefilledData(null);
          }}
        />
      )}
    </div>
  );
};

export default OCRDocumentRecognition;
