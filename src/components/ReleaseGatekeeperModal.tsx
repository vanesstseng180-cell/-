import React, { useState } from 'react';
import { 
  ShippingOrder, 
  UserProfile, 
  ReleaseCertificate 
} from '../types/shipping';
import { evaluateOrderState } from '../services/comparisonEngine';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Award, 
  ShieldCheck, 
  FileText,
  Printer
} from 'lucide-react';

interface ReleaseGatekeeperModalProps {
  order: ShippingOrder;
  currentUser: UserProfile;
  onExecuteRelease: (orderId: string, certificate: ReleaseCertificate) => void;
  onClose: () => void;
}

export const ReleaseGatekeeperModal: React.FC<ReleaseGatekeeperModalProps> = ({
  order,
  currentUser,
  onExecuteRelease,
  onClose,
}) => {
  const [remarks, setRemarks] = useState('各箱標籤、實數與出貨明細100%相符，核准出庫放行。');

  const {
    canRelease,
    blockingReasons,
    totalPlanQty,
    totalActualQty,
    qtyDifference,
  } = evaluateOrderState(order);

  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAlreadyReleased = order.status === 'RELEASED';

  const manifestItem = order.items[0] || { unit: 'PCS' };

  // 6 Critical Gatekeeper Conditions Checklist
  const checkItems = [
    {
      title: '所有必要箱號已登錄且無重複 (F02 / F06)',
      passed: order.boxes.length > 0 && !blockingReasons.some(r => r.includes('重複') || r.includes('尚未登錄')),
      detail: `目前已登錄 ${order.boxes.length} 箱，無重複箱號`,
    },
    {
      title: '外箱標籤照片證據完整留存 (F03 / F06)',
      passed: !blockingReasons.some(r => r.includes('標籤照片證據')),
      detail: `${order.boxes.filter(b => b.evidence).length} / ${order.boxes.length} 箱已附標籤照片`,
    },
    {
      title: '無待人工確認之模糊/缺漏標籤 (F03)',
      passed: !blockingReasons.some(r => r.includes('待指定人員人工確認')),
      detail: order.boxes.some(b => b.comparison?.status === 'PENDING_MANUAL_REVIEW') ? '存在待人工審查項目' : '全部標籤辨識清晰無爭議',
    },
    {
      title: '單箱標籤標示量與清點實數相符 (F05)',
      passed: !order.boxes.some(b => b.comparison?.comparisons.some(c => c.field === 'qty' && !c.isMatch)),
      detail: '單箱標籤標示與清點實數完全吻合',
    },
    {
      title: '逐箱清點加總與應出數量一致 (F05)',
      passed: totalActualQty === totalPlanQty,
      detail: `應出 ${totalPlanQty} ${manifestItem.unit} = 實出合計 ${totalActualQty} ${manifestItem.unit}`,
    },
    {
      title: '所有異常項目均已處置並經複核結案 (F07)',
      passed: !blockingReasons.some(r => r.includes('異常尚未處置') || r.includes('尚未經品管/主管複核')),
      detail: `未結案異常: ${order.anomalies?.filter(a => a.status !== 'RESOLVED').length || 0} 筆`,
    },
    {
      title: '無改單後待重新核對項目 (F08)',
      passed: !blockingReasons.some(r => r.includes('改單')),
      detail: `當前版次 ${order.version}，所有外箱已完成比對`,
    },
  ];

  const handleConfirmRelease = () => {
    if (!canRelease || !isSupervisor) return;

    const certNo = `REL-${order.shippingNo.replace('SO-', '')}-${Date.now().toString().slice(-6)}`;
    const certificate: ReleaseCertificate = {
      certificateNo: certNo,
      releasedBy: currentUser.name,
      releasedAt: new Date().toISOString(),
      supervisorSignature: `張家銘 (電子數位簽證 #${Math.floor(Math.random() * 900000 + 100000)})`,
      totalBoxes: order.boxes.length,
      totalPlanQty,
      totalActualQty,
      unit: manifestItem.unit,
      remarks,
    };

    onExecuteRelease(order.id, certificate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isAlreadyReleased 
            ? 'bg-blue-50 border-blue-200' 
            : canRelease 
            ? 'bg-emerald-50 border-emerald-200' 
            : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
              isAlreadyReleased ? 'bg-blue-600' : canRelease ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {isAlreadyReleased ? (
                <ShieldCheck className="w-5 h-5" />
              ) : canRelease ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                出庫放行狀態管理與閘道管制 (F09)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                單號: {order.shippingNo} • 當前狀態: {order.status}
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
        <div className="p-5 space-y-5">
          {/* Release Certificate Display if Already Released */}
          {isAlreadyReleased && order.releaseCertificate && (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>正式出庫放行憑證 (Official Release Certificate)</span>
                </div>
                <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  {order.releaseCertificate.certificateNo}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-blue-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">放行主管</span>
                  <span className="font-bold text-slate-900">{order.releaseCertificate.releasedBy}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">放行簽署時間</span>
                  <span className="font-semibold text-slate-800">
                    {order.releaseCertificate.releasedAt.slice(0, 19).replace('T', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">總放行箱數</span>
                  <span className="font-bold text-blue-700">{order.releaseCertificate.totalBoxes} 箱</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">總放行件數</span>
                  <span className="font-bold text-emerald-700">
                    {order.releaseCertificate.totalActualQty} {order.releaseCertificate.unit}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-blue-100">
                <span className="font-bold text-blue-950">電子簽證備註：</span>
                {order.releaseCertificate.remarks}
              </div>

              <div className="text-[11px] text-blue-700 font-medium flex items-center justify-between">
                <span>✓ 倉儲規範：已取得正式放行，可交付第四方物流裝車發運</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>列印放行單</span>
                </button>
              </div>
            </div>
          )}

          {/* Gatekeeper Criteria Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">
                出庫放行 7 大必備核對條件清單 (F09 核心防呆檢核)
              </span>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                canRelease ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
              }`}>
                {canRelease ? '全部符合放行標準 (READY)' : `尚未達成 (${blockingReasons.length} 項阻擋)`}
              </span>
            </div>

            <div className="space-y-2">
              {checkItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                    item.passed
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 text-xs">
                    <span className={`font-semibold ${item.passed ? 'text-slate-900' : 'text-rose-900 font-bold'}`}>
                      {item.title}
                    </span>
                    <p className={`text-[11px] font-mono ${item.passed ? 'text-emerald-700' : 'text-rose-700 font-semibold'}`}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blocking Reasons Details if any */}
          {blockingReasons.length > 0 && !isAlreadyReleased && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-xs text-rose-800">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>系統阻擋放行原因 (現場嚴格執行「未放行不得交付物流」)：</span>
              </div>
              <ul className="list-disc list-inside space-y-1 font-mono">
                {blockingReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Supervisor Action Form */}
          {!isAlreadyReleased && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-xs text-slate-800 block">
                放行簽署備註 (Supervisor Release Note)
              </span>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!canRelease || !isSupervisor}
                placeholder="輸入放行簽章備註..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />

              {!isSupervisor && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ 共通規格權限限制：僅「授權主管 (SUPERVISOR)」具備出庫放行簽署權限。請於上方切換操作角色至張家銘 (Supervisor)。
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono">
            當前操作者: {currentUser.name} ({currentUser.role})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition"
            >
              關閉
            </button>
            {!isAlreadyReleased && (
              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={!canRelease || !isSupervisor}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2 rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>簽署放行出庫 (F09)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
