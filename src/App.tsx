import React, { useState, useEffect } from 'react';
import { 
  ShippingOrder, 
  UserProfile, 
  BoxRecord, 
  LabelEvidence, 
  ReleaseCertificate,
  AnomalyRecord
} from './types/shipping';
import { SYSTEM_USERS, INITIAL_SHIPMENTS } from './data/mockShipments';
import { evaluateOrderState, createAnomalyRecord } from './services/comparisonEngine';
import { HeaderNav } from './components/HeaderNav';
import { ComparisonTable } from './components/ComparisonTable';
import { BoxRegistrationModal } from './components/BoxRegistrationModal';
import { LabelScannerModal } from './components/LabelScannerModal';
import { ManualReviewModal } from './components/ManualReviewModal';
import { ManifestImportModal } from './components/ManifestImportModal';
import { ManifestEditModal } from './components/ManifestEditModal';
import { AnomalyManagementModal } from './components/AnomalyManagementModal';
import { ReleaseGatekeeperModal } from './components/ReleaseGatekeeperModal';
import { ReportExportModal } from './components/ReportExportModal';
import { KpiDashboard } from './components/KpiDashboard';

export default function App() {
  // Current user role
  const [currentUser, setCurrentUser] = useState<UserProfile>(SYSTEM_USERS[0]); // Shipping Staff default

  // Orders list in system
  const [orders, setOrders] = useState<ShippingOrder[]>(() => {
    const saved = localStorage.getItem('ais_shipping_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved orders:', e);
      }
    }
    return INITIAL_SHIPMENTS;
  });

  // Active shipment
  const [activeOrderId, setActiveOrderId] = useState<string>(() => {
    return orders[0]?.id || 'ORD-001';
  });

  const activeOrder = orders.find((o) => o.id === activeOrderId) || orders[0];

  // Active Tab: Verification Workspace vs KPI View
  const [activeTab, setActiveTab] = useState<'VERIFICATION' | 'KPI'>('VERIFICATION');

  // Modal Dialog States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isBoxRegisterOpen, setIsBoxRegisterOpen] = useState(false);
  const [isAnomaliesOpen, setIsAnomaliesOpen] = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [scannerTargetBox, setScannerTargetBox] = useState<BoxRecord | null>(null);
  const [manualReviewTargetBox, setManualReviewTargetBox] = useState<BoxRecord | null>(null);

  // Quick feedback toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ais_shipping_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }, [orders]);

  // Helper to update active order through the comparison engine
  const updateOrderInList = (orderToUpdate: ShippingOrder) => {
    const { updatedOrder } = evaluateOrderState(orderToUpdate);
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
  };

  // F01: Import Orders from Excel
  const handleImportOrders = (newOrders: Partial<ShippingOrder>[]) => {
    const created: ShippingOrder[] = newOrders.map((o, idx) => {
      const fullOrder: ShippingOrder = {
        id: `ORD-IMPORT-${Date.now()}-${idx}`,
        shippingNo: o.shippingNo || `SO-NEW-${idx}`,
        date: o.date || new Date().toISOString().slice(0, 10),
        customer: o.customer || '新客戶',
        warehouseArea: o.warehouseArea || 'A1 智能出貨區',
        version: 'V1',
        status: 'PENDING_VERIFICATION',
        items: o.items || [],
        boxes: [],
        anomalies: [],
        history: o.history || [],
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name,
        updatedAt: new Date().toISOString(),
        verificationStartedAt: new Date().toISOString(),
      };
      return evaluateOrderState(fullOrder).updatedOrder;
    });

    setOrders((prev) => [...created, ...prev]);
    setActiveOrderId(created[0].id);
    showToast(`成功匯入 ${created.length} 筆出貨單，品號前導零已完整保留！`);
  };

  // F02: Register Box
  const handleRegisterBox = (newBox: BoxRecord) => {
    const updatedBoxes = [...activeOrder.boxes, newBox];
    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      boxes: updatedBoxes,
    };
    updateOrderInList(updatedOrder);
    showToast(`箱號 [${newBox.boxNo}] 登錄成功 (清點: ${newBox.actualCountQty} ${newBox.unit})`);
  };

  // F03: Save Evidence & Perform Verification
  const handleSaveEvidence = (boxId: string, evidence: LabelEvidence) => {
    const updatedBoxes = activeOrder.boxes.map((b) => {
      if (b.id === boxId) {
        return {
          ...b,
          evidence,
          recheckRequired: false,
        };
      }
      return b;
    });

    // Check if new discrepancies arise to create anomalies automatically (F07)
    const targetBox = updatedBoxes.find((b) => b.id === boxId);
    const item = activeOrder.items.find((i) => i.itemId === targetBox?.itemId) || activeOrder.items[0];
    const existingAnomalies = [...(activeOrder.anomalies || [])];

    if (targetBox && item) {
      const ocr = evidence.ocrResult;
      // Part mismatch
      if (targetBox.partNo !== ocr.partNo) {
        existingAnomalies.push(
          createAnomalyRecord(
            activeOrder.shippingNo,
            targetBox.boxNo,
            'PART_NO_MISMATCH',
            '外箱品號與明細不符',
            `明細要求 [${targetBox.partNo}]，標籤辨識為 [${ocr.partNo}]`,
            targetBox.partNo,
            ocr.partNo,
            currentUser.name
          )
        );
      }
      // Batch mismatch
      if (targetBox.batchNo !== ocr.batchNo) {
        existingAnomalies.push(
          createAnomalyRecord(
            activeOrder.shippingNo,
            targetBox.boxNo,
            'BATCH_NO_MISMATCH',
            '外箱批號與明細不符',
            `明細要求 [${targetBox.batchNo}]，標籤辨識為 [${ocr.batchNo}]`,
            targetBox.batchNo,
            ocr.batchNo,
            currentUser.name
          )
        );
      }
      // Single box qty mismatch
      if (targetBox.actualCountQty !== ocr.labelQty) {
        existingAnomalies.push(
          createAnomalyRecord(
            activeOrder.shippingNo,
            targetBox.boxNo,
            'BOX_QTY_MISMATCH',
            '單箱標籤數量與清點數量不符',
            `清點為 ${targetBox.actualCountQty}，標籤標示為 ${ocr.labelQty}`,
            String(targetBox.actualCountQty),
            String(ocr.labelQty),
            currentUser.name
          )
        );
      }
    }

    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      boxes: updatedBoxes,
      anomalies: existingAnomalies,
    };
    updateOrderInList(updatedOrder);
    showToast(`箱號 [${targetBox?.boxNo}] 標籤拍照存證完成，比對完畢！`);
  };

  // F03 / F07: Manual Correction
  const handleManualCorrection = (
    boxId: string,
    updatedFields: {
      boxNo: string;
      partNo: string;
      spec: string;
      batchNo: string;
      labelQty: number;
      unit: string;
    },
    reason: string
  ) => {
    const updatedBoxes = activeOrder.boxes.map((b) => {
      if (b.id === boxId) {
        const originalOcr = b.evidence?.ocrResult || ({} as any);
        const editLogs = b.evidence?.manualEditHistory ? [...b.evidence.manualEditHistory] : [];

        // Track differences
        const fieldsToTrack: (keyof typeof updatedFields)[] = [
          'partNo',
          'spec',
          'batchNo',
          'labelQty',
          'unit',
        ];

        fieldsToTrack.forEach((f) => {
          if (String(originalOcr[f]) !== String(updatedFields[f])) {
            editLogs.push({
              editedAt: new Date().toISOString(),
              editedBy: currentUser.name,
              field: f,
              originalValue: originalOcr[f] ?? '(空)',
              newValue: updatedFields[f],
              reason,
            });
          }
        });

        return {
          ...b,
          evidence: {
            ...b.evidence!,
            ocrResult: {
              ...originalOcr,
              ...updatedFields,
              isManualEdited: true,
              confidence: 1.0, // Confirmed by human
            },
            reviewStatus: 'VERIFIED' as any,
            reviewedBy: currentUser.name,
            reviewedAt: new Date().toISOString(),
            manualEditHistory: editLogs,
          },
        };
      }
      return b;
    });

    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      boxes: updatedBoxes,
    };
    updateOrderInList(updatedOrder);
    showToast(`已完成人工確認修正，完整修改歷程已記錄！`);
  };

  // F05: Edit Count Qty on the fly
  const handleEditBoxQty = (box: BoxRecord, newQty: number) => {
    const updatedBoxes = activeOrder.boxes.map((b) => {
      if (b.id === box.id) {
        return {
          ...b,
          actualCountQty: newQty,
        };
      }
      return b;
    });

    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      boxes: updatedBoxes,
    };
    updateOrderInList(updatedOrder);
    showToast(`箱號 [${box.boxNo}] 清點數量已更新為 ${newQty}`);
  };

  // Delete Box
  const handleDeleteBox = (boxId: string) => {
    const updatedBoxes = activeOrder.boxes.filter((b) => b.id !== boxId);
    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      boxes: updatedBoxes,
    };
    updateOrderInList(updatedOrder);
    showToast('外箱裝箱紀錄已刪除');
  };

  // F08: Apply Revision & Invalidate Verifications
  const handleApplyRevision = (
    updatedOrder: ShippingOrder,
    changeSummary: string,
    _affectedField: string
  ) => {
    updateOrderInList(updatedOrder);
    showToast(`出貨明細已改單升版至 ${updatedOrder.version}，所有外箱已標記為待重新核對！`);
  };

  // F07: Correct Anomaly
  const handleCorrectAnomaly = (
    anomalyId: string,
    actionTaken: string,
    beforeAfter: { before: string; after: string }
  ) => {
    const now = new Date().toISOString();
    const updatedAnomalies = (activeOrder.anomalies || []).map((a) => {
      if (a.id === anomalyId) {
        return {
          ...a,
          status: 'CORRECTED' as const,
          correctionMethod: actionTaken,
          beforeCorrection: beforeAfter.before,
          afterCorrection: beforeAfter.after,
          correctedBy: currentUser.name,
          correctedAt: now,
          auditLog: [
            ...a.auditLog,
            {
              timestamp: now,
              operator: currentUser.name,
              action: '異常處置修正',
              note: `處置方式: ${actionTaken}。${beforeAfter.after}`,
            },
          ],
        };
      }
      return a;
    });

    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      anomalies: updatedAnomalies,
    };
    updateOrderInList(updatedOrder);
    showToast(`異常處置已提交，待品管/主管複核！`);
  };

  // F07: Review Anomaly
  const handleReviewAnomaly = (
    anomalyId: string,
    result: 'PASS' | 'REJECT',
    comments: string
  ) => {
    const now = new Date().toISOString();
    const updatedAnomalies = (activeOrder.anomalies || []).map((a) => {
      if (a.id === anomalyId) {
        return {
          ...a,
          status: result === 'PASS' ? ('RESOLVED' as const) : ('OPEN' as const),
          reviewer: currentUser.name,
          reviewedAt: now,
          reviewResult: result,
          reviewComments: comments,
          auditLog: [
            ...a.auditLog,
            {
              timestamp: now,
              operator: currentUser.name,
              action: result === 'PASS' ? '複核結案' : '複核退回',
              note: `審核結論: ${result === 'PASS' ? '通過結案' : '退回重做'}。評語: ${comments}`,
            },
          ],
        };
      }
      return a;
    });

    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      anomalies: updatedAnomalies,
      anomalyClosedAt: now,
    };
    updateOrderInList(updatedOrder);
    showToast(result === 'PASS' ? '異常項目已通過複核並結案！' : '複核未通過，已退回待處置狀態');
  };

  // F09: Execute Release
  const handleExecuteRelease = (orderId: string, certificate: ReleaseCertificate) => {
    const updatedOrder: ShippingOrder = {
      ...activeOrder,
      status: 'RELEASED',
      releaseCertificate: certificate,
      verificationFinishedAt: new Date().toISOString(),
    };
    updateOrderInList(updatedOrder);
    showToast(`出庫放行簽署成功！放行憑證號：${certificate.certificateNo}`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header & Sticky Navigation */}
      <HeaderNav
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
        orders={orders}
        activeOrder={activeOrder}
        onSelectOrder={(order) => setActiveOrderId(order.id)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenRevision={() => setIsRevisionOpen(true)}
        onOpenBoxRegister={() => setIsBoxRegisterOpen(true)}
        onOpenAnomalies={() => setIsAnomaliesOpen(true)}
        onOpenRelease={() => setIsReleaseOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenKpi={() => setActiveTab('KPI')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Body Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'VERIFICATION' ? (
          <ComparisonTable
            order={activeOrder}
            currentUser={currentUser}
            onOpenScanner={(box) => setScannerTargetBox(box)}
            onOpenManualReview={(box) => setManualReviewTargetBox(box)}
            onEditBoxQty={handleEditBoxQty}
            onDeleteBox={handleDeleteBox}
          />
        ) : (
          <KpiDashboard
            orders={orders}
            onBackToVerification={() => setActiveTab('VERIFICATION')}
          />
        )}
      </main>

      {/* Modals */}
      {isImportOpen && (
        <ManifestImportModal
          onImportSuccess={handleImportOrders}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {isRevisionOpen && (
        <ManifestEditModal
          order={activeOrder}
          currentUser={currentUser}
          onApplyRevision={handleApplyRevision}
          onClose={() => setIsRevisionOpen(false)}
        />
      )}

      {isBoxRegisterOpen && (
        <BoxRegistrationModal
          order={activeOrder}
          currentUser={currentUser}
          onRegisterBox={handleRegisterBox}
          onClose={() => setIsBoxRegisterOpen(false)}
        />
      )}

      {scannerTargetBox && (
        <LabelScannerModal
          box={scannerTargetBox}
          order={activeOrder}
          currentUser={currentUser}
          onSaveEvidence={handleSaveEvidence}
          onClose={() => setScannerTargetBox(null)}
        />
      )}

      {manualReviewTargetBox && (
        <ManualReviewModal
          box={manualReviewTargetBox}
          currentUser={currentUser}
          onSaveManualCorrection={handleManualCorrection}
          onClose={() => setManualReviewTargetBox(null)}
        />
      )}

      {isAnomaliesOpen && (
        <AnomalyManagementModal
          order={activeOrder}
          currentUser={currentUser}
          onCorrectAnomaly={handleCorrectAnomaly}
          onReviewAnomaly={handleReviewAnomaly}
          onClose={() => setIsAnomaliesOpen(false)}
        />
      )}

      {isReleaseOpen && (
        <ReleaseGatekeeperModal
          order={activeOrder}
          currentUser={currentUser}
          onExecuteRelease={handleExecuteRelease}
          onClose={() => setIsReleaseOpen(false)}
        />
      )}

      {isReportOpen && (
        <ReportExportModal
          orders={orders}
          activeOrder={activeOrder}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
