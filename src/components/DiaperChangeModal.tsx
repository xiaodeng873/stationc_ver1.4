import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DiaperChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    has_urine: boolean;
    has_stool: boolean;
    has_none: boolean;
    urine_amount?: string;
    stool_color?: string;
    stool_texture?: string;
    stool_amount?: string;
    recorder: string;
  }) => void;
  patientName: string;
  timeSlot: string;
  date: string;
  existingRecord?: any;
}

const DiaperChangeModal: React.FC<DiaperChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  patientName,
  timeSlot,
  date,
  existingRecord
}) => {
  const { displayName, user } = useAuth();
  const [hasUrine, setHasUrine] = useState(false);
  const [hasStool, setHasStool] = useState(false);
  const [hasNone, setHasNone] = useState(false);
  const [urineAmount, setUrineAmount] = useState('');
  const [stoolColor, setStoolColor] = useState('');
  const [stoolTexture, setStoolTexture] = useState('');
  const [stoolAmount, setStoolAmount] = useState('');
  const [recorder, setRecorder] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingRecord) {
        setHasUrine(existingRecord.has_urine);
        setHasStool(existingRecord.has_stool);
        setHasNone(existingRecord.has_none);
        setUrineAmount(existingRecord.urine_amount || '');
        setStoolColor(existingRecord.stool_color || '');
        setStoolTexture(existingRecord.stool_texture || '');
        setStoolAmount(existingRecord.stool_amount || '');
        setRecorder(existingRecord.recorder);
      } else {
        setHasUrine(false);
        setHasStool(false);
        setHasNone(false);
        setUrineAmount('');
        setStoolColor('');
        setStoolTexture('');
        setStoolAmount('');
        setRecorder(displayName || user?.email || '');
      }
    }
  }, [isOpen, existingRecord, displayName, user]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasUrine && !hasStool && !hasNone) {
      alert('請至少選擇一項排泄類型');
      return;
    }

    if (hasUrine && !urineAmount) {
      alert('請選擇小便量');
      return;
    }

    if (hasStool && (!stoolColor || !stoolTexture || !stoolAmount)) {
      alert('請完整填寫大便資訊（色、質、量）');
      return;
    }

    onConfirm({
      has_urine: hasUrine,
      has_stool: hasStool,
      has_none: hasNone,
      urine_amount: hasUrine ? urineAmount : undefined,
      stool_color: hasStool ? stoolColor : undefined,
      stool_texture: hasStool ? stoolTexture : undefined,
      stool_amount: hasStool ? stoolAmount : undefined,
      recorder
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">換片記錄</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                院友姓名
              </label>
              <input
                type="text"
                value={patientName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                換片日期
              </label>
              <input
                type="text"
                value={date}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              時段
            </label>
            <input
              type="text"
              value={timeSlot}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              排泄類型 *（可複選）
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasUrine}
                  onChange={(e) => {
                    setHasUrine(e.target.checked);
                    if (!e.target.checked) setUrineAmount('');
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700">小便</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasStool}
                  onChange={(e) => {
                    setHasStool(e.target.checked);
                    if (!e.target.checked) {
                      setStoolColor('');
                      setStoolTexture('');
                      setStoolAmount('');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700">大便</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasNone}
                  onChange={(e) => setHasNone(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700">無</span>
              </label>
            </div>
          </div>

          {hasUrine && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                小便量 *
              </label>
              <div className="flex space-x-4">
                {['多', '中', '少'].map((amount) => (
                  <label key={amount} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="urine_amount"
                      value={amount}
                      checked={urineAmount === amount}
                      onChange={(e) => setUrineAmount(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{amount}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {hasStool && (
            <div className="bg-amber-50 p-4 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  大便顏色 *
                </label>
                <div className="flex flex-wrap gap-4">
                  {['正常', '有血', '有潺', '黑便'].map((color) => (
                    <label key={color} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stool_color"
                        value={color}
                        checked={stoolColor === color}
                        onChange={(e) => setStoolColor(e.target.value)}
                        className="w-4 h-4 text-amber-600 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-gray-700">{color}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  大便質地 *
                </label>
                <div className="flex space-x-4">
                  {['硬', '軟', '稀'].map((texture) => (
                    <label key={texture} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stool_texture"
                        value={texture}
                        checked={stoolTexture === texture}
                        onChange={(e) => setStoolTexture(e.target.value)}
                        className="w-4 h-4 text-amber-600 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-gray-700">{texture}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  大便量 *
                </label>
                <div className="flex space-x-4">
                  {['多', '中', '少'].map((amount) => (
                    <label key={amount} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stool_amount"
                        value={amount}
                        checked={stoolAmount === amount}
                        onChange={(e) => setStoolAmount(e.target.value)}
                        className="w-4 h-4 text-amber-600 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-gray-700">{amount}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              記錄者 *
            </label>
            <input
              type="text"
              value={recorder}
              onChange={(e) => setRecorder(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              確認記錄
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiaperChangeModal;
