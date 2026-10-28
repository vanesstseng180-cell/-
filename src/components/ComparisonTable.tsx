import React, { useState } from 'react';
import { 
  ShippingOrder, 
  BoxRecord, 
  UserProfile 
} from '../types/shipping';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Camera, 
  Eye, 
  Edit3, 
  Trash2, 
  Search, 
  HelpCircle,
  FileCheck2,
  RefreshCw,
  Clock,
  Sparkles,
  PackagePlus
} from 'lucide-react';

interface ComparisonTableProps {
  order: ShippingOrder;
  currentUser: UserProfile;
  onOpenScanner: (box: BoxRecord) => void;
  onOpenManualReview: (box: BoxRecord) => void;
  onEditBoxQty: (box: BoxRecord, newQty: number) => void;
  onDeleteBox: (boxId: string) => void;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  order,
  currentUser,
  onOpenScanner,
  onOpenManualReview,
  onEditBoxQty,
  onDeleteBox,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBoxForModal, setSelectedBoxForModal] = useState<BoxRecord | null>(null);
  const [editingQtyBoxId, setEditingQtyBoxId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<number>(0);

  const manifestItem = order.items[0] || {
    partNo: '',
    spec: '',
    batchNo: '',
    planQty: 0,
    unit: 'PCS',
  };

  // Quantity totals for F05
  const totalActualQty = order.boxes.reduce((sum, b) => sum + (Number(b.actualCountQty) || 0), 0);
  const totalPlanQty = Number(manifestItem.planQty) || 0;
  const qtyDiff = totalActualQty - totalPlanQty;

  // Filter boxes
  const filteredBoxes = order.boxes.filter((b) => {
    const matchesSearch =
      b.boxNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.spec.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PASS') return b.comparison?.status === 'PASS';
    if (statusFilter === 'MISMATCH') return b.comparison?.status === 'MISMATCH';
    if (statusFilter === 'PENDING_EVIDENCE') return b.comparison?.status === 'PENDING_EVIDENCE' || !b.evidence;
    if (statusFilter === 'PENDING_MANUAL_REVIEW') return b.comparison?.status === 'PENDING_MANUAL_REVIEW';
    if (statusFilter === 'RECHECK_REQUIRED') return b.comparison?.status === 'RECHECK_REQUIRED' || b.recheckRequired;
    return true;
  });

  const handleStartEditQty = (b: BoxRecord) => {
    setEditingQtyBoxId(b.id);
    setTempQty(b.actualCountQty);
  };

  const handleSaveEditQty = (b: BoxRecord) => {
    if (tempQty <= 0) {
      alert('清點數量必須大於 0');
      return;
    }
    onEditBoxQty(b, tempQty);
    setEditingQtyBoxId(null);
  };

  return (
    <div className="space-y-6">
      {/* F05: Double Quantity Verification & Manifest Summary Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Manifest Header Info */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  出貨單號: {order.shippingNo}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  版次 {order.version} • 日期: {order.date}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  庫區: {order.warehouseArea}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1.5 tracking-tight">
                {order.customer}
              </h2>
            </div>

            {/* Manifest Requirements Pill */}
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">應出料號 (保留前導零)</span>
                <span className="font-bold text-blue-700 text-sm tracking-wider">
                  {manifestItem.partNo}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-slate-400 block text-[10px]">應出批號</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {manifestItem.batchNo}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-slate-400 block text-[10px]">規格說明</span>
                <span className="font-medium text-slate-700 max-w-[200px] truncate block" title={manifestItem.spec}>
                  {manifestItem.spec}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* F05: Dual Quantity Check Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200">
          {/* Card 1: 應出總量 */}
          <div className="bg-white p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">出貨明細應出總量 (Plan Qty)</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {totalPlanQty.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                {manifestItem.unit}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">依 ERP 核准出貨單載明數量</p>
          </div>

          {/* Card 2: 逐箱清點實出累計 */}
          <div className="bg-white p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">逐箱清點實出累計 (Count Qty)</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-600 font-mono">
                {totalActualQty.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                {manifestItem.unit}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono ml-auto">
                共 {order.boxes.length} 箱
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">現場實體清點裝箱總合 (支援尾箱)</p>
          </div>

          {/* Card 3: 數量比對判定與短少/溢出提示 (F05) */}
          <div className={`p-4 sm:p-5 ${
            qtyDiff === 0 
              ? 'bg-emerald-50/60' 
              : 'bg-rose-50/70 border-l-4 border-rose-500'
          }`}>
            <span className="text-xs font-medium text-slate-600 block">總量核對判定 (F05)</span>
            <div className="mt-1 flex items-center gap-2">
              {qtyDiff === 0 ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-lg font-bold text-emerald-800">
                      數量完全相符
                    </span>
                    <span className="text-xs text-emerald-700 block font-mono">
                      應出 {totalPlanQty} = 實出 {totalActualQty} {manifestItem.unit}
                    </span>
                  </div>
                </>
              ) : qtyDiff < 0 ? (
                <>
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  <div>
                    <span className="text-lg font-bold text-rose-700">
                      數量短少 {Math.abs(qtyDiff)} {manifestItem.unit}！
                    </span>
                    <span className="text-xs text-rose-600 block font-mono font-medium">
                      應出 {totalPlanQty}，累計僅 {totalActualQty} (短少 -{Math.abs(qtyDiff)})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-lg font-bold text-amber-800">
                      數量溢裝 +{qtyDiff} {manifestItem.unit}！
                    </span>
                    <span className="text-xs text-amber-700 block font-mono font-medium">
                      應出 {totalPlanQty}，累計為 {totalActualQty} (溢出 +{qtyDiff})
                    </span>
                  </div>
                </>
              )}
            </div>
            {qtyDiff !== 0 && (
              <span className="inline-block mt-2 text-[11px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                ⚠️ 系統已阻擋放行，請清點補箱或修正裝箱數量
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Box Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜尋箱號、品號、批號或規格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({order.boxes.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PASS')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'PASS'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              相符 ({order.boxes.filter((b) => b.comparison?.status === 'PASS').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('MISMATCH')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'MISMATCH'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              不符 ({order.boxes.filter((b) => b.comparison?.status === 'MISMATCH').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING_EVIDENCE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'PENDING_EVIDENCE'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              未拍照 ({order.boxes.filter((b) => !b.evidence).length})
            </button>
          </div>
        </div>

        {/* Re-photograph Notice (F06: 同一箱重拍後仍只計算一次) */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>F06 防呆機制：重拍覆蓋原圖不增加箱數，品號與批號保留前導零嚴格比對</span>
        </div>
      </div>

      {/* Box List Table */}
      {filteredBoxes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <PackagePlus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">無符合的外箱紀錄</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {order.boxes.length === 0
              ? '此出貨單尚未登錄任何箱號。請點選上方「逐箱裝箱登錄」建立第一箱！'
              : '沒有符合目前篩選條件的外箱，請調整搜尋字詞或狀態過濾。'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[140px]">箱號 (F02)</th>
                  <th className="py-3 px-4 min-w-[180px]">品號比對 (F04 保留前導零)</th>
                  <th className="py-3 px-4 min-w-[150px]">批號比對 (F04)</th>
                  <th className="py-3 px-4 min-w-[150px]">數量核對 (F05 清點 vs 標籤)</th>
                  <th className="py-3 px-4 min-w-[120px]">外箱標籤影像 (F03)</th>
                  <th className="py-3 px-4 min-w-[130px]">綜合判定</th>
                  <th className="py-3 px-4 min-w-[150px] text-right">操作與紀錄</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredBoxes.map((box, index) => {
                  const comp = box.comparison;
                  const ocr = box.evidence?.ocrResult;
                  const partComp = comp?.comparisons.find((c) => c.field === 'partNo');
                  const batchComp = comp?.comparisons.find((c) => c.field === 'batchNo');
                  const qtyComp = comp?.comparisons.find((c) => c.field === 'qty');

                  const isPass = comp?.status === 'PASS';
                  const isPendingEvidence = !box.evidence || comp?.status === 'PENDING_EVIDENCE';
                  const isPendingReview = comp?.status === 'PENDING_MANUAL_REVIEW';
                  const isRecheckRequired = comp?.status === 'RECHECK_REQUIRED' || box.recheckRequired;
                  const isMismatch = comp?.status === 'MISMATCH';

                  return (
                    <tr
                      key={box.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isMismatch
                          ? 'bg-rose-50/30'
                          : isPendingReview
                          ? 'bg-amber-50/20'
                          : isRecheckRequired
                          ? 'bg-purple-50/20'
                          : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      {/* Box No (F02) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 tracking-tight">
                            {box.boxNo}
                          </span>
                          {box.isTailBox && (
                            <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium border border-amber-200">
                              尾箱
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{box.loggedBy} • {box.loggedAt.slice(11, 16)}</span>
                        </div>
                      </td>

                      {/* Part No Comparison (F04) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">應有 / 標籤</span>
                            <div className="font-semibold text-slate-800">
                              {box.partNo}
                            </div>
                            <div className={`text-xs ${
                              !ocr ? 'text-slate-400 italic' : partComp?.isMatch ? 'text-emerald-700' : 'text-rose-600 font-bold'
                            }`}>
                              {ocr ? ocr.partNo : '(尚未辨識)'}
                            </div>
                          </div>
                          {ocr && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                              partComp?.isMatch
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800 animate-pulse'
                            }`}>
                              {partComp?.isMatch ? '相符' : '不符'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Batch No Comparison (F04) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">應有 / 標籤</span>
                            <div className="font-semibold text-slate-800">
                              {box.batchNo}
                            </div>
                            <div className={`text-xs ${
                              !ocr ? 'text-slate-400 italic' : batchComp?.isMatch ? 'text-emerald-700' : 'text-rose-600 font-bold'
                            }`}>
                              {ocr ? ocr.batchNo : '(尚未辨識)'}
                            </div>
                          </div>
                          {ocr && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                              batchComp?.isMatch
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800 animate-pulse'
                            }`}>
                              {batchComp?.isMatch ? '相符' : '不符'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quantity Check (F05) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            {editingQtyBoxId === box.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={tempQty}
                                  onChange={(e) => setTempQty(parseInt(e.target.value, 10) || 0)}
                                  className="w-16 px-1.5 py-0.5 text-xs bg-white border border-blue-500 rounded font-bold"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditQty(box)}
                                  className="text-[10px] font-sans bg-blue-600 text-white px-1.5 py-0.5 rounded"
                                >
                                  存
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-900 font-bold text-sm">
                                  {box.actualCountQty}
                                </span>
                                <span className="text-slate-500 text-[10px]">{box.unit}</span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditQty(box)}
                                  className="text-slate-400 hover:text-blue-600 transition"
                                  title="修改清點數量"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                              標籤標示: {ocr ? `${ocr.labelQty} ${ocr.unit}` : '(無)'}
                            </div>
                          </div>

                          {ocr && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-medium ${
                              qtyComp?.isMatch
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800 font-bold'
                            }`}>
                              {qtyComp?.isMatch ? '相符' : `差 ${box.actualCountQty - ocr.labelQty}`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Evidence Photo & OCR (F03) */}
                      <td className="py-3.5 px-4">
                        {box.evidence?.photoUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedBoxForModal(box)}
                              className="relative group w-12 h-9 rounded-lg border border-slate-300 overflow-hidden bg-slate-100 shrink-0 shadow-2xs"
                              title="查看標籤原圖與辨識結果"
                            >
                              <img
                                src={box.evidence.photoUrl}
                                alt={`Box ${box.boxNo} Label`}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                            <div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block font-sans">
                                信心度 {Math.round((ocr?.confidence || 0.95) * 100)}%
                              </span>
                              {box.evidence.manualEditHistory?.length > 0 && (
                                <span className="text-[9px] text-blue-600 block font-sans mt-0.5">
                                  已人工修正
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenScanner(box)}
                            className="flex items-center gap-1 text-[11px] font-sans text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>拍照辨識</span>
                          </button>
                        )}
                      </td>

                      {/* Overall Status Badge */}
                      <td className="py-3.5 px-4">
                        {isPass ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>比對相符</span>
                          </span>
                        ) : isPendingEvidence ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            <span>未附標籤</span>
                          </span>
                        ) : isPendingReview ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            <HelpCircle className="w-3 h-3 text-amber-600" />
                            <span>待人工確認</span>
                          </span>
                        ) : isRecheckRequired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-300">
                            <RefreshCw className="w-3 h-3 text-purple-600" />
                            <span>待重新核對</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>異常不符</span>
                          </span>
                        )}

                        {comp?.anomalySummary && (
                          <p className="text-[10px] font-sans text-rose-600 mt-1 max-w-[160px] truncate" title={comp.anomalySummary}>
                            {comp.anomalySummary}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 font-sans">
                          {/* Re-photograph (F06: does not add box count) */}
                          <button
                            type="button"
                            onClick={() => onOpenScanner(box)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title={box.evidence ? "重新拍照辨識 (F06 覆蓋原圖不增箱)" : "拍攝標籤"}
                          >
                            <Camera className="w-4 h-4" />
                          </button>

                          {/* Manual Review (F03/F07) */}
                          {box.evidence && (
                            <button
                              type="button"
                              onClick={() => onOpenManualReview(box)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="人工確認/修正辨識欄位 (保留軌跡)"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Evidence / Rule Modal */}
                          {box.evidence && (
                            <button
                              type="button"
                              onClick={() => setSelectedBoxForModal(box)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="檢視標籤原圖與比對判定細節"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Box */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`確定要刪除箱號 [${box.boxNo}] 的裝箱登錄嗎？`)) {
                                onDeleteBox(box.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="刪除此箱紀錄"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Detail Modal for Label Evidence & Field Comparisons (F03, F04) */}
      {selectedBoxForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  外箱標籤證據與比對判定細節 - {selectedBoxForModal.boxNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBoxForModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6">
              {/* Top: Image Preview vs OCR Extracted */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Original Label Photo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>標籤原圖 (原始存證)</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedBoxForModal.evidence?.capturedAt.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-950 p-1 aspect-[4/3] flex items-center justify-center">
                    {selectedBoxForModal.evidence?.photoUrl ? (
                      <img
                        src={selectedBoxForModal.evidence.photoUrl}
                        alt="Label Evidence"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-500 text-xs">無標籤影像</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    拍攝人員: {selectedBoxForModal.evidence?.capturedBy || '現場人員'}
                  </div>
                </div>

                {/* Right: OCR Recognition Details */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">AI / OCR 辨識文字 (F03)</span>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      信心度: {Math.round((selectedBoxForModal.evidence?.ocrResult.confidence || 0.95) * 100)}%
                    </span>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500 font-sans">箱號:</span>
                      <span className="font-bold text-slate-900">{selectedBoxForModal.evidence?.ocrResult.boxNo}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500 font-sans">品號 (保留前導零):</span>
                      <span className="font-bold text-blue-700">{selectedBoxForModal.evidence?.ocrResult.partNo}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500 font-sans">規格:</span>
                      <span className="font-medium text-slate-800 text-right">{selectedBoxForModal.evidence?.ocrResult.spec}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500 font-sans">批號:</span>
                      <span className="font-semibold text-slate-800">{selectedBoxForModal.evidence?.ocrResult.batchNo}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500 font-sans">標籤數量:</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {selectedBoxForModal.evidence?.ocrResult.labelQty} {selectedBoxForModal.evidence?.ocrResult.unit}
                      </span>
                    </div>
                  </div>

                  {selectedBoxForModal.evidence?.ocrResult.notes && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 font-sans">
                      <span className="font-semibold">辨識備註：</span>{selectedBoxForModal.evidence?.ocrResult.notes}
                    </div>
                  )}

                  {/* Manual Edit History */}
                  {selectedBoxForModal.evidence?.manualEditHistory && selectedBoxForModal.evidence.manualEditHistory.length > 0 && (
                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-[11px] font-sans">
                      <span className="font-bold text-blue-900 block mb-1">人工修正歷程 (Audit Trail):</span>
                      <ul className="space-y-1 text-blue-800">
                        {selectedBoxForModal.evidence.manualEditHistory.map((log, i) => (
                          <li key={i}>
                            • {log.editedAt.slice(11, 16)} [{log.editedBy}] 將「{log.field}」由 [{log.originalValue}] 修正為 [{log.newValue}] (原因: {log.reason})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Fixed Rules Comparison Table (F04, F05) */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">
                  固定規則逐欄比對矩陣 (F04: 欄位、應有值、實際值、判定結果)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">比對項目</th>
                        <th className="py-2.5 px-3">應有值 (出貨明細/清點)</th>
                        <th className="py-2.5 px-3">實際值 (標籤辨識)</th>
                        <th className="py-2.5 px-3">適用規則</th>
                        <th className="py-2.5 px-3 text-center">判定結果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedBoxForModal.comparison?.comparisons.map((item, idx) => (
                        <tr key={idx} className={item.isMatch ? 'bg-white' : 'bg-rose-50/50'}>
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">{item.label}</td>
                          <td className="py-2 px-3 text-slate-800 font-semibold">{String(item.expectedValue)}</td>
                          <td className={`py-2 px-3 ${item.isMatch ? 'text-slate-800' : 'text-rose-600 font-bold'}`}>
                            {String(item.actualValue)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">{item.ruleName}</td>
                          <td className="py-2 px-3 text-center">
                            {item.isMatch ? (
                              <span className="text-emerald-700 font-sans font-bold text-[11px]">相符</span>
                            ) : (
                              <span className="text-rose-700 font-sans font-bold text-[11px]">不符</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const b = selectedBoxForModal;
                  setSelectedBoxForModal(null);
                  onOpenManualReview(b);
                }}
                className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>人工確認/修正辨識欄位</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBoxForModal(null)}
                className="text-xs bg-slate-900 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-slate-800 transition"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
