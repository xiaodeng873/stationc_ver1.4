import React, { useState } from 'react';
import { X, Utensils, Calendar, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface Patient {
  院友id: string;
  中文姓名: string;
  床號: string;
  中文姓氏?: string;
  中文名字?: string;
}

interface MissingTask {
  patient: Patient;
  missingTaskTypes: string[];
}

interface MissingDeathDate {
  patient: Patient;
  missingInfo: string;
}

interface MissingRequirementsCardProps {
  missingTasks: MissingTask[];
  missingMealGuidance: Patient[];
  missingDeathDate: MissingDeathDate[];
  onCreateTask: (patient: Patient, taskType: '年度體檢' | '生命表徵') => void;
  onAddMealGuidance: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
}

const MissingRequirementsCard: React.FC<MissingRequirementsCardProps> = ({
  missingTasks,
  missingMealGuidance,
  missingDeathDate,
  onCreateTask,
  onAddMealGuidance,
  onEditPatient,
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    tasks: boolean;
    meal: boolean;
    death: boolean;
  }>({
    tasks: true,
    meal: true,
    death: true,
  });

  const toggleSection = (section: 'tasks' | 'meal' | 'death') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const totalMissing = missingTasks.length + missingMealGuidance.length + missingDeathDate.length;

  if (totalMissing === 0) return null;

  return (
    <div className="lg:col-span-5 mb-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">欠缺必要項目</h2>
              <p className="text-sm text-gray-600">
                共 {totalMissing} 項需要處理
                {missingTasks.length > 0 && ` · ${missingTasks.length} 位院友欠缺任務`}
                {missingMealGuidance.length > 0 && ` · ${missingMealGuidance.length} 位院友欠缺餐膳指引`}
                {missingDeathDate.length > 0 && ` · ${missingDeathDate.length} 位院友欠缺死亡日期`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* 欠缺必要任務 */}
          {missingTasks.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('tasks')}
                className="w-full bg-red-50 px-4 py-3 flex items-center justify-between hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <X className="h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-red-900">
                      欠缺必要任務
                    </h3>
                    <p className="text-xs text-red-700">
                      {missingTasks.length} 位院友欠缺年度體檢或生命表徵任務
                    </p>
                  </div>
                </div>
                {expandedSections.tasks ? (
                  <ChevronUp className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                )}
              </button>

              {expandedSections.tasks && (
                <div className="bg-white p-3 space-y-2">
                  {missingTasks.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 hover:bg-red-50 rounded transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-red-800">
                          {item.patient.床號} {item.patient.中文姓氏}{item.patient.中文名字}
                        </span>
                        <span className="text-red-600">
                          欠缺: {item.missingTaskTypes.join(', ')}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        {item.missingTaskTypes.map(taskType => (
                          <button
                            key={taskType}
                            onClick={() => onCreateTask(item.patient, taskType as '年度體檢' | '生命表徵')}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                            title={`新增${taskType}任務`}
                          >
                            +{taskType}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {missingTasks.length > 5 && (
                    <div className="text-xs text-red-600 text-center pt-2">
                      還有 {missingTasks.length - 5} 位院友...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 欠缺餐膳指引 */}
          {missingMealGuidance.length > 0 && (
            <div className="border border-orange-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('meal')}
                className="w-full bg-orange-50 px-4 py-3 flex items-center justify-between hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Utensils className="h-5 w-5 text-orange-600" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-orange-900">
                      欠缺餐膳指引
                    </h3>
                    <p className="text-xs text-orange-700">
                      {missingMealGuidance.length} 位院友尚未設定餐膳指引
                    </p>
                  </div>
                </div>
                {expandedSections.meal ? (
                  <ChevronUp className="h-5 w-5 text-orange-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-orange-600" />
                )}
              </button>

              {expandedSections.meal && (
                <div className="bg-white p-3 space-y-2">
                  {missingMealGuidance.slice(0, 5).map((patient, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 hover:bg-orange-50 rounded transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-orange-800">
                          {patient.床號} {patient.中文姓氏}{patient.中文名字}
                        </span>
                        <span className="text-orange-600">
                          尚未設定餐膳指引
                        </span>
                      </div>
                      <button
                        onClick={() => onAddMealGuidance(patient)}
                        className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors flex items-center space-x-1"
                        title="新增餐膳指引"
                      >
                        <span>+餐膳指引</span>
                      </button>
                    </div>
                  ))}
                  {missingMealGuidance.length > 5 && (
                    <div className="text-xs text-orange-600 text-center pt-2">
                      還有 {missingMealGuidance.length - 5} 位院友...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 欠缺死亡日期 */}
          {missingDeathDate.length > 0 && (
            <div className="border border-purple-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('death')}
                className="w-full bg-purple-50 px-4 py-3 flex items-center justify-between hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-purple-900">
                      欠缺死亡日期
                    </h3>
                    <p className="text-xs text-purple-700">
                      {missingDeathDate.length} 位院友退住原因為死亡但未記錄死亡日期
                    </p>
                  </div>
                </div>
                {expandedSections.death ? (
                  <ChevronUp className="h-5 w-5 text-purple-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-purple-600" />
                )}
              </button>

              {expandedSections.death && (
                <div className="bg-white p-3 space-y-2">
                  {missingDeathDate.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 hover:bg-purple-50 rounded transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-purple-800">
                          {item.patient.床號} {item.patient.中文姓氏}{item.patient.中文名字}
                        </span>
                        <span className="text-purple-600">
                          需補充{item.missingInfo}
                        </span>
                      </div>
                      <button
                        onClick={() => onEditPatient(item.patient)}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors flex items-center space-x-1"
                        title="補充死亡日期"
                      >
                        <span>補充資料</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {missingDeathDate.length > 5 && (
                    <div className="text-xs text-purple-600 text-center pt-2">
                      還有 {missingDeathDate.length - 5} 位院友...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            💡 提示：每位在住院友都應該有年度體檢、生命表徵任務和餐膳指引。已退住院友若因死亡離世，請確保已記錄死亡日期。
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissingRequirementsCard;
