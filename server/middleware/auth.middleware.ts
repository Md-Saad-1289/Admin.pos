import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.ts';
import { StoreModel } from '../models/Store.ts';
import { isDbConnected, fallbackStore } from '../db.ts';

export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'shoppos_admin_secret_super_secure_key_2026';
export const OWNER_JWT_SECRET = process.env.OWNER_JWT_SECRET || 'shoppos_owner_secret_pos_key_2026';

export interface AdminAuthRequest extends Request {
  admin?: {
    _id: string;
    name: string;
    email: string;
    role: 'SuperAdmin' | 'Admin';
    status: string;
    lastLogin?: string;
  };
}

export interface OwnerAuthRequest extends Request {
  ownerUser?: {
    userId: string;
    storeId: string;
    email: string;
    role: string;
  };
}

export async function verifyAdminToken(req: AdminAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string; email: string; role: string };

    if (isDbConnected()) {
      const adminDoc = await Admin.findById(decoded.adminId);
      if (!adminDoc || adminDoc.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin account is inactive or not found' });
      }
      req.admin = {
        _id: adminDoc._id.toString(),
        name: adminDoc.name,
        email: adminDoc.email,
        role: adminDoc.role,
        status: adminDoc.status,
        lastLogin: adminDoc.lastLogin ? adminDoc.lastLogin.toISOString() : undefined,
      };
    } else {
      const admin = fallbackStore.admins.find((a) => a._id === decoded.adminId);
      if (!admin || admin.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin account is inactive or not found' });
      }
      req.admin = admin;
    }

    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
}

export async function verifyOwnerToken(req: OwnerAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No owner token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, OWNER_JWT_SECRET) as {
      userId: string;
      storeId: string;
      email: string;
      role: string;
    };

    if (isDbConnected()) {
      const store = await StoreModel.findById(decoded.storeId);
      if (!store) {
        return res.status(404).json({ success: false, error: 'Store not found' });
      }
      if (store.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'Store account has been suspended by the administrator.',
        });
      }
    } else {
      const store = fallbackStore.stores.find((s) => s._id === decoded.storeId);
      if (!store) {
        return res.status(404).json({ success: false, error: 'Store not found' });
      }
      if (store.status === 'suspended') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          error: 'Store account has been suspended by the administrator.',
        });
      }
    }

    req.ownerUser = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session' });
  }
}
