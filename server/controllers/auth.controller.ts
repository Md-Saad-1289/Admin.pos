import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin, AuditLogModel } from '../models/index.ts';
import { isDbConnected, fallbackStore } from '../db.ts';
import { AdminAuthRequest, ADMIN_JWT_SECRET } from '../middleware/auth.middleware.ts';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    let adminRecord: any = null;

    if (isDbConnected()) {
      const doc = await Admin.findOne({ email: email.toLowerCase() });
      if (doc) {
        adminRecord = doc;
      }
    } else {
      adminRecord = fallbackStore.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
    }

    if (!adminRecord) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    const isMatch = bcrypt.compareSync(password, adminRecord.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    if (adminRecord.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    const lastLoginDate = new Date();
    if (isDbConnected()) {
      adminRecord.lastLogin = lastLoginDate;
      await adminRecord.save();
      await AuditLogModel.create({
        adminId: adminRecord._id.toString(),
        adminName: adminRecord.name,
        action: 'Login',
        targetId: adminRecord._id.toString(),
        details: { ip: req.ip, userAgent: req.headers['user-agent'] },
        timestamp: lastLoginDate,
      });
    } else {
      adminRecord.lastLogin = lastLoginDate.toISOString();
      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: adminRecord._id,
        adminName: adminRecord.name,
        action: 'Login',
        targetId: adminRecord._id,
        details: { ip: req.ip, userAgent: req.headers['user-agent'] },
        timestamp: lastLoginDate.toISOString(),
      });
    }

    const token = jwt.sign(
      { adminId: adminRecord._id.toString(), email: adminRecord.email, role: adminRecord.role },
      ADMIN_JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      admin: {
        _id: adminRecord._id.toString(),
        name: adminRecord.name,
        email: adminRecord.email,
        role: adminRecord.role,
        lastLogin: adminRecord.lastLogin,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
}

export async function getMe(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  return res.json({
    success: true,
    admin: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLogin: admin.lastLogin,
    },
  });
}

export async function logout(_req: AdminAuthRequest, res: Response) {
  return res.json({ success: true, message: 'Logged out successfully' });
}

export async function updateProfile(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const { name, email } = req.body;

  try {
    if (isDbConnected()) {
      const doc = await Admin.findById(admin._id);
      if (!doc) return res.status(404).json({ success: false, error: 'Admin not found' });
      if (name) doc.name = name;
      if (email) doc.email = email;
      await doc.save();

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Update profile',
        targetId: admin._id,
        details: { name, email },
        timestamp: new Date(),
      });

      return res.json({
        success: true,
        admin: {
          _id: doc._id.toString(),
          name: doc.name,
          email: doc.email,
          role: doc.role,
          lastLogin: doc.lastLogin,
        },
      });
    } else {
      const item = fallbackStore.admins.find((a) => a._id === admin._id);
      if (!item) return res.status(404).json({ success: false, error: 'Admin not found' });
      if (name) item.name = name;
      if (email) item.email = email;

      fallbackStore.auditLogs.unshift({
        _id: 'log_' + Date.now(),
        adminId: admin._id,
        adminName: admin.name,
        action: 'Update profile',
        targetId: admin._id,
        details: { name, email },
        timestamp: new Date().toISOString(),
      });

      return res.json({ success: true, admin: item });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Profile update failed' });
  }
}

export async function changePassword(req: AdminAuthRequest, res: Response) {
  const admin = req.admin!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current and new password are required' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    if (isDbConnected()) {
      const doc = await Admin.findById(admin._id);
      if (!doc) return res.status(404).json({ success: false, error: 'Admin not found' });

      const isMatch = bcrypt.compareSync(currentPassword, doc.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Incorrect current password' });
      }

      doc.passwordHash = newHash;
      await doc.save();

      await AuditLogModel.create({
        adminId: admin._id,
        adminName: admin.name,
        action: 'Change password',
        targetId: admin._id,
        timestamp: new Date(),
      });
    } else {
      const item = fallbackStore.admins.find((a) => a._id === admin._id);
      if (!item) return res.status(404).json({ success: false, error: 'Admin not found' });

      const isMatch = bcrypt.compareSync(currentPassword, item.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Incorrect current password' });
      }

      item.passwordHash = newHash;
    }

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Password update failed' });
  }
}
