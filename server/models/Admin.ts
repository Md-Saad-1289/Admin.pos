import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdmin extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'SuperAdmin' | 'Admin';
  status: 'active' | 'inactive';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['SuperAdmin', 'Admin'], default: 'Admin' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    collection: 'admins',
  }
);

export const Admin: Model<IAdmin> =
  (mongoose.models.Admin as Model<IAdmin>) || mongoose.model<IAdmin>('Admin', AdminSchema);
