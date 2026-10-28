import React, { useState } from 'react';
import { 
  BoxRecord, 
  UserProfile, 
  ManualEditLog 
} from '../types/shipping';
import { 
  Edit3, 
  Check, 
  AlertTriangle, 
  History, 
  Eye 
} from 'lucide-react';

interface ManualReviewModalProps {
  box: BoxRecord;
  currentUser: UserProfile;
  onSaveManualCorrection: (
    boxId: string,
    updatedFields: {
      boxNo: string;
      partNo: string;
      spec: string;
      batchNo: string;
      labelQty: number;
      unit: string;
    },
    reason: string
  ) => void;
  onClose: () => void;
}

export const ManualReviewModal: React.FC<ManualReviewModalProps> = ({
  box,
  currentUser,
  onSaveManualCorrection,
  onClose,
}) => {
  const ocr = box.evidence?.ocrResult || {
    boxNo: box.boxNo,
    partNo: box.partNo,
    spec: box.spec,
    batchNo: box.batchNo,
    labelQty: box.actualCountQty,
    unit: box.unit,
    confidence: 0.95,
  };

  const [boxNo, setBoxNo] = useState(ocr.boxNo);
  const [partNo, setPartNo] = useState(ocr.partNo);
  const [spec, setSpec] = useState(ocr.spec);
  const [batchNo, setBatchNo] = useState(ocr.batchNo);
  const [labelQty, setLabelQty] = useState(ocr.labelQty);
  const [unit, setUnit] = useState(ocr.unit);
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('共通規格要求：人工修改辨識結果必須填寫「修正原因」以保留稽核紀錄！');
      return;
    }

    if (labelQty <= 0) {
      setErrorMsg('標籤標示數量必須大於 0');
      return;
    }

    onSaveManualCorrection(
      box.id,
      {
        boxNo: boxNo.trim(),
        partNo: partNo.trim(),
        spec: spec.trim(),
        batchNo: batchNo.trim(),
        labelQty: Number(labelQty),
        unit: unit.trim().toUpperCase(),
      },
      reason.trim()
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                標籤辨識結果人工確認與修正 (F03 / 共通規格)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                箱號: {box.boxNo} • 覆核人員: {currentUser.name} ({currentUser.title})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Side by Side: Original Image vs Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Original Label Image */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                外箱標籤照片原圖 (請仔細比對辨識值與原圖文字)
              </span>
              <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-900 aspect-[4/3] flex items-center justify-center">
                {box.evidence?.photoUrl ? (
                  <img
                    src={box.evidence.photoUrl}
                    alt="Original Label"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-500 text-xs">無標籤原圖</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                拍攝時間: {box.evidence?.capturedAt.slice(0, 19).replace('T', ' ')}
              </div>
            </div>

            {/* Right: Editable OCR Fields */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">可編輯之標籤欄位值</span>
                <span className="text-[10px] text-amber-700 font-medium">修改將留下完整紀錄</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  標籤品號 (保留前導零) *
                </label>
                <input
                  type="text"
                  required
                  value={partNo}
                  onChange={(e) => setPartNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  標籤批號 (Batch / Lot No) *
                </label>
                <input
                  type="text"
                  required
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                  標籤規格說明 *
                </label>
                <input
                  type="text"
                  required
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    標籤標示數量 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={labelQty}
                    onChange={(e) => setLabelQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    單位 *
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Reason for Manual Correction (Strict Requirement) */}
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-0.5">
                  人工修正原因說明 * (稽核存證必填)
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：原圖標籤因角度反光導致前導零辨識為O，經品管人工放大檢視確認為 004821..."
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Past History */}
          {box.evidence?.manualEditHistory && box.evidence.manualEditHistory.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>過去人工修正歷史 (Audit Trail):</span>
              </span>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                {box.evidence.manualEditHistory.map((log, i) => (
                  <li key={i}>
                    • {log.editedAt.slice(11, 19)} [{log.editedBy}] 修改「{log.field}」: {String(log.originalValue)} ➔ {String(log.newValue)} ({log.reason})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">
              修正後將自動觸發固定規則重新比對
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>保存修正並結案標籤審核</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
