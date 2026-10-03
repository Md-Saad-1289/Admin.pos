import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStore extends Document {
  name: string;
  branch: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  storeType: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    branch: { type: String, default: 'Main Branch', trim: true },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    storeType: { type: String, default: 'Retail' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  {
    timestamps: true,
    collection: 'stores',
  }
);

StoreSchema.index({ status: 1 });
StoreSchema.index({ createdAt: -1 });
StoreSchema.index({ name: 1, branch: 1 });
StoreSchema.index({ ownerEmail: 1 });

export const StoreModel: Model<IStore> =
  (mongoose.models.Store as Model<IStore>) || mongoose.model<IStore>('Store', StoreSchema);
