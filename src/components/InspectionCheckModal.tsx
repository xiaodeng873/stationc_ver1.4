import React, { useState, useEffect } from 'react';
import { X, Activity, Droplets, Heart, Thermometer, Wind, Eye, AlertTriangle, CheckCircle, Plus, XCircle } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';

interface InspectionCheckModalProps {
  workflowRecord: any;
  onClose: () => void;
  onResult: (canDispense: boolean, failureReason?: string) => void;
}

const InspectionCheckModal: React.FC<InspectionCheckModalProps> = ({
  workflowRecord,
  onClose,
  onResult
}) => {
  const { 
    patients, 
    prescriptions, 
    checkPrescriptionInspectionRules, 
    fetchLatestVitalSigns,
    addHealthRecord 
  } = usePatients();
  const { displayName } = useAuth();

  const [latestVitalSigns, setLatestVitalSigns] = useState<any>(null);
  const [newVitalSignData, setNewVitalSignData] = useState<any>({});
  const [useNewData, setUseNewData] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasNoRulesAndHandled, setHasNoRulesAndHandled] = useState(false);

  const patient = patients.find(p => p.院友id === workflowRecord.patient_id);
  const prescription = prescriptions.find(p => p.id === workflowRecord.prescription_id);

  // 檢測項圖標映射
  const getVitalSignIcon = (type: string) => {
    switch (type) {
      case '上壓':
      case '下壓':
        return <Heart className="h-4 w-4" />;
      case '脈搏':
        return <Activity className="h-4 w-4" />;
      case '血糖值':
        return <Droplets className="h-4 w-4" />;
      case '呼吸':
        return <Wind className="h-4 w-4" />;
      case '血含氧量':
        return <Eye className="h-4 w-4" />;
      case '體溫':
        return <Thermometer className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // 載入最新監測記錄
  useEffect(() => {
    const loadLatestVitalSigns = async () => {
      // 如果沒有檢測規則，直接允許派藥
      if (!prescription?.inspection_rules || prescription.inspection_rules.length === 0) {
        if (!hasNoRulesAndHandled) {
          setHasNoRulesAndHandled(true);
          onResult(true);
        }
        setLoading(false);
        return;
      }

      try {
        const vitalSignTypes = prescription.inspection_rules.map((rule: any) => rule.vital_sign_type);
        const latestData: any = {};

        for (const type of vitalSignTypes) {
          const data = await fetchLatestVitalSigns(workflowRecord.patient_id, type);
          if (data) {
            latestData[type] = data;
          }
        }

        setLatestVitalSigns(latestData);
      } catch (error) {
        console.error('載入最新監測記錄失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLatestVitalSigns();
  }, [prescription, workflowRecord.patient_id, fetchLatestVitalSigns, hasNoRulesAndHandled, onResult]);

  // 處理沒有檢測規則的情況
  useEffect(() => {
    if (hasNoRulesAndHandled) {
      return;
    }
  }, [hasNoRulesAndHandled]);

  // 執行檢測檢查
  const performInspectionCheck = async () => {
    setIsChecking(true);

    try {
      let vitalSignDataToUse = null;

      // 如果用戶選擇使用新數據，先新增健康記錄
      if (useNewData && Object.keys(newVitalSignData).length > 0) {
        const healthRecord = {
          院友id: workflowRecord.patient_id,
          記錄日期: workflowRecord.scheduled_date,
          記錄時間: workflowRecord.scheduled_time,
          記錄類型: '生命表徵' as const,
          血壓收縮壓: newVitalSignData.上壓 ? parseInt(newVitalSignData.上壓) : null,
          血壓舒張壓: newVitalSignData.下壓 ? parseInt(newVitalSignData.下壓) : null,
          脈搏: newVitalSignData.脈搏 ? parseInt(newVitalSignData.脈搏) : null,
          體溫: newVitalSignData.體溫 ? parseFloat(newVitalSignData.體溫) : null,
          血含氧量: newVitalSignData.血含氧量 ? parseInt(newVitalSignData.血含氧量) : null,
          呼吸頻率: newVitalSignData.呼吸 ? parseInt(newVitalSignData.呼吸) : null,
          血糖值: newVitalSignData.血糖值 ? parseFloat(newVitalSignData.血糖值) : null,
          備註: '派藥前檢測',
          記錄人員: displayName || '系統'
        };

        await addHealthRecord(healthRecord);
        vitalSignDataToUse = newVitalSignData;
      }

      // 執行檢測規則檢查
      const result = await checkPrescriptionInspectionRules(
        workflowRecord.prescription_id,
        workflowRecord.patient_id,
        vitalSignDataToUse
      );

      setCheckResult(result);
    } catch (error) {
      console.error('檢測檢查失敗:', error);
      alert(`檢測檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsChecking(false);
    }
  };

  // 處理確認派藥
  const handleConfirmDispense = () => {
    if (checkResult?.canDispense) {
      onResult(true);
    } else {
      onResult(false, '檢測項條件不符');
    }
  };

  // 處理新數據輸入
  const handleNewDataChange = (vitalSignType: string, value: string) => {
    setNewVitalSignData(prev => ({
      ...prev,
      [vitalSignType]: value
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700">載入檢測數據中...</span>
        </div>
      </div>
    );
  }

  // 如果沒有檢測規則且已處理，不渲染模態框
  if (hasNoRulesAndHandled) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">派藥前檢測</h2>
                <p className="text-sm text-gray-600">
                  {patient?.中文姓氏}{patient?.中文名字} - {prescription?.medication_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isChecking}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 檢測規則顯示 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-orange-900 mb-3">此處方的檢測規則</h3>
            <div className="space-y-2">
              {prescription.inspection_rules.map((rule: any, index: number) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  {getVitalSignIcon(rule.vital_sign_type)}
                  <span className="font-medium">{rule.vital_sign_type}</span>
                  <span>
                    {rule.condition_operator === 'gt' ? '>' :
                     rule.condition_operator === 'lt' ? '<' :
                     rule.condition_operator === 'gte' ? '≥' :
                     rule.condition_operator === 'lte' ? '≤' : ''}
                  </span>
                  <span className="font-medium">{rule.condition_value}</span>
                  <span className="text-orange-700">
                    → {rule.action_if_met === 'block_dispensing' ? '阻止派藥' : '僅警告'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 最新監測記錄 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">最新監測記錄</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use-new-data"
                  checked={useNewData}
                  onChange={(e) => setUseNewData(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="use-new-data" className="text-sm text-gray-700">
                  輸入新的監測數據
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescription.inspection_rules.map((rule: any, index: number) => {
                const latestData = latestVitalSigns?.[rule.vital_sign_type];
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      {getVitalSignIcon(rule.vital_sign_type)}
                      <h4 className="font-medium text-gray-900">{rule.vital_sign_type}</h4>
                    </div>

                    {/* 最新記錄 */}
                    <div className="mb-3">
                      <label className="text-sm text-gray-600">最新記錄：</label>
                      {latestData ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {latestData[rule.vital_sign_type === '上壓' ? '血壓收縮壓' :
                                      rule.vital_sign_type === '下壓' ? '血壓舒張壓' :
                                      rule.vital_sign_type === '脈搏' ? '脈搏' :
                                      rule.vital_sign_type === '血糖值' ? '血糖值' :
                                      rule.vital_sign_type === '呼吸' ? '呼吸頻率' :
                                      rule.vital_sign_type === '血含氧量' ? '血含氧量' :
                                      rule.vital_sign_type === '體溫' ? '體溫' : '']}
                          </div>
                          <div className="text-gray-500">
                            {new Date(latestData.記錄日期).toLocaleDateString('zh-TW')} {latestData.記錄時間}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">無記錄</div>
                      )}
                    </div>

                    {/* 新數據輸入 */}
                    {useNewData && (
                      <div>
                        <label className="text-sm text-gray-600">新數據：</label>
                        <input
                          type="number"
                          value={newVitalSignData[rule.vital_sign_type] || ''}
                          onChange={(e) => handleNewDataChange(rule.vital_sign_type, e.target.value)}
                          className="form-input mt-1"
                          placeholder={`輸入${rule.vital_sign_type}數值`}
                          step={rule.vital_sign_type === '體溫' || rule.vital_sign_type === '血糖值' ? '0.1' : '1'}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 檢測結果 */}
          {checkResult && (
            <div className={`border rounded-lg p-4 ${
              checkResult.canDispense ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-3">
                {checkResult.canDispense ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <h3 className={`font-medium ${
                  checkResult.canDispense ? 'text-green-900' : 'text-red-900'
                }`}>
                  檢測結果
                </h3>
              </div>

              <div className={`text-sm ${
                checkResult.canDispense ? 'text-green-800' : 'text-red-800'
              }`}>
                {checkResult.canDispense ? (
                  <p>✅ 所有檢測項目均符合安全條件，可以派藥</p>
                ) : (
                  <div>
                    <p>❌ 以下檢測項目不符合安全條件：</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {checkResult.blockedRules?.map((rule: any, index: number) => (
                        <li key={index}>
                          {rule.vital_sign_type}: {rule.actualValue} {
                            rule.condition_operator === 'gt' ? '≤' :
                            rule.condition_operator === 'lt' ? '≥' :
                            rule.condition_operator === 'gte' ? '<' :
                            rule.condition_operator === 'lte' ? '>' : ''
                          } {rule.condition_value} (不符合 {
                            rule.condition_operator === 'gt' ? '>' :
                            rule.condition_operator === 'lt' ? '<' :
                            rule.condition_operator === 'gte' ? '≥' :
                            rule.condition_operator === 'lte' ? '≤' : ''
                          } {rule.condition_value} 的要求)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {checkResult.usedVitalSigns && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    使用的監測數據: {Object.entries(checkResult.usedVitalSigns).map(([type, value]) => 
                      `${type}: ${value}`
                    ).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            {!checkResult ? (
              <button
                onClick={performInspectionCheck}
                disabled={isChecking}
                className="btn-primary flex-1 flex items-center justify-center space-x-2"
              >
                {isChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>檢測中...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>執行檢測</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirmDispense}
                className={`flex-1 flex items-center justify-center space-x-2 ${
                  checkResult.canDispense ? 'btn-primary' : 'btn-danger'
                }`}
              >
                {checkResult.canDispense ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>確認派藥</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>無法派藥</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isChecking}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionCheckModal;