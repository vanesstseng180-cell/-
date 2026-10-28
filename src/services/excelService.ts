import * as XLSX from 'xlsx';
import { ShippingOrder, ShippingOrderItem, BoxRecord, AnomalyRecord } from '../types/shipping';

export interface ManifestImportRow {
  rowNumber: number;
  shippingNo: string;
  date: string;
  customer: string;
  warehouseArea?: string;
  partNo: string;
  spec: string;
  batchNo: string;
  planQty: number;
  unit: string;
  isValid: boolean;
  errors: string[];
}

export interface ParseManifestResult {
  fileName: string;
  totalRows: number;
  validRows: ManifestImportRow[];
  invalidRows: ManifestImportRow[];
  parsedOrders: Partial<ShippingOrder>[];
}

/**
 * Parses Excel / CSV buffer or ArrayBuffer into validated rows with leading zero preservation (F01)
 */
export function parseManifestExcel(fileData: ArrayBuffer, fileName: string): ParseManifestResult {
  const workbook = XLSX.read(fileData, {
    type: 'array',
    raw: false, // Ensures numbers with leading zeros are read as strings if formatted as text
    cellText: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of arrays to have direct control over header and row indices
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rawData.length < 2) {
    return {
      fileName,
      totalRows: 0,
      validRows: [],
      invalidRows: [
        {
          rowNumber: 1,
          shippingNo: '',
          date: '',
          customer: '',
          partNo: '',
          spec: '',
          batchNo: '',
          planQty: 0,
          unit: '',
          isValid: false,
          errors: ['檔案內容為空或缺少欄位標題列'],
        },
      ],
      parsedOrders: [],
    };
  }

  // Header row detection
  const headerRow = rawData[0].map((h: any) => String(h).trim().toLowerCase());
  
  // Find column indexes with flexible header aliases
  const findCol = (aliases: string[]): number => {
    return headerRow.findIndex((col: string) =>
      aliases.some((alias) => col.includes(alias.toLowerCase()))
    );
  };

  const colShippingNo = findCol(['單號', '出貨單號', 'shippingno', 'docno', 'order_no']);
  const colDate = findCol(['日期', '出貨日期', 'date', 'ship_date']);
  const colCustomer = findCol(['客戶', '客戶名稱', 'customer', 'client']);
  const colPartNo = findCol(['品號', '料號', 'partno', 'itemno', 'part_no', 'p/n']);
  const colSpec = findCol(['規格', '規格說明', 'spec', 'description', 'model']);
  const colBatchNo = findCol(['批號', '生產批號', 'batchno', 'lotno', 'lot_no', 'batch']);
  const colPlanQty = findCol(['應出數量', '數量', 'planqty', 'qty', 'quantity']);
  const colUnit = findCol(['單位', 'unit', 'uom']);
  const colWarehouse = findCol(['庫區', '出貨庫區', 'warehouse', 'area']);

  const validRows: ManifestImportRow[] = [];
  const invalidRows: ManifestImportRow[] = [];

  for (let r = 1; r < rawData.length; r++) {
    const row = rawData[r];
    // Skip completely empty rows
    if (row.every((cell: any) => String(cell).trim() === '')) {
      continue;
    }

    const rowNumber = r + 1; // 1-based row number in Excel
    const errors: string[] = [];

    const shippingNo = colShippingNo !== -1 ? String(row[colShippingNo] || '').trim() : '';
    const date = colDate !== -1 ? String(row[colDate] || '').trim() : '';
    const customer = colCustomer !== -1 ? String(row[colCustomer] || '').trim() : '';
    const warehouseArea = colWarehouse !== -1 ? String(row[colWarehouse] || '').trim() : 'A1 出貨檢驗區';
    
    // Preserve leading zeros strictly for PartNo and BatchNo
    const partNo = colPartNo !== -1 ? String(row[colPartNo] ?? '').trim() : '';
    const spec = colSpec !== -1 ? String(row[colSpec] || '').trim() : '';
    const batchNo = colBatchNo !== -1 ? String(row[colBatchNo] ?? '').trim() : '';
    const rawQty = colPlanQty !== -1 ? row[colPlanQty] : '';
    const unit = colUnit !== -1 ? String(row[colUnit] || '').trim() : 'PCS';

    // Validation rules
    if (!shippingNo) {
      errors.push('缺少「出貨單號」');
    }
    if (!date) {
      errors.push('缺少「出貨日期」');
    }
    if (!customer) {
      errors.push('缺少「客戶」名稱');
    }
    if (!partNo) {
      errors.push('缺少「品號」');
    }
    if (!spec) {
      errors.push('缺少「規格」');
    }
    if (!batchNo) {
      errors.push('缺少「批號」');
    }

    // Quantity validation (F01: 數量不合法時提示並禁止進入核對)
    const parsedQty = Number(String(rawQty).replace(/,/g, ''));
    if (rawQty === '' || isNaN(parsedQty) || parsedQty <= 0) {
      errors.push(`應出數量不合法 (輸入值: "${rawQty}")，必須為大於 0 之正整數`);
    }

    if (!unit) {
      errors.push('缺少「單位」');
    }

    const itemRow: ManifestImportRow = {
      rowNumber,
      shippingNo,
      date,
      customer,
      warehouseArea,
      partNo,
      spec,
      batchNo,
      planQty: isNaN(parsedQty) ? 0 : parsedQty,
      unit,
      isValid: errors.length === 0,
      errors,
    };

    if (itemRow.isValid) {
      validRows.push(itemRow);
    } else {
      invalidRows.push(itemRow);
    }
  }

  // Group valid rows by shippingNo into structured ShippingOrder candidates
  const orderMap = new Map<string, Partial<ShippingOrder>>();
  for (const row of validRows) {
    if (!orderMap.has(row.shippingNo)) {
      orderMap.set(row.shippingNo, {
        shippingNo: row.shippingNo,
        date: row.date,
        customer: row.customer,
        warehouseArea: row.warehouseArea || 'A1 出貨檢驗區',
        version: 'V1',
        status: 'PENDING_VERIFICATION',
        items: [],
        boxes: [],
        anomalies: [],
        history: [
          {
            version: 'V1',
            modifiedAt: new Date().toISOString(),
            modifiedBy: '系統匯入',
            changeSummary: `初始 Excel 匯入建立 (共計 ${validRows.filter(r => r.shippingNo === row.shippingNo).length} 筆明細)`,
            affectedBoxesCount: 0,
          },
        ],
      });
    }

    const currentOrder = orderMap.get(row.shippingNo)!;
    const newItem: ShippingOrderItem = {
      itemId: `ITEM-${currentOrder.items!.length + 1}`,
      partNo: row.partNo,
      spec: row.spec,
      batchNo: row.batchNo,
      planQty: row.planQty,
      unit: row.unit,
    };
    currentOrder.items!.push(newItem);
  }

  return {
    fileName,
    totalRows: validRows.length + invalidRows.length,
    validRows,
    invalidRows,
    parsedOrders: Array.from(orderMap.values()),
  };
}

/**
 * Downloads a standard Excel import template (F01)
 */
export function downloadManifestTemplate(): void {
  const headers = [
    '出貨單號',
    '出貨日期',
    '客戶名稱',
    '品號(文字保留前導零)',
    '規格說明',
    '批號',
    '應出數量',
    '單位',
    '出貨庫區',
  ];

  const sampleRows = [
    [
      'SO-20261028-01',
      '2026-10-28',
      '台積創新智能科技',
      '004821', // Leading zero text
      'M4*12 SUS304 耐高溫防鏽螺柱',
      '202610A01',
      1000,
      'PCS',
      'A1 智能出貨區',
    ],
    [
      'SO-20261028-02',
      '2026-10-28',
      '廣達智能伺服器事業部',
      '008912', // Leading zero text
      'PCBA 散熱固定導軌模組 V2',
      '202610B05',
      500,
      'PCS',
      'B2 重件包裝區',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 32 },
    { wch: 16 },
    { wch: 12 },
    { wch: 8 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '出貨明細範本');

  XLSX.writeFile(wb, '出貨明細標準匯入範本.xlsx');
}

/**
 * Exports comprehensive verification report to Excel (F10)
 */
export function exportVerificationExcel(order: ShippingOrder): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 出貨總覽
  const totalActualQty = order.boxes.reduce((sum, b) => sum + (b.actualCountQty || 0), 0);
  const totalPlanQty = order.items.reduce((sum, i) => sum + (i.planQty || 0), 0);
  const qtyDiff = totalActualQty - totalPlanQty;

  const summaryData = [
    ['出貨明細與外箱標籤智慧核對報告'],
    ['產生時間', new Date().toLocaleString()],
    ['出貨單號', order.shippingNo],
    ['客戶名稱', order.customer],
    ['出貨日期', order.date],
    ['目前版次', order.version],
    ['出貨庫區', order.warehouseArea],
    ['放行狀態', order.status],
    ['應出總量', totalPlanQty],
    ['清點實出加總', totalActualQty],
    ['數量差額', qtyDiff === 0 ? '相符 (0)' : qtyDiff > 0 ? `溢裝 (+${qtyDiff})` : `短少 (${qtyDiff})`],
    ['登錄總箱數', order.boxes.length],
    ['放行憑證號', order.releaseCertificate?.certificateNo || '尚未放行'],
    ['放行主管', order.releaseCertificate?.releasedBy || '-'],
    ['放行簽署時間', order.releaseCertificate?.releasedAt || '-'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, '出貨單總覽');

  // Sheet 2: 逐箱核對明細表 (F04, F05, F06)
  const boxHeaders = [
    '箱號',
    '品號(應有)',
    '品號(標籤)',
    '品號判定',
    '批號(應有)',
    '批號(標籤)',
    '批號判定',
    '規格(應有)',
    '規格(標籤)',
    '規格判定',
    '現場清點數量',
    '標籤標示數量',
    '單箱數量判定',
    '單位',
    '綜合判定',
    '登錄人員',
    '登錄時間',
    '標籤原圖存檔狀態',
    '異常摘要',
  ];

  const boxRows = order.boxes.map((b) => {
    const ocr = b.evidence?.ocrResult;
    const comp = b.comparison;
    const partComp = comp?.comparisons.find((c) => c.field === 'partNo');
    const batchComp = comp?.comparisons.find((c) => c.field === 'batchNo');
    const specComp = comp?.comparisons.find((c) => c.field === 'spec');
    const qtyComp = comp?.comparisons.find((c) => c.field === 'qty');

    return [
      b.boxNo,
      b.partNo,
      ocr?.partNo || '(無)',
      partComp ? (partComp.isMatch ? '相符' : '不符') : '未比對',
      b.batchNo,
      ocr?.batchNo || '(無)',
      batchComp ? (batchComp.isMatch ? '相符' : '不符') : '未比對',
      b.spec,
      ocr?.spec || '(無)',
      specComp ? (specComp.isMatch ? '相符' : '不符') : '未比對',
      b.actualCountQty,
      ocr?.labelQty ?? '(無)',
      qtyComp ? (qtyComp.isMatch ? '相符' : '不符') : '未比對',
      b.unit,
      comp?.status || '未比對',
      b.loggedBy,
      b.loggedAt,
      b.evidence?.photoUrl ? '已留存' : '未上傳',
      comp?.anomalySummary || '無',
    ];
  });

  const wsBoxes = XLSX.utils.aoa_to_sheet([boxHeaders, ...boxRows]);
  XLSX.utils.book_append_sheet(wb, wsBoxes, '逐箱核對明細');

  // Sheet 3: 異常與複核清單 (F07)
  const anomalyHeaders = [
    '異常編號',
    '關聯箱號',
    '異常類型',
    '異常標題',
    '差異內容',
    '應有值',
    '實際值',
    '負責人',
    '發生時間',
    '處置狀態',
    '處理方式',
    '修正前後說明',
    '修正人',
    '修正時間',
    '品管複核人員',
    '複核時間',
    '複核結論',
  ];

  const anomalyRows = (order.anomalies || []).map((a) => [
    a.id,
    a.boxNo || '整單層級',
    a.type,
    a.title,
    a.discrepancyDetail,
    a.expectedVal,
    a.actualVal,
    a.owner,
    a.createdAt,
    a.status === 'RESOLVED' ? '已複核結案' : a.status === 'CORRECTED' ? '已修正待複核' : '處理中(未修正)',
    a.correctionMethod || '-',
    `前: ${a.beforeCorrection || '-'} / 後: ${a.afterCorrection || '-'}`,
    a.correctedBy || '-',
    a.correctedAt || '-',
    a.reviewer || '-',
    a.reviewedAt || '-',
    a.reviewComments || '-',
  ]);

  const wsAnomalies = XLSX.utils.aoa_to_sheet([anomalyHeaders, ...anomalyRows]);
  XLSX.utils.book_append_sheet(wb, wsAnomalies, '異常處理與複核清冊');

  XLSX.writeFile(wb, `出貨核對與放行報表_${order.shippingNo}_${order.version}.xlsx`);
}
