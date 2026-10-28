import React, { useState } from 'react';
import { 
  parseManifestExcel, 
  downloadManifestTemplate, 
  ParseManifestResult, 
  ManifestImportRow 
} from '../services/excelService';
import { ShippingOrder } from '../types/shipping';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles,
  Info
} from 'lucide-react';

interface ManifestImportModalProps {
  onImportSuccess: (importedOrders: Partial<ShippingOrder>[]) => void;
  onClose: () => void;
}

export const ManifestImportModal: React.FC<ManifestImportModalProps> = ({
  onImportSuccess,
  onClose,
}) => {
  const [parseResult, setParseResult] = useState<ParseManifestResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseManifestExcel(buffer, file.name);
      setParseResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`解析檔案失敗: ${err.message || '未知錯誤，請確認檔案格式為有效之 Excel 或 CSV'}`);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Quick Demo Excel Loader (for instant testing without needing local files)
  const handleLoadDemoDataset = (hasError: boolean) => {
    if (hasError) {
      // Demo with validation error: invalid quantity & missing customer
      setParseResult({
        fileName: '出貨明細_含格式異常測試.xlsx',
        totalRows: 3,
        validRows: [
          {
            rowNumber: 2,
            shippingNo: 'SO-20261029-DEMO',
            date: '2026-10-29',
            customer: '和碩智慧終端',
            warehouseArea: 'A2 測試庫區',
            partNo: '005520',
            spec: 'Type-C 防水金屬母座',
            batchNo: '202610F01',
            planQty: 600,
            unit: 'PCS',
            isValid: true,
            errors: [],
          },
        ],
        invalidRows: [
          {
            rowNumber: 3,
            shippingNo: 'SO-20261029-DEMO',
            date: '2026-10-29',
            customer: '', // Missing customer!
            partNo: '005521',
            spec: 'Type-C 端子排線',
            batchNo: '202610F02',
            planQty: 400,
            unit: 'PCS',
            isValid: false,
            errors: ['缺少「客戶」名稱'],
          },
          {
            rowNumber: 4,
            shippingNo: 'SO-20261029-DEMO',
            date: '2026-10-29',
            customer: '和碩智慧終端',
            partNo: '005522',
            spec: '絕緣墊片',
            batchNo: '202610F03',
            planQty: -50, // Invalid quantity!
            unit: 'PCS',
            isValid: false,
            errors: ['應出數量不合法 (輸入值: "-50")，必須為大於 0 之正整數'],
          },
        ],
        parsedOrders: [],
      });
    } else {
      // Clean Demo Dataset
      setParseResult({
        fileName: '出貨明細_聯發科5G主晶片_正常.xlsx',
        totalRows: 2,
        validRows: [
          {
            rowNumber: 2,
            shippingNo: 'SO-20261028-MTK',
            date: '2026-10-28',
            customer: '聯發科技 (MediaTek IoT)',
            warehouseArea: 'D1 晶圓封裝出庫區',
            partNo: '003188', // Leading zero preserved!
            spec: 'Dimensity 9400 高階 SoC 模組',
            batchNo: '202610MT01',
            planQty: 800,
            unit: 'PCS',
            isValid: true,
            errors: [],
          },
        ],
        invalidRows: [],
        parsedOrders: [
          {
            shippingNo: 'SO-20261028-MTK',
            date: '2026-10-28',
            customer: '聯發科技 (MediaTek IoT)',
            warehouseArea: 'D1 晶圓封裝出庫區',
            version: 'V1',
            status: 'PENDING_VERIFICATION',
            items: [
              {
                itemId: 'ITEM-1',
                partNo: '003188',
                spec: 'Dimensity 9400 高階 SoC 模組',
                batchNo: '202610MT01',
                planQty: 800,
                unit: 'PCS',
              },
            ],
            boxes: [],
            anomalies: [],
            history: [
              {
                version: 'V1',
                modifiedAt: new Date().toISOString(),
                modifiedBy: '系統 Excel 匯入',
                changeSummary: '原始匯入建立 (800 PCS)',
                affectedBoxesCount: 0,
              },
            ],
          },
        ],
      });
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.parsedOrders.length === 0) return;
    onImportSuccess(parseResult.parsedOrders);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                出貨明細 Excel 匯入 (F01)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                支援 .xlsx, .xls, .csv • 品號/批號文字前導零保留 • 嚴格防呆阻擋
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
          {/* Top Actions: Template Download & Demo presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs text-slate-700 font-medium">
                欄位規範：單號、日期、客戶、品號、規格、批號、應出數量及單位
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={downloadManifestTemplate}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>下載標準範本 (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemoDataset(false)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium px-2.5 py-1.5 rounded-lg transition"
              >
                載入正常範例
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemoDataset(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium px-2.5 py-1.5 rounded-lg transition"
              >
                載入異常防呆範例 (測 F01 阻擋)
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              id="manifest-file-upload"
              className="hidden"
            />
            <label htmlFor="manifest-file-upload" className="cursor-pointer block">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-800 block">
                拖曳出貨明細 Excel 檔案至此，或點擊選擇檔案
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                格式要求：品號與批號請設為文字格式，系統將完整保留前導零 (如 004821)
              </span>
            </label>
          </div>

          {/* Preview Results */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{parseResult.fileName}</span>
                  <span className="text-slate-500">總筆數: {parseResult.totalRows}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    ✓ 合格: {parseResult.validRows.length} 筆
                  </span>
                  {parseResult.invalidRows.length > 0 && (
                    <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold animate-pulse">
                      ✕ 異常: {parseResult.invalidRows.length} 筆 (禁止進入核對)
                    </span>
                  )}
                </div>
              </div>

              {/* F01 Acceptance Standard: Invalid Rows List */}
              {parseResult.invalidRows.length > 0 && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold mb-2">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>F01 驗收標準防呆阻擋：以下筆數格式錯誤或數量不合法，禁止匯入！</span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    {parseResult.invalidRows.map((row, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded border border-rose-200 text-rose-700">
                        <span className="font-bold mr-2">[第 {row.rowNumber} 列]</span>
                        <span>單號: {row.shippingNo || '(空)'} • 品號: {row.partNo || '(空)'} • 原因: </span>
                        <span className="font-bold underline">{row.errors.join('； ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {parseResult.validRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between">
                    <span>即將進入核對之合格出貨明細清單</span>
                    <span className="text-emerald-700 font-mono">保留前導零確認完畢</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">列號</th>
                          <th className="py-2 px-3">出貨單號</th>
                          <th className="py-2 px-3">客戶</th>
                          <th className="py-2 px-3 text-blue-700">品號 (保留前導零)</th>
                          <th className="py-2 px-3">規格</th>
                          <th className="py-2 px-3">批號</th>
                          <th className="py-2 px-3 text-right">應出數量</th>
                          <th className="py-2 px-3">單位</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.validRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{r.shippingNo}</td>
                            <td className="py-2 px-3 font-sans text-slate-800">{r.customer}</td>
                            <td className="py-2 px-3 font-bold text-blue-700 tracking-wider">{r.partNo}</td>
                            <td className="py-2 px-3 font-sans text-slate-600 max-w-[160px] truncate">{r.spec}</td>
                            <td className="py-2 px-3 text-slate-800">{r.batchNo}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">{r.planQty}</td>
                            <td className="py-2 px-3 text-slate-500">{r.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-[11px] text-slate-500">
            F01 規格：禁止任何不合法列進入核對，確保出貨資料來源 100% 準確
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parseResult || parseResult.validRows.length === 0}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>匯入合格出貨單 (共 {parseResult?.validRows.length || 0} 筆)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
