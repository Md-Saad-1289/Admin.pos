import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  storeId: string;
  subscriptionId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Card' | 'Bank';
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    storeId: { type: String, required: true, index: true },
    subscriptionId: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['bKash', 'Nagad', 'Card', 'Bank'],
      default: 'bKash',
    },
    transactionId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

export const PaymentModel: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment>) || mongoose.model<IPayment>('Payment', PaymentSchema);
