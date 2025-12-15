import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { generateMonitoringTaskWorksheet } from '../utils/monitoringTaskWorksheetGenerator';

interface MonitoringTaskWorksheetModalProps {
  onClose: () => void;
}

const MonitoringTaskWorksheetModal: React.FC<MonitoringTaskWorksheetModalProps> = ({ onClose }) => {
  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return hongKongTime.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getHongKongDate());
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDateRange = () => {
    const start = new Date(startDate);
    const dates = [];

    for (let i = 0; i < 4; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
      dates.push(`${date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}（${weekday}）`);
    }

    return dates;
  };

  const getFileName = () => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 3);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    };

    return `監測任務工作紙_${formatDate(start)}-${formatDate(end).slice(4)}.pdf`;
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const date = new Date(startDate);
      await generateMonitoringTaskWorksheet(date);
    } catch (error) {
      console.error('生成工作紙失敗:', error);
      alert('生成工作紙失敗，請重試');
    } finally {
      setIsGenerating(false);
    }
  };

  const dates = formatDateRange();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">匯出監測任務工作紙</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇起始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">預設為今天</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              將匯出連續4天的工作紙：
            </p>
            <ul className="space-y-1 text-sm text-gray-700">
              {dates.map((date, index) => (
                <li key={index}>• {date}</li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">
              檔案名稱：
            </p>
            <p className="text-sm text-gray-700 font-mono">{getFileName()}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">說明：</p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• 僅包含當天應做的監測任務</li>
              <li>• 不包括逾期應做未做的任務</li>
              <li>• 宵夜時段只在有任務時顯示</li>
              <li>• 生成後會開啟打印預覽窗口</li>
              <li>• 可選擇打印或另存為 PDF</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isGenerating}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>生成中...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>確認匯出</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringTaskWorksheetModal;
