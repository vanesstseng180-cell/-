import React, { useState } from 'react';
import { 
  BoxRecord, 
  ShippingOrder, 
  UserProfile 
} from '../types/shipping';
import { 
  PackagePlus, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Hash, 
  Layers 
} from 'lucide-react';

interface BoxRegistrationModalProps {
  order: ShippingOrder;
  currentUser: UserProfile;
  onRegisterBox: (newBox: BoxRecord) => void;
  onClose: () => void;
}

export const BoxRegistrationModal: React.FC<BoxRegistrationModalProps> = ({
  order,
  currentUser,
  onRegisterBox,
  onClose,
}) => {
  const manifestItem = order.items[0] || {
    itemId: 'ITEM-1',
    partNo: '004821',
    spec: '標準規格',
    batchNo: '202610A01',
    planQty: 100,
    unit: 'PCS',
  };

  // Generate next default box number
  const nextSeq = order.boxes.length + 1;
  const padSeq = String(nextSeq).padStart(3, '0');
  const defaultBoxNo = `BOX-${order.shippingNo.replace('SO-', '')}-${padSeq}`;

  const [boxNo, setBoxNo] = useState(defaultBoxNo);
  const [actualCountQty, setActualCountQty] = useState<number>(100);
  const [isTailBox, setIsTailBox] = useState(false);
  const [customSpec, setCustomSpec] = useState(manifestItem.spec);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Running totals
  const currentTotal = order.boxes.reduce((sum, b) => sum + (Number(b.actualCountQty) || 0), 0);
  const projectedTotal = currentTotal + Number(actualCountQty || 0);
  const planTotal = Number(manifestItem.planQty) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedBoxNo = boxNo.trim();
    if (!trimmedBoxNo) {
      setErrorMessage('請輸入外箱編號');
      return;
    }

    // F02: 不允許重複箱號
    const isDuplicate = order.boxes.some(
      (b) => b.boxNo.trim().toUpperCase() === trimmedBoxNo.toUpperCase()
    );
    if (isDuplicate) {
      setErrorMessage(`箱號 [${trimmedBoxNo}] 已存在於此出貨單，系統嚴禁重複箱號！`);
      return;
    }

    if (!actualCountQty || actualCountQty <= 0) {
      setErrorMessage('現場清點數量必須為大於 0 之正整數');
      return;
    }

    const newBox: BoxRecord = {
      id: `BOX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      boxNo: trimmedBoxNo,
      shippingNo: order.shippingNo,
      itemId: manifestItem.itemId,
      partNo: manifestItem.partNo, // Preserves leading zero
      spec: customSpec || manifestItem.spec,
      batchNo: manifestItem.batchNo,
      actualCountQty: Number(actualCountQty),
      unit: manifestItem.unit,
      isTailBox,
      loggedBy: currentUser.name,
      loggedAt: new Date().toISOString(),
      version: 1,
    };

    onRegisterBox(newBox);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                逐箱裝箱登錄 (F02)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                出貨單: {order.shippingNo} • 登錄人: {currentUser.name}
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Running Qty Status Banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono">
            <div className="flex justify-between items-center text-slate-600 mb-1">
              <span>累計清點加總預估:</span>
              <span className="font-bold text-slate-900">
                目前 {currentTotal} + 此箱 {actualCountQty || 0} = {projectedTotal} / 應出 {planTotal} {manifestItem.unit}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  projectedTotal === planTotal
                    ? 'bg-emerald-500'
                    : projectedTotal > planTotal
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, (projectedTotal / planTotal) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Field: Unique Box No (F02) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              唯一箱號 (Box No / Carton No) *
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={boxNo}
                onChange={(e) => setBoxNo(e.target.value)}
                placeholder="例如: BOX-20261027-011"
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              F02 規範：系統嚴格檢查，禁止重複箱號
            </span>
          </div>

          {/* Part & Batch Info (Bound to manifest) */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">所屬品號 (文字前導零)</span>
              <span className="font-bold text-blue-700 text-sm tracking-wide">
                {manifestItem.partNo}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">所屬批號</span>
              <span className="font-semibold text-slate-800 text-sm">
                {manifestItem.batchNo}
              </span>
            </div>
          </div>

          {/* Field: Actual Count Quantity (F02 & F05) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              現場實際清點數量 (Actual Count Qty) *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="1"
                value={actualCountQty}
                onChange={(e) => setActualCountQty(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="inline-flex items-center px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-mono font-semibold border border-slate-200">
                {manifestItem.unit}
              </span>
            </div>
          </div>

          {/* Tail Box Toggle (尾箱不同數量) */}
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                標記為尾箱 (Tail Box)
              </span>
              <span className="text-[11px] text-amber-700 block">
                支援尾箱特殊零數清點裝箱 (例如整箱 100 件，尾箱 38 件)
              </span>
            </div>
            <input
              type="checkbox"
              id="tail-box-checkbox"
              checked={isTailBox}
              onChange={(e) => setIsTailBox(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setActualCountQty(100);
                setIsTailBox(false);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
            >
              標準整箱 (100)
            </button>
            <button
              type="button"
              onClick={() => {
                const remaining = Math.max(0, planTotal - currentTotal);
                setActualCountQty(remaining > 0 ? remaining : 38);
                setIsTailBox(true);
              }}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-800 font-medium transition"
            >
              自動填入剩餘尾箱量 ({Math.max(0, planTotal - currentTotal)})
            </button>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>確認登錄裝箱</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
