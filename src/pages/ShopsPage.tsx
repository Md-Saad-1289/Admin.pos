import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Store,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Eye,
  Download,
  Edit,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { AddShopModal } from '../components/shops/AddShopModal';
import { EditShopModal } from '../components/shops/EditShopModal';
import { ChangePlanModal } from '../components/shops/ChangePlanModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useSocket } from '../context/SocketContext';
import { Store as StoreType } from '../types';

export const ShopsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSocket();

  const [shops, setShops] = useState<StoreType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [planFilter, setPlanFilter] = useState('All Plans');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editShopTarget, setEditShopTarget] = useState<StoreType | null>(null);
  const [changePlanShop, setChangePlanShop] = useState<StoreType | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<StoreType | null>(null);
  const [activateTarget, setActivateTarget] = useState<StoreType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreType | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Active dropdown menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await api.getShops({
        search,
        status: statusFilter,
        storeType: typeFilter,
        plan: planFilter,
        page,
        limit: 10,
      });
      if (res.success) {
        setShops(res.shops);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Failed to load shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [page, statusFilter, typeFilter, planFilter, refreshKey]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchShops();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Suspend Shop (Flow 3)
  const handleSuspendConfirm = async () => {
    if (!suspendTarget) return;
    setActionLoading(true);
    try {
      const res = await api.suspendShop(suspendTarget._id, 'Suspended from Shops list');
      if (res.success) {
        setSuspendTarget(null);
        fetchShops();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Activate Shop (Flow 4)
  const handleActivateConfirm = async () => {
    if (!activateTarget) return;
    setActionLoading(true);
    try {
      const res = await api.activateShop(activateTarget._id);
      if (res.success) {
        setActivateTarget(null);
        fetchShops();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Shop
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await api.deleteShop(deleteTarget._id);
      if (res.success) {
        setDeleteTarget(null);
        fetchShops();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Export Shops to CSV
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Shop Name,Branch,Owner,Phone,Type,Plan,Status,Address,Created']
        .concat(
          shops.map(
            (s) =>
              `"${s.name}","${s.branch}","${s.ownerName}","${s.phone}","${s.storeType}","${s.planName}","${s.status}","${s.address}","${s.createdAt}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shoppos_registered_shops_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Color generator for shop avatars matching screenshot
  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-emerald-500 text-white',
      'bg-amber-500 text-white',
      'bg-blue-600 text-white',
      'bg-rose-500 text-white',
      'bg-pink-500 text-white',
      'bg-purple-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header matching screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shops</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage all registered businesses</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Shop</span>
          </button>
        </div>
      </div>

      {/* Filters Bar matching screenshot 2 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shops..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Status">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Types">All Types</option>
            <option value="Grocery">Grocery</option>
            <option value="Fashion">Fashion</option>
            <option value="Electronics">Electronics</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Restaurant">Restaurant</option>
          </select>

          {/* Plan Dropdown */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Plans">All Plans</option>
            <option value="Basic">Basic</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Shop</th>
                <th className="px-4 py-3.5">Owner</th>
                <th className="px-4 py-3.5">Store Type</th>
                <th className="px-4 py-3.5">Plan</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading shops...
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No shops found matching your search.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => {
                  const avatarClass = getAvatarBg(shop.name);
                  const isMenuOpen = activeMenuId === shop._id;
                  const createdDate = new Date(shop.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={shop._id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Shop avatar & name */}
                      <td
                        onClick={() => navigate(`/shops/${shop._id}`)}
                        className="px-6 py-4 font-semibold text-slate-900 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${avatarClass}`}
                          >
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight hover:text-blue-600 transition-colors">
                              {shop.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-normal">{shop.branch}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-4 text-slate-600 font-medium">{shop.ownerName}</td>

                      {/* Store Type */}
                      <td className="px-4 py-4 text-slate-600">{shop.storeType}</td>

                      {/* Plan */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800">{shop.planName || 'Pro'}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={shop.status} />
                      </td>

                      {/* Created */}
                      <td className="px-4 py-4 text-slate-500 text-[11px]">{createdDate}</td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right relative">
                        <div className="inline-block text-left">
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : shop._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-6 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 text-left animate-in fade-in">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate(`/shops/${shop._id}`);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>View Details</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setEditShopTarget(shop);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Information</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setChangePlanShop(shop);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span>Change Plan</span>
                              </button>

                              {shop.status === 'active' ? (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setSuspendTarget(shop);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Suspend Shop</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setActivateTarget(shop);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-medium"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Activate Shop</span>
                                </button>
                              )}

                              <div className="border-t border-slate-100 my-1" />

                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteTarget(shop);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Delete Shop</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching screenshot 2 */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  page === pNum
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pNum}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Showing {shops.length > 0 ? (page - 1) * 10 + 1 : 0}-{Math.min(page * 10, total)} of{' '}
            {total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add Shop Modal */}
      <AddShopModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onShopAdded={fetchShops}
      />

      {/* Edit Shop Modal */}
      {editShopTarget && (
        <EditShopModal
          isOpen={!!editShopTarget}
          onClose={() => setEditShopTarget(null)}
          shop={editShopTarget}
          onShopUpdated={fetchShops}
        />
      )}

      {/* Change Plan Modal */}
      {changePlanShop && (
        <ChangePlanModal
          isOpen={!!changePlanShop}
          onClose={() => setChangePlanShop(null)}
          shopId={changePlanShop._id}
          shopName={changePlanShop.name}
          currentPlanId={changePlanShop.planId}
          onPlanChanged={fetchShops}
        />
      )}

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspendConfirm}
        title={`Suspend "${suspendTarget?.name}"?`}
        description="Owner and staff sessions will be invalidated immediately via realtime socket event. Connected users will be logged out."
        confirmText="Suspend Shop"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivateConfirm}
        title={`Activate "${activateTarget?.name}"?`}
        description="The store status will be restored to active. Owner and staff can log in again."
        confirmText="Activate Shop"
        cancelText="Cancel"
        variant="success"
        loading={actionLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={`Permanently Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete this shop and terminate associated subscriptions. This action cannot be undone."
        confirmText="Delete Shop"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
