import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscription extends Document {
  storeId: string;
  planId: string;
  status: 'active' | 'expiring' | 'expired' | 'suspended';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    storeId: { type: String, required: true, index: true },
    planId: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'expiring', 'expired', 'suspended'],
      default: 'active',
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: 'subscriptions',
  }
);

SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ endDate: 1 });

export const SubscriptionModel: Model<ISubscription> =
  (mongoose.models.Subscription as Model<ISubscription>) ||
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
