import React, { useState, useEffect } from 'react';
import {
  User,
  Globe,
  CreditCard,
  Shield,
  CheckCircle,
  KeyRound,
  ShieldCheck,
  Users,
  Plus,
  Trash2,
  Terminal,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PlatformSettings, AdminAuditLog, AdminUser } from '../types';

export const SettingsPage: React.FC = () => {
  const { admin, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'platform' | 'gateways' | 'team' | 'security'>('profile');

  // Profile form
  const [name, setName] = useState(admin?.name || 'Admin Manager');
  const [email, setEmail] = useState(admin?.email || 'admin@shoppos.com');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Platform & Gateway settings
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'ShopPOS',
    supportEmail: 'support@shoppos.com',
    currency: 'BDT',
    currencySymbol: '৳',
    defaultTrialDays: 14,
    maintenanceMode: false,
    bkashMerchantNumber: '01811-998877',
    nagadMerchantNumber: '01711-223344',
    bankName: 'City Bank PLC',
    bankBranch: 'Dhanmondi Branch',
    bankAccountName: 'ShopPOS Bangladesh Ltd.',
    bankAccountNumber: '1102938475001',
  });
  const [platformSaving, setPlatformSaving] = useState(false);

  // Team management
  const [team, setTeam] = useState<AdminUser[]>([]);
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('admin123');
  const [newAdminRole, setNewAdminRole] = useState<'Admin' | 'SuperAdmin'>('Admin');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [deleteAdminModalOpen, setDeleteAdminModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);
  const [deleteAdminLoading, setDeleteAdminLoading] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  const fetchSettingsAndData = async () => {
    try {
      const [settingsRes, logsRes, teamRes] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs(),
        api.getTeam(),
      ]);
      if (settingsRes.success) setSettings(settingsRes.settings);
      if (logsRes.success) setAuditLogs(logsRes.logs);
      if (teamRes.success) setTeam(teamRes.admins);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettingsAndData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateProfile({ name, email });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformSaving(true);
    try {
      await api.updateSettings(settings);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setPlatformSaving(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await api.addTeamMember({
        name: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword,
        role: newAdminRole,
      });
      if (res.success) {
        setAddAdminModalOpen(false);
        setNewAdminName('');
        setNewAdminEmail('');
        fetchSettingsAndData();
      }
    } catch (err: any) {
      setTeamError(err.message || 'Failed to add admin member');
    } finally {
      setTeamLoading(false);
    }
  };

  const confirmDeleteAdmin = (adminId: string) => {
    setAdminToDelete(adminId);
    setDeleteAdminModalOpen(true);
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeleteAdminLoading(true);
    try {
      const res = await api.deleteTeamMember(adminToDelete);
      if (res.success) {
        setDeleteAdminModalOpen(false);
        setAdminToDelete(null);
        fetchSettingsAndData();
      }
    } catch (err: any) {
      console.error('Failed to remove admin:', err);
    } finally {
      setDeleteAdminLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.adminName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.targetId.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header matching screenshot 8 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your admin and platform settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Settings Navigation Menu matching screenshot 8 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-xs space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4 text-blue-600" />
            <span>Admin Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('platform')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'platform'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Platform</span>
          </button>

          <button
            onClick={() => setActiveTab('gateways')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'gateways'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Payment Gateways</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'team'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Team & Admins</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Security & Audit</span>
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="md:col-span-3">
          {profileSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Settings updated successfully in database.</span>
            </div>
          )}

          {/* ADMIN PROFILE TAB matching screenshot 8 */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-6">Admin Profile</h3>

              <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Change Password
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="password"
                      readOnly
                      value="••••••••••••"
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordModalOpen(true)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PLATFORM TAB */}
          {activeTab === 'platform' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-6">Platform Settings</h3>

              <form onSubmit={handleSaveSettings} className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Currency Code
                    </label>
                    <input
                      type="text"
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      value={settings.currencySymbol}
                      onChange={(e) =>
                        setSettings({ ...settings, currencySymbol: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Trial Period (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultTrialDays}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultTrialDays: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={platformSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {platformSaving ? 'Saving...' : 'Save Platform Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PAYMENT GATEWAYS TAB */}
          {activeTab === 'gateways' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-2">Payment Gateway Settings</h3>
              <p className="text-xs text-slate-500 mb-6">
                Official receiving accounts for automated and manual subscription verification
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-5 max-w-lg">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                    bKash Merchant Account
                  </h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Merchant Number
                    </label>
                    <input
                      type="text"
                      value={settings.bkashMerchantNumber || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, bkashMerchantNumber: e.target.value })
                      }
                      placeholder="01811-998877"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                    Nagad Merchant Account
                  </h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Merchant Number
                    </label>
                    <input
                      type="text"
                      value={settings.nagadMerchantNumber || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, nagadMerchantNumber: e.target.value })
                      }
                      placeholder="01711-223344"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Corporate Bank Account
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={settings.bankName || ''}
                        onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={settings.bankBranch || ''}
                        onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={settings.bankAccountName || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, bankAccountName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={settings.bankAccountNumber || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, bankAccountNumber: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={platformSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {platformSaving ? 'Saving...' : 'Update Gateways'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TEAM & ADMINS TAB */}
          {activeTab === 'team' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Admin Team Members</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage administrative access and permissions
                  </p>
                </div>
                {admin?.role === 'SuperAdmin' && (
                  <button
                    onClick={() => setAddAdminModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Admin</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {team.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                        <td className="px-4 py-3 text-slate-600">{m.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.role === 'SuperAdmin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {m.lastLogin ? new Date(m.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {admin?.role === 'SuperAdmin' && m._id !== admin._id && (
                            <button
                              onClick={() => confirmDeleteAdmin(m._id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                              title="Delete Admin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURITY & AUDIT TAB */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Platform Audit Trail</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Recorded platform actions with immutable audit trail
                  </p>
                </div>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Target ID</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-slate-900">{log.action}</td>
                        <td className="px-4 py-3 text-slate-600">{log.adminName}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {log.targetId}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Change Admin Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Admin Modal */}
      <Modal
        isOpen={addAdminModalOpen}
        onClose={() => setAddAdminModalOpen(false)}
        title="Invite New Administrator"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          {teamError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
              {teamError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="e.g. Mahfuzur Rahman"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="e.g. mahfuz@shoppos.com"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role & Permissions
            </label>
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value as any)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Admin">Admin (Support & Operations)</option>
              <option value="SuperAdmin">SuperAdmin (Full Permissions)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              required
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddAdminModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={teamLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {teamLoading ? 'Inviting...' : 'Add Team Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Revoke Admin Access Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteAdminModalOpen}
        onClose={() => {
          setDeleteAdminModalOpen(false);
          setAdminToDelete(null);
        }}
        onConfirm={handleConfirmDeleteAdmin}
        title="Revoke Administrator Access"
        description="Are you sure you want to revoke administrative access for this team member? This action is immediate and cannot be undone."
        confirmText="Revoke Access"
        cancelText="Cancel"
        variant="danger"
        loading={deleteAdminLoading}
      />
    </div>
  );
};
