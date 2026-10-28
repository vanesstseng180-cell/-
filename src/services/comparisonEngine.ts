import { 
  BoxRecord, 
  ShippingOrder, 
  ShippingOrderItem, 
  FieldComparison, 
  BoxComparisonResult,
  AnomalyRecord,
  ReleaseStatus,
  AnomalyType
} from '../types/shipping';

/**
 * Normalizes text for comparison while preserving leading zeros
 */
export function normalizeZeroPreservingText(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Normalizes specification text (collapse multiple spaces, trim, case insensitive)
 */
export function normalizeSpec(spec: string | undefined | null): string {
  if (!spec) return '';
  return spec.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes units (e.g. PCS, pcs, Pcs -> PCS)
 */
export function normalizeUnit(unit: string | undefined | null): string {
  if (!unit) return '';
  return unit.trim().toUpperCase();
}

/**
 * Executes deterministic comparison for a single box against its manifest item and count (F04, F05)
 */
export function compareBoxRecord(
  box: BoxRecord,
  item: ShippingOrderItem | undefined
): BoxComparisonResult {
  // If no manifest item exists
  if (!item) {
    return {
      overallMatch: false,
      status: 'MISMATCH',
      comparisons: [],
      qtyDifference: 0,
      hasAnomaly: true,
      anomalySummary: '無法對應出貨明細項目',
    };
  }

  // If recheck is required due to manifest revision (F08)
  if (box.recheckRequired) {
    return {
      overallMatch: false,
      status: 'RECHECK_REQUIRED',
      comparisons: [],
      qtyDifference: 0,
      hasAnomaly: true,
      anomalySummary: '出貨明細已改單，需重新核對',
    };
  }

  // If evidence or OCR is missing (F06)
  if (!box.evidence || !box.evidence.ocrResult) {
    return {
      overallMatch: false,
      status: 'PENDING_EVIDENCE',
      comparisons: [],
      qtyDifference: 0,
      hasAnomaly: true,
      anomalySummary: '尚未拍攝/上傳實際外箱標籤證據',
    };
  }

  // If OCR requires manual verification (F03)
  if (box.evidence.reviewStatus === 'PENDING_MANUAL_REVIEW') {
    return {
      overallMatch: false,
      status: 'PENDING_MANUAL_REVIEW',
      comparisons: [],
      qtyDifference: 0,
      hasAnomaly: true,
      anomalySummary: '標籤影像模糊或欄位缺漏，待人工確認',
    };
  }

  const ocr = box.evidence.ocrResult;
  const comparisons: FieldComparison[] = [];

  // 1. Part No Comparison (精確比對，嚴格保留前導零)
  const expectedPartNo = normalizeZeroPreservingText(item.partNo);
  const actualPartNo = normalizeZeroPreservingText(ocr.partNo);
  const partNoMatch = expectedPartNo === actualPartNo;
  comparisons.push({
    field: 'partNo',
    label: '品號 (Part No)',
    expectedValue: expectedPartNo,
    actualValue: actualPartNo,
    isMatch: partNoMatch,
    ruleName: '固定規則：文字精確比對 (保留前導零)',
    detailMessage: partNoMatch
      ? '品號相符'
      : `品號不符！明細要求 [${expectedPartNo}]，標籤辨識為 [${actualPartNo}]`,
  });

  // 2. Batch No Comparison (精確比對，保留前導零與英數字)
  const expectedBatchNo = normalizeZeroPreservingText(item.batchNo);
  const actualBatchNo = normalizeZeroPreservingText(ocr.batchNo);
  const batchNoMatch = expectedBatchNo === actualBatchNo;
  comparisons.push({
    field: 'batchNo',
    label: '批號 (Batch No)',
    expectedValue: expectedBatchNo,
    actualValue: actualBatchNo,
    isMatch: batchNoMatch,
    ruleName: '固定規則：文字精確比對 (大小寫與前導零)',
    detailMessage: batchNoMatch
      ? '批號相符'
      : `批號不符！明細要求 [${expectedBatchNo}]，標籤辨識為 [${actualBatchNo}]`,
  });

  // 3. Spec Comparison (規格比對：去除空白正規化)
  const normExpectedSpec = normalizeSpec(item.spec);
  const normActualSpec = normalizeSpec(ocr.spec);
  const specMatch = normExpectedSpec === normActualSpec;
  comparisons.push({
    field: 'spec',
    label: '規格 (Specification)',
    expectedValue: item.spec,
    actualValue: ocr.spec,
    isMatch: specMatch,
    ruleName: '固定規則：空白正規化比對',
    detailMessage: specMatch
      ? '規格相符'
      : `規格不符！明細為 [${item.spec}]，標籤為 [${ocr.spec}]`,
  });

  // 4. Unit Comparison (單位一致性檢查)
  const normExpectedUnit = normalizeUnit(item.unit);
  const normActualUnit = normalizeUnit(ocr.unit || box.unit);
  const unitMatch = normExpectedUnit === normActualUnit;
  comparisons.push({
    field: 'unit',
    label: '單位 (Unit)',
    expectedValue: normExpectedUnit,
    actualValue: normActualUnit,
    isMatch: unitMatch,
    ruleName: '固定規則：單位代碼一致性',
    detailMessage: unitMatch
      ? '單位一致'
      : `單位不一致！明細為 [${normExpectedUnit}]，標籤為 [${normActualUnit}]，禁止直接加總！`,
  });

  // 5. Quantity Comparison - Box Level (F05: 標籤數量與該箱清點數量核對)
  const expectedBoxQty = Number(box.actualCountQty);
  const actualLabelQty = Number(ocr.labelQty);
  const boxQtyMatch = expectedBoxQty === actualLabelQty;
  const qtyDiff = expectedBoxQty - actualLabelQty;
  comparisons.push({
    field: 'qty',
    label: '單箱數量核對 (清點 vs 標籤)',
    expectedValue: expectedBoxQty,
    actualValue: actualLabelQty,
    isMatch: boxQtyMatch,
    ruleName: '固定規則：單箱標籤數量與清點數量核對',
    detailMessage: boxQtyMatch
      ? `單箱數量相符 (${expectedBoxQty} ${normExpectedUnit})`
      : `單箱數量不符！現場清點為 ${expectedBoxQty}，標籤標示為 ${actualLabelQty} (差異: ${qtyDiff > 0 ? '+' : ''}${qtyDiff})`,
  });

  const overallMatch = comparisons.every((c) => c.isMatch);

  return {
    overallMatch,
    status: overallMatch ? 'PASS' : 'MISMATCH',
    comparisons,
    qtyDifference: qtyDiff,
    hasAnomaly: !overallMatch,
    anomalySummary: overallMatch
      ? undefined
      : comparisons
          .filter((c) => !c.isMatch)
          .map((c) => c.detailMessage)
          .join('； '),
  };
}

/**
 * Checks for duplicate box numbers (F06)
 */
export function checkDuplicateBoxes(boxes: BoxRecord[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const b of boxes) {
    const key = b.boxNo.trim().toUpperCase();
    if (seen.has(key)) {
      duplicates.add(b.boxNo);
    } else {
      seen.add(key);
    }
  }

  return Array.from(duplicates);
}

/**
 * Evaluates entire shipping order quantities and verification status (F05, F06, F09)
 */
export function evaluateOrderState(order: ShippingOrder): {
  updatedOrder: ShippingOrder;
  totalPlanQty: number;
  totalActualQty: number;
  qtyDifference: number;
  unitConsistent: boolean;
  canRelease: boolean;
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];

  // Calculate total plan qty
  const totalPlanQty = order.items.reduce((sum, item) => sum + Number(item.planQty || 0), 0);
  
  // Calculate total count qty from boxes
  const totalActualQty = order.boxes.reduce((sum, b) => sum + Number(b.actualCountQty || 0), 0);
  const qtyDifference = totalActualQty - totalPlanQty;

  // Check unit consistency
  const itemUnits = new Set(order.items.map((i) => normalizeUnit(i.unit)));
  const boxUnits = new Set(order.boxes.map((b) => normalizeUnit(b.unit)));
  const unitConsistent = itemUnits.size <= 1 && (boxUnits.size === 0 || (boxUnits.size === 1 && itemUnits.has(Array.from(boxUnits)[0])));

  if (!unitConsistent) {
    blockingReasons.push('出貨明細與裝箱單位不一致，禁止直接累計加總');
  }

  // Duplicate box check (F06)
  const duplicates = checkDuplicateBoxes(order.boxes);
  if (duplicates.length > 0) {
    blockingReasons.push(`發現重複箱號：${duplicates.join(', ')}，必須修正`);
  }

  // Check if any box is missing
  if (order.boxes.length === 0) {
    blockingReasons.push('尚未登錄任何外箱紀錄');
  }

  let hasPendingEvidence = false;
  let hasPendingManualReview = false;
  let hasRecheckRequired = false;
  let hasBoxMismatch = false;

  const updatedBoxes = order.boxes.map((box) => {
    const item = order.items.find((i) => i.itemId === box.itemId) || order.items[0];
    const comparison = compareBoxRecord(box, item);

    if (comparison.status === 'PENDING_EVIDENCE') hasPendingEvidence = true;
    if (comparison.status === 'PENDING_MANUAL_REVIEW') hasPendingManualReview = true;
    if (comparison.status === 'RECHECK_REQUIRED') hasRecheckRequired = true;
    if (comparison.status === 'MISMATCH') hasBoxMismatch = true;

    return {
      ...box,
      comparison,
    };
  });

  if (hasPendingEvidence) {
    blockingReasons.push('尚有箱子未提供外箱標籤照片證據');
  }
  if (hasPendingManualReview) {
    blockingReasons.push('尚有標籤影像辨識模糊或缺漏，待指定人員人工確認');
  }
  if (hasRecheckRequired) {
    blockingReasons.push('出貨明細曾改單，受影響箱號需重新核對');
  }
  if (hasBoxMismatch) {
    blockingReasons.push('存在單箱品號、批號、規格或單箱數量不符之項目');
  }

  // Total Quantity Check (F05)
  if (totalActualQty !== totalPlanQty) {
    if (totalActualQty < totalPlanQty) {
      blockingReasons.push(`總數量短少！應出 ${totalPlanQty}，逐箱合計 ${totalActualQty} (短少 ${totalPlanQty - totalActualQty} 件)`);
    } else {
      blockingReasons.push(`總數量溢出！應出 ${totalPlanQty}，逐箱合計 ${totalActualQty} (溢裝 ${totalActualQty - totalPlanQty} 件)`);
    }
  }

  // Open anomalies check (F07)
  const openAnomalies = (order.anomalies || []).filter((a) => a.status === 'OPEN');
  const correctedAnomalies = (order.anomalies || []).filter((a) => a.status === 'CORRECTED');

  if (openAnomalies.length > 0) {
    blockingReasons.push(`尚有 ${openAnomalies.length} 項異常尚未處置`);
  }
  if (correctedAnomalies.length > 0) {
    blockingReasons.push(`尚有 ${correctedAnomalies.length} 項異常已修正但尚未經品管/主管複核結案`);
  }

  // Determine overall status
  let newStatus: ReleaseStatus = order.status;

  if (order.status === 'RELEASED') {
    newStatus = 'RELEASED';
  } else if (hasPendingManualReview) {
    newStatus = 'PENDING_MANUAL_REVIEW';
  } else if (openAnomalies.length > 0 || hasBoxMismatch || totalActualQty !== totalPlanQty) {
    newStatus = 'ANOMALOUS';
  } else if (correctedAnomalies.length > 0) {
    newStatus = 'PENDING_SUPERVISOR_REVIEW';
  } else if (hasPendingEvidence || hasRecheckRequired || updatedBoxes.length === 0) {
    newStatus = 'PENDING_VERIFICATION';
  } else if (blockingReasons.length === 0) {
    newStatus = 'READY_FOR_RELEASE';
  } else {
    newStatus = 'PENDING_VERIFICATION';
  }

  const canRelease = blockingReasons.length === 0 && newStatus === 'READY_FOR_RELEASE';

  const updatedOrder: ShippingOrder = {
    ...order,
    boxes: updatedBoxes,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedOrder,
    totalPlanQty,
    totalActualQty,
    qtyDifference,
    unitConsistent,
    canRelease,
    blockingReasons,
  };
}

/**
 * Creates an anomaly record with audit trail (F07)
 */
export function createAnomalyRecord(
  shippingNo: string,
  boxNo: string | undefined,
  type: AnomalyType,
  title: string,
  discrepancyDetail: string,
  expectedVal: string,
  actualVal: string,
  owner: string
): AnomalyRecord {
  const now = new Date().toISOString();
  return {
    id: `ANO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    shippingNo,
    boxNo,
    type,
    title,
    discrepancyDetail,
    expectedVal,
    actualVal,
    owner,
    createdAt: now,
    status: 'OPEN',
    auditLog: [
      {
        timestamp: now,
        operator: owner,
        action: '異常建立',
        note: `系統檢出異常：${title} (${discrepancyDetail})`,
      },
    ],
  };
}
