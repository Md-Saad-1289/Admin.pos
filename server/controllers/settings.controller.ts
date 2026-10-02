import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PlatformSettingModel, Admin, AuditLogModel } from '../models/index.ts';
import { isDbConnected, fallbackStore } from '../db.ts';
import { AdminAuthRequest } from '../middleware/auth.middleware.ts';

export async function getSettings(_req: AdminAuthRequest, res: Response) {
  try {
    if (isDbConnected()) {
      let settings = await PlatformSettingModel.findOne();
      if (!settings) {
        settings = await PlatformSettingModel.create({
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
      }
      return res.json({ success: true, settings });
    } else {
      return res.json({ success: true, settings: fallbackStore.platformSettings });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
  }
}

export async function updateSettings(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const updates = req.body;

  try {
    if (isDbConnected()) {
      let settings = await PlatformSettingModel.findOne();
      if (!settings) {
        settings = await PlatformSettingModel.create(updates);
      } else {
        Object.assign(settings, updates);
        await settings.save();
      }

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Update settings',
        targetId: 'settings',
        details: updates,
        timestamp: new Date(),
      });

      return res.json({ success: true, settings });
    } else {
      Object.assign(fallbackStore.platformSettings, updates);
      fallbackStore.platformSettings.updatedAt = new Date().toISOString();

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Update settings',
        targetId: 'settings',
        details: updates,
        timestamp: new Date().toISOString(),
      });

      return res.json({ success: true, settings: fallbackStore.platformSettings });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
  }
}

export async function getTeam(_req: AdminAuthRequest, res: Response) {
  try {
    if (isDbConnected()) {
      const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
      return res.json({ success: true, admins });
    } else {
      const admins = fallbackStore.admins.map((a) => {
        const { passwordHash, ...rest } = a;
        return rest;
      });
      return res.json({ success: true, admins });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch team' });
  }
}

export async function addTeamMember(req: AdminAuthRequest, res: Response) {
  const currentAdmin = req.admin!;
  if (currentAdmin.role !== 'SuperAdmin') {
    return res.status(403).json({ success: false, error: 'Only SuperAdmin can add team members' });
  }

  const { name, email, password, role = 'Admin' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    if (isDbConnected()) {
      const existing = await Admin.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const newAdmin = await Admin.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        status: 'active',
      });

      await AuditLogModel.create({
        adminId: currentAdmin._id,
        adminName: currentAdmin.name,
        action: 'Add admin member',
        targetId: newAdmin._id.toString(),
        details: { email, role },
        timestamp: new Date(),
      });

      return res.status(201).json({
        success: true,
        admin: {
          _id: newAdmin._id.toString(),
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: newAdmin.status,
        },
      });
    } else {
      const existing = fallbackStore.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const newAdmin = {
        _id: 'admin_' + Date.now(),
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role as any,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fallbackStore.admins.push(newAdmin);

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: currentAdmin._id,
        adminName: currentAdmin.name,
        action: 'Add admin member',
        targetId: newAdmin._id,
        details: { email, role },
        timestamp: new Date().toISOString(),
      });

      const { passwordHash: _, ...rest } = newAdmin;
      return res.status(201).json({ success: true, admin: rest });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to add team member' });
  }
}

export async function deleteTeamMember(req: AdminAuthRequest, res: Response) {
  const currentAdmin = req.admin!;
  if (currentAdmin.role !== 'SuperAdmin') {
    return res.status(403).json({ success: false, error: 'Only SuperAdmin can remove team members' });
  }

  const id = req.params.id as string;
  if (id === currentAdmin._id) {
    return res.status(400).json({ success: false, error: 'Cannot remove your own admin account' });
  }

  try {
    if (isDbConnected()) {
      await Admin.findByIdAndDelete(id);

      await AuditLogModel.create({
        adminId: currentAdmin._id,
        adminName: currentAdmin.name,
        action: 'Delete admin member',
        targetId: id,
        timestamp: new Date(),
      });

      return res.json({ success: true, message: 'Admin member removed' });
    } else {
      fallbackStore.admins = fallbackStore.admins.filter((a) => a._id !== id);

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: currentAdmin._id,
        adminName: currentAdmin.name,
        action: 'Delete admin member',
        targetId: id,
        timestamp: new Date().toISOString(),
      });

      return res.json({ success: true, message: 'Admin member removed' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete team member' });
  }
}

export async function getAuditLogs(_req: AdminAuthRequest, res: Response) {
  try {
    if (isDbConnected()) {
      const logs = await AuditLogModel.find().sort({ timestamp: -1 }).limit(100);
      return res.json({ success: true, logs });
    } else {
      return res.json({ success: true, logs: fallbackStore.auditLogs });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch audit logs' });
  }
}
