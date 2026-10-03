import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { EventEmitter } from 'events';
import { dbCache } from './utils/cache.ts';
import {
  Admin,
  StoreModel,
  UserModel,
  SubscriptionPlan,
  SubscriptionModel,
  PaymentModel,
  SupportTicketModel,
  AuditLogModel,
  PlatformSettingModel,
  SaleModel,
} from './models/index.ts';

export const changeStreamEmitter = new EventEmitter();

// Invalidate caches when database mutations occur
changeStreamEmitter.on('store_created', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('shops');
});
changeStreamEmitter.on('store_change', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('shops');
});
changeStreamEmitter.on('payment_change', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('payments');
});
changeStreamEmitter.on('ticket_change', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('support');
});
changeStreamEmitter.on('ACCOUNT_SUSPENDED', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('shops');
});
changeStreamEmitter.on('ACCOUNT_ACTIVATED', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('shops');
});
changeStreamEmitter.on('PAYMENT_RECORDED', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('payments');
});
changeStreamEmitter.on('PAYMENT_APPROVED', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('payments');
});
changeStreamEmitter.on('PAYMENT_REJECTED', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('payments');
});
changeStreamEmitter.on('NEW_SUPPORT_TICKET', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('support');
});
changeStreamEmitter.on('TICKET_REPLIED', () => {
  dbCache.invalidatePrefix('dashboard');
  dbCache.invalidatePrefix('support');
});

let isConnected = false;
let isFallbackMode = false;

// Fallback in-memory storage if MongoDB server is unavailable
export const fallbackStore: {
  admins: any[];
  stores: any[];
  users: any[];
  subscriptionPlans: any[];
  subscriptions: any[];
  payments: any[];
  supportTickets: any[];
  auditLogs: any[];
  platformSettings: any;
  sales: any[];
} = {
  admins: [],
  stores: [],
  users: [],
  subscriptionPlans: [],
  subscriptions: [],
  payments: [],
  supportTickets: [],
  auditLogs: [],
  platformSettings: null,
  sales: [],
};

export async function connectMongoDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shoppos';

  try {
    mongoose.set('strictQuery', false);
    console.log(`[MongoDB] Connecting to ${mongoUri}...`);
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 25,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    isFallbackMode = false;
    console.log('[MongoDB] Connected successfully to MongoDB database!');

    // Initialize Change Stream if replica set supports it
    try {
      const storeStream = StoreModel.watch([], { fullDocument: 'updateLookup' });
      storeStream.on('change', (change) => {
        changeStreamEmitter.emit('store_change', change);
      });

      const paymentStream = PaymentModel.watch([], { fullDocument: 'updateLookup' });
      paymentStream.on('change', (change) => {
        changeStreamEmitter.emit('payment_change', change);
      });

      const ticketStream = SupportTicketModel.watch([], { fullDocument: 'updateLookup' });
      ticketStream.on('change', (change) => {
        changeStreamEmitter.emit('ticket_change', change);
      });
      console.log('[MongoDB] Change Streams initialized for real-time synchronization.');
    } catch {
      console.log('[MongoDB] Standalone mode (Change Streams require a replica set). Using event bus.');
    }

    await seedDatabaseIfNeeded();
    return true;
  } catch (err: any) {
    console.warn(`[MongoDB] Could not establish connection to ${mongoUri}: ${err.message}`);
    console.log('[MongoDB] Activating high-resilience in-memory operational mode with complete ShopPOS schema & data.');
    isConnected = false;
    isFallbackMode = true;
    seedFallbackStore();
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export function isUsingFallback(): boolean {
  return isFallbackMode;
}

export async function seedDatabaseIfNeeded() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      console.log('[MongoDB] Database already initialized with existing data.');
      return;
    }

    console.log('[MongoDB] Database is empty. Seeding initial SaaS records...');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    // 1. Admins
    const superAdmin = await Admin.create({
      name: 'Admin Manager',
      email: 'admin@shoppos.com',
      passwordHash,
      role: 'SuperAdmin',
      status: 'active',
      lastLogin: new Date(),
    });

    await Admin.create({
      name: 'Nayeem Chowdhury',
      email: 'nayeem@shoppos.com',
      passwordHash,
      role: 'Admin',
      status: 'active',
      lastLogin: new Date(),
    });

    // 2. Subscription Plans
    const plans = await Promise.all([
      SubscriptionPlan.create({
        name: 'Basic',
        price: 999,
        billingCycle: 'monthly',
        features: ['Up to 5 Users', 'Max 500 Products', 'Standard POS', 'Daily Reports'],
        maxUsers: 5,
        maxProducts: 500,
        status: 'active',
      }),
      SubscriptionPlan.create({
        name: 'Pro',
        price: 1999,
        billingCycle: 'monthly',
        features: ['Up to 15 Users', 'Max 2,500 Products', 'Advanced Analytics', 'Multi-terminal POS', 'Priority Support'],
        maxUsers: 15,
        maxProducts: 2500,
        status: 'active',
      }),
      SubscriptionPlan.create({
        name: 'Enterprise',
        price: 4999,
        billingCycle: 'monthly',
        features: ['Unlimited Users', 'Unlimited Products', 'Custom Integrations', 'Multi-Branch Sync', '24/7 Dedicated Support'],
        maxUsers: 100,
        maxProducts: 100000,
        status: 'active',
      }),
    ]);

    const proPlan = plans[1];
    const basicPlan = plans[0];
    const enterprisePlan = plans[2];

    // 3. Stores & Users
    const storesData = [
      {
        name: 'Apex Electronics',
        branch: 'Mirpur-10 Hub',
        ownerName: 'Rafiqul Islam',
        ownerEmail: 'rafiqul@apexelectronics.com',
        phone: '+880 1711-223344',
        address: 'Plot 4, Road 2, Mirpur 10, Dhaka',
        storeType: 'Electronics',
        status: 'active' as const,
        plan: proPlan,
      },
      {
        name: 'Dhaka Sweets & Bakery',
        branch: 'Banani Branch',
        ownerName: 'Tanvir Hossain',
        ownerEmail: 'tanvir@dhakasweets.com',
        phone: '+880 1819-334455',
        address: 'Road 11, Block D, Banani, Dhaka',
        storeType: 'Bakery & Sweets',
        status: 'active' as const,
        plan: basicPlan,
      },
      {
        name: 'Chittagong Fashion House',
        branch: 'GEC Circle',
        ownerName: 'Farhana Akter',
        ownerEmail: 'farhana@chittagongfashion.com',
        phone: '+880 1912-778899',
        address: 'CDA Avenue, GEC Circle, Chattogram',
        storeType: 'Clothing & Apparel',
        status: 'suspended' as const,
        plan: proPlan,
      },
      {
        name: 'Shwapno Life Supermarket',
        branch: 'Uttara Sector 7',
        ownerName: 'Mahmudul Hasan',
        ownerEmail: 'mahmud@shwapnolife.com',
        phone: '+880 1610-998877',
        address: 'Sector 7, Rabindra Sarani, Uttara, Dhaka',
        storeType: 'Grocery & Supermarket',
        status: 'active' as const,
        plan: enterprisePlan,
      },
    ];

    for (const data of storesData) {
      const ownerUser = await UserModel.create({
        storeId: 'pending',
        name: data.ownerName,
        email: data.ownerEmail,
        passwordHash,
        role: 'Owner',
        status: data.status === 'suspended' ? 'inactive' : 'active',
        lastLogin: new Date(),
      });

      const store = await StoreModel.create({
        name: data.name,
        branch: data.branch,
        ownerId: ownerUser._id.toString(),
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        phone: data.phone,
        address: data.address,
        storeType: data.storeType,
        status: data.status,
      });

      ownerUser.storeId = store._id.toString();
      await ownerUser.save();

      // Subscription
      const sub = await SubscriptionModel.create({
        storeId: store._id.toString(),
        planId: data.plan._id.toString(),
        status: data.status === 'suspended' ? 'suspended' : 'active',
        startDate: new Date(Date.now() - 15 * 86400000),
        endDate: new Date(Date.now() + 15 * 86400000),
      });

      // Payment
      await PaymentModel.create({
        storeId: store._id.toString(),
        subscriptionId: sub._id.toString(),
        amount: data.plan.price,
        method: 'bKash',
        transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'approved',
        approvedBy: superAdmin._id.toString(),
        approvedAt: new Date(Date.now() - 15 * 86400000),
      });

      // Sample sales
      await SaleModel.create({
        storeId: store._id.toString(),
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        totalAmount: 450,
        itemsCount: 3,
        customerName: 'Walk-in Customer',
        paymentMethod: 'Cash',
      });
    }

    // Pending payment for review
    const allStores = await StoreModel.find();
    if (allStores.length > 0) {
      await PaymentModel.create({
        storeId: allStores[0]._id.toString(),
        subscriptionId: 'pending',
        amount: 1999,
        method: 'Nagad',
        transactionId: 'TXN-984210',
        status: 'pending',
      });
    }

    // Support ticket
    if (allStores.length > 0) {
      await SupportTicketModel.create({
        storeId: allStores[0]._id.toString(),
        subject: 'Need assistance setting up barcode scanner',
        message: 'Hello, our USB barcode scanner is scanning digits with delay. Can you check printer configuration?',
        priority: 'Medium',
        status: 'Open',
        replies: [
          {
            id: 'rep_1',
            senderRole: 'owner',
            senderName: allStores[0].ownerName,
            message: 'Waiting for assistance on our Mirpur terminal.',
            createdAt: new Date(),
          },
        ],
      });
    }

    // Platform Settings
    await PlatformSettingModel.create({
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

    // Audit Log
    await AuditLogModel.create({
      adminId: superAdmin._id.toString(),
      adminName: superAdmin.name,
      action: 'System initialized',
      targetId: 'system',
      details: { environment: 'production', db: 'shoppos' },
      timestamp: new Date(),
    });

    console.log('[MongoDB] Database seeding completed successfully.');
  } catch (err: any) {
    console.error('[MongoDB] Seeding error:', err);
  }
}

function seedFallbackStore() {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  const admin1 = {
    _id: 'admin_1',
    name: 'Admin Manager',
    email: 'admin@shoppos.com',
    passwordHash,
    role: 'SuperAdmin' as const,
    status: 'active' as const,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const admin2 = {
    _id: 'admin_2',
    name: 'Nayeem Chowdhury',
    email: 'nayeem@shoppos.com',
    passwordHash,
    role: 'Admin' as const,
    status: 'active' as const,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  fallbackStore.admins = [admin1, admin2];

  fallbackStore.subscriptionPlans = [
    {
      _id: 'plan_basic',
      name: 'Basic',
      price: 999,
      billingCycle: 'monthly',
      features: ['Up to 5 Users', 'Max 500 Products', 'Standard POS', 'Daily Reports'],
      maxUsers: 5,
      maxProducts: 500,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'plan_pro',
      name: 'Pro',
      price: 1999,
      billingCycle: 'monthly',
      features: ['Up to 15 Users', 'Max 2,500 Products', 'Advanced Analytics', 'Multi-terminal POS', 'Priority Support'],
      maxUsers: 15,
      maxProducts: 2500,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'plan_ent',
      name: 'Enterprise',
      price: 4999,
      billingCycle: 'monthly',
      features: ['Unlimited Users', 'Unlimited Products', 'Custom Integrations', 'Multi-Branch Sync', '24/7 Dedicated Support'],
      maxUsers: 100,
      maxProducts: 100000,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  fallbackStore.stores = [
    {
      _id: 'store_1',
      name: 'Apex Electronics',
      branch: 'Mirpur-10 Hub',
      ownerId: 'user_1',
      ownerName: 'Rafiqul Islam',
      ownerEmail: 'rafiqul@apexelectronics.com',
      phone: '+880 1711-223344',
      address: 'Plot 4, Road 2, Mirpur 10, Dhaka',
      storeType: 'Electronics',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'store_2',
      name: 'Dhaka Sweets & Bakery',
      branch: 'Banani Branch',
      ownerId: 'user_2',
      ownerName: 'Tanvir Hossain',
      ownerEmail: 'tanvir@dhakasweets.com',
      phone: '+880 1819-334455',
      address: 'Road 11, Block D, Banani, Dhaka',
      storeType: 'Bakery & Sweets',
      status: 'active',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'store_3',
      name: 'Chittagong Fashion House',
      branch: 'GEC Circle',
      ownerId: 'user_3',
      ownerName: 'Farhana Akter',
      ownerEmail: 'farhana@chittagongfashion.com',
      phone: '+880 1912-778899',
      address: 'CDA Avenue, GEC Circle, Chattogram',
      storeType: 'Clothing & Apparel',
      status: 'suspended',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'store_4',
      name: 'Shwapno Life Supermarket',
      branch: 'Uttara Sector 7',
      ownerId: 'user_4',
      ownerName: 'Mahmudul Hasan',
      ownerEmail: 'mahmud@shwapnolife.com',
      phone: '+880 1610-998877',
      address: 'Sector 7, Rabindra Sarani, Uttara, Dhaka',
      storeType: 'Grocery & Supermarket',
      status: 'active',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  fallbackStore.users = [
    {
      _id: 'user_1',
      storeId: 'store_1',
      name: 'Rafiqul Islam',
      email: 'rafiqul@apexelectronics.com',
      passwordHash,
      role: 'Owner',
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'user_1_staff',
      storeId: 'store_1',
      name: 'Kamrul Hasan',
      email: 'kamrul@apexelectronics.com',
      passwordHash,
      role: 'Manager',
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'user_2',
      storeId: 'store_2',
      name: 'Tanvir Hossain',
      email: 'tanvir@dhakasweets.com',
      passwordHash,
      role: 'Owner',
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'user_3',
      storeId: 'store_3',
      name: 'Farhana Akter',
      email: 'farhana@chittagongfashion.com',
      passwordHash,
      role: 'Owner',
      status: 'suspended',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'user_4',
      storeId: 'store_4',
      name: 'Mahmudul Hasan',
      email: 'mahmud@shwapnolife.com',
      passwordHash,
      role: 'Owner',
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  fallbackStore.subscriptions = [
    {
      _id: 'sub_1',
      storeId: 'store_1',
      planId: 'plan_pro',
      status: 'active',
      startDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'sub_2',
      storeId: 'store_2',
      planId: 'plan_basic',
      status: 'active',
      startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'sub_3',
      storeId: 'store_3',
      planId: 'plan_pro',
      status: 'suspended',
      startDate: new Date(Date.now() - 25 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'sub_4',
      storeId: 'store_4',
      planId: 'plan_ent',
      status: 'active',
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 25 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  fallbackStore.payments = [
    {
      _id: 'pay_1',
      storeId: 'store_1',
      subscriptionId: 'sub_1',
      amount: 1999,
      method: 'bKash',
      transactionId: 'TXN-902143',
      status: 'approved',
      approvedBy: 'admin_1',
      approvedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      _id: 'pay_2',
      storeId: 'store_2',
      subscriptionId: 'sub_2',
      amount: 999,
      method: 'Nagad',
      transactionId: 'TXN-482019',
      status: 'approved',
      approvedBy: 'admin_1',
      approvedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      _id: 'pay_3',
      storeId: 'store_4',
      subscriptionId: 'sub_4',
      amount: 4999,
      method: 'Bank',
      transactionId: 'TXN-BANK-11029',
      status: 'approved',
      approvedBy: 'admin_1',
      approvedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      _id: 'pay_pending_1',
      storeId: 'store_1',
      subscriptionId: 'sub_1',
      amount: 1999,
      method: 'bKash',
      transactionId: 'TXN-884210',
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ];

  fallbackStore.supportTickets = [
    {
      _id: 'ticket_1',
      storeId: 'store_1',
      subject: 'Barcode scanner synchronization query',
      message: 'Hello, our USB barcode scanner has slight input delay on the Mirpur counter.',
      priority: 'Medium',
      status: 'Open',
      replies: [
        {
          id: 'rep_1',
          senderRole: 'owner',
          senderName: 'Rafiqul Islam',
          message: 'Can you assist us with terminal speed settings?',
          createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
  ];

  fallbackStore.platformSettings = {
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
    updatedAt: new Date().toISOString(),
  };

  fallbackStore.auditLogs = [
    {
      _id: 'log_1',
      adminId: 'admin_1',
      adminName: 'Admin Manager',
      action: 'Platform initialized',
      targetId: 'system',
      details: { environment: 'production', db: 'shoppos' },
      timestamp: new Date().toISOString(),
    },
  ];

  fallbackStore.sales = [
    {
      _id: 'sale_1',
      storeId: 'store_1',
      invoiceNumber: 'INV-2026-1029',
      totalAmount: 1450,
      itemsCount: 4,
      customerName: 'Shahidul Alam',
      paymentMethod: 'Cash',
      createdAt: new Date().toISOString(),
    },
  ];
}
