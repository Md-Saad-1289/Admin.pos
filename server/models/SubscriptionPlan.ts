import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  maxProducts: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    features: [{ type: String }],
    maxUsers: { type: Number, default: 5 },
    maxProducts: { type: Number, default: 500 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    timestamps: true,
    collection: 'subscription_plans',
  }
);

export const SubscriptionPlan: Model<ISubscriptionPlan> =
  (mongoose.models.SubscriptionPlan as Model<ISubscriptionPlan>) ||
  mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
