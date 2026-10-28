import React, { useState, useRef, useEffect } from 'react';
import { 
  BoxRecord, 
  ShippingOrder, 
  LabelEvidence, 
  UserProfile 
} from '../types/shipping';
import { 
  performLabelOcr, 
  generateSyntheticLabelImage 
} from '../services/ocrService';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  RefreshCw,
  Zap,
  Image as ImageIcon
} from 'lucide-react';

interface LabelScannerModalProps {
  box: BoxRecord;
  order: ShippingOrder;
  currentUser: UserProfile;
  onSaveEvidence: (boxId: string, evidence: LabelEvidence) => void;
  onClose: () => void;
}

export const LabelScannerModal: React.FC<LabelScannerModalProps> = ({
  box,
  order,
  currentUser,
  onSaveEvidence,
  onClose,
}) => {
  const [activeMode, setActiveMode] = useState<'SIMULATOR' | 'CAMERA' | 'UPLOAD'>('SIMULATOR');
  const [capturedImage, setCapturedImage] = useState<string | null>(box.evidence?.photoUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(box.evidence?.ocrResult || null);
  const [ocrSource, setOcrSource] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const manifestItem = order.items.find((i) => i.itemId === box.itemId) || order.items[0];

  // Start Camera when CAMERA mode is selected
  useEffect(() => {
    if (activeMode === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('無法存取相機或瀏覽器未授權。建議改用「上傳照片」或「內建模擬標籤」。');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      processImageOcr(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      processImageOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Generate synthetic label for testing
  const handlePickSimulatedLabel = (type: 'NORMAL' | 'BLURRY' | 'WRONG_BATCH' | 'WRONG_QTY' | 'WRONG_PART') => {
    let partNo = manifestItem.partNo;
    let batchNo = manifestItem.batchNo;
    let qty = box.actualCountQty;
    let isBlurry = false;

    if (type === 'BLURRY') {
      isBlurry = true;
    } else if (type === 'WRONG_BATCH') {
      batchNo = '202610X99';
    } else if (type === 'WRONG_QTY') {
      qty = box.actualCountQty + 20;
    } else if (type === 'WRONG_PART') {
      partNo = '009999';
    }

    const dataUrl = generateSyntheticLabelImage({
      boxNo: box.boxNo,
      partNo,
      spec: manifestItem.spec,
      batchNo,
      qty,
      unit: box.unit,
      isBlurry,
    });

    setCapturedImage(dataUrl);
    processImageOcr(dataUrl, {
      boxNo: box.boxNo,
      partNo,
      spec: manifestItem.spec,
      batchNo,
      labelQty: qty,
      unit: box.unit,
      isBlurry,
    });
  };

  const processImageOcr = async (imageDataUrl: string, hints?: any) => {
    setIsProcessing(true);
    setOcrResult(null);

    try {
      const res = await performLabelOcr(
        imageDataUrl,
        hints?.boxNo || box.boxNo,
        hints?.partNo || manifestItem.partNo,
        hints?.batchNo || manifestItem.batchNo,
        hints?.spec || manifestItem.spec,
        hints?.labelQty !== undefined ? hints.labelQty : box.actualCountQty,
        hints?.unit || box.unit
      );

      if (hints?.isBlurry) {
        res.ocrResult.confidence = 0.58;
        res.ocrResult.notes = '標籤影像污損模糊，辨識信心度低於門檻 (0.7)';
      }

      setOcrResult(res.ocrResult);
      setOcrSource(res.source === 'GEMINI_AI' ? 'Gemini 3.8 Flash 智慧視覺辨識' : '高精度標籤特徵比對引擎');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = () => {
    if (!capturedImage || !ocrResult) return;

    // F03: 缺漏、模糊或對應不明者標為「待人工確認」，不得自動通過
    const isBlurry = ocrResult.confidence < 0.70;
    const hasMissingFields = !ocrResult.partNo || !ocrResult.batchNo || !ocrResult.labelQty;
    const reviewStatus = isBlurry || hasMissingFields ? 'PENDING_MANUAL_REVIEW' : 'VERIFIED';

    const evidence: LabelEvidence = {
      photoUrl: capturedImage,
      capturedAt: new Date().toISOString(),
      capturedBy: currentUser.name,
      ocrResult,
      manualEditHistory: box.evidence?.manualEditHistory || [],
      reviewStatus,
      reviewNote: isBlurry ? '信心度偏低，標為待人工確認' : undefined,
    };

    onSaveEvidence(box.id, evidence);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                外箱標籤拍照辨識 (F03) - 箱號: {box.boxNo}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                清點數量: {box.actualCountQty} {box.unit} • 保留前導零 OCR 擷取與原圖存證
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

        {/* Mode Tabs */}
        <div className="border-b border-slate-200 bg-slate-100/60 px-5 pt-2 flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveMode('SIMULATOR')}
            className={`pb-2.5 px-1 border-b-2 transition flex items-center gap-1.5 ${
              activeMode === 'SIMULATOR'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>智能標籤產生器 (迅速驗收)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('CAMERA')}
            className={`pb-2.5 px-1 border-b-2 transition flex items-center gap-1.5 ${
              activeMode === 'CAMERA'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>手機/視訊相機拍照</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('UPLOAD')}
            className={`pb-2.5 px-1 border-b-2 transition flex items-center gap-1.5 ${
              activeMode === 'UPLOAD'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>上傳照片檔案</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6">
          {/* Mode 1: Simulator Quick Buttons */}
          {activeMode === 'SIMULATOR' && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
              <span className="text-xs font-bold text-blue-900 block mb-2">
                ⚡ 一鍵產生標準工業外箱標籤 (含條碼、料號前導零、檢驗戳章)：
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handlePickSimulatedLabel('NORMAL')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-xs transition"
                >
                  產生「標準相符」標籤 (100% Match)
                </button>
                <button
                  type="button"
                  onClick={() => handlePickSimulatedLabel('BLURRY')}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-xs transition"
                >
                  產生「模糊污損」標籤 (測 F03 待人工確認)
                </button>
                <button
                  type="button"
                  onClick={() => handlePickSimulatedLabel('WRONG_BATCH')}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-xs transition"
                >
                  產生「批號錯誤」標籤 (測 F04/F07 異常)
                </button>
                <button
                  type="button"
                  onClick={() => handlePickSimulatedLabel('WRONG_QTY')}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-xs transition"
                >
                  產生「標籤數量不符」 (測 F05 單箱不符)
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Camera Feed */}
          {activeMode === 'CAMERA' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] max-w-md mx-auto border-2 border-slate-700">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-lg pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] text-white/80 bg-black/50 px-2 py-1 rounded">
                      請將外箱標籤置於框內
                    </span>
                  </div>
                </div>
              )}
              <div className="text-center">
                <button
                  type="button"
                  onClick={captureCameraSnapshot}
                  disabled={!!cameraError}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>拍照並執行 OCR 辨識</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: Upload Photo */}
          {activeMode === 'UPLOAD' && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                id="file-upload-input"
                className="hidden"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-800 block">
                  點擊或拖曳外箱標籤照片至此
                </span>
                <span className="text-xs text-slate-500 block mt-1">
                  支援 JPG, PNG, WEBP (手機拍攝支援相機原圖)
                </span>
              </label>
            </div>
          )}

          {/* Side-by-Side: Captured Photo vs OCR Result */}
          {capturedImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
              {/* Photo Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>外箱標籤原圖 (Evidence Photo)</span>
                  <span className="text-[10px] text-slate-400 font-mono">已保留存檔</span>
                </div>
                <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-900 aspect-[4/3] flex items-center justify-center relative">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                      <span className="text-xs font-semibold">Gemini 視覺模型解析標籤中...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Recognition Result */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">OCR 結構化解析結果 (F03)</span>
                  {ocrResult && (
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-medium ${
                      ocrResult.confidence >= 0.7
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800 font-bold'
                    }`}>
                      信心度: {Math.round(ocrResult.confidence * 100)}%
                    </span>
                  )}
                </div>

                {isProcessing ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                    正在擷取箱號、品號、規格、批號與標示數量...
                  </div>
                ) : ocrResult ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-sans">箱號:</span>
                      <span className="font-bold text-slate-900">{ocrResult.boxNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-sans">品號 (保留前導零):</span>
                      <span className="font-bold text-blue-700 text-sm tracking-wide">{ocrResult.partNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-sans">規格:</span>
                      <span className="font-medium text-slate-800 text-right">{ocrResult.spec}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-sans">批號:</span>
                      <span className="font-semibold text-slate-900">{ocrResult.batchNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-sans">標籤標示數量:</span>
                      <span className="font-bold text-emerald-700 text-base">
                        {ocrResult.labelQty} {ocrResult.unit}
                      </span>
                    </div>

                    {ocrResult.confidence < 0.7 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-sans text-[11px] flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">F03 規格要求：辨識信心度未達門檻</span>
                          <span>標籤模糊或缺漏時將標記為「待人工確認」，系統禁止自動放行。</span>
                        </div>
                      </div>
                    )}

                    {ocrSource && (
                      <div className="text-[10px] text-slate-400 font-sans pt-1">
                        辨識引擎: {ocrSource}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                    尚未執行辨識，請選取上方模擬標籤或拍照/上傳照片。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-[11px] text-slate-500">
            F06 規範：重拍覆蓋不會重複增加箱數，登錄人為 {currentUser.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={!capturedImage || !ocrResult || isProcessing}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>確認保存標籤證據並比對 (F04)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
