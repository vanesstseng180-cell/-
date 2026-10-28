import React, { useState } from 'react';
import { 
  ShippingOrder, 
  UserProfile 
} from '../types/shipping';
import { 
  Layers, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  History, 
  FileEdit 
} from 'lucide-react';

interface ManifestEditModalProps {
  order: ShippingOrder;
  currentUser: UserProfile;
  onApplyRevision: (
    updatedOrder: ShippingOrder,
    changeSummary: string,
    affectedField: string
  ) => void;
  onClose: () => void;
}

export const ManifestEditModal: React.FC<ManifestEditModalProps> = ({
  order,
  currentUser,
  onApplyRevision,
  onClose,
}) => {
  const currentItem = order.items[0] || {
    itemId: 'ITEM-1',
    partNo: '004821',
    spec: '',
    batchNo: '',
    planQty: 1000,
    unit: 'PCS',
  };

  const [partNo, setPartNo] = useState(currentItem.partNo);
  const [spec, setSpec] = useState(currentItem.spec);
  const [batchNo, setBatchNo] = useState(currentItem.batchNo);
  const [planQty, setPlanQty] = useState(currentItem.planQty);
  const [unit, setUnit] = useState(currentItem.unit);
  const [changeReason, setChangeReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nextVersionNum = parseInt(order.version.replace('V', ''), 10) + 1;
  const newVersion = `V${nextVersionNum}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!changeReason.trim()) {
      setErrorMsg('F08 規格要求：明細變更時必須填寫明確的「變更原因說明」，以供稽核追溯');
      return;
    }

    if (planQty <= 0) {
      setErrorMsg('應出數量必須大於 0');
      return;
    }

    // Determine what changed
    const changes: string[] = [];
    if (partNo !== currentItem.partNo) changes.push(`品號變更 [${currentItem.partNo} -> ${partNo}]`);
    if (batchNo !== currentItem.batchNo) changes.push(`批號變更 [${currentItem.batchNo} -> ${batchNo}]`);
    if (planQty !== currentItem.planQty) changes.push(`應出數量變更 [${currentItem.planQty} -> ${planQty}]`);
    if (spec !== currentItem.spec) changes.push(`規格變更 [${currentItem.spec} -> ${spec}]`);

    if (changes.length === 0) {
      setErrorMsg('未偵測到任何欄位變更');
      return;
    }

    const summary = `${changeReason.trim()} (${changes.join(', ')})`;

    // F08: 受影響的箱子及核對結果改為「待重新核對 (recheckRequired: true)」
    // 原通過結果失效，未完成重新核對前不能放行
    const updatedBoxes = order.boxes.map((b) => ({
      ...b,
      recheckRequired: true,
      comparison: {
        ...b.comparison!,
        overallMatch: false,
        status: 'RECHECK_REQUIRED' as any,
        hasAnomaly: true,
        anomalySummary: `出貨明細改單 (版次 ${newVersion})，原核對結果失效，需重新比對`,
      },
    }));

    const updatedOrder: ShippingOrder = {
      ...order,
      version: newVersion,
      status: 'PENDING_VERIFICATION',
      items: [
        {
          ...currentItem,
          partNo: partNo.trim(),
          spec: spec.trim(),
          batchNo: batchNo.trim(),
          planQty: Number(planQty),
          unit: unit.trim().toUpperCase(),
        },
      ],
      boxes: updatedBoxes,
      releaseCertificate: undefined, // Invalidate release certificate
      history: [
        {
          version: newVersion,
          modifiedAt: new Date().toISOString(),
          modifiedBy: `${currentUser.name} (${currentUser.title})`,
          changeSummary: summary,
          affectedBoxesCount: updatedBoxes.length,
        },
        ...(order.history || []),
      ],
      updatedAt: new Date().toISOString(),
    };

    onApplyRevision(updatedOrder, summary, changes.join('; '));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                出貨明細改單與重新核對管制 (F08)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                當前版次: {order.version} ➔ 即將升級為 {newVersion}
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

        {/* Warning Banner */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              F08 核心驗收標準：更改數量或批號後，原通過結果自動失效！
            </span>
            <span>
              已登錄的 {order.boxes.length} 箱紀錄將自動重置為「待重新核對」，且系統將重置放行資格。完成重新核對前禁止放行出庫。
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Part No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                品號 (文字格式，保留前導零)
              </label>
              <input
                type="text"
                required
                value={partNo}
                onChange={(e) => setPartNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Batch No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                批號 (Batch / Lot No)
              </label>
              <input
                type="text"
                required
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Plan Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                應出總數量 (Plan Qty)
              </label>
              <input
                type="number"
                required
                min="1"
                value={planQty}
                onChange={(e) => setPlanQty(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                單位 (Unit)
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Spec */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              規格說明 (Specification)
            </label>
            <input
              type="text"
              required
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reason for Change (Required by F08) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              改單與變更原因說明 * (稽核必填)
            </label>
            <textarea
              required
              rows={2}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="例如：客戶業務通知緊急追加50件，重新分配生產批號 202610A02..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Existing Version History */}
          {order.history && order.history.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1 mb-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>歷史改單版次歷程 (Audit Trail):</span>
              </span>
              <div className="space-y-1 font-mono text-[11px] text-slate-600">
                {order.history.map((h, i) => (
                  <div key={i} className="flex justify-between border-b border-slate-200/60 pb-0.5">
                    <span>[{h.version}] {h.changeSummary}</span>
                    <span className="text-slate-400">{h.modifiedBy} • {h.modifiedAt.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-[11px] text-slate-500 font-mono">
              操作者: {currentUser.name}
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
                <RefreshCw className="w-4 h-4" />
                <span>執行改單升版並觸發重新核對</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
