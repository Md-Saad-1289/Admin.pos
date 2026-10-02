import { AdminUser, Store, Subscription, SubscriptionPlan, Payment, SupportTicket, PlatformSettings, DashboardStats, AdminAuditLog } from '../types';

const TOKEN_KEY = 'shoppos_admin_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !endpoint.includes('/login')) {
      authStorage.clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  login: (credentials: { email: string; password: string }) =>
    request<{ success: boolean; token: string; admin: AdminUser }>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getCurrentAdmin: () =>
    request<{ success: boolean; admin: AdminUser }>('/api/admin/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/api/admin/auth/logout', { method: 'POST' }),

  updateProfile: (profile: { name: string; email: string }) =>
    request<{ success: boolean; admin: AdminUser }>('/api/admin/auth/update-profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    }),

  changePassword: (passwords: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/admin/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    }),

  getDashboard: () =>
    request<{
      success: boolean;
      stats: DashboardStats;
      subscriptionBreakdown: { active: number; expiring: number; expired: number; total: number };
      revenueChart: Array<{ date: string; amount: number }>;
      recentShops: any[];
      pendingPayments: any[];
    }>('/api/admin/dashboard'),

  getShops: (params?: { search?: string; status?: string; storeType?: string; plan?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.storeType) query.append('storeType', params.storeType);
    if (params?.plan) query.append('plan', params.plan);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; total: number; page: number; limit: number; totalPages: number; shops: Store[] }>(`/api/admin/shops?${query.toString()}`);
  },

  getShopDetails: (id: string) => request<{ success: boolean; shop: any }>(`/api/admin/shops/${id}`),

  createShop: (shopData: any) =>
    request<{ success: boolean; shop: Store; subscription: Subscription }>('/api/admin/shops', {
      method: 'POST',
      body: JSON.stringify(shopData),
    }),

  updateShop: (id: string, updates: Partial<Store>) =>
    request<{ success: boolean; shop: Store }>(`/api/admin/shops/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteShop: (id: string) => request<{ success: boolean; message: string }>(`/api/admin/shops/${id}`, { method: 'DELETE' }),

  suspendShop: (id: string, reason?: string) =>
    request<{ success: boolean; message: string; shop: Store }>(`/api/admin/shops/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  activateShop: (id: string) =>
    request<{ success: boolean; message: string; shop: Store }>(`/api/admin/shops/${id}/activate`, { method: 'POST' }),

  updateShopSubscription: (id: string, data: { planId?: string; days?: number }) =>
    request<{ success: boolean; subscription: Subscription; plan: SubscriptionPlan }>(`/api/admin/shops/${id}/subscription`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addStaff: (shopId: string, staffData: { name: string; email: string; role: 'Manager' | 'Cashier'; password?: string }) =>
    request<{ success: boolean; staff: any }>(`/api/admin/shops/${shopId}/staff`, {
      method: 'POST',
      body: JSON.stringify(staffData),
    }),

  updateStaff: (shopId: string, userId: string, updates: { role?: string; status?: string }) =>
    request<{ success: boolean; staff: any }>(`/api/admin/shops/${shopId}/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteStaff: (shopId: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/shops/${shopId}/staff/${userId}`, { method: 'DELETE' }),

  getPlans: () => request<{ success: boolean; plans: SubscriptionPlan[] }>('/api/admin/plans'),

  createPlan: (data: Partial<SubscriptionPlan>) =>
    request<{ success: boolean; plan: SubscriptionPlan }>('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlan: (id: string, updates: Partial<SubscriptionPlan>) =>
    request<{ success: boolean; plan: SubscriptionPlan }>(`/api/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deletePlan: (id: string) => request<{ success: boolean; message: string }>(`/api/admin/plans/${id}`, { method: 'DELETE' }),

  getSubscriptions: () => request<{ success: boolean; subscriptions: Subscription[] }>('/api/admin/subscriptions'),

  getPayments: (params?: { search?: string; status?: string; method?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.method) query.append('method', params.method);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<{ success: boolean; total: number; page: number; limit: number; totalPages: number; payments: Payment[] }>(`/api/admin/payments?${query.toString()}`);
  },

  getPaymentDetails: (id: string) => request<{ success: boolean; payment: Payment }>(`/api/admin/payments/${id}`),

  recordManualPayment: (data: { storeId: string; amount: number; method: string; transactionId?: string; notes?: string }) =>
    request<{ success: boolean; payment: Payment }>('/api/admin/payments/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approvePayment: (id: string) =>
    request<{ success: boolean; message: string; payment: Payment; subscription: Subscription }>(`/api/admin/payments/${id}/approve`, { method: 'POST' }),

  rejectPayment: (id: string, reason?: string) =>
    request<{ success: boolean; message: string; payment: Payment }>(`/api/admin/payments/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getSupportTickets: (params?: { search?: string; status?: string; priority?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    return request<{ success: boolean; tickets: SupportTicket[] }>(`/api/admin/support?${query.toString()}`);
  },

  getSupportTicketDetails: (id: string) => request<{ success: boolean; ticket: SupportTicket }>(`/api/admin/support/${id}`),

  createSupportTicket: (data: { storeId: string; subject: string; message: string; priority?: string }) =>
    request<{ success: boolean; ticket: SupportTicket }>('/api/admin/support', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  replySupportTicket: (id: string, message: string) =>
    request<{ success: boolean; ticket: SupportTicket; reply: any }>(`/api/admin/support/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  updateSupportTicket: (id: string, updates: { status?: string; priority?: string }) =>
    request<{ success: boolean; ticket: SupportTicket }>(`/api/admin/support/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getSettings: () => request<{ success: boolean; settings: PlatformSettings }>('/api/admin/settings'),

  updateSettings: (settings: Partial<PlatformSettings>) =>
    request<{ success: boolean; settings: PlatformSettings }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  getTeam: () => request<{ success: boolean; admins: AdminUser[] }>('/api/admin/team'),

  addTeamMember: (data: { name: string; email: string; password: string; role: 'SuperAdmin' | 'Admin' }) =>
    request<{ success: boolean; admin: AdminUser }>('/api/admin/team', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTeamMember: (id: string) => request<{ success: boolean; message: string }>(`/api/admin/team/${id}`, { method: 'DELETE' }),

  getAuditLogs: () => request<{ success: boolean; logs: AdminAuditLog[] }>('/api/admin/audit-logs'),
};
