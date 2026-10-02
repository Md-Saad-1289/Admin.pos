export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin';
  lastLogin?: string;
}

export interface Store {
  _id: string;
  name: string;
  branch: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  storeType: string;
  status: 'active' | 'suspended';
  planName?: string;
  planId?: string;
  subscriptionStatus?: string;
  subscriptionExpires?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Cashier';
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  maxProducts: number;
  status: 'active' | 'inactive';
}

export interface Subscription {
  _id: string;
  storeId: string;
  planId: string;
  status: 'active' | 'expiring' | 'expired' | 'suspended';
  startDate: string;
  endDate: string;
  planName?: string;
  price?: number;
  billingCycle?: string;
  storeName?: string;
  ownerName?: string;
  storeStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  storeId: string;
  subscriptionId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Card' | 'Bank';
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason?: string;
  storeName?: string;
  ownerName?: string;
  planName?: string;
  createdAt: string;
}

export interface SupportTicketReply {
  id: string;
  senderRole: 'admin' | 'owner';
  senderName: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  storeId: string;
  subject: string;
  message: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  replies: SupportTicketReply[];
  storeName?: string;
  ownerName?: string;
  storeBranch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  _id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface Sale {
  _id: string;
  storeId: string;
  invoiceNumber: string;
  totalAmount: number;
  itemsCount: number;
  customerName: string;
  paymentMethod: string;
  createdAt: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  currency: string;
  currencySymbol: string;
  defaultTrialDays: number;
  maintenanceMode: boolean;
  bkashMerchantNumber?: string;
  nagadMerchantNumber?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
}

export interface DashboardStats {
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  expiredSubscriptions: number;
  pendingPayments: number;
  newShopsCount: number;
}
