import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Store,
  CreditCard,
  Users,
  Receipt,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  Phone,
  Building,
  Calendar,
  DollarSign,
  ShoppingCart,
  UserCheck,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ChangePlanModal } from '../components/shops/ChangePlanModal';
import { EditShopModal } from '../components/shops/EditShopModal';
import { AddStaffModal } from '../components/shops/AddStaffModal';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { useSocket } from '../context/SocketContext';

export const ShopDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshKey } = useSocket();

  const [shopData, setShopData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'payments' | 'activity' | 'audit'>(
    'overview'
  );
  const [loading, setLoading] = useState(true);

  // Actions & Modals
  const [editShopOpen, setEditShopOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [deleteStaffModalOpen, setDeleteStaffModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteStaffLoading, setDeleteStaffLoading] = useState(false);

  const fetchShop = async () => {
    if (!id) return;
    try {
      const res = await api.getShopDetails(id);
      if (res.success) {
        setShopData(res.shop);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
  }, [id, refreshKey]);

  const handleSuspend = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.suspendShop(id, 'Admin suspended shop from details view');
      if (res.success) {
        setSuspendModalOpen(false);
        fetchShop();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await api.activateShop(id);
      if (res.success) {
        setActivateModalOpen(false);
        fetchShop();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteStaff = (userId: string) => {
    setStaffToDelete(userId);
    setDeleteStaffModalOpen(true);
  };

  const handleConfirmDeleteStaff = async () => {
    if (!id || !staffToDelete) return;
    setDeleteStaffLoading(true);
    try {
      await api.deleteStaff(id, staffToDelete);
      setDeleteStaffModalOpen(false);
      setStaffToDelete(null);
      fetchShop();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteStaffLoading(false);
    }
  };

  const handleToggleStaffStatus = async (user: any) => {
    if (!id) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateStaff(id, user._id, { status: newStatus });
      fetchShop();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !shopData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sub = shopData.subscription;
  const startedDate = sub?.startDate
    ? new Date(sub.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : 'Sep 02, 2026';
  const expiresDate = sub?.endDate
    ? new Date(sub.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : 'Oct 02, 2026';

  return (
    <div className="space-y-6">
      {/* Back button matching screenshot 3 */}
      <div>
        <button
          onClick={() => navigate('/shops')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shops</span>
        </button>
      </div>

      {/* Header card matching screenshot 3 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl shadow-xs">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{shopData.name}</h2>
              <StatusBadge status={shopData.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {shopData.branch} • {shopData.storeType} Store
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEditShopOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Shop</span>
          </button>

          <button
            onClick={() => setChangePlanOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          >
            Change Plan
          </button>

          {shopData.status === 'active' ? (
            <button
              onClick={() => setSuspendModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
            >
              Suspend Shop
            </button>
          ) : (
            <button
              onClick={() => setActivateModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
            >
              Activate Shop
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation matching screenshot 3 */}
      <div className="border-b border-slate-200 flex items-center gap-8 text-xs font-semibold">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'staff', label: `Staff (${shopData.staff?.length || 0})` },
            { key: 'payments', label: `Payments (${shopData.payments?.length || 0})` },
            { key: 'activity', label: 'Activity' },
            { key: 'audit', label: 'Audit Logs' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 relative transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content: OVERVIEW matching screenshot 3 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shop Information Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Shop Information</h3>
                <button
                  onClick={() => setEditShopOpen(true)}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Shop Name</span>
                    <span className="font-semibold text-slate-800">{shopData.name}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Branch</span>
                    <span className="font-semibold text-slate-800">{shopData.branch}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Store className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Type</span>
                    <span className="font-semibold text-slate-800">{shopData.storeType}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Phone</span>
                    <span className="font-semibold text-slate-800">{shopData.phone}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Address</span>
                    <span className="font-semibold text-slate-800">{shopData.address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Subscription Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Current Subscription</h3>
                  <StatusBadge status={sub?.status || 'active'} size="sm" />
                </div>

                <div className="mt-4">
                  <h4 className="text-xl font-bold text-slate-900">{sub?.planName || 'Pro'} Plan</h4>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">
                    ৳{sub?.price || 999} <span className="text-slate-400 font-normal">/ month</span>
                  </p>
                </div>

                <div className="mt-5 space-y-2 text-xs border-t border-slate-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Started</span>
                    <span className="font-semibold text-slate-800">{startedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expires</span>
                    <span className="font-semibold text-slate-800">{expiresDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button
                  onClick={() => setChangePlanOpen(true)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Change Plan
                </button>
                <button
                  onClick={() => setChangePlanOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                >
                  Extend
                </button>
              </div>
            </div>
          </div>

          {/* Bottom 3 Summary Metrics matching screenshot 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <span className="text-xs text-slate-400 font-medium">Total Sales (30 days)</span>
              <p className="text-xl font-bold text-slate-900 mt-2">
                ৳{(shopData.salesSummary?.totalSales || 12450).toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <span className="text-xs text-slate-400 font-medium">Total Orders</span>
              <p className="text-xl font-bold text-slate-900 mt-2">
                {shopData.salesSummary?.totalOrders || 48}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <span className="text-xs text-slate-400 font-medium">Total Customers</span>
              <p className="text-xl font-bold text-slate-900 mt-2">
                {shopData.salesSummary?.totalCustomers || 32}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: STAFF */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Store Users & Staff Members</h3>
              <p className="text-xs text-slate-400">All users registered under this shop</p>
            </div>
            <button
              onClick={() => setAddStaffOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Last Login</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(shopData.staff || []).map((user: any) => (
                  <tr key={user._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{user.name}</td>
                    <td className="px-4 py-4 text-slate-600">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={user.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-[11px]">
                      {new Date(user.lastLogin).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role !== 'Owner' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStaffStatus(user)}
                            className="text-[11px] text-blue-600 hover:underline font-semibold"
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => confirmDeleteStaff(user._id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                            title="Remove staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
            <button
              onClick={() => setRecordPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Offline Payment</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(shopData.payments || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No payment records for this shop
                    </td>
                  </tr>
                ) : (
                  shopData.payments.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-800">
                        {p.transactionId}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        ৳{p.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">{p.method}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Recent POS Transactions & Sales</h3>
          <div className="divide-y divide-slate-100">
            {(shopData.salesSummary?.recentSales || []).map((sale: any) => (
              <div key={sale._id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{sale.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-400">
                      {sale.itemsCount} items • {sale.customerName} • {sale.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">৳{sale.totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Administrative Audit Trail</h3>
          <div className="space-y-3">
            {(shopData.auditLogs || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No audit logs recorded for this store.</p>
            ) : (
              shopData.auditLogs.map((log: any) => (
                <div
                  key={log._id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Performed by <strong>{log.adminName}</strong>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Shop Modal */}
      {editShopOpen && (
        <EditShopModal
          isOpen={editShopOpen}
          onClose={() => setEditShopOpen(false)}
          shop={shopData}
          onShopUpdated={fetchShop}
        />
      )}

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={changePlanOpen}
        onClose={() => setChangePlanOpen(false)}
        shopId={shopData._id}
        shopName={shopData.name}
        currentPlanId={sub?.planId}
        onPlanChanged={fetchShop}
      />

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={addStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        shopId={shopData._id}
        shopName={shopData.name}
        onStaffAdded={fetchShop}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        shops={[shopData]}
        defaultStoreId={shopData._id}
        onPaymentRecorded={fetchShop}
      />

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        onConfirm={handleSuspend}
        title={`Suspend "${shopData.name}"?`}
        description="This will instantly invalidate all active sessions for this store. Connected users will be disconnected via Socket.IO."
        confirmText="Suspend Shop"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activateModalOpen}
        onClose={() => setActivateModalOpen(false)}
        onConfirm={handleActivate}
        title={`Activate "${shopData.name}"?`}
        description="The store status will be restored to active. Owner and staff can log in again."
        confirmText="Activate Shop"
        cancelText="Cancel"
        variant="success"
        loading={actionLoading}
      />

      {/* Delete Staff Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteStaffModalOpen}
        onClose={() => {
          setDeleteStaffModalOpen(false);
          setStaffToDelete(null);
        }}
        onConfirm={handleConfirmDeleteStaff}
        title="Remove Staff User"
        description="Are you sure you want to remove this staff user from this shop? They will immediately lose access to the POS and back-office."
        confirmText="Remove Staff"
        cancelText="Cancel"
        variant="danger"
        loading={deleteStaffLoading}
      />
    </div>
  );
};
