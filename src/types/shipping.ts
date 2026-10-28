/**
 * Types & Domain Interfaces for Smart Shipping Manifest & Label Verification System
 * (出貨明細與實際標籤智慧核對系統)
 */

export type UserRole = 
  | 'SHIPPING_STAFF'    // 出貨人員: 箱號登錄、清點數量、拍照/上傳、執行比對
  | 'DATA_ADMIN'        // 資料負責人: 匯入出貨明細、更新明細改單 (版本管理)
  | 'QC_REVIEWER'       // 指定人員 (品管複核): 模糊標籤人工確認、異常處置複核
  | 'SUPERVISOR';       // 授權主管: 審核放行、查閱統計報表與稽核紀錄

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
}

// F09: 放行狀態
export type ReleaseStatus =
  | 'PENDING_VERIFICATION'       // 待核對 (尚有箱未完成比對)
  | 'PENDING_MANUAL_REVIEW'      // 待人工確認 (標籤辨識模糊或缺漏)
  | 'ANOMALOUS'                  // 異常 (品號/批號/規格/數量不符)
  | 'PENDING_SUPERVISOR_REVIEW'  // 待複核 (異常已處置，待品管/主管複核結案)
  | 'READY_FOR_RELEASE'          // 可放行 (全部相符，各項條件齊全)
  | 'RELEASED';                  // 已放行 (主管已執行放行簽署)

// F01: 出貨明細單行項目
export interface ShippingOrderItem {
  itemId: string;
  partNo: string;     // 品號 (保留前導零文字)
  spec: string;       // 規格
  batchNo: string;    // 批號 (保留前導零文字)
  planQty: number;    // 應出數量 (> 0)
  unit: string;       // 單位 (PCS, SET, KG, etc.)
}

// 標籤 OCR 擷取結果
export interface LabelOcrResult {
  boxNo: string;
  partNo: string;     // 保持字串，保留前導零
  spec: string;
  batchNo: string;
  labelQty: number;
  unit: string;
  confidence: number; // 0.0 ~ 1.0
  notes?: string;
  isManualEdited?: boolean;
}

// 人工修正歷程
export interface ManualEditLog {
  editedAt: string;
  editedBy: string;
  field: string;
  originalValue: string | number;
  newValue: string | number;
  reason: string;
}

// 標籤影像與辨識證據
export interface LabelEvidence {
  photoUrl: string;             // 標籤原圖 (DataURL/URL)
  capturedAt: string;
  capturedBy: string;
  ocrResult: LabelOcrResult;
  manualEditHistory: ManualEditLog[];
  reviewStatus: 'PENDING_OCR' | 'PENDING_MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// 單一欄位比對明細
export interface FieldComparison {
  field: 'partNo' | 'spec' | 'batchNo' | 'qty' | 'unit';
  label: string;
  expectedValue: string | number;
  actualValue: string | number;
  isMatch: boolean;
  ruleName: string;
  detailMessage: string;
}

// 箱比對結果
export interface BoxComparisonResult {
  overallMatch: boolean;
  status: 'PASS' | 'MISMATCH' | 'PENDING_EVIDENCE' | 'PENDING_MANUAL_REVIEW' | 'RECHECK_REQUIRED';
  comparisons: FieldComparison[];
  qtyDifference: number; // actualCountQty - labelQty
  hasAnomaly: boolean;
  anomalySummary?: string;
}

// F02: 逐箱裝箱登錄紀錄
export interface BoxRecord {
  id: string;
  boxNo: string;              // 唯一箱號 (e.g. "BOX-20261027-001")
  shippingNo: string;         // 所屬出貨單號
  itemId: string;             // 對應出貨單項目
  partNo: string;             // 品號
  spec: string;               // 規格
  batchNo: string;            // 批號
  actualCountQty: number;     // 現場清點實際數量 (可為尾箱特殊量)
  unit: string;               // 單位
  isTailBox?: boolean;        // 是否為尾箱 (Tail Box)
  loggedBy: string;           // 登錄人
  loggedAt: string;           // 登錄時間
  evidence?: LabelEvidence;   // 標籤證據與 OCR
  comparison?: BoxComparisonResult; // 比對判定結果
  recheckRequired?: boolean;  // 改單後需重新核對標記
  version: number;            // 箱紀錄版本
}

// F07: 異常記錄
export type AnomalyType =
  | 'PART_NO_MISMATCH'        // 品號不符
  | 'BATCH_NO_MISMATCH'       // 批號不符
  | 'SPEC_MISMATCH'           // 規格不符
  | 'BOX_QTY_MISMATCH'        // 標籤數量與該箱清點數量不符
  | 'TOTAL_QTY_MISMATCH'      // 逐箱加總與應出數量不符 (短少/溢裝)
  | 'UNIT_MISMATCH'           // 單位不一致
  | 'LABEL_UNCLEAR'           // 標籤模糊或缺漏
  | 'DUPLICATE_BOX_NO'        // 重複箱號
  | 'MISSING_LABEL_EVIDENCE'  // 未附標籤證據
  | 'MISSING_COUNT_QTY';      // 未清點數量

export type AnomalyStatus = 'OPEN' | 'CORRECTED' | 'RESOLVED';

export interface AnomalyRecord {
  id: string;
  shippingNo: string;
  boxNo?: string;
  type: AnomalyType;
  title: string;
  discrepancyDetail: string;   // 差異內容 (應有 vs 實際)
  expectedVal: string;
  actualVal: string;
  owner: string;               // 負責人
  createdAt: string;
  status: AnomalyStatus;
  
  // 處置紀錄
  correctionMethod?: string;   // 處理方式 (更換外箱/重印標籤/修正清點/特採)
  beforeCorrection?: string;   // 修正前內容
  afterCorrection?: string;    // 修正後內容
  correctedBy?: string;
  correctedAt?: string;

  // 複核結果
  reviewer?: string;           // 指定複核人員
  reviewedAt?: string;
  reviewResult?: 'PASS' | 'REJECT';
  reviewComments?: string;

  auditLog: {
    timestamp: string;
    operator: string;
    action: string;
    note: string;
  }[];
}

// F08: 改單版次紀錄
export interface VersionHistory {
  version: string;             // "V1", "V2"
  modifiedAt: string;
  modifiedBy: string;
  changeSummary: string;       // 變更內容說明
  affectedBoxesCount: number;
}

// 放行憑單資訊
export interface ReleaseCertificate {
  certificateNo: string;
  releasedBy: string;
  releasedAt: string;
  supervisorSignature: string;
  totalBoxes: number;
  totalPlanQty: number;
  totalActualQty: number;
  unit: string;
  remarks: string;
}

// 出貨單主表
export interface ShippingOrder {
  id: string;
  shippingNo: string;          // 單號 (e.g. "SO-20261027-01")
  date: string;                // 出貨日期
  customer: string;            // 客戶名稱
  warehouseArea: string;       // 出貨庫區
  version: string;             // 當前版次 (V1, V2...)
  status: ReleaseStatus;       // 當前放行狀態
  items: ShippingOrderItem[];  // 明細項目
  boxes: BoxRecord[];          // 逐箱裝箱紀錄
  anomalies: AnomalyRecord[];  // 異常清單
  history: VersionHistory[];   // 改單歷程
  releaseCertificate?: ReleaseCertificate;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  
  // F11 成效統計時間戳記
  verificationStartedAt?: string;
  verificationFinishedAt?: string;
  anomalyClosedAt?: string;
}

// F11: 成效指標摘要
export interface VerificationMetrics {
  totalOrders: number;
  totalBoxesChecked: number;
  avgVerificationTimeSeconds: number; // 系統導入後工時
  baselineTimeSeconds: number;        // 改善前工時 (基準，例如45分=2700秒)
  timeReductionPercent: number;       // 改善比例 (目標 30%+)
  recordCompletenessPercent: number;  // 必要紀錄完整率 (目標 100%)
  anomalyDetectionRate: number;       // 異常檢出率 %
  falsePositiveRate: number;          // 誤報率 % (經人工確認後非真實異常的比例)
  anomalyTypeBreakdown: Record<string, number>;
}
