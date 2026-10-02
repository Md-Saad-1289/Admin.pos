import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'SuperAdmin' | 'Admin';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  storeId: string;
  name: string;
  email: string;
  passwordHash: string;
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
  notes?: string;
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

export interface DatabaseSchema {
  admins: AdminUser[];
  stores: Store[];
  users: User[];
  subscription_plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  payments: Payment[];
  support_tickets: SupportTicket[];
  admin_audit_logs: AdminAuditLog[];
  sales: Sale[];
  settings: PlatformSettings;
}

class MongoChangeStream extends EventEmitter {
  emitChange(collection: string, operationType: 'insert' | 'update' | 'replace' | 'delete', documentKey: { _id: string }, fullDocument?: any) {
    this.emit('change', {
      ns: { db: 'shoppos', coll: collection },
      operationType,
      documentKey,
      fullDocument,
      clusterTime: new Date().toISOString()
    });
  }
}

export const changeStream = new MongoChangeStream();

class MongoDatabase {
  private dataFilePath: string;
  private db: DatabaseSchema;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFilePath = path.join(dataDir, 'shoppos_db.json');
    this.db = this.loadOrSeed();
  }

  private generateId(): string {
    return crypto.randomBytes(12).toString('hex');
  }

  private loadOrSeed(): DatabaseSchema {
    if (fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.stores && parsed.stores.length >= 10) {
          return parsed;
        }
      } catch (e) {
        console.error('Error reading database file, re-seeding...', e);
      }
    }
    const seeded = this.createInitialData();
    this.save(seeded);
    return seeded;
  }

  public save(data?: DatabaseSchema) {
    if (data) this.db = data;
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error persisting database:', e);
    }
  }

  public reseed() {
    const seeded = this.createInitialData();
    this.save(seeded);
    return seeded;
  }

  private createInitialData(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const adminPassHash = bcrypt.hashSync('password123', salt);
    const ownerPassHash = bcrypt.hashSync('owner123', salt);

    const plans: SubscriptionPlan[] = [
      {
        _id: 'plan_basic',
        name: 'Basic',
        price: 499,
        billingCycle: 'monthly',
        features: ['2 Staff', '500 Products', 'POS Access', 'Daily Reports'],
        maxUsers: 2,
        maxProducts: 500,
        status: 'active'
      },
      {
        _id: 'plan_pro',
        name: 'Pro',
        price: 999,
        billingCycle: 'monthly',
        features: ['10 Staff', '5,000 Products', 'POS + Advanced Reports', 'Inventory Alerts', 'Multi-Register Support'],
        maxUsers: 10,
        maxProducts: 5000,
        status: 'active'
      },
      {
        _id: 'plan_enterprise',
        name: 'Enterprise',
        price: 1999,
        billingCycle: 'monthly',
        features: ['Unlimited Staff', 'Unlimited Products', 'Custom Reports', 'Priority 24/7 SLA', 'API & Webhook Access'],
        maxUsers: 9999,
        maxProducts: 99999,
        status: 'active'
      }
    ];

    const admins: AdminUser[] = [
      {
        _id: 'admin_1',
        name: 'Admin Manager',
        email: 'admin@shoppos.com',
        passwordHash: adminPassHash,
        role: 'SuperAdmin',
        status: 'active',
        createdAt: '2026-01-10T09:00:00.000Z',
        lastLogin: new Date().toISOString()
      },
      {
        _id: 'admin_2',
        name: 'Nayeem Chowdhury',
        email: 'nayeem@shoppos.com',
        passwordHash: adminPassHash,
        role: 'Admin',
        status: 'active',
        createdAt: '2026-03-15T10:00:00.000Z',
        lastLogin: '2026-09-28T14:30:00.000Z'
      }
    ];

    // 24 Production-ready registered stores across Bangladesh
    const storeSeedDefinitions = [
      { id: 'store_1', name: 'Green Mart', branch: 'Dhanmondi Branch', ownerName: 'Rahim Khan', email: 'rahim@greenmart.com', phone: '+880 1712-345678', address: 'Shop #14, Road 7, Dhanmondi, Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 28, created: '2026-09-02T10:00:00.000Z' },
      { id: 'store_2', name: 'Fashion Hub', branch: 'Banani Outlet', ownerName: 'Karim Ahmed', email: 'karim@fashionhub.com', phone: '+880 1819-234567', address: 'Plot 45, Road 11, Block D, Banani, Dhaka', storeType: 'Fashion', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 14, created: '2026-08-15T11:20:00.000Z' },
      { id: 'store_3', name: 'Tech Corner', branch: 'IDB Bhaban Branch', ownerName: 'Hasan Ali', email: 'hasan@techcorner.com', phone: '+880 1911-987654', address: 'Shop 204, 2nd Floor, BCS Computer City, IDB Bhaban, Dhaka', storeType: 'Electronics', status: 'suspended', plan: 'plan_pro', subStatus: 'suspended', subDaysRemaining: -10, created: '2026-07-20T08:30:00.000Z' },
      { id: 'store_4', name: 'Daily Needs', branch: 'Uttara Sector 7', ownerName: 'Sadia Islam', email: 'sadia@dailyneeds.com', phone: '+880 1622-334455', address: 'House 12, Road 5, Sector 7, Uttara, Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 18, created: '2026-07-10T14:00:00.000Z' },
      { id: 'store_5', name: 'Beauty World', branch: 'Gulshan 1 Branch', ownerName: 'Nusrat Jahan', email: 'nusrat@beautyworld.com', phone: '+880 1755-667788', address: 'Navana Tower, 1st Floor, Gulshan 1, Dhaka', storeType: 'Fashion', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 22, created: '2026-06-28T16:45:00.000Z' },
      { id: 'store_6', name: 'Home Essentials', branch: 'Mirpur 10 Circle', ownerName: 'Rafiq Hasan', email: 'rafiq@homeessentials.com', phone: '+880 1833-445566', address: 'Holding 88, Main Road, Mirpur 10, Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_basic', subStatus: 'expiring', subDaysRemaining: 2, created: '2026-06-15T09:10:00.000Z' },
      { id: 'store_7', name: 'Al-Madina Pharmacy', branch: 'Mohammadpur Town Hall', ownerName: 'Dr. Tariqul Islam', email: 'tariqul@almadinapharmacy.com', phone: '+880 1711-223344', address: 'Plot 8, Town Hall Market, Mohammadpur, Dhaka', storeType: 'Pharmacy', status: 'active', plan: 'plan_enterprise', subStatus: 'active', subDaysRemaining: 300, created: '2026-05-12T09:00:00.000Z' },
      { id: 'store_8', name: 'Gadget Freak', branch: 'Jamuna Future Park', ownerName: 'Tanvir Mahmud', email: 'tanvir@gadgetfreak.com', phone: '+880 1922-446688', address: 'Level 4, Zone B, Jamuna Future Park, Kuril, Dhaka', storeType: 'Electronics', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 20, created: '2026-05-20T11:00:00.000Z' },
      { id: 'store_9', name: 'Dhaka Taste Cafe', branch: 'Bashundhara R/A', ownerName: 'Farhana Akter', email: 'farhana@dhakataste.com', phone: '+880 1844-556677', address: 'Block C, Road 2, Bashundhara R/A, Dhaka', storeType: 'Restaurant', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 15, created: '2026-06-01T14:30:00.000Z' },
      { id: 'store_10', name: 'Apex Footwear Reseller', branch: 'Khilgaon Taltola', ownerName: 'Zubair Hossain', email: 'zubair@apexkhilgaon.com', phone: '+880 1788-990011', address: 'Shahid Baki Road, Taltola, Khilgaon, Dhaka', storeType: 'Fashion', status: 'active', plan: 'plan_basic', subStatus: 'expiring', subDaysRemaining: 3, created: '2026-04-18T10:00:00.000Z' },
      { id: 'store_11', name: 'Fresh Organic Foods', branch: 'Gulshan 2', ownerName: 'Sultan Ahmed', email: 'sultan@freshorganic.com', phone: '+880 1733-557799', address: 'Avenue 5, Road 84, Gulshan 2, Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_enterprise', subStatus: 'active', subDaysRemaining: 180, created: '2026-03-10T12:00:00.000Z' },
      { id: 'store_12', name: 'Care Pharmacy & Surgicals', branch: 'Labaid Road Dhanmondi', ownerName: 'Dr. Shahinur Rahman', email: 'shahinur@carepharm.com', phone: '+880 1822-998877', address: 'Road 4, Dhanmondi R/A, Dhaka', storeType: 'Pharmacy', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 25, created: '2026-04-05T08:00:00.000Z' },
      { id: 'store_13', name: 'Bengal Books & Stationers', branch: 'Nilkhet Book Market', ownerName: 'Alamgir Kabir', email: 'alamgir@bengalbooks.com', phone: '+880 1933-221100', address: 'Babupura Market, Nilkhet, Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 12, created: '2026-04-22T13:00:00.000Z' },
      { id: 'store_14', name: 'Smart Choice Electronics', branch: 'Agrabad C/A Chittagong', ownerName: 'Mahbubur Rahman', email: 'mahbub@smartchoice.com', phone: '+880 1722-113355', address: 'Agrabad Commercial Area, Chittagong', storeType: 'Electronics', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 19, created: '2026-03-25T10:00:00.000Z' },
      { id: 'store_15', name: 'Zaytoon Mediterranean Grill', branch: 'Banani Road 11', ownerName: 'Imran Chowdhury', email: 'imran@zaytoon.com', phone: '+880 1855-667788', address: 'House 82, Road 11, Banani, Dhaka', storeType: 'Restaurant', status: 'active', plan: 'plan_enterprise', subStatus: 'active', subDaysRemaining: 90, created: '2026-02-14T15:00:00.000Z' },
      { id: 'store_16', name: 'Shwapno Reseller Corner', branch: 'Wari Ranken Street', ownerName: 'Nasreen Sultana', email: 'nasreen@warireseller.com', phone: '+880 1766-332211', address: 'Ranken Street, Wari, Old Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 16, created: '2026-03-01T11:00:00.000Z' },
      { id: 'store_17', name: 'Chittagong Spices & Herbs', branch: 'Khatungonj Market', ownerName: 'Iqbal Bahar', email: 'iqbal@khatungonj.com', phone: '+880 1811-445566', address: 'Khatungonj Trading Hub, Chittagong', storeType: 'Grocery', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 11, created: '2026-02-28T09:30:00.000Z' },
      { id: 'store_18', name: 'Sylhet Tea House & Cafe', branch: 'Zindabazar Sylhet', ownerName: 'Syed Mustafiz', email: 'mustafiz@sylhettea.com', phone: '+880 1744-889900', address: 'Al-Hamra Shopping City, Zindabazar, Sylhet', storeType: 'Restaurant', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 21, created: '2026-02-10T14:00:00.000Z' },
      { id: 'store_19', name: 'Urban Threads Menswear', branch: 'Shimanto Square Dhanmondi', ownerName: 'Ashraful Haque', email: 'ashraf@urbanthreads.com', phone: '+880 1977-665544', address: 'Shimanto Square, Level 2, Dhanmondi, Dhaka', storeType: 'Fashion', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 27, created: '2026-01-20T16:00:00.000Z' },
      { id: 'store_20', name: 'MediPlus Healthcare', branch: 'Chasara Narayanganj', ownerName: 'Dr. Muniruzzaman', email: 'munir@mediplus.com', phone: '+880 1611-778899', address: 'BB Road, Chasara, Narayanganj', storeType: 'Pharmacy', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 17, created: '2026-01-15T09:00:00.000Z' },
      { id: 'store_21', name: 'ElectroZone Hub', branch: 'Stadium Market Motijheel', ownerName: 'Kamal Hossain', email: 'kamal@electrozone.com', phone: '+880 1888-223344', address: 'Bangabandhu Stadium Market, Motijheel, Dhaka', storeType: 'Electronics', status: 'suspended', plan: 'plan_basic', subStatus: 'suspended', subDaysRemaining: -5, created: '2026-01-05T10:00:00.000Z' },
      { id: 'store_22', name: 'Royal Bakery & Confectionery', branch: 'Shantinagar Crossing', ownerName: 'Rashedul Karim', email: 'rashed@royalbakery.com', phone: '+880 1799-112233', address: 'Shantinagar Main Road, Dhaka', storeType: 'Restaurant', status: 'active', plan: 'plan_basic', subStatus: 'active', subDaysRemaining: 13, created: '2026-01-02T08:00:00.000Z' },
      { id: 'store_23', name: 'Deshi Agro Super Shop', branch: 'Badda Link Road', ownerName: 'Golam Kibria', email: 'kibria@deshiagro.com', phone: '+880 1955-443322', address: 'Pragoti Sarani, Middle Badda, Dhaka', storeType: 'Grocery', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 29, created: '2025-12-15T11:00:00.000Z' },
      { id: 'store_24', name: 'Kids & Mom Boutique', branch: 'Police Plaza Concord Gulshan', ownerName: 'Rumana Parveen', email: 'rumana@kidsmom.com', phone: '+880 1715-998877', address: 'Level 3, Police Plaza Concord, Gulshan 1, Dhaka', storeType: 'Fashion', status: 'active', plan: 'plan_pro', subStatus: 'active', subDaysRemaining: 24, created: '2025-12-01T15:00:00.000Z' }
    ];

    const stores: Store[] = [];
    const users: User[] = [];
    const subscriptions: Subscription[] = [];

    const now = new Date();

    storeSeedDefinitions.forEach((def, index) => {
      const ownerId = `user_owner_${index + 1}`;
      stores.push({
        _id: def.id,
        name: def.name,
        branch: def.branch,
        ownerId,
        ownerName: def.ownerName,
        ownerEmail: def.email,
        phone: def.phone,
        address: def.address,
        storeType: def.storeType,
        status: def.status as any,
        createdAt: def.created,
        updatedAt: new Date().toISOString()
      });

      // Owner User
      users.push({
        _id: ownerId,
        storeId: def.id,
        name: def.ownerName,
        email: def.email,
        passwordHash: ownerPassHash,
        role: 'Owner',
        status: 'active',
        lastLogin: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 2)).toISOString(),
        createdAt: def.created
      });

      // Staff User 1 (Manager)
      users.push({
        _id: `user_staff_${index + 1}_mgr`,
        storeId: def.id,
        name: `${def.ownerName.split(' ')[0]} Associate`,
        email: `manager@${def.email.split('@')[1]}`,
        passwordHash: ownerPassHash,
        role: 'Manager',
        status: 'active',
        lastLogin: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 4)).toISOString(),
        createdAt: def.created
      });

      // Subscription
      const startDate = new Date(now.getTime() - (30 - def.subDaysRemaining) * 86400000).toISOString();
      const endDate = new Date(now.getTime() + def.subDaysRemaining * 86400000).toISOString();

      subscriptions.push({
        _id: `sub_${index + 1}`,
        storeId: def.id,
        planId: def.plan,
        status: def.subStatus as any,
        startDate,
        endDate,
        createdAt: def.created,
        updatedAt: new Date().toISOString()
      });
    });

    // Seed Real Payments
    const payments: Payment[] = [
      {
        _id: 'pay_1',
        storeId: 'store_1',
        subscriptionId: 'sub_1',
        amount: 999,
        method: 'bKash',
        transactionId: 'TXN-92831',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(now.getTime() - 25 * 60000).toISOString()
      },
      {
        _id: 'pay_2',
        storeId: 'store_6',
        subscriptionId: 'sub_6',
        amount: 499,
        method: 'Nagad',
        transactionId: 'TXN-92834',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(now.getTime() - 95 * 60000).toISOString()
      },
      {
        _id: 'pay_3',
        storeId: 'store_10',
        subscriptionId: 'sub_10',
        amount: 499,
        method: 'bKash',
        transactionId: 'TXN-92835',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date(now.getTime() - 140 * 60000).toISOString()
      },
      {
        _id: 'pay_4',
        storeId: 'store_3',
        subscriptionId: 'sub_3',
        amount: 999,
        method: 'Nagad',
        transactionId: 'TXN-92830',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 88000000).toISOString()
      },
      {
        _id: 'pay_5',
        storeId: 'store_2',
        subscriptionId: 'sub_2',
        amount: 1499,
        method: 'bKash',
        transactionId: 'TXN-92829',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 2 * 86400000 - 3600000).toISOString()
      },
      {
        _id: 'pay_6',
        storeId: 'store_4',
        subscriptionId: 'sub_4',
        amount: 999,
        method: 'Card',
        transactionId: 'TXN-92828',
        status: 'rejected',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        rejectionReason: 'Invalid transaction ID provided on gateway slip',
        createdAt: new Date(now.getTime() - 3 * 86400000 - 7200000).toISOString()
      },
      {
        _id: 'pay_7',
        storeId: 'store_5',
        subscriptionId: 'sub_5',
        amount: 1499,
        method: 'Nagad',
        transactionId: 'TXN-92827',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 4 * 86400000 - 1800000).toISOString()
      },
      {
        _id: 'pay_8',
        storeId: 'store_7',
        subscriptionId: 'sub_7',
        amount: 1999,
        method: 'Bank',
        transactionId: 'TXN-92820',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 6 * 86400000 - 3600000).toISOString()
      },
      {
        _id: 'pay_9',
        storeId: 'store_8',
        subscriptionId: 'sub_8',
        amount: 999,
        method: 'bKash',
        transactionId: 'TXN-92818',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 8 * 86400000 - 2400000).toISOString()
      },
      {
        _id: 'pay_10',
        storeId: 'store_11',
        subscriptionId: 'sub_11',
        amount: 1999,
        method: 'Card',
        transactionId: 'TXN-92815',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 11 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 11 * 86400000 - 1200000).toISOString()
      },
      {
        _id: 'pay_11',
        storeId: 'store_15',
        subscriptionId: 'sub_15',
        amount: 1999,
        method: 'bKash',
        transactionId: 'TXN-92810',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 14 * 86400000 - 5400000).toISOString()
      },
      {
        _id: 'pay_12',
        storeId: 'store_19',
        subscriptionId: 'sub_19',
        amount: 999,
        method: 'Nagad',
        transactionId: 'TXN-92805',
        status: 'approved',
        approvedBy: 'admin_1',
        approvedAt: new Date(now.getTime() - 18 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 18 * 86400000 - 3200000).toISOString()
      }
    ];

    const supportTickets: SupportTicket[] = [
      {
        _id: 'ticket_1',
        storeId: 'store_1',
        subject: 'Payment issue',
        message: 'I completed the payment but my subscription is still inactive.',
        priority: 'High',
        status: 'Open',
        replies: [
          {
            id: 'rep_1',
            senderRole: 'owner',
            senderName: 'Rahim Khan',
            message: 'I completed the payment but my subscription is still inactive.',
            createdAt: '2026-10-02T10:24:00.000Z'
          },
          {
            id: 'rep_2',
            senderRole: 'admin',
            senderName: 'Admin Manager',
            message: 'We have received your payment. Your subscription will be activated within a few minutes.',
            createdAt: '2026-10-02T11:02:00.000Z'
          }
        ],
        createdAt: '2026-10-02T10:24:00.000Z',
        updatedAt: '2026-10-02T11:02:00.000Z'
      },
      {
        _id: 'ticket_2',
        storeId: 'store_2',
        subject: 'Printer setup',
        message: 'Thermal receipt printer EPSON TM-T88VI cuts paper halfway through receipt printing.',
        priority: 'Medium',
        status: 'In Progress',
        replies: [
          {
            id: 'rep_3',
            senderRole: 'owner',
            senderName: 'Karim Ahmed',
            message: 'Thermal receipt printer cuts paper halfway through receipt printing.',
            createdAt: '2026-10-01T15:20:00.000Z'
          }
        ],
        createdAt: '2026-10-01T15:20:00.000Z',
        updatedAt: '2026-10-01T16:00:00.000Z'
      },
      {
        _id: 'ticket_3',
        storeId: 'store_3',
        subject: 'Login problem',
        message: 'Staff members cannot access POS terminal screen during shift changes.',
        priority: 'Medium',
        status: 'Open',
        replies: [],
        createdAt: '2026-09-30T14:10:00.000Z',
        updatedAt: '2026-09-30T14:10:00.000Z'
      },
      {
        _id: 'ticket_4',
        storeId: 'store_4',
        subject: 'Feature request',
        message: 'Requesting bulk CSV import for vegetable inventory with expiry date tracking.',
        priority: 'Low',
        status: 'Resolved',
        replies: [
          {
            id: 'rep_4',
            senderRole: 'owner',
            senderName: 'Sadia Islam',
            message: 'Requesting bulk CSV import for vegetable inventory.',
            createdAt: '2026-09-28T09:00:00.000Z'
          },
          {
            id: 'rep_5',
            senderRole: 'admin',
            senderName: 'Admin Manager',
            message: 'This feature is now supported under Products > Import CSV. Thank you!',
            createdAt: '2026-09-28T14:00:00.000Z'
          }
        ],
        createdAt: '2026-09-28T09:00:00.000Z',
        updatedAt: '2026-09-28T14:00:00.000Z'
      },
      {
        _id: 'ticket_5',
        storeId: 'store_5',
        subject: 'Billing question',
        message: 'Would like to upgrade from Pro to Annual billing. Is there a 2-month discount?',
        priority: 'Medium',
        status: 'In Progress',
        replies: [],
        createdAt: '2026-09-25T11:45:00.000Z',
        updatedAt: '2026-09-25T11:45:00.000Z'
      }
    ];

    const adminAuditLogs: AdminAuditLog[] = [
      {
        _id: 'log_1',
        adminId: 'admin_1',
        adminName: 'Admin Manager',
        action: 'Login',
        targetId: 'admin_1',
        details: { ip: '127.0.0.1', userAgent: 'Chrome/ShopPOS-Admin' },
        timestamp: new Date().toISOString()
      },
      {
        _id: 'log_2',
        adminId: 'admin_1',
        adminName: 'Admin Manager',
        action: 'Approve payment',
        targetId: 'pay_4',
        details: { storeName: 'Tech Corner', amount: 999, transactionId: 'TXN-92830' },
        timestamp: new Date(now.getTime() - 86400000).toISOString()
      },
      {
        _id: 'log_3',
        adminId: 'admin_1',
        adminName: 'Admin Manager',
        action: 'Suspend shop',
        targetId: 'store_3',
        details: { storeName: 'Tech Corner', reason: 'Unverified business documents' },
        timestamp: new Date(now.getTime() - 2 * 86400000).toISOString()
      }
    ];

    const sales: Sale[] = [
      {
        _id: 'sale_1',
        storeId: 'store_1',
        invoiceNumber: 'INV-2026-0048',
        totalAmount: 3450,
        itemsCount: 6,
        customerName: 'Tanvir Hossain',
        paymentMethod: 'Cash',
        createdAt: new Date(now.getTime() - 4 * 3600000).toISOString()
      },
      {
        _id: 'sale_2',
        storeId: 'store_1',
        invoiceNumber: 'INV-2026-0047',
        totalAmount: 1820,
        itemsCount: 3,
        customerName: 'Ayesha Siddiqua',
        paymentMethod: 'bKash',
        createdAt: new Date(now.getTime() - 18 * 3600000).toISOString()
      },
      {
        _id: 'sale_3',
        storeId: 'store_1',
        invoiceNumber: 'INV-2026-0046',
        totalAmount: 7180,
        itemsCount: 11,
        customerName: 'Mahmudul Hasan',
        paymentMethod: 'Card',
        createdAt: new Date(now.getTime() - 32 * 3600000).toISOString()
      }
    ];

    const settings: PlatformSettings = {
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
      bankAccountNumber: '1102938475001'
    };

    return {
      admins,
      stores,
      users,
      subscription_plans: plans,
      subscriptions,
      payments,
      support_tickets: supportTickets,
      admin_audit_logs: adminAuditLogs,
      sales,
      settings
    };
  }

  // Collections accessors
  public get admins() { return this.db.admins; }
  public get stores() { return this.db.stores; }
  public get users() { return this.db.users; }
  public get subscriptionPlans() { return this.db.subscription_plans; }
  public get subscriptions() { return this.db.subscriptions; }
  public get payments() { return this.db.payments; }
  public get supportTickets() { return this.db.support_tickets; }
  public get adminAuditLogs() { return this.db.admin_audit_logs; }
  public get sales() { return this.db.sales; }
  public get settings() { return this.db.settings; }

  // Helpers to mutate and emit change stream events
  public createAuditLog(adminId: string, adminName: string, action: string, targetId: string, details: Record<string, any>) {
    const log: AdminAuditLog = {
      _id: this.generateId(),
      adminId,
      adminName,
      action,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };
    this.db.admin_audit_logs.unshift(log);
    this.save();
    changeStream.emitChange('admin_audit_logs', 'insert', { _id: log._id }, log);
    return log;
  }

  public addStore(data: Omit<Store, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const store: Store = {
      ...data,
      _id: 'store_' + this.generateId().slice(0, 6),
      createdAt: now,
      updatedAt: now
    };
    this.db.stores.unshift(store);
    this.save();
    changeStream.emitChange('stores', 'insert', { _id: store._id }, store);
    return store;
  }

  public updateStore(storeId: string, updates: Partial<Store>) {
    const store = this.db.stores.find(s => s._id === storeId);
    if (!store) return null;
    Object.assign(store, updates, { updatedAt: new Date().toISOString() });
    this.save();
    changeStream.emitChange('stores', 'update', { _id: storeId }, store);
    return store;
  }

  public deleteStore(storeId: string) {
    const index = this.db.stores.findIndex(s => s._id === storeId);
    if (index === -1) return false;
    const [deleted] = this.db.stores.splice(index, 1);
    this.save();
    changeStream.emitChange('stores', 'delete', { _id: storeId }, deleted);
    return true;
  }

  public addStaff(storeId: string, staffData: { name: string; email: string; role: 'Manager' | 'Cashier'; password?: string }) {
    const salt = bcrypt.genSaltSync(10);
    const pass = staffData.password || 'staff123';
    const newUser: User = {
      _id: 'user_' + this.generateId().slice(0, 8),
      storeId,
      name: staffData.name,
      email: staffData.email,
      passwordHash: bcrypt.hashSync(pass, salt),
      role: staffData.role,
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    this.db.users.push(newUser);
    this.save();
    changeStream.emitChange('users', 'insert', { _id: newUser._id }, newUser);
    return newUser;
  }

  public updateStaff(userId: string, updates: Partial<User>) {
    const user = this.db.users.find(u => u._id === userId);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    changeStream.emitChange('users', 'update', { _id: userId }, user);
    return user;
  }

  public deleteStaff(userId: string) {
    const idx = this.db.users.findIndex(u => u._id === userId);
    if (idx === -1) return false;
    const [deleted] = this.db.users.splice(idx, 1);
    this.save();
    changeStream.emitChange('users', 'delete', { _id: userId }, deleted);
    return true;
  }

  public updateSubscription(subId: string, updates: Partial<Subscription>) {
    const sub = this.db.subscriptions.find(s => s._id === subId);
    if (!sub) return null;
    Object.assign(sub, updates, { updatedAt: new Date().toISOString() });
    this.save();
    changeStream.emitChange('subscriptions', 'update', { _id: subId }, sub);
    return sub;
  }

  public addPayment(paymentData: Omit<Payment, '_id' | 'createdAt' | 'approvedBy' | 'approvedAt'>) {
    const payment: Payment = {
      ...paymentData,
      _id: 'pay_' + this.generateId().slice(0, 6),
      status: paymentData.status || 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString()
    };
    this.db.payments.unshift(payment);
    this.save();
    changeStream.emitChange('payments', 'insert', { _id: payment._id }, payment);
    return payment;
  }

  public updatePayment(paymentId: string, updates: Partial<Payment>) {
    const pay = this.db.payments.find(p => p._id === paymentId);
    if (!pay) return null;
    Object.assign(pay, updates);
    this.save();
    changeStream.emitChange('payments', 'update', { _id: paymentId }, pay);
    return pay;
  }

  public addSupportTicket(ticketData: Omit<SupportTicket, '_id' | 'createdAt' | 'updatedAt' | 'replies'>) {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      ...ticketData,
      _id: 'ticket_' + this.generateId().slice(0, 6),
      replies: [
        {
          id: 'rep_' + this.generateId().slice(0, 6),
          senderRole: 'owner',
          senderName: 'Store Owner',
          message: ticketData.message,
          createdAt: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    this.db.support_tickets.unshift(ticket);
    this.save();
    changeStream.emitChange('support_tickets', 'insert', { _id: ticket._id }, ticket);
    return ticket;
  }

  public addTicketReply(ticketId: string, reply: Omit<SupportTicketReply, 'id' | 'createdAt'>) {
    const ticket = this.db.support_tickets.find(t => t._id === ticketId);
    if (!ticket) return null;
    const now = new Date().toISOString();
    const newReply: SupportTicketReply = {
      ...reply,
      id: 'rep_' + this.generateId().slice(0, 6),
      createdAt: now
    };
    ticket.replies.push(newReply);
    ticket.updatedAt = now;
    this.save();
    changeStream.emitChange('support_tickets', 'update', { _id: ticketId }, ticket);
    return { ticket, reply: newReply };
  }

  public updatePlan(planId: string, updates: Partial<SubscriptionPlan>) {
    const plan = this.db.subscription_plans.find(p => p._id === planId);
    if (!plan) return null;
    Object.assign(plan, updates);
    this.save();
    changeStream.emitChange('subscription_plans', 'update', { _id: planId }, plan);
    return plan;
  }

  public addPlan(planData: Omit<SubscriptionPlan, '_id'>) {
    const plan: SubscriptionPlan = {
      ...planData,
      _id: 'plan_' + this.generateId().slice(0, 6)
    };
    this.db.subscription_plans.push(plan);
    this.save();
    changeStream.emitChange('subscription_plans', 'insert', { _id: plan._id }, plan);
    return plan;
  }

  public deletePlan(planId: string) {
    const idx = this.db.subscription_plans.findIndex(p => p._id === planId);
    if (idx === -1) return false;
    const [deleted] = this.db.subscription_plans.splice(idx, 1);
    this.save();
    changeStream.emitChange('subscription_plans', 'delete', { _id: planId }, deleted);
    return true;
  }

  public addAdmin(adminData: { name: string; email: string; password: string; role: 'SuperAdmin' | 'Admin' }) {
    const salt = bcrypt.genSaltSync(10);
    const newAdmin: AdminUser = {
      _id: 'admin_' + this.generateId().slice(0, 6),
      name: adminData.name,
      email: adminData.email,
      passwordHash: bcrypt.hashSync(adminData.password, salt),
      role: adminData.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    this.db.admins.push(newAdmin);
    this.save();
    return newAdmin;
  }

  public deleteAdmin(adminId: string) {
    const idx = this.db.admins.findIndex(a => a._id === adminId);
    if (idx === -1) return false;
    this.db.admins.splice(idx, 1);
    this.save();
    return true;
  }

  public updateSettings(updates: Partial<PlatformSettings>) {
    Object.assign(this.db.settings, updates);
    this.save();
    return this.db.settings;
  }
}

export const db = new MongoDatabase();
