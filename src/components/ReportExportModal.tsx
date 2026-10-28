import React, { useState } from 'react';
import { ShippingOrder } from '../types/shipping';
import { exportVerificationExcel } from '../services/excelService';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Search, 
  FileText, 
  CheckCircle2, 
  Award,
  Layers
} from 'lucide-react';

interface ReportExportModalProps {
  orders: ShippingOrder[];
  activeOrder: ShippingOrder;
  onClose: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  orders,
  activeOrder,
  onClose,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(activeOrder.id);
  const [filterQuery, setFilterQuery] = useState('');

  const targetOrder = orders.find((o) => o.id === selectedOrderId) || activeOrder;

  const handleExportExcel = () => {
    exportVerificationExcel(targetOrder);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalPlanQty = targetOrder.items.reduce((sum, i) => sum + (Number(i.planQty) || 0), 0);
  const totalActualQty = targetOrder.boxes.reduce((sum, b) => sum + (Number(b.actualCountQty) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                出貨核對紀錄查詢與報表匯出 (F10)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                支援多條件快速查詢 • Excel 完整報告匯出 • 放行清冊列印
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

        {/* Query Selector & Action Bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">選擇出貨單:</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-mono rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.shippingNo} - {o.customer} ({o.version}) [{o.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>匯出 Excel 核對報表 (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>列印放行單</span>
            </button>
          </div>
        </div>

        {/* Report Preview Document */}
        <div className="p-6 space-y-6" id="printable-release-document">
          {/* Printable Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="text-xs text-slate-500 font-mono tracking-widest uppercase">
                SMART LOGISTICS VERIFICATION REPORT
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                出貨明細與外箱標籤核對放行證明單
              </h2>
              <div className="text-xs text-slate-600 mt-1">
                客戶：<span className="font-bold text-slate-900">{targetOrder.customer}</span> •
                出貨庫區：<span className="font-semibold">{targetOrder.warehouseArea}</span>
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <div className="font-bold text-base text-blue-700">{targetOrder.shippingNo}</div>
              <div className="text-slate-500">版次: {targetOrder.version}</div>
              <div className="text-slate-500">出貨日期: {targetOrder.date}</div>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 border border-slate-300">
                  狀態: {targetOrder.status}
                </span>
              </div>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">應出數量 (Plan)</span>
              <span className="font-bold text-slate-900 text-base">{totalPlanQty} {targetOrder.items[0]?.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">逐箱清點累計 (Actual)</span>
              <span className="font-bold text-blue-700 text-base">{totalActualQty} {targetOrder.items[0]?.unit}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">登錄總箱數</span>
              <span className="font-bold text-slate-900 text-base">{targetOrder.boxes.length} 箱</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">放行憑證號</span>
              <span className="font-bold text-emerald-700 text-xs truncate block">
                {targetOrder.releaseCertificate?.certificateNo || '待放行'}
              </span>
            </div>
          </div>

          {/* Boxes Verification Details */}
          <div>
            <h4 className="font-bold text-xs text-slate-800 mb-2">
              逐箱核對明細清單 (共 {targetOrder.boxes.length} 箱)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">箱號</th>
                    <th className="py-2 px-3">品號(應有/標籤)</th>
                    <th className="py-2 px-3">批號(應有/標籤)</th>
                    <th className="py-2 px-3 text-right">清點實數</th>
                    <th className="py-2 px-3 text-right">標籤數量</th>
                    <th className="py-2 px-3 text-center">單箱判定</th>
                    <th className="py-2 px-3 text-center">標籤原圖存證</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetOrder.boxes.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{b.boxNo}</td>
                      <td className="py-2 px-3">{b.partNo} / {b.evidence?.ocrResult.partNo || '-'}</td>
                      <td className="py-2 px-3">{b.batchNo} / {b.evidence?.ocrResult.batchNo || '-'}</td>
                      <td className="py-2 px-3 text-right font-bold">{b.actualCountQty}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{b.evidence?.ocrResult.labelQty ?? '-'}</td>
                      <td className="py-2 px-3 text-center font-sans">
                        {b.comparison?.status === 'PASS' ? (
                          <span className="text-emerald-700 font-bold">合格</span>
                        ) : (
                          <span className="text-rose-600 font-bold">{b.comparison?.status || '未比對'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center text-[10px] text-slate-500">
                        {b.evidence?.photoUrl ? '✓ 已留存原圖' : '未拍攝'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Release Signature Section */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 block">倉儲裝箱與清點人員：</span>
              <div className="font-bold text-slate-800">
                {targetOrder.boxes[0]?.loggedBy || '現場作業員'} (簽署確認)
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-slate-500 block">物流授權主管放行簽核：</span>
              <div className="font-bold text-blue-900 text-sm">
                {targetOrder.releaseCertificate?.releasedBy || '(未簽章放行)'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {targetOrder.releaseCertificate?.supervisorSignature || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-slate-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-slate-800 transition"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
