import React, { useState } from 'react';
import { 
  AnomalyRecord, 
  ShippingOrder, 
  UserProfile 
} from '../types/shipping';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  FileCheck, 
  UserCheck, 
  Clock, 
  ArrowRight,
  Filter
} from 'lucide-react';

interface AnomalyManagementModalProps {
  order: ShippingOrder;
  currentUser: UserProfile;
  onCorrectAnomaly: (
    anomalyId: string,
    actionTaken: string,
    beforeAfter: { before: string; after: string }
  ) => void;
  onReviewAnomaly: (
    anomalyId: string,
    result: 'PASS' | 'REJECT',
    comments: string
  ) => void;
  onClose: () => void;
}

export const AnomalyManagementModal: React.FC<AnomalyManagementModalProps> = ({
  order,
  currentUser,
  onCorrectAnomaly,
  onReviewAnomaly,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'CORRECTED' | 'RESOLVED'>('ALL');
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);

  // Correction Action Form State
  const [actionMethod, setActionMethod] = useState('重新列印正確標籤並外箱覆貼');
  const [beforeText, setBeforeText] = useState('');
  const [afterText, setAfterText] = useState('');

  // QC Review Form State
  const [reviewComments, setReviewComments] = useState('');

  const anomalies = order.anomalies || [];
  const filteredAnomalies = anomalies.filter((a) => {
    if (activeTab === 'ALL') return true;
    return a.status === activeTab;
  });

  const handleStartCorrection = (anomaly: AnomalyRecord) => {
    setSelectedAnomaly(anomaly);
    setBeforeText(anomaly.discrepancyDetail);
    setAfterText(`已更正為正確值 [${anomaly.expectedVal}]，外箱實體驗收合格`);
  };

  const handleSaveCorrection = () => {
    if (!selectedAnomaly) return;
    onCorrectAnomaly(selectedAnomaly.id, actionMethod, {
      before: beforeText,
      after: afterText,
    });
    setSelectedAnomaly(null);
  };

  const handleSaveReview = (result: 'PASS' | 'REJECT') => {
    if (!selectedAnomaly) return;
    onReviewAnomaly(
      selectedAnomaly.id,
      result,
      reviewComments || (result === 'PASS' ? '品管現場實體驗收無誤，同意結案' : '實物依然有疑慮，退回重做')
    );
    setSelectedAnomaly(null);
    setReviewComments('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                異常記錄處置與複核管理 (F07)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                出貨單號: {order.shippingNo} • 禁止刪除歷程 • 需品管/指定人員複核方可結案
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

        {/* Tab Filters */}
        <div className="border-b border-slate-200 bg-slate-100/60 px-5 pt-2 flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === 'ALL'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            全部異常 ({anomalies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPEN')}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === 'OPEN'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            待處置 (OPEN: {anomalies.filter((a) => a.status === 'OPEN').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CORRECTED')}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === 'CORRECTED'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            已處置待複核 (CORRECTED: {anomalies.filter((a) => a.status === 'CORRECTED').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RESOLVED')}
            className={`pb-2.5 px-1 border-b-2 transition ${
              activeTab === 'RESOLVED'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            已複核結案 (RESOLVED: {anomalies.filter((a) => a.status === 'RESOLVED').length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {filteredAnomalies.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800 text-sm">無符合條件之異常記錄</h4>
              <p className="text-xs text-slate-500 mt-1">目前該分類下沒有任何異常項目。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnomalies.map((anomaly) => {
                const isOpen = anomaly.status === 'OPEN';
                const isCorrected = anomaly.status === 'CORRECTED';
                const isResolved = anomaly.status === 'RESOLVED';

                return (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-xl border transition ${
                      isOpen
                        ? 'bg-rose-50/50 border-rose-200'
                        : isCorrected
                        ? 'bg-purple-50/40 border-purple-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-white font-semibold">
                            {anomaly.id}
                          </span>
                          {anomaly.boxNo && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                              箱號: {anomaly.boxNo}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900">
                            {anomaly.title}
                          </span>
                        </div>
                        <p className="text-xs text-rose-700 font-medium">
                          差異詳情: {anomaly.discrepancyDetail}
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                          <span>應有: [{anomaly.expectedVal}]</span>
                          <span>實際: [{anomaly.actualVal}]</span>
                          <span>提報: {anomaly.owner} • {anomaly.createdAt.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2">
                        {isOpen && (
                          <span className="text-xs bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full font-bold border border-rose-200">
                            待處置
                          </span>
                        )}
                        {isCorrected && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-bold border border-purple-200">
                            已處置待品管複核
                          </span>
                        )}
                        {isResolved && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                            已複核結案
                          </span>
                        )}

                        {/* Action Trigger Buttons */}
                        {isOpen && (
                          <button
                            type="button"
                            onClick={() => handleStartCorrection(anomaly)}
                            className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs transition"
                          >
                            處置修正 (F07)
                          </button>
                        )}

                        {isCorrected && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAnomaly(anomaly);
                              setReviewComments('經現場品管實檢無誤，符合放行規格');
                            }}
                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs transition"
                          >
                            品管複核結案
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Correction details if exists */}
                    {anomaly.correctionMethod && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>處置方式: {anomaly.correctionMethod}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            修正人: {anomaly.correctedBy} • {anomaly.correctedAt?.slice(11, 16)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <span>修正前: {anomaly.beforeCorrection}</span>
                          <ArrowRight className="inline w-3 h-3 mx-1 text-slate-400" />
                          <span className="text-emerald-700 font-semibold">修正後: {anomaly.afterCorrection}</span>
                        </div>
                      </div>
                    )}

                    {/* Review result if resolved */}
                    {anomaly.reviewer && (
                      <div className="mt-2 text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-200 font-mono">
                        複核紀錄: 由 [{anomaly.reviewer}] 於 {anomaly.reviewedAt?.slice(0, 16).replace('T', ' ')} 複核通過 (評語: {anomaly.reviewComments})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive Form Sub-modal for Correction or Review */}
          {selectedAnomaly && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm">
                  {selectedAnomaly.status === 'OPEN' ? '執行異常處置修正 (F07)' : '執行指定人員品管複核 (F07)'} - {selectedAnomaly.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedAnomaly(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {selectedAnomaly.status === 'OPEN' ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">處理方式 (Action Taken) *</label>
                    <select
                      value={actionMethod}
                      onChange={(e) => setActionMethod(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="重新列印正確標籤並外箱覆貼">重新列印正確標籤並外箱覆貼</option>
                      <option value="現場拆箱重揀補齊短少數量">現場拆箱重揀補齊短少數量</option>
                      <option value="修正清點登錄實數 (輸入錯誤更正)">修正清點登錄實數 (輸入錯誤更正)</option>
                      <option value="特採放行 (獲業務與主管特採核准)">特採放行 (獲業務與主管特採核准)</option>
                      <option value="退回倉庫重新揀料裝箱">退回倉庫重新揀料裝箱</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">修正前內容</label>
                    <input
                      type="text"
                      value={beforeText}
                      onChange={(e) => setBeforeText(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">修正後內容 (實體驗收狀態) *</label>
                    <input
                      type="text"
                      value={afterText}
                      onChange={(e) => setAfterText(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAnomaly(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCorrection}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-sm"
                    >
                      保存處置並送交複核
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">品管複核意見說明 *</label>
                    <textarea
                      rows={2}
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      placeholder="填寫實體抽驗、標籤覆核意見..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveReview('REJECT')}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold"
                    >
                      駁回復核 (退回重做)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveReview('PASS')}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
                    >
                      審核通過 (正式結案)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            F07 規範：所有異常歷程禁止刪除，出庫放行前所有異常必須達 RESOLVED 結案狀態
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-slate-800 transition"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
