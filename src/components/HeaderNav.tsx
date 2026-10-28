import React from 'react';
import { 
  UserRole, 
  UserProfile, 
  ShippingOrder, 
  ReleaseStatus 
} from '../types/shipping';
import { SYSTEM_USERS } from '../data/mockShipments';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  PackagePlus, 
  AlertTriangle, 
  FileText, 
  BarChart3, 
  Layers, 
  CheckCircle2, 
  Lock,
  ChevronDown
} from 'lucide-react';

interface HeaderNavProps {
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  orders: ShippingOrder[];
  activeOrder: ShippingOrder;
  onSelectOrder: (order: ShippingOrder) => void;
  onOpenImport: () => void;
  onOpenRevision: () => void;
  onOpenBoxRegister: () => void;
  onOpenAnomalies: () => void;
  onOpenRelease: () => void;
  onOpenReport: () => void;
  onOpenKpi: () => void;
  activeTab: 'VERIFICATION' | 'KPI';
  setActiveTab: (tab: 'VERIFICATION' | 'KPI') => void;
}

export const getStatusBadge = (status: ReleaseStatus) => {
  switch (status) {
    case 'READY_FOR_RELEASE':
      return {
        text: '可放行',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400/20',
        dot: 'bg-emerald-500',
      };
    case 'RELEASED':
      return {
        text: '已放行出庫',
        bg: 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-400/20',
        dot: 'bg-blue-600',
      };
    case 'ANOMALOUS':
      return {
        text: '核對異常',
        bg: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400/20 animate-pulse',
        dot: 'bg-rose-500',
      };
    case 'PENDING_MANUAL_REVIEW':
      return {
        text: '待人工確認',
        bg: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20',
        dot: 'bg-amber-500',
      };
    case 'PENDING_SUPERVISOR_REVIEW':
      return {
        text: '待主管複核',
        bg: 'bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-400/20',
        dot: 'bg-purple-500',
      };
    case 'PENDING_VERIFICATION':
    default:
      return {
        text: '待核對',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
      };
  }
};

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  onSwitchUser,
  orders,
  activeOrder,
  onSelectOrder,
  onOpenImport,
  onOpenRevision,
  onOpenBoxRegister,
  onOpenAnomalies,
  onOpenRelease,
  onOpenReport,
  onOpenKpi,
  activeTab,
  setActiveTab,
}) => {
  const currentBadge = getStatusBadge(activeOrder.status);
  const openAnomaliesCount = activeOrder.anomalies?.filter((a) => a.status !== 'RESOLVED').length || 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Bar: Brand, Role Switcher, System Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">
                  智慧出貨與外箱標籤核對系統
                </span>
                <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  v1.2 現場試行版
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                固定規則嚴格比對 • 前導零保留 • 雙重數量核對 • 放行防呆管制
              </p>
            </div>
          </div>

          {/* Right side: Role Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {/* View Switcher: Verification View vs KPI View */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('VERIFICATION')}
                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'VERIFICATION'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>作業檢驗台</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('KPI');
                  onOpenKpi();
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'KPI'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>成效統計 (F11)</span>
              </button>
            </div>

            {/* Role Switcher Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                    <span>{currentUser.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-blue-400 font-mono">
                    {currentUser.title} ({currentUser.role})
                  </span>
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 hidden group-hover:block transition z-50">
                <div className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                  切換操作角色 (共通規格權限)
                </div>
                {SYSTEM_USERS.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onSwitchUser(user)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                      currentUser.id === user.id
                        ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/40'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <div>
                      <div className="text-white">{user.name}</div>
                      <div className="text-[10px] text-slate-400">{user.department} • {user.title}</div>
                    </div>
                    {currentUser.id === user.id && (
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Bar: Active Shipment Selector, Status, & Quick Workflow Actions */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Active Order Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">當前出貨單:</span>
            <div className="flex items-center gap-2">
              <select
                value={activeOrder.id}
                onChange={(e) => {
                  const selected = orders.find((o) => o.id === e.target.value);
                  if (selected) onSelectOrder(selected);
                }}
                className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.shippingNo} ({o.customer.split(' ')[0]}) - {o.version}
                  </option>
                ))}
              </select>

              {/* Order Status Badge */}
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${currentBadge.bg}`}>
                <span className={`w-2 h-2 rounded-full ${currentBadge.dot}`}></span>
                <span>{currentBadge.text}</span>
              </div>

              {/* Version Pill */}
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                版次 {activeOrder.version}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* F01 Excel 匯入 */}
            <button
              type="button"
              onClick={onOpenImport}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              title="匯入 Excel 出貨明細 (F01)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>匯入明細</span>
            </button>

            {/* F08 改單與版次 */}
            <button
              type="button"
              onClick={onOpenRevision}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              title="更新明細改單 (F08)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>改單/升版</span>
            </button>

            {/* F02 逐箱登錄 */}
            <button
              type="button"
              onClick={onOpenBoxRegister}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm flex items-center gap-1.5 transition"
              title="逐箱登錄唯一箱號與清點 (F02)"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>逐箱裝箱登錄</span>
            </button>

            {/* F07 異常處理 */}
            <button
              type="button"
              onClick={onOpenAnomalies}
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition border ${
                openAnomaliesCount > 0
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900/80'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${openAnomaliesCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
              <span>異常處置</span>
              {openAnomaliesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-[10px] text-white font-bold">
                  {openAnomaliesCount}
                </span>
              )}
            </button>

            {/* F09 放行管制 */}
            <button
              type="button"
              onClick={onOpenRelease}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition border ${
                activeOrder.status === 'RELEASED'
                  ? 'bg-blue-900/60 text-blue-200 border-blue-700'
                  : activeOrder.status === 'READY_FOR_RELEASE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {activeOrder.status === 'RELEASED' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{activeOrder.status === 'RELEASED' ? '放行憑單' : '出庫放行審查'}</span>
            </button>

            {/* F10 報表匯出 */}
            <button
              type="button"
              onClick={onOpenReport}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              title="匯出 Excel 核對報告與清冊 (F10)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>報表匯出</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
