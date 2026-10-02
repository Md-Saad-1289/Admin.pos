import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  storeId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'Owner' | 'Manager' | 'Cashier';
  status: 'active' | 'inactive';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Owner', 'Manager', 'Cashier'], default: 'Cashier' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
